(function(){
  'use strict';

  const MEASUREMENT_ID = 'G-D56TP3LVL2';
  const CONSENT_KEY = 'cvprofit_analytics_consent';
  let initialized = false;

  function loadGoogleTag(){
    if(initialized) return;
    initialized = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      wait_for_update: 500
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(MEASUREMENT_ID);
    document.head.appendChild(script);

    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID, {
      send_page_view: true,
      anonymize_ip: true
    });
  }

  function grant(){
    try{ localStorage.setItem(CONSENT_KEY, 'granted'); }catch(e){}
    loadGoogleTag();
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    hideBanner();
  }

  function deny(){
    try{ localStorage.setItem(CONSENT_KEY, 'denied'); }catch(e){}
    hideBanner();
  }

  function hideBanner(){
    const banner = document.getElementById('cvgoAnalyticsConsent');
    if(banner) banner.remove();
  }

  function showBanner(){
    if(document.getElementById('cvgoAnalyticsConsent')) return;
    const style = document.createElement('style');
    style.id = 'cvgoAnalyticsConsentStyle';
    style.textContent = '#cvgoAnalyticsConsent{position:fixed;left:18px;right:18px;bottom:18px;z-index:2147483000;font-family:Arial,sans-serif}.cvgo-consent-box{max-width:980px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.16);padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:20px}.cvgo-consent-box strong{display:block;font-size:16px;color:#111827;margin-bottom:5px}.cvgo-consent-box p{margin:0;color:#4b5563;font-size:13px;line-height:1.45}.cvgo-consent-actions{display:flex;gap:9px;flex-shrink:0}.cvgo-consent-actions button{border:1px solid #d1d5db;background:#fff;color:#374151;border-radius:9px;padding:10px 15px;font-weight:600;cursor:pointer}.cvgo-consent-actions button[data-consent="accept"]{background:#111827;border-color:#111827;color:#fff}@media(max-width:640px){.cvgo-consent-box{display:block;padding:16px}.cvgo-consent-actions{margin-top:13px}.cvgo-consent-actions button{flex:1}}';
    document.head.appendChild(style);

    const banner = document.createElement('div');
    banner.id = 'cvgoAnalyticsConsent';
    banner.innerHTML = '<div class="cvgo-consent-box"><div><strong>Privacidad y cookies</strong><p>Usamos cookies de analítica para saber cómo se utiliza CVProfit y mejorar la web. Puedes aceptar o rechazar su uso.</p></div><div class="cvgo-consent-actions"><button type="button" data-consent="deny">Rechazar</button><button type="button" data-consent="accept">Aceptar</button></div></div>';
    document.body.appendChild(banner);
    banner.addEventListener('click', function(e){
      const action = e.target.closest('[data-consent]');
      if(!action) return;
      if(action.dataset.consent === 'accept') grant();
      else deny();
    });
  }

  function hasConsent(){
    try{return localStorage.getItem(CONSENT_KEY) === 'granted';}catch(e){return false;}
  }

  function getConsent(){
    try{return localStorage.getItem(CONSENT_KEY);}catch(e){return 'denied';}
  }

  function initConsent(){
    const consent = getConsent();
    if(consent === 'granted') loadGoogleTag();
    else if(consent !== 'denied') showBanner();
  }

  function track(name, params){
    if(!hasConsent()) return;
    loadGoogleTag();
    window.gtag('event', name, Object.assign({app_name:'CVProfit'}, params || {}));
  }

  function cleanText(el){
    return ((el && (el.innerText || el.textContent)) || '').replace(/\s+/g,' ').trim().toLowerCase();
  }

  function classifyClick(el){
    const text = cleanText(el);
    const id = String(el.id || '').toLowerCase();
    const cls = String(el.className || '').toLowerCase();
    const label = (text + ' ' + id + ' ' + cls).trim();

    if(/empezar gratis|prueba gratis|probar gratis|crear mi cv|crear cv/.test(label))
      return ['landing_cta_click', {cta: 'start_free'}];
    if(/registr|crear cuenta|sign up/.test(label))
      return ['sign_up_start', {method: 'site'}];
    if(/iniciar sesi[oó]n|acceder|entrar|login/.test(label))
      return ['login_start', {method: 'site'}];
    if(/carta de presentaci[oó]n|carta/.test(label))
      return ['tool_open', {tool: 'cover_letter'}];
    if(/simulador de entrevista|entrevista/.test(label))
      return ['tool_open', {tool: 'interview'}];
    if(/analizar oferta|analizar oferta de empleo|oferta/.test(label))
      return ['tool_open', {tool: 'offer_analysis'}];
    if(/mi cv|curr[ií]culum|cv/.test(label) && !/descargar|pdf|guardar/.test(label))
      return ['tool_open', {tool: 'cv'}];
    if(/guardar cv|guardar/.test(label))
      return ['cv_save_click', {}];
    if(/descargar.*pdf|pdf/.test(label))
      return ['cv_pdf_click', {}];
    if(/mensual|9[,.]99/.test(label))
      return ['checkout_start', {plan: 'monthly'}];
    if(/anual|59[,.]99|5 ?€ ?\/ ?mes/.test(label))
      return ['checkout_start', {plan: 'annual'}];
    if(/gestionar pro|activar pro|hazte pro|pro/.test(label) && /button|btn|cta/.test(label))
      return ['pro_cta_click', {}];
    return null;
  }

  function bindClicks(){
    document.addEventListener('click', function(e){
      const el = e.target.closest('button, a, [role="button"]');
      if(!el) return;
      const result = classifyClick(el);
      if(result) track(result[0], result[1]);
    }, true);
  }

  function bindFetch(){
    if(!window.fetch || window.__cvgoAnalyticsFetch) return;
    window.__cvgoAnalyticsFetch = true;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = function(input, init){
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      const promise = nativeFetch(input, init);
      return promise.then(function(response){
        if(method === 'POST' && /\/api\/register(?:\?|$)/.test(url) && response.ok)
          track('sign_up_complete', {method:'site'});
        if(method === 'POST' && /\/api\/login(?:\?|$)/.test(url) && response.ok)
          track('login_complete', {method:'site'});
        if(method === 'POST' && /\/api\/cv(?:\?|$)/.test(url) && response.ok)
          track('cv_saved', {});
        if(method === 'POST' && /\/api\/create-checkout(?:-v2)?(?:\?|$)/.test(url) && response.ok)
          track('checkout_session_created', {});
        return response;
      }).catch(function(err){ throw err; });
    };
  }

  function bindAppState(){
    let lastUser = null;
    const check = function(){
      fetch('/api/me', {credentials:'same-origin'}).then(function(r){return r.ok ? r.json() : null;}).then(function(data){
        if(!data || !data.logged_in) return;
        const key = String(data.email || 'logged_in');
        if(lastUser === key) return;
        lastUser = key;
        track('trial_or_pro_session', {status: data.pro ? 'pro' : (data.trial_active ? 'trial' : 'expired')});
      }).catch(function(){});
    };
    setTimeout(check, 1200);
  }

  function checkPurchase(){
    try{
      const params = new URLSearchParams(location.search);
      if(params.get('paid') === '1') track('purchase_success', {});
    }catch(e){}
  }

  function boot(){
    initConsent();
    bindClicks();
    bindFetch();
    bindAppState();
    checkPurchase();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
