import hashlib
import html
import json
import os
import secrets
import urllib.error
import urllib.request
from datetime import datetime, timezone, timedelta

from flask import jsonify, request, redirect
from werkzeug.security import generate_password_hash

TOKEN_MINUTES = 45
RESEND_SECONDS = 60


def _app():
    import app as app_module
    return app_module


def _secret():
    return (_app().app.secret_key or 'cvprofit-password-reset').encode('utf-8')


def _hash_token(token):
    return hashlib.sha256(_secret() + b'|password|' + str(token).encode('utf-8')).hexdigest()


def _ensure_schema():
    app_module = _app()
    if app_module.DB_BACKEND == 'postgresql':
        app_module.db_execute("""CREATE TABLE IF NOT EXISTS password_reset_tokens(
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used_at TIMESTAMP
        )""")
        app_module.db_execute("CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id)")
    else:
        app_module.db_execute("""CREATE TABLE IF NOT EXISTS password_reset_tokens(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token_hash TEXT UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used_at TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )""")
        app_module.db_execute("CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id)")


def _config():
    return (
        os.getenv('BREVO_API_KEY', '').strip(),
        os.getenv('BREVO_SENDER_EMAIL', '').strip(),
        os.getenv('BREVO_SENDER_NAME', 'CVProfit').strip() or 'CVProfit',
    )


def _create_token(user_id):
    app_module = _app()
    existing = app_module.db_fetchone(
        "SELECT created_at FROM password_reset_tokens WHERE user_id=:uid AND used_at IS NULL ORDER BY id DESC LIMIT 1",
        {'uid': user_id},
    )
    if existing and existing.get('created_at'):
        try:
            created = datetime.fromisoformat(str(existing['created_at']).replace('Z', '+00:00'))
            if created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            if (datetime.now(timezone.utc) - created).total_seconds() < RESEND_SECONDS:
                raise RuntimeError('RESET_RATE_LIMIT')
        except ValueError:
            pass
    app_module.db_execute('DELETE FROM password_reset_tokens WHERE user_id=:uid AND used_at IS NULL', {'uid': user_id})
    token = secrets.token_urlsafe(32)
    expires = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_MINUTES)
    app_module.db_execute(
        'INSERT INTO password_reset_tokens(user_id,token_hash,expires_at,created_at) VALUES(:uid,:hash,:expires,:created)',
        {'uid': user_id, 'hash': _hash_token(token), 'expires': expires.isoformat(), 'created': datetime.now(timezone.utc).isoformat()},
    )
    return token


def _send_email(email, token):
    api_key, sender_email, sender_name = _config()
    if not api_key or not sender_email:
        raise RuntimeError('EMAIL_NOT_CONFIGURED')
    base_url = os.getenv('CVPROFIT_BASE_URL', '').strip().rstrip('/') or request.host_url.rstrip('/')
    reset_url = f'{base_url}/reset-password?token={token}'
    safe_url = html.escape(reset_url, quote=True)
    safe_email = html.escape(email)
    payload = {
        'sender': {'name': sender_name, 'email': sender_email},
        'to': [{'email': email}],
        'subject': 'Restablece tu contraseña de CVProfit',
        'htmlContent': f'''<!doctype html><html lang="es"><body style="margin:0;background:#f4f6fa;font-family:Arial,sans-serif;color:#101828"><div style="max-width:620px;margin:40px auto;padding:0 18px"><div style="background:#111827;color:#fff;padding:22px 26px;border-radius:16px 16px 0 0;font-size:25px;font-weight:900">CVProfit</div><div style="background:#fff;padding:34px 30px;border:1px solid #e4e7ec;border-top:0;border-radius:0 0 16px 16px"><h1 style="font-size:25px;margin:0 0 14px">Restablece tu contraseña</h1><p style="font-size:15px;line-height:1.6;color:#475467">Hemos recibido una solicitud para cambiar la contraseña de la cuenta asociada a <strong>{safe_email}</strong>.</p><p style="margin:28px 0"><a href="{safe_url}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:800">Cambiar mi contraseña</a></p><p style="font-size:12px;line-height:1.5;color:#667085">El enlace caduca en {TOKEN_MINUTES} minutos y solo puede utilizarse una vez. Si no has solicitado este cambio, puedes ignorar este mensaje.</p></div></div></body></html>''',
        'textContent': f'Restablece tu contraseña de CVProfit: {reset_url}\n\nEl enlace caduca en {TOKEN_MINUTES} minutos y solo puede utilizarse una vez.',
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        'https://api.brevo.com/v3/smtp/email', data=data, method='POST',
        headers={'accept': 'application/json', 'api-key': api_key, 'content-type': 'application/json'},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            if response.status < 200 or response.status >= 300:
                raise RuntimeError(f'BREVO_HTTP_{response.status}')
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode('utf-8', errors='ignore')[:300]
        raise RuntimeError(f'BREVO_HTTP_{exc.code}:{detail}')


def register_password_reset(app):
    _ensure_schema()

    @app.post('/api/forgot-password')
    def forgot_password():
        d = request.get_json(silent=True) or {}
        email = str(d.get('email') or '').strip().lower()
        generic = {'ok': True, 'message': 'Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.'}
        if not email or '@' not in email:
            return jsonify(generic)
        user = _app().db_fetchone('SELECT * FROM users WHERE email=:email', {'email': email})
        if not user:
            return jsonify(generic)
        try:
            token = _create_token(user['id'])
            _send_email(email, token)
        except RuntimeError as exc:
            if 'RESET_RATE_LIMIT' in str(exc):
                return jsonify(generic)
            if 'EMAIL_NOT_CONFIGURED' in str(exc):
                return jsonify(ok=False, error='EMAIL_NOT_CONFIGURED', message='La recuperación por correo todavía no está configurada.'), 503
            return jsonify(ok=False, error='RESET_EMAIL_FAILED', message='No hemos podido enviar el correo ahora mismo. Inténtalo de nuevo más tarde.'), 503
        except Exception:
            return jsonify(ok=False, error='RESET_EMAIL_FAILED', message='No hemos podido enviar el correo ahora mismo. Inténtalo de nuevo más tarde.'), 503
        return jsonify(generic)

    @app.post('/api/reset-password')
    def reset_password():
        d = request.get_json(silent=True) or {}
        token = str(d.get('token') or '').strip()
        password = str(d.get('password') or '')
        if len(password) < 8:
            return jsonify(ok=False, error='PASSWORD_TOO_SHORT', message='La contraseña debe tener al menos 8 caracteres.'), 400
        if not token:
            return jsonify(ok=False, error='INVALID_TOKEN', message='El enlace de recuperación no es válido.'), 400
        app_module = _app()
        row = app_module.db_fetchone(
            "SELECT * FROM password_reset_tokens WHERE token_hash=:hash AND used_at IS NULL LIMIT 1",
            {'hash': _hash_token(token)},
        )
        if not row:
            return jsonify(ok=False, error='INVALID_TOKEN', message='El enlace de recuperación no es válido o ya ha sido utilizado.'), 400
        try:
            expires = datetime.fromisoformat(str(row['expires_at']).replace('Z', '+00:00'))
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
        except Exception:
            return jsonify(ok=False, error='INVALID_TOKEN', message='El enlace de recuperación no es válido.'), 400
        if expires < datetime.now(timezone.utc):
            return jsonify(ok=False, error='TOKEN_EXPIRED', message='El enlace de recuperación ha caducado. Solicita uno nuevo.'), 400
        user = app_module.db_fetchone('SELECT id FROM users WHERE id=:uid', {'uid': row['user_id']})
        if not user:
            return jsonify(ok=False, error='INVALID_TOKEN', message='El enlace de recuperación no es válido.'), 400
        app_module.db_execute('UPDATE users SET password_hash=:password WHERE id=:uid', {'password': generate_password_hash(password), 'uid': user['id']})
        app_module.db_execute('UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=:id', {'id': row['id']})
        return jsonify(ok=True, message='Contraseña actualizada correctamente.')

    @app.get('/reset-password')
    def reset_password_page():
        return redirect('/?reset=1&token=' + str(request.args.get('token') or ''))

    original_home = app.view_functions.get('home')
    if original_home:
        def home_with_password_reset(*args, **kwargs):
            response = original_home(*args, **kwargs)
            body = response.get_data(as_text=True)
            if '/passwordreset.js' not in body:
                body = body.replace('</body>', '<script src="/passwordreset.js?v=1"></script></body>')
                response.set_data(body)
                response.headers.pop('Content-Length', None)
            return response
        app.view_functions['home'] = home_with_password_reset

    @app.get('/passwordreset.js')
    def passwordreset_js():
        from flask import send_from_directory
        return send_from_directory('.', 'passwordreset.js', mimetype='application/javascript')


register_password_reset(__import__('app').app)
