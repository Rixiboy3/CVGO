import hashlib
import html
import json
import secrets
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta

from flask import request, jsonify, redirect, make_response

TOKEN_MINUTES = 30
RESEND_SECONDS = 60


def _app():
    import app as app_module
    return app_module


def _secret():
    return (_app().app.secret_key or 'cvprofit-email-verification').encode('utf-8')


def _hash_token(token):
    return hashlib.sha256(_secret() + b'|email|' + str(token).encode('utf-8')).hexdigest()


def _ensure_schema():
    app_module = _app()
    if app_module.DB_BACKEND == 'postgresql':
        app_module.db_execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP")
        app_module.db_execute("UPDATE users SET verified_at=CURRENT_TIMESTAMP WHERE verified_at IS NULL AND created_at < CURRENT_TIMESTAMP")
        app_module.db_execute("""CREATE TABLE IF NOT EXISTS email_verification_tokens(
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used_at TIMESTAMP
        )""")
        app_module.db_execute("CREATE INDEX IF NOT EXISTS idx_email_verify_user ON email_verification_tokens(user_id)")
    else:
        cols = app_module.db_fetchall('PRAGMA table_info(users)')
        if not any(str(c.get('name')) == 'verified_at' for c in cols):
            app_module.db_execute('ALTER TABLE users ADD COLUMN verified_at TIMESTAMP')
        app_module.db_execute("UPDATE users SET verified_at=datetime('now') WHERE verified_at IS NULL AND created_at < datetime('now')")
        app_module.db_execute("""CREATE TABLE IF NOT EXISTS email_verification_tokens(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used_at TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )""")
        app_module.db_execute("CREATE INDEX IF NOT EXISTS idx_email_verify_user ON email_verification_tokens(user_id)")


def _config():
    return (
        __import__('os').getenv('BREVO_API_KEY', '').strip(),
        __import__('os').getenv('BREVO_SENDER_EMAIL', '').strip(),
        __import__('os').getenv('BREVO_SENDER_NAME', 'CVProfit').strip() or 'CVProfit',
    )


def _send_email(email, token):
    import os
    api_key, sender_email, sender_name = _config()
    if not api_key or not sender_email:
        raise RuntimeError('EMAIL_NOT_CONFIGURED')

    base_url = os.getenv('CVPROFIT_BASE_URL', '').strip().rstrip('/') or request.host_url.rstrip('/')
    verify_url = f'{base_url}/api/verify-email?token={token}'
    safe_url = html.escape(verify_url, quote=True)
    safe_email = html.escape(email)

    payload = {
        'sender': {'name': sender_name, 'email': sender_email},
        'to': [{'email': email}],
        'subject': 'Confirma tu cuenta de CVProfit',
        'htmlContent': f'''<!doctype html><html lang="es"><body style="margin:0;background:#f4f6fa;font-family:Arial,sans-serif;color:#101828"><div style="max-width:620px;margin:40px auto;padding:0 18px"><div style="background:#111827;color:#fff;padding:22px 26px;border-radius:16px 16px 0 0;font-size:25px;font-weight:900">CVProfit</div><div style="background:#fff;padding:34px 30px;border:1px solid #e4e7ec;border-top:0;border-radius:0 0 16px 16px"><h1 style="font-size:25px;margin:0 0 14px">Confirma tu correo</h1><p style="font-size:15px;line-height:1.6;color:#475467">Hemos recibido una solicitud para crear una cuenta de CVProfit con <strong>{safe_email}</strong>.</p><p style="font-size:15px;line-height:1.6;color:#475467">Pulsa el botón para confirmar tu correo y activar tus <strong>3 días de prueba gratuita</strong>.</p><p style="margin:28px 0"><a href="{safe_url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:800">Confirmar mi correo</a></p><p style="font-size:12px;line-height:1.5;color:#667085">El enlace caduca en {TOKEN_MINUTES} minutos. Si no has creado esta cuenta, puedes ignorar este mensaje.</p></div></div></body></html>''',
        'textContent': f'Confirma tu cuenta de CVProfit: {verify_url}\n\nEl enlace caduca en {TOKEN_MINUTES} minutos.',
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request('https://api.brevo.com/v3/smtp/email', data=data, method='POST', headers={'accept':'application/json','api-key':api_key,'content-type':'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            if response.status < 200 or response.status >= 300:
                raise RuntimeError(f'BREVO_HTTP_{response.status}')
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode('utf-8', errors='ignore')[:300]
        raise RuntimeError(f'BREVO_HTTP_{exc.code}:{detail}')


def _create_token(user_id):
    app_module = _app()
    existing = app_module.db_fetchone(
        "SELECT created_at FROM email_verification_tokens WHERE user_id=:uid AND used_at IS NULL ORDER BY id DESC LIMIT 1",
        {'uid': user_id},
    )
    if existing and existing.get('created_at'):
        try:
            created = datetime.fromisoformat(str(existing['created_at']).replace('Z','+00:00'))
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if (datetime.now(timezone.utc) - created).total_seconds() < RESEND_SECONDS:
                raise RuntimeError('VERIFY_RATE_LIMIT')
        except ValueError:
            pass

    app_module.db_execute('DELETE FROM email_verification_tokens WHERE user_id=:uid AND used_at IS NULL', {'uid': user_id})
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_MINUTES)
    app_module.db_execute(
        'INSERT INTO email_verification_tokens(user_id,token_hash,expires_at,created_at) VALUES(:uid,:hash,:expires,:created)',
        {'uid': user_id, 'hash': _hash_token(token), 'expires': expires.isoformat(), 'created': datetime.now(timezone.utc).isoformat()},
    )
    return token


def _issue_and_send(user):
    token = _create_token(user['id'])
    try:
        _send_email(user['email'], token)
    except Exception:
        _app().db_execute('DELETE FROM email_verification_tokens WHERE user_id=:uid AND token_hash=:hash', {'uid': user['id'], 'hash': _hash_token(token)})
        raise


def _record_verified_trial(user):
    app_module = _app()
    email_hash = hashlib.sha256(_secret() + b'|antifraud-email|' + str(user.get('email') or '').strip().lower().encode('utf-8')).hexdigest()
    ip = request.headers.get('X-Forwarded-For', '').split(',')[0].strip() if request.headers.get('X-Forwarded-For') else (request.remote_addr or '')
    ip_hash = hashlib.sha256(_secret() + b'|antifraud-ip|' + ip.encode('utf-8')).hexdigest() if ip else None
    device = str(request.headers.get('X-CVProfit-Device') or '').strip()[:200]
    device_hash = hashlib.sha256(_secret() + b'|antifraud-device|' + device.encode('utf-8')).hexdigest() if device else None
    app_module.db_execute('INSERT INTO trial_guards(device_hash,ip_hash,email_hash,created_at) VALUES(:device,:ip,:email,:created)', {'device':device_hash,'ip':ip_hash,'email':email_hash,'created':datetime.now(timezone.utc).isoformat()})


def register_email_verification(app):
    _ensure_schema()
    app_module = _app()

    original_register = app.view_functions.get('register')
    original_login = app.view_functions.get('login')

    def verified_register():
        if not original_register:
            return jsonify(ok=False, error='REGISTER_NOT_AVAILABLE'), 500
        response = original_register()
        if getattr(response, 'status_code', 500) != 200:
            return response
        user = app_module.current_user()
        if not user:
            return jsonify(ok=False, error='REGISTER_FAILED'), 500
        try:
            app_module.db_execute('UPDATE users SET verified_at=NULL WHERE id=:uid', {'uid': user['id']})
            _issue_and_send(user)
        except Exception as exc:
            app_module.db_execute('DELETE FROM users WHERE id=:uid', {'uid': user['id']})
            app_module.db_execute('DELETE FROM email_verification_tokens WHERE user_id=:uid', {'uid': user['id']})
            from flask import session
            session.clear()
            code = str(exc)
            if 'EMAIL_NOT_CONFIGURED' in code:
                return jsonify(ok=False, error='EMAIL_NOT_CONFIGURED', message='La verificación por correo todavía no está configurada.'), 503
            if 'VERIFY_RATE_LIMIT' in code:
                return jsonify(ok=False, error='VERIFY_RATE_LIMIT', message='Espera unos segundos antes de volver a solicitar el correo.'), 429
            return jsonify(ok=False, error='EMAIL_SEND_FAILED', message='No hemos podido enviar el correo de confirmación. Inténtalo de nuevo.'), 503
        from flask import session
        session.clear()
        return jsonify(ok=True, verification_required=True, email=user['email']), 202

    def verified_login():
        if not original_login:
            return jsonify(ok=False, error='LOGIN_NOT_AVAILABLE'), 500
        response = original_login()
        if getattr(response, 'status_code', 500) != 200:
            return response
        user = app_module.current_user()
        if user and not user.get('verified_at'):
            from flask import session
            session.clear()
            return jsonify(ok=False, error='EMAIL_NOT_VERIFIED', message='Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.'), 403
        return response

    app.view_functions['register'] = verified_register
    app.view_functions['login'] = verified_login

    @app.get('/api/verify-email')
    def verify_email():
        token = str(request.args.get('token') or '').strip()
        if not token:
            return redirect('/?verify=invalid')
        row = app_module.db_fetchone("SELECT * FROM email_verification_tokens WHERE token_hash=:hash AND used_at IS NULL LIMIT 1", {'hash': _hash_token(token)})
        if not row:
            return redirect('/?verify=invalid')
        try:
            expires = datetime.fromisoformat(str(row['expires_at']).replace('Z','+00:00'))
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
        except Exception:
            return redirect('/?verify=invalid')
        if expires < datetime.now(timezone.utc):
            return redirect('/?verify=expired')
        user = app_module.db_fetchone('SELECT * FROM users WHERE id=:uid', {'uid': row['user_id']})
        if not user:
            return redirect('/?verify=invalid')
        app_module.db_execute('UPDATE users SET verified_at=CURRENT_TIMESTAMP WHERE id=:uid', {'uid': user['id']})
        app_module.db_execute('UPDATE email_verification_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=:id', {'id': row['id']})
        from flask import session
        session['user_id'] = user['id']
        try:
            _record_verified_trial(user)
        except Exception:
            pass
        response = make_response(redirect('/?verified=1'))
        response.set_cookie('cvprofit_trial_guard', secrets.token_urlsafe(24), max_age=30*86400, httponly=True, secure=app.config.get('SESSION_COOKIE_SECURE', True), samesite='Lax')
        return response

    @app.post('/api/resend-verification')
    def resend_verification():
        d = request.get_json(silent=True) or {}
        email = str(d.get('email') or '').strip().lower()
        generic = {'ok': True, 'message': 'Si existe una cuenta pendiente de verificación, enviaremos un nuevo correo.'}
        if not email or '@' not in email:
            return jsonify(generic)
        user = app_module.db_fetchone('SELECT * FROM users WHERE email=:email', {'email': email})
        if not user or user.get('verified_at'):
            return jsonify(generic)
        try:
            _issue_and_send(user)
        except RuntimeError as exc:
            if 'VERIFY_RATE_LIMIT' in str(exc):
                return jsonify(ok=False, error='VERIFY_RATE_LIMIT', message='Espera unos segundos antes de volver a solicitar el correo.'), 429
            return jsonify(ok=False, error='EMAIL_SEND_FAILED', message='No hemos podido enviar el correo ahora mismo. Inténtalo de nuevo más tarde.'), 503
        except Exception:
            return jsonify(ok=False, error='EMAIL_SEND_FAILED', message='No hemos podido enviar el correo ahora mismo. Inténtalo de nuevo más tarde.'), 503
        return jsonify(generic)

    original_me = app.view_functions.get('me')
    if original_me:
        def me_verified():
            result = original_me()
            try:
                data = result.get_json()
                if data and data.get('logged_in'):
                    user = app_module.current_user()
                    if user and not user.get('verified_at'):
                        from flask import session
                        session.clear()
                        return jsonify(logged_in=False, email_verification_required=True)
            except Exception:
                pass
            return result
        app.view_functions['me'] = me_verified

    original_home = app.view_functions.get('home')
    if original_home:
        def home_with_email_verify(*args, **kwargs):
            response = original_home(*args, **kwargs)
            body = response.get_data(as_text=True)
            if '/emailverify.js' not in body:
                body = body.replace('</body>', '<script src="/emailverify.js?v=1"></script></body>')
                response.set_data(body)
                response.headers.pop('Content-Length', None)
            return response
        app.view_functions['home'] = home_with_email_verify

    @app.get('/emailverify.js')
    def emailverify_js():
        from flask import send_from_directory
        return send_from_directory('.', 'emailverify.js', mimetype='application/javascript')
