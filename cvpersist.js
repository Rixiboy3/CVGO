(function(){
  const $=id=>document.getElementById(id);
  const getEmail=()=>($('email')?.value||'').trim().toLowerCase()||sessionStorage.getItem('cvgo_user_email')||'';
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
  let timer;
  async function save(){try{if(!getEmail())return;await fetch('/api/cv',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(read())});}catch(e){}}
  async function load(){try{if(!getEmail())return;const r=await fetch('/api/cv');if(!r.ok)return;const j=await r.json();if(j.ok&&j.data&&Object.keys(j.data).length)apply(j.data);}catch(e){}}
  document.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(save,700)},true);
  window.addEventListener('beforeunload',()=>{try{navigator.sendBeacon('/api/cv',new Blob([JSON.stringify(read())],{type:'application/json'}))}catch(e){}});
  window.cvgoServerSave=save;
  const original=window.loadUser;
  if(typeof original==='function')window.loadUser=async function(){const r=await original.apply(this,arguments);const m=await fetch('/api/me').then(x=>x.json()).catch(()=>({}));if(m.logged_in){sessionStorage.setItem('cvgo_user_email',m.email||'');setTimeout(load,120)}return r};
  setTimeout(()=>{fetch('/api/me').then(x=>x.json()).then(u=>{if(u.logged_in){sessionStorage.setItem('cvgo_user_email',u.email||'');load()}}).catch(()=>{})},800);
})();
