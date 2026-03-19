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

jobstores = {'default': SQLAlchemyJobStore(url=DATABASE_URL)}
executors = {'default': ThreadPoolExecutor(max_workers=4)}
job_defaults = {'misfire_grace_time': 3600, 'coalesce': True}

scheduler = BackgroundScheduler(
    jobstores=jobstores,
    executors=executors,
    job_defaults=job_defaults
)

def job_event_listener(event):
    if event.exception:
        logger.error(f"❌ Scheduler job FAILED for job {event.job_id}: {event.exception}")
        logger.error(f"   Traceback: {event.traceback}")
    elif hasattr(event, 'scheduled_run_time') and not hasattr(event, 'retval'):
        logger.warning(f"⚠️  Scheduler job MISSED for job {event.job_id} (was due at {event.scheduled_run_time})")
    else:
        logger.info(f"✅ Scheduler job completed: {event.job_id}")

def run_scrape_job(source_id: int):
    db: Session = SessionLocal()
    try:
        logger.info(f"🕐 Scheduled scrape starting for source {source_id}")
        scrape_and_save(source_id, db)
    except Exception as e:
        logger.error(f"❌ Scheduled scrape failed for source {source_id}: {e}", exc_info=True)
    finally:
        db.close()

def schedule_source(source: models.Source):
    job_id = f"source_{source.id}"
    existing = scheduler.get_job(job_id)
    if existing:
        existing.remove()
        logger.info(f"Removed existing job for source {source.id}")
    if not source.active:
        logger.info(f"Source {source.id} is inactive, not scheduling")
        return
    scheduler.add_job(
        run_scrape_job,
        trigger=IntervalTrigger(minutes=source.interval_minutes),
        args=[source.id],
        id=job_id,
        max_instances=1,
        replace_existing=True,
    )
    logger.info(f"Scheduled source {source.id} ({source.label}) every {source.interval_minutes} minutes")

def unschedule_source(source_id: int):
    job_id = f"source_{source_id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
        logger.info(f"Unscheduled source {source_id}")

def load_all_jobs(db: Session):
    sources = db.query(models.Source).filter(models.Source.active == True).all()
    for source in sources:
        job_id = f"source_{source.id}"
        existing = scheduler.get_job(job_id)
        if existing:
            logger.info(f"Job already exists for source {source.id} ({source.label}), next run: {existing.next_run_time}")
        else:
            schedule_source(source)
    logger.info(f"Loaded {len(sources)} sources into scheduler")

def refresh_exchange_rates():
    from currencies import fetch_exchange_rates
    db = SessionLocal()
    try:
        fetch_exchange_rates(db)
    finally:
        db.close()

def start_scheduler(db: Session):
    scheduler.add_listener(job_event_listener, EVENT_JOB_ERROR | EVENT_JOB_MISSED | EVENT_JOB_EXECUTED)
    scheduler.start()
    load_all_jobs(db)

    if not scheduler.get_job('exchange_rate_refresh'):
        scheduler.add_job(
            refresh_exchange_rates,
            trigger='interval',
            hours=24,
            id='exchange_rate_refresh',
            replace_existing=True
        )
        logger.info("Scheduled daily exchange rate refresh")

    refresh_exchange_rates()
    logger.info("Scheduler started")
