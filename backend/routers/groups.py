"""Group ordering + bill splitting: shared room code, per-member carts, host checkout."""
import random
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from lib.auth import new_id, require_role, require_user
from lib.db import db
from models.misc import GroupMember, GroupOrder
from routers.orders import compute_breakdown, order_from_doc

router = APIRouter(prefix="/groups", tags=["groups"])


class GroupCreateReq(BaseModel):
    restaurant_id: str


class GroupItemReq(BaseModel):
    item_id: str
    qty: int = 1


class GroupCheckoutReq(BaseModel):
    payment_method: str = "upi"
    batching: bool = False
    address: str = ""


def _group_out(doc: dict) -> GroupOrder:
    doc = dict(doc)
    doc["created_at"] = doc.get("created_at")
    if doc["created_at"] and doc["created_at"].tzinfo is None:
        doc["created_at"] = doc["created_at"].replace(tzinfo=timezone.utc)
    members = doc.get("members", [])
    out_members = []
    for m in members:
        total = round(sum(i["price"] * i["qty"] for i in m.get("items", [])), 2)
        out_members.append(GroupMember(user_id=m["user_id"], name=m.get("name", ""), items=m.get("items", []), total=total))
    doc["members"] = out_members
    return GroupOrder(**doc)


async def _load_by_code(code: str) -> dict:
    doc = await db.group_orders.find_one({"code": code})
    if not doc:
        raise HTTPException(status_code=404, detail="Group order not found")
    return doc


@router.post("", response_model=GroupOrder, status_code=201)
async def create_group(body: GroupCreateReq, user: dict = Depends(require_role("customer"))):
    rest = await db.restaurants.find_one({"id": body.restaurant_id})
    if not rest:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    code = f"{random.randint(100000, 999999)}"
    while await db.group_orders.find_one({"code": code}):
        code = f"{random.randint(100000, 999999)}"
    doc = {
        "id": new_id(), "code": code, "host_id": user["id"], "host_name": user.get("name", ""),
        "restaurant_id": rest["id"], "restaurant_name": rest["name"], "status": "open",
        "members": [GroupMember(user_id=user["id"], name=user.get("name", "")).model_dump()],
        "order_id": None, "created_at": datetime.now(timezone.utc),
    }
    await db.group_orders.insert_one(doc)
    return _group_out(doc)


@router.get("/mine", response_model=List[GroupOrder])
async def my_groups(user: dict = Depends(require_role("customer"))):
    docs = await db.group_orders.find({"members.user_id": user["id"]}).sort("created_at", -1).to_list(50)
    return [_group_out(d) for d in docs]


@router.get("/{code}", response_model=GroupOrder)
async def get_group(code: str, user: dict = Depends(require_user)):
    return _group_out(await _load_by_code(code))


@router.post("/{code}/items", response_model=GroupOrder)
async def add_group_item(code: str, body: GroupItemReq, user: dict = Depends(require_role("customer"))):
    group = await _load_by_code(code)
    if group["status"] != "open":
        raise HTTPException(status_code=409, detail="This group order is locked")
    item = await db.menu_items.find_one({"id": body.item_id})
    if not item or item["restaurant_id"] != group["restaurant_id"]:
        raise HTTPException(status_code=404, detail="Menu item not found in this restaurant")

    member = next((m for m in group["members"] if m["user_id"] == user["id"]), None)
    line = {"item_id": item["id"], "name": item["name"], "price": item["price"],
            "qty": max(1, body.qty), "diet": item.get("diet", "veg")}
    if member:
        existing = next((i for i in member["items"] if i["item_id"] == item["id"]), None)
        if existing:
            existing["qty"] += line["qty"]
        else:
            member["items"].append(line)
        await db.group_orders.update_one(
            {"code": code, "members.user_id": user["id"]},
            {"$set": {"members.$.items": member["items"]}},
        )
    else:
        await db.group_orders.update_one(
            {"code": code},
            {"$push": {"members": GroupMember(user_id=user["id"], name=user.get("name", ""), items=[line]).model_dump()}},
        )
    return _group_out(await _load_by_code(code))


@router.post("/{code}/checkout", response_model=dict)
async def group_checkout(code: str, body: GroupCheckoutReq, user: dict = Depends(require_role("customer"))):
    """Host pays the full bill; the response carries the itemized split per member."""
    group = await _load_by_code(code)
    if group["host_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Only the host can checkout the group order")
    if group["status"] == "ordered":
        raise HTTPException(status_code=409, detail="Group order already placed")
    lines = [i for m in group.get("members", []) for i in m.get("items", [])]
    if not lines:
        raise HTTPException(status_code=409, detail="Nothing has been added to this group order yet")

    subtotal = round(sum(i["price"] * i["qty"] for i in lines), 2)
    rest = await db.restaurants.find_one({"id": group["restaurant_id"]})
    packaging, delivery, gst, batch_disc, total = compute_breakdown(
        subtotal, float(rest.get("delivery_fee", 30)), body.batching
    )
    now = datetime.now(timezone.utc)
    order = {
        "id": new_id(),
        "customer_id": user["id"], "customer_name": f"Group {group['code']} · {user.get('name', '')}",
        "restaurant_id": group["restaurant_id"], "restaurant_name": group["restaurant_name"],
        "items": lines, "address": body.address or user.get("address", ""), "status": "placed",
        "subtotal": subtotal, "packaging_fee": packaging, "delivery_fee": delivery,
        "platform_fee": 6.0, "gst": gst, "batching_discount": batch_disc, "total": total,
        "payment_method": body.payment_method,
        "payment_status": "cash_on_delivery" if body.payment_method == "cod" else "paid",
        "batching": body.batching, "group_id": group["id"], "group_code": group["code"],
        "prep_mins": int(rest.get("prep_time_mins", 25)), "eta_mins": int(rest.get("prep_time_mins", 25)) + 18,
        "pickup_pin": f"{random.randint(1000, 9999)}", "placed_at": now,
    }
    await db.orders.insert_one(order)
    await db.group_orders.update_one(
        {"code": code}, {"$set": {"status": "ordered", "order_id": order["id"]}}
    )
    split = [{"name": m.get("name", ""), "total": round(sum(i["price"] * i["qty"] for i in m.get("items", [])), 2)}
             for m in group.get("members", [])]
    return {"order": order_from_doc(order), "split": split, "grand_total": total}
