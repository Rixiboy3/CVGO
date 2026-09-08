import os, sqlite3, secrets
from flask import Flask, request, jsonify, send_from_directory, session

app=Flask(__name__,static_folder=".")
app.secret_key=os.getenv("CVGO_SESSION_SECRET",secrets.token_hex(32))
DB=os.getenv("CVGO_DB","cvgo.db")
SK=os.getenv("STRIPE_SECRET_KEY","").strip()
PRICE=os.getenv("STRIPE_PRICE_ID","").strip()
WHSEC=os.getenv("STRIPE_WEBHOOK_SECRET","").strip()

def conn():
    c=sqlite3.connect(DB); c.row_factory=sqlite3.Row; return c

def init_db():
    c=conn()
    c.execute("CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,email TEXT UNIQUE NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP)")
    c.execute("""CREATE TABLE IF NOT EXISTS purchases(
      id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,stripe_session_id TEXT UNIQUE NOT NULL,
      payment_intent TEXT,amount INTEGER,currency TEXT,status TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id))""")
    c.commit(); c.close()

def stripe():
    if not SK:return None
    import stripe; stripe.api_key=SK; return stripe

def save_paid(s):
    email=((s.get("customer_details") or {}).get("email") or s.get("customer_email") or "").strip().lower()
    sid=s.get("id")
    if not email or not sid:return False
    c=conn(); c.execute("INSERT OR IGNORE INTO users(email) VALUES(?)",(email,))
    uid=c.execute("SELECT id FROM users WHERE email=?",(email,)).fetchone()["id"]
    c.execute("""INSERT OR IGNORE INTO purchases(user_id,stripe_session_id,payment_intent,amount,currency,status)
                 VALUES(?,?,?,?,?,?)""",(uid,sid,s.get("payment_intent"),s.get("amount_total"),s.get("currency"),"paid"))
    c.commit(); c.close(); return True

@app.get("/")
def home():return send_from_directory(".","index.html")

@app.post("/api/create-checkout")
def checkout():
    st=stripe()
    if not st or not PRICE:return jsonify(ok=False,error="STRIPE_NOT_CONFIGURED"),503
    email=(request.get_json(silent=True) or {}).get("email","").strip().lower()
    if "@" not in email:return jsonify(ok=False,error="INVALID_EMAIL"),400
    s=st.checkout.Session.create(mode="payment",customer_email=email,
      line_items=[{"price":PRICE,"quantity":1}],
      success_url=os.getenv("CVGO_SUCCESS_URL","http://localhost:5000/?session_id={CHECKOUT_SESSION_ID}"),
      cancel_url=os.getenv("CVGO_CANCEL_URL","http://localhost:5000/?cancelled=1"),
      metadata={"product":"cvgo_pro"})
    return jsonify(ok=True,url=s.url)

@app.post("/api/stripe-webhook")
def webhook():
    st=stripe()
    if not st or not WHSEC:return "Webhook not configured",503
    try:e=st.Webhook.construct_event(request.data,request.headers.get("Stripe-Signature",""),WHSEC)
    except Exception:return "Invalid signature",400
    if e["type"]=="checkout.session.completed":
        s=e["data"]["object"]
        if s.get("payment_status")=="paid":save_paid(s)
    return "",200

@app.get("/api/verify-session")
def verify():
    st=stripe(); sid=request.args.get("session_id","")
    if not st or not sid:return jsonify(ok=False,pro=False),400
    try:
        s=st.checkout.Session.retrieve(sid)
        if s.get("payment_status")!="paid":return jsonify(ok=True,pro=False)
        save_paid(s)
        email=((s.get("customer_details") or {}).get("email") or s.get("customer_email") or "").lower()
        c=conn(); row=c.execute("""SELECT 1 FROM purchases p JOIN users u ON u.id=p.user_id
          WHERE u.email=? AND p.stripe_session_id=? AND p.status='paid'""",(email,sid)).fetchone(); c.close()
        if row:session["pro_email"]=email;return jsonify(ok=True,pro=True,email=email)
    except Exception:pass
    return jsonify(ok=True,pro=False)

@app.get("/api/me")
def me():
    email=session.get("pro_email")
    if not email:return jsonify(pro=False)
    c=conn(); row=c.execute("""SELECT 1 FROM purchases p JOIN users u ON u.id=p.user_id
      WHERE u.email=? AND p.status='paid' LIMIT 1""",(email,)).fetchone(); c.close()
    return jsonify(pro=bool(row),email=email)

@app.get("/api/health")
def health():
    c=conn();u=c.execute("SELECT COUNT(*) n FROM users").fetchone()["n"];p=c.execute("SELECT COUNT(*) n FROM purchases WHERE status='paid'").fetchone()["n"];c.close()
    return jsonify(status="ok",stripe_configured=bool(SK and PRICE),users=u,paid_purchases=p)

init_db()
if __name__=="__main__":app.run(host="0.0.0.0",port=int(os.getenv("PORT","5000")))
