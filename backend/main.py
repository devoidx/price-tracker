import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import users, products, prices, admin, alerts, settings, selectors, firefox_sites, push, messages, categories
from scheduler import start_scheduler
from database import SessionLocal

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        start_scheduler(db)
    finally:
        db.close()
    yield

app = FastAPI(title="Price Tracker", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "https://pt.zeolite"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(users.router)
app.include_router(products.router)
app.include_router(prices.router)
app.include_router(admin.router)
app.include_router(alerts.router)
app.include_router(settings.router)
app.include_router(selectors.router)
app.include_router(firefox_sites.router)
app.include_router(push.router)
app.include_router(messages.router)
app.include_router(categories.router)

@app.get("/health")
def health():
    return {"status": "ok"}
