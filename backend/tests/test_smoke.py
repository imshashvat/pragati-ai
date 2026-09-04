"""
tests/test_smoke.py
────────────────────
Smoke tests for all API routes. Fixtures are defined in conftest.py.
Run: cd backend/ && pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient

from tests.conftest import auth

# ── Auth ──────────────────────────────────────────────────────────────────────
class TestAuth:
    def test_login_officer(self, client):
        r = client.post("/auth/login", json={"username": "officer", "password": "officer123"})
        assert r.status_code == 200
        assert r.json()["role"] == "officer"

    def test_login_wrong_password(self, client):
        r = client.post("/auth/login", json={"username": "officer", "password": "WRONG"})
        assert r.status_code == 401

    def test_logout(self, client, officer_token):
        r = client.post("/auth/logout", headers=auth(officer_token))
        assert r.status_code == 200


# ── Projects ──────────────────────────────────────────────────────────────────
class TestProjects:
    def test_list_projects(self, client, officer_token):
        r = client.get("/projects", headers=auth(officer_token))
        assert r.status_code == 200
        body = r.json()
        assert "items" in body
        assert body["total"] >= 0

    def test_list_projects_senior(self, client, senior_token):
        r = client.get("/projects", headers=auth(senior_token))
        assert r.status_code == 200

    def test_list_projects_no_auth(self, client):
        r = client.get("/projects")
        assert r.status_code in (401, 403)

    def test_project_detail(self, client, officer_token):
        r = client.get("/projects", headers=auth(officer_token))
        items = r.json().get("items", [])
        if not items:
            pytest.skip("No projects in test DB")
        pid = items[0]["project_id"]
        r2 = client.get(f"/projects/{pid}", headers=auth(officer_token))
        assert r2.status_code == 200
        body = r2.json()
        assert "cost_risk" in body
        assert "trend" in body
        assert isinstance(body["trend"], list)

    def test_project_drivers(self, client, officer_token):
        r = client.get("/projects", headers=auth(officer_token))
        items = r.json().get("items", [])
        if not items:
            pytest.skip("No projects in test DB")
        pid = items[0]["project_id"]
        r2 = client.get(f"/projects/{pid}/drivers", headers=auth(officer_token))
        assert r2.status_code == 200
        assert "drivers" in r2.json()

    def test_project_not_found(self, client, officer_token):
        r = client.get("/projects/DOES-NOT-EXIST-9999", headers=auth(officer_token))
        assert r.status_code == 404


# ── Alerts ────────────────────────────────────────────────────────────────────
class TestAlerts:
    def test_list_alerts(self, client, officer_token):
        r = client.get("/alerts", headers=auth(officer_token))
        assert r.status_code == 200
        assert "items" in r.json()

    def test_review_alert_acknowledge(self, client, officer_token):
        alerts = client.get("/alerts", headers=auth(officer_token)).json()["items"]
        if not alerts:
            pytest.skip("No alerts in demo seed")
        alert_id = alerts[0]["alert_id"]
        r = client.post(
            f"/alerts/{alert_id}/review",
            json={"action": "acknowledge", "note": "Smoke test review"},
            headers=auth(officer_token),
        )
        assert r.status_code == 200
        assert r.json()["status"] == "acknowledged"

    def test_review_alert_senior_forbidden(self, client, senior_token):
        r = client.post(
            "/alerts/FAKE-ID/review",
            json={"action": "acknowledge"},
            headers=auth(senior_token),
        )
        assert r.status_code == 403

    def test_review_invalid_action(self, client, officer_token):
        alerts = client.get("/alerts", headers=auth(officer_token)).json()["items"]
        if not alerts:
            pytest.skip("No alerts in demo seed")
        alert_id = alerts[0]["alert_id"]
        r = client.post(
            f"/alerts/{alert_id}/review",
            json={"action": "INVALID_ACTION"},
            headers=auth(officer_token),
        )
        assert r.status_code == 422


# ── Dashboard ─────────────────────────────────────────────────────────────────
class TestDashboard:
    def test_portfolio(self, client, senior_token):
        r = client.get("/dashboard/portfolio", headers=auth(senior_token))
        assert r.status_code == 200
        body = r.json()
        assert "total_projects" in body
        assert "by_sector" in body
        assert "by_ministry" in body

    def test_portfolio_sector_filter(self, client, officer_token):
        r = client.get("/dashboard/portfolio?sector=Railways", headers=auth(officer_token))
        assert r.status_code == 200


# ── Model performance ─────────────────────────────────────────────────────────
class TestModelPerformance:
    def test_model_performance(self, client, officer_token):
        r = client.get("/model-performance", headers=auth(officer_token))
        assert r.status_code == 200
        assert "model_loaded" in r.json()

    def test_model_performance_admin(self, client, admin_token):
        r = client.get("/model-performance", headers=auth(admin_token))
        assert r.status_code == 200


# ── Data provenance ───────────────────────────────────────────────────────────
class TestDataProvenance:
    def test_provenance(self, client, officer_token):
        r = client.get("/data-provenance", headers=auth(officer_token))
        assert r.status_code == 200
        body = r.json()
        assert body["source"] in ("demo", "live")
        assert "model_loaded" in body


# ── Admin ─────────────────────────────────────────────────────────────────────
class TestAdmin:
    def test_ingestion_log(self, client, admin_token):
        r = client.get("/admin/ingestion-log", headers=auth(admin_token))
        assert r.status_code == 200
        assert "items" in r.json()

    def test_ingestion_log_forbidden_officer(self, client, officer_token):
        r = client.get("/admin/ingestion-log", headers=auth(officer_token))
        assert r.status_code == 403

    def test_health(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
