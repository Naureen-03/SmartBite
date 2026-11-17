"""Order + pricing models. Mirrored by src/lib/types.ts on the frontend."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

PACKAGING_FEE = 15.0
PLATFORM_FEE = 6.0
GST_RATE = 0.05
BATCH_DELIVERY_FACTOR = 0.7  # eco-batching saves 30% of the delivery fee


class OrderItem(BaseModel):
    item_id: str
    name: str
    price: float
    qty: int
    diet: str = "veg"
    image_url: str = ""


class Order(BaseModel):
    id: str
    customer_id: str
    customer_name: str
    restaurant_id: str
    restaurant_name: str
    items: List[OrderItem] = Field(default_factory=list)
    address: str = ""
    status: str = "placed"  # placed|accepted|preparing|ready|picked|delivered|cancelled|rejected
    subtotal: float = 0.0
    packaging_fee: float = 0.0
    delivery_fee: float = 0.0
    platform_fee: float = 0.0
    gst: float = 0.0
    batching_discount: float = 0.0
    total: float = 0.0
    payment_method: str = "upi"  # upi | card | cod | wallet
    payment_status: str = "paid"  # paid | cash_on_delivery
    batching: bool = False
    group_id: Optional[str] = None
    group_code: Optional[str] = None
    scheduled_for: Optional[str] = None  # ISO date for scheduled/subscription meals
    prep_mins: int = 25
    eta_mins: int = 35
    partner_id: Optional[str] = None
    partner_name: Optional[str] = None
    pickup_pin: str = "0000"
    payout: float = 0.0
    placed_at: datetime
    accepted_at: Optional[datetime] = None
    preparing_at: Optional[datetime] = None
    ready_at: Optional[datetime] = None
    picked_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None


class CheckoutReq(BaseModel):
    items: List[OrderItem]
    restaurant_id: str
    address: str = ""
    payment_method: str = "upi"
    batching: bool = False
    group_id: Optional[str] = None
    scheduled_for: Optional[str] = None


class ReviewReq(BaseModel):
    rating: int  # 1..5
    comment: str = ""


class BudgetLine(BaseModel):
    item_id: str
    name: str
    image_url: str = ""
    diet: str = "veg"
    price: float
    restaurant_id: str
    restaurant_name: str
    area: str = ""
    calories: int = 0
    total_price: float
    breakdown: dict = Field(default_factory=dict)


class TrackOut(BaseModel):
    order_id: str
    status: str
    stage: int = 1  # 1 confirmed .. 5 delivered
    stage_label: str = "Order confirmed"
    progress_pct: float = 0.0
    eta_mins: int = 35
    minutes_left: float = 0
    temperature_c: float = 68.0
    distance_km: float = 4.2
    route_points: List[List[float]] = Field(default_factory=list)
    bike_at: List[float] = Field(default_factory=list)
    partner_name: Optional[str] = None
    pickup_pin: str = ""
    prep_mins: int = 25
