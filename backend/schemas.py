from pydantic import BaseModel
from typing import Optional, List, Dict
from decimal import Decimal
from datetime import datetime

class UserCreate(BaseModel):
    username: str
    email: Optional[str] = None
    password: str

class UserOut(BaseModel):
    id: int
    username: str
    email: Optional[str]
    is_admin: bool
    is_super_admin: bool
    active: bool
    default_currency: str
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class SourceCreate(BaseModel):
    label: Optional[str] = None
    url: str
    selector: Optional[str] = None
    interval_minutes: int = 60
    currency: str = 'GBP'

class SourceUpdate(BaseModel):
    label: Optional[str] = None
    url: Optional[str] = None
    selector: Optional[str] = None
    interval_minutes: Optional[int] = None
    active: Optional[bool] = None
    currency: Optional[str] = None

class SourceOut(BaseModel):
    id: int
    product_id: int
    label: str
    url: str
    selector: Optional[str]
    interval_minutes: int
    active: bool
    currency: str
    created_at: datetime
    class Config:
        from_attributes = True

class ProductCreate(BaseModel):
    name: str

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    active: Optional[bool] = None

class ProductOut(BaseModel):
    id: int
    user_id: int
    name: str
    active: bool
    created_at: datetime
    sources: List[SourceOut] = []
    class Config:
        from_attributes = True

class PriceHistoryOut(BaseModel):
    id: int
    source_id: int
    price: Optional[Decimal]
    currency: str
    scraped_at: datetime
    error: Optional[str]
    class Config:
        from_attributes = True

class AlertCreate(BaseModel):
    alert_type: str
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

class SettingsUpdate(BaseModel):
    settings: Dict[str, str]

class KnownSelectorCreate(BaseModel):
    domain: str
    selector: str
    label: Optional[str] = None
    active: bool = True

class KnownSelectorUpdate(BaseModel):
    domain: Optional[str] = None
    selector: Optional[str] = None
    label: Optional[str] = None
    active: Optional[bool] = None

class KnownSelectorOut(BaseModel):
    id: int
    domain: str
    selector: str
    label: Optional[str]
    active: bool
    created_at: datetime
    class Config:
        from_attributes = True

class FirefoxSiteOut(BaseModel):
    id: int
    domain: str
    created_at: datetime
    class Config:
        from_attributes = True

class FirefoxSiteCreate(BaseModel):
    domain: str

class ExchangeRateOut(BaseModel):
    from_currency: str
    to_currency: str
    rate: Decimal
    fetched_at: datetime
    class Config:
        from_attributes = True  
