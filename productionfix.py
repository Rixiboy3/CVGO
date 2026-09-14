# CVProfit production hardening.
# Keeps security and launch safeguards in one small layer so the legacy
# generated frontend does not need to be rewritten for each production fix.
import time
from collections import defaultdict, deque
from functools import wraps
from flask import jsonify, request

import app as app_module

app = app_module.app

# Commercial launch: one authoritative trial duration for every code path
# that imports the application.
app_module.TRIAL_DAYS = 7

# Basic in-process abuse protection. Render may run more than one worker, so
# this is intentionally a first line of defence rather than a billing quota.
_BUCKETS = defaultdict(deque)
_LIMITS = {
    "/api/login": (12, 300),
    "/api/register": (8, 600),
    "/api/ai-generate": (30, 3600),
    "/api/cv-import": (10, 3600),
    "/api/forgot-password": (6, 3600),
    "/api/resend-verification": (6, 3600),
}

def _client_key(path):
    # Never trust X-Forwarded-For blindly; use Flask's remote address for the
    # default production setup. This avoids letting clients spoof a new bucket.
    return f"{path}:{request.remote_addr or 'unknown'}"

def _allowed(path):
    limit, window = _LIMITS[path]
    key = _client_key(path)
    now = time.monotonic()
    q = _BUCKETS[key]
    while q and now - q[0] > window:
        q.popleft()
    if len(q) >= limit:
        return False, max(1, int(window - (now - q[0])))
    q.append(now)
    return True, 0

for _path in _LIMITS:
    _endpoint = app.view_functions.get(_path.strip('/').replace('/', '_'))
    if _endpoint is None:
        continue
    if getattr(_endpoint, "_cvprofit_rate_limited", False):
        continue
    @wraps(_endpoint)
    def _limited_endpoint(*args, __endpoint=_endpoint, __path=_path, **kwargs):
        allowed, retry_after = _allowed(__path)
        if not allowed:
            response = jsonify(ok=False, error="RATE_LIMITED", message="Demasiados intentos. Espera unos minutos y vuelve a intentarlo.")
            response.status_code = 429
            response.headers["Retry-After"] = str(retry_after)
            return response
        return __endpoint(*args, **kwargs)
    _limited_endpoint._cvprofit_rate_limited = True
    app.view_functions[_endpoint.__name__] = _limited_endpoint

# /api/health is useful internally but should not expose user counts,
# provider configuration, or database details to the public internet.
if "health" in app.view_functions:
    def _public_health():
        return jsonify(status="ok")
    app.view_functions["health"] = _public_health

# Add a safe account-deletion endpoint. Data is deleted before the user row so
# this works with the current PostgreSQL foreign key and SQLite schemas.
@app.post("/api/account/delete")
def delete_account():
    user = app_module.current_user()
    if not user:
        return jsonify(ok=False, error="LOGIN_REQUIRED"), 401
    try:
        uid = user["id"]
        app_module.db_execute("DELETE FROM cv_data WHERE user_id=:uid", {"uid": uid})
        app_module.db_execute("DELETE FROM purchases WHERE user_id=:uid", {"uid": uid})
        app_module.db_execute("DELETE FROM users WHERE id=:uid", {"uid": uid})
        from flask import session
        session.clear()
        return jsonify(ok=True)
    except Exception:
        return jsonify(ok=False, error="ACCOUNT_DELETE_FAILED"), 500

# Security headers for every HTML/API response. CSP is deliberately not added
# here because the current application loads inline scripts and third-party
# analytics; adding an incomplete CSP would break the product.
@app.after_request
def cvprofit_security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(self), geolocation=()")
    if request.is_secure:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response
