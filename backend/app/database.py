"""
app/database.py
───────────────
SQLAlchemy engine + session factory.

Supports both:
  - SQLite   (local dev — zero setup, auto-detected by URL prefix)
  - PostgreSQL via Supabase (production — set DATABASE_URL in .env)

Supabase-specific settings:
  pool_pre_ping=True   → validates connections before use (handles Supabase's
                          idle connection timeouts of ~5 min on free tier)
  pool_recycle=300     → recycles connections every 5 minutes to avoid
                          "SSL connection has been closed unexpectedly" errors
  pool_size/max_overflow → sensible limits for Supabase free tier (max 60 connections)
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# SQLite needs check_same_thread=False for FastAPI's thread pool
# PostgreSQL (Supabase) does not need this and works better with pool settings
if _is_sqlite:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False,
    )
else:
    # PostgreSQL / Supabase — connection pool tuned for Supabase free tier
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,    # test connection liveness before handing it out
        pool_recycle=300,      # recycle connections every 5 min (Supabase idle timeout)
        pool_size=5,           # keep 5 persistent connections
        max_overflow=10,       # allow up to 10 burst connections above pool_size
        echo=False,            # set True for SQL debug logging
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and closes it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
