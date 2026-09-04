"""
app/config.py
─────────────
All runtime settings read from environment / .env file.
Connection strings are swappable here — change DATABASE_URL to a
PostgreSQL DSN when you graduate from the prototype.
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./pragati.db"

    # ── JWT ───────────────────────────────────────────────────────────────────
    SECRET_KEY: str = "CHANGE_ME_IN_PRODUCTION_THIS_IS_ONLY_FOR_PROTOTYPE"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours — typical officer shift

    # ── ML artifacts ──────────────────────────────────────────────────────────
    # Resolved relative to this file's parent-parent (i.e. pragati-ai/ml/artifacts/)
    ML_ARTIFACTS_DIR: Path = Path(__file__).parent.parent.parent / "ml" / "artifacts"

    # ── Risk scoring ──────────────────────────────────────────────────────────
    # overall_risk >= this → alert created.  Tunable; set to 0.45 for demo.
    RISK_THRESHOLD: float = 0.45

    # ── CORS ──────────────────────────────────────────────────────────────────
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
