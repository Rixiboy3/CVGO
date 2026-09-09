(function(){
  function applyAuthLabels(){
    if(typeof authMode === 'undefined') return;
    const title=document.getElementById('authTitle');
    const text=document.getElementById('authText');
    const btn=document.getElementById('authBtn');
    const switchText=document.getElementById('switchText');
    const switchBtn=document.getElementById('switchBtn');
    const trial=document.querySelector('#auth .trial');
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

  function init(){
    if(typeof authMode !== 'undefined'){
      authMode='login';
      applyAuthLabels();
      const originalToggle=window.toggleAuth;
      if(typeof originalToggle==='function' && !originalToggle.__cvgoWrapped){
        function wrappedToggle(){
          originalToggle();
          applyAuthLabels();
        }
        wrappedToggle.__cvgoWrapped=true;
        window.toggleAuth=wrappedToggle;
      }
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
