"""Restaurant partner dashboard: kitchen queue, menu/inventory manager, revenue
analytics, prep-time settings, and NGO surplus-food donation dispatch."""
import math
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from lib.auth import new_id, require_role
from lib.db import db
from models.catalog import MenuItem, MenuItemPatch, Restaurant, RestaurantSettingsPatch
from routers.orders import aware, order_from_doc

router = APIRouter(prefix="/dashboard/restaurant", tags=["restaurant-dashboard"])


class DonateReq(BaseModel):
    restaurant_id: str
    meals: int = Field(gt=0, le=500)
    ngo_name: str = "Feeding India"


async def _owned_restaurant(user: dict, restaurant_id: str) -> dict:
    rest = await db.restaurants.find_one({"id": restaurant_id, "owner_id": user["id"]})
    if not rest:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return rest


@router.get("/my-restaurants", response_model=List[Restaurant])
async def my_restaurants(user: dict = Depends(require_role("restaurant"))):
    docs = await db.restaurants.find({"owner_id": user["id"]}).sort("name", 1).to_list(50)
    return [Restaurant(**d) for d in docs]


@router.get("")
async def dashboard(restaurant_id: str, user: dict = Depends(require_role("restaurant"))):
    rest = await _owned_restaurant(user, restaurant_id)
    now = datetime.now(timezone.utc)
    day_start = now - timedelta(days=1)

    docs = await db.orders.find({"restaurant_id": restaurant_id}).sort("placed_at", -1).to_list(200)
    orders = [order_from_doc(d) for d in docs]
    active = [o for o in orders if o.status in ("placed", "accepted", "preparing", "ready", "picked")]
    today = [o for o in orders if (aware(o.placed_at) or now) >= day_start and o.status != "cancelled"]
    revenue = round(sum(o.total for o in today if o.status in ("delivered", "picked", "ready", "preparing", "accepted")), 2)
    commission = round(sum(o.subtotal * rest.get("commission_pct", 18) / 100 for o in today if o.status == "delivered"), 2)

    menu = await db.menu_items.find({"restaurant_id": restaurant_id}).sort("category", 1).to_list(500)
    return {
        "restaurant": Restaurant(**rest),
        "active_orders": active,
        "recent_orders": orders[:30],
        "stats": {
            "today_orders": len(today),
            "today_revenue": revenue,
            "today_commission": commission,
            "pending_count": len([o for o in orders if o.status == "placed"]),
            "menu_count": len(menu),
            "low_stock": [m["name"] for m in menu if m.get("is_surplus") and m.get("surplus_qty", 0) <= 3 and m.get("surplus_qty", 0) > 0],
        },
        "menu": [MenuItem(**m) for m in menu],
    }


@router.get("/analytics")
async def analytics(restaurant_id: str, days: int = 7, user: dict = Depends(require_role("restaurant"))):
    rest = await _owned_restaurant(user, restaurant_id)
    since = datetime.now(timezone.utc) - timedelta(days=days)
    docs = await db.orders.find({
        "restaurant_id": restaurant_id, "status": "delivered", "delivered_at": {"$gte": since},
    }).to_list(500)

    by_day: dict = {}
    for d in docs:
        key = (aware(d.get("delivered_at")) or aware(d["placed_at"])).strftime("%d %b")
        rev = by_day.get(key, {"revenue": 0.0, "orders": 0})
        rev["revenue"] += d.get("total", 0)
        rev["orders"] += 1
        by_day[key] = rev
    daily = [{"day": k, "revenue": round(v["revenue"], 2), "orders": v["orders"]} for k, v in by_day.items()]

    counts: dict = {}
    for d in docs:
        for i in d.get("items", []):
            counts[i["name"]] = counts.get(i["name"], 0) + i["qty"]
    popular = sorted([{"name": k, "orders": v} for k, v in counts.items()], key=lambda x: -x["orders"])[:5]

    reviews = await db.reviews.find({"restaurant_id": restaurant_id}).sort("created_at", -1).to_list(20)
    return {
        "daily": daily,
        "popular": popular,
        "reviews": [{"name": r.get("customer_name", ""), "rating": r.get("rating", 5), "comment": r.get("comment", "")} for r in reviews[:6]],
    }


class MenuItemCreateReq(BaseModel):
    restaurant_id: str
    name: str
    price: float
    description: str = ""
    category: str = "Main Course"
    diet: str = "veg"
    calories: int = 300
    allergens: List[str] = Field(default_factory=list)
    ingredients: List[str] = Field(default_factory=list)
    prep_mins: int = 15
    image_url: str = ""


@router.post("/menu-items", response_model=MenuItem, status_code=201)
async def create_menu_item(body: MenuItemCreateReq, user: dict = Depends(require_role("restaurant"))):
    await _owned_restaurant(user, body.restaurant_id)
    item = MenuItem(
        id=new_id(), restaurant_id=body.restaurant_id, name=body.name, price=body.price,
        description=body.description, category=body.category, diet=body.diet,
        calories=body.calories, allergens=body.allergens, ingredients=body.ingredients,
        prep_mins=body.prep_mins,
        image_url=body.image_url or "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?crop=entropy&cs=srgb&fm=jpg&q=85",
    )
    await db.menu_items.insert_one(item.model_dump())
    return item


@router.patch("/menu-items/{item_id}", response_model=MenuItem)
async def patch_menu_item(item_id: str, body: MenuItemPatch, user: dict = Depends(require_role("restaurant"))):
    doc = await db.menu_items.find_one({"id": item_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Menu item not found")
    await _owned_restaurant(user, doc["restaurant_id"])
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        await db.menu_items.update_one({"id": item_id}, {"$set": updates})
    return MenuItem(**(await db.menu_items.find_one({"id": item_id})))


@router.delete("/menu-items/{item_id}", status_code=204)
async def delete_menu_item(item_id: str, user: dict = Depends(require_role("restaurant"))):
    doc = await db.menu_items.find_one({"id": item_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Menu item not found")
    await _owned_restaurant(user, doc["restaurant_id"])
    await db.menu_items.delete_one({"id": item_id})
    return None


@router.patch("/settings", response_model=Restaurant)
async def settings(restaurant_id: str, body: RestaurantSettingsPatch, user: dict = Depends(require_role("restaurant"))):
    await _owned_restaurant(user, restaurant_id)
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        await db.restaurants.update_one({"id": restaurant_id}, {"$set": updates})
    return Restaurant(**(await db.restaurants.find_one({"id": restaurant_id})))


@router.post("/donate", status_code=201)
async def donate(body: DonateReq, user: dict = Depends(require_role("restaurant"))):
    rest = await _owned_restaurant(user, body.restaurant_id)
    doc = {
        "id": new_id(), "restaurant_id": rest["id"], "restaurant_name": rest["name"],
        "ngo_name": body.ngo_name, "meals": body.meals, "status": "requested",
        "created_at": datetime.now(timezone.utc),
    }
    await db.donations.insert_one(doc)
    return {"ok": True, "donation_id": doc["id"]}


@router.get("/donations")
async def donations(restaurant_id: str, user: dict = Depends(require_role("restaurant"))):
    await _owned_restaurant(user, restaurant_id)
    docs = await db.donations.find({"restaurant_id": restaurant_id}).sort("created_at", -1).to_list(50)
    for d in docs:
        d["created_at"] = aware(d.get("created_at"))
    return docs
