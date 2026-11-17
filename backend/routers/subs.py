"""Scheduled & subscription meals: weekly tiffin plans per restaurant."""
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from lib.auth import new_id, require_role
from lib.db import db
from models.misc import SubsCreateReq, Subscription
from routers.orders import aware

router = APIRouter(prefix="/subs", tags=["subscriptions"])


def _out(doc: dict) -> Subscription:
    doc = dict(doc)
    doc["started_at"] = aware(doc.get("started_at")) or datetime.now(timezone.utc)
    return Subscription(**doc)


@router.get("/mine", response_model=List[Subscription])
async def mine(user: dict = Depends(require_role("customer"))):
    docs = await db.subscriptions.find({"user_id": user["id"]}).sort("started_at", -1).to_list(50)
    return [_out(d) for d in docs]


@router.post("", response_model=Subscription, status_code=201)
async def create(body: SubsCreateReq, user: dict = Depends(require_role("customer"))):
    rest = await db.restaurants.find_one({"id": body.restaurant_id})
    if not rest:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    if body.meal not in ("lunch", "dinner"):
        raise HTTPException(status_code=422, detail="Meal must be lunch or dinner")
    valid_days = {"Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"}
    days = [d for d in body.days if d in valid_days]
    if not days:
        raise HTTPException(status_code=422, detail="Pick at least one weekday")
    doc = {
        "id": new_id(), "user_id": user["id"], "restaurant_id": rest["id"],
        "restaurant_name": rest["name"], "meal": body.meal, "days": days,
        "price_per_meal": float(rest.get("plan_price", 129)),
        "status": "active", "started_at": datetime.now(timezone.utc),
    }
    await db.subscriptions.insert_one(doc)
    return _out(doc)


@router.patch("/{sub_id}")
async def update(sub_id: str, body: dict, user: dict = Depends(require_role("customer"))):
    sub = await db.subscriptions.find_one({"id": sub_id, "user_id": user["id"]})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    status = body.get("status", "")
    if status not in ("active", "paused", "cancelled"):
        raise HTTPException(status_code=422, detail="Status must be active, paused or cancelled")
    await db.subscriptions.update_one({"id": sub_id}, {"$set": {"status": status}})
    return _out(await db.subscriptions.find_one({"id": sub_id}))
