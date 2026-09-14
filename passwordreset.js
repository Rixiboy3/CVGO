(function(){
  'use strict';
  function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function msg(text,ok){const el=document.getElementById('authMsg');if(el){el.textContent=text||'';el.style.color=ok?'#067647':'#b42318'}}
  function showReset(token){
    const card=document.querySelector('#auth .card');if(!card)return;
    card.innerHTML=`<div class="auth-brand"><div class="auth-mark">CVProfit</div></div><div style="text-align:center"><div style="font-size:42px;margin:8px 0 14px">🔐</div><h1 style="font-size:29px;margin:0 0 10px;color:#101828">Nueva contraseña</h1><p style="font-size:14px;line-height:1.6;color:#667085;margin:0 auto 22px;max-width:370px">Crea una nueva contraseña para volver a entrar en tu cuenta de CVProfit.</p><label style="display:block;text-align:left;font-size:12px;font-weight:800;color:#344054;margin-bottom:7px">Nueva contraseña</label><input id="cvpResetPass" type="password" autocomplete="new-password" placeholder="Mínimo 8 caracteres" style="height:50px;width:100%;box-sizing:border-box;padding:0 14px;margin:0 0 14px;border:1px solid #d0d5dd;border-radius:11px;background:#fff;color:#101828"><label style="display:block;text-align:left;font-size:12px;font-weight:800;color:#344054;margin-bottom:7px">Repite la contraseña</label><input id="cvpResetPass2" type="password" autocomplete="new-password" placeholder="Repite la contraseña" style="height:50px;width:100%;box-sizing:border-box;padding:0 14px;margin:0 0 14px;border:1px solid #d0d5dd;border-radius:11px;background:#fff;color:#101828"><button type="button" id="cvpResetBtn" class="primary">Guardar nueva contraseña →</button><div id="cvpResetMsg" style="min-height:20px;margin-top:12px;font-size:12px"></div><div class="switch" style="border-top:0;padding-top:8px"><button type="button" id="cvpResetBack" style="color:#2563eb;font-weight:800;background:none;border:0;cursor:pointer">Volver al inicio de sesión</button></div></div>`;
    const btn=document.getElementById('cvpResetBtn');
    if(btn)btn.onclick=async()=>{
      const p=document.getElementById('cvpResetPass')?.value||'';const p2=document.getElementById('cvpResetPass2')?.value||'';const out=document.getElementById('cvpResetMsg');
      if(p.length<8){if(out)out.textContent='La contraseña debe tener al menos 8 caracteres.';return}
      if(p!==p2){if(out)out.textContent='Las contraseñas no coinciden.';return}
      btn.disabled=true;btn.textContent='Guardando…';
      try{
        const r=await fetch('/api/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password:p})});
        const data=await r.json();if(!r.ok)throw data;
        if(out){out.textContent='✓ Contraseña actualizada. Ya puedes iniciar sesión.';out.style.color='#067647'}
        setTimeout(()=>{location.href='/';},1200);
      }catch(e){if(out){out.textContent=e.message||'No hemos podido actualizar la contraseña.';out.style.color='#b42318'}btn.disabled=false;btn.textContent='Guardar nueva contraseña →'}
    };
    const back=document.getElementById('cvpResetBack');if(back)back.onclick=()=>location.href='/';
    document.getElementById('cvpResetPass')?.focus();
  }
  function showForgot(){
    const card=document.querySelector('#auth .card');if(!card)return;
    card.innerHTML=`<div class="auth-brand"><div class="auth-mark">CVProfit</div></div><div style="text-align:center"><div style="font-size:42px;margin:8px 0 14px">📧</div><h1 style="font-size:29px;margin:0 0 10px;color:#101828">Recupera tu contraseña</h1><p style="font-size:14px;line-height:1.6;color:#667085;margin:0 auto 22px;max-width:370px">Introduce tu correo y, si existe una cuenta asociada, te enviaremos un enlace para crear una nueva contraseña.</p><label style="display:block;text-align:left;font-size:12px;font-weight:800;color:#344054;margin-bottom:7px">Correo electrónico</label><input id="cvpForgotEmail" type="email" autocomplete="email" placeholder="tu@email.com" style="height:50px;width:100%;box-sizing:border-box;padding:0 14px;margin:0 0 14px;border:1px solid #d0d5dd;border-radius:11px;background:#fff;color:#101828"><button type="button" id="cvpForgotBtn" class="primary">Enviar enlace →</button><div id="cvpForgotMsg" style="min-height:20px;margin-top:12px;font-size:12px"></div><div class="switch" style="border-top:0;padding-top:8px"><button type="button" id="cvpForgotBack" style="color:#2563eb;font-weight:800;background:none;border:0;cursor:pointer">Volver al inicio de sesión</button></div></div>`;
    const btn=document.getElementById('cvpForgotBtn');
    if(btn)btn.onclick=async()=>{
      const email=(document.getElementById('cvpForgotEmail')?.value||'').trim();const out=document.getElementById('cvpForgotMsg');
      if(!email||!email.includes('@')){if(out)out.textContent='Introduce un correo válido.';return}
      btn.disabled=true;btn.textContent='Enviando…';
      try{
        const r=await fetch('/api/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});const data=await r.json();if(!r.ok)throw data;
        if(out){out.textContent=data.message||'Si existe una cuenta con ese correo, recibirás un enlace.';out.style.color='#067647'}
      }catch(e){if(out){out.textContent=e.message||'No hemos podido enviar el correo.';out.style.color='#b42318'}}
      setTimeout(()=>{btn.disabled=false;btn.textContent='Enviar enlace →'},60000);
    };
    const back=document.getElementById('cvpForgotBack');if(back)back.onclick=()=>location.reload();
    document.getElementById('cvpForgotEmail')?.focus();
  }
  function addLink(){
    const card=document.querySelector('#auth .card');if(!card||document.getElementById('cvpForgotLink'))return;
    const switchEl=card.querySelector('.switch');if(!switchEl)return;
    const link=document.createElement('button');link.id='cvpForgotLink';link.type='button';link.textContent='¿Has olvidado tu contraseña?';link.style.cssText='display:block;margin:13px auto 0;background:none;border:0;padding:0;color:#667085;font-size:12px;cursor:pointer;text-decoration:underline;text-underline-offset:2px';
    link.onclick=showForgot;switchEl.insertAdjacentElement('afterend',link);
  }
  function boot(){
    const params=new URLSearchParams(location.search);const token=params.get('token');const reset=params.get('reset');
    if(token&&reset==='1'){showReset(token);return}
    addLink();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  const observer=new MutationObserver(()=>{if(!document.getElementById('cvpForgotLink')&&!document.querySelector('#cvpResetPass')&&!document.querySelector('#cvpForgotEmail'))addLink()});
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
