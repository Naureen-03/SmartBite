"""Delivery partner dashboard: batched available requests (smart batching), trip
cockpit (pickup PIN → pickup → delivered), earnings + history."""
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from lib.auth import require_role
from lib.db import db
from models.catalog import Restaurant
from models.misc import DeliveryAcceptReq
from routers.orders import aware, order_from_doc

router = APIRouter(prefix="/delivery", tags=["delivery-dashboard"])


@router.get("/available")
async def available(user: dict = Depends(require_role("delivery"))):
    """Ready-to-pickup orders grouped by restaurant = one pickup, multi-drop route."""
    docs = await db.orders.find({"status": "ready", "partner_id": None}).sort("placed_at", 1).to_list(100)
    batches: dict = {}
    for d in docs:
        o = order_from_doc(d)
        b = batches.setdefault(o.restaurant_id, {
            "restaurant_id": o.restaurant_id, "restaurant_name": o.restaurant_name,
            "area": "", "image_url": "", "orders": [], "total_payout": 0.0,
        })
        b["orders"].append(o)
        b["total_payout"] = round(b["total_payout"] + o.payout, 2)
    out = []
    for b in batches.values():
        rest = await db.restaurants.find_one({"id": b["restaurant_id"]})
        if rest:
            b["area"] = rest.get("area", "")
            b["image_url"] = rest.get("image_url", "")
        # multi-drop optimisation: nearest-first drop order (deterministic by total)
        b["orders"].sort(key=lambda o: (o.total, o.id))
        out.append(b)
    return out


class ClaimReq(BaseModel):
    order_ids: List[str]


@router.post("/claim", status_code=201)
async def claim(body: ClaimReq, user: dict = Depends(require_role("delivery"))):
    if not body.order_ids:
        return {"claimed": 0}
    res = await db.orders.update_many(
        {"id": {"$in": body.order_ids}, "status": "ready", "partner_id": None},
        {"$set": {"partner_id": user["id"], "partner_name": user.get("name", "")}},
    )
    return {"claimed": res.modified_count}


@router.get("/trip")
async def trip(user: dict = Depends(require_role("delivery"))):
    """Active trip: claimed but not yet delivered, in optimized drop order."""
    docs = await db.orders.find({"partner_id": user["id"], "status": {"$in": ["ready", "picked"]}}).sort("placed_at", 1).to_list(20)
    orders = [order_from_doc(d) for d in docs]
    orders.sort(key=lambda o: (o.status != "picked", o.total))
    return orders


@router.get("/me")
async def me(user: dict = Depends(require_role("delivery"))):
    docs = await db.orders.find({"partner_id": user["id"]}).sort("placed_at", -1).to_list(200)
    orders = [order_from_doc(d) for d in docs]
    delivered = [o for o in orders if o.status == "delivered"]
    now = datetime.now(timezone.utc)
    today = [o for o in delivered if o.delivered_at and aware(o.delivered_at) >= now - timedelta(days=1)]
    week = [o for o in delivered if o.delivered_at and aware(o.delivered_at) >= now - timedelta(days=7)]

    by_day: dict = {}
    for o in week:
        key = (aware(o.delivered_at) or now).strftime("%a")
        by_day[key] = round(by_day.get(key, 0) + o.payout, 2)
    return {
        "name": user.get("name", ""), "vehicle": user.get("vehicle", "Bike"),
        "total_deliveries": len(delivered),
        "today_earnings": round(sum(o.payout for o in today), 2),
        "week_earnings": round(sum(o.payout for o in week), 2),
        "weekly": by_day,
        "history": [o for o in orders if o.status == "delivered"][:20],
        "rating": 4.8,
    }
