import os, sqlite3, secrets, json, re
from datetime import datetime, timedelta, timezone
from flask import Flask, request, jsonify, send_from_directory, session, Response
from werkzeug.security import generate_password_hash, check_password_hash

app=Flask(__name__,static_folder=".")
app.secret_key=os.getenv("CVGO_SESSION_SECRET",secrets.token_hex(32))
DB=os.getenv("CVGO_DB","cvgo.db")
SK=os.getenv("STRIPE_SECRET_KEY","").strip()
PRICE=os.getenv("STRIPE_PRICE_ID","").strip()
WHSEC=os.getenv("STRIPE_WEBHOOK_SECRET","").strip()
OPENAI_KEY=os.getenv("OPENAI_API_KEY","").strip()
OPENAI_MODEL=os.getenv("OPENAI_MODEL","gpt-5.6-luna").strip()
TRIAL_DAYS=7

def conn():
    c=sqlite3.connect(DB); c.row_factory=sqlite3.Row; return c

def init_db():
    c=conn()
    c.execute("CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,trial_started_at TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP)")
    c.execute("""CREATE TABLE IF NOT EXISTS purchases(
      id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,stripe_session_id TEXT UNIQUE NOT NULL,
      payment_intent TEXT,amount INTEGER,currency TEXT,status TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id))""")
    c.commit(); c.close()

def now(): return datetime.now(timezone.utc)
def parse_dt(v): return datetime.fromisoformat(v.replace('Z','+00:00'))
def trial_info(user):
    start=parse_dt(user['trial_started_at']); end=start+timedelta(days=TRIAL_DAYS); seconds=max(0,(end-now()).total_seconds())
    return seconds>0, end, max(0,int(seconds//86400)+(1 if seconds%86400 else 0))

def current_user():
    uid=session.get('user_id')
    if not uid:return None
    c=conn();u=c.execute('SELECT * FROM users WHERE id=?',(uid,)).fetchone();c.close();return u

def is_pro_user(user):
    if not user:return False
    active,_,_=trial_info(user)
    if active:return True
    c=conn();row=c.execute("SELECT 1 FROM purchases WHERE user_id=? AND status='paid' LIMIT 1",(user['id'],)).fetchone();c.close();return bool(row)

def stripe():
    if not SK:return None
    import stripe; stripe.api_key=SK; return stripe

def save_paid(s):
    email=((s.get('customer_details') or {}).get('email') or s.get('customer_email') or '').strip().lower();sid=s.get('id')
    if not email or not sid:return False
    c=conn();u=c.execute('SELECT id FROM users WHERE email=?',(email,)).fetchone()
    if not u:
        start=now().isoformat();c.execute('INSERT INTO users(email,password_hash,trial_started_at) VALUES(?,?,?)',(email,generate_password_hash(secrets.token_urlsafe(24)),start));u=c.execute('SELECT id FROM users WHERE email=?',(email,)).fetchone()
    c.execute("INSERT OR IGNORE INTO purchases(user_id,stripe_session_id,payment_intent,amount,currency,status) VALUES(?,?,?,?,?,?)",(u['id'],sid,s.get('payment_intent'),s.get('amount_total'),s.get('currency'),'paid'))
    c.commit();c.close();return True

@app.get('/')
def home():
    html=open('index.html',encoding='utf-8').read()
    html=html.replace('</body>','<script src="/ai.js"></script></body>')
    return Response(html,mimetype='text/html')

@app.get('/ai.js')
def ai_js(): return send_from_directory('.', 'ai.js')

@app.post('/api/register')
def register():
    data=request.get_json(silent=True) or {};email=data.get('email','').strip().lower();password=data.get('password','')
    if '@' not in email:return jsonify(ok=False,error='INVALID_EMAIL'),400
    if len(password)<6:return jsonify(ok=False,error='PASSWORD_TOO_SHORT'),400
    c=conn()
    if c.execute('SELECT 1 FROM users WHERE email=?',(email,)).fetchone():c.close();return jsonify(ok=False,error='EMAIL_EXISTS'),409
    start=now().isoformat();c.execute('INSERT INTO users(email,password_hash,trial_started_at) VALUES(?,?,?)',(email,generate_password_hash(password),start));uid=c.execute('SELECT id FROM users WHERE email=?',(email,)).fetchone()['id'];c.commit();c.close();session['user_id']=uid
    return jsonify(ok=True,email=email,trial_days=TRIAL_DAYS)

@app.post('/api/login')
def login():
    data=request.get_json(silent=True) or {};email=data.get('email','').strip().lower();password=data.get('password','');c=conn();u=c.execute('SELECT * FROM users WHERE email=?',(email,)).fetchone();c.close()
    if not u or not check_password_hash(u['password_hash'],password):return jsonify(ok=False,error='INVALID_LOGIN'),401
    session['user_id']=u['id'];active,end,days=trial_info(u);return jsonify(ok=True,email=email,trial_active=active,trial_days_left=days,pro=is_pro_user(u))

@app.post('/api/logout')
def logout():session.clear();return jsonify(ok=True)

@app.get('/api/me')
def me():
    u=current_user()
    if not u:return jsonify(logged_in=False,pro=False)
    active,end,days=trial_info(u);return jsonify(logged_in=True,email=u['email'],trial_active=active,trial_days_left=days,trial_ends_at=end.isoformat(),pro=is_pro_user(u),ai_configured=bool(OPENAI_KEY))

@app.post('/api/ai-generate')
def ai_generate():
    u=current_user()
    if not u:return jsonify(ok=False,error='LOGIN_REQUIRED'),401
    if not is_pro_user(u):return jsonify(ok=False,error='TRIAL_EXPIRED'),403
    if not OPENAI_KEY:return jsonify(ok=False,error='AI_NOT_CONFIGURED'),503
    data=request.get_json(silent=True) or {}
    job=str(data.get('job_offer','')).strip()
    if len(job)<30:return jsonify(ok=False,error='JOB_OFFER_REQUIRED'),400
    profile={k:str(data.get(k,'')).strip() for k in ('name','role','summary','skills')}
    experience=data.get('experience') or []
    education=data.get('education') or []
    prompt=f'''Eres el motor de CV de CVGO. Tu trabajo es adaptar un curriculum a una oferta de empleo de forma profesional, natural y compatible con ATS.

REGLA CRÍTICA DE VERACIDAD:
- NO inventes ni añadas empresas, cargos, fechas, estudios, idiomas, certificaciones, herramientas, clientes, cifras, responsabilidades o logros.
- La experiencia laboral proporcionada por el candidato es una fuente cerrada. Debes conservar EXACTAMENTE el mismo número de experiencias y, para cada una, conservar EXACTAMENTE position, company y dates tal como aparecen en los datos de entrada.
- SOLO puedes mejorar la redacción de description para destacar requisitos de la oferta que realmente estén respaldados por la descripción original.
- Si una experiencia no aporta información útil para la oferta, conserva su contenido real y no la rellenes con funciones de la oferta.
- No copies requisitos de la oferta como si fueran experiencia del candidato.
- Si falta información, déjala fuera y usa recommendations para indicar qué dato real debería aportar el candidato.

OFERTA DE EMPLEO:\n{job[:12000]}

DATOS DEL CANDIDATO:\n{json.dumps(profile,ensure_ascii=False)}\nEXPERIENCIA ORIGINAL (NO MODIFICAR position/company/dates):\n{json.dumps(experience,ensure_ascii=False)}\nFORMACIÓN ORIGINAL:\n{json.dumps(education,ensure_ascii=False)}

Devuelve SOLO JSON válido, sin markdown, con esta estructura exacta:
{{"professional_title":"...","professional_summary":"...","experiences":[{{"position":"...","company":"...","dates":"...","description":"..."}}],"skills":["..."],"ats_keywords":["..."],"ats_score":0,"recommendations":["..."]}}

REQUISITOS DEL JSON:
- experiences debe tener EXACTAMENTE {len(experience)} elementos y mantener el mismo orden.
- En experiences, position, company y dates deben ser COPIADOS literalmente de la experiencia original correspondiente.
- Solo description puede reescribirse, sin introducir hechos nuevos.
- professional_title y professional_summary sí pueden adaptarse al puesto objetivo, pero no pueden afirmar experiencia o conocimientos que no consten en los datos del candidato.
- skills solo puede contener habilidades ya presentes en los datos del candidato; no añadas habilidades nuevas solo porque aparezcan en la oferta.
- ats_keywords son palabras clave de la oferta relevantes para el perfil; NO significan que el candidato las posea.
- ats_score debe ser un número de 0 a 100 basado en coincidencia de palabras clave y completitud, sin fingir que es el resultado de un ATS comercial.
- El resumen debe tener 3-5 líneas.
- recommendations debe señalar de forma clara qué información real falta para mejorar el encaje.'''
    try:
        from openai import OpenAI
        client=OpenAI(api_key=OPENAI_KEY)
        r=client.responses.create(model=OPENAI_MODEL,input=prompt)
        text=(getattr(r,'output_text','') or '').strip()
        if text.startswith('```'):
            text=re.sub(r'^```(?:json)?\s*','',text,flags=re.I)
            text=re.sub(r'\s*```$','',text).strip()
        try:
            result=json.loads(text)
        except json.JSONDecodeError:
            match=re.search(r'\{[\s\S]*\}',text)
            if not match: raise
            result=json.loads(match.group(0))
        if not isinstance(result,dict): raise ValueError('AI response is not a JSON object')

        safe_experiences=[]
        returned=result.get('experiences') or []
        for i, original in enumerate(experience):
            ai_exp=returned[i] if i < len(returned) and isinstance(returned[i],dict) else {}
            original=dict(original) if isinstance(original,dict) else {}
            description=str(ai_exp.get('description','')).strip() or str(original.get('description','')).strip()
            safe_experiences.append({'position':str(original.get('position','')).strip(),'company':str(original.get('company','')).strip(),'dates':str(original.get('dates','')).strip(),'description':description})
        result['experiences']=safe_experiences

        original_skills=[s.strip() for s in str(profile.get('skills','')).split(',') if s.strip()]
        ai_skills=[str(s).strip() for s in (result.get('skills') or []) if str(s).strip()]
        if original_skills:
            allowed={x.lower() for x in original_skills}
            result['skills']=[s for s in ai_skills if s.lower() in allowed] or original_skills
        else:
            result['skills']=[]
        return jsonify(ok=True,result=result,model=OPENAI_MODEL)
    except json.JSONDecodeError:return jsonify(ok=False,error='AI_INVALID_RESPONSE'),502
    except Exception as e:return jsonify(ok=False,error='AI_REQUEST_FAILED',detail=str(e)[:300]),502

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
            email=(s.get('customer_email') or '').strip().lower();c=conn();u=c.execute('SELECT id FROM users WHERE email=?',(email,)).fetchone()
            if u:c.execute("UPDATE purchases SET status='paid' WHERE user_id=?",(u['id'],))
            c.commit();c.close()
    return '',200

@app.get('/api/verify-session')
def verify():
    u=current_user();return jsonify(ok=True,pro=is_pro_user(u))

@app.get('/api/health')
def health():
    c=conn();u=c.execute('SELECT COUNT(*) n FROM users').fetchone()['n'];p=c.execute("SELECT COUNT(*) n FROM purchases WHERE status='paid'").fetchone()['n'];c.close();return jsonify(status='ok',stripe_configured=bool(SK and PRICE),ai_configured=bool(OPENAI_KEY),users=u,paid_purchases=p)

init_db()
if __name__=='__main__':app.run(host='0.0.0.0',port=int(os.getenv('PORT','5000')))