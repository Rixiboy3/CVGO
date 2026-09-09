(function(){
  function style(){
    if(document.getElementById('cvgoAuthDesign')) return;
    const s=document.createElement('style');
    s.id='cvgoAuthDesign';
    s.textContent=`
      body:has(#auth:not(.hidden)){background:linear-gradient(135deg,#f5f7fb 0%,#eef2f8 100%);min-height:100vh}
      body:has(#auth:not(.hidden)) header{height:76px;padding:0 6%;background:#0b1424;border-bottom:1px solid #1d2b42}
      body:has(#auth:not(.hidden)) header .logo{font-size:30px;letter-spacing:-1px}
      body:has(#auth:not(.hidden)) header span{color:#aebbd0}
      .auth{max-width:1080px;margin:42px auto;padding:20px 28px 55px;}
      .auth .card{position:relative;max-width:500px;margin:0 auto;padding:42px 44px 34px;border-radius:22px;border:1px solid #e1e7f0;box-shadow:0 24px 70px rgba(16,24,40,.10);overflow:hidden}
      .auth .card:before{content:'';position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,#111827,#475467,#111827)}
      .auth-brand{display:flex;align-items:center;justify-content:space-between;margin-bottom:30px}
      .auth-mark{font-size:24px;font-weight:950;letter-spacing:-1px;color:#111827}.auth-mark span{font-weight:950}
      .auth-kicker{font-size:9px;font-weight:800;letter-spacing:1.1px;color:#98a2b3;text-align:right}
      .auth .trial{border:1px solid #bbf0d2;background:#f0fdf5;color:#087443;border-radius:10px;padding:10px 12px;margin-bottom:20px;font-size:12px}
      .auth h1{font-size:32px;line-height:1.1;letter-spacing:-.8px;margin:0 0 9px;color:#101828}
      .auth p{font-size:14px;line-height:1.55;color:#667085;margin:0 0 26px}
      .auth label{display:block;font-size:12px;font-weight:800;color:#344054;margin:0 0 7px}
      .auth input{height:48px;width:100%;padding:0 14px;margin:0 0 18px;border:1px solid #d0d5dd;border-radius:10px;background:#fff;color:#101828;outline:none;transition:.18s}
      .auth input:focus{border-color:#475467;box-shadow:0 0 0 4px rgba(71,84,103,.10)}
      .auth .primary{height:50px;border-radius:10px;background:#111827;box-shadow:0 7px 18px rgba(17,24,39,.18);font-size:14px;transition:.18s}
      .auth .primary:hover{transform:translateY(-1px);background:#1d2939}
      .auth .switch{margin-top:21px;padding-top:19px;border-top:1px solid #eaecf0;font-size:13px;color:#667085}
      .auth .switch button{color:#111827;font-weight:800;text-decoration:none;padding:0 0 2px;border-bottom:1px solid #111827}
      #authMsg{min-height:18px}
      @media(max-width:700px){.auth{margin:20px auto;padding:15px}.auth .card{padding:32px 25px}.auth h1{font-size:28px}.auth-brand{margin-bottom:24px}}
    `;
    document.head.appendChild(s);
  }

  function applyAuthLabels(){
    if(typeof authMode === 'undefined') return;
    const title=document.getElementById('authTitle'), text=document.getElementById('authText'), btn=document.getElementById('authBtn');
    const switchText=document.getElementById('switchText'), switchBtn=document.getElementById('switchBtn'), trial=document.querySelector('#auth .trial');
    if(!title||!text||!btn||!switchText||!switchBtn) return;
    if(authMode==='login'){
      title.textContent='Inicia sesión';
      text.textContent='Accede a tu cuenta de CVGO y continúa trabajando en tus CV.';
      btn.textContent='Iniciar sesión';
      switchText.textContent='¿Aún no te has registrado?';
      switchBtn.textContent='Hazlo aquí';
      if(trial) trial.style.display='none';
    }else{
      title.textContent='Crea tu cuenta';
      text.textContent='Prueba todas las funciones de CVGO durante 7 días.';
      btn.textContent='Empezar 7 días gratis';
      switchText.textContent='¿Ya tienes cuenta?';
      switchBtn.textContent='Iniciar sesión';
      if(trial) trial.style.display='block';
    }
  }

  function addBrand(){
    const card=document.querySelector('#auth .card');
    if(card && !card.querySelector('.auth-brand')){
      const brand=document.createElement('div');
      brand.className='auth-brand';
      brand.innerHTML='<div class="auth-mark">CVGO</div><div class="auth-kicker">TU CARRERA, MEJOR PRESENTADA</div>';
      card.prepend(brand);
    }
  }

  function init(){
    style(); addBrand();
    if(typeof authMode !== 'undefined'){
      authMode='login';
      applyAuthLabels();
      const originalToggle=window.toggleAuth;
      if(typeof originalToggle==='function' && !originalToggle.__cvgoWrapped){
        function wrappedToggle(){
          const toRegister=(typeof authMode!=='undefined' && authMode==='login');
          originalToggle();
          applyAuthLabels();
          if(toRegister){
            const email=document.getElementById('authEmail'), pass=document.getElementById('authPass');
            if(email) email.value='';
            if(pass) pass.value='';
            if(email) email.focus();
          }
        }
        wrappedToggle.__cvgoWrapped=true;
        window.toggleAuth=wrappedToggle;
      }
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
