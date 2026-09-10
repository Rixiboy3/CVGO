(function(){
  const $=id=>document.getElementById(id);
  let me=null,billing=null;

  async function loadMe(){
    try{const r=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});me=await r.json();billing=me.billing||null;return me}catch(e){return null}
  }

  async function verifyPaidSession(){
    const params=new URLSearchParams(location.search);
    const sessionId=params.get('session_id');
    if(params.get('paid')!=='1'||!sessionId)return;
    let lastError='';
    for(let attempt=0;attempt<4;attempt++){
      try{
        const r=await fetch('/api/checkout-success?session_id='+encodeURIComponent(sessionId),{credentials:'same-origin',cache:'no-store'});
        const j=await r.json();
        if(r.ok&&j.ok){
          me=await loadMe();
          if(me?.pro){
            const clean=location.origin+location.pathname;
            history.replaceState({},'',clean);
            addControls();
            setTimeout(()=>{alert('✅ Pago confirmado. Tu suscripción CVProfit PRO ya está activa.');},100);
            return;
          }
          lastError='El pago se verificó, pero la cuenta todavía no aparece como PRO.';
        }else{
          lastError=j?.error||'No se ha podido verificar el pago.';
          if(j?.detail)lastError+=': '+j.detail;
        }
      }catch(e){lastError='Error de conexión al verificar el pago.';}
      await new Promise(resolve=>setTimeout(resolve,1500));
    }
    if(lastError)setTimeout(()=>alert('⚠️ El pago se ha realizado, pero CVProfit no ha podido activar PRO.\n\n'+lastError+'\n\nNo vuelvas a pagar. Envíame esta pantalla y revisamos la activación.'),100);
  }

  function addStyles(){
    if($('cvgoProStyles'))return;
    const s=document.createElement('style');s.id='cvgoProStyles';s.textContent=`
      #cvgoProBtn{margin-left:10px;border:0;background:#fff;color:#111827;border-radius:8px;padding:7px 11px;font-size:12px;font-weight:800;cursor:pointer}
      #cvgoProFloat{position:fixed;right:22px;bottom:22px;z-index:9998;border:0;border-radius:999px;background:#111827;color:#fff;padding:12px 17px;font-weight:800;box-shadow:0 8px 25px #0003;cursor:pointer}
      #cvgoProModal{position:fixed;inset:0;z-index:10000;background:#10182899;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto}
      #cvgoProModal .box{width:min(760px,100%);background:#fff;border-radius:22px;padding:30px;box-shadow:0 20px 60px #0004}
      #cvgoProModal h2{margin:0 0 8px;font-size:28px}.cvgoSub{font-size:14px;color:#475467;line-height:1.55}
      .cvgoPlans{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:20px 0}.cvgoPlan{position:relative;border:1px solid #d0d5dd;border-radius:16px;padding:20px;background:#fff}.cvgoPlan.best{border:2px solid #111827;padding:19px}.cvgoPlan .tag{position:absolute;right:12px;top:12px;background:#111827;color:#fff;border-radius:999px;padding:4px 8px;font-size:10px;font-weight:800}.cvgoPlan h3{margin:0 0 7px;font-size:16px}.cvgoPrice{font-size:30px;font-weight:900;margin:8px 0}.cvgoPrice small{font-size:13px;font-weight:500;color:#667085}.cvgoPlan p{font-size:12px;color:#667085;min-height:34px;margin:0 0 12px}.cvgoPlan button{width:100%;border:0;background:#111827;color:#fff;padding:12px;border-radius:9px;font-weight:800;cursor:pointer}.cvgoPlan button.alt{background:#fff;color:#111827;border:1px solid #d0d5dd}.cvgoPlan button:disabled{opacity:.55;cursor:not-allowed}
      .cvgoBenefits{margin:12px 0 18px;padding:0;list-style:none;line-height:1.8;font-size:13px}.cvgoBenefits li:before{content:'✓';font-weight:900;margin-right:8px}.cvgoTrial{background:#ecfdf3;color:#067647;border-radius:11px;padding:11px 13px;font-size:13px;font-weight:700;margin:15px 0}.cvgoLastDay{background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;border-radius:11px;padding:12px 13px;font-size:13px;font-weight:700;margin:15px 0}.cvgoExpired{background:#fef2f2;color:#b42318;border:1px solid #fecaca;border-radius:11px;padding:12px 13px;font-size:13px;font-weight:700;margin:15px 0}.cvgoManage{background:#f8fafc;border:1px solid #eaecf0;border-radius:12px;padding:14px;font-size:13px;color:#475467;margin:16px 0}.cvgoManage strong{color:#101828}.cvgoManage button{margin-top:10px;border:1px solid #d0d5dd;background:#fff;padding:9px 12px;border-radius:8px;font-weight:700;cursor:pointer}.cvgoCancelWarn{color:#b42318;font-size:12px;margin-top:7px}
      #cvgoProClose{width:100%;margin-top:8px;border:1px solid #d0d5dd;background:#fff;padding:11px;border-radius:10px;font-weight:700;cursor:pointer}
      #cvgoProMsg{font-size:13px;color:#b42318;margin-top:9px;min-height:18px}
      @media(max-width:650px){.cvgoPlans{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function planButton(id,plan,label){return `<button id="${id}" data-plan="${plan}">${label}</button>`}

  function openPro(){
    if($('cvgoProModal'))return;
    const trial=!!me?.trial_active;
    const expired=!trial&&!me?.pro;
    const active=!!billing?.active&&!trial;
    const plan=billing?.plan==='annual'?'Anual':'Mensual';
    const end=billing?.current_period_end?new Date(billing.current_period_end).toLocaleDateString('es-ES'):'';
    const days=Number(me?.trial_days_left||0);
    const d=document.createElement('div');d.id='cvgoProModal';
    d.innerHTML=`<div class="box">
      <div style="font-size:12px;color:#667085;font-weight:800">CVProfit</div>
      <h2>${trial?'🎁 Tu prueba gratuita está activa':active?'⭐ Tu suscripción PRO':'⭐ Continúa con CVProfit PRO'}</h2>
      <div class="cvgoSub">${trial?'Tienes acceso completo a CVProfit durante tu periodo gratuito. No se realizará ningún cobro durante la prueba.':active?'Tienes acceso completo a todas las funciones PRO.':'Activa PRO y continúa utilizando todas las herramientas de CVProfit sin límites.'}</div>
      ${trial&&days>1?`<div class="cvgoTrial">🎁 Te quedan ${days} días de prueba gratuita. Aprovecha el acceso completo y prepara tu próximo CV.</div>`:''}
      ${trial&&days===1?`<div class="cvgoLastDay">⚡ Tu prueba termina hoy. Puedes activar PRO al finalizar la prueba para continuar sin interrupciones.</div>`:''}
      ${expired?`<div class="cvgoExpired">🔒 Tu prueba gratuita ha terminado. Activa PRO para recuperar el acceso completo a CVProfit.</div>`:''}
      ${active?`<div class="cvgoManage"><strong>Plan ${plan}</strong>${end?` · Próxima fecha de renovación: ${end}`:''}<br><span>${billing.cancel_at_period_end?'Tu suscripción está programada para finalizar al terminar el periodo actual.':'Tu suscripción se renovará automáticamente.'}</span>${!billing.cancel_at_period_end?`<br><button id="cvgoCancel">Cancelar renovación</button>`:`<div class="cvgoCancelWarn">La renovación automática está cancelada.</div>`}</div>`:''}
      ${!active?`<div class="cvgoPlans">
        <div class="cvgoPlan"><h3>Mensual</h3><div class="cvgoPrice">9,99 € <small>/ mes</small></div><p>Flexibilidad total. Cancela cuando quieras.</p>${planButton('cvgoMonthly','monthly',trial?'Disponible al finalizar la prueba':'Continuar con 9,99 €/mes')}</div>
        <div class="cvgoPlan best"><span class="tag">MEJOR PRECIO</span><h3>Anual</h3><div class="cvgoPrice">59,99 € <small>/ año</small></div><p>Solo 5 € al mes. Ahorra 59,89 € frente al mensual.</p>${planButton('cvgoAnnual','annual',trial?'Disponible al finalizar la prueba':'Continuar con 59,99 €/año')}</div>
      </div>`:''}
      <ul class="cvgoBenefits"><li>CV ilimitados</li><li>Adaptación a ofertas con IA</li><li>Optimización ATS</li><li>Cartas de presentación</li><li>Simulador de entrevistas IA</li><li>Respuestas por voz y evaluación personalizada</li></ul>
      <div id="cvgoProMsg"></div><button id="cvgoProClose">Cerrar</button>
    </div>`;
    document.body.appendChild(d);
    $('cvgoProClose').onclick=()=>d.remove();
    d.onclick=e=>{if(e.target===d)d.remove()};

    ['cvgoMonthly','cvgoAnnual'].forEach(id=>{
      const b=$(id);if(!b)return;
      if(trial)b.disabled=true;
      b.onclick=async()=>{
        const chosen=b.dataset.plan,msg=$('cvgoProMsg');b.disabled=true;b.textContent='⏳ Preparando pago...';msg.textContent='';
        try{
          const r=await fetch('/api/create-checkout-v2',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({plan:chosen})});
          const j=await r.json();if(!r.ok)throw j;if(j.url){location.href=j.url;return}throw {error:'CHECKOUT_ERROR'}
        }catch(e){
          msg.textContent=e?.error==='STRIPE_ANNUAL_PRICE_NOT_CONFIGURED'?'El plan anual todavía no está configurado.':e?.error==='STRIPE_NOT_CONFIGURED'?'El pago todavía no está configurado.':'No se ha podido abrir el pago. Inténtalo de nuevo.';
          b.disabled=false;b.textContent=chosen==='annual'?'Continuar con 59,99 €/año':'Continuar con 9,99 €/mes';
        }
      };
    });

    const cancel=$('cvgoCancel');
    if(cancel)cancel.onclick=async()=>{
      if(!confirm('¿Quieres cancelar la renovación automática? Mantendrás PRO hasta el final del periodo ya pagado.'))return;
      cancel.disabled=true;cancel.textContent='Cancelando...';
      try{
        const r=await fetch('/api/cancel-subscription',{method:'POST',credentials:'same-origin'});const j=await r.json();if(!r.ok)throw j;
        d.remove();await loadMe();addControls();
      }catch(e){
        $('cvgoProMsg').textContent='No se ha podido cancelar la renovación. Inténtalo de nuevo.';cancel.disabled=false;cancel.textContent='Cancelar renovación';
      }
    };
  }

  function addControls(){
    if(!me?.logged_in)return;
    addStyles();
    const header=document.querySelector('header');
    if(header&&!$('cvgoProBtn')){const b=document.createElement('button');b.id='cvgoProBtn';b.textContent=me.trial_active?'🎁 Prueba activa':me.pro?'⭐ PRO activo':'⭐ Activar PRO';b.onclick=openPro;header.appendChild(b)}
    else if($('cvgoProBtn')){$('cvgoProBtn').textContent=me.trial_active?'🎁 Prueba activa':me.pro?'⭐ PRO activo':'⭐ Activar PRO'}
    const banner=$('trialBanner');
    if(banner){
      banner.style.cursor='pointer';
      banner.title='Ver planes CVProfit';
      if(me.trial_active){
        const days=Number(me.trial_days_left||0);
        banner.textContent=days===1?'⚡ Tu prueba termina hoy · Ver CVProfit PRO':`🎁 Tu prueba gratuita está activa · ${days} días restantes`;
      }else if(me.pro)banner.textContent='⭐ CVProfit PRO activo';
      else banner.textContent='🔒 Tu prueba gratuita ha terminado · Activa PRO para continuar';
      banner.onclick=openPro;
    }
    if(me.pro){const f=$('cvgoProFloat');if(f)f.remove();}
    else if(!$('cvgoProFloat')){const b=document.createElement('button');b.id='cvgoProFloat';b.textContent=me.trial_active?'⭐ Ver PRO':'⭐ Activar PRO';b.onclick=openPro;document.body.appendChild(b)}
  }

  async function init(){
    me=await loadMe();addControls();await verifyPaidSession();
    const oldAnalyze=window.analyze;
    if(typeof oldAnalyze==='function')window.analyze=async function(){if(me&&!me.pro){openPro();return}return oldAnalyze.apply(this,arguments)};
  }
  setTimeout(init,1000);
})();