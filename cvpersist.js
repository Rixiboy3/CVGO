(function(){
  const $=id=>document.getElementById(id);
  const getSessionEmail=()=>{try{return (sessionStorage.getItem('cvgo_user_email')||'').trim().toLowerCase()}catch(e){return ''}};
  const getEmail=()=>($('email')?.value||'').trim().toLowerCase()||getSessionEmail();
  const read=()=>{
    const experience=[...document.querySelectorAll('#experience .item')].map(x=>({position:x.querySelector('.ep')?.value||'',company:x.querySelector('.ec')?.value||'',from:x.querySelector('.ef')?.value||'',to:x.querySelector('.et')?.value||'',description:x.querySelector('.ed')?.value||''}));
    const education=[...document.querySelectorAll('#education .item')].map(x=>({title:x.querySelector('.etitle')?.value||'',school:x.querySelector('.eschool')?.value||'',year:x.querySelector('.eyear')?.value||''}));
    return {name:$('name')?.value||'',role:$('role')?.value||'',email:$('email')?.value||'',phone:$('phone')?.value||'',city:$('city')?.value||'',linkedin:$('linkedin')?.value||'',summary:$('summary')?.value||'',skills:$('skills')?.value||'',experience,education,template:window.tpl||'classic'};
  };
  const apply=d=>{
    if(!d)return;
    ['name','role','email','phone','city','linkedin','summary','skills'].forEach(id=>{if($(id)&&d[id]!=null)$(id).value=d[id]});
    const exp=$('experience'),edu=$('education');
    if(exp){exp.innerHTML='';window.expCount=0;(d.experience||[]).forEach(e=>{if(typeof window.addExp==='function')window.addExp();const x=[...exp.querySelectorAll('.item')].at(-1);if(x){x.querySelector('.ep').value=e.position||'';x.querySelector('.ec').value=e.company||'';x.querySelector('.ef').value=e.from||'';x.querySelector('.et').value=e.to||'';x.querySelector('.ed').value=e.description||''}});}
    if(edu){edu.innerHTML='';window.eduCount=0;(d.education||[]).forEach(e=>{if(typeof window.addEdu==='function')window.addEdu();const x=[...edu.querySelectorAll('.item')].at(-1);if(x){x.querySelector('.etitle').value=e.title||'';x.querySelector('.eschool').value=e.school||'';x.querySelector('.eyear').value=e.year||''}});}
    if(typeof window.render==='function')window.render();
    if(d.template&&typeof window.template==='function'){const b=[...document.querySelectorAll('.templateBtns button')];const m={classic:0,modern:1,minimal:2};if(b[m[d.template]])window.template(d.template,b[m[d.template]]);}
  };
  let timer=null,loading=false,dirty=false;
  async function save(){
    if(!getEmail())return false;
    if(loading){dirty=true;return false;}
    try{
      const r=await fetch('/api/cv',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(read())});
      if(r.ok){dirty=false;setSaveStatus('Guardado');return true;}
      setSaveStatus('Error al guardar');return false;
    }catch(e){setSaveStatus('Error al guardar');return false;}
  }
  async function load(){
    if(loading)return;
    loading=true;
    try{
      const r=await fetch('/api/cv',{credentials:'same-origin'});
      if(!r.ok)return;
      const j=await r.json();
      if(j.ok&&j.data&&Object.keys(j.data).length)apply(j.data);
    }catch(e){}
    finally{
      loading=false;
      if(dirty){clearTimeout(timer);timer=setTimeout(()=>save(),300);}
    }
  }
  function scheduleSave(){clearTimeout(timer);timer=setTimeout(()=>save(),700)}
  function setSaveStatus(text){const s=$('cvgoSaveStatus');if(s){s.textContent=text;clearTimeout(s._t);s._t=setTimeout(()=>s.textContent='',2500);}}
  function addControls(){
    if($('cvgoSaveBtn'))return;
    const actions=document.querySelector('.actions');
    if(actions){
      const b=document.createElement('button');b.id='cvgoSaveBtn';b.type='button';b.textContent='💾 Guardar CV';b.onclick=async()=>{b.disabled=true;const ok=await save();b.disabled=false;if(ok)setSaveStatus('✓ CV guardado correctamente');};
      actions.insertBefore(b,actions.firstChild);
      const s=document.createElement('span');s.id='cvgoSaveStatus';s.style.cssText='align-self:center;font-size:12px;color:#067647;min-width:120px;text-align:center';actions.appendChild(s);
    }
    const header=document.querySelector('header');
    if(header&&!$('cvgoLogoutBtn')){
      const b=document.createElement('button');b.id='cvgoLogoutBtn';b.type='button';b.textContent='Cerrar sesión';b.style.cssText='margin-left:16px;border:1px solid #475467;background:transparent;color:#fff;border-radius:8px;padding:7px 11px;cursor:pointer;font-size:12px';
      b.onclick=async()=>{await save();try{await fetch('/api/logout',{method:'POST',credentials:'same-origin'});}catch(e){}try{sessionStorage.removeItem('cvgo_user_email')}catch(e){}location.reload();};
      header.appendChild(b);
    }
  }
  document.addEventListener('input',()=>{
    const email=($('email')?.value||'').trim().toLowerCase();
    if(email){try{sessionStorage.setItem('cvgo_user_email',email)}catch(e){}}
    dirty=true;scheduleSave();
  },true);
  window.addEventListener('beforeunload',()=>{try{navigator.sendBeacon('/api/cv',new Blob([JSON.stringify(read())],{type:'application/json'}))}catch(e){}});
  window.cvgoServerSave=save;
  const original=window.loadUser;
  if(typeof original==='function')window.loadUser=async function(){const result=await original.apply(this,arguments);const m=await fetch('/api/me',{credentials:'same-origin'}).then(x=>x.json()).catch(()=>({}));if(m.logged_in){try{sessionStorage.setItem('cvgo_user_email',m.email||'')}catch(e){};addControls();await load();}return result;};
  setTimeout(()=>{addControls();fetch('/api/me',{credentials:'same-origin'}).then(x=>x.json()).then(async u=>{if(u.logged_in){try{sessionStorage.setItem('cvgo_user_email',u.email||'')}catch(e){};addControls();await load()}}).catch(()=>{})},600);
})();
