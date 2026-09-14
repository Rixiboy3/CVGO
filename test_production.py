import os

os.environ.setdefault("CVGO_DB", "/tmp/cvprofit-production-test.db")
os.environ.setdefault("CVGO_SESSION_SECRET", "cvprofit-test-secret")
os.environ.setdefault("COOKIE_SECURE", "0")

import app
import productionfix  # noqa: F401 - applies launch hardening
from werkzeug.security import generate_password_hash


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
    app.db_execute(
        "INSERT INTO users(email,password_hash,trial_started_at) VALUES(:email,:password,:trial)",
        {"email": email, "password": generate_password_hash("test-password"), "trial": app.now().isoformat()},
    )
    user = app.db_fetchone("SELECT * FROM users WHERE email=:email", {"email": email})
    with client.session_transaction() as sess:
        sess["user_id"] = user["id"]
    r = client.post("/api/cv", json={"name": "Test User"})
    assert r.status_code == 200
    r = client.post("/api/account/delete")
    assert r.status_code == 200
    assert r.get_json()["ok"] is True
    assert client.get("/api/me").get_json()["logged_in"] is False
    assert app.db_fetchone("SELECT id FROM users WHERE email=:email", {"email": email}) is None


def test_legal_pages_have_no_pending_identity_fields():
    client = app.app.test_client()
    for path in ("/legal/aviso-legal", "/legal/privacidad", "/legal/condiciones"):
        response = client.get(path)
        assert response.status_code == 200
        assert "[PENDIENTE]" not in response.get_data(as_text=True)
