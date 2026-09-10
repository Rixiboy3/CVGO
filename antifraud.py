import hashlib
import re
import secrets
from datetime import datetime, timezone

from flask import request, g, make_response

TRIAL_WINDOW_DAYS = 30
MAX_TRIALS_PER_IP = 3

# Known disposable/temporary email providers. This is intentionally a conservative list.
TEMP_EMAIL_DOMAINS = {
    '10minutemail.com', '10minutemail.net', 'guerrillamail.com',
    'guerrillamail.net', 'guerrillamail.org', 'guerrillamail.de',
    'mailinator.com', 'tempmail.com', 'temp-mail.org', 'temp-mail.io',
    'throwawaymail.com', 'yopmail.com', 'getnada.com', 'emailondeck.com',
    'maildrop.cc', 'dispostable.com', 'fakeinbox.com', 'trashmail.com',
    'trashmail.me', 'moakt.com', 'sharklasers.com', 'grr.la',
    'spamgourmet.com', 'mintemail.com', 'emailfake.com', 'emailnator.com',
    'mailnesia.com', 'mytemp.email', 'tempr.email', 'discard.email',
}


def _app():
    import app as app_module
    return app_module


def _secret():
    app_module = _app()
    return (app_module.app.secret_key or 'cvprofit-antifraud').encode('utf-8')


def _hash(value):
    raw = str(value or '').strip().lower().encode('utf-8')
    return hashlib.sha256(_secret() + b'|' + raw).hexdigest()


def _client_ip():
    forwarded = request.headers.get('X-Forwarded-For', '')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.remote_addr or ''


def _device_id():
    return str(request.headers.get('X-CVProfit-Device', '')).strip()[:200]


def _email():
    try:
        data = request.get_json(silent=True) or {}
    except Exception:
        data = {}
    return str(data.get('email') or '').strip().lower()


def _is_temp_email(email):
    if '@' not in email:
        return False
    domain = email.rsplit('@', 1)[1].strip().lower()
    if domain in TEMP_EMAIL_DOMAINS:
        return True
    return bool(re.search(r'(temp|disposable|throwaway|guerrilla|10minute|mailinator)', domain))


def _ensure_table():
    app_module = _app()
    if app_module.DB_BACKEND == 'postgresql':
        app_module.db_execute("""CREATE TABLE IF NOT EXISTS trial_guards(
            id BIGSERIAL PRIMARY KEY,
            device_hash TEXT,
            ip_hash TEXT,
            email_hash TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""")
        app_module.db_execute("CREATE INDEX IF NOT EXISTS idx_trial_guards_device ON trial_guards(device_hash)")
        app_module.db_execute("CREATE INDEX IF NOT EXISTS idx_trial_guards_ip ON trial_guards(ip_hash)")
    else:
        app_module.db_execute("""CREATE TABLE IF NOT EXISTS trial_guards(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_hash TEXT,
            ip_hash TEXT,
            email_hash TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""")
        app_module.db_execute("CREATE INDEX IF NOT EXISTS idx_trial_guards_device ON trial_guards(device_hash)")
        app_module.db_execute("CREATE INDEX IF NOT EXISTS idx_trial_guards_ip ON trial_guards(ip_hash)")


def _recent_clause():
    if _app().DB_BACKEND == 'postgresql':
        return "created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'"
    return "created_at >= datetime('now','-30 days')"


def _blocked_reason():
    app_module = _app()
    email = _email()
    device = _device_id()
    ip = _client_ip()
    if _is_temp_email(email):
        return 'TEMP_EMAIL'

    # A server-set HttpOnly marker is an additional browser-level signal.
    if request.cookies.get('cvprofit_trial_guard'):
        return 'DEVICE_TRIAL_USED'

    device_hash = _hash(device) if device else ''
    ip_hash = _hash(ip) if ip else ''
    email_hash = _hash(email) if email else ''

    if device_hash:
        row = app_module.db_fetchone(
            f"SELECT id FROM trial_guards WHERE device_hash=:device AND {_recent_clause()} LIMIT 1",
            {'device': device_hash},
        )
        if row:
            return 'DEVICE_TRIAL_USED'

    if email_hash:
        row = app_module.db_fetchone(
            f"SELECT id FROM trial_guards WHERE email_hash=:email AND {_recent_clause()} LIMIT 1",
            {'email': email_hash},
        )
        if row:
            return 'EMAIL_TRIAL_USED'

    if ip_hash:
        row = app_module.db_fetchone(
            f"SELECT COUNT(*) AS count FROM trial_guards WHERE ip_hash=:ip AND {_recent_clause()}",
            {'ip': ip_hash},
        )
        if int((row or {}).get('count') or 0) >= MAX_TRIALS_PER_IP:
            return 'IP_TRIAL_LIMIT'

    return ''


def _record_trial():
    app_module = _app()
    email = _email()
    device = _device_id()
    ip = _client_ip()
    # Keep only the anti-abuse window we actually use.
    if app_module.DB_BACKEND == 'postgresql':
        app_module.db_execute("DELETE FROM trial_guards WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'")
    else:
        app_module.db_execute("DELETE FROM trial_guards WHERE created_at < datetime('now','-30 days')")
    app_module.db_execute(
        "INSERT INTO trial_guards(device_hash,ip_hash,email_hash,created_at) VALUES(:device,:ip,:email,:created)",
        {
            'device': _hash(device) if device else None,
            'ip': _hash(ip) if ip else None,
            'email': _hash(email) if email else None,
            'created': datetime.now(timezone.utc).isoformat(),
        },
    )


def register_antifraud(app):
    _ensure_table()

    @app.before_request
    def trial_antifraud_guard():
        if request.path != '/api/register' or request.method != 'POST':
            return None
        reason = _blocked_reason()
        if reason:
            messages = {
                'TEMP_EMAIL': 'Para iniciar la prueba gratuita necesitas utilizar un correo electrónico válido y permanente.',
                'DEVICE_TRIAL_USED': 'Este dispositivo ya ha utilizado una prueba gratuita. Puedes iniciar sesión con tu cuenta o contratar PRO.',
                'EMAIL_TRIAL_USED': 'Este correo ya ha utilizado una prueba gratuita. Puedes iniciar sesión con tu cuenta o contratar PRO.',
                'IP_TRIAL_LIMIT': 'Hemos alcanzado el límite de pruebas gratuitas desde esta conexión. Si eres un usuario legítimo, prueba de nuevo más adelante.',
            }
            return make_response({'ok': False, 'error': reason, 'message': messages.get(reason, 'No se puede iniciar otra prueba gratuita.')}, 403)
        g.cvprofit_trial_registration = True
        return None

    @app.after_request
    def trial_antifraud_record(response):
        if request.path == '/api/register' and request.method == 'POST' and getattr(g, 'cvprofit_trial_registration', False) and response.status_code == 200:
            try:
                _record_trial()
                response.set_cookie(
                    'cvprofit_trial_guard',
                    secrets.token_urlsafe(24),
                    max_age=TRIAL_WINDOW_DAYS * 86400,
                    httponly=True,
                    secure=app.config.get('SESSION_COOKIE_SECURE', True),
                    samesite='Lax',
                )
            except Exception:
                # Registration must never fail because anti-abuse telemetry failed.
                pass
        return response
