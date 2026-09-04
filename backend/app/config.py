"""
app/config.py
─────────────
All runtime settings read from environment variables / .env file.

Local dev:  copy backend/.env.example → backend/.env and fill in values.
Production: set env vars in your hosting platform (Railway, Render, etc.)

DATABASE_URL examples:
  SQLite (local dev fallback):
    sqlite:///./pragati.db
  Supabase PostgreSQL (production):
    postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
  Supabase with connection pooler (recommended for serverless):
    postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────────
    # Default: SQLite for zero-config local development
    # Production: set DATABASE_URL in .env to Supabase PostgreSQL connection string
    DATABASE_URL: str = "sqlite:///./pragati.db"

    # ── JWT ───────────────────────────────────────────────────────────────────
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_THIS_IS_ONLY_FOR_PROTOTYPE"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours — typical officer shift

    # ── ML artifacts ──────────────────────────────────────────────────────────
    # Resolved relative to this file's parent-parent (pragati-ai/ml/artifacts/)
    # Override in .env if your deployment puts artifacts elsewhere.
    ML_ARTIFACTS_DIR: Path = Path(__file__).parent.parent.parent / "ml" / "artifacts"

    # ── Risk scoring ──────────────────────────────────────────────────────────
    # overall_risk >= this → alert created. Tunable; 0.45 for demo.
    RISK_THRESHOLD: float = 0.45

    # ── CORS ──────────────────────────────────────────────────────────────────
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # ── Supabase (optional — for direct Supabase JS client / storage) ─────────
    # These are NOT needed for the SQLAlchemy DB connection (use DATABASE_URL).
    # Only needed if you add direct Supabase client calls (e.g. file storage).
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
