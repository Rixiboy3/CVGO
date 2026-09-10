(function(){
  let originalSubmit = null;
  let waitingEmail = '';

  function msg(text, ok){
    const el=document.getElementById('authMsg');
    if(!el)return;
    el.textContent=text||'';
    el.style.color=ok?'#067647':'#b42318';
  }

  function showVerification(email){
    waitingEmail=email||waitingEmail;
    const card=document.querySelector('#auth .card');
    if(!card)return;
    card.innerHTML=`<div class="auth-brand"><div class="auth-mark">CVProfit</div></div><div style="text-align:center"><div style="font-size:42px;margin:8px 0 14px">✉️</div><h1 style="font-size:29px;margin:0 0 10px;color:#101828">Confirma tu correo</h1><p style="font-size:14px;line-height:1.6;color:#667085;margin:0 auto 22px;max-width:370px">Te hemos enviado un enlace de confirmación a <strong style="color:#344054">${escapeHtml(waitingEmail)}</strong>. Confirma tu correo para activar tus 3 días gratis.</p><div style="padding:13px 14px;border:1px solid #d1fadf;background:#f0fdf5;border-radius:11px;color:#067647;font-size:12px;line-height:1.5;margin-bottom:18px">Revisa también la carpeta de spam o correo no deseado.</div><button type="button" id="cvpResend" class="primary">Reenviar correo</button><div id="cvpResendMsg" style="min-height:18px;margin-top:12px;font-size:12px;color:#667085"></div><div class="switch" style="border-top:0;padding-top:8px"><button type="button" id="cvpBackLogin" style="color:#2563eb;font-weight:800;background:none;border:0;cursor:pointer">Volver al inicio de sesión</button></div></div>`;
    const resend=document.getElementById('cvpResend');
    if(resend)resend.onclick=async()=>{
      resend.disabled=true;resend.textContent='Enviando…';
      const out=document.getElementById('cvpResendMsg');
      try{
        const r=await fetch('/api/resend-verification',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:waitingEmail})});
        const data=await r.json();
        if(!r.ok)throw data;
        if(out)out.textContent='Si la cuenta está pendiente, hemos enviado otro correo.';
      }catch(e){if(out)out.textContent=e.message||'No hemos podido reenviar el correo.';}
      setTimeout(()=>{resend.disabled=false;resend.textContent='Reenviar correo'},60000);
    };
    const back=document.getElementById('cvpBackLogin');
    if(back)back.onclick=()=>location.reload();
  }

  function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

  async function verifiedSubmit(){
    if(typeof authMode!=='undefined' && authMode==='login'){
      return originalSubmit ? originalSubmit.apply(window,arguments) : null;
    }
    const email=(document.getElementById('authEmail')?.value||'').trim();
    const password=document.getElementById('authPass')?.value||'';
    if(!email||!password){msg('Introduce email y contraseña.');return;}
    if(password.length<6){msg('La contraseña debe tener al menos 6 caracteres.');return;}
    try{
      const r=await fetch('/api/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
      const data=await r.json();
      if(!r.ok)throw data;
      if(data.verification_required){showVerification(data.email||email);return;}
      if(originalSubmit)return originalSubmit.apply(window,arguments);
    }catch(e){
      const text=e.message||(
        e.error==='EMAIL_EXISTS'?'Ese email ya está registrado.':
        e.error==='TEMP_EMAIL'?'Para iniciar la prueba gratuita necesitas utilizar un correo electrónico válido y permanente.':
        'No hemos podido crear la cuenta. Inténtalo de nuevo.'
      );
      msg(text);
    }
  }

  function init(){
    if(typeof window.submitAuth==='function')originalSubmit=window.submitAuth;
    window.submitAuth=verifiedSubmit;
    const params=new URLSearchParams(location.search);
    const state=params.get('verify');
    if(state==='expired'){
      setTimeout(()=>msg('El enlace de confirmación ha caducado. Puedes crear la cuenta de nuevo o solicitar otro correo.'),300);
    }else if(state==='invalid'){
      setTimeout(()=>msg('El enlace de confirmación no es válido o ya ha sido utilizado.'),300);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
