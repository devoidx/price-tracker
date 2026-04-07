from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255))
    password_hash = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    is_super_admin = Column(Boolean, default=False)
    active = Column(Boolean, default=True)
    default_currency = Column(String(10), default='GBP')
    color_mode = Column(String(10), default='light')
    created_at = Column(DateTime, server_default=func.now())
    products = relationship("Product", back_populates="user")

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    user = relationship("User", back_populates="products")
    sources = relationship("Source", back_populates="product", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="product", cascade="all, delete-orphan")

class Source(Base):
    __tablename__ = "sources"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    label = Column(String(100), nullable=False)
    url = Column(Text, nullable=False)
    selector = Column(String(255))
    interval_minutes = Column(Integer, default=60)
    active = Column(Boolean, default=True)
    currency = Column(String(10), default='GBP')
    exclude_from_alerts = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    product = relationship("Product", back_populates="sources")
    price_history = relationship("PriceHistory", back_populates="source", cascade="all, delete-orphan")

class PriceHistory(Base):
    __tablename__ = "price_history"
    id = Column(Integer, primary_key=True)
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=False)
    price = Column(Numeric(10, 2))
    currency = Column(String(10), default="GBP")
    scraped_at = Column(DateTime, server_default=func.now())
    error = Column(Text)
    source = relationship("Source", back_populates="price_history")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    alert_type = Column(String(20), nullable=False)
    threshold = Column(Numeric(10, 2))
    enabled = Column(Boolean, default=True)
    in_app_messages = Column(Boolean, default=False)
    last_triggered_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    product = relationship("Product", back_populates="alerts")
    user = relationship("User")

class Setting(Base):
    __tablename__ = "settings"
    key = Column(String(100), primary_key=True)
    value = Column(Text)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class KnownSelector(Base):
    __tablename__ = "known_selectors"
    id = Column(Integer, primary_key=True)
    domain = Column(String(255), nullable=False)
    selector = Column(String(255), nullable=False)
    label = Column(String(100))
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

class FirefoxSite(Base):
    __tablename__ = "firefox_sites"
    id = Column(Integer, primary_key=True)
    domain = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

class ExchangeRate(Base):
    __tablename__ = "exchange_rates"
    id = Column(Integer, primary_key=True)
    from_currency = Column(String(10), nullable=False)
    to_currency = Column(String(10), nullable=False)
    rate = Column(Numeric(20, 8), nullable=False)
    fetched_at = Column(DateTime, server_default=func.now())

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    endpoint = Column(Text, nullable=False)
    p256dh = Column(Text, nullable=False)
    auth = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    user = relationship("User")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject = Column(String(255))
    body = Column(Text, nullable=False)
    message_type = Column(String(20), nullable=False, default="user")
    is_read = Column(Boolean, default=False, nullable=False)
    deleted_by_recipient = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])
