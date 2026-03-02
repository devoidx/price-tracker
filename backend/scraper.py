import re
import logging
from playwright.sync_api import sync_playwright
from sqlalchemy.orm import Session
import models

logger = logging.getLogger(__name__)

def clean_price(raw: str) -> float | None:
    """Extract a numeric price from a messy string like '£1,299.99' or 'Price: $45.00'"""
    if not raw:
        return None
    # Remove currency symbols, letters, and whitespace - keep digits, commas, dots
    cleaned = re.sub(r'[^\d.,]', '', raw.strip())
    # Handle European format (1.299,99) vs standard (1,299.99)
    if ',' in cleaned and '.' in cleaned:
        if cleaned.rfind(',') > cleaned.rfind('.'):
            # Comma is decimal separator (European)
            cleaned = cleaned.replace('.', '').replace(',', '.')
        else:
            # Dot is decimal separator (standard)
            cleaned = cleaned.replace(',', '')
    elif ',' in cleaned:
        # Could be thousands separator or decimal
        parts = cleaned.split(',')
        if len(parts) == 2 and len(parts[1]) == 2:
            cleaned = cleaned.replace(',', '.')
        else:
            cleaned = cleaned.replace(',', '')
    try:
        return float(cleaned)
    except ValueError:
        return None


def scrape_price(url: str, selector: str | None) -> dict:
    """
    Visit a URL and extract a price.
    Returns dict with 'price' (float or None) and 'error' (str or None)
    """
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={"width": 1920, "height": 1080},
                locale="en-GB",
                timezone_id="Europe/London",
                extra_http_headers={
                    "Accept-Language": "en-GB,en;q=0.9",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Encoding": "gzip, deflate, br",
                    "Connection": "keep-alive",
                    "Upgrade-Insecure-Requests": "1",
                }
            )
            page = context.new_page()
            page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
                Object.defineProperty(navigator, 'languages', { get: () => ['en-GB', 'en'] });
            """)

            # Block images, fonts, and stylesheets to speed things up
            page.route("**/*", lambda route: route.abort()
                if route.request.resource_type in ["image", "stylesheet", "font"]
                else route.continue_()
            )

            response = page.goto(url, wait_until="domcontentloaded", timeout=30000)

            if response and response.status >= 400:
                return {"price": None, "error": f"Page returned HTTP {response.status} — check the URL is valid and accessible"}

            page.wait_for_timeout(2000)

            page_title = page.title().lower()
            if any(x in page_title for x in ["404", "not found", "page not found", "unavailable"]):
                return {"price": None, "error": f"Page appears to be invalid or unavailable (title: '{page.title()}')"}

            if selector:
                try:
                    element = page.wait_for_selector(selector, timeout=10000)
                    raw_text = element.inner_text()
                except Exception:
                    return {"price": None, "error": f"Selector '{selector}' not found on page"}
            else:
                # No selector provided — try some common price patterns
                raw_text = None
                common_selectors = [
                    ".price", "#price", "[data-price]",
                    ".product-price", ".offer-price",
                    "#priceblock_ourprice", "#priceblock_dealprice",  # Amazon
                    ".a-price .a-offscreen",  # Amazon
                    "[itemprop='price']",
                ]
                for sel in common_selectors:
                    try:
                        el = page.query_selector(sel)
                        if el:
                            raw_text = el.inner_text()
                            break
                    except Exception:
                        continue

                if not raw_text:
                    return {"price": None, "error": "Could not find price — try providing a CSS selector"}

            price = clean_price(raw_text)
            if price is None:
                return {"price": None, "error": f"Found text '{raw_text}' but could not parse a price from it"}

            return {"price": price, "error": None}

        except Exception as e:
            logger.error(f"Scrape failed for {url}: {e}")
            return {"price": None, "error": str(e)}
        finally:
            browser.close()


def scrape_and_save(product_id: int, db: Session):
    """Fetch the product, scrape its URL, and save the result to price_history."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product or not product.active:
        return

    logger.info(f"Scraping product {product.id}: {product.name}")
    result = scrape_price(product.url, product.selector)

    entry = models.PriceHistory(
        product_id=product.id,
        price=result["price"],
        error=result["error"],
        currency="GBP"
    )
    db.add(entry)
    db.commit()
    logger.info(f"Saved price for {product.name}: {result}")
