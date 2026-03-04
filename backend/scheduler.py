import logging
import os
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.sqlalchemy import SQLAlchemyJobStore
from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_MISSED, EVENT_JOB_EXECUTED
from sqlalchemy.orm import Session
from database import SessionLocal
import models
from scraper import scrape_and_save

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://tracker:tracker@db:5432/pricetracker")

jobstores = {
    'default': SQLAlchemyJobStore(url=DATABASE_URL)
}

executors = {
    'default': ThreadPoolExecutor(max_workers=4)
}

job_defaults = {
    'misfire_grace_time': 3600,  # run missed jobs up to 1 hour late
    'coalesce': True,            # if multiple runs were missed, only run once
}

scheduler = BackgroundScheduler(
    jobstores=jobstores,
    executors=executors,
    job_defaults=job_defaults
)


def job_event_listener(event):
    """Listens to all job events and logs clearly."""
    if event.exception:
        logger.error(f"❌ Scheduler job FAILED for job {event.job_id}: {event.exception}")
        logger.error(f"   Traceback: {event.traceback}")
    elif hasattr(event, 'scheduled_run_time') and not hasattr(event, 'retval'):
        logger.warning(f"⚠️  Scheduler job MISSED for job {event.job_id} (was due at {event.scheduled_run_time})")
    else:
        logger.info(f"✅ Scheduler job completed successfully: {event.job_id}")


def run_scrape_job(product_id: int):
    """Wrapper that creates its own DB session for the scheduled job."""
    db: Session = SessionLocal()
    try:
        logger.info(f"🕐 Scheduled scrape starting for product {product_id}")
        scrape_and_save(product_id, db)
        logger.info(f"🕐 Scheduled scrape completed for product {product_id}")
    except Exception as e:
        logger.error(f"❌ Scheduled scrape failed for product {product_id}: {e}", exc_info=True)
    finally:
        db.close()


def schedule_product(product: models.Product):
    """Add or replace a scheduled job for a product."""
    job_id = f"product_{product.id}"

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
        replace_existing=True,
    )
    logger.info(f"Scheduled product {product.id} ({product.name}) every {product.interval_minutes} minutes")


def unschedule_product(product_id: int):
    job_id = f"product_{product_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
        logger.info(f"Unscheduled product {product_id}")


def load_all_jobs(db: Session):
    """On startup, schedule any products that don't already have a job in the store."""
    products = db.query(models.Product).filter(models.Product.active == True).all()
    for product in products:
        job_id = f"product_{product.id}"
        existing = scheduler.get_job(job_id)
        if existing:
            logger.info(f"Job already exists for product {product.id} ({product.name}), next run: {existing.next_run_time}")
        else:
            schedule_product(product)
    logger.info(f"Loaded {len(products)} products into scheduler")


def start_scheduler(db: Session):
    scheduler.add_listener(
        job_event_listener,
        EVENT_JOB_ERROR | EVENT_JOB_MISSED | EVENT_JOB_EXECUTED
    )
    scheduler.start()
    load_all_jobs(db)
    logger.info("Scheduler started")
