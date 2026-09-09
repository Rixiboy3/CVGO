(function(){
function escAI(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function addAIBox(){
  if(document.getElementById('aiBox')||!document.getElementById('cvTab'))return;
  const box=document.createElement('div');box.id='aiBox';box.className='section';box.innerHTML=`<div style="border:1px solid #dbe4ee;border-radius:13px;padding:16px;background:#f8fafc"><h2 style="margin:0 0 7px">🤖 Optimiza tu CV con IA</h2><p style="font-size:13px;color:#667085;margin:0 0 12px">Pega una oferta de empleo y CVGO analizará la compatibilidad y adaptará tu CV para ATS.</p><div class="field"><label>Oferta de empleo</label><textarea id="aiJob" placeholder="Pega aquí la oferta completa de empleo..."></textarea></div><button class="primary" id="aiBtn" onclick="generateAICV()">✨ Analizar oferta y optimizar mi CV</button><div id="aiMsg" style="font-size:13px;margin-top:10px"></div><div id="aiResult" style="margin-top:12px"></div></div>`;
  const cvTab=document.getElementById('cvTab');cvTab.insertBefore(box,cvTab.firstChild);
}
function listBlock(title,items,icon){if(!Array.isArray(items)||!items.length)return '';return `<div style="margin-top:12px"><b>${icon} ${title}</b><ul style="margin:6px 0 0 18px;padding:0;font-size:13px;line-height:1.55">${items.map(x=>`<li>${escAI(x)}</li>`).join('')}</ul></div>`}
window.generateAICV=async function(){
  const btn=document.getElementById('aiBtn'),msg=document.getElementById('aiMsg'),out=document.getElementById('aiResult'),job=(document.getElementById('aiJob')?.value||'').trim();
  if(job.length<30){msg.textContent='Pega una oferta de empleo de al menos 30 caracteres.';msg.style.color='#b42318';return}
  const experience=[...document.querySelectorAll('#experience .item')].map(x=>({position:x.querySelector('.ep')?.value||'',company:x.querySelector('.ec')?.value||'',dates:(x.querySelector('.ef')?.value||'')+' - '+(x.querySelector('.et')?.value||''),description:x.querySelector('.ed')?.value||''}));
  const education=[...document.querySelectorAll('#education .item')].map(x=>({title:x.querySelector('.etitle')?.value||'',school:x.querySelector('.eschool')?.value||'',year:x.querySelector('.eyear')?.value||''}));
  const data={offer:job,profile:{name:document.getElementById('name')?.value||'',role:document.getElementById('role')?.value||'',summary:document.getElementById('summary')?.value||'',skills:document.getElementById('skills')?.value||'',experience,education}};
  btn.disabled=true;btn.textContent='⏳ Analizando oferta y generando CV...';msg.textContent='La IA está trabajando...';msg.style.color='#667085';out.innerHTML='';
  try{
    const r=await fetch('/api/ai-generate',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(data)});
    const j=await r.json();if(!r.ok)throw j;const a=j.result||{};window._cvgoAI=a;window._cvgoOriginal=data.profile;
    const score=Math.max(0,Math.min(100,Number(a.score||a.ats_score||0)));
    const keywords=Array.isArray(a.keywords)?a.keywords:(a.ats_keywords||[]);
    out.innerHTML=`<div style="background:#fff;border:1px solid #eaecf0;border-radius:10px;padding:13px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><b>Resultado de la optimización</b><strong style="font-size:22px">${score}/100</strong></div><div class="scorebar"><i style="width:${score}%"></i></div><p style="font-size:13px;line-height:1.5">${escAI(a.summary||a.professional_summary||'')}</p>${listBlock('Lo que cumples',a.matches,'🟢')}${listBlock('Lo que falta o está poco reflejado',a.missing,'🟠')}${listBlock('Recomendaciones',a.recommendations,'💡')}${keywords.length?`<div style="margin-top:12px;font-size:12px;line-height:1.7"><b>Palabras clave detectadas:</b><br>${keywords.map(k=>`<span style="display:inline-block;padding:3px 7px;margin:3px;border-radius:5px;background:#eef2f6">${escAI(k)}</span>`).join('')}</div>`:''}<button class="primary" style="margin-top:14px" onclick="showAIChanges()">✓ Revisar cambios antes de aplicar</button></div>`;
    msg.textContent='✓ Análisis completado. Revisa el resultado antes de aplicarlo.';msg.style.color='#067647';
  }catch(e){
    msg.textContent=e.error==='AI_NOT_CONFIGURED'?'La IA aún no está configurada en el servidor.':e.error==='TRIAL_EXPIRED'?'Tu prueba gratuita ha terminado. Activa PRO para continuar.':e.error==='OFFER_REQUIRED'?'La oferta es obligatoria.':'No se pudo generar el CV. Inténtalo de nuevo.';msg.style.color='#b42318';
  }finally{btn.disabled=false;btn.textContent='✨ Analizar oferta y optimizar mi CV'}
};
function currentChangeSummary(){
  const a=window._cvgoAI||{},o=window._cvgoOriginal||{};const changes=[];
  if((a.professional_title||'').trim() && (a.professional_title||'').trim()!==(o.role||'').trim())changes.push('Puesto profesional → adaptado a la oferta');
  if((a.professional_summary||'').trim() && (a.professional_summary||'').trim()!==(o.summary||'').trim())changes.push('Perfil profesional → optimizado para ATS');
  const newSkills=Array.isArray(a.skills)?a.skills:[];const oldSkills=String(o.skills||'').split(',').map(x=>x.trim()).filter(Boolean);if(newSkills.length && newSkills.join(', ').toLowerCase()!==oldSkills.join(', ').toLowerCase())changes.push('Habilidades → reorganizadas y ajustadas');
  const oldExp=o.experience||[],newExp=a.experiences||[];let expChanged=0;newExp.forEach((e,i)=>{if(String(e.description||'').trim()!==String(oldExp[i]?.description||'').trim())expChanged++});if(expChanged)changes.push(`Experiencia → ${expChanged} descripción${expChanged===1?'':'es'} optimizada${expChanged===1?'':'s'}`);
  const kws=Array.isArray(a.keywords)?a.keywords:(a.ats_keywords||[]);if(kws.length)changes.push(`Palabras clave → ${Math.min(kws.length,8)} detectadas para la oferta`);
  return changes;
}
window.showAIChanges=function(){
  const out=document.getElementById('aiResult'),changes=currentChangeSummary();
  if(!changes.length){out.insertAdjacentHTML('beforeend',`<div id="aiChanges" style="margin-top:14px;background:#f8fafc;border:1px solid #dbe4ee;border-radius:10px;padding:14px"><b>✓ No hay cambios necesarios</b><p style="font-size:13px;margin:7px 0 0;color:#667085">Tu CV ya está alineado con esta oferta.</p><button class="primary" style="margin-top:12px" onclick="keepAICV()">Mantener mi CV</button></div>`);return}
  const list=changes.map(x=>`<li>${escAI(x)}</li>`).join('');
  out.insertAdjacentHTML('beforeend',`<div id="aiChanges" style="margin-top:14px;background:#fff;border:2px solid #dbe4ee;border-radius:10px;padding:14px"><b style="font-size:15px">🔎 Cambios que CVGO propone</b><ul style="margin:8px 0 0 18px;padding:0;font-size:13px;line-height:1.6">${list}</ul><div style="font-size:12px;color:#667085;margin-top:10px">Nada se aplicará todavía. Tú decides si quieres modificar tu CV.</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:13px"><button class="primary" onclick="confirmApplyAICV()">✓ Aplicar cambios</button><button style="background:#fff;border:1px solid #cbd5e1;border-radius:8px;padding:10px 14px;font-weight:600" onclick="keepAICV()">↩ Mantener mi CV</button></div></div>`);
  document.getElementById('aiChanges')?.scrollIntoView({behavior:'smooth',block:'nearest'});
};
window.confirmApplyAICV=function(){
  const a=window._cvgoAI;if(!a)return;
  if(document.getElementById('role'))document.getElementById('role').value=a.professional_title||document.getElementById('role').value;
  if(document.getElementById('summary'))document.getElementById('summary').value=a.professional_summary||document.getElementById('summary').value;
  if(document.getElementById('skills')&&Array.isArray(a.skills)&&a.skills.length)document.getElementById('skills').value=a.skills.join(', ');
  const items=[...document.querySelectorAll('#experience .item')];
  (a.experiences||[]).forEach((e,i)=>{let x=items[i];if(!x&&typeof addExp==='function'){addExp();x=[...document.querySelectorAll('#experience .item')].at(-1)}if(x){x.querySelector('.ep').value=e.position||x.querySelector('.ep').value;x.querySelector('.ec').value=e.company||x.querySelector('.ec').value;let dates=(e.dates||'').split(' - ');if(dates.length>1){x.querySelector('.ef').value=dates[0]||x.querySelector('.ef').value;x.querySelector('.et').value=dates.slice(1).join(' - ')||x.querySelector('.et').value}x.querySelector('.ed').value=e.description||x.querySelector('.ed').value}});
  if(typeof render==='function')render();
  if(typeof window.cvgoServerSave==='function')window.cvgoServerSave();
  const m=document.getElementById('aiMsg');if(m){m.textContent='✓ Cambios aplicados y guardados en tu CV.';m.style.color='#067647'}
  const c=document.getElementById('aiChanges');if(c)c.innerHTML='<b style="color:#067647">✓ Cambios aplicados correctamente</b><p style="font-size:13px;margin:7px 0 0">Tu CV ha sido actualizado y guardado. Puedes revisarlo en la vista previa.</p>';
  window.scrollTo({top:0,behavior:'smooth'});
};
window.keepAICV=function(){const c=document.getElementById('aiChanges');if(c){c.innerHTML='<b>↩ CV original mantenido</b><p style="font-size:13px;margin:7px 0 0;color:#667085">No se ha modificado ningún dato de tu CV.</p>'}const m=document.getElementById('aiMsg');if(m){m.textContent='✓ Se ha mantenido tu CV original.';m.style.color='#067647'}};
const start=setInterval(()=>{if(document.getElementById('cvTab')){addAIBox();clearInterval(start)}},300);
})();