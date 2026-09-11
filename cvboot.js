(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  let loaded=false;
  function addLogout(email){
    const header=document.querySelector('header');
    if(!header||$('cvgoLogoutBtn'))return;
    const b=document.createElement('button');b.id='cvgoLogoutBtn';b.type='button';b.textContent='Cerrar sesión';
    b.style.cssText='margin-left:16px;border:0;background:#111827;color:#fff;border-radius:9px;padding:8px 14px;cursor:pointer;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(16,24,40,.12)';
    b.onclick=async()=>{try{await fetch('/api/logout',{method:'POST',credentials:'same-origin'})}catch(e){}try{sessionStorage.removeItem('cvgo_user_email')}catch(e){}location.reload()};
    header.appendChild(b);
    if(email){const s=$('headerStatus');if(s)s.textContent=email}
  }
  function apply(d){
    if(!d||typeof d!=='object')return;
    ['name','role','email','phone','city','linkedin','summary','skills'].forEach(id=>{const e=$(id);if(e&&d[id]!=null)e.value=d[id]});
    const exp=$('experience'),edu=$('education');
    const ex=(d.experience||[]).filter(x=>x&&Object.values(x).some(v=>String(v||'').trim()));
    const ed=(d.education||[]).filter(x=>x&&Object.values(x).some(v=>String(v||'').trim()));
    if(exp&&typeof window.addExp==='function'){
      exp.innerHTML='';window.expCount=0;
      (ex.length?ex:[{}]).forEach(x=>{window.addExp();const item=exp.lastElementChild;if(!item)return;[['.ep',x.position],['.ec',x.company],['.ef',x.from],['.et',x.to],['.ed',x.description]].forEach(([s,v])=>{const e=item.querySelector(s);if(e)e.value=v||''})});
    }
    if(edu&&typeof window.addEdu==='function'){
      edu.innerHTML='';window.eduCount=0;
      (ed.length?ed:[{}]).forEach(x=>{window.addEdu();const item=edu.lastElementChild;if(!item)return;[['.etitle',x.title],['.eschool',x.school],['.eyear',x.year]].forEach(([s,v])=>{const e=item.querySelector(s);if(e)e.value=v||''})});
    }
    if(d.template&&typeof window.template==='function'){const b=[...document.querySelectorAll('.templateBtns button')],i={classic:0,modern:1,minimal:2}[d.template];if(b[i])window.template(d.template,b[i])}
    if(typeof window.render==='function')window.render();
  }
  async function boot(){
    if(loaded||!$('main')||$('main').classList.contains('hidden'))return;
    try{
      const me=await fetch('/api/me',{credentials:'same-origin'}).then(r=>r.json());
      if(!me.logged_in)return;
      loaded=true;addLogout(me.email||'');
      try{sessionStorage.setItem('cvgo_user_email',me.email||'')}catch(e){}
      const r=await fetch('/api/cv',{credentials:'same-origin'});
      if(r.ok){const j=await r.json();if(j.ok&&j.data&&Object.keys(j.data).length)apply(j.data)}
    }catch(e){}
  }
  function start(){boot();setTimeout(boot,500);setTimeout(boot,1500)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
