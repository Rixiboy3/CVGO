(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  let loaded=false;
  let running=false;

  // Recovery snapshot reconstructed from the last working CV screenshots.
  // It is only used when the server returns an empty CV for the signed-in account.
  const RECOVERY_EMAIL='smokecentral45@gmail.com';
  const RECOVERY={
    name:'Manuel Marco',
    role:'Delegado Comercial | Captación y desarrollo de negocio',
    email:'smokecentral45@gmail.com',
    phone:'600600600',
    city:'Sevilla',
    linkedin:'',
    summary:'Delegado Comercial con experiencia en ventas, gestión de clientes y desarrollo de negocio. Especializado en los últimos años en iluminación técnica y soluciones LED, con experiencia en gestión territorial en Andalucía Occidental, captación y fidelización de clientes, visitas comerciales, negociación, asesoramiento y gestión de proyectos. Acostumbrado a detectar oportunidades, elaborar y presentar ofertas y acompañar al cliente durante el proceso de venta con soluciones adaptadas a sus necesidades.',
    skills:'Negociación y cierre de ventas; Desarrollo de negocio; Captación y fidelización de clientes; Asesoramiento técnico-comercial; Gestión de proyectos de iluminación; Orientación a resultados; Comunicación y negociación; Conocimiento especializado en iluminación y soluciones LED',
    experience:[
      {position:'Delegado Comercial',company:'Frepi Lighting',from:'',to:'',description:'Gestiono y desarrollo la cartera de clientes en Andalucía Occidental. Capto nuevos clientes y genero oportunidades de negocio en la zona asignada. Realizo visitas comerciales a distribuidores, instaladores, ingenierías, constructoras y estudios de arquitectura. Detecto necesidades y proporciono asesoramiento técnico-comercial especializado en soluciones de iluminación. Gestiono proyectos de iluminación desde la detección de necesidades hasta su ejecución. Elaboro, presento y realizo el seguimiento de ofertas y presupuestos. Negocio condiciones comerciales y desarrollo acciones de fidelización de clientes. Realizo el seguimiento de objetivos de venta, el análisis de mercado y el desarrollo estratégico de la zona.'}
    ],
    education:[{title:'FP Superior Comercio Internacional',school:'FESAC',year:''}],
    template:'classic',photo:''
  };

  function addLogout(email){
    const header=document.querySelector('header');
    if(!header)return;
    let b=$('cvgoLogoutBtn');
    if(!b){
      b=document.createElement('button');b.id='cvgoLogoutBtn';b.type='button';b.textContent='Cerrar sesión';
      b.style.cssText='margin-left:16px;border:0;background:#111827;color:#fff;border-radius:9px;padding:8px 14px;cursor:pointer;font-size:12px;font-weight:700;box-shadow:0 2px 8px rgba(16,24,40,.12)';
      b.onclick=async()=>{try{await fetch('/api/logout',{method:'POST',credentials:'same-origin'})}catch(e){}try{sessionStorage.removeItem('cvgo_user_email')}catch(e){}location.reload()};header.appendChild(b);
    }
    if(email){const s=$('headerStatus');if(s)s.textContent=email;try{sessionStorage.setItem('cvgo_user_email',email)}catch(e){}}
  }

  function apply(d){
    if(!d||typeof d!=='object')return false;
    let changed=false;
    ['name','role','email','phone','city','linkedin','summary','skills'].forEach(id=>{const e=$(id);if(e&&d[id]!=null){e.value=d[id];changed=true;}});
    const exp=$('experience'),edu=$('education');
    const ex=(d.experience||[]).filter(x=>x&&Object.values(x).some(v=>String(v||'').trim()));
    const ed=(d.education||[]).filter(x=>x&&Object.values(x).some(v=>String(v||'').trim()));
    if(exp&&typeof window.addExp==='function'){
      exp.innerHTML='';window.expCount=0;(ex.length?ex:[{}]).forEach(x=>{window.addExp();const item=exp.lastElementChild;if(!item)return;[['.ep',x.position],['.ec',x.company],['.ef',x.from],['.et',x.to],['.ed',x.description]].forEach(([s,v])=>{const e=item.querySelector(s);if(e)e.value=v||''});});
    }
    if(edu&&typeof window.addEdu==='function'){
      edu.innerHTML='';window.eduCount=0;(ed.length?ed:[{}]).forEach(x=>{window.addEdu();const item=edu.lastElementChild;if(!item)return;[['.etitle',x.title],['.eschool',x.school],['.eyear',x.year]].forEach(([s,v])=>{const e=item.querySelector(s);if(e)e.value=v||''});});
    }
    if(d.photo){if(typeof window.cvgoSetPhoto==='function')window.cvgoSetPhoto(d.photo);else window.cvgoPhotoData=d.photo;}
    if(d.template&&typeof window.template==='function'){const b=[...document.querySelectorAll('.templateBtns button')],i={classic:0,modern:1,minimal:2}[d.template];if(b[i])window.template(d.template,b[i]);}
    if(typeof window.render==='function')window.render();
    return changed;
  }

  async function saveRecovery(){
    try{
      const r=await fetch('/api/cv',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(RECOVERY)});
      return r.ok;
    }catch(e){return false;}
  }

  async function boot(){
    if(loaded||running)return;
    const main=$('main');
    if(!main||main.classList.contains('hidden'))return;
    running=true;
    try{
      const me=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'}).then(r=>r.json());
      if(!me.logged_in){running=false;return;}
      addLogout(me.email||'');
      const r=await fetch('/api/cv',{credentials:'same-origin',cache:'no-store'});
      let hasData=false;
      if(r.ok){
        const j=await r.json();
        hasData=!!(j.ok&&j.data&&Object.keys(j.data).length);
        if(hasData){
          if($('name')&&typeof window.addExp==='function'){apply(j.data);loaded=true;}
          else {setTimeout(boot,700);}
        }else if(String(me.email||'').toLowerCase()===RECOVERY_EMAIL){
          if($('name')&&typeof window.addExp==='function'){
            apply(RECOVERY);
            await saveRecovery();
            loaded=true;
          }else{setTimeout(boot,700);}
        }else loaded=true;
      }else loaded=true;
    }catch(e){}
    finally{running=false;}
  }

  function start(){boot();[300,800,1500,2500,4000,6000].forEach(ms=>setTimeout(boot,ms));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  const observer=new MutationObserver(()=>{if(!loaded)boot();});
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
})();
