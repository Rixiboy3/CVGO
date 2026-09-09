import os, secrets, json, re
from datetime import datetime, timedelta, timezone

from flask import Flask, request, jsonify, send_from_directory, session, Response
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import create_engine, text

app = Flask(__name__, static_folder='.')
app.secret_key = os.getenv('CVGO_SESSION_SECRET', '').strip()
if not app.secret_key:
    app.secret_key = secrets.token_hex(32)

DATABASE_URL = os.getenv('DATABASE_URL', '').strip()
DB = os.getenv('CVGO_DB', 'cvgo.db')
if DATABASE_URL:
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = 'postgresql+psycopg://' + DATABASE_URL[len('postgres://'):]
    elif DATABASE_URL.startswith('postgresql://'):
        DATABASE_URL = 'postgresql+psycopg://' + DATABASE_URL[len('postgresql://'):]
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_recycle=300)
    DB_BACKEND = 'postgresql'
else:
    engine = create_engine(f'sqlite:///{DB}', connect_args={'check_same_thread': False})
    DB_BACKEND = 'sqlite'

app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=os.getenv('COOKIE_SECURE', '1') != '0',
)

SK = os.getenv('STRIPE_SECRET_KEY', '').strip()
PRICE = os.getenv('STRIPE_PRICE_ID', '').strip()
WHSEC = os.getenv('STRIPE_WEBHOOK_SECRET', '').strip()
OPENAI_KEY = os.getenv('OPENAI_API_KEY', '').strip()
OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-5.6-luna').strip()
TRIAL_DAYS = 7


def db_execute(sql, params=None):
    with engine.begin() as conn:
        result = conn.execute(text(sql), params or {})
        return result


def db_fetchone(sql, params=None):
    with engine.begin() as conn:
        row = conn.execute(text(sql), params or {}).mappings().first()
        return dict(row) if row else None


def db_fetchall(sql, params=None):
    with engine.begin() as conn:
        rows = conn.execute(text(sql), params or {}).mappings().all()
        return [dict(r) for r in rows]


def init_db():
    db_execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
    )''')
    db_execute('''CREATE TABLE IF NOT EXISTS purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        stripe_session_id TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL
    )''')
    db_execute('''CREATE TABLE IF NOT EXISTS cv_data (
        user_id INTEGER PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )''')


def current_user():
    uid = session.get('user_id')
    if not uid:
        return None
    return db_fetchone('SELECT * FROM users WHERE id=:id', {'id': uid})


def trial_info(user):
    if not user:
        return False, 0
    try:
        created = datetime.fromisoformat(user['created_at'])
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        end = created + timedelta(days=TRIAL_DAYS)
        now = datetime.now(timezone.utc)
        remaining = max(0, (end - now).total_seconds())
        return remaining > 0, int((remaining + 86399) // 86400)
    except Exception:
        return False, 0


def is_pro_user(user):
    active, _ = trial_info(user)
    if active:
        return True
    if not user:
        return False
    row = db_fetchone("SELECT id FROM purchases WHERE user_id=:id AND status='paid' LIMIT 1", {'id': user['id']})
    return bool(row)


def stripe():
    if not SK:
        return None
    import stripe
    stripe.api_key = SK
    return stripe


def save_paid(session_obj):
    user_id = session_obj.get('metadata', {}).get('user_id')
    if not user_id:
        email = (session_obj.get('customer_email') or '').strip().lower()
        u = db_fetchone('SELECT id FROM users WHERE email=:email', {'email': email})
        user_id = u['id'] if u else None
    if not user_id:
        return
    exists = db_fetchone('SELECT id FROM purchases WHERE stripe_session_id=:sid', {'sid': session_obj.get('id')})
    if not exists:
        db_execute('INSERT INTO purchases(user_id,stripe_session_id,status,created_at) VALUES(:uid,:sid,\'paid\',:dt)', {'uid': user_id, 'sid': session_obj.get('id'), 'dt': datetime.now(timezone.utc).isoformat()})


@app.get('/')
def home():
    with open('index.html', 'r', encoding='utf-8') as f:
        html = f.read()
    html = html.replace('</body>', '<script src="/ai.js?v=2"></script><script src="/cvpersist.js?v=2"></script></body>')
    return Response(html, mimetype='text/html')


@app.post('/api/register')
def register():
    d = request.get_json(silent=True) or {}
    email = str(d.get('email') or '').strip().lower()
    password = str(d.get('password') or '')
    if len(password) < 6:
        return jsonify(ok=False, error='PASSWORD_TOO_SHORT'), 400
    if not email or '@' not in email:
        return jsonify(ok=False, error='INVALID_EMAIL'), 400
    exists = db_fetchone('SELECT id FROM users WHERE email=:email', {'email': email})
    if exists:
        return jsonify(ok=False, error='EMAIL_EXISTS'), 400
    now = datetime.now(timezone.utc).isoformat()
    with engine.begin() as conn:
        if DB_BACKEND == 'postgresql':
            result = conn.execute(text('INSERT INTO users(email,password_hash,created_at) VALUES(:email,:password_hash,:created_at) RETURNING id'), {'email': email, 'password_hash': generate_password_hash(password), 'created_at': now})
            uid = result.scalar()
        else:
            result = conn.execute(text('INSERT INTO users(email,password_hash,created_at) VALUES(:email,:password_hash,:created_at)'), {'email': email, 'password_hash': generate_password_hash(password), 'created_at': now})
            uid = result.lastrowid
    session['user_id'] = uid
    return jsonify(ok=True)


@app.post('/api/login')
def login():
    d = request.get_json(silent=True) or {}
    email = str(d.get('email') or '').strip().lower()
    password = str(d.get('password') or '')
    u = db_fetchone('SELECT * FROM users WHERE email=:email', {'email': email})
    if not u or not check_password_hash(u['password_hash'], password):
        return jsonify(ok=False, error='INVALID_LOGIN'), 401
    session['user_id'] = u['id']
    return jsonify(ok=True)


@app.post('/api/logout')
def logout():
    session.clear()
    return jsonify(ok=True)


@app.get('/api/me')
def me():
    u = current_user()
    active, days = trial_info(u)
    return jsonify(logged_in=bool(u), email=u['email'] if u else '', trial_active=active, trial_days_left=days, pro=is_pro_user(u))


@app.get('/api/cv')
def get_cv():
    u = current_user()
    if not u:
        return jsonify(ok=False, error='LOGIN_REQUIRED'), 401
    row = db_fetchone('SELECT data,updated_at FROM cv_data WHERE user_id=:id', {'id': u['id']})
    if not row:
        return jsonify(ok=True, data=None)
    try:
        data = json.loads(row['data'])
    except Exception:
        data = None
    return jsonify(ok=True, data=data, updated_at=row['updated_at'])


@app.post('/api/cv')
def save_cv():
    u = current_user()
    if not u:
        return jsonify(ok=False, error='LOGIN_REQUIRED'), 401
    d = request.get_json(silent=True) or {}
    data = d.get('data') or {}
    raw = json.dumps(data, ensure_ascii=False)
    now = datetime.now(timezone.utc).isoformat()
    exists = db_fetchone('SELECT user_id FROM cv_data WHERE user_id=:id', {'id': u['id']})
    if exists:
        db_execute('UPDATE cv_data SET data=:data,updated_at=:dt WHERE user_id=:id', {'data': raw, 'dt': now, 'id': u['id']})
    else:
        db_execute('INSERT INTO cv_data(user_id,data,updated_at) VALUES(:id,:data,:dt)', {'id': u['id'], 'data': raw, 'dt': now})
    return jsonify(ok=True, updated_at=now)


def extract_json(raw):
    m = re.search(r'\{.*\}', raw or '', re.S)
    if not m:
        raise json.JSONDecodeError('No JSON', raw or '', 0)
    return json.loads(m.group(0))


@app.post('/api/ai-generate')
def ai_generate():
    u = current_user()
    if not u:
        return jsonify(ok=False, error='LOGIN_REQUIRED'), 401
    if not is_pro_user(u):
        return jsonify(ok=False, error='TRIAL_EXPIRED'), 402
    if not OPENAI_KEY:
        return jsonify(ok=False, error='AI_NOT_CONFIGURED'), 503
    d = request.get_json(silent=True) or {}
    offer = str(d.get('offer') or '').strip()
    profile = d.get('profile') or {}
    if len(offer) < 30:
        return jsonify(ok=False, error='OFFER_REQUIRED'), 400
    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_KEY)
    prompt = f"""
Eres un experto senior en selección de personal, ATS y optimización de CV.
Compara ESTA oferta con ESTE CV y prepara una adaptación profesional.

REGLAS CRÍTICAS:
- NO inventes experiencia, empresas, puestos, fechas, clientes, cifras, herramientas, certificaciones ni resultados.
- Mantén exactamente el mismo número y orden de experiencias del CV.
- Conserva literalmente puesto, empresa y fechas de cada experiencia.
- Solo puedes reescribir la descripción de funciones/logros para alinearla con la oferta, usando información ya presente en el CV.
- Las habilidades propuestas deben salir únicamente de las habilidades que ya aparecen en el CV.
- Distingue claramente entre lo que el CV demuestra y lo que la oferta pide pero no aparece en el CV.

PUNTUACIÓN ATS:
- 40% requisitos y experiencia principal.
- 25% funciones y responsabilidades.
- 20% palabras clave y habilidades relevantes.
- 15% perfil, orientación y contexto profesional.
- Si falta un requisito esencial, no superes 85 salvo que el resto de la oferta esté claramente cubierto.
- Si faltan varios requisitos importantes, reduce proporcionalmente la puntuación.

Devuelve SOLO JSON con esta estructura exacta:
{{"score":0,"summary":"","matches":[],"missing":[],"recommendations":[],"keywords":[],"professional_title":"","professional_summary":"","experiences":[{{"position":"","company":"","dates":"","description":""}}],"skills":[]}}

OFERTA:
{offer}

CANDIDATO:
{json.dumps(profile, ensure_ascii=False)}
"""
    try:
        response = client.responses.create(model=OPENAI_MODEL, input=prompt)
        result = extract_json(getattr(response, 'output_text', ''))
        result['score'] = max(0, min(100, int(result.get('score', 0))))
        for key in ('matches', 'missing', 'recommendations', 'keywords'):
            if not isinstance(result.get(key), list):
                result[key] = []
            result[key] = [str(x).strip() for x in result[key] if str(x).strip()]
        returned = result.get('experiences') or []
        safe_experiences = []
        original_exps = profile.get('experience') or []
        for i, original in enumerate(original_exps):
            ai_exp = returned[i] if i < len(returned) and isinstance(returned[i], dict) else {}
            original = dict(original) if isinstance(original, dict) else {}
            description = str(ai_exp.get('description', '')).strip() or str(original.get('description', '')).strip()
            safe_experiences.append({'position': str(original.get('position', '')).strip(), 'company': str(original.get('company', '')).strip(), 'dates': str(original.get('dates', '')).strip(), 'description': description})
        result['experiences'] = safe_experiences
        original_skills = [s.strip() for s in str(profile.get('skills', '')).split(',') if s.strip()]
        ai_skills = [str(s).strip() for s in (result.get('skills') or []) if str(s).strip()]
        if original_skills:
            allowed_skills = {x.lower() for x in original_skills}
            result['skills'] = [s for s in ai_skills if s.lower() in allowed_skills] or original_skills
        else:
            result['skills'] = []
        return jsonify(ok=True, result=result, model=OPENAI_MODEL)
    except json.JSONDecodeError:
        return jsonify(ok=False, error='AI_INVALID_RESPONSE'), 502
    except Exception as e:
        return jsonify(ok=False, error='AI_REQUEST_FAILED', detail=str(e)[:300]), 502


@app.post('/api/create-checkout')
def checkout():
    st = stripe()
    u = current_user()
    if not u:
        return jsonify(ok=False, error='LOGIN_REQUIRED'), 401
    if not st or not PRICE:
        return jsonify(ok=False, error='STRIPE_NOT_CONFIGURED'), 503
    s = st.checkout.Session.create(
        mode='subscription', customer_email=u['email'],
        line_items=[{'price': PRICE, 'quantity': 1}],
        success_url=os.getenv('CVGO_SUCCESS_URL', 'http://localhost:5000/?paid=1'),
        cancel_url=os.getenv('CVGO_CANCEL_URL', 'http://localhost:5000/?cancelled=1'),
        metadata={'product': 'cvgo_pro', 'user_id': str(u['id'])}
    )
    return jsonify(ok=True, url=s.url)


@app.post('/api/stripe-webhook')
def webhook():
    st = stripe()
    if not st or not WHSEC:
        return 'Webhook not configured', 503
    try:
        e = st.Webhook.construct_event(request.data, request.headers.get('Stripe-Signature', ''), WHSEC)
    except Exception:
        return 'Invalid signature', 400
    if e['type'] in ('checkout.session.completed', 'invoice.paid'):
        s = e['data']['object']
        if e['type'] == 'checkout.session.completed' and s.get('payment_status') == 'paid':
            save_paid(s)
        elif e['type'] == 'invoice.paid':
            email = (s.get('customer_email') or '').strip().lower()
            u = db_fetchone('SELECT id FROM users WHERE email=:email', {'email': email})
            if u:
                db_execute("UPDATE purchases SET status='paid' WHERE user_id=:id", {'id': u['id']})
    return '', 200


@app.get('/api/verify-session')
def verify():
    u = current_user()
    return jsonify(ok=True, pro=is_pro_user(u))


@app.get('/api/health')
def health():
    u = db_fetchone('SELECT COUNT(*) AS n FROM users')['n']
    p = db_fetchone("SELECT COUNT(*) AS n FROM purchases WHERE status='paid'")['n']
    return jsonify(status='ok', db_backend=DB_BACKEND, persistent_db=DB_BACKEND == 'postgresql', stripe_configured=bool(SK and PRICE), ai_configured=bool(OPENAI_KEY), users=u, paid_purchases=p)


init_db()

# Cargar el simulador de entrevista DESPUÉS de registrar todas las rutas principales.
# Esto también hace que /interview.js se inyecte en la página y que /api/interview exista.
import interview_api

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', '5000')))
