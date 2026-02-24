from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from database import get_db, SessionLocal
import models, schemas, auth
from scraper import scrape_and_save

router = APIRouter(prefix="/prices", tags=["prices"])

@router.get("/{product_id}", response_model=List[schemas.PriceHistoryOut])
def get_price_history(product_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return db.query(models.PriceHistory).filter(models.PriceHistory.product_id == product_id).order_by(models.PriceHistory.scraped_at).all()

def _do_scrape(product_id: int):
    db = SessionLocal()
    try:
        scrape_and_save(product_id, db)
    finally:
        db.close()

@router.post("/{product_id}/scrape")
def trigger_scrape(product_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    background_tasks.add_task(_do_scrape, product_id)
    return {"message": "Scrape started in background"}
