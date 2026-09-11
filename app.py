import os, secrets, json, re, time
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

app.config.update(SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Lax', SESSION_COOKIE_SECURE=os.getenv('COOKIE_SECURE', '1') != '0')
SK = os.getenv('STRIPE_SECRET_KEY', '').strip()
PRICE = os.getenv('STRIPE_PRICE_ID', '').strip()
WHSEC = os.getenv('STRIPE_WEBHOOK_SECRET', '').strip()
OPENAI_KEY = os.getenv('OPENAI_API_KEY', '').strip()
OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-5.6-luna').strip()
TRIAL_DAYS = 3

def db_execute(sql, params=None):
    with engine.begin() as c: return c.execute(text(sql), params or {})

def db_fetchone(sql, params=None):
    with engine.connect() as c:
        row = c.execute(text(sql, params or {}).mappings().first()
        return dict(row) if row else None

def db_fetchall(sql, params=None):
    with engine.connect() as c: return [dict(r) for r in c.execute(text(sql, params or {}).mappings().all())]

def init_db():
    if DB_BACKEND == 'postgresql':
        db_execute("""CREATE TABLE IF NOT EXISTS users(id BIGSERIAL PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,trial_started_at TEXT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
        db_execute("""CREATE TABLE IF NOT EXISTS purchases(id BIGSERIAL PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES users(id),stripe_session_id TEXT UNIQUE NOT NULL,payment_intent TEXT,amount INTEGER,currency TEXT,status TEXT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
        db_execute("""CREATE TABLE IF NOT EXISTS cv_data(user_id BIGINT PRIMARY KEY REFERENCES users(id),data TEXT NOT NULL DEFAULT '{}',updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
    else:
        db_execute("""CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,trial_started_at TEXT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
        db_execute("""CREATE TABLE IF NOT EXISTS purchases(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,payment_intent TEXT,amount INTEGER,currency TEXT,status TEXT NOT NULL,stripe_session_id TEXT UNIQUE NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id))""")
        db_execute("""CREATE TABLE IF NOT EXISTS cv_data(user_id INTEGER PRIMARY KEY,data TEXT NOT NULL DEFAULT '{}',updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id))""")

def now(): return datetime.now(timezone.utc)
def parse_dt(v): return datetime.fromisoformat(str(v).replace('Z','+00:00'))
def trial_info(user):
    start=parse_dt(user['trial_started_at']); end=start+timedelta(days=TRIAL_DAYS); seconds=max(0,(end-now()).total_seconds())
    return seconds>0,end,max(0,int(seconds//86400)+(1 if seconds%86400 else 0))
def current_user():
    uid=session.get('user_id'); return db_fetchone('SELECT * FROM users WHERE id=:id',{'id':uid}) if uid else None
def is_pro_user(user):
    if not user:return False
    active,_,_=trial_info(user)
    if active:return True
    return bool(db_fetchone("SELECT 1 FROM purchases WHERE user_id=:id AND status='paid' LIMIT 1",{'id':user['id']}))
def stripe():
    if not SK:return None
    import stripe; stripe.api_key=SK; return stripe
def save_paid(s):
    email=((s.get('customer_details') or {}).get('email') or s.get('customer_email') or '').strip().lower(); sid=s.get('id')
    if not email or not sid:return False
    u=db_fetchone('SELECT id FROM users WHERE email=:email',{'email':email})
    if not u:
        db_execute('INSERT INTO users(email,password_hash,trial_started_at) VALUES(:email,:password,:trial)',{'email':email,'password':generate_password_hash(secrets.token_urlsafe(24)),'trial':now().isoformat()}); u=db_fetchone('SELECT id FROM users WHERE email=:email',{'email':email})
    if DB_BACKEND=='postgresql':
        db_execute("INSERT INTO purchases(user_id,stripe_session_id,payment_intent,amount,currency,status) VALUES(:uid,:sid,:pi,:amount,:currency,'paid') ON CONFLICT (stripe_session_id) DO NOTHING",{'uid':u['id'],'sid':sid,'pi':s.get('payment_intent'),'amount':s.get('amount_total'),'currency':s.get('currency')})
    else:
        db_execute("INSERT OR IGNORE INTO purchases(user_id,stripe_session_id,payment_intent,amount,currency,status) VALUES(:uid,:sid,:pi,:amount,:currency,'paid')",{'uid':u['id'],'sid':sid,'pi':s.get('payment_intent'),'amount':s.get('amount_total'),'currency':s.get('currency')})
    return True

@app.get('/')
def home():
    html=open('index.html',encoding='utf-8').read()
    html=html.replace('</body>','<script src="/ai.js?v=3"></script><script src="/cvpersist.js?v=3"></script><script src="/profix.js?v=1"></script></body>')
    return Response(html,mimetype='text/html')
@app.get('/ai.js')
def ai_js(): return send_from_directory('.','ai.js',mimetype='application/javascript')
@app.get('/cvpersist.js')
def cvpersist_js(): return send_from_directory('.','cvpersist.js',mimetype='application/javascript')

@app.post('/api/register')
def register():
    d=request.get_json(silent=True) or {}; email=str(d.get('email','')).strip().lower(); password=str(d.get('password',''))
    if not email or '@' not in email:return jsonify(ok=False,error='INVALID_EMAIL'),400
    if len(password)<6:return jsonify(ok=False,error='PASSWORD_TOO_SHORT'),400
    if db_fetchone('SELECT id FROM users WHERE email=:email',{'email':email}):return jsonify(ok=False,error='EMAIL_EXISTS'),409
    db_execute('INSERT INTO users(email,password_hash,trial_started_at) VALUES(:email,:password,:trial)',{'email':email,'password':generate_password_hash(password),'trial':now().isoformat()}); u=db_fetchone('SELECT * FROM users WHERE email=:email',{'email':email}); session['user_id']=u['id']; return jsonify(ok=True)
@app.post('/api/login')
def login():
    d=request.get_json(silent=True) or {}; email=str(d.get('email','')).strip().lower(); password=str(d.get('password','')); u=db_fetchone('SELECT * FROM users WHERE email=:email',{'email':email})
    if not u or not check_password_hash(u['password_hash'],password):return jsonify(ok=False,error='INVALID_LOGIN'),401
    session['user_id']=u['id']; return jsonify(ok=True)
@app.post('/api/logout')
def logout(): session.clear(); return jsonify(ok=True)
@app.get('/api/me')
def me():
    u=current_user()
    if not u:return jsonify(logged_in=False)
    active,_,days=trial_info(u); return jsonify(logged_in=True,email=u['email'],trial_active=active,trial_days_left=days,pro=is_pro_user(u))
@app.route('/api/cv',methods=['GET','POST'])
def cv_data_api():
    u=current_user()
    if not u:return jsonify(ok=False,error='LOGIN_REQUIRED'),401
    if request.method=='GET':
        row=db_fetchone('SELECT data FROM cv_data WHERE user_id=:uid',{'uid':u['id']})
        if not row:return jsonify(ok=True,data={})
        try:return jsonify(ok=True,data=json.loads(row['data'] or '{}'))
        except Exception:return jsonify(ok=True,data={})
    payload=json.dumps(request.get_json(silent=True) or {},ensure_ascii=False)
    if DB_BACKEND=='postgresql':db_execute("INSERT INTO cv_data(user_id,data,updated_at) VALUES(:uid,:data,CURRENT_TIMESTAMP) ON CONFLICT (user_id) DO UPDATE SET data=EXCLUDED.data,updated_at=CURRENT_TIMESTAMP",{'uid':u['id'],'data':payload})
    else:db_execute("INSERT INTO cv_data(user_id,data,updated_at) VALUES(:uid,:data,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,updated_at=CURRENT_TIMESTAMP",{'uid':u['id'],'data':payload})
    return jsonify(ok=True)

def extract_json(text_value):
    s=str(text_value or '').strip()
    if s.startswith('```'):s=re.sub(r'^```(?:json)?\s*','',s,flags=re.I);s=re.sub(r'\s*```$','',s)
    m=re.search(r'\{.*\}',s,re.S);return json.loads(m.group(0) if m else s)

AI_CV_SCHEMA={'type':'object','additionalProperties':False,'properties':{'score':{'type':'integer'},'summary':{'type':'string'},'matches':{'type':'array','items':{'type':'string'}},'missing':{'type':'array','items':{'type':'string'}},'recommendations':{'type':'array','items':{'type':'string'}},'keywords':{'type':'array','items':{'type':'string'}},'professional_title':{'type':'string'},'professional_summary':{'type':'string'},'experiences':{'type':'array','items':{'type':'object','additionalProperties':False,'properties':{'position':{'type':'string'},'company':{'type':'string'},'dates':{'type':'string'},'description':{'type':'string'}},'required':['position','company','dates','description']}},'skills':{'type':'array','items':{'type':'string'}}},'required':['score','summary','matches','missing','recommendations','keywords','professional_title','professional_summary','experiences','skills']}

@app.post('/api/ai-generate')
def ai_generate():
    if not current_user():return jsonify(ok=False,error='LOGIN_REQUIRED'),401
    if not OPENAI_KEY:return jsonify(ok=False,error='AI_NOT_CONFIGURED'),503
    d=request.get_json(silent=True) or {}; profile=d.get('profile') or {}; offer=str(d.get('offer') or '').strip()
    if not offer:return jsonify(ok=False,error='OFFER_REQUIRED'),400
    from openai import OpenAI
    client=OpenAI(api_key=OPENAI_KEY,timeout=60.0,max_retries=3); original_exps=profile.get('experience') or []
    prompt=f"""Eres un especialista senior en selección, CV y sistemas ATS. Debes analizar la compatibilidad REAL entre el candidato y la oferta y proponer una adaptación del CV.

REGLAS OBLIGATORIAS:
- NO inventes empresas, puestos, fechas, estudios, idiomas, certificaciones, herramientas, clientes, cifras, responsabilidades ni logros.
- Mantén EXACTAMENTE el mismo número y orden de experiencias laborales.
- Mantén literalmente puesto, empresa y fechas de cada experiencia.
- Solo puedes reescribir descripciones para hacerlas más claras y relevantes usando hechos ya presentes en el CV.
- Las habilidades solo pueden salir de las habilidades que ya tiene el candidato.
- Una palabra clave de la oferta NO significa que el candidato la posea.
- Distingue entre requisitos que el CV respalda y requisitos que faltan o no están suficientemente reflejados.
- El sector, experiencia, funciones y requisitos explícitos de la oferta deben influir en la puntuación.
- NO otorgues una puntuación alta solo porque el CV esté completo. La puntuación mide compatibilidad con ESTA oferta.
- Si un requisito importante de la oferta no aparece en el CV, debe reflejarse en 'missing' y reducir la puntuación.
- 'matches' debe contener solo elementos realmente respaldados por el CV.
- 'missing' debe contener solo requisitos relevantes de la oferta que no estén respaldados o estén poco reflejados.
- 'recommendations' debe explicar acciones concretas que el candidato puede revisar, sin sugerir que invente experiencia.
- 'keywords' debe contener términos relevantes de la oferta útiles para ATS.

PUNTUACIÓN:
- 40% requisitos y experiencia principal del puesto.
- 25% funciones y responsabilidades coincidentes.
- 20% palabras clave y habilidades relevantes.
- 15% perfil, orientación y contexto profesional.
- Si un requisito esencial falta, no superes 85 salvo que el resto esté claramente cubierto.
- Si faltan varios requisitos importantes, reduce proporcionalmente la puntuación.

Devuelve únicamente la información solicitada por el esquema estructurado.

OFERTA:
{offer}

CANDIDATO:
{json.dumps(profile,ensure_ascii=False)}"""
    last_error=None
    for attempt in range(1,4):
        try:
            response=client.responses.create(model=OPENAI_MODEL,input=prompt,text={'format':{'type':'json_schema','name':'cvgo_cv_optimization','description':'Resultado estructurado de compatibilidad ATS y adaptación segura del CV.','schema':AI_CV_SCHEMA,'strict':True}})
            if getattr(response,'status',None)=='incomplete':raise RuntimeError('AI_INCOMPLETE_RESPONSE')
            result=json.loads(getattr(response,'output_text','') or '{}');result['score']=max(0,min(100,int(result.get('score',0))))
            for key in ('matches','missing','recommendations','keywords'):
                if not isinstance(result.get(key),list):result[key]=[]
                result[key]=[str(x).strip() for x in result[key] if str(x).strip()]
            returned=result.get('experiences') or [];safe_experiences=[]
            for i,original in enumerate(original_exps):
                ai_exp=returned[i] if i<len(returned) and isinstance(returned[i],dict) else {};original=dict(original) if isinstance(original,dict) else {};description=str(ai_exp.get('description','')).strip() or str(original.get('description','')).strip();safe_experiences.append({'position':str(original.get('position','')).strip(),'company':str(original.get('company','')).strip(),'dates':str(original.get('dates','')).strip(),'description':description})
            result['experiences']=safe_experiences;original_skills=[s.strip() for s in str(profile.get('skills','')).split(',') if s.strip()];ai_skills=[str(s).strip() for s in (result.get('skills') or []) if str(s).strip()]
            if original_skills:
                allowed_skills={x.lower() for x in original_skills};result['skills']=[s for s in ai_skills if s.lower() in allowed_skills] or original_skills
            else:result['skills']=[]
            return jsonify(ok=True,result=result,model=OPENAI_MODEL)
        except json.JSONDecodeError as e:last_error=f'AI_INVALID_RESPONSE: {e}'
        except Exception as e:last_error=str(e)
        if attempt<3:time.sleep(attempt*1.5)
    return jsonify(ok=False,error='AI_REQUEST_FAILED',detail=(last_error or 'unknown')[:300],retryable=True),502

@app.post('/api/create-checkout')
def checkout():
    st=stripe();u=current_user()
    if not u:return jsonify(ok=False,error='LOGIN_REQUIRED'),401
    if not st or not PRICE:return jsonify(ok=False,error='STRIPE_NOT_CONFIGURED'),503
    s=st.checkout.Session.create(mode='subscription',customer_email=u['email'],line_items=[{'price':PRICE,'quantity':1}],success_url=os.getenv('CVGO_SUCCESS_URL','http://localhost:5000/?paid=1'),cancel_url=os.getenv('CVGO_CANCEL_URL','http://localhost:5000/?cancelled=1'),metadata={'product':'cvgo_pro','user_id':str(u['id'])})
    return jsonify(ok=True,url=s.url)
@app.post('/api/stripe-webhook')
def webhook():
    st=stripe()
    if not st or not WHSEC:return 'Webhook not configured',503
    try:e=st.Webhook.construct_event(request.data,request.headers.get('Stripe-Signature',''),WHSEC)
    except Exception:return 'Invalid signature',400
    if e['type'] in ('checkout.session.completed','invoice.paid'):
        s=e['data']['object']
        if e['type']=='checkout.session.completed' and s.get('payment_status')=='paid':save_paid(s)
        elif e['type']=='invoice.paid':
            email=(s.get('customer_email') or '').strip().lower();u=db_fetchone('SELECT id FROM users WHERE email=:email',{'email':email})
            if u:db_execute("UPDATE purchases SET status='paid' WHERE user_id=:id",{'id':u['id']})
    return '',200
@app.get('/api/verify-session')
def verify():
    u=current_user();return jsonify(ok=True,pro=is_pro_user(u))
@app.get('/api/health')
def health():
    u=db_fetchone('SELECT COUNT(*) AS n FROM users')['n'];p=db_fetchone("SELECT COUNT(*) AS n FROM purchases WHERE status='paid'")['n'];return jsonify(status='ok',db_backend=DB_BACKEND,persistent_db=DB_BACKEND=='postgresql',stripe_configured=bool(SK and PRICE),ai_configured=bool(OPENAI_KEY),users=u,paid_purchases=p)

init_db()
import interview_api
import billing_api
if __name__=='__main__':app.run(host='0.0.0.0',port=int(os.getenv('PORT','5000')))
