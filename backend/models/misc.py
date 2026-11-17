"""Group orders, subscriptions, donations, complaints, reviews, users. Mirrored by src/lib/types.ts."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: str  # customer | restaurant | delivery | admin
    phone: str = ""
    address: str = ""
    prefs: dict = Field(default_factory=dict)
    vehicle: str = ""
    is_active: bool = True
    created_at: Optional[datetime] = None


class GroupMember(BaseModel):
    user_id: str
    name: str
    items: List[dict] = Field(default_factory=list)  # [{item_id, name, price, qty, diet}]
    total: float = 0.0


class GroupOrder(BaseModel):
    id: str
    code: str
    host_id: str
    host_name: str
    restaurant_id: str
    restaurant_name: str
    status: str = "open"  # open | locked | ordered
    members: List[GroupMember] = Field(default_factory=list)
    order_id: Optional[str] = None
    created_at: datetime


class Subscription(BaseModel):
    id: str
    user_id: str
    restaurant_id: str
    restaurant_name: str
    meal: str = "lunch"  # lunch | dinner
    days: List[str] = Field(default_factory=list)  # Mon..Sun
    price_per_meal: float = 129.0
    status: str = "active"  # active | paused | cancelled
    started_at: datetime


class Donation(BaseModel):
    id: str
    restaurant_id: str
    restaurant_name: str
    ngo_name: str
    meals: int
    status: str = "requested"  # requested | collected
    created_at: datetime


class Complaint(BaseModel):
    id: str
    order_id: str
    customer_id: str
    customer_name: str
    subject: str
    message: str
    status: str = "open"  # open | resolved
    resolution: str = ""
    created_at: datetime


class Review(BaseModel):
    id: str
    order_id: str
    customer_id: str
    customer_name: str
    restaurant_id: str
    rating: int
    comment: str = ""
    created_at: datetime


class ComplaintReq(BaseModel):
    order_id: str
    subject: str
    message: str


class SubsCreateReq(BaseModel):
    restaurant_id: str
    meal: str = "lunch"
    days: List[str] = Field(default_factory=list)


class DeliveryAcceptReq(BaseModel):
    order_ids: List[str] = Field(default_factory=list)


class FraudFlag(BaseModel):
    kind: str
    severity: str  # high | medium | low
    customer_id: str
    customer_name: str
    order_id: Optional[str] = None
    detail: str = ""
