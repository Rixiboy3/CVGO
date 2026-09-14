import re
from flask import request

try:
    import app as app_module
except Exception:
    app_module = None

# CVProfit commercial/runtime hardening.
if app_module is not None:
    app_module.TRIAL_DAYS = 7


def _inject_runtime_hardening(html):
    if not isinstance(html, str):
        return html

    # Keep the public brand and commercial offer consistent even if an older
    # template/string is still present in the base application.
    html = html.replace("CVGO", "CVProfit")
    html = html.replace("3 DÍAS", "7 DÍAS")
    html = html.replace("3 días", "7 días")
    html = html.replace("3 dias", "7 dias")

    # Keep the legal navigation pointing to the actual routes.
    html = html.replace("/legal#condiciones", "/legal/condiciones")
    html = html.replace("/legal#privacidad", "/legal/privacidad")

    script = r'''<script id="cvprofit-runtime-fix">
(function(){
  'use strict';

  function syncExperienceDates(){
    try{
      document.querySelectorAll('.experience-item').forEach(function(item){
        var from=item.querySelector('.ef');
        var to=item.querySelector('.et');
        var date=item.querySelector('.date');
        if(date && (from || to)){
          var a=from && from.value ? from.value.trim() : '';
          var b=to && to.value ? to.value.trim() : '';
          if(a || b) date.textContent=(a||'') + (a||b ? ' – ' : '') + (b||'');
        }
      });
    }catch(e){}
  }

  function showDashboardForLoggedInUser(){
    fetch('/api/me',{cache:'no-store',credentials:'same-origin'})
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(u){
        if(!u || !u.logged_in) return;

        // The public landing/auth panel must NEVER remain visible for an
        // authenticated user. Hide it and reveal the application immediately.
        var auth=document.getElementById('auth');
        if(auth){
          auth.classList.add('hidden');
          auth.style.setProperty('display','none','important');
          auth.setAttribute('aria-hidden','true');
          var marketing=auth.querySelector('.cvgo-marketing');
          if(marketing) marketing.remove();
          var card=auth.querySelector('.card');
          if(card) card.remove();
        }

        var main=document.getElementById('main');
        if(main){
          main.classList.remove('hidden');
          main.style.setProperty('display','block','important');
          main.removeAttribute('aria-hidden');
        }
      })
      .catch(function(){});
  }

  function apply(){
    syncExperienceDates();
    showDashboardForLoggedInUser();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply);
  else apply();
  window.addEventListener('load',apply);
  window.addEventListener('pageshow',apply);
  document.addEventListener('input',syncExperienceDates);
  document.addEventListener('change',syncExperienceDates);
  document.addEventListener('beforeprint',syncExperienceDates);

  // Login/register code may replace the DOM after the initial page load.
  // Re-run only when the relevant auth/main nodes are added or changed.
  var lastAuth=null,lastMain=null;
  var observer=new MutationObserver(function(){
    var auth=document.getElementById('auth');
    var main=document.getElementById('main');
    if(auth!==lastAuth || main!==lastMain){
      lastAuth=auth; lastMain=main;
      showDashboardForLoggedInUser();
      syncExperienceDates();
    }
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
</script>'''

    if 'id="cvprofit-runtime-fix"' not in html:
        if '</body>' in html:
            html = html.replace('</body>', script + '</body>', 1)
        else:
            html += script
    return html


if app_module is not None:
    try:
        @app_module.app.after_request
        def cvprofit_launch_hardening(response):
            content_type = (response.headers.get('Content-Type') or '').lower()
            if 'text/html' in content_type:
                try:
                    body = response.get_data(as_text=True)
                    body = _inject_runtime_hardening(body)
                    response.set_data(body)
                except Exception:
                    pass
            return response
    except Exception:
        pass
