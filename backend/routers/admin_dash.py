"""Admin dashboard: ecosystem overview, user management, orders monitor, commission
config, complaints, NGO donation audit, and heuristic fraud radar."""
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from pymongo import DESCENDING

from lib.auth import require_role
from lib.db import db
from models.catalog import Restaurant
from routers.orders import aware, order_from_doc

router = APIRouter(prefix="/admin", tags=["admin-dashboard"])


class CommissionReq(BaseModel):
    commission_pct: float


class ResolveReq(BaseModel):
    resolution: str


@router.get("/overview")
async def overview(user: dict = Depends(require_role("admin"))):
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    users = await db.users.find({}, {"role": 1}).to_list(500)
    by_role = defaultdict(int)
    for u in users:
        by_role[u.get("role", "customer")] += 1

    orders = await db.orders.find({"placed_at": {"$gte": week_ago}}).to_list(1000)
    gmv = round(sum(o.get("total", 0) for o in orders if o.get("status") not in ("cancelled", "rejected")), 2)
    commissions = 0.0
    rest_cache = {r["id"]: r for r in await db.restaurants.find({}, {"commission_pct": 1}).to_list(100)}
    for o in orders:
        if o.get("status") == "delivered":
            pct = rest_cache.get(o.get("restaurant_id"), {}).get("commission_pct", 18)
            commissions += o.get("subtotal", 0) * pct / 100
    status_counts = defaultdict(int)
    for o in await db.orders.find({}, {"status": 1}).to_list(1000):
        status_counts[o.get("status", "placed")] += 1

    daily = defaultdict(float)
    for o in orders:
        if o.get("status") not in ("cancelled", "rejected"):
            key = (aware(o.get("placed_at")) or now).strftime("%d %b")
            daily[key] += o.get("total", 0)

    donations = await db.donations.find({}).to_list(500)
    meals_saved = sum(d.get("meals", 0) for d in donations)
    subs = await db.subscriptions.count_documents({"status": "active"})

    return {
        "customers": by_role.get("customer", 0), "restaurants": by_role.get("restaurant", 0),
        "delivery_partners": by_role.get("delivery", 0), "admins": by_role.get("admin", 0),
        "orders_this_week": len(orders), "gmv_this_week": gmv,
        "commissions_this_week": round(commissions, 2),
        "orders_by_status": dict(status_counts),
        "open_complaints": await db.complaints.count_documents({"status": "open"}),
        "meals_saved": meals_saved, "active_subscriptions": subs,
        "daily_gmv": [{"day": k, "gmv": round(v, 2)} for k, v in daily.items()],
        "pending_donations": await db.donations.count_documents({"status": "requested"}),
    }


@router.get("/orders")
async def all_orders(status: str = "", user: dict = Depends(require_role("admin"))):
    q = {} if not status or status == "all" else {"status": status}
    docs = await db.orders.find(q).sort("placed_at", DESCENDING).to_list(200)
    return [order_from_doc(d) for d in docs]


@router.get("/users")
async def all_users(user: dict = Depends(require_role("admin"))):
    docs = await db.users.find({}, {"password_hash": 0}).sort("created_at", DESCENDING).to_list(500)
    out = []
    for d in docs:
        d["created_at"] = aware(d.get("created_at"))
        d.pop("_id", None)
        out.append(d)
    return out


@router.patch("/users/{user_id}/active")
async def set_active(user_id: str, body: dict, user: dict = Depends(require_role("admin"))):
    target = await db.users.find_one({"id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    active = bool(body.get("is_active", True))
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": active}})
    return {"ok": True, "is_active": active}


@router.get("/restaurants", response_model=list[Restaurant])
async def all_restaurants(user: dict = Depends(require_role("admin"))):
    docs = await db.restaurants.find({}).sort("name", 1).to_list(100)
    return [Restaurant(**d) for d in docs]


@router.patch("/restaurants/{restaurant_id}/commission")
async def set_commission(restaurant_id: str, body: CommissionReq, user: dict = Depends(require_role("admin"))):
    if not 0 <= body.commission_pct <= 40:
        raise HTTPException(status_code=422, detail="Commission must be 0-40%")
    await db.restaurants.update_one({"id": restaurant_id}, {"$set": {"commission_pct": body.commission_pct}})
    return {"ok": True, "commission_pct": body.commission_pct}


@router.get("/complaints")
async def complaints(user: dict = Depends(require_role("admin"))):
    docs = await db.complaints.find({}).sort("created_at", DESCENDING).to_list(100)
    for d in docs:
        d["created_at"] = aware(d.get("created_at"))
        d.pop("_id", None)
    return docs


@router.post("/complaints/{complaint_id}/resolve")
async def resolve(complaint_id: str, body: ResolveReq, user: dict = Depends(require_role("admin"))):
    await db.complaints.update_one(
        {"id": complaint_id}, {"$set": {"status": "resolved", "resolution": body.resolution[:500]}}
    )
    return {"ok": True}


@router.get("/donations")
async def donations(user: dict = Depends(require_role("admin"))):
    docs = await db.donations.find({}).sort("created_at", DESCENDING).to_list(100)
    for d in docs:
        d["created_at"] = aware(d.get("created_at"))
        d.pop("_id", None)
    return docs


@router.get("/fraud")
async def fraud(user: dict = Depends(require_role("admin"))):
    """Heuristic fraud radar: velocity, high-value COD, repeat cancellers."""
    now = datetime.now(timezone.utc)
    hour_ago = now - timedelta(hours=1)
    flags = []

    recent = await db.orders.find({"placed_at": {"$gte": hour_ago}}).to_list(300)
    per_customer = defaultdict(list)
    for o in recent:
        per_customer[o.get("customer_id", "")].append(o)
    for cid, olist in per_customer.items():
        if len(olist) > 3:
            flags.append({
                "kind": "velocity", "severity": "high", "customer_id": cid,
                "customer_name": olist[0].get("customer_name", ""),
                "detail": f"{len(olist)} orders in the last hour",
            })

    cods = await db.orders.find({"payment_method": "cod", "status": {"$nin": ["delivered", "cancelled"]}}).to_list(100)
    for o in cods:
        if o.get("total", 0) > 1200:
            flags.append({
                "kind": "high-value-cod", "severity": "medium", "customer_id": o.get("customer_id", ""),
                "customer_name": o.get("customer_name", ""), "order_id": o.get("id"),
                "detail": f"COD order of ₹{o.get('total', 0):.0f} — verify on delivery",
            })

    cancelled = await db.orders.find({"status": "cancelled"}).to_list(300)
    cancel_counts = defaultdict(int)
    cancel_names = {}
    for o in cancelled:
        cancel_counts[o.get("customer_id", "")] += 1
        cancel_names[o.get("customer_id", "")] = o.get("customer_name", "")
    for cid, n in cancel_counts.items():
        if n >= 3:
            flags.append({
                "kind": "repeat-canceller", "severity": "low", "customer_id": cid,
                "customer_name": cancel_names.get(cid, ""),
                "detail": f"{n} cancelled orders — possible abuse of free-cancellation",
            })
    return flags
