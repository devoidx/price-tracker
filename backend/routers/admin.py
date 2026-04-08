from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
import models, schemas, auth

router = APIRouter(prefix="/admin", tags=["admin"])


def require_super_admin(current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user


class AdminUserUpdate(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_admin: Optional[bool] = None
    is_super_admin: Optional[bool] = None
    active: Optional[bool] = None


@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)
):
    return db.query(models.User).all()


@router.post("/users/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.active = False
    db.commit()
    return {"message": "User deactivated"}


@router.patch("/users/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: int,
    updates: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    # Only super admins can change is_super_admin
    if updates.is_super_admin is not None and not current_user.is_super_admin:
        raise HTTPException(
            status_code=403, detail="Only super admins can change super admin status"
        )
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if updates.email:
        existing = (
            db.query(models.User)
            .filter(models.User.email == updates.email, models.User.id != user_id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
    if updates.username:
        existing = (
            db.query(models.User)
            .filter(models.User.username == updates.username, models.User.id != user_id)
            .first()
        )
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
    for key, value in updates.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


@router.get("/products")
def get_all_products(
    db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)
):
    products = db.query(models.Product).all()
    result = []
    for p in products:
        result.append(
            {
                "id": p.id,
                "name": p.name,
                "active": p.active,
                "username": p.user.username,
                "source_count": len(p.sources),
                "created_at": p.created_at,
            }
        )
    return result


@router.get("/products/{product_id}/history")
def get_product_history(
    product_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(auth.require_admin),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    history = []
    for source in product.sources:
        for entry in source.price_history:
            history.append(entry)
    history.sort(key=lambda x: x.scraped_at)
    return history


@router.get("/scrape-health")
def get_scrape_health(
    db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)
):
    sources = db.query(models.Source).all()
    result = []
    for source in sources:
        history = (
            db.query(models.PriceHistory)
            .filter(models.PriceHistory.source_id == source.id)
            .order_by(models.PriceHistory.scraped_at.desc())
            .limit(50)
            .all()
        )

        total = len(history)
        if total == 0:
            continue

        successes = sum(1 for h in history if h.price is not None)
        failures = total - successes
        success_rate = round((successes / total) * 100)
        last_scrape = history[0] if history else None
        last_success = next((h for h in history if h.price is not None), None)
        last_error = next((h for h in history if h.error is not None), None)

        result.append(
            {
                "source_id": source.id,
                "source_label": source.label,
                "product_name": source.product.name,
                "product_id": source.product_id,
                "active": source.active,
                "total_scrapes": total,
                "successes": successes,
                "failures": failures,
                "success_rate": success_rate,
                "last_scraped_at": last_scrape.scraped_at if last_scrape else None,
                "last_success_at": last_success.scraped_at if last_success else None,
                "last_error": last_error.error if last_error else None,
                "last_error_at": last_error.scraped_at if last_error else None,
            }
        )

    result.sort(key=lambda x: x["success_rate"])
    return result
