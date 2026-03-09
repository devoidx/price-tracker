import logging
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from decimal import Decimal
from abc import ABC, abstractmethod
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class NotificationProvider(ABC):
    @abstractmethod
    def send(self, subject: str, body: str, recipient: str) -> bool:
        pass

class GmailProvider(NotificationProvider):
    def __init__(self, address: str, app_password: str):
        self.address = address
        self.app_password = app_password

    def send(self, subject: str, body: str, recipient: str) -> bool:
        if not self.address or not self.app_password:
            logger.error("Gmail not configured — missing address or app password")
            return False
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.address
            msg["To"] = recipient
            msg.attach(MIMEText(body, "html"))
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
                server.login(self.address, self.app_password)
                server.sendmail(self.address, recipient, msg.as_string())
            logger.info(f"Gmail notification sent to {recipient}")
            return True
        except Exception as e:
            logger.error(f"Gmail send failed: {e}")
            return False

class SMTPProvider(NotificationProvider):
    def __init__(self, host: str, port: int, username: str, password: str, from_address: str, use_tls: bool):
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.from_address = from_address
        self.use_tls = use_tls

    def send(self, subject: str, body: str, recipient: str) -> bool:
        if not self.host or not self.from_address:
            logger.error("SMTP not configured — missing host or from address")
            return False
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_address
            msg["To"] = recipient
            msg.attach(MIMEText(body, "html"))
            if self.use_tls:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(self.host, self.port, context=context) as server:
                    if self.username and self.password:
                        server.login(self.username, self.password)
                    server.sendmail(self.from_address, recipient, msg.as_string())
            else:
                with smtplib.SMTP(self.host, self.port) as server:
                    server.ehlo()
                    server.starttls()
                    if self.username and self.password:
                        server.login(self.username, self.password)
                    server.sendmail(self.from_address, recipient, msg.as_string())
            logger.info(f"SMTP notification sent to {recipient}")
            return True
        except Exception as e:
            logger.error(f"SMTP send failed: {e}")
            return False

def get_provider(db: Session) -> NotificationProvider:
    settings = {s.key: s.value for s in db.query(__import__('models').Setting).all()}
    provider = settings.get('notification_provider', 'smtp')
    if provider == 'gmail':
        return GmailProvider(
            address=settings.get('gmail_address', ''),
            app_password=settings.get('gmail_app_password', '')
        )
    return SMTPProvider(
        host=settings.get('smtp_host', ''),
        port=int(settings.get('smtp_port', 587)),
        username=settings.get('smtp_username', ''),
        password=settings.get('smtp_password', ''),
        from_address=settings.get('smtp_from_address', ''),
        use_tls=settings.get('smtp_use_tls', 'true').lower() == 'true'
    )

def format_alert_email(product_name: str, url: str, current_price: Decimal, alert_type: str, previous_low: Decimal = None, previous_price: Decimal = None) -> tuple:
    if alert_type == 'all_time_low':
        subject = f"🎉 New all-time low: {product_name}"
        comparison = f"<p>Previous low: <strong>£{previous_low:.2f}</strong></p>" if previous_low else ""
    elif alert_type == 'price_drop':
        subject = f"🔔 Price drop alert: {product_name}"
        comparison = ""
    else:
        subject = f"📉 Price decreased: {product_name}"
        comparison = f"<p>Previous price: <strong>£{previous_price:.2f}</strong></p>" if previous_price else ""

    body = f"""
    <html><body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c7a7b;">{subject}</h2>
        <p><strong>{product_name}</strong></p>
        <div style="background: #e6fffa; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="color: #718096; margin: 0 0 8px 0; font-size: 12px;">CURRENT PRICE</p>
            <p style="font-size: 32px; font-weight: bold; color: #2c7a7b; margin: 0;">£{current_price:.2f}</p>
        </div>
        {comparison}
        <a href="{url}" style="display: inline-block; background: #319795; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">View product</a>
    </body></html>
    """
    return subject, body

def test_notification(db: Session, recipient: str) -> bool:
    provider = get_provider(db)
    subject = "✅ Price Tracker — test notification"
    body = """
    <html><body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c7a7b;">Test notification</h2>
        <p>Your notification settings are working correctly.</p>
    </body></html>
    """
    return provider.send(subject, body, recipient)
