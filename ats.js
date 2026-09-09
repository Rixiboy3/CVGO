(function(){
  function esc(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function profile(){
    const experience=[...document.querySelectorAll('#experience .item')].map(x=>({position:x.querySelector('.ep')?.value||'',company:x.querySelector('.ec')?.value||'',dates:(x.querySelector('.ef')?.value||'')+' - '+(x.querySelector('.et')?.value||''),description:x.querySelector('.ed')?.value||''}));
    const education=[...document.querySelectorAll('#education .item')].map(x=>({title:x.querySelector('.etitle')?.value||'',school:x.querySelector('.eschool')?.value||'',year:x.querySelector('.eyear')?.value||''}));
    return {name:document.getElementById('name')?.value||'',role:document.getElementById('role')?.value||'',summary:document.getElementById('summary')?.value||'',skills:document.getElementById('skills')?.value||'',experience,education};
  }
  window.analyze=async function(){
    const box=document.getElementById('score'),offer=(document.getElementById('job')?.value||'').trim();
    if(!box)return;
    box.classList.remove('hidden');
    if(offer.length<30){box.innerHTML='<b>⚠️ Necesito la oferta de empleo</b><p style="font-size:13px;margin-bottom:0">Ve a <b>Carta</b>, pega la oferta completa y vuelve a pulsar Analizar ATS.</p>';return}
    box.innerHTML='<b>⏳ Analizando compatibilidad...</b><p style="font-size:13px;margin-bottom:0">Comparando tu CV con los requisitos reales de la oferta.</p>';
    try{
      const r=await fetch('/api/ai-generate',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({offer,profile:profile()})});
      const j=await r.json();
      if(!r.ok)throw j;
      const a=j.result||{},score=Math.max(0,Math.min(100,Number(a.score||0))),keywords=Array.isArray(a.keywords)?a.keywords:[];
      box.innerHTML=`<div><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><b>Compatibilidad con esta oferta</b><div style="font-size:12px;color:#667085;margin-top:3px">Análisis ATS específico para el puesto</div></div><strong style="font-size:24px">${score}/100</strong></div><div class="scorebar"><i style="width:${score}%"></i></div><p style="font-size:13px;line-height:1.5">${esc(a.summary||'')}</p>${keywords.length?`<div style="font-size:12px;line-height:1.7"><b>Palabras clave de la oferta:</b><br>${keywords.map(k=>`<span style="display:inline-block;padding:3px 7px;margin:3px;border-radius:5px;background:#eef2f6">${esc(k)}</span>`).join('')}</div>`:''}<div style="margin-top:12px;padding:10px;border-radius:8px;background:#f8fafc;font-size:12px">💡 CVGO no inventa experiencia ni competencias: solo señala oportunidades respaldadas por tu CV.</div></div>`;
    }catch(e){
      box.innerHTML=`<b>❌ No se pudo analizar la oferta</b><p style="font-size:13px;margin-bottom:0">${esc(e?.error==='AI_NOT_CONFIGURED'?'La IA no está configurada en el servidor.':e?.error==='OFFER_REQUIRED'?'La oferta es obligatoria.':'Inténtalo de nuevo en unos segundos.')}</p>`;
    }
  };
})();