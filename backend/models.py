from sqlalchemy import Column, Integer, String, Boolean, Numeric, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    active = Column(Boolean, default=True)

    products = relationship("Product", back_populates="owner", cascade="all, delete")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    url = Column(Text, nullable=False)
    selector = Column(Text)
    interval_minutes = Column(Integer, default=60)
    created_at = Column(DateTime, server_default=func.now())
    active = Column(Boolean, default=True)

    owner = relationship("User", back_populates="products")
    price_history = relationship("PriceHistory", back_populates="product", cascade="all, delete")


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    price = Column(Numeric(10, 2))
    currency = Column(String(3), default="GBP")
    scraped_at = Column(DateTime, server_default=func.now())
    error = Column(Text)

    product = relationship("Product", back_populates="price_history")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    alert_type = Column(String(20), nullable=False)  # 'price_drop' or 'all_time_low'
    threshold = Column(Numeric(10, 2), nullable=True)  # only used for price_drop
    enabled = Column(Boolean, default=True)
    last_triggered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    product = relationship("Product")
    user = relationship("User")
