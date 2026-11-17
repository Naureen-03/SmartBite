"""Public catalog: restaurant discovery + menus with allergen/ingredient transparency."""
import re
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from lib.db import db
from models.catalog import MenuItem, Restaurant

router = APIRouter(tags=["catalog"])


@router.get("/restaurants", response_model=List[Restaurant])
async def list_restaurants(
    q: str = "",
    cuisine: str = "",
    diet: str = "",
    area: str = "",
    max_delivery: Optional[float] = None,
):
    query: dict = {"is_open": {"$ne": False}}
    if q:
        query["name"] = {"$regex": re.escape(q), "$options": "i"}
    if cuisine:
        query["cuisines"] = {"$regex": re.escape(cuisine), "$options": "i"}
    if area:
        query["area"] = {"$regex": re.escape(area), "$options": "i"}
    if diet == "veg":
        query["is_pure_veg"] = True
    if max_delivery is not None:
        query["delivery_fee"] = {"$lte": max_delivery}
    docs = await db.restaurants.find(query).sort("rating", -1).to_list(100)
    return [Restaurant(**d) for d in docs]


@router.get("/restaurants/{restaurant_id}", response_model=Restaurant)
async def get_restaurant(restaurant_id: str):
    doc = await db.restaurants.find_one({"id": restaurant_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return Restaurant(**doc)


@router.get("/restaurants/{restaurant_id}/menu", response_model=List[MenuItem])
async def get_menu(restaurant_id: str, diet: str = "", max_calories: Optional[int] = None):
    query: dict = {"restaurant_id": restaurant_id}
    if diet in ("veg", "nonveg", "egg"):
        query["diet"] = diet
    if max_calories:
        query["calories"] = {"$lte": max_calories}
    docs = await db.menu_items.find(query).sort("orders_count", -1).to_list(500)
    return [MenuItem(**d) for d in docs]


@router.get("/menu/{item_id}", response_model=MenuItem)
async def get_menu_item(item_id: str):
    doc = await db.menu_items.find_one({"id": item_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return MenuItem(**doc)
