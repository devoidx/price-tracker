import logging
import json
from sqlalchemy.orm import Session
from pywebpush import webpush, WebPushException
import models

logger = logging.getLogger(__name__)

def get_vapid_settings(db: Session) -> dict:
    settings = {s.key: s.value for s in db.query(models.Setting).all()}
    return {
        'public_key': settings.get('vapid_public_key', ''),
        'private_key': settings.get('vapid_private_key', ''),
        'email': settings.get('vapid_email', '')
    }

def send_push_notification(subscription: models.PushSubscription, title: str, body: str, url: str, db: Session) -> bool:
    vapid = get_vapid_settings(db)
    if not vapid['public_key'] or not vapid['private_key'] or not vapid['email']:
        logger.warning("VAPID keys not configured — skipping push notification")
        return False
    try:
        data = json.dumps({"title": title, "body": body, "url": url})
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {
                    "p256dh": subscription.p256dh,
                    "auth": subscription.auth
                }
            },
            data=data,
            vapid_private_key=vapid['private_key'],
            vapid_claims={
                "sub": f"mailto:{vapid['email']}"
            }
        )
        logger.info(f"Push notification sent to user {subscription.user_id}")
        return True
    except WebPushException as e:
        logger.error(f"Push notification failed: {e}")
        if e.response and e.response.status_code == 410:
            # Subscription expired — remove it
            try:
                from database import SessionLocal
                cleanup_db = SessionLocal()
                cleanup_db.delete(cleanup_db.query(models.PushSubscription).filter(
                    models.PushSubscription.id == subscription.id
                ).first())
                cleanup_db.commit()
                cleanup_db.close()
                logger.info(f"Removed expired push subscription {subscription.id}")
            except Exception:
                pass
        return False
    except Exception as e:
        logger.error(f"Push notification error: {e}")
        return False

def send_push_to_user(user_id: int, title: str, body: str, url: str, db: Session):
    subscriptions = db.query(models.PushSubscription).filter(
        models.PushSubscription.user_id == user_id
    ).all()
    for sub in subscriptions:
        send_push_notification(sub, title, body, url, db)