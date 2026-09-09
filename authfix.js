(function(){
  function style(){
    if(document.getElementById('cvgoAuthDesign')) return;
    const s=document.createElement('style');
    s.id='cvgoAuthDesign';
    s.textContent=`
      .auth.hidden{display:none!important}
      body:has(#auth:not(.hidden)){background:radial-gradient(circle at 22% 25%,rgba(37,99,235,.10),transparent 34%),linear-gradient(135deg,#f7faff 0%,#eef4ff 52%,#f8fafc 100%);min-height:100vh;color:#101828}
      body:has(#auth:not(.hidden)) header{height:78px;padding:0 5%;background:rgba(8,20,38,.98);border-bottom:1px solid #1d3150;box-shadow:0 4px 20px rgba(16,24,40,.08)}
      body:has(#auth:not(.hidden)) header .logo{font-size:30px;letter-spacing:-1.2px;font-weight:950}
      body:has(#auth:not(.hidden)) header span{color:#c8d5e8;font-size:13px}
      body:has(#auth:not(.hidden)) #headerStatus{visibility:hidden}
      body:has(#auth:not(.hidden)) #headerLogout{display:none!important}
      body:has(#auth:not(.hidden)) #logoutBtn{display:none!important}
      .auth{max-width:1240px;margin:0 auto;padding:54px 42px 48px;display:grid;grid-template-columns:minmax(0,1fr) 470px;gap:72px;align-items:center;min-height:calc(100vh - 78px)}
      .auth:before{content:'';display:block;position:absolute;inset:78px 50% 0 0;background:radial-gradient(circle at 55% 48%,rgba(59,130,246,.10),transparent 48%);pointer-events:none}
      .auth .card{position:relative;z-index:2;max-width:none;width:auto;margin:0;padding:42px 40px 34px;border-radius:24px;border:1px solid rgba(208,213,221,.78);background:rgba(255,255,255,.96);box-shadow:0 28px 80px rgba(16,24,40,.13);overflow:hidden}
      .auth .card:before{content:'';position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,#2563eb,#60a5fa,#22c55e)}
      .auth-brand{display:flex;align-items:center;justify-content:center;margin-bottom:22px}
      .auth-mark{font-size:31px;font-weight:950;letter-spacing:-1.8px;color:#0b1424}
      .auth-kicker{display:none}
      .auth .trial{border:1px solid #bbf0d2;background:#f0fdf5;color:#087443;border-radius:10px;padding:10px 12px;margin-bottom:20px;font-size:12px;font-weight:700;text-align:center}
      .auth h1{font-size:31px;line-height:1.1;letter-spacing:-1px;margin:0 0 9px;color:#101828;text-align:center}
      .auth p{font-size:14px;line-height:1.55;color:#667085;margin:0 auto 26px;max-width:360px;text-align:center}
      .auth label{display:block;font-size:12px;font-weight:800;color:#344054;margin:0 0 7px}
      .auth input{height:50px;width:100%;padding:0 14px;margin:0 0 18px;border:1px solid #d0d5dd;border-radius:11px;background:#fff;color:#101828;outline:none;transition:.18s;font-size:14px}
      .auth input:focus{border-color:#2563eb;box-shadow:0 0 0 4px rgba(37,99,235,.11)}
      .auth .primary{height:51px;border-radius:11px;background:linear-gradient(135deg,#2563eb,#1d4ed8);box-shadow:0 9px 22px rgba(37,99,235,.22);font-size:14px;transition:.18s}
      .auth .primary:hover{transform:translateY(-1px);box-shadow:0 12px 26px rgba(37,99,235,.27)}
      .auth .switch{margin-top:21px;padding-top:19px;border-top:1px solid #eaecf0;font-size:13px;color:#667085;text-align:center}
      .auth .switch button{color:#2563eb;font-weight:800;text-decoration:none;padding:0 0 2px;border-bottom:1px solid #2563eb}
      #authMsg{min-height:18px}
      .cvgo-marketing{position:relative;z-index:1;align-self:center;max-width:590px;padding:8px 0}
      .cvgo-eyebrow{display:inline-flex;align-items:center;padding:7px 12px;border-radius:999px;background:#e8f1ff;color:#2563eb;font-size:11px;font-weight:850;letter-spacing:.7px;margin-bottom:18px}
      .cvgo-marketing h2{font-size:52px;line-height:1.02;letter-spacing:-2.4px;margin:0 0 18px;color:#0b1424;max-width:570px}
      .cvgo-marketing h2 span{color:#2563eb}
      .cvgo-lead{font-size:17px;line-height:1.58;color:#52627a;max-width:530px;margin:0 0 24px}
      .cvgo-features{display:grid;gap:14px;margin:0 0 25px;max-width:510px}
      .cvgo-feature{display:grid;grid-template-columns:46px 1fr;gap:13px;align-items:center}
      .cvgo-icon{width:46px;height:46px;border-radius:13px;display:grid;place-items:center;font-size:21px;background:#e8f1ff;color:#2563eb;box-shadow:inset 0 0 0 1px rgba(37,99,235,.08)}
      .cvgo-feature:nth-child(2) .cvgo-icon{background:#f0eaff;color:#7c3aed}.cvgo-feature:nth-child(3) .cvgo-icon{background:#e8fbf2;color:#16a34a}.cvgo-feature:nth-child(4) .cvgo-icon{background:#fff2df;color:#ea8a00}
      .cvgo-feature strong{display:block;font-size:15px;color:#101828;margin-bottom:3px}.cvgo-feature small{font-size:13px;color:#667085}
      .cvgo-trial{display:flex;gap:13px;align-items:center;max-width:510px;padding:15px 17px;border:1px solid #cdeee0;background:rgba(240,253,245,.78);border-radius:14px;margin-bottom:13px}
      .cvgo-trial-icon{font-size:22px}.cvgo-trial strong{display:block;font-size:14px;color:#087443}.cvgo-trial span{font-size:12px;color:#527267}
      .cvgo-hero-cta{border:0;background:#111827;color:#fff;border-radius:11px;padding:13px 19px;font-size:14px;font-weight:850;cursor:pointer;box-shadow:0 9px 22px rgba(16,24,40,.16);transition:.18s}
      .cvgo-hero-cta:hover{transform:translateY(-1px);box-shadow:0 12px 26px rgba(16,24,40,.22)}
      .cvgo-price-note{display:inline-block;margin-left:11px;font-size:12px;color:#667085;vertical-align:middle}
      @media(max-width:900px){.auth{grid-template-columns:1fr;gap:30px;max-width:560px;padding:38px 22px 45px}.cvgo-marketing{order:0}.auth .card{order:1}.cvgo-marketing h2{font-size:42px}.cvgo-marketing{max-width:100%}.auth:before{display:none}}
      @media(max-width:600px){body:has(#auth:not(.hidden)) header{padding:0 20px}.auth{min-height:auto;margin:0 auto;padding:28px 15px 40px}.cvgo-marketing h2{font-size:35px;letter-spacing:-1.5px}.cvgo-lead{font-size:15px}.cvgo-features{gap:13px}.auth .card{padding:32px 24px 28px}.auth h1{font-size:28px}.cvgo-price-note{display:block;margin:10px 0 0}}
    `;
    document.head.appendChild(s);
  }
  function addMarketing(){
    const auth=document.getElementById('auth'); if(!auth||auth.querySelector('.cvgo-marketing'))return;
    const panel=document.createElement('section'); panel.className='cvgo-marketing';
    panel.innerHTML=`<div class="cvgo-eyebrow">CV + IA + ATS + ENTREVISTA</div><h2>Un CV profesional para nuevas <span>oportunidades.</span></h2><p class="cvgo-lead">Crea, optimiza y personaliza tu CV con inteligencia artificial. Destaca tus competencias y presenta tu experiencia de forma profesional.</p><div class="cvgo-features"><div class="cvgo-feature"><div class="cvgo-icon">▤</div><div><strong>Diseños profesionales</strong><small>Plantillas modernas y personalizables</small></div></div><div class="cvgo-feature"><div class="cvgo-icon">✦</div><div><strong>Optimización ATS con IA</strong><small>Mejora la compatibilidad con los procesos de selección</small></div></div><div class="cvgo-feature"><div class="cvgo-icon">◎</div><div><strong>Adaptado a cada oferta</strong><small>Personaliza tu CV en segundos</small></div></div><div class="cvgo-feature"><div class="cvgo-icon">♙</div><div><strong>Simulador de entrevistas</strong><small>Practica y gana confianza antes de la entrevista</small></div></div></div><div class="cvgo-trial"><div class="cvgo-trial-icon">🎁</div><div><strong>7 días gratis · Sin compromiso</strong><span>Acceso completo. Después, desde 9,99 €/mes.</span></div></div><button type="button" class="cvgo-hero-cta" id="cvgoHeroCta">Empezar gratis →</button><span class="cvgo-price-note">No se cobra durante la prueba</span>`;
    auth.prepend(panel);
    const cta=document.getElementById('cvgoHeroCta'); if(cta)cta.onclick=()=>{if(typeof authMode!=='undefined')authMode='register';if(typeof applyAuthLabels==='function')applyAuthLabels();const email=document.getElementById('authEmail'),pass=document.getElementById('authPass');if(email)email.value='';if(pass)pass.value='';if(email)email.focus()};
  }
  function applyAuthLabels(){
    if(typeof authMode==='undefined')return; const title=document.getElementById('authTitle'),text=document.getElementById('authText'),btn=document.getElementById('authBtn');const switchText=document.getElementById('switchText'),switchBtn=document.getElementById('switchBtn'),trial=document.querySelector('#auth .trial');if(!title||!text||!btn||!switchText||!switchBtn)return;
    if(authMode==='login'){title.textContent='Bienvenido de nuevo';text.textContent='Inicia sesión en tu cuenta de CVGO y continúa trabajando en tus CV.';btn.textContent='Iniciar sesión →';switchText.textContent='¿Aún no tienes cuenta?';switchBtn.textContent='Crear cuenta gratis →';if(trial)trial.style.display='none'}else{title.textContent='Crea tu cuenta';text.textContent='Prueba todas las funciones de CVGO durante 7 días.';btn.textContent='Crear mi cuenta →';switchText.textContent='¿Ya tienes cuenta?';switchBtn.textContent='Iniciar sesión';if(trial)trial.style.display='block'}
  }
  function addBrand(){const card=document.querySelector('#auth .card');if(card&&!card.querySelector('.auth-brand')){const brand=document.createElement('div');brand.className='auth-brand';brand.innerHTML='<div class="auth-mark">CVGO</div>';card.prepend(brand)}}
  function init(){style();addMarketing();addBrand();if(typeof authMode!=='undefined'){authMode='login';applyAuthLabels();const originalToggle=window.toggleAuth;if(typeof originalToggle==='function'&&!originalToggle.__cvgoWrapped){function wrappedToggle(){const toRegister=authMode==='login';originalToggle();applyAuthLabels();if(toRegister){const email=document.getElementById('authEmail'),pass=document.getElementById('authPass');if(email)email.value='';if(pass)pass.value='';if(email)email.focus()}}wrappedToggle.__cvgoWrapped=true;window.toggleAuth=wrappedToggle}}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
