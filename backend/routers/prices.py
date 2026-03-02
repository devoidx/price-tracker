from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from database import get_db, SessionLocal
import models, schemas, auth
from scraper import scrape_and_save

router = APIRouter(prefix="/prices", tags=["prices"])

@router.get("/{product_id}", response_model=List[schemas.PriceHistoryOut])
def get_price_history(product_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return db.query(models.PriceHistory).filter(models.PriceHistory.product_id == product_id).order_by(models.PriceHistory.scraped_at).all()

def _do_scrape(product_id: int):
    db = SessionLocal()
    try:
        scrape_and_save(product_id, db)
    finally:
        db.close()

@router.post("/{product_id}/scrape")
def trigger_scrape(product_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    background_tasks.add_task(_do_scrape, product_id)
    return {"message": "Scrape started in background"}

@router.get("/{product_id}/debug")
def debug_scrape(product_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    from playwright.sync_api import sync_playwright
    product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        page = context.new_page()
        response = page.goto(product.url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)

        status_code = response.status if response else None
        final_url = page.url
        page_title = page.title()

        results = page.evaluate("""
            () => {
                const matches = [];
                document.querySelectorAll('[class*="offscreen"], [class*="price"]').forEach(el => {
                    const text = el.innerText.trim();
                    if (text) matches.push({ class: el.className, text: text.substring(0, 50) });
                });
                return matches.slice(0, 20);
            }
        """)
        browser.close()

    return {
        "url": product.url,
        "status_code": status_code,
        "final_url": final_url,
        "page_title": page_title,
        "price_elements_found": len(results),
        "matches": results,
        "diagnosis": (
            "Invalid or unavailable URL" if status_code and status_code >= 400
            else "Redirected — URL may be invalid or region-locked" if final_url != product.url
            else "Page loaded but no price elements found — try a different selector" if not results
            else "Price elements found — check matches for the right selector"
        )
    }
