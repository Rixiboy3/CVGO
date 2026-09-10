(function(){
  const $=id=>document.getElementById(id);
  const getSessionEmail=()=>{try{return (sessionStorage.getItem('cvgo_user_email')||'').trim().toLowerCase()}catch(e){return ''}};
  const getEmail=()=>($('email')?.value||'').trim().toLowerCase()||getSessionEmail();
  const hasExpData=e=>[e?.position,e?.company,e?.from,e?.to,e?.description].some(v=>String(v||'').trim());
  const hasEduData=e=>[e?.title,e?.school,e?.year].some(v=>String(v||'').trim());
  const read=()=>{
    const experience=[...document.querySelectorAll('#experience .item')].map(x=>({position:x.querySelector('.ep')?.value||'',company:x.querySelector('.ec')?.value||'',from:x.querySelector('.ef')?.value||'',to:x.querySelector('.et')?.value||'',description:x.querySelector('.ed')?.value||''}));
    const education=[...document.querySelectorAll('#education .item')].map(x=>({title:x.querySelector('.etitle')?.value||'',school:x.querySelector('.eschool')?.value||'',year:x.querySelector('.eyear')?.value||''}));
    return {name:$('name')?.value||'',role:$('role')?.value||'',email:$('email')?.value||'',phone:$('phone')?.value||'',city:$('city')?.value||'',linkedin:$('linkedin')?.value||'',summary:$('summary')?.value||'',skills:$('skills')?.value||'',experience,education,template:window.tpl||'classic',photo:window.cvgoPhotoData||''};
  };
  const apply=d=>{
    if(!d)return;
    ['name','role','email','phone','city','linkedin','summary','skills'].forEach(id=>{if($(id)&&d[id]!=null)$(id).value=d[id]});
    if(typeof window.cvgoSetPhoto==='function')window.cvgoSetPhoto(d.photo||'');else window.cvgoPhotoData=d.photo||'';
    const exp=$('experience'),edu=$('education');
    const experiences=(d.experience||[]).filter(hasExpData);
    const educations=(d.education||[]).filter(hasEduData);
    if(exp){exp.innerHTML='';window.expCount=0;experiences.forEach(e=>{if(typeof window.addExp==='function')window.addExp();const x=[...exp.querySelectorAll('.item')].at(-1);if(x){x.querySelector('.ep').value=e.position||'';x.querySelector('.ec').value=e.company||'';x.querySelector('.ef').value=e.from||'';x.querySelector('.et').value=e.to||'';x.querySelector('.ed').value=e.description||''}});if(!experiences.length&&typeof window.addExp==='function')window.addExp();}
    if(edu){edu.innerHTML='';window.eduCount=0;educations.forEach(e=>{if(typeof window.addEdu==='function')window.addEdu();const x=[...edu.querySelectorAll('.item')].at(-1);if(x){x.querySelector('.etitle').value=e.title||'';x.querySelector('.eschool').value=e.school||'';x.querySelector('.eyear').value=e.year||''}});if(!educations.length&&typeof window.addEdu==='function')window.addEdu();}
    if(typeof window.render==='function')window.render();
    if(d.template&&typeof window.template==='function'){const b=[...document.querySelectorAll('.templateBtns button')];const m={classic:0,modern:1,minimal:2};if(b[m[d.template]])window.template(d.template,b[m[d.template]]);}
  };
  let timer=null,loading=false,dirty=false;
  async function save(){
    if(!getEmail())return false;
    if(loading){dirty=true;return false;}
    try{const r=await fetch('/api/cv',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(read())});if(r.ok){dirty=false;setSaveStatus('Guardado');return true}setSaveStatus('Error al guardar');return false}catch(e){setSaveStatus('Error al guardar');return false}
  }
  async function load(){
    if(loading)return;
    loading=true;
    try{const r=await fetch('/api/cv',{credentials:'same-origin'});if(!r.ok)return;const j=await r.json();if(j.ok&&j.data&&Object.keys(j.data).length)apply(j.data)}catch(e){}
    finally{loading=false;if(dirty){clearTimeout(timer);timer=setTimeout(()=>save(),300)}}
  }
  function scheduleSave(){clearTimeout(timer);timer=setTimeout(()=>save(),700)}
  function setSaveStatus(text){const s=$('cvgoSaveStatus');if(s){s.textContent=text;clearTimeout(s._t);s._t=setTimeout(()=>s.textContent='',2500)}}
  function addControls(){
    const auth=$('auth');
    if(auth && !auth.classList.contains('hidden')){
      const oldLogout=$('cvgoLogoutBtn');
      if(oldLogout)oldLogout.remove();
      return;
    }
    if($('cvgoSaveBtn'))return;
    const actions=document.querySelector('.actions');
    if(actions){const b=document.createElement('button');b.id='cvgoSaveBtn';b.type='button';b.textContent='💾 Guardar CV';b.onclick=async()=>{b.disabled=true;const ok=await save();b.disabled=false;if(ok)setSaveStatus('✓ CV guardado correctamente')};actions.insertBefore(b,actions.firstChild);const s=document.createElement('span');s.id='cvgoSaveStatus';s.style.cssText='align-self:center;font-size:12px;color:#067647;min-width:120px;text-align:center';actions.appendChild(s)}
    const header=document.querySelector('header');
    if(header&&!$('cvgoLogoutBtn')){const b=document.createElement('button');b.id='cvgoLogoutBtn';b.type='button';b.textContent='Cerrar sesión';b.style.cssText='margin-left:16px;border:0;background:#111827;color:#fff;border-radius:9px;padding:8px 14px;cursor:pointer;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(16,24,40,.12)';b.onclick=async()=>{await save();try{await fetch('/api/logout',{method:'POST',credentials:'same-origin'})}catch(e){}try{sessionStorage.removeItem('cvgo_user_email')}catch(e){}location.reload()};header.appendChild(b)}
  }
  document.addEventListener('input',()=>{const email=($('email')?.value||'').trim().toLowerCase();if(email){try{sessionStorage.setItem('cvgo_user_email',email)}catch(e){}}dirty=true;scheduleSave()},true);
  window.addEventListener('beforeunload',()=>{try{navigator.sendBeacon('/api/cv',new Blob([JSON.stringify(read())],{type:'application/json'}))}catch(e){}});
  window.cvgoServerSave=save;
  const original=window.loadUser;
  if(typeof original==='function')window.loadUser=async function(){const result=await original.apply(this,arguments);const m=await fetch('/api/me',{credentials:'same-origin'}).then(x=>x.json()).catch(()=>({}));if(m.logged_in){try{sessionStorage.setItem('cvgo_user_email',m.email||'')}catch(e){}addControls();await load()}else{const b=$('cvgoLogoutBtn');if(b)b.remove()}return result};
  setTimeout(()=>{fetch('/api/me',{credentials:'same-origin'}).then(x=>x.json()).then(async u=>{if(u.logged_in){try{sessionStorage.setItem('cvgo_user_email',u.email||'')}catch(e){}addControls();await load()}else{const b=$('cvgoLogoutBtn');if(b)b.remove();addControls()}}).catch(()=>{const b=$('cvgoLogoutBtn');if(b)b.remove()})},600);

  function escATS(s){return String(s||'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]))}
  function atsProfile(){
    const experience=[...document.querySelectorAll('#experience .item')].map(x=>({position:x.querySelector('.ep')?.value||'',company:x.querySelector('.ec')?.value||'',dates:(x.querySelector('.ef')?.value||'')+' - '+(x.querySelector('.et')?.value||''),description:x.querySelector('.ed')?.value||''}));
    const education=[...document.querySelectorAll('#education .item')].map(x=>({title:x.querySelector('.etitle')?.value||'',school:x.querySelector('.eschool')?.value||'',year:x.querySelector('.eyear')?.value||''}));
    return {name:$('name')?.value||'',role:$('role')?.value||'',summary:$('summary')?.value||'',skills:$('skills')?.value||'',experience,education};
  }
  window.analyze=async function(){
    const box=$('score'),offer=($('job')?.value||'').trim();
    if(!box)return;
    box.classList.remove('hidden');
    if(offer.length<30){box.innerHTML='<b>⚠️ Necesito la oferta de empleo</b><p style="font-size:13px;margin-bottom:0">Ve a <b>Carta</b>, pega la oferta completa y vuelve a pulsar Analizar ATS.</p>';return}
    box.innerHTML='<b>⏳ Analizando compatibilidad...</b><p style="font-size:13px;margin-bottom:0">Comparando tu CV con los requisitos reales de la oferta.</p>';
    try{
      const r=await fetch('/api/ai-generate',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({offer,profile:atsProfile()})});
      const j=await r.json();
      if(!r.ok)throw j;
      const a=j.result||{},score=Math.max(0,Math.min(100,Number(a.score||0))),keywords=Array.isArray(a.keywords)?a.keywords:[];
      box.innerHTML=`<div><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><b>Compatibilidad con esta oferta</b><div style="font-size:12px;color:#667085;margin-top:3px">Análisis ATS específico para el puesto</div></div><strong style="font-size:24px">${score}/100</strong></div><div class="scorebar"><i style="width:${score}%"></i></div><p style="font-size:13px;line-height:1.5">${escATS(a.summary||'')}</p>${keywords.length?`<div style="font-size:12px;line-height:1.7"><b>Palabras clave de la oferta:</b><br>${keywords.map(k=>`<span style="display:inline-block;padding:3px 7px;margin:3px;border-radius:5px;background:#eef2f6">${escATS(k)}</span>`).join('')}</div>`:''}<div style="margin-top:12px;padding:10px;border-radius:8px;background:#f8fafc;font-size:12px">💡 CVGO no inventa experiencia ni competencias: solo señala oportunidades respaldadas por tu CV.</div></div>`;
    }catch(e){
      const detail=String(e?.detail||'').trim();
      const code=String(e?.error||'').trim();
      const msg=code==='AI_NOT_CONFIGURED'?'La IA no está configurada en el servidor.':code==='OFFER_REQUIRED'?'La oferta es obligatoria.':detail?`Error del servidor (${escATS(code||'AI_REQUEST_FAILED')}): ${escATS(detail)}`:`Error del servidor (${escATS(code||'desconocido')}). Inténtalo de nuevo en unos segundos.`;
      box.innerHTML=`<b>❌ No se pudo analizar la oferta</b><p style="font-size:13px;margin-bottom:0">${msg}</p>`;
    }
  };
})();

(function(){
  if(document.getElementById('cvgoInterviewScript')) return;
  const s=document.createElement('script');
  s.id='cvgoInterviewScript';
  s.src='/interview.js?v=1';
  s.defer=true;
  document.head.appendChild(s);
})();

(function(){
  if(document.getElementById('cvgoDashboardCss'))return;
  const link=document.createElement('link');link.id='cvgoDashboardCss';link.rel='stylesheet';link.href='/dashboard.css?v=1';document.head.appendChild(link);
  const s=document.createElement('script');s.id='cvgoDashboardScript';s.src='/dashboard.js?v=1';s.defer=true;document.body.appendChild(s);
})();
