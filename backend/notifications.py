import logging
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from abc import ABC, abstractmethod
from decimal import Decimal

logger = logging.getLogger(__name__)


class NotificationProvider(ABC):
    """Base class for all notification providers. Add new providers by subclassing this."""

    @abstractmethod
    def send(self, subject: str, body: str, recipient: str) -> bool:
        """Send a notification. Returns True on success, False on failure."""
        pass


class GmailProvider(NotificationProvider):
    def __init__(self):
        self.sender = os.getenv("GMAIL_ADDRESS")
        self.password = os.getenv("GMAIL_APP_PASSWORD")

    def send(self, subject: str, body: str, recipient: str) -> bool:
        if not self.sender or not self.password:
            logger.error("Gmail not configured — set GMAIL_ADDRESS and GMAIL_APP_PASSWORD env vars")
            return False
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.sender
            msg["To"] = recipient
            msg.attach(MIMEText(body, "html"))

            with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                server.login(self.sender, self.password)
                server.sendmail(self.sender, recipient, msg.as_string())

            logger.info(f"Email sent to {recipient}: {subject}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {recipient}: {e}")
            return False


# Future providers can be added here, e.g.:
# class TelegramProvider(NotificationProvider): ...
# class NtfyProvider(NotificationProvider): ...
# class DiscordProvider(NotificationProvider): ...


def get_provider() -> NotificationProvider:
    """
    Returns the configured notification provider.
    Change this function to switch providers without touching alert logic.
    """
    return GmailProvider()


def format_alert_email(product_name: str, url: str, current_price: Decimal, alert_type: str, previous_low: Decimal = None) -> tuple[str, str]:
    """Returns (subject, html_body) for an alert email."""
    if alert_type == "all_time_low":
        subject = f"🎉 New all-time low: {product_name} — £{current_price:.2f}"
        body = f"""
        <html><body style="font-family: sans-serif; color: #1a1a2e;">
        <div style="max-width: 500px; margin: 0 auto; padding: 2rem;">
            <h2 style="color: #319795;">🎉 New All-Time Low Price!</h2>
            <p><strong>{product_name}</strong> has hit a new all-time low price.</p>
            <div style="background: #e6fffa; border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0; text-align: center;">
                <div style="font-size: 2.5rem; font-weight: 700; color: #319795;">£{current_price:.2f}</div>
                {f'<div style="color: #888; margin-top: 0.5rem;">Previous low: £{previous_low:.2f}</div>' if previous_low else ''}
            </div>
            <a href="{url}" style="display: inline-block; background: #319795; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600;">View product</a>
            <p style="color: #aaa; font-size: 0.8rem; margin-top: 2rem;">Sent by Price Tracker</p>
        </div>
        </body></html>
        """
    elif alert_type == "price_decreased":
        diff = previous_price - current_price if previous_price else None
        subject = f"📉 Price decreased: {product_name} — £{current_price:.2f}"
        body = f"""
        <html><body style="font-family: sans-serif; color: #1a1a2e;">
        <div style="max-width: 500px; margin: 0 auto; padding: 2rem;">
            <h2 style="color: #319795;">📉 Price Decreased</h2>
            <p><strong>{product_name}</strong> has dropped since the last check.</p>
            <div style="background: #e6fffa; border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0; text-align: center;">
                <div style="font-size: 2.5rem; font-weight: 700; color: #319795;">£{current_price:.2f}</div>
                {f'<div style="color: #888; margin-top: 0.5rem;">Previously: £{previous_price:.2f}</div>' if previous_price else ''}
                {f'<div style="color: #22c55e; font-weight: 600; margin-top: 0.25rem;">Saving: £{diff:.2f}</div>' if diff else ''}
            </div>
            <a href="{url}" style="display: inline-block; background: #319795; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600;">View product</a>
            <p style="color: #aaa; font-size: 0.8rem; margin-top: 2rem;">Sent by Price Tracker</p>
        </div>
        </body></html>
        """
    else:
        subject = f"📉 Price drop: {product_name} — £{current_price:.2f}"
        body = f"""
        <html><body style="font-family: sans-serif; color: #1a1a2e;">
        <div style="max-width: 500px; margin: 0 auto; padding: 2rem;">
            <h2 style="color: #319795;">📉 Price Drop Alert</h2>
            <p><strong>{product_name}</strong> has dropped below your target price.</p>
            <div style="background: #e6fffa; border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0; text-align: center;">
                <div style="font-size: 2.5rem; font-weight: 700; color: #319795;">£{current_price:.2f}</div>
            </div>
            <a href="{url}" style="display: inline-block; background: #319795; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600;">View product</a>
            <p style="color: #aaa; font-size: 0.8rem; margin-top: 2rem;">Sent by Price Tracker</p>
        </div>
        </body></html>
        """
    return subject, body
