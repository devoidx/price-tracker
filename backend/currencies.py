import logging
import requests
from decimal import Decimal
from sqlalchemy.orm import Session
import models

logger = logging.getLogger(__name__)

SUPPORTED_CURRENCIES = {
    'GBP': '🇬🇧 British Pound',
    'USD': '🇺🇸 US Dollar',
    'EUR': '🇪🇺 Euro',
    'JPY': '🇯🇵 Japanese Yen',
    'CAD': '🇨🇦 Canadian Dollar',
    'AUD': '🇦🇺 Australian Dollar',
    'CHF': '🇨🇭 Swiss Franc',
    'SEK': '🇸🇪 Swedish Krona',
    'NOK': '🇳🇴 Norwegian Krone',
    'DKK': '🇩🇰 Danish Krone',
}

# Domain to currency mapping for auto-detection
DOMAIN_CURRENCY_MAP = {
    'co.uk': 'GBP',
    'com': 'USD',
    'com.au': 'AUD',
    'co.jp': 'JPY',
    'ca': 'CAD',
    'de': 'EUR',
    'fr': 'EUR',
    'it': 'EUR',
    'es': 'EUR',
    'nl': 'EUR',
    'se': 'SEK',
    'no': 'NOK',
    'dk': 'DKK',
    'ch': 'CHF',
}

def detect_currency_from_url(url: str) -> str:
    """Attempt to detect currency from URL domain."""
    try:
        from urllib.parse import urlparse
        hostname = urlparse(url).hostname or ''
        hostname = hostname.replace('www.', '')
        # Try longest match first
        for domain_suffix, currency in sorted(DOMAIN_CURRENCY_MAP.items(), key=lambda x: -len(x[0])):
            if hostname.endswith(domain_suffix):
                return currency
    except Exception:
        pass
    return 'GBP'

def fetch_exchange_rates(db: Session):
    """Fetch latest exchange rates from ECB and store in database."""
    try:
        # Use frankfurter.app — free, no API key, ECB data
        response = requests.get('https://api.frankfurter.app/latest?from=GBP', timeout=10)
        response.raise_for_status()
        data = response.json()
        rates = data.get('rates', {})

        for to_currency, rate in rates.items():
            if to_currency not in SUPPORTED_CURRENCIES:
                continue
            existing = db.query(models.ExchangeRate).filter(
                models.ExchangeRate.from_currency == 'GBP',
                models.ExchangeRate.to_currency == to_currency
            ).first()
            if existing:
                existing.rate = Decimal(str(rate))
                existing.fetched_at = __import__('datetime').datetime.utcnow()
            else:
                db.add(models.ExchangeRate(
                    from_currency='GBP',
                    to_currency=to_currency,
                    rate=Decimal(str(rate))
                ))

        # GBP to GBP is always 1
        existing = db.query(models.ExchangeRate).filter(
            models.ExchangeRate.from_currency == 'GBP',
            models.ExchangeRate.to_currency == 'GBP'
        ).first()
        if not existing:
            db.add(models.ExchangeRate(from_currency='GBP', to_currency='GBP', rate=Decimal('1.0')))

        db.commit()
        logger.info(f"Exchange rates updated: {list(rates.keys())}")
    except Exception as e:
        logger.error(f"Failed to fetch exchange rates: {e}")

def convert_price(price: Decimal, from_currency: str, to_currency: str, db: Session) -> Decimal | None:
    """Convert price from one currency to another via GBP as base."""
    if from_currency == to_currency:
        return price
    try:
        # Convert to GBP first if not already GBP
        if from_currency != 'GBP':
            rate_to_gbp = db.query(models.ExchangeRate).filter(
                models.ExchangeRate.from_currency == 'GBP',
                models.ExchangeRate.to_currency == from_currency
            ).first()
            if not rate_to_gbp:
                return None
            price_in_gbp = Decimal(str(price / rate_to_gbp.rate))
        else:
            price_in_gbp = price

        # Convert from GBP to target
        if to_currency == 'GBP':
            return price_in_gbp

        rate = db.query(models.ExchangeRate).filter(
            models.ExchangeRate.from_currency == 'GBP',
            models.ExchangeRate.to_currency == to_currency
        ).first()
        if not rate:
            return None
        return Decimal(str(price_in_gbp * rate.rate))
    except Exception as e:
        logger.error(f"Currency conversion failed: {e}")
        return None

def get_currency_symbol(currency: str) -> str:
    symbols = {
        'GBP': '£', 'USD': '$', 'EUR': '€', 'JPY': '¥',
        'CAD': 'CA$', 'AUD': 'A$', 'CHF': 'Fr',
        'SEK': 'kr', 'NOK': 'kr', 'DKK': 'kr',
    }
    return symbols.get(currency, currency)