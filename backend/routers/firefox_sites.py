import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/firefox-sites", tags=["firefox_sites"])

@router.get("", response_model=List[schemas.FirefoxSiteOut])
def get_firefox_sites(db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    return db.query(models.FirefoxSite).order_by(models.FirefoxSite.domain).all()

@router.post("", response_model=schemas.FirefoxSiteOut)
def add_firefox_site(site: schemas.FirefoxSiteCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    domain = site.domain.strip().lower().replace('www.', '')
    existing = db.query(models.FirefoxSite).filter(models.FirefoxSite.domain == domain).first()
    if existing:
        raise HTTPException(status_code=400, detail="Domain already exists")
    new_site = models.FirefoxSite(domain=domain)
    db.add(new_site)
    db.commit()
    db.refresh(new_site)
    return new_site

@router.delete("/{site_id}")
def delete_firefox_site(site_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    site = db.query(models.FirefoxSite).filter(models.FirefoxSite.id == site_id).first()
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    db.delete(site)
    db.commit()
    return {"message": "Site deleted"}
