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

// ===================== ENTREVISTA JOB-SPECIFIC =====================
function interviewProfile(){
  const experience=[...document.querySelectorAll('#experience .item')].map(x=>({position:x.querySelector('.ep')?.value||'',company:x.querySelector('.ec')?.value||'',dates:(x.querySelector('.ef')?.value||'')+' - '+(x.querySelector('.et')?.value||''),description:x.querySelector('.ed')?.value||''})).filter(x=>x.position||x.company||x.description);
  return {name:document.getElementById('name')?.value||'',role:document.getElementById('role')?.value||'',summary:document.getElementById('summary')?.value||'',skills:document.getElementById('skills')?.value||'',experience};
}
function interviewKeywords(text){
  const stop=new Set('para como esta este esta los las una uno por con del que sus sobre desde entre hacia puede pueden será ser tener tiene experiencia años puesto empresa trabajo buscamos nuestro nuestra mediante según también donde cuando quien cada más muy profesional persona equipo'.split(' '));
  const words=String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9][a-z0-9+.#/-]{2,}/g)||[];
  const freq={};words.forEach(w=>{if(!stop.has(w))freq[w]=(freq[w]||0)+1});
  return Object.entries(freq).sort((a,b)=>b[1]-a[1]).map(x=>x[0]).filter((x,i,a)=>a.indexOf(x)===i).slice(0,18);
}
function buildInterviewQuestions(offer,p){
  const keys=interviewKeywords(offer);const cvText=[p.role,p.summary,p.skills,...p.experience.map(x=>x.position+' '+x.description)].join(' ').toLowerCase();
  const relevant=p.experience.filter(x=>x.description||x.position).slice(0,2);
  const expLabel=relevant[0]?(relevant[0].position+(relevant[0].company?' en '+relevant[0].company:'')):'tu experiencia más relevante';
  const keyLabel=keys.slice(0,4).join(', ')||'los requisitos de la oferta';
  return [
    {type:'presentacion',q:'Háblame de ti y de tu trayectoria profesional.',look:'Un resumen de 45-60 segundos, orientado al puesto y no una repetición completa del CV.',highlight:p.role||'tu perfil profesional',avoid:'Empezar con datos personales irrelevantes o hacer un recorrido cronológico demasiado largo.'},
    {type:'motivacion',q:'¿Por qué te interesa este puesto y por qué quieres trabajar con nosotros?',look:'Motivación concreta conectada con las funciones y necesidades de la oferta.',highlight:keyLabel,avoid:'Responder únicamente con “busco crecer” o “necesito un cambio”.'},
    {type:'experiencia',q:`¿Qué experiencia tienes que te prepare mejor para este puesto?`,look:'Elegir un ejemplo real y explicar qué hacías, qué responsabilidad tenías y qué resultado aportabas.',highlight:expLabel,avoid:'Enumerar empresas sin explicar la relación con el puesto.'},
    {type:'funciones',q:'Cuéntame cómo abordarías las principales responsabilidades de este puesto.',look:'Relacionar tu forma de trabajar con las funciones reales de la oferta.',highlight:keyLabel,avoid:'Afirmar experiencia que no aparece en tu CV.'},
    {type:'fortaleza',q:'¿Cuál es tu principal fortaleza profesional para este puesto?',look:'Una fortaleza demostrable con un ejemplo breve.',highlight:p.skills||'una habilidad que ya aparezca en tu CV',avoid:'Usar adjetivos sin una situación real que los respalde.'},
    {type:'debilidad',q:'¿Cuál es una debilidad profesional que estás trabajando?',look:'Una debilidad real, controlada y acompañada de una acción concreta de mejora.',highlight:'aprendizaje y mejora continua',avoid:'Decir “soy demasiado perfeccionista” sin explicar nada más.'},
    {type:'situacional',q:'Imagina que empiezas mañana y recibes una situación difícil relacionada con el puesto. ¿Qué harías?',look:'Explicar un proceso: entender, priorizar, actuar, comunicar y comprobar el resultado.',highlight:'tu experiencia práctica',avoid:'Responder impulsivamente o prometer resultados sin conocer el contexto.'},
    {type:'presion',q:'¿Por qué deberíamos contratarte frente a otros candidatos?',look:'Tres razones como máximo: experiencia relevante, capacidad demostrable y encaje con el puesto.',highlight:keyLabel,avoid:'Compararte negativamente con otros candidatos o inventar logros.'}
  ];
}
function scoreInterviewAnswer(answer,offer,p,q){
  const a=String(answer||'').trim();if(!a)return {score:0,label:'Sin respuesta',tips:['Escribe una respuesta de 45-90 segundos.']};
  const low=a.toLowerCase();const cv=(p.role+' '+p.summary+' '+p.skills+' '+p.experience.map(x=>x.position+' '+x.description).join(' ')).toLowerCase();const keys=interviewKeywords(offer);let score=35;let hits=0;
  keys.forEach(k=>{if(low.includes(k)){hits++;score+=3}});if(a.length>=120)score+=12;else if(a.length>=70)score+=8;else if(a.length>=40)score+=4;
  if(/resultado|logr[eé]|consegu[ií]|mejor[eé]|aument|reduj|cliente|objetivo|ejemplo/.test(low))score+=12;
  if(/porque|por qué|para|aprend|resolv|decid|prioriz|comuni/.test(low))score+=8;
  const cvHits=(cv.match(/[a-záéíóúñ]{4,}/gi)||[]).filter(w=>low.includes(w.toLowerCase())).length;if(cvHits>2)score+=6;
  score=Math.max(0,Math.min(100,score));let tips=[];if(a.length<70)tips.push('Hazla algo más concreta: 45-90 segundos.');if(hits===0)tips.push('Conecta la respuesta con algún requisito de la oferta.');if(!/resultado|logr[eé]|consegu[ií]|mejor[eé]|objetivo|ejemplo/.test(low))tips.push('Añade un ejemplo real o un resultado.');if(!/porque|por qué|para|resolv|decid|prioriz|comuni/.test(low))tips.push('Explica brevemente cómo actuaste, no solo qué hiciste.');if(!tips.length)tips.push('Buena base. Practica decirla de forma natural, sin memorizarla palabra por palabra.');
  return {score,label:score>=80?'Respuesta fuerte':score>=65?'Respuesta correcta':'Necesita mejorar',tips};
}
window.evaluateInterviewAnswer=function(i){const p=interviewProfile(),offer=(document.getElementById('job')?.value||document.getElementById('aiJob')?.value||'').trim(),q=(window._cvgoInterview||[])[i],a=document.getElementById('intAnswer'+i)?.value||'';const r=scoreInterviewAnswer(a,offer,p,q);const el=document.getElementById('intEval'+i);if(el)el.innerHTML=`<div style="margin-top:8px;padding:10px;border-radius:8px;background:#f8fafc;border:1px solid #eaecf0"><b>${r.score}/100 · ${escAI(r.label)}</b><ul style="margin:6px 0 0 17px;font-size:12px;line-height:1.5">${r.tips.map(t=>`<li>${escAI(t)}</li>`).join('')}</ul></div>`};
window.makeInterview=function(){
  const out=document.getElementById('interviewOut');if(!out)return;const offer=(document.getElementById('job')?.value||document.getElementById('aiJob')?.value||'').trim();const p=interviewProfile();
  if(offer.length<30){out.innerHTML='<div style="padding:13px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;font-size:13px">⚠️ Para preparar una entrevista específica, primero pega la oferta de empleo en la pestaña <b>Carta</b> o en <b>Optimiza tu CV con IA</b>.</div>';return}
  const qs=buildInterviewQuestions(offer,p);window._cvgoInterview=qs;const keys=interviewKeywords(offer).slice(0,10);
  out.innerHTML=`<div style="border:1px solid #dbe4ee;border-radius:12px;background:#f8fafc;padding:15px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><div><b style="font-size:16px">🎯 Entrevista adaptada a esta oferta</b><div style="font-size:12px;color:#667085;margin-top:4px">${qs.length} preguntas · preparación basada en la oferta y en tu CV</div></div><span style="font-size:12px;padding:5px 8px;background:#fff;border:1px solid #dbe4ee;border-radius:7px">${keys.length?'Claves: '+escAI(keys.join(' · ')):'Oferta detectada'}</span></div><div style="margin-top:13px">${qs.map((x,i)=>`<div style="background:#fff;border:1px solid #eaecf0;border-radius:10px;padding:13px;margin-top:10px"><div style="font-size:12px;color:#667085">Pregunta ${i+1} · ${escAI(x.type)}</div><b style="display:block;margin-top:4px;line-height:1.45">${escAI(x.q)}</b><div style="font-size:12px;margin-top:8px"><b>Qué busca el entrevistador:</b> ${escAI(x.look)}</div><div style="font-size:12px;margin-top:5px"><b>Qué destacar:</b> ${escAI(x.highlight)}</div><div style="font-size:12px;margin-top:5px;color:#b42318"><b>Evita:</b> ${escAI(x.avoid)}</div><textarea id="intAnswer${i}" placeholder="Escribe aquí tu respuesta para practicar..." style="width:100%;min-height:90px;margin-top:10px;border:1px solid #d0d5dd;border-radius:8px;padding:9px;resize:vertical"></textarea><button class="smallbtn" style="margin-top:7px" onclick="evaluateInterviewAnswer(${i})">Evaluar respuesta</button><div id="intEval${i}"></div></div>`).join('')}</div><div style="margin-top:14px;padding:11px;border-radius:9px;background:#fff;border:1px solid #dbe4ee;font-size:12px;line-height:1.5"><b>💡 Regla CVGO:</b> responde con hechos que puedas defender en entrevista. No inventes experiencia, herramientas, cifras ni logros que no aparezcan en tu CV.</div></div>`;
  out.scrollIntoView({behavior:'smooth',block:'start'});
};

const start=setInterval(()=>{if(document.getElementById('cvTab')){addAIBox();clearInterval(start)}},300);
})();