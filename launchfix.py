# CVProfit launch hardening layer.
# Loaded from sitecustomize so it can improve the deployed app without
# rewriting the large generated index.html in place.
import app as app_module

# Commercial launch decision: give new users a full 7-day trial.
app_module.TRIAL_DAYS = 7
app = app_module.app

_BRAND_JS = r'''<script id="cvprofitLaunchFix">
(function(){
  'use strict';
  function textFix(s){
    return String(s||'')
      .replace(/CVGO/g,'CVProfit')
      .replace(/CVgo/g,'CVProfit')
      .replace(/3 DÍAS/g,'7 DÍAS')
      .replace(/3 días/g,'7 días');
  }
  function walk(node){
    if(!node)return;
    if(node.nodeType===Node.TEXT_NODE){
      if(node.nodeValue && (node.nodeValue.includes('CVGO') || node.nodeValue.includes('3 días') || node.nodeValue.includes('3 DÍAS'))){
        node.nodeValue=textFix(node.nodeValue);
      }
      return;
    }
    if(node.nodeType!==Node.ELEMENT_NODE || node.tagName==='SCRIPT' || node.tagName==='STYLE')return;
    for(const child of Array.from(node.childNodes))walk(child);
    for(const attr of ['title','aria-label','placeholder']){
      if(node.hasAttribute(attr)){
        const v=node.getAttribute(attr); if(v)node.setAttribute(attr,textFix(v));
      }
    }
  }
  function syncExperienceDates(){
    const items=Array.from(document.querySelectorAll('#experience .item'));
    if(!items.length)return;
    const sections=Array.from(document.querySelectorAll('#preview .cvsec'));
    const expSection=sections.find(function(s){
      const h=s.querySelector('h3');
      return h && /experiencia profesional/i.test(h.textContent||'');
    });
    if(!expSection)return;
    const jobs=Array.from(expSection.querySelectorAll('.cvjob'));
    items.forEach(function(item,i){
      const job=jobs[i]; if(!job)return;
      const from=(item.querySelector('.ef')?.value||'').trim();
      const to=(item.querySelector('.et')?.value||'').trim();
      const date=job.querySelector('.date');
      if(!date)return;
      const value=from && to ? from+' – '+to : (from||to);
      if(value)date.textContent=value;
    });
  }
  function hidePublicAuthForLoggedIn(){
    fetch('/api/me',{cache:'no-store',credentials:'same-origin'}).then(function(r){return r.json()}).then(function(u){
      if(!u || !u.logged_in)return;
      const auth=document.getElementById('auth');
      if(auth){
        auth.classList.add('hidden');
        auth.style.setProperty('display','none','important');
        const marketing=auth.querySelector('.cvgo-marketing');
        if(marketing)marketing.remove();
        const card=auth.querySelector('.card');
        if(card)card.remove();
      }
      const main=document.getElementById('main');
      if(main){main.classList.remove('hidden');main.style.setProperty('display','block','important');}
    }).catch(function(){});
  }
  function fix(){
    walk(document.body);
    if(document.title)document.title=textFix(document.title);
    syncExperienceDates();
    hidePublicAuthForLoggedIn();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fix,{once:true});
  else fix();
  window.addEventListener('load',fix);
  window.addEventListener('beforeprint',syncExperienceDates);
  const observer=new MutationObserver(function(mutations){
    let relevant=false;
    for(const m of mutations){if(m.addedNodes && m.addedNodes.length){relevant=true;break;}}
    if(relevant)hidePublicAuthForLoggedIn();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
})();
</script>'''

@app.after_request
def cvprofit_launch_hardening(response):
    try:
        if 'text/html' in (response.content_type or ''):
            html=response.get_data(as_text=True)
            html=html.replace('CVGO','CVProfit').replace('CVgo','CVProfit')
            html=html.replace('3 DÍAS','7 DÍAS').replace('3 días','7 días')
            if 'cvprofitLaunchFix' not in html and '</body>' in html:
                html=html.replace('</body>', _BRAND_JS+'</body>')
            response.set_data(html)
    except Exception:
        pass
    return response
