"""Smart discovery: AI heuristic recommendations, budget-based meal finder,
surplus (food-waste) deals, and context meta (simulated weather + IST time of day)."""
import hashlib
from datetime import datetime
from typing import List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query

from lib.auth import get_current_user
from lib.db import db
from models.orders import BudgetLine, PACKAGING_FEE, PLATFORM_FEE, GST_RATE, BATCH_DELIVERY_FACTOR

router = APIRouter(prefix="/discover", tags=["discover"])

IST = ZoneInfo("Asia/Kolkata")
WEATHERS = ("Pleasant", "Sunny", "Rainy", "Cool", "Humid")


def weather_today() -> str:
    seed = int(datetime.now(IST).strftime("%Y%m%d"))
    return WEATHERS[seed % len(WEATHERS)]


def time_of_day() -> str:
    h = int(datetime.now(IST).strftime("%H"))
    if 5 <= h < 11:
        return "morning"
    if 11 <= h < 16:
        return "afternoon"
    if 16 <= h < 22:
        return "evening"
    return "late-night"


@router.get("/meta")
async def meta():
    return {
        "weather": weather_today(),
        "time_of_day": time_of_day(),
        "city": "Bengaluru",
        "greeting": {
            "morning": "Good morning",
            "afternoon": "Good afternoon",
            "evening": "Good evening",
            "late-night": "Late-night cravings",
        }[time_of_day()],
    }


def _context_reasons(item: dict, weather: str, tod: str) -> List[str]:
    tags = set(item.get("tags", []))
    category = item.get("category", "")
    reasons = []
    if weather == "Rainy" and tags & {"hot", "comfort", "soup", "fried"}:
        reasons.append("Rainy-day warmer")
    if weather == "Cool" and tags & {"hot", "comfort", "sweet"}:
        reasons.append("Warm pick for cool weather")
    if weather == "Sunny" and tags & {"cold", "beverage", "ice-cream", "light"}:
        reasons.append("Cooling treat for a sunny day")
    if weather == "Humid" and tags & {"light", "fresh", "salad"}:
        reasons.append("Light bite for humid air")
    if tod == "morning" and "Breakfast" in category:
        reasons.append("Breakfast favourite")
    if tod == "afternoon" and ("Thali" in category or "Rice" in category or "Main" in category):
        reasons.append("Lunch-hour staple")
    if tod == "late-night" and tags & {"snack", "fried", "comfort"}:
        reasons.append("Late-night craving")
    return reasons


def _personal_reasons(item: dict, user: Optional[dict], history_item_ids: set, history_cuisines: set) -> List[str]:
    reasons = []
    if item["id"] in history_item_ids:
        reasons.append("You loved this before")
    if history_cuisines and set(item.get("cuisines", [])) & history_cuisines:
        reasons.append("Suits your taste")
    prefs = (user or {}).get("prefs", {})
    if "veg" in prefs.get("dietary", []) and item.get("diet") == "veg":
        reasons.append("Pure veg")
    if "vegan" in prefs.get("dietary", []):
        reasons.append("Plant-based pick")
    if prefs.get("calorie_cap") and item.get("calories", 0) <= prefs["calorie_cap"] * 0.4:
        reasons.append("Light, fits your calorie goal")
    if item.get("protein", 0) >= 25:
        reasons.append("High protein")
    if item.get("is_surplus"):
        reasons.append("Saver deal — rescue a meal")
    return reasons


async def _history_for(user: Optional[dict]):
    if not user:
        return set(), set()
    orders = await db.orders.find(
        {"customer_id": user["id"], "status": "delivered"}, {"items": 1, "restaurant_id": 1}
    ).to_list(50)
    ids = {i["item_id"] for o in orders for i in o.get("items", [])}
    rest_ids = {o["restaurant_id"] for o in orders}
    cuisines = set()
    if rest_ids:
        rests = await db.restaurants.find({"id": {"$in": list(rest_ids)}}, {"cuisines": 1}).to_list(20)
        for r in rests:
            cuisines.update(r.get("cuisines", []))
    return ids, cuisines


@router.get("/recommendations")
async def recommendations(user: Optional[dict] = Depends(get_current_user)):
    """Heuristic recommendation engine: order history + preferences + dietary rules +
    weather + time of day + calories + popularity. No external key needed."""
    weather, tod = weather_today(), time_of_day()
    history_ids, history_cuisines = await _history_for(user)
    prefs = (user or {}).get("prefs", {})

    items = await db.menu_items.find({"is_available": True}).to_list(600)
    rests = {r["id"]: r for r in await db.restaurants.find({}, {"id": 1, "cuisines": 1, "area": 1, "delivery_fee": 1, "name": 1}).to_list(100)}

    scored = []
    for it in items:
        r = rests.get(it.get("restaurant_id"))
        if not r or not r.get("is_open", True):
            continue
        diet_ok = True
        if "vegan" in prefs.get("dietary", []):
            diet_ok = it.get("diet") == "veg" and "paneer" not in it.get("name", "").lower()
        elif "veg" in prefs.get("dietary", []):
            diet_ok = it.get("diet") == "veg"
        if not diet_ok:
            continue

        score = 0.0
        reasons = []
        if it["id"] in history_ids:
            score += 25
        if history_cuisines and set(it.get("cuisines", [])) & history_cuisines:
            score += 20
        if set(it.get("cuisines", [])) & set(prefs.get("cuisines", [])):
            score += 20
        ctx = _context_reasons(it, weather, tod)
        score += 15 * len(ctx)
        personal = _personal_reasons(it, user, history_ids, history_cuisines)
        score += 10 * len([p for p in personal if p not in ctx])
        if prefs.get("calorie_cap") and it.get("calories", 0) <= prefs["calorie_cap"]:
            score += 8
        score += min(15.0, it.get("orders_count", 0) / 10.0)
        score += min(4.0, it.get("rating", 4.0))
        if not reasons:
            reasons = (ctx + personal)[:2] or ["Popular right now"]
        scored.append({
            "item": it,
            "restaurant": r,
            "score": round(score, 1),
            "reasons": list(dict.fromkeys(ctx + personal))[:3],
        })

    scored.sort(key=lambda s: s["score"], reverse=True)
    out = []
    for s in scored[:12]:
        it, r = s["item"], s["restaurant"]
        out.append({
            "item_id": it["id"],
            "name": it["name"],
            "image_url": it.get("image_url", ""),
            "price": it["price"],
            "original_price": it.get("original_price"),
            "diet": it.get("diet", "veg"),
            "calories": it.get("calories", 0),
            "protein": it.get("protein", 0),
            "is_surplus": it.get("is_surplus", False),
            "restaurant_id": r["id"],
            "restaurant_name": r["name"],
            "area": r.get("area", ""),
            "score": s["score"],
            "reasons": s["reasons"],
        })
    return {"weather": weather, "time_of_day": tod, "items": out}


@router.get("/budget", response_model=List[BudgetLine])
async def budget_find(amount: float = Query(..., gt=0, le=5000), batching: bool = True):
    """Smart budget discovery: every line fits `amount` INCLUDING GST, delivery
    (eco-batched), packaging and platform fee — the price you see is the price you pay."""
    open_rests = await db.restaurants.find({"is_open": {"$ne": False}}).to_list(100)
    fits: List[tuple] = []
    for r in open_rests:
        delivery = round(r.get("delivery_fee", 30) * BATCH_DELIVERY_FACTOR, 2)
        packaging = PACKAGING_FEE
        # total = 1.05*(subtotal+packaging) + delivery + platform  →  solve for subtotal
        max_subtotal = (amount - delivery - PLATFORM_FEE) / (1 + GST_RATE) - packaging
        if max_subtotal < 40:
            continue
        fits.append((r, round(max_subtotal, 2)))

    lines: List[BudgetLine] = []
    for r, max_sub in fits:
        items = await db.menu_items.find(
            {"restaurant_id": r["id"], "is_available": True, "price": {"$lte": max_sub}}
        ).sort("rating", -1).to_list(6)
        for it in items:
            delivery = round(r.get("delivery_fee", 30) * BATCH_DELIVERY_FACTOR, 2)
            packaging = PACKAGING_FEE
            gst = round(GST_RATE * (it["price"] + packaging), 2)
            total = round(it["price"] + packaging + delivery + PLATFORM_FEE + gst, 2)
            if total > amount:
                continue
            lines.append(BudgetLine(
                item_id=it["id"], name=it["name"], image_url=it.get("image_url", ""),
                diet=it.get("diet", "veg"), price=it["price"],
                restaurant_id=r["id"], restaurant_name=r["name"], area=r.get("area", ""),
                calories=it.get("calories", 0), total_price=total,
                breakdown={
                    "item": it["price"], "packaging": packaging, "delivery": delivery,
                    "platform_fee": PLATFORM_FEE, "gst": gst, "batching": True,
                },
            ))
    lines.sort(key=lambda l: (-(l.price / max(l.total_price, 1))))
    return lines[:12]


@router.get("/surplus")
async def surplus_deals():
    """Surplus food at a discount before closing — the waste-reduction flash rail."""
    rests = {r["id"]: r for r in await db.restaurants.find({"is_open": {"$ne": False}}).to_list(100)}
    items = await db.menu_items.find(
        {"is_surplus": True, "is_available": True, "surplus_qty": {"$gt": 0}}
    ).sort("orders_count", -1).to_list(50)
    out = []
    for it in items:
        r = rests.get(it.get("restaurant_id"))
        if not r:
            continue
        out.append({
            "item_id": it["id"], "name": it["name"], "image_url": it.get("image_url", ""),
            "price": it["price"], "original_price": it.get("original_price") or it["price"] * 2,
            "surplus_qty": it.get("surplus_qty", 0),
            "restaurant_id": r["id"], "restaurant_name": r["name"], "area": r.get("area", ""),
            "closes_at": r.get("closes_at", "22:00"), "diet": it.get("diet", "veg"),
        })
    return out
