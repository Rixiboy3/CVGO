(function(){
  const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const $=id=>document.getElementById(id);
  function profile(){
    const experience=[...document.querySelectorAll('#experience .item')].map(x=>({position:x.querySelector('.ep')?.value||'',company:x.querySelector('.ec')?.value||'',dates:(x.querySelector('.ef')?.value||'')+' - '+(x.querySelector('.et')?.value||''),description:x.querySelector('.ed')?.value||''}));
    const education=[...document.querySelectorAll('#education .item')].map(x=>({title:x.querySelector('.etitle')?.value||'',school:x.querySelector('.eschool')?.value||'',year:x.querySelector('.eyear')?.value||''}));
    return {name:$('name')?.value||'',role:$('role')?.value||'',summary:$('summary')?.value||'',skills:$('skills')?.value||'',experience,education};
  }
  function localMatch(keyword,p){
    const hay=JSON.stringify(p).toLowerCase();
    const k=String(keyword||'').toLowerCase().trim();
    if(!k)return false;
    return hay.includes(k)||k.split(/\s+/).filter(Boolean).some(w=>w.length>4&&hay.includes(w));
  }
  function applyOptimization(result){
    const exs=result.experiences||[];
    const items=[...document.querySelectorAll('#experience .item')];
    exs.forEach((e,i)=>{const x=items[i];if(!x)return;const d=x.querySelector('.ed');if(d&&e.description)d.value=e.description;});
    if(Array.isArray(result.skills)&&result.skills.length&&$('skills'))$('skills').value=result.skills.join(', ');
    if(typeof window.render==='function')window.render();
    if(typeof window.cvgoServerSave==='function')window.cvgoServerSave();
  }
  function renderAnalysis(box,a,p,offer){
    const score=Math.max(0,Math.min(100,Number(a.score||0)));
    const keywords=Array.isArray(a.keywords)?a.keywords.filter(Boolean):[];
    const matched=keywords.filter(k=>localMatch(k,p));
    const missing=keywords.filter(k=>!localMatch(k,p));
    const strengths=matched.slice(0,7);
    const gaps=missing.slice(0,7);
    const level=score>=85?'Excelente compatibilidad':score>=70?'Buena compatibilidad':score>=55?'Compatibilidad media':'Compatibilidad baja';
    box.innerHTML=`<div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div><b>Compatibilidad con esta oferta</b><div style="font-size:12px;color:#667085;margin-top:3px">Análisis ATS específico para el puesto</div></div>
        <strong style="font-size:24px">${score}/100</strong>
      </div>
      <div class="scorebar"><i style="width:${score}%"></i></div>
      <div style="font-weight:800;margin:8px 0 6px">${level}</div>
      <p style="font-size:13px;line-height:1.5;margin-top:8px">${esc(a.summary||'')}</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">
        <div style="padding:10px;border-radius:9px;background:#ecfdf3;border:1px solid #d1fadf">
          <b style="font-size:13px">🟢 Lo que cumples</b>
          <div style="font-size:12px;line-height:1.7;margin-top:5px">${strengths.length?strengths.map(k=>`<div>✓ ${esc(k)}</div>`).join(''):'No se han detectado coincidencias claras.'}</div>
        </div>
        <div style="padding:10px;border-radius:9px;background:#fff7ed;border:1px solid #fed7aa">
          <b style="font-size:13px">🟠 Poco reflejado o ausente</b>
          <div style="font-size:12px;line-height:1.7;margin-top:5px">${gaps.length?gaps.map(k=>`<div>• ${esc(k)}</div>`).join(''):'Tu CV cubre las palabras clave principales.'}</div>
        </div>
      </div>
      ${keywords.length?`<div style="font-size:12px;line-height:1.7;margin-top:12px"><b>Palabras clave de la oferta:</b><br>${keywords.map(k=>`<span style="display:inline-block;padding:3px 7px;margin:3px;border-radius:5px;background:${localMatch(k,p)?'#ecfdf3':'#eef2f6'}">${esc(k)}</span>`).join('')}</div>`:''}
      <div style="margin-top:14px;padding:12px;border-radius:9px;background:#111827;color:#fff">
        <div style="font-weight:800;font-size:14px">✨ Optimiza tu CV para esta oferta</div>
        <div style="font-size:12px;color:#d0d5dd;margin:4px 0 10px">CVGO reescribirá las funciones para destacar lo relevante y mantendrá intactos tus puestos, empresas y fechas.</div>
        <button id="cvgoOptimizeBtn" type="button" style="width:100%;border:0;border-radius:8px;padding:10px;background:#fff;color:#111827;font-weight:800;cursor:pointer">✨ Optimizar mi CV</button>
        <div id="cvgoOptimizeStatus" style="font-size:11px;margin-top:7px;color:#d0d5dd"></div>
      </div>
      <div style="margin-top:10px;padding:10px;border-radius:8px;background:#f8fafc;font-size:12px">💡 CVGO no inventa experiencia ni competencias: solo adapta la redacción de información respaldada por tu CV.</div>
    </div>`;
    const btn=$('cvgoOptimizeBtn'),status=$('cvgoOptimizeStatus');
    if(btn)btn.onclick=async()=>{
      btn.disabled=true;btn.textContent='⏳ Optimizando CV...';
      if(status)status.textContent='Analizando cómo adaptar tus experiencias sin inventar información.';
      try{
        const r=await fetch('/api/ai-generate',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({offer,profile:p})});
        const j=await r.json();if(!r.ok)throw j;
        applyOptimization(j.result||{});
        if(status)status.textContent='✓ CV optimizado y guardado correctamente. Revisa los cambios antes de descargarlo.';
        btn.textContent='✓ CV optimizado';
      }catch(e){
        if(status)status.textContent=e?.error==='AI_NOT_CONFIGURED'?'La IA no está configurada en el servidor.':'No se pudo optimizar el CV. Inténtalo de nuevo.';
        btn.disabled=false;btn.textContent='✨ Optimizar mi CV';
      }
    };
  }
  window.analyze=async function(){
    const box=$('score');
    const offer=($('job')?.value||'').trim();
    if(!box)return;
    box.classList.remove('hidden');
    if(offer.length<30){box.innerHTML='<b>⚠️ Necesito la oferta de empleo</b><p style="font-size:13px;margin-bottom:0">Ve a <b>Carta</b>, pega la oferta completa y vuelve a pulsar Analizar ATS.</p>';return;}
    box.innerHTML='<b>⏳ Analizando compatibilidad...</b><p style="font-size:13px;margin-bottom:0">Comparando tu CV con los requisitos reales de la oferta.</p>';
    try{
      const p=profile();
      const r=await fetch('/api/ai-generate',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({offer,profile:p})});
      const j=await r.json();if(!r.ok)throw j;
      renderAnalysis(box,j.result||{},p,offer);
    }catch(e){
      box.innerHTML=`<b>❌ No se pudo analizar la oferta</b><p style="font-size:13px;margin-bottom:0">${esc(e?.error==='AI_NOT_CONFIGURED'?'La IA no está configurada en el servidor.':e?.error==='OFFER_REQUIRED'?'La oferta es obligatoria.':'Inténtalo de nuevo en unos segundos.')}</p>`;
    }
  };
})();