from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, auth
from scheduler import schedule_product, unschedule_product, scheduler

router = APIRouter(prefix="/products", tags=["products"])

@router.get("/", response_model=List[schemas.ProductOut])
def get_products(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Product).filter(models.Product.user_id == current_user.id).all()

@router.post("/", response_model=schemas.ProductOut)
def add_product(product: schemas.ProductCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    existing = db.query(models.Product).filter(
        models.Product.user_id == current_user.id,
        models.Product.url == product.url
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You are already tracking this URL")
    new_product = models.Product(**product.model_dump(), user_id=current_user.id)
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    schedule_product(new_product)  # <- schedule immediately
    return new_product

@router.patch("/{product_id}", response_model=schemas.ProductOut)
def update_product(product_id: int, updates: schemas.ProductUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.user_id == current_user.id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for key, value in updates.model_dump(exclude_unset=True).items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)      # ensure we have the latest data
    schedule_product(product) # reschedule AFTER commit
    return product

@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    unschedule_product(product.id)  # <- remove from scheduler
    db.delete(product)
    db.commit()
    return {"message": "Deleted successfully"}

@router.get("/next-run-times")
def get_next_run_times(current_user: models.User = Depends(auth.get_current_user)):
    times = {}
    for job in scheduler.get_jobs():
        if job.id.startswith("product_"):
            product_id = int(job.id.replace("product_", ""))
            times[product_id] = job.next_run_time.isoformat() if job.next_run_time else None
    return times
