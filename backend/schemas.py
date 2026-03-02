from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from decimal import Decimal

# --- User schemas ---
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: str
    is_admin: bool
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Auth schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

# --- Product schemas ---
class ProductCreate(BaseModel):
    name: str
    url: str
    selector: Optional[str] = None
    interval_minutes: int = 60

class ProductOut(BaseModel):
    id: int
    name: str
    url: str
    selector: Optional[str]
    interval_minutes: int
    active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    selector: Optional[str] = None
    interval_minutes: Optional[int] = None
    active: Optional[bool] = None

# --- Price history schemas ---
class PriceHistoryOut(BaseModel):
    id: int
    product_id: int
    price: Optional[Decimal]
    currency: str
    scraped_at: datetime
    error: Optional[str]

    class Config:
        from_attributes = True

# --- Alert schemas ---
class AlertCreate(BaseModel):
    alert_type: str  # 'price_drop' or 'all_time_low'
    threshold: Optional[Decimal] = None

class AlertOut(BaseModel):
    id: int
    product_id: int
    alert_type: str
    threshold: Optional[Decimal]
    enabled: bool
    last_triggered_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True
