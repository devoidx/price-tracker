import logging
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
import models, auth

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/push", tags=["push"])

class PushSubscriptionCreate(BaseModel):
    endpoint: str
    p256dh: str
    auth: str

@router.get("/vapid-public-key")
def get_vapid_public_key(db: Session = Depends(get_db), _: models.User = Depends(auth.get_current_user)):
    setting = db.query(models.Setting).filter(models.Setting.key == 'vapid_public_key').first()
    if not setting or not setting.value:
        raise HTTPException(status_code=404, detail="VAPID keys not configured")
    return {"public_key": setting.value}

@router.post("/subscribe")
def subscribe(body: PushSubscriptionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    existing = db.query(models.PushSubscription).filter(
        models.PushSubscription.user_id == current_user.id,
        models.PushSubscription.endpoint == body.endpoint
    ).first()
    if existing:
        return {"message": "Already subscribed"}
    sub = models.PushSubscription(
        user_id=current_user.id,
        endpoint=body.endpoint,
        p256dh=body.p256dh,
        auth=body.auth
    )
    db.add(sub)
    db.commit()
    logger.info(f"Push subscription added for user {current_user.id}")
    return {"message": "Subscribed"}

@router.post("/unsubscribe")
def unsubscribe(body: PushSubscriptionCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    sub = db.query(models.PushSubscription).filter(
        models.PushSubscription.user_id == current_user.id,
        models.PushSubscription.endpoint == body.endpoint
    ).first()
    if sub:
        db.delete(sub)
        db.commit()
        logger.info(f"Push subscription removed for user {current_user.id}")
    return {"message": "Unsubscribed"}

@router.delete("/unsubscribe-all")
def unsubscribe_all(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db.query(models.PushSubscription).filter(
        models.PushSubscription.user_id == current_user.id
    ).delete()
    db.commit()
    return {"message": "All subscriptions removed"}