"""Auth: password hashing, JWT httpOnly-cookie sessions, role dependencies.

Roles: customer | restaurant | delivery | admin (RBAC, Layer 1) plus object ownership
checks in the routers (Layer 3). Deny-by-default: anything without an explicit role
allow-list fails closed via require_role().
"""
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Request, Response
from jose import JWTError, jwt
from passlib.context import CryptContext

from lib.db import db

SECRET = os.environ.get("JWT_SECRET", "smartbite-dev-secret")
COOKIE_NAME = "smartbite_session"
TOKEN_TTL_HOURS = 24 * 7

pwd = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd.verify(plain, hashed)
    except Exception:
        return False


def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, SECRET, algorithm="HS256")


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        COOKIE_NAME,
        token,
        httponly=True,
        samesite="lax",
        max_age=TOKEN_TTL_HOURS * 3600,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/")


async def get_current_user(request: Request) -> Optional[dict]:
    """Re-derive the principal from the DB on every request (a revoked/blocked user
    loses access immediately, not at token expiry)."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET, algorithms=["HS256"])
    except JWTError:
        return None
    user = await db.users.find_one({"id": payload.get("sub")})
    if not user or not user.get("is_active", True):
        return None
    return user


async def require_user(user: dict = Depends(get_current_user)) -> dict:
    if not user:
        raise HTTPException(status_code=401, detail="Sign in required")
    return user


def require_role(*roles: str):
    async def dep(user: dict = Depends(require_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Not allowed for your role")
        return user

    return dep


def new_id() -> str:
    return str(uuid.uuid4())
