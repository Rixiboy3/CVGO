import re
from flask import request

try:
    import app as app_module
except Exception:
    app_module = None

if app_module is not None:
    app_module.TRIAL_DAYS = 7


def _inject_runtime_hardening(html):
    if not isinstance(html, str):
        return html
    html = html.replace("CVGO", "CVProfit")
    html = re.sub(r"3\s+D[IÍ]AS", "7 DÍAS", html, flags=re.I)
    html = re.sub(r"3\s+d[ií]as", "7 días", html, flags=re.I)
    html = html.replace("/legal#condiciones", "/legal/condiciones")
    html = html.replace("/legal#privacidad", "/legal/privacidad")

    script = r'''<script id="cvprofit-runtime-fix">
(function(){
  'use strict';
  function syncExperienceDates(){
    try{
      document.querySelectorAll('.experience-item').forEach(function(item){
        var from=item.querySelector('.ef'),to=item.querySelector('.et'),date=item.querySelector('.date');
        if(date&&(from||to)){
          var a=from&&from.value?from.value.trim():''; var b=to&&to.value?to.value.trim():'';
          if(a||b) date.textContent=(a||'')+(a||b?' – ':'')+(b||'');
        }
      });
    }catch(e){}
  }
  function forceAuthenticatedView(){
    fetch('/api/me',{cache:'no-store',credentials:'same-origin'}).then(function(r){return r.ok?r.json():null}).then(function(u){
      if(!u||!u.logged_in)return;
      var auth=document.getElementById('auth');
      var main=document.getElementById('main');
      if(auth){
        auth.classList.add('hidden');
        auth.style.setProperty('display','none','important');
        auth.setAttribute('aria-hidden','true');
      }
      if(main){
        main.classList.remove('hidden');
        main.style.setProperty('display','block','important');
        main.removeAttribute('aria-hidden');
      }
    }).catch(function(){});
  }
  function apply(){syncExperienceDates();forceAuthenticatedView();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
  window.addEventListener('load',apply); window.addEventListener('pageshow',apply);
  document.addEventListener('input',syncExperienceDates); document.addEventListener('change',syncExperienceDates); document.addEventListener('beforeprint',syncExperienceDates);
  setTimeout(forceAuthenticatedView,250); setTimeout(forceAuthenticatedView,1000); setTimeout(forceAuthenticatedView,2500);
  new MutationObserver(function(){forceAuthenticatedView();syncExperienceDates()}).observe(document.documentElement,{childList:true,subtree:true});
})();
</script>'''
    if 'id="cvprofit-runtime-fix"' not in html:
        html = html.replace('</body>', script+'</body>', 1) if '</body>' in html else html+script
    return html

if app_module is not None:
    try:
        @app_module.app.after_request
        def cvprofit_launch_hardening(response):
            content_type=(response.headers.get('Content-Type') or '').lower()
            if 'text/html' in content_type:
                try: response.set_data(_inject_runtime_hardening(response.get_data(as_text=True)))
                except Exception: pass
            return response
    except Exception:
        pass
