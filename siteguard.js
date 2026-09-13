(function(){
'use strict';
const KEY='cvprofit_session_guard_v2';
function removePublic(me){
 if(!me||!me.logged_in)return;
 ['cvgoLanding','cvgoAuthPitch'].forEach(function(id){const e=document.getElementById(id);if(e)e.remove()});
 const auth=document.getElementById('auth');if(auth){auth.classList.add('hidden');auth.style.setProperty('display','none','important')}
 const main=document.getElementById('main');if(main){main.classList.remove('hidden');main.style.setProperty('display','block','important')}
 const email=document.getElementById('dashUserEmail');if(email)email.textContent=me.email||'Tu cuenta CVProfit';
 const b=document.getElementById('trialBanner');if(!b)return;
 if(me.pro){const end=me.billing&&me.billing.current_period_end;let d=end?new Date(end):null;b.textContent=me.billing&&me.billing.cancel_at_period_end?'⭐ CVProfit PRO activo · Finaliza el '+(d&&!Number.isNaN(d.getTime())?d.toLocaleDateString('es-ES'):'final del periodo'):'⭐ CVProfit PRO activo'+(d&&!Number.isNaN(d.getTime())?' · Próxima renovación: '+d.toLocaleDateString('es-ES'):'')}
 else if(me.trial_active){const days=Number(me.trial_days_left||0);b.textContent=days===1?'⚡ Tu prueba termina hoy · Ver PRO':'🎁 Prueba gratuita activa · '+days+' días restantes'}
 else b.textContent='🔒 Tu prueba ha terminado · Activar PRO';
}
function session(){
 function check(){fetch('/api/me',{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(me){if(!me||!me.logged_in)return;removePublic(me);if(!window.__cvgoSessionObserver){window.__cvgoSessionObserver=new MutationObserver(function(){removePublic(me)});window.__cvgoSessionObserver.observe(document.body,{childList:true,subtree:true})}}).catch(function(){})}
 check();setTimeout(check,900);setTimeout(check,2200);
}
function boot(){session()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
