"""
tests/conftest.py
─────────────────
Test configuration. Uses pytest_configure to set DATABASE_URL BEFORE
any app module is imported — this is the only reliable way to redirect
pydantic-settings to a test DB across all Python import orderings.
"""
import os
from pathlib import Path

TEST_DB_PATH = Path(__file__).parent / "test_pragati.db"


def pytest_configure(config):
    """Called by pytest before any collection or import. Sets the test DB URL."""
    os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"


# ── Imports (happen AFTER pytest_configure sets the env var) ──────────────────
import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import app.models  # noqa: F401, E402 — registers all ORM models
from app.models.ingestion_log import IngestionLog, User  # noqa: F401, E402
from app.database import Base, engine, SessionLocal  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402
from app.seed import seed  # noqa: E402


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session", autouse=True)
def test_database():
    """Create fresh tables and seed once per session."""
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed(db)
    yield
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


@pytest.fixture(scope="session")
def client(test_database):
    with TestClient(fastapi_app, raise_server_exceptions=True) as c:
        yield c


@pytest.fixture(scope="session")
def officer_token(client):
    r = client.post("/auth/login", json={"username": "officer", "password": "officer123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def senior_token(client):
    r = client.post("/auth/login", json={"username": "senior", "password": "senior123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token(client):
    r = client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    assert r.status_code == 200, r.text
    return r.json()["token"]
