(function(){
  const KEY='cvgo_cv_data_v1';
  const ids=['name','role','email','phone','city','linkedin','summary','skills'];
  const $=id=>document.getElementById(id);
  const readData=()=>{
    const experience=[...document.querySelectorAll('#experience .item')].map(x=>({position:x.querySelector('.ep')?.value||'',company:x.querySelector('.ec')?.value||'',from:x.querySelector('.ef')?.value||'',to:x.querySelector('.et')?.value||'',description:x.querySelector('.ed')?.value||''}));
    const education=[...document.querySelectorAll('#education .item')].map(x=>({title:x.querySelector('.etitle')?.value||'',school:x.querySelector('.eschool')?.value||'',year:x.querySelector('.eyear')?.value||''}));
    const d={};ids.forEach(id=>d[id]=$(id)?.value||'');d.experience=experience;d.education=education;d.template=window.tpl||'classic';return d;
  };
  const save=()=>{try{const email=($('email')?.value||'').trim().toLowerCase()||sessionStorage.getItem('cvgo_user_email')||'anonymous';localStorage.setItem(KEY+'_'+email,JSON.stringify(readData()));}catch(e){}};
  const load=()=>{
    try{
      const email=($('email')?.value||'').trim().toLowerCase()||sessionStorage.getItem('cvgo_user_email')||'';
      if(!email)return;
      const raw=localStorage.getItem(KEY+'_'+email);if(!raw)return;
      const d=JSON.parse(raw);
      ids.forEach(id=>{if($(id)&&d[id]!=null)$(id).value=d[id]});
      const exp=$('experience'),edu=$('education');
      if(exp){exp.innerHTML='';window.expCount=0;(d.experience||[]).forEach(e=>{if(typeof window.addExp==='function')window.addExp();const x=[...exp.querySelectorAll('.item')].at(-1);if(x){x.querySelector('.ep').value=e.position||'';x.querySelector('.ec').value=e.company||'';x.querySelector('.ef').value=e.from||'';x.querySelector('.et').value=e.to||'';x.querySelector('.ed').value=e.description||''}});}
      if(edu){edu.innerHTML='';window.eduCount=0;(d.education||[]).forEach(e=>{if(typeof window.addEdu==='function')window.addEdu();const x=[...edu.querySelectorAll('.item')].at(-1);if(x){x.querySelector('.etitle').value=e.title||'';x.querySelector('.eschool').value=e.school||'';x.querySelector('.eyear').value=e.year||''}});}
      if(typeof window.render==='function')window.render();
      if(d.template&&typeof window.template==='function'){const buttons=[...document.querySelectorAll('.templateBtns button')];const map={classic:0,modern:1,minimal:2};const i=map[d.template];if(i!=null&&buttons[i])window.template(d.template,buttons[i]);}
    }catch(e){console.warn('CVGO restore failed',e)}
  };
  const rememberEmail=()=>{const email=($('email')?.value||'').trim().toLowerCase();if(email)sessionStorage.setItem('cvgo_user_email',email)};
  document.addEventListener('input',()=>{rememberEmail();clearTimeout(window._cvgoSaveTimer);window._cvgoSaveTimer=setTimeout(save,350)},true);
  window.addEventListener('beforeunload',save);
  const originalLoadUser=window.loadUser;
  if(typeof originalLoadUser==='function'){
    window.loadUser=async function(){const result=await originalLoadUser.apply(this,arguments);const r=await fetch('/api/me').then(x=>x.json()).catch(()=>({}));if(r.logged_in){sessionStorage.setItem('cvgo_user_email',r.email||'');setTimeout(load,80)}return result};
  }
  window.cvgoRestore=load;window.cvgoSave=save;
  setTimeout(()=>{const r=fetch('/api/me').then(x=>x.json()).catch(()=>({}));r.then(u=>{if(u.logged_in){sessionStorage.setItem('cvgo_user_email',u.email||'');load()}})},500);
})();
