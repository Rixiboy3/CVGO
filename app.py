import os, secrets, json, re
from datetime import datetime, timedelta, timezone

from flask import Flask, request, jsonify, send_from_directory, session, Response
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import create_engine, text

app = Flask(__name__, static_folder='.')
app.secret_key = os.getenv('CVGO_SESSION_SECRET', '').strip()
if not app.secret_key:
    app.secret_key = secrets.token_hex(32)

# Production: set DATABASE_URL to a managed PostgreSQL database (Supabase, Neon, etc.).
# Local fallback: SQLite remains available for development.
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
    with engine.begin() as c:
        return c.execute(text(sql), params or {})


def db_fetchone(sql, params=None):
    with engine.connect() as c:
        row = c.execute(text(sql), params or {}).mappings().first()
        return dict(row) if row else None


def db_fetchall(sql, params=None):
    with engine.connect() as c:
        return [dict(r) for r in c.execute(text(sql), params or {}).mappings().all()]


def init_db():
    if DB_BACKEND == 'postgresql':
        db_execute("""CREATE TABLE IF NOT EXISTS users(
          id BIGSERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          trial_started_at TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""")
        db_execute("""CREATE TABLE IF NOT EXISTS purchases(
          id BIGSERIAL PRIMARY KEY,
          user_id BIGINT NOT NULL REFERENCES users(id),
          stripe_session_id TEXT UNIQUE NOT NULL,
          payment_intent TEXT,
          amount INTEGER,
          currency TEXT,
          status TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""")
        db_execute("""CREATE TABLE IF NOT EXISTS cv_data(
          user_id BIGINT PRIMARY KEY REFERENCES users(id),
          data TEXT NOT NULL DEFAULT '{}',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""")
    else:
        db_execute("""CREATE TABLE IF NOT EXISTS users(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          trial_started_at TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )""")
        db_execute("""CREATE TABLE IF NOT EXISTS purchases(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          stripe_session_id TEXT UNIQUE NOT NULL,
          payment_intent TEXT,
          amount INTEGER,
          currency TEXT,
          status TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )""")
        db_execute("""CREATE TABLE IF NOT EXISTS cv_data(
          user_id INTEGER PRIMARY KEY,
          data TEXT NOT NULL DEFAULT '{}',
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )""")


def now():
    return datetime.now(timezone.utc)


def parse_dt(v):
    return datetime.fromisoformat(str(v).replace('Z', '+00:00'))


def trial_info(user):
    start = parse_dt(user['trial_started_at'])
    end = start + timedelta(days=TRIAL_DAYS)
    seconds = max(0, (end - now()).total_seconds())
    return seconds > 0, end, max(0, int(seconds // 86400) + (1 if seconds % 86400 else 0))


def current_user():
    uid = session.get('user_id')
    if not uid:
        return None
    return db_fetchone('SELECT * FROM users WHERE id=:id', {'id': uid})


def is_pro_user(user):
    if not user:
        return False
    active, _, _ = trial_info(user)
    if active:
        return True
    row = db_fetchone("SELECT 1 FROM purchases WHERE user_id=:id AND status='paid' LIMIT 1", {'id': user['id']})
    return bool(row)


def stripe():
    if not SK:
        return None
    import stripe
    stripe.api_key = SK
    return stripe


def save_paid(s):
    email = ((s.get('customer_details') or {}).get('email') or s.get('customer_email') or '').strip().lower()
    sid = s.get('id')
    if not email or not sid:
        return False
    u = db_fetchone('SELECT id FROM users WHERE email=:email', {'email': email})
    if not u:
        start = now().isoformat()
        db_execute(
            'INSERT INTO users(email,password_hash,trial_started_at) VALUES(:email,:password,:trial)',
            {'email': email, 'password': generate_password_hash(secrets.token_urlsafe(24)), 'trial': start}
        )
        u = db_fetchone('SELECT id FROM users WHERE email=:email', {'email': email})
    if DB_BACKEND == 'postgresql':
        db_execute("""INSERT INTO purchases(user_id,stripe_session_id,payment_intent,amount,currency,status)
          VALUES(:uid,:sid,:pi,:amount,:currency,'paid')
          ON CONFLICT (stripe_session_id) DO NOTHING""",
          {'uid': u['id'], 'sid': sid, 'pi': s.get('payment_intent'), 'amount': s.get('amount_total'), 'currency': s.get('currency')})
    else:
        db_execute("""INSERT OR IGNORE INTO purchases(user_id,stripe_session_id,payment_intent,amount,currency,status)
          VALUES(:uid,:sid,:pi,:amount,:currency,'paid')""",
          {'uid': u['id'], 'sid': sid, 'pi': s.get('payment_intent'), 'amount': s.get('amount_total'), 'currency': s.get('currency')})
    return True


@app.get('/')
def home():
    html = open('index.html', encoding='utf-8').read()
    html = html.replace('</body>', '<script src="/ai.js"></script><script src="/cv.js"></script><script src="/cvpersist.js"></script></body>')
    return Response(html, mimetype='text/html')


@app.get('/ai.js')
def ai_js():
    return send_from_directory('.', 'ai.js')


@app.get('/cv.js')
def cv_js():
    return send_from_directory('.', 'cv.js')


@app.get('/cvpersist.js')
def cvpersist_js():
    return send_from_directory('.', 'cvpersist.js')


@app.post('/api/register')
def register():
    data = request.get_json(silent=True) or {}
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))
    if '@' not in email:
        return jsonify(ok=False, error='INVALID_EMAIL'), 400
    if len(password) < 6:
        return jsonify(ok=False, error='PASSWORD_TOO_SHORT'), 400
    if db_fetchone('SELECT 1 FROM users WHERE email=:email', {'email': email}):
        return jsonify(ok=False, error='EMAIL_EXISTS'), 409
    start = now().isoformat()
    db_execute(
        'INSERT INTO users(email,password_hash,trial_started_at) VALUES(:email,:password,:trial)',
        {'email': email, 'password': generate_password_hash(password), 'trial': start}
    )
    uid = db_fetchone('SELECT id FROM users WHERE email=:email', {'email': email})['id']
    session.clear()
    session['user_id'] = uid
    return jsonify(ok=True, email=email, trial_days=TRIAL_DAYS)


@app.post('/api/login')
def login():
    data = request.get_json(silent=True) or {}
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))
    u = db_fetchone('SELECT * FROM users WHERE email=:email', {'email': email})
    if not u or not check_password_hash(u['password_hash'], password):
        return jsonify(ok=False, error='INVALID_LOGIN'), 401
    session.clear()
    session['user_id'] = u['id']
    active, end, days = trial_info(u)
    return jsonify(ok=True, email=email, trial_active=active, trial_days_left=days, pro=is_pro_user(u))


@app.post('/api/logout')
def logout():
    session.clear()
    return jsonify(ok=True)


@app.get('/api/me')
def me():
    u = current_user()
    if not u:
        return jsonify(logged_in=False, pro=False)
    active, end, days = trial_info(u)
    return jsonify(logged_in=True, email=u['email'], trial_active=active, trial_days_left=days,
                   trial_ends_at=end.isoformat(), pro=is_pro_user(u), ai_configured=bool(OPENAI_KEY))


@app.get('/api/cv')
def get_cv():
    u = current_user()
    if not u:
        return jsonify(ok=False, error='LOGIN_REQUIRED'), 401
    row = db_fetchone('SELECT data,updated_at FROM cv_data WHERE user_id=:id', {'id': u['id']})
    if not row:
        return jsonify(ok=True, data={}, updated_at=None)
    try:
        data = json.loads(row['data'])
    except Exception:
        data = {}
    return jsonify(ok=True, data=data, updated_at=str(row['updated_at']) if row['updated_at'] else None)


@app.post('/api/cv')
def save_cv():
    u = current_user()
    if not u:
        return jsonify(ok=False, error='LOGIN_REQUIRED'), 401
    data = request.get_json(silent=True) or {}
    allowed = {'name','role','email','phone','city','linkedin','summary','skills','experience','education','template'}
    clean = {k: data.get(k) for k in allowed if k in data}
    payload = json.dumps(clean, ensure_ascii=False)
    if DB_BACKEND == 'postgresql':
        db_execute("""INSERT INTO cv_data(user_id,data,updated_at) VALUES(:uid,:data,CURRENT_TIMESTAMP)
          ON CONFLICT (user_id) DO UPDATE SET data=EXCLUDED.data,updated_at=CURRENT_TIMESTAMP""",
          {'uid': u['id'], 'data': payload})
    else:
        db_execute("""INSERT INTO cv_data(user_id,data,updated_at) VALUES(:uid,:data,CURRENT_TIMESTAMP)
          ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,updated_at=CURRENT_TIMESTAMP""",
          {'uid': u['id'], 'data': payload})
    return jsonify(ok=True)


@app.post('/api/ai-generate')
def ai_generate():
    u = current_user()
    if not u:
        return jsonify(ok=False, error='LOGIN_REQUIRED'), 401
    if not is_pro_user(u):
        return jsonify(ok=False, error='TRIAL_EXPIRED'), 403
    if not OPENAI_KEY:
        return jsonify(ok=False, error='AI_NOT_CONFIGURED'), 503
    data = request.get_json(silent=True) or {}
    job = str(data.get('job_offer', '')).strip()
    if len(job) < 30:
        return jsonify(ok=False, error='JOB_OFFER_REQUIRED'), 400
    profile = {k: str(data.get(k, '')).strip() for k in ('name','role','summary','skills')}
    experience = data.get('experience') or []
    education = data.get('education') or []
    prompt = f'''Eres el motor de CV de CVGO. Adapta un curriculum a una oferta de empleo de forma profesional, natural y compatible con ATS.
REGLA CRÍTICA DE VERACIDAD:
- NO inventes ni añadas empresas, cargos, fechas, estudios, idiomas, certificaciones, herramientas, clientes, cifras, responsabilidades o logros.
- Conserva EXACTAMENTE el mismo número de experiencias y, para cada una, conserva EXACTAMENTE position, company y dates.
- SOLO puedes mejorar description para destacar requisitos realmente respaldados por la descripción original.
- No copies requisitos de la oferta como si fueran experiencia del candidato.
- Si falta información, déjala fuera y usa recommendations.
OFERTA DE EMPLEO:\n{job[:12000]}
DATOS DEL CANDIDATO:\n{json.dumps(profile,ensure_ascii=False)}\nEXPERIENCIA ORIGINAL:\n{json.dumps(experience,ensure_ascii=False)}\nFORMACIÓN ORIGINAL:\n{json.dumps(education,ensure_ascii=False)}
Devuelve SOLO JSON válido con: professional_title, professional_summary, experiences, skills, ats_keywords, ats_score, recommendations.
REQUISITOS: experiences exactamente {len(experience)} elementos y mismo orden; position/company/dates literalmente iguales; solo description puede reescribirse sin hechos nuevos; skills solo habilidades ya presentes; ats_keywords son términos de la oferta y no implican que el candidato los posea; ats_score 0-100; recommendations indica información real que falta.'''
    try:
        from openai import OpenAI
        client = OpenAI(api_key=OPENAI_KEY)
        r = client.responses.create(model=OPENAI_MODEL, input=prompt)
        out = (getattr(r, 'output_text', '') or '').strip()
        if out.startswith('```'):
            out = re.sub(r'^```(?:json)?\s*', '', out, flags=re.I)
            out = re.sub(r'\s*```$', '', out).strip()
        try:
            result = json.loads(out)
        except json.JSONDecodeError:
            match = re.search(r'\{[\s\S]*\}', out)
            if not match:
                raise
            result = json.loads(match.group(0))
        if not isinstance(result, dict):
            raise ValueError('AI response is not a JSON object')
        returned = result.get('experiences') or []
        safe_experiences = []
        for i, original in enumerate(experience):
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', '5000')))
