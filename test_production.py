import os

os.environ.setdefault("CVGO_DB", "/tmp/cvprofit-production-test.db")
os.environ.setdefault("CVGO_SESSION_SECRET", "cvprofit-test-secret")
os.environ.setdefault("COOKIE_SECURE", "0")

import app
import productionfix  # noqa: F401 - applies launch hardening


def test_public_health_is_minimal():
    client = app.app.test_client()
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.get_json() == {"status": "ok"}


def test_trial_duration_is_seven_days():
    assert app.TRIAL_DAYS == 7


def test_security_headers_are_present():
    client = app.app.test_client()
    r = client.get("/api/health")
    assert r.headers["X-Content-Type-Options"] == "nosniff"
    assert r.headers["X-Frame-Options"] == "SAMEORIGIN"
    assert r.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"


def test_account_deletion_removes_user_and_cv():
    client = app.app.test_client()
    email = "production-test@example.invalid"
    r = client.post("/api/register", json={"email": email, "password": "test-password"})
    assert r.status_code == 200
    r = client.post("/api/cv", json={"name": "Test User"})
    assert r.status_code == 200
    r = client.post("/api/account/delete")
    assert r.status_code == 200
    assert r.get_json()["ok"] is True
    assert client.get("/api/me").get_json()["logged_in"] is False
