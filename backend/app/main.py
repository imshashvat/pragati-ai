"""
app/main.py
────────────
FastAPI application entry point.

Startup sequence:
  1. Create all DB tables (idempotent)
  2. Load ML models from ml/artifacts/ (graceful no-model if missing)
  3. Seed default users + demo data if DB is fresh
     (models are loaded first so seeded predictions use CatBoost scoring)

Run:
  cd backend/
  uvicorn app.main:app --reload --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, SessionLocal, engine

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    # 1 — Create tables
    import app.models  # noqa: F401 — registers all ORM models
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables ready.")

    # 2 — Load ML models FIRST so seeded predictions use real CatBoost scoring
    from app.services.prediction import _load_models
    _load_models()

    # 3 — Seed if empty (model already loaded above)
    with SessionLocal() as db:
        from app.models.ingestion_log import User
        try:
            if db.query(User).count() == 0:
                logger.info("Empty database — running seed…")
                from app.seed import seed
                seed(db)
                db.commit()
                logger.info("  ✔ Seed complete (ML model was loaded, predictions use CatBoost scoring)")
        except Exception as seed_err:
            logger.warning("Seed skipped or partial (DB may already have data): %s", seed_err)

    yield
    # (shutdown — nothing to clean up)


app = FastAPI(
    title="PRAGATI-AI API",
    description=(
        "Predictive Risk & Governance Analytics for Timely Infrastructure. "
        "PS26103 · MoSPI / PAIMANA · SIH 2026"
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from app.routers import auth, projects, alerts, dashboard, model_performance, data_provenance, admin  # noqa: E402
from app.routers import predict  # noqa: E402

app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(alerts.router)
app.include_router(dashboard.router)
app.include_router(model_performance.router)
app.include_router(data_provenance.router)
app.include_router(admin.router)
app.include_router(predict.router)


@app.get("/health")
def health():
    from app.services.prediction import get_model_status
    return {"status": "ok", **get_model_status()}
