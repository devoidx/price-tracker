from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from urllib.parse import urlparse
from database import get_db
import models, schemas, auth
from scheduler import schedule_source, unschedule_source

router = APIRouter(prefix="/products", tags=["products"])

def label_from_url(url: str) -> str:
    try:
        hostname = urlparse(url).hostname or url
        hostname = hostname.replace("www.", "")
        return hostname.split(".")[0].capitalize()
    except Exception:
        return url[:30]

@router.get("", response_model=List[schemas.ProductOut])
def get_products(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Product).filter(models.Product.user_id == current_user.id).all()

@router.post("", response_model=schemas.ProductOut)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    new_product = models.Product(user_id=current_user.id, name=product.name)
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
    return new_product

@router.patch("/{product_id}", response_model=schemas.ProductOut)
def update_product(product_id: int, updates: schemas.ProductUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for key, value in updates.model_dump(exclude_unset=True).items():
        setattr(product, key, value)
    db.commit()
    db.refresh(product)
    return product

@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for source in product.sources:
        unschedule_source(source.id)
    db.delete(product)
    db.commit()
    return {"message": "Product deleted"}

# --- Source endpoints ---

@router.get("/{product_id}/sources", response_model=List[schemas.SourceOut])
def get_sources(product_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product.sources

@router.post("/{product_id}/sources", response_model=schemas.SourceOut)
def add_source(product_id: int, source: schemas.SourceCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if len(product.sources) >= 5:
        raise HTTPException(status_code=400, detail="Maximum of 5 sources per product")
    label = source.label or label_from_url(source.url)

    # Auto-apply first known selector for this domain if no selector provided
    selector = source.selector
    if not selector:
        try:
            domain = urlparse(source.url).hostname or ''
            domain = domain.replace('www.', '')
            known = db.query(models.KnownSelector).filter(
                models.KnownSelector.domain == domain,
                models.KnownSelector.active == True
            ).first()
            if known:
                selector = known.selector
                logger.info(f"Auto-applied known selector '{selector}' for {domain}")
        except Exception as e:
            logger.warning(f"Failed to look up known selector: {e}")

    new_source = models.Source(
        product_id=product_id,
        label=label,
        url=source.url,
        selector=selector,
        interval_minutes=source.interval_minutes,
    )
    db.add(new_source)
    db.commit()
    db.refresh(new_source)
    schedule_source(new_source)
    return new_source

@router.patch("/{product_id}/sources/{source_id}", response_model=schemas.SourceOut)
def update_source(product_id: int, source_id: int, updates: schemas.SourceUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    source = db.query(models.Source).filter(models.Source.id == source_id, models.Source.product_id == product_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    for key, value in updates.model_dump(exclude_unset=True).items():
        setattr(source, key, value)
    db.commit()
    db.refresh(source)
    schedule_source(source)
    return source

@router.delete("/{product_id}/sources/{source_id}")
def delete_source(product_id: int, source_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    source = db.query(models.Source).filter(models.Source.id == source_id, models.Source.product_id == product_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    unschedule_source(source.id)
    db.delete(source)
    db.commit()
    return {"message": "Source deleted"}

@router.get("/next-run-times")
def get_next_run_times(current_user: models.User = Depends(auth.get_current_user)):
    from scheduler import scheduler
    times = {}
    for job in scheduler.get_jobs():
        if job.id.startswith("source_"):
            source_id = int(job.id.replace("source_", ""))
            times[source_id] = job.next_run_time.isoformat() if job.next_run_time else None
    return times
