import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from scraper import scrape_and_save

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def run_scrape_job(product_id: int):
    """Wrapper that creates its own DB session for the scheduled job."""
    db: Session = SessionLocal()
    try:
        scrape_and_save(product_id, db)
    except Exception as e:
        logger.error(f"Scheduled scrape failed for product {product_id}: {e}")
    finally:
        db.close()

def schedule_product(product: models.Product):
    """Add or replace a scheduled job for a product."""
    job_id = f"product_{product.id}"

    # Always remove the existing job first
    existing = scheduler.get_job(job_id)
    if existing:
        existing.remove()
        logger.info(f"Removed existing job for product {product.id}")

    if not product.active:
        logger.info(f"Product {product.id} is inactive, not scheduling")
        return

    scheduler.add_job(
        run_scrape_job,
        trigger=IntervalTrigger(minutes=product.interval_minutes),
        args=[product.id],
        id=job_id,
        max_instances=1,
    )
    logger.info(f"Scheduled product {product.id} ({product.name}) every {product.interval_minutes} minutes")

def unschedule_product(product_id: int):
    job_id = f"product_{product_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)


def load_all_jobs(db: Session):
    """On startup, load all active products and schedule them."""
    products = db.query(models.Product).filter(models.Product.active == True).all()
    for product in products:
        schedule_product(product)
    logger.info(f"Loaded {len(products)} products into scheduler")


def start_scheduler(db: Session):
    load_all_jobs(db)
    scheduler.start()
    logger.info("Scheduler started")
