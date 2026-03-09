import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth
from notifications import test_notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/settings", tags=["settings"])

def require_super_admin(current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.is_super_admin:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user

@router.get("")
def get_settings(db: Session = Depends(get_db), _: models.User = Depends(require_super_admin)):
    settings = db.query(models.Setting).all()
    return {s.key: s.value for s in settings}

@router.put("")
def update_settings(body: schemas.SettingsUpdate, db: Session = Depends(get_db), _: models.User = Depends(require_super_admin)):
    ALLOWED_KEYS = {
        'notification_provider', 'gmail_address', 'gmail_app_password',
        'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password',
        'smtp_from_address', 'smtp_use_tls'
    }
    for key, value in body.settings.items():
        if key not in ALLOWED_KEYS:
            raise HTTPException(status_code=400, detail=f"Unknown setting: {key}")
        setting = db.query(models.Setting).filter(models.Setting.key == key).first()
        if setting:
            setting.value = value
        else:
            db.add(models.Setting(key=key, value=value))
    db.commit()
    return {"message": "Settings saved"}

@router.post("/test-notification")
def test_notification_endpoint(db: Session = Depends(get_db), current_user: models.User = Depends(require_super_admin)):
    if not current_user.email:
        raise HTTPException(status_code=400, detail="No email address set on your account — update your profile first")
    success = test_notification(db, current_user.email)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send test notification — check your settings and logs")
    return {"message": f"Test notification sent to {current_user.email}"}
