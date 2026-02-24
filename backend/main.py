from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import users, products, prices, admin
from scheduler import start_scheduler
from database import SessionLocal

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    db = SessionLocal()
    try:
        start_scheduler(db)
    finally:
        db.close()
    yield
    # Shutdown (nothing needed here for now)

app = FastAPI(title="Price Tracker", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(products.router)
app.include_router(prices.router)
app.include_router(admin.router)

@app.get("/health")
def health():
    return {"status": "ok"}
