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

# Load .env before any os.getenv() calls (dev convenience; Railway injects real env vars)
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed — env vars must be set externally

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

    # 4 — Upgrade any existing "demo" predictions to "catboost" now that model is loaded
    from app.services.prediction import get_model_status
    _ms = get_model_status()
    if _ms.get("model_loaded"):
        with SessionLocal() as db:
            try:
                from app.models.prediction import Prediction
                updated = (
                    db.query(Prediction)
                    .filter(Prediction.model_mode == "demo")
                    .update(
                        {
                            "model_mode": "catboost",
                            "model_version": _ms.get("model_version"),
                        },
                        synchronize_session=False,
                    )
                )
                db.commit()
                if updated:
                    logger.info("  ✔ Upgraded %d demo predictions → catboost mode", updated)
            except Exception as upd_err:
                logger.warning("Could not upgrade demo predictions: %s", upd_err)

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
# Build list of allowed origins — supports local dev, Vercel, Railway, and ngrok tunnels.
import os as _os
_extra = [o.strip() for o in _os.environ.get("EXTRA_CORS_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_ORIGIN,
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://pragati-ai.vercel.app",
        "https://pragati-ai-git-main.vercel.app",
        *_extra,   # Add any extra URLs via EXTRA_CORS_ORIGINS env var
    ],
    allow_origin_regex=r"https://.*\.(vercel\.app|ngrok\.io|ngrok-free\.app|railway\.app)$",
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
