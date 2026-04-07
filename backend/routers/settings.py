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
def get_settings(
    db: Session = Depends(get_db), _: models.User = Depends(require_super_admin)
):
    settings = db.query(models.Setting).all()
    return {s.key: s.value for s in settings}


@router.put("")
def update_settings(
    body: schemas.SettingsUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_super_admin),
):
    ALLOWED_KEYS = {
        "notification_provider",
        "gmail_address",
        "gmail_app_password",
        "smtp_host",
        "smtp_port",
        "smtp_username",
        "smtp_password",
        "smtp_from_address",
        "smtp_use_tls",
        "vapid_public_key",
        "vapid_private_key",
        "vapid_email",
        "alert_cooldown_hours",
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


@router.post("/generate-vapid-keys")
def generate_vapid_keys(
    db: Session = Depends(get_db), _: models.User = Depends(require_super_admin)
):
    from py_vapid import Vapid
    import base64
    from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

    vapid = Vapid()
    vapid.generate_keys()

    # Public key in uncompressed point format for browsers
    public_key_bytes = vapid.public_key.public_bytes(
        encoding=Encoding.X962, format=PublicFormat.UncompressedPoint
    )
    public_key = base64.urlsafe_b64encode(public_key_bytes).decode("utf-8").rstrip("=")

    # Private key as PEM string for pywebpush
    private_key = vapid.private_pem().decode("utf-8")

    for key, value in [
        ("vapid_public_key", public_key),
        ("vapid_private_key", private_key),
    ]:
        setting = db.query(models.Setting).filter(models.Setting.key == key).first()
        if setting:
            setting.value = value
        else:
            db.add(models.Setting(key=key, value=value))
    db.commit()
    return {"public_key": public_key, "message": "VAPID keys generated successfully"}


@router.post("/test-notification")
def test_notification_endpoint(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_super_admin),
):
    if not current_user.email:
        raise HTTPException(
            status_code=400,
            detail="No email address set on your account — update your profile first",
        )
    success = test_notification(db, current_user.email)
    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to send test notification — check your settings and logs",
        )
    return {"message": f"Test notification sent to {current_user.email}"}
