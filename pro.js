(function(){
  const $=id=>document.getElementById(id);
  let me=null;

  async function loadMe(){
    try{const r=await fetch('/api/me',{credentials:'same-origin'});me=await r.json();return me}catch(e){return null}
  }

  function addStyles(){
    if($('cvgoProStyles'))return;
    const s=document.createElement('style');s.id='cvgoProStyles';s.textContent=`
      #cvgoProBtn{margin-left:10px;border:0;background:#fff;color:#111827;border-radius:8px;padding:7px 11px;font-size:12px;font-weight:800;cursor:pointer}
      #cvgoProFloat{position:fixed;right:22px;bottom:22px;z-index:9998;border:0;border-radius:999px;background:#111827;color:#fff;padding:12px 17px;font-weight:800;box-shadow:0 8px 25px #0003;cursor:pointer}
      #cvgoProModal{position:fixed;inset:0;z-index:10000;background:#10182899;display:flex;align-items:center;justify-content:center;padding:20px}
      #cvgoProModal .box{width:min(440px,100%);background:#fff;border-radius:18px;padding:26px;box-shadow:0 20px 60px #0004}
      #cvgoProModal h2{margin:0 0 6px;font-size:25px}.cvgoPrice{font-size:32px;font-weight:900;margin:15px 0}.cvgoPrice small{font-size:14px;font-weight:500;color:#667085}
      .cvgoBenefits{margin:15px 0;padding:0;list-style:none;line-height:1.8;font-size:14px}.cvgoBenefits li:before{content:'✓';font-weight:900;margin-right:8px}
      #cvgoProCheckout{width:100%;border:0;background:#111827;color:#fff;padding:13px;border-radius:10px;font-weight:800;cursor:pointer}
      #cvgoProClose{width:100%;margin-top:8px;border:1px solid #d0d5dd;background:#fff;padding:11px;border-radius:10px;font-weight:700;cursor:pointer}
      #cvgoProMsg{font-size:13px;color:#b42318;margin-top:9px;min-height:18px}
    `;document.head.appendChild(s);
  }

  function openPro(){
    if($('cvgoProModal'))return;
    const trial=me?.trial_active;
    const title=trial?'Reserva tu acceso PRO':'Activa CVGO PRO';
    const subtitle=trial?'Tu prueba gratuita continúa sin coste. Al finalizar podrás mantener todas las funciones con PRO.':'Tu prueba gratuita ha terminado. Continúa usando CVGO sin límites.';
    const d=document.createElement('div');d.id='cvgoProModal';d.innerHTML=`<div class="box">
      <div style="font-size:12px;color:#667085;font-weight:800">CVGO</div>
      <h2>⭐ ${title}</h2><div style="font-size:14px;color:#475467;line-height:1.5">${subtitle}</div>
      <div class="cvgoPrice">9,99 € <small>/ mes</small></div>
      <ul class="cvgoBenefits"><li>CV ilimitados</li><li>Adaptación a ofertas con IA</li><li>Optimización ATS</li><li>Cartas de presentación</li><li>Simulador de entrevistas IA</li><li>Respuestas por voz y evaluación personalizada</li></ul>
      <button id="cvgoProCheckout">Activar PRO por 9,99 €/mes</button>
      <div id="cvgoProMsg"></div><button id="cvgoProClose">Ahora no</button>
    </div>`;
    document.body.appendChild(d);
    $('cvgoProClose').onclick=()=>d.remove();
    d.onclick=e=>{if(e.target===d)d.remove()};
    $('cvgoProCheckout').onclick=async()=>{
      const b=$('cvgoProCheckout'),msg=$('cvgoProMsg');b.disabled=true;b.textContent='⏳ Preparando pago...';msg.textContent='';
      try{const r=await fetch('/api/create-checkout',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin'});const j=await r.json();if(!r.ok)throw j;if(j.url){location.href=j.url;return}throw {error:'CHECKOUT_ERROR'}}catch(e){msg.textContent=e?.error==='STRIPE_NOT_CONFIGURED'?'El pago todavía no está configurado.':'No se ha podido abrir el pago. Inténtalo de nuevo.';b.disabled=false;b.textContent='Activar PRO por 9,99 €/mes'}
    };
  }

  function addControls(){
    if(!me?.logged_in)return;
    addStyles();
    const header=document.querySelector('header');
    if(header&&!$('cvgoProBtn')){const b=document.createElement('button');b.id='cvgoProBtn';b.textContent=me.pro?'⭐ PRO activo':'⭐ Activar PRO';b.onclick=openPro;header.appendChild(b)}
    const banner=$('trialBanner');
    if(banner){banner.style.cursor='pointer';banner.title='Ver CVGO PRO';banner.onclick=openPro}
    if(!me.pro&&!$('cvgoProFloat')){const b=document.createElement('button');b.id='cvgoProFloat';b.textContent=me.trial_active?'⭐ Ver PRO':'⭐ Activar PRO';b.onclick=openPro;document.body.appendChild(b)}
  }

  async function init(){
    me=await loadMe();addControls();
    if(location.search.includes('paid=1')){
      setTimeout(async()=>{me=await loadMe();addControls()},1500);
    }
    const oldAnalyze=window.analyze;
    if(typeof oldAnalyze==='function'){
      window.analyze=async function(){
        if(me && !me.pro){openPro();return}
        return oldAnalyze.apply(this,arguments);
      };
    }
  }
  setTimeout(init,1000);
})();
