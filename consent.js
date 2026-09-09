(function(){
  function init(){
    const auth=document.getElementById('auth');
    const card=auth&&auth.querySelector('.card');
    if(!card||document.getElementById('cvgoConsent'))return;
    const row=document.createElement('label');
    row.id='cvgoConsent';
    row.style.cssText='display:flex;gap:9px;align-items:flex-start;margin:4px 0 15px;font-size:11px;line-height:1.45;color:#667085;font-weight:500;cursor:pointer';
    row.innerHTML='<input id="cvgoConsentCheck" type="checkbox" style="margin-top:2px;width:15px;height:15px;flex:0 0 auto"><span>Acepto las <a href="/legal#condiciones" target="_blank" rel="noopener">Condiciones de uso y contratación</a> y he leído la <a href="/legal#privacidad" target="_blank" rel="noopener">Política de privacidad</a>.</span>';
    const btn=document.getElementById('authBtn');
    if(btn)btn.parentNode.insertBefore(row,btn);
    const original=window.submitAuth;
    if(typeof original==='function'&&!original.__cvgoConsentWrapped){
      async function wrapped(){
        if(typeof authMode!=='undefined'&&authMode==='register'){
          const check=document.getElementById('cvgoConsentCheck');
          const msg=document.getElementById('authMsg');
          if(!check||!check.checked){if(msg)msg.textContent='Debes aceptar las condiciones y la política de privacidad para crear la cuenta.';return}
        }
        return original.apply(this,arguments);
      }
      wrapped.__cvgoConsentWrapped=true;
      window.submitAuth=wrapped;
    }
    const toggle=window.toggleAuth;
    if(typeof toggle==='function'&&!toggle.__cvgoConsentToggleWrapped){
      function wrappedToggle(){toggle.apply(this,arguments);setTimeout(()=>{const check=document.getElementById('cvgoConsentCheck');const visible=typeof authMode!=='undefined'&&authMode==='register';if(check){check.checked=false;check.parentElement.style.display=visible?'flex':'none'}},0)}
      wrappedToggle.__cvgoConsentToggleWrapped=true;
      window.toggleAuth=wrappedToggle;
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();