from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, auth

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.post("/test-email")
def test_email(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    from notifications import get_provider, format_alert_email
    from decimal import Decimal
    provider = get_provider()
    subject, body = format_alert_email(
        product_name="Test Product",
        url="https://example.com",
        current_price=Decimal("29.99"),
        alert_type="price_drop"
    )
    success = provider.send(subject, body, current_user.email)
    if success:
        return {"message": f"Test email sent to {current_user.email}"}
    else:
        return {"message": "Failed to send — check backend logs for details"}

@router.get("/{product_id}", response_model=List[schemas.AlertOut])
def get_alerts(product_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return db.query(models.Alert).filter(models.Alert.product_id == product_id).all()

@router.post("/{product_id}", response_model=schemas.AlertOut)
def create_alert(product_id: int, alert: schemas.AlertCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if alert.alert_type not in ("price_drop", "all_time_low", "price_decreased"):
        raise HTTPException(status_code=400, detail="alert_type must be 'price_drop', 'all_time_low' or 'price_decreased'")
    if alert.alert_type == "price_drop" and alert.threshold is None:
        raise HTTPException(status_code=400, detail="price_drop alerts require a threshold")
    new_alert = models.Alert(
        product_id=product_id,
        user_id=current_user.id,
        alert_type=alert.alert_type,
        threshold=alert.threshold,
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
