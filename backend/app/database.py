"""
app/database.py
───────────────
SQLAlchemy engine + session factory.

Supports both:
  - SQLite   (local dev — zero setup, auto-detected by URL prefix)
  - PostgreSQL via Supabase Transaction Pooler (production)
    URL format: postgresql://postgres.[ref]:[pass]@aws-0-*.pooler.supabase.com:6543/postgres

Supabase Transaction Pooler notes:
  - pool_pre_ping MUST be False — the pooler doesn't support SET commands
  - SSL is required — passed via connect_args
  - pool_recycle=300 prevents stale connections
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")
# Both Session Pooler (port 5432) and Transaction Pooler (port 6543) use pooler.supabase.com
_is_pooler = "pooler.supabase.com" in settings.DATABASE_URL

if _is_sqlite:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False,
    )
elif _is_pooler:
    # Supabase Transaction Pooler — pool_pre_ping=False required
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=False,   # pooler doesn't support SET commands used by pre_ping
        pool_recycle=300,      # recycle connections every 5 min
        pool_size=5,
        max_overflow=5,
        connect_args={"sslmode": "require"},
        echo=False,
    )
else:
    # Direct PostgreSQL connection
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
        connect_args={"sslmode": "require"},
        echo=False,
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
