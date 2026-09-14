(function(){
  'use strict';
  const q=s=>document.querySelector(s);
  const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

  function addStyles(){
    if(q('#cvpCommercialStyles'))return;
    const s=document.createElement('style');s.id='cvpCommercialStyles';s.textContent=`
      #cvpJourney{margin:0 0 18px;background:#fff;border:1px solid #e4e7ec;border-radius:18px;padding:18px 20px;box-shadow:0 7px 24px rgba(16,24,40,.06)}
      .cvpJourneyHead{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:14px}.cvpJourneyHead h2{margin:0;font-size:17px;color:#101828}.cvpJourneyHead p{margin:4px 0 0;font-size:12px;color:#667085}
      .cvpJourneySteps{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.cvpStep{position:relative;border:1px solid #eaecf0;border-radius:12px;padding:12px;background:#f8fafc;cursor:pointer;transition:.16s}.cvpStep:hover{transform:translateY(-1px);border-color:#cbd5e1}.cvpStep.done{background:#f0fdf4;border-color:#bbf7d0}.cvpStep.current{background:#eff6ff;border-color:#bfdbfe;box-shadow:inset 0 0 0 1px #dbeafe}.cvpStepNum{display:inline-grid;place-items:center;width:25px;height:25px;border-radius:8px;background:#e5e7eb;color:#475467;font-size:11px;font-weight:900;margin-bottom:8px}.cvpStep.done .cvpStepNum{background:#16a34a;color:#fff}.cvpStep.current .cvpStepNum{background:#2563eb;color:#fff}.cvpStep strong{display:block;font-size:12px;color:#101828}.cvpStep small{display:block;font-size:10px;color:#667085;line-height:1.4;margin-top:3px}.cvpStepCta{display:block;margin-top:9px;font-size:10px;font-weight:900;color:#2563eb}.cvpStep.done .cvpStepCta{color:#15803d}
      #cvpNextAction{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:13px;padding:12px 14px;border-radius:12px;background:#111827;color:#fff}.cvpNextActionText b{display:block;font-size:12px}.cvpNextActionText span{display:block;font-size:10px;color:#d1d5db;margin-top:3px}.cvpNextAction button{border:0;border-radius:8px;background:#fff;color:#111827;padding:9px 12px;font-size:11px;font-weight:900;cursor:pointer;white-space:nowrap}
      #cvpTrialMini{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 16px;padding:10px 13px;border:1px solid #d1fadf;background:#f0fdf4;border-radius:12px;color:#067647;font-size:11px}#cvpTrialMini button{border:0;background:none;color:#067647;text-decoration:underline;font-weight:900;cursor:pointer;padding:0}
      @media(max-width:800px){.cvpJourneySteps{grid-template-columns:1fr 1fr}.cvpJourneyHead{align-items:flex-start}.cvpJourneyHead p{max-width:420px}}
      @media(max-width:600px){#cvpJourney{padding:15px;margin-bottom:13px}.cvpJourneySteps{grid-template-columns:1fr}.cvpStep{padding:11px}.cvpStepCta{margin-top:7px}#cvpNextAction{align-items:stretch;flex-direction:column}.cvpNextAction button{width:100%}}
    `;document.head.appendChild(s);
  }

  function isLogged(){return !!document.body.classList.contains('cvgo-dashboard') || !!(q('#main')&&!q('#main').classList.contains('hidden')&&q('.dash-sidebar'))}
  function hasCV(){
    const name=(q('#name')?.value||'').trim();const role=(q('#role')?.value||'').trim();const summary=(q('#summary')?.value||'').trim();
    const ex=[...document.querySelectorAll('#experience .item')].some(x=>(x.querySelector('.ep')?.value||'').trim()||(x.querySelector('.ed')?.value||'').trim());
    return !!(name&&role&&summary&&ex);
  }
  function offerText(){return (q('#job')?.value||q('#aiJob')?.value||'').trim()}
  function hasAnalysis(){return !!window._cvgoAI}
  function hasCover(){const out=q('#coverResult')||q('#coverLetterResult');return !!(out&&out.textContent.trim())}
  function hasInterview(){return !!q('#interviewResult')||!!q('.interview-result')}

  function go(name){
    const b=[...document.querySelectorAll('[data-go]')].find(x=>x.dataset.go===name);
    if(b){b.click();return}
    if(name==='cv')q('#cvTab')?.scrollIntoView({behavior:'smooth'});
    if(name==='oferta')q('#job')?.focus();
  }

  function render(){
    if(!isLogged())return;
    addStyles();
    const main=q('#main'),app=q('.app');if(!main||!app)return;
    if(!q('#cvpJourney')){
      const el=document.createElement('section');el.id='cvpJourney';
      el.innerHTML=`<div class="cvpJourneyHead"><div><h2>🎯 Prepara tu próxima candidatura</h2><p>Haz estos 4 pasos y llega a cada oferta con todo preparado.</p></div></div><div class="cvpJourneySteps"></div><div id="cvpNextAction"></div>`;
      const quick=q('.dash-quick');if(quick)quick.insertAdjacentElement('beforebegin',el);else app.insertBefore(el,app.firstChild);
    }
    const cv=hasCV(),offer=!!offerText(),analysis=hasAnalysis(),cover=hasCover(),interview=hasInterview();
    const steps=[
      {id:'cv',title:'Completa tu CV',sub:cv?'CV listo':'Nombre, perfil y experiencia',done:cv,go:'cv'},
      {id:'oferta',title:'Analiza una oferta',sub:analysis?'Oferta analizada':offer?'Oferta preparada':'Pega una oferta real',done:analysis,go:'oferta'},
      {id:'carta',title:'Prepara tu carta',sub:cover?'Carta generada':'Personaliza tu candidatura',done:cover,go:'carta'},
      {id:'entrevista',title:'Practica la entrevista',sub:interview?'Práctica completada':'Entrena tus respuestas',done:interview,go:'entrevista'}
    ];
    const current=steps.find(x=>!x.done)||steps[steps.length-1];
    const container=q('.cvpJourneySteps');container.innerHTML=steps.map((x,i)=>`<button type="button" class="cvpStep ${x.done?'done':''} ${current.id===x.id&&!x.done?'current':''}" data-cvp-go="${x.go}"><span class="cvpStepNum">${x.done?'✓':i+1}</span><strong>${esc(x.title)}</strong><small>${esc(x.sub)}</small><span class="cvpStepCta">${x.done?'Completado ✓':current.id===x.id?'Empezar →':'Ver paso →'}</span></button>`).join('');
    container.querySelectorAll('[data-cvp-go]').forEach(b=>b.onclick=()=>go(b.dataset.cvpGo));
    const next=q('#cvpNextAction');
    if(current.done){next.innerHTML='<div class="cvpNextActionText"><b>🎉 Tu candidatura está preparada</b><span>Puedes revisar tu CV, carta y entrevista o empezar con otra oferta.</span></div><button type="button" data-cvp-new>Analizar otra oferta →</button>';next.querySelector('[data-cvp-new]').onclick=()=>go('oferta')}
    else{
      const copy={cv:['Empieza por tu CV','Completa tus datos para que CVProfit pueda personalizar el resto de tu candidatura.'],oferta:['Ahora analiza una oferta','Pega la oferta que realmente quieres conseguir y descubre tu compatibilidad.'],carta:['Prepara la candidatura','Con el análisis listo, genera una carta adaptada a esa oportunidad.'],entrevista:['Prepárate para la entrevista','Practica preguntas relacionadas con la oferta y tu experiencia real.']}[current.id];
      next.innerHTML=`<div class="cvpNextActionText"><b>${esc(copy[0])}</b><span>${esc(copy[1])}</span></div><button type="button" data-cvp-next>Continuar →</button>`;next.querySelector('[data-cvp-next]').onclick=()=>go(current.go);
    }
    const trial=window.__cvprofitMe;if(trial&&trial.trial_active){
      if(!q('#cvpTrialMini')){const t=document.createElement('div');t.id='cvpTrialMini';t.innerHTML='<span>🎁 <strong>Prueba gratuita activa</strong> · Acceso completo a CVProfit</span><button type="button" id="cvpTrialOpen">Ver PRO</button>';const j=q('#cvpJourney');j.insertAdjacentElement('beforebegin',t);t.querySelector('#cvpTrialOpen').onclick=()=>document.getElementById('cvgoProBtn')?.click()}
      const t=q('#cvpTrialMini');t.querySelector('span').innerHTML=`🎁 <strong>${Number(trial.trial_days_left||0)} ${Number(trial.trial_days_left||0)===1?'día':'días'} restantes</strong> · Prueba gratuita activa`;
    }
  }

  async function boot(){
    try{const r=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});const me=await r.json();window.__cvprofitMe=me;}
    catch(e){}
    if(isLogged())render();
    setTimeout(()=>{if(isLogged())render()},800);
    setTimeout(()=>{if(isLogged())render()},2200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  const observer=new MutationObserver(()=>{if(isLogged()&&!q('#cvpJourney'))render()});
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
})();
