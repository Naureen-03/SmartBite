"""Catalog models: restaurants and menu items. Mirrored by src/lib/types.ts on the frontend."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class Restaurant(BaseModel):
    id: str
    owner_id: str
    name: str
    cuisines: List[str] = Field(default_factory=list)
    description: str = ""
    image_url: str = ""
    address: str = ""
    area: str = ""
    rating: float = 4.2
    rating_count: int = 0
    prep_time_mins: int = 25
    delivery_fee: float = 30.0
    cost_for_two: int = 400
    is_open: bool = True
    is_pure_veg: bool = False
    closes_at: str = "22:00"  # HH:MM IST — basis for the surplus-deal countdown
    commission_pct: float = 18.0
    plan_price: float = 129.0  # per-meal subscription price
    created_at: Optional[datetime] = None


class MenuItem(BaseModel):
    id: str
    restaurant_id: str
    name: str
    description: str = ""
    price: float
    image_url: str = ""
    category: str = "Main Course"
    diet: str = "veg"  # veg | nonveg | egg
    calories: int = 300
    protein: int = 10
    carbs: int = 30
    fats: int = 10
    allergens: List[str] = Field(default_factory=list)
    ingredients: List[str] = Field(default_factory=list)
    spice: str = "medium"  # mild | medium | fiery
    customisable: bool = False
    is_available: bool = True
    is_surplus: bool = False
    original_price: Optional[float] = None
    surplus_qty: int = 0
    prep_mins: int = 15
    orders_count: int = 0
    tags: List[str] = Field(default_factory=list)  # comfort | hot | light | protein-rich | cold | sweet ...


class MenuItemPatch(BaseModel):
    """Owner menu edits — fields are whitelisted in the handler, never mass-assigned."""
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    is_available: Optional[bool] = None
    is_surplus: Optional[bool] = None
    original_price: Optional[float] = None
    surplus_qty: Optional[int] = None
    prep_mins: Optional[int] = None


class RestaurantSettingsPatch(BaseModel):
    prep_time_mins: Optional[int] = None
    is_open: Optional[bool] = None
    delivery_fee: Optional[float] = None
