(function(){
  const $=id=>document.getElementById(id);
  function removePublicLanding(){
    const landing=$('cvgoLanding');
    const pitch=$('cvgoAuthPitch');
    if(landing)landing.remove();
    if(pitch)pitch.remove();
    const auth=$('auth');
    if(auth)auth.classList.add('hidden');
  }
  function addStyles(){
    if($('cvprofitManageStyles')) return;
    const style=document.createElement('style');style.id='cvprofitManageStyles';
    style.textContent=`#cvprofitManageBtn{position:fixed;right:150px;top:10px;z-index:9999;border:0;border-radius:9px;background:#111827;color:#fff;padding:9px 13px;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 3px 12px #0002}#cvprofitActivateBtn{position:fixed;right:22px;bottom:22px;z-index:9998;border:0;border-radius:999px;background:#111827;color:#fff;padding:12px 17px;font-weight:800;box-shadow:0 8px 25px #0003;cursor:pointer}#cvprofitManageModal{position:fixed;inset:0;z-index:10001;background:#10182899;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto}#cvprofitManageModal .box{width:min(700px,100%);background:#fff;border-radius:20px;padding:26px;box-shadow:0 20px 60px #0004}#cvprofitManageModal h2{margin:0 0 10px;color:#101828}#cvprofitManageModal .info{background:#f8fafc;border:1px solid #eaecf0;border-radius:12px;padding:15px;color:#475467;font-size:14px;line-height:1.6;margin:16px 0}.cvprofitPlans{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:18px 0}.cvprofitPlan{border:1px solid #d0d5dd;border-radius:15px;padding:18px}.cvprofitPlan.best{border:2px solid #111827;padding:17px}.cvprofitPlan h3{margin:0 0 6px}.cvprofitPrice{font-size:28px;font-weight:900;margin:7px 0}.cvprofitPlan p{font-size:12px;color:#667085;min-height:32px}.cvprofitPlan button{width:100%;border:0;border-radius:9px;background:#111827;color:#fff;padding:11px;font-weight:800;cursor:pointer}.cvprofitPlan button:disabled{opacity:.55;cursor:not-allowed}#cvprofitCancel{border:1px solid #d92d20;background:#fff;color:#b42318;border-radius:9px;padding:10px 14px;font-weight:800;cursor:pointer}#cvprofitClose{border:1px solid #d0d5dd;background:#fff;color:#344054;border-radius:9px;padding:10px 14px;font-weight:700;cursor:pointer;margin-left:8px}@media(max-width:650px){.cvprofitPlans{grid-template-columns:1fr}}`;document.head.appendChild(style);
  }
  async function checkout(plan,btn,msg){
    btn.disabled=true;btn.textContent='Preparando pago...';
    try{const r=await fetch('/api/create-checkout-v2',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({plan})});const j=await r.json();if(!r.ok)throw j;if(j.url){location.href=j.url;return}throw {error:'CHECKOUT_ERROR'};}catch(e){msg.textContent=e?.error==='STRIPE_ANNUAL_PRICE_NOT_CONFIGURED'?'El plan anual todavía no está configurado.':'No se ha podido abrir el pago. Inténtalo de nuevo.';btn.disabled=false;btn.textContent=plan==='annual'?'Activar 59,99 €/año':'Activar 9,99 €/mes';}
  }
  function formatProEnd(me){
    const raw=me?.billing?.current_period_end;
    if(!raw)return '';
    const d=new Date(raw);
    return Number.isNaN(d.getTime())?'':d.toLocaleDateString('es-ES');
  }
  function openActivation(me){
    if($('cvprofitManageModal'))return;
    const trial=!!me?.trial_active;const d=document.createElement('div');d.id='cvprofitManageModal';
    d.innerHTML=`<div class="box"><h2>⭐ Continúa con CVProfit PRO</h2><div class="info">${trial?'Tu prueba gratuita sigue activa. Al finalizar podrás activar PRO.':'Tu acceso actual ha finalizado. <strong>Ya puedes activar PRO ahora.</strong>'}</div><div class="cvprofitPlans"><div class="cvprofitPlan"><h3>Mensual</h3><div class="cvprofitPrice">9,99 € <small>/ mes</small></div><p>Flexibilidad total. Cancela cuando quieras.</p><button id="cvprofitMonthly">${trial?'Disponible al finalizar la prueba':'Activar 9,99 €/mes'}</button></div><div class="cvprofitPlan best"><h3>Anual</h3><div class="cvprofitPrice">59,99 € <small>/ año</small></div><p>Solo 5 € al mes. Ahorra 59,89 € frente al mensual.</p><button id="cvprofitAnnual">${trial?'Disponible al finalizar la prueba':'Activar 59,99 €/año'}</button></div></div><div id="cvprofitMsg" style="color:#b42318;font-size:13px;min-height:18px"></div><button id="cvprofitClose">Cerrar</button></div>`;
    document.body.appendChild(d);$('cvprofitClose').onclick=()=>d.remove();d.onclick=e=>{if(e.target===d)d.remove()};
    if(trial){$('cvprofitMonthly').disabled=true;$('cvprofitAnnual').disabled=true;}else{$('cvprofitMonthly').onclick=()=>checkout('monthly',$('cvprofitMonthly'),$('cvprofitMsg'));$('cvprofitAnnual').onclick=()=>checkout('annual',$('cvprofitAnnual'),$('cvprofitMsg'));}
  }
  function openManage(me){
    if($('cvprofitManageModal'))return;const billing=me.billing||{};const plan=billing.plan==='annual'?'Anual':'Mensual';const end=formatProEnd(me);const cancelled=!!billing.cancel_at_period_end;const m=document.createElement('div');m.id='cvprofitManageModal';
    const periodText=end?(cancelled?`<br><strong>Fecha de caducidad: ${end}</strong>`:`<br><strong>Próxima renovación: ${end}</strong>`):'';
    m.innerHTML=`<div class="box"><h2>⭐ Tu suscripción PRO</h2><div class="info"><strong>Plan ${plan}</strong>${periodText}<br>${cancelled?'La renovación automática está cancelada. Mantendrás PRO hasta la fecha de caducidad indicada.':'Tu suscripción se renovará automáticamente en la fecha indicada.'}</div>${cancelled?'':'<button id="cvprofitCancel">Cancelar renovación</button>'}<button id="cvprofitClose">Cerrar</button><div id="cvprofitMsg" style="margin-top:12px;color:#b42318;font-size:13px"></div></div>`;
    document.body.appendChild(m);$('cvprofitClose').onclick=()=>m.remove();m.onclick=e=>{if(e.target===m)m.remove()};const c=$('cvprofitCancel');
    if(c)c.onclick=async()=>{if(!confirm('¿Quieres cancelar la renovación automática? Mantendrás PRO hasta el final del periodo ya pagado.'))return;c.disabled=true;c.textContent='Cancelando...';try{const r=await fetch('/api/cancel-subscription',{method:'POST',credentials:'same-origin'});const j=await r.json();if(!r.ok)throw j;m.remove();location.reload();}catch(e){c.disabled=false;c.textContent='Cancelar renovación';$('cvprofitMsg').textContent='No se ha podido cancelar la renovación. Inténtalo de nuevo.'}};
  }
  async function init(){
    try{const r=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});const me=await r.json();if(!me?.logged_in)return;removePublicLanding();addStyles();
      const banner=$('trialBanner');
      if(banner){banner.style.cursor='pointer';banner.title=me.pro?'Gestionar PRO':'Activar PRO';if(me.trial_active){const days=Number(me.trial_days_left||0);banner.textContent=days===1?'⚡ Tu prueba termina hoy · Ver PRO':`🎁 Prueba gratuita activa · ${days} días restantes`;}else if(me.pro){const end=formatProEnd(me);banner.textContent=billingCancelled(me)?`⭐ CVProfit PRO activo · Finaliza el ${end||'final del periodo'}`:end?`⭐ CVProfit PRO activo · Próxima renovación: ${end}`:'⭐ CVProfit PRO activo';}else{banner.textContent='🔒 Tu acceso actual ha finalizado · Ya puedes activar PRO';}banner.onclick=()=>{if(me.pro)openManage(me);else openActivation(me);};}
      if(me.pro){if($('cvprofitActivateBtn'))$('cvprofitActivateBtn').remove();if(!$('cvprofitManageBtn')){const b=document.createElement('button');b.id='cvprofitManageBtn';b.textContent='⚙ Gestionar PRO';b.onclick=()=>openManage(me);document.body.appendChild(b);}}else if(!$('cvprofitActivateBtn')){const b=document.createElement('button');b.id='cvprofitActivateBtn';b.textContent='⭐ Activar PRO';b.onclick=()=>openActivation(me);document.body.appendChild(b);}
    }catch(e){}
  }
  function billingCancelled(me){return !!me?.billing?.cancel_at_period_end;}
  setTimeout(init,1600);
})();