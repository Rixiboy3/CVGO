# CVProfit production hardening.
# Keeps security and launch safeguards in one small layer so the legacy
# generated frontend does not need to be rewritten for each production fix.
import time
from collections import defaultdict, deque
from functools import wraps
from flask import jsonify, request, session

import app as app_module

app = app_module.app
app_module.TRIAL_DAYS = 7

# First-line abuse protection. Complements provider-side/API quotas.
_BUCKETS = defaultdict(deque)
_LIMITS = {
    "login": (12, 300),
    "register": (8, 600),
    "ai_generate": (30, 3600),
    "cv_import": (10, 3600),
    "forgot_password": (6, 3600),
    "resend_verification": (6, 3600),
}

def _allowed(endpoint_name):
    limit, window = _LIMITS[endpoint_name]
    key = f"{endpoint_name}:{request.remote_addr or 'unknown'}"
    now = time.monotonic()
    q = _BUCKETS[key]
    while q and now - q[0] > window:
        q.popleft()
    if len(q) >= limit:
        return False, max(1, int(window - (now - q[0])))
    q.append(now)
    return True, 0

for _endpoint_name in tuple(_LIMITS):
    _endpoint = app.view_functions.get(_endpoint_name)
    if _endpoint is None or getattr(_endpoint, "_cvprofit_rate_limited", False):
        continue
    def _make_limited(endpoint, endpoint_name):
        @wraps(endpoint)
        def limited(*args, **kwargs):
            allowed, retry_after = _allowed(endpoint_name)
            if not allowed:
                response = jsonify(ok=False, error="RATE_LIMITED", message="Demasiados intentos. Espera unos minutos y vuelve a intentarlo.")
                response.status_code = 429
                response.headers["Retry-After"] = str(retry_after)
                return response
            return endpoint(*args, **kwargs)
        limited._cvprofit_rate_limited = True
        return limited
    app.view_functions[_endpoint_name] = _make_limited(_endpoint, _endpoint_name)

# /api/health is useful internally but should not expose user counts,
# provider configuration, or database details to the public internet.
if "health" in app.view_functions:
    def _public_health():
        return jsonify(status="ok")
    app.view_functions["health"] = _public_health

# GDPR-friendly self-service deletion. Data is deleted before the user row.
if "delete_account" not in app.view_functions:
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
            session.clear()
            return jsonify(ok=True)
        except Exception:
            return jsonify(ok=False, error="ACCOUNT_DELETE_FAILED"), 500

@app.after_request
def cvprofit_security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(self), geolocation=()")
    if request.is_secure:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response
