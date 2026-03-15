from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models, schemas, auth
from scraper import scrape_and_save

router = APIRouter(prefix="/prices", tags=["prices"])

@router.get("/{product_id}", response_model=List[schemas.PriceHistoryOut])
def get_price_history(product_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    history = []
    for source in product.sources:
        for entry in source.price_history:
            history.append(entry)
    history.sort(key=lambda x: x.scraped_at)
    return history

@router.post("/{product_id}/scrape")
def trigger_scrape(product_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    product = db.query(models.Product).filter(models.Product.id == product_id, models.Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for source in product.sources:
        if source.active:
            background_tasks.add_task(scrape_source_task, source.id)
    return {"message": f"Scrape triggered for {len(product.sources)} sources"}

def scrape_source_task(source_id: int):
    from database import SessionLocal
    db = SessionLocal()
    try:
        scrape_and_save(source_id, db)
    finally:
        db.close()

@router.post("/source/{source_id}/scrape")
def trigger_source_scrape(source_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    product = db.query(models.Product).filter(models.Product.id == source.product_id, models.Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Not authorised")
    background_tasks.add_task(scrape_source_task, source_id)
    return {"message": "Scrape triggered"}

@router.get("/source/{source_id}/debug")
def debug_source(source_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    from playwright.sync_api import sync_playwright
    source = db.query(models.Source).filter(models.Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source not found")
    product = db.query(models.Product).filter(models.Product.id == source.product_id, models.Product.user_id == current_user.id).first()
    if not product:
        raise HTTPException(status_code=403, detail="Not authorised")

    from scraper import FIREFOX_SITES
    use_firefox = any(site in source.url for site in FIREFOX_SITES)

    with sync_playwright() as p:
        browser = (p.firefox if use_firefox else p.chromium).launch(headless=True)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0"
                if use_firefox else
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
        )
        page = context.new_page()
        response = page.goto(source.url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(3000)
        status_code = response.status if response else None
        final_url = page.url
        page_title = page.title()
        selector_result = None
        if source.selector:
            try:
                el = page.query_selector(source.selector)
                selector_result = el.inner_text() if el else "Selector found no element"
            except Exception as e:
                selector_result = f"Error: {e}"
        results = page.evaluate("""
    () => {
        const matches = [];
        document.querySelectorAll('*').forEach(el => {
            const text = el.innerText ? el.innerText.trim() : '';
            if (text && text.match(/£\\d+/) && text.length < 50 && el.children.length === 0) {
                matches.push({
                    tag: el.tagName,
                    class: el.className,
                    text: text.substring(0, 80),
                    parent_class: el.parentElement ? el.parentElement.className : ''
                });
            }
        });
        return matches.slice(0, 20);
    }
""")
        browser.close()
    return {
        "source_id": source_id,
        "label": source.label,
        "url": source.url,
        "selector": source.selector,
        "status_code": status_code,
        "page_title": page_title,
        "selector_result": selector_result,
        "price_elements_found": len(results),
        "matches": results
    }
