"""Auth routes: register (customer/restaurant/delivery), login, logout, me."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional

from lib.auth import (
    create_token,
    clear_session_cookie,
    get_current_user,
    hash_password,
    new_id,
    require_user,
    set_session_cookie,
    verify_password,
)
from lib.db import db
from models.misc import UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterReq(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "customer"  # customer | restaurant | delivery (admin is seed-only)
    phone: str = ""
    address: str = ""
    restaurant_name: Optional[str] = None
    cuisines: List[str] = Field(default_factory=list)
    area: Optional[str] = None
    vehicle: str = ""


class LoginReq(BaseModel):
    email: EmailStr
    password: str


def user_out(doc: dict) -> UserOut:
    return UserOut(
        id=doc["id"],
        name=doc.get("name", ""),
        email=doc.get("email", ""),
        role=doc.get("role", "customer"),
        phone=doc.get("phone", ""),
        address=doc.get("address", ""),
        prefs=doc.get("prefs", {}),
        vehicle=doc.get("vehicle", ""),
        is_active=doc.get("is_active", True),
        created_at=doc.get("created_at"),
    )


@router.post("/register", response_model=UserOut, status_code=201)
async def register(body: RegisterReq, response: Response):
    if body.role not in ("customer", "restaurant", "delivery"):
        raise HTTPException(status_code=422, detail="Role must be customer, restaurant or delivery")
    if len(body.password) < 6:
        raise HTTPException(status_code=422, detail="Password must be at least 6 characters")
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user_id = new_id()
    doc = {
        "id": user_id,
        "name": body.name.strip(),
        "email": body.email.lower(),
        "password_hash": hash_password(body.password),
        "role": body.role,
        "phone": body.phone,
        "address": body.address,
        "prefs": {"dietary": [], "cuisines": [], "calorie_cap": None},
        "vehicle": body.vehicle,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }
    if body.role == "restaurant":
        doc["restaurant_ids"] = []
    await db.users.insert_one(doc)

    if body.role == "restaurant":
        restaurant = {
            "id": new_id(),
            "owner_id": user_id,
            "name": (body.restaurant_name or f"{body.name}'s Kitchen").strip(),
            "cuisines": body.cuisines or ["North Indian"],
            "description": "Freshly cooked, made to order.",
            "image_url": "https://images.unsplash.com/photo-1559561724-732dbca7be1e?crop=entropy&cs=srgb&fm=jpg&q=85",
            "address": body.address,
            "area": body.area or "Central Bengaluru",
            "rating": 4.0,
            "rating_count": 0,
            "is_open": True,
            "created_at": datetime.now(timezone.utc),
        }
        await db.restaurants.insert_one(restaurant)
        await db.users.update_one({"id": user_id}, {"$push": {"restaurant_ids": restaurant["id"]}})

    token = create_token(user_id, body.role)
    set_session_cookie(response, token)
    return user_out(doc)


@router.post("/login", response_model=UserOut)
async def login(body: LoginReq, response: Response):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("is_active", True):
        raise HTTPException(status_code=403, detail="This account has been suspended")
    set_session_cookie(response, create_token(user["id"], user["role"]))
    return user_out(user)


@router.post("/logout", status_code=204)
async def logout(response: Response):
    clear_session_cookie(response)
    return None


@router.get("/me", response_model=Optional[UserOut])
async def me(user: Optional[dict] = Depends(get_current_user)):
    if not user:
        return None
    return user_out(user)
