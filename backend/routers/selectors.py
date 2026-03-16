import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from urllib.parse import urlparse
from database import get_db
import models, schemas, auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/selectors", tags=["selectors"])

@router.get("", response_model=List[schemas.KnownSelectorOut])
def get_selectors(db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    return db.query(models.KnownSelector).order_by(models.KnownSelector.domain, models.KnownSelector.label).all()

@router.post("", response_model=schemas.KnownSelectorOut)
def create_selector(selector: schemas.KnownSelectorCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    existing = db.query(models.KnownSelector).filter(
        models.KnownSelector.domain == selector.domain,
        models.KnownSelector.selector == selector.selector
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Selector already exists for this domain")
    new_selector = models.KnownSelector(**selector.model_dump())
    db.add(new_selector)
    db.commit()
    db.refresh(new_selector)
    return new_selector

@router.patch("/{selector_id}", response_model=schemas.KnownSelectorOut)
def update_selector(selector_id: int, updates: schemas.KnownSelectorUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    selector = db.query(models.KnownSelector).filter(models.KnownSelector.id == selector_id).first()
    if not selector:
        raise HTTPException(status_code=404, detail="Selector not found")
    for key, value in updates.model_dump(exclude_unset=True).items():
        setattr(selector, key, value)
    db.commit()
    db.refresh(selector)
    return selector

@router.delete("/{selector_id}")
def delete_selector(selector_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    selector = db.query(models.KnownSelector).filter(models.KnownSelector.id == selector_id).first()
    if not selector:
        raise HTTPException(status_code=404, detail="Selector not found")
    db.delete(selector)
    db.commit()
    return {"message": "Selector deleted"}
