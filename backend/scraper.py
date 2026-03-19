import logging
import re
from decimal import Decimal, InvalidOperation
from playwright.sync_api import sync_playwright
from sqlalchemy.orm import Session
import models


logger = logging.getLogger(__name__)

def get_firefox_sites(db: Session) -> list:
    sites = db.query(models.FirefoxSite).all()
    return [s.domain for s in sites]

def clean_price(text: str) -> Decimal:
    text = text.strip()
    # Extract first price-like pattern — with or without decimal places
    match = re.search(r'[\d]+[.,][\d]{2}', text)
    if match:
        text = match.group(0)
    else:
        # Try whole number price like £37
        match = re.search(r'[\d]+', text)
        if match:
            text = match.group(0) + '.00'
        else:
            text = re.sub(r'[^\d.,]', '', text)
    if ',' in text and '.' in text:
        if text.index(',') < text.index('.'):
            text = text.replace(',', '')
        else:
            text = text.replace('.', '').replace(',', '.')
    elif ',' in text:
        text = text.replace(',', '.')
    return Decimal(text)

def scrape_price(url: str, selector: str = None, firefox_sites: list = None) -> dict:
    # Use Firefox for sites known to block Chromium
    if firefox_sites is None:
        firefox_sites = [] 
    use_firefox = any(site in url for site in firefox_sites)
    logger.info(f"Using {'Firefox' if use_firefox else 'Chromium'} for {url}")

    with sync_playwright() as p:
        browser = (p.firefox if use_firefox else p.chromium).launch(headless=True)
        context = browser.new_context(
          user_agent=(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0"
            if use_firefox else
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          ),
          viewport={"width": 1920, "height": 1080},
          locale="en-GB",
          timezone_id="Europe/London",
          extra_http_headers={
              "Accept-Language": "en-GB,en;q=0.9",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
              "Accept-Encoding": "gzip, deflate, br",
              "Connection": "keep-alive",
              "Upgrade-Insecure-Requests": "1",
              "Sec-Fetch-Dest": "document",
              "Sec-Fetch-Mode": "navigate",
              "Sec-Fetch-Site": "none",
              "Sec-Fetch-User": "?1",
              "Cache-Control": "max-age=0",
              "Referer": "https://www.google.com/",
          }
        )
        page = context.new_page()
        if not use_firefox:
            page.add_init_script("""
                Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
                Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
                Object.defineProperty(navigator, 'languages', { get: () => ['en-GB', 'en'] });
                Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
                Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
                window.chrome = { runtime: {} };
            """)
        if not use_firefox:
            page.route("**/*", lambda route: route.abort() if route.request.resource_type in ["image", "stylesheet", "font"] else route.continue_())
        try:
            from typing import Literal
            wait_strategy: Literal["networkidle", "domcontentloaded"] = "networkidle" if use_firefox else "domcontentloaded"
            response = page.goto(url, wait_until=wait_strategy, timeout=30000)
            if response and response.status >= 400:
               browser.close()
               return {"price": None, "error": f"Page returned HTTP {response.status} — check the URL is valid"}
            page.wait_for_timeout(5000)
            page_title = page.title().lower()
            if any(x in page_title for x in ["404", "not found", "page not found", "unavailable"]):
                browser.close()
                return {"price": None, "error": f"Page appears invalid (title: '{page.title()}')"}
        except Exception as e:
            browser.close()
            return {"price": None, "error": f"Failed to load page: {str(e)}"}

        raw_text = None
        if selector:
            try:
                element = page.wait_for_selector(selector, timeout=10000)
                if element is None:
                    browser.close()
                    return {"price": None, "error": f"Selector '{selector}' not found on page"}
                raw_text = element.inner_text()
            except Exception:
                browser.close()
                return {"price": None, "error": f"Selector '{selector}' not found on page"}
        else:
            common_selectors = [
                ".price", "#price", "[data-price]",
                ".product-price", ".offer-price",
                "#priceblock_ourprice", "#priceblock_dealprice",
                ".a-price .a-offscreen", ".a-price .A-OFFSCREEN",
                "span.a-offscreen", "span.A-OFFSCREEN",
                "[itemprop='price']",
            ]
            for sel in common_selectors:
                try:
                    el = page.query_selector(sel)
                    if el:
                        raw_text = el.inner_text()
                        if raw_text.strip():
                            break
                except Exception:
                    continue

            if not raw_text:
                try:
                    raw_text = page.evaluate("""
                        () => {
                            const els = document.querySelectorAll('span');
                            for (const el of els) {
                                if (el.className && el.className.toString().toLowerCase().includes('offscreen')) {
                                    const t = el.innerText.trim();
                                    if (t) return t;
                                }
                            }
                            return null;
                        }
                    """)
                except Exception:
                    pass

            if not raw_text:
                browser.close()
                return {"price": None, "error": "Could not find price — try providing a CSS selector"}

        browser.close()
        try:
            price = clean_price(raw_text)
            return {"price": price, "error": None}
        except (InvalidOperation, Exception) as e:
            return {"price": None, "error": f"Could not parse price from '{raw_text}': {e}"}

def scrape_and_save(source_id: int, db: Session):
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source or not source.active:
        return

    firefox_sites = get_firefox_sites(db)
    logger.info(f"Scraping source {source.id}: {source.label} ({source.url})")

    # If source has an explicit selector use it, otherwise try known selectors first
    if source.selector:
        result = scrape_price(source.url, source.selector, firefox_sites)
    else:
        from urllib.parse import urlparse
        domain = urlparse(source.url).hostname or ''
        domain = domain.replace('www.', '')
        known = db.query(models.KnownSelector).filter(
            models.KnownSelector.domain == domain,
            models.KnownSelector.active == True
        ).all()

        result = None
        for ks in known:
            logger.info(f"Trying known selector '{ks.selector}' for {domain}")
            r = scrape_price(source.url, ks.selector, firefox_sites)
            if r['price'] is not None:
                result = r
                logger.info(f"Known selector '{ks.selector}' succeeded for {domain}")
                break

        if result is None:
            result = scrape_price(source.url, None, firefox_sites)
        if result is None:
            result = {"price": None, "error": "Scraper returned no result"}

        entry = models.PriceHistory(
            source_id=source.id,
            price=result["price"],
            error=result["error"],
            currency=str(source.currency) if source.currency else 'GBP'
        ) 
        
    db.add(entry)
    db.commit()
    logger.info(f"Saved price for {source.label}: {result}")

    if result["price"] is not None:
        try:
            from alerts import check_alerts
            check_alerts(source.product_id, result["price"], db)
        except Exception as e:
            logger.error(f"Alert check failed for source {source_id}: {e}")

