import logging
from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session
import models
from notifications import get_provider, format_alert_email

logger = logging.getLogger(__name__)

def check_alerts(product_id: int, current_price: Decimal, db: Session):
    if current_price is None:
        return

    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        return

    all_history = []
    for source in product.sources:
        for h in source.price_history:
            if h.price is not None:
                all_history.append(h)
    all_history.sort(key=lambda x: x.scraped_at)

    previous_prices = [float(h.price) for h in all_history[:-1]]
    previous_low = min(previous_prices) if previous_prices else None
    previous_price = previous_prices[-1] if previous_prices else None
    is_all_time_low = previous_low is None or float(current_price) < previous_low
    price_decreased = previous_price is not None and float(current_price) < previous_price

    alerts = db.query(models.Alert).filter(
        models.Alert.product_id == product_id,
        models.Alert.enabled == True
    ).all()

    if not alerts:
        return

    provider = get_provider(db)

    for alert in alerts:
        user = db.query(models.User).filter(models.User.id == alert.user_id).first()
        if not user or not user.email or not user.active:
            continue

        triggered = False
        subject, body = None, None

        if alert.alert_type == "all_time_low" and is_all_time_low and previous_low is not None:
            triggered = True
            subject, body = format_alert_email(product.name, product.sources[0].url, current_price, "all_time_low", Decimal(str(previous_low)))
        elif alert.alert_type == "price_drop" and alert.threshold is not None:
            if float(current_price) <= float(alert.threshold):
                triggered = True
                subject, body = format_alert_email(product.name, product.sources[0].url, current_price, "price_drop")
        elif alert.alert_type == "price_decreased" and price_decreased:
            triggered = True
            subject, body = format_alert_email(product.name, product.sources[0].url, current_price, "price_decreased", previous_price=Decimal(str(previous_price)))

        if triggered and subject and body:
            success = provider.send(subject, body, user.email)
            if success:
                alert.last_triggered_at = datetime.utcnow()
                db.commit()
                logger.info(f"Alert {alert.id} triggered for {user.email} — {product.name}")
