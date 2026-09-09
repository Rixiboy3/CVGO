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
  let timer=null,loading=false;
  async function save(){
    if(loading||!getEmail())return false;
    try{const r=await fetch('/api/cv',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(read())});return r.ok;}catch(e){return false}
  }
  async function load(){
    if(loading)return;
    loading=true;
    try{const r=await fetch('/api/cv',{credentials:'same-origin'});if(!r.ok)return;const j=await r.json();if(j.ok&&j.data&&Object.keys(j.data).length)apply(j.data);}catch(e){}finally{loading=false;}
  }
  function scheduleSave(){clearTimeout(timer);timer=setTimeout(()=>save(),700)}
  document.addEventListener('input',()=>{const email=($('email')?.value||'').trim().toLowerCase();if(email){try{sessionStorage.setItem('cvgo_user_email',email)}catch(e){}}scheduleSave()},true);
  window.addEventListener('beforeunload',()=>{try{navigator.sendBeacon('/api/cv',new Blob([JSON.stringify(read())],{type:'application/json'}))}catch(e){}});
  window.cvgoServerSave=save;
  const original=window.loadUser;
  if(typeof original==='function')window.loadUser=async function(){const result=await original.apply(this,arguments);const m=await fetch('/api/me',{credentials:'same-origin'}).then(x=>x.json()).catch(()=>({}));if(m.logged_in){try{sessionStorage.setItem('cvgo_user_email',m.email||'')}catch(e){};await load();}return result;};
  setTimeout(()=>{fetch('/api/me',{credentials:'same-origin'}).then(x=>x.json()).then(async u=>{if(u.logged_in){try{sessionStorage.setItem('cvgo_user_email',u.email||'')}catch(e){};await load()}}).catch(()=>{})},600);
})();
