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
  function styleContinueButtons(){
    try{
      document.querySelectorAll('button').forEach(function(button){
        var text=(button.textContent||'').trim();
        if(!/^Continuar(?:\s|$)/i.test(text))return;
        button.classList.add('cvprofit-modern-continue');
        button.style.setProperty('appearance','none','important');
        button.style.setProperty('-webkit-appearance','none','important');
        button.style.setProperty('display','inline-flex','important');
        button.style.setProperty('align-items','center','important');
        button.style.setProperty('justify-content','center','important');
        button.style.setProperty('gap','7px','important');
        button.style.setProperty('min-height','42px','important');
        button.style.setProperty('padding','10px 18px','important');
        button.style.setProperty('border','1px solid #1d4ed8','important');
        button.style.setProperty('border-radius','11px','important');
        button.style.setProperty('background','linear-gradient(135deg,#2563eb,#1747c8)','important');
        button.style.setProperty('color','#fff','important');
        button.style.setProperty('font','800 14px/1.2 Inter,Arial,sans-serif','important');
        button.style.setProperty('cursor','pointer','important');
        button.style.setProperty('box-shadow','0 7px 18px rgba(37,99,235,.20)','important');
        button.style.setProperty('transition','transform .18s ease,box-shadow .18s ease,filter .18s ease','important');
        if(!button.dataset.cvprofitContinueBound){
          button.dataset.cvprofitContinueBound='1';
          button.addEventListener('mouseenter',function(){button.style.setProperty('transform','translateY(-1px)','important');button.style.setProperty('box-shadow','0 10px 22px rgba(37,99,235,.26)','important');button.style.setProperty('filter','brightness(1.03)','important')});
          button.addEventListener('mouseleave',function(){button.style.setProperty('transform','translateY(0)','important');button.style.setProperty('box-shadow','0 7px 18px rgba(37,99,235,.20)','important');button.style.setProperty('filter','none','important')});
          button.addEventListener('focus',function(){button.style.setProperty('outline','none','important');button.style.setProperty('box-shadow','0 0 0 4px rgba(37,99,235,.16),0 7px 18px rgba(37,99,235,.20)','important')});
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
  function apply(){syncExperienceDates();styleContinueButtons();forceAuthenticatedView();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
  window.addEventListener('load',apply); window.addEventListener('pageshow',apply);
  document.addEventListener('input',syncExperienceDates); document.addEventListener('change',syncExperienceDates); document.addEventListener('beforeprint',syncExperienceDates);
  setTimeout(forceAuthenticatedView,250); setTimeout(forceAuthenticatedView,1000); setTimeout(forceAuthenticatedView,2500);
  setTimeout(styleContinueButtons,150); setTimeout(styleContinueButtons,500); setTimeout(styleContinueButtons,1200);
  new MutationObserver(function(){forceAuthenticatedView();syncExperienceDates();styleContinueButtons()}).observe(document.documentElement,{childList:true,subtree:true});
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
