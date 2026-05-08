from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.ingest import ingest_metrics
from app.routers import alarms, metrics
from app.routers import auth as auth_router
from app.routers import datasets as datasets_router
from app.seed import seed_admin_if_empty, seed_default_alarms_if_empty


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with SessionLocal() as session:
        # ORDER IS INTENTIONAL: ingest_metrics seeds metric_definitions rows first.
        # seed_default_alarms_if_empty must run after because alarm rows have a NOT NULL
        # FK to metric_definitions.key — swapping these calls will break the FK constraint.
        await ingest_metrics(session)
        await seed_default_alarms_if_empty(session)
        await seed_admin_if_empty(session)
    yield
    await engine.dispose()


app = FastAPI(title="Palvi Metrics API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)  # public entry point — no get_current_user dep
app.include_router(metrics.router)
app.include_router(datasets_router.router)
app.include_router(alarms.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
