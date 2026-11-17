"""Orders: checkout (server-side transparent pricing), ownership-scoped lists,
5-stage freshness tracking with simulated courier progress, reviews, complaints."""
import math
import random
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pymongo import ASCENDING, DESCENDING

from lib.auth import get_current_user, new_id, require_role, require_user
from lib.db import db
from models.orders import (
    CheckoutReq,
    Order,
    OrderItem,
    ReviewReq,
    TrackOut,
    BATCH_DELIVERY_FACTOR,
    GST_RATE,
    PACKAGING_FEE,
    PLATFORM_FEE,
)

router = APIRouter(prefix="/orders", tags=["orders"])

PAYOUT_INCENTIVE = 20.0  # batching incentive per trip


def aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def order_from_doc(doc: dict) -> Order:
    doc = dict(doc)
    for f in ("placed_at", "accepted_at", "preparing_at", "ready_at", "picked_at", "delivered_at", "cancelled_at"):
        if f in doc:
            doc[f] = aware(doc[f])
    return Order(**doc)


def compute_breakdown(subtotal: float, delivery_fee: float, batching: bool):
    packaging = 0.0 if subtotal >= 599 else PACKAGING_FEE
    delivery = round(delivery_fee * (BATCH_DELIVERY_FACTOR if batching else 1.0), 2)
    gst = round(GST_RATE * (subtotal + packaging), 2)
    batch_disc = round(delivery_fee - delivery, 2) if batching else 0.0
    total = round(subtotal + packaging + delivery + PLATFORM_FEE + gst, 2)
    return packaging, delivery, gst, batch_disc, total


async def load_order(order_id: str) -> dict:
    doc = await db.orders.find_one({"id": order_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    return doc


@router.post("", response_model=Order, status_code=201)
async def checkout(body: CheckoutReq, user: dict = Depends(require_role("customer"))):
    if not body.items:
        raise HTTPException(status_code=422, detail="Cart is empty")
    restaurant = await db.restaurants.find_one({"id": body.restaurant_id})
    if not restaurant or not restaurant.get("is_open", False):
        raise HTTPException(status_code=404, detail="Restaurant is closed or not found")

    resolved: List[OrderItem] = []
    subtotal = 0.0
    for line in body.items:
        it = await db.menu_items.find_one({"id": line.item_id, "restaurant_id": body.restaurant_id})
        if not it:
            raise HTTPException(status_code=404, detail=f"Menu item {line.item_id} not found")
        if not it.get("is_available", False):
            raise HTTPException(status_code=409, detail=f"{it['name']} is sold out")
        qty = max(1, int(line.qty))
        if it.get("is_surplus") and it.get("surplus_qty", 0) > 0:
            new_qty = it["surplus_qty"] - qty
            await db.menu_items.update_one(
                {"id": it["id"]},
                {"$set": {"surplus_qty": max(0, new_qty), "is_available": new_qty > 0 or not it.get("is_surplus")}},
            )
        price = float(it["price"])
        subtotal += price * qty
        resolved.append(OrderItem(item_id=it["id"], name=it["name"], price=price, qty=qty,
                                  diet=it.get("diet", "veg"), image_url=it.get("image_url", "")))
        await db.menu_items.update_one({"id": it["id"]}, {"$inc": {"orders_count": qty}})

    subtotal = round(subtotal, 2)
    packaging, delivery, gst, batch_disc, total = compute_breakdown(
        subtotal, float(restaurant.get("delivery_fee", 30)), body.batching
    )

    now = datetime.now(timezone.utc)
    prep = int(restaurant.get("prep_time_mins", 25))
    order = Order(
        id=new_id(),
        customer_id=user["id"],
        customer_name=user.get("name", "Customer"),
        restaurant_id=restaurant["id"],
        restaurant_name=restaurant["name"],
        items=resolved,
        address=body.address or user.get("address", ""),
        status="placed",
        subtotal=subtotal, packaging_fee=packaging, delivery_fee=delivery,
        platform_fee=PLATFORM_FEE, gst=gst, batching_discount=batch_disc, total=total,
        payment_method=body.payment_method,
        payment_status="cash_on_delivery" if body.payment_method == "cod" else "paid",
        batching=body.batching,
        scheduled_for=body.scheduled_for,
        prep_mins=prep,
        eta_mins=prep + 18,
        pickup_pin=f"{random.randint(1000, 9999)}",
        placed_at=now,
    )

    if body.group_id:
        group = await db.group_orders.find_one({"id": body.group_id})
        if not group or group.get("host_id") != user["id"]:
            raise HTTPException(status_code=403, detail="Only the group host can checkout")
        order.group_id = group["id"]
        order.group_code = group["code"]

    await db.orders.insert_one(order.model_dump())

    if body.group_id:
        await db.group_orders.update_one(
            {"id": body.group_id},
            {"$set": {"status": "ordered", "order_id": order.id}},
        )
    return order


@router.get("", response_model=List[Order])
async def my_orders(user: dict = Depends(require_user)):
    """Customers see their own orders; restaurant owners see orders for their restaurants."""
    if user["role"] == "customer":
        docs = await db.orders.find({"customer_id": user["id"]}).sort("placed_at", DESCENDING).to_list(200)
    elif user["role"] == "restaurant":
        rids = [r for r in await db.restaurants.find({"owner_id": user["id"]}, {"id": 1}).to_list(50)]
        ids = [r["id"] for r in rids]
        docs = await db.orders.find({"restaurant_id": {"$in": ids}}).sort("placed_at", DESCENDING).to_list(200)
    else:
        docs = []
    return [order_from_doc(d) for d in docs]


@router.get("/{order_id}", response_model=Order)
async def get_order(order_id: str, user: dict = Depends(require_user)):
    doc = await load_order(order_id)
    allowed = (
        user["role"] == "admin"
        or doc.get("customer_id") == user["id"]
        or doc.get("partner_id") == user["id"]
    )
    if not allowed and user["role"] == "restaurant":
        rest = await db.restaurants.find_one({"id": doc.get("restaurant_id"), "owner_id": user["id"]})
        allowed = rest is not None
    if not allowed:
        raise HTTPException(status_code=404, detail="Order not found")
    return order_from_doc(doc)


@router.get("/{order_id}/track", response_model=TrackOut)
async def track(order_id: str, user: dict = Depends(require_user)):
    doc = await load_order(order_id)
    if doc.get("customer_id") != user["id"] and user["role"] not in ("admin", "restaurant", "delivery") \
            and doc.get("partner_id") != user["id"]:
        raise HTTPException(status_code=404, detail="Order not found")

    status = doc.get("status", "placed")
    now = datetime.now(timezone.utc)
    placed = aware(doc.get("placed_at")) or now
    stages = {
        "placed": (1, "Order confirmed & payment verified"),
        "accepted": (2, "Kitchen accepted — chef preparing"),
        "preparing": (2, "Kitchen accepted — chef preparing"),
        "ready": (3, "Quality packed, tamper-proof seal"),
        "picked": (4, "On the way — live courier transit"),
        "delivered": (5, "Delivered at doorstep"),
        "cancelled": (1, "Order cancelled"),
        "rejected": (1, "Order rejected by restaurant"),
    }
    stage, label = stages.get(status, (1, "Order confirmed"))
    eta = int(doc.get("eta_mins", 35))
    prep = int(doc.get("prep_mins", 25))

    progress = 0.0
    if stage == 1:
        progress = 5.0
    elif stage == 2:
        started = aware(doc.get("preparing_at")) or aware(doc.get("accepted_at")) or placed
        elapsed = (now - started).total_seconds() / 60
        progress = min(95.0, 15 + 45 * elapsed / max(prep, 1))
    elif stage == 3:
        progress = 60.0
    elif stage == 4:
        started = aware(doc.get("picked_at")) or now
        transit = max(8, eta - prep)
        elapsed = (now - started).total_seconds() / 60
        progress = min(97.0, 60 + 38 * elapsed / transit)
    else:
        progress = 100.0

    # Deterministic simulated route around Bengaluru, seeded by the order id.
    seed = hashlib.sha1(order_id.encode()).digest()
    base_lat, base_lng = 12.9352, 77.6245
    pts = [[base_lat + ((seed[i] % 90) - 45) / 8000, base_lng + ((seed[i + 3] % 90) - 45) / 8000] for i in range(4)]
    t = progress / 100.0
    seg = min(2, int(t * 3))
    frac = t * 3 - seg
    a, b = pts[seg], pts[seg + 1]
    bike = [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac]

    minutes_left = max(0.0, round(eta - (now - placed).total_seconds() / 60, 1)) if stage < 5 else 0.0
    return TrackOut(
        order_id=order_id, status=status, stage=stage, stage_label=label,
        progress_pct=round(progress, 1), eta_mins=eta, minutes_left=minutes_left,
        temperature_c=round(68 - (progress / 100.0) * 14, 1),
        distance_km=round((100 - progress) / 100.0 * 4.2, 2),
        route_points=pts, bike_at=[round(bike[0], 6), round(bike[1], 6)],
        partner_name=doc.get("partner_name"), pickup_pin=doc.get("pickup_pin", ""),
        prep_mins=prep,
    )


@router.post("/{order_id}/cancel", response_model=Order)
async def cancel(order_id: str, user: dict = Depends(require_role("customer"))):
    doc = await load_order(order_id)
    if doc["customer_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Order not found")
    if doc["status"] != "placed":
        raise HTTPException(status_code=409, detail="Order can only be cancelled before the kitchen accepts it")
    await db.orders.update_one({"id": order_id},
                               {"$set": {"status": "cancelled", "cancelled_at": datetime.now(timezone.utc)}})
    return order_from_doc(await load_order(order_id))


async def _transition(order_id: str, user: dict, action: str):
    doc = await load_order(order_id)
    role = user["role"]

    restaurant_actions = {"accepted": {"placed"}, "rejected": {"placed"}, "preparing": {"accepted"}, "ready": {"preparing"}}
    delivery_actions = {"claim": {"ready"}, "picked": {"ready"}, "delivered": {"picked"}}

    if action in restaurant_actions:
        if role != "restaurant":
            raise HTTPException(status_code=403, detail="Only the restaurant can do this")
        rest = await db.restaurants.find_one({"id": doc["restaurant_id"], "owner_id": user["id"]})
        if not rest:
            raise HTTPException(status_code=404, detail="Order not found")
        if doc["status"] not in restaurant_actions[action]:
            raise HTTPException(status_code=409, detail=f"Cannot move a {doc['status']} order to {action}")
        updates: dict = {"status": action}
        ts = datetime.now(timezone.utc)
        if action == "accepted":
            updates["accepted_at"] = ts
        elif action == "preparing":
            updates["preparing_at"] = ts
        elif action == "ready":
            updates["ready_at"] = ts
        await db.orders.update_one({"id": order_id}, {"$set": updates})
        return order_from_doc(await load_order(order_id))

    if action in delivery_actions:
        if role != "delivery":
            raise HTTPException(status_code=403, detail="Only delivery partners can do this")
        if action == "claim":
            if doc.get("partner_id"):
                raise HTTPException(status_code=409, detail="Another partner already claimed this delivery")
            payout = round(doc.get("delivery_fee", 0) * 0.8 + (PAYOUT_INCENTIVE if doc.get("batching") else 0), 2)
            await db.orders.update_one(
                {"id": order_id, "partner_id": None},
                {"$set": {"partner_id": user["id"], "partner_name": user.get("name", ""), "payout": payout}},
            )
            if (await db.orders.find_one({"id": order_id})).get("partner_id") != user["id"]:
                raise HTTPException(status_code=409, detail="Another partner already claimed this delivery")
            return order_from_doc(await load_order(order_id))
        if doc.get("partner_id") != user["id"]:
            raise HTTPException(status_code=404, detail="Order not found")
        if doc["status"] not in delivery_actions[action]:
            raise HTTPException(status_code=409, detail=f"Cannot move a {doc['status']} order to {action}")
        ts = datetime.now(timezone.utc)
        updates = {"status": action}
        if action == "picked":
            updates["picked_at"] = ts
        else:
            updates["delivered_at"] = ts
            if doc.get("payment_method") == "cod":
                updates["payment_status"] = "paid"
        await db.orders.update_one({"id": order_id}, {"$set": updates})
        return order_from_doc(await load_order(order_id))

    raise HTTPException(status_code=422, detail="Unknown action")


@router.post("/{order_id}/{action}", response_model=Order)
async def transition(order_id: str, action: str, user: dict = Depends(require_user)):
    return await _transition(order_id, user, action)


@router.post("/{order_id}/review", status_code=201)
async def review(order_id: str, body: ReviewReq, user: dict = Depends(require_role("customer"))):
    doc = await load_order(order_id)
    if doc["customer_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Order not found")
    if doc["status"] != "delivered":
        raise HTTPException(status_code=409, detail="You can review an order only after delivery")
    if not 1 <= body.rating <= 5:
        raise HTTPException(status_code=422, detail="Rating must be 1-5")
    existing = await db.reviews.find_one({"order_id": order_id})
    if existing:
        raise HTTPException(status_code=409, detail="Already reviewed")
    await db.reviews.insert_one({
        "id": new_id(), "order_id": order_id, "customer_id": user["id"],
        "customer_name": user.get("name", ""), "restaurant_id": doc["restaurant_id"],
        "rating": body.rating, "comment": body.comment,
        "created_at": datetime.now(timezone.utc),
    })
    pipeline = [
        {"$match": {"restaurant_id": doc["restaurant_id"]}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "n": {"$sum": 1}}},
    ]
    agg = await db.reviews.aggregate(pipeline).to_list(1)
    if agg:
        await db.restaurants.update_one(
            {"id": doc["restaurant_id"]},
            {"$set": {"rating": round(agg[0]["avg"], 2), "rating_count": agg[0]["n"]}},
        )
    return {"ok": True}


@router.post("/{order_id}/complaint", status_code=201)
async def complaint(order_id: str, body: dict, user: dict = Depends(require_role("customer"))):
    doc = await load_order(order_id)
    if doc["customer_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Order not found")
    c = {
        "id": new_id(), "order_id": order_id, "customer_id": user["id"],
        "customer_name": user.get("name", ""), "subject": str(body.get("subject", "Issue"))[:120],
        "message": str(body.get("message", ""))[:1000], "status": "open",
        "resolution": "", "created_at": datetime.now(timezone.utc),
    }
    await db.complaints.insert_one(c)
    return {"ok": True}
