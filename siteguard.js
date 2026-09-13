(function(){
  'use strict';

  const CONSENT_KEY = 'cvprofit_cookie_consent_v3';
  const OLD_ANALYTICS_KEY = 'cvprofit_analytics_consent_v2';

  function setConsent(value){
    try{
      localStorage.setItem(CONSENT_KEY,value);
      localStorage.setItem(OLD_ANALYTICS_KEY,value);
    }catch(e){}
  }

  function loadAnalytics(){
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){window.dataLayer.push(arguments)};
    const hasTag = !!document.querySelector('script[src*="googletagmanager.com/gtag/js"]');
    window.gtag('consent','update',{
      analytics_storage:'granted',
      ad_storage:'denied',
      ad_user_data:'denied',
      ad_personalization:'denied'
    });
    if(!hasTag){
      const s=document.createElement('script');
      s.async=true;
      s.src='https://www.googletagmanager.com/gtag/js?id=G-D56TP3LVL2';
      document.head.appendChild(s);
      window.gtag('js',new Date());
      window.gtag('config','G-D56TP3LVL2',{send_page_view:true,anonymize_ip:true});
    }
  }

  function hideConsent(){
    const b=document.getElementById('cvgoCookieBanner');
    if(b)b.remove();
  }

  function showConsent(){
    if(document.getElementById('cvgoCookieBanner'))return;
    const style=document.createElement('style');
    style.id='cvgoCookieBannerStyle';
    style.textContent='#cvgoCookieBanner{position:fixed;left:18px;right:18px;bottom:18px;z-index:2147483647;font-family:Inter,Arial,sans-serif}.cvgo-cookie-box{max-width:980px;margin:0 auto;background:#fff;color:#101828;border:1px solid #d0d5dd;border-radius:16px;box-shadow:0 14px 45px rgba(16,24,40,.2);padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:20px}.cvgo-cookie-box strong{display:block;font-size:15px;margin-bottom:5px}.cvgo-cookie-box p{margin:0;color:#475467;font-size:12px;line-height:1.5}.cvgo-cookie-actions{display:flex;gap:9px;flex:0 0 auto}.cvgo-cookie-actions button{border:1px solid #d0d5dd;background:#fff;color:#344054;border-radius:9px;padding:10px 16px;font-size:12px;font-weight:800;cursor:pointer}.cvgo-cookie-actions .accept{background:#111827;color:#fff;border-color:#111827}@media(max-width:650px){#cvgoCookieBanner{left:10px;right:10px;bottom:10px}.cvgo-cookie-box{display:block;padding:16px}.cvgo-cookie-actions{margin-top:12px}.cvgo-cookie-actions button{width:100%}.cvgo-cookie-actions button+button{margin-top:7px}}';
    document.head.appendChild(style);
    const b=document.createElement('div');
    b.id='cvgoCookieBanner';
    b.innerHTML='<div class="cvgo-cookie-box"><div><strong>🍪 Privacidad y cookies</strong><p>Usamos cookies de analítica para conocer cómo se utiliza CVProfit y mejorar la experiencia. Puedes aceptar o rechazar las cookies de analítica.</p></div><div class="cvgo-cookie-actions"><button type="button" class="reject">Rechazar</button><button type="button" class="accept">Aceptar</button></div></div>';
    document.body.appendChild(b);
    b.querySelector('.accept').onclick=function(){setConsent('granted');loadAnalytics();hideConsent()};
    b.querySelector('.reject').onclick=function(){setConsent('denied');hideConsent()};
  }

  function initConsent(){
    let value=null;
    try{value=localStorage.getItem(CONSENT_KEY)}catch(e){}
    if(value==='granted')return;
    if(value==='denied')return;
    showConsent();
  }

  function removePublicForLoggedUser(me){
    if(!me||!me.logged_in)return;
    ['cvgoLanding','cvgoAuthPitch'].forEach(function(id){
      const el=document.getElementById(id);if(el)el.remove();
    });
    const auth=document.getElementById('auth');
    if(auth){auth.classList.add('hidden');auth.style.setProperty('display','none','important')}
    const main=document.getElementById('main');
    if(main){main.classList.remove('hidden');main.style.setProperty('display','block','important')}
    const email=document.getElementById('dashUserEmail');
    if(email)email.textContent=me.email||'Tu cuenta CVProfit';
    const banner=document.getElementById('trialBanner');
    if(banner){
      if(me.pro){
        const end=me.billing&&me.billing.current_period_end;
        const d=end?new Date(end):null;
        banner.textContent=me.billing&&me.billing.cancel_at_period_end
          ? '⭐ CVProfit PRO activo · Finaliza el '+(d&&!Number.isNaN(d.getTime())?d.toLocaleDateString('es-ES'):'final del periodo')
          : '⭐ CVProfit PRO activo'+(d&&!Number.isNaN(d.getTime())?' · Próxima renovación: '+d.toLocaleDateString('es-ES'):'');
      }else if(me.trial_active){
        const days=Number(me.trial_days_left||0);
        banner.textContent=days===1?'⚡ Tu prueba termina hoy · Ver PRO':'🎁 Prueba gratuita activa · '+days+' días restantes';
      }else{
        banner.textContent='🔒 Tu prueba ha terminado · Activar PRO';
      }
    }
  }

  function initSession(){
    let observer;
    function apply(me){
      if(!me||!me.logged_in)return;
      removePublicForLoggedUser(me);
      if(!observer){
        observer=new MutationObserver(function(){removePublicForLoggedUser(me)});
        observer.observe(document.body,{childList:true,subtree:true});
      }
    }
    fetch('/api/me',{credentials:'same-origin',cache:'no-store'})
      .then(function(r){return r.ok?r.json():null})
      .then(apply).catch(function(){});
    setTimeout(function(){
      fetch('/api/me',{credentials:'same-origin',cache:'no-store'})
        .then(function(r){return r.ok?r.json():null})
        .then(apply).catch(function(){});
    },1800);
  }

  function boot(){initConsent();initSession()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
