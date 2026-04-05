from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas, auth
from notifications import test_notification

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.get("/{product_id}", response_model=list[schemas.AlertOut])
def get_alerts(product_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return db.query(models.Alert).filter(models.Alert.product_id == product_id, models.Alert.user_id == current_user.id).all()

@router.post("/test-email")
def send_test_email(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    if not current_user.email:
        raise HTTPException(status_code=400, detail="No email address set on your account")
    success = test_notification(db, current_user.email)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send test email — check notification settings")
    return {"message": f"Test email sent to {current_user.email}"}

@router.post("/{product_id}", response_model=schemas.AlertOut)
def create_alert(product_id: int, alert: schemas.AlertCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if alert.alert_type == "price_drop" and alert.threshold is None:
        raise HTTPException(status_code=400, detail="Threshold required for price_drop alerts")
    new_alert = models.Alert(
        product_id=product_id,
        user_id=current_user.id,
        alert_type=alert.alert_type,
        threshold=alert.threshold
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    return new_alert

@router.delete("/{alert_id}")
def delete_alert(alert_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id, models.Alert.user_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted"}

@router.patch("/{alert_id}/toggle", response_model=schemas.AlertOut)
def toggle_alert(alert_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id, models.Alert.user_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.enabled = not alert.enabled
    db.commit()
    db.refresh(alert)
    return alert

@router.patch("/{alert_id}/toggle-in-app-messages", response_model=schemas.AlertOut)
def toggle_in_app_messages(alert_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id, models.Alert.user_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.in_app_messages = not alert.in_app_messages
    db.commit()
    db.refresh(alert)
    return alert
