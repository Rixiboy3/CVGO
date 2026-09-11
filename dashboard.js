(function(){
  function q(s){return document.querySelector(s)}
  function scrollToEditor(){const p=q('.panel');if(p)p.scrollIntoView({behavior:'smooth',block:'start'})}
  function focusOffer(){
    const candidates=[...document.querySelectorAll('textarea,input')];
    const el=candidates.find(x=>/oferta/i.test(x.placeholder||'')||x.id==='job');
    if(el){const cover=q('#coverTab');if(cover&&cover.classList.contains('hidden')&&typeof tab==='function'){const b=q('.tab');tab('cv',b)};el.scrollIntoView({behavior:'smooth',block:'center'});el.focus();return}
    scrollToEditor();
  }
  function openTab(name){if(typeof tab!=='function')return;const btn=[...document.querySelectorAll('.tab')].find(b=>b.textContent.trim().toLowerCase()===name);tab(name==='carta'?'cover':name==='entrevista'?'interview':'cv',btn);scrollToEditor()}
  function build(){
    if(!q('#main')||q('.dash-sidebar'))return;
    document.body.classList.add('cvgo-dashboard');
    const main=q('#main'), app=q('.app');
    if(!app)return;
    const side=document.createElement('aside');side.className='dash-sidebar';side.innerHTML=`
      <div class="dash-brand"><div class="dash-brand-icon">CV</div><div><b>CVProfit</b><small>Tu CV, más oportunidades</small></div></div>
      <nav class="dash-nav">
        <button class="active" data-go="inicio"><i>⌂</i><span>Inicio<small>Panel principal</small></span></button>
        <button data-go="cv"><i>▣</i><span>Mi CV<small>Crea y edita tu currículum</small></span></button>
        <button data-go="carta"><i>✦</i><span>Carta de presentación<small>Genera cartas personalizadas</small></span></button>
        <button data-go="entrevista"><i>◉</i><span>Simulador de entrevista<small>Prepárate con IA</small></span></button>
        <button data-go="oferta"><i>⌕</i><span>Analizar oferta<small>Adapta tu CV al puesto</small></span></button>
      </nav>
      <div class="dash-pro"><div class="pro-title">✨ Saca todo el partido a CVProfit</div><p>Tu CV, cartas, entrevistas y análisis ATS en un solo lugar.</p><button data-go="cv">Continuar con mi CV →</button></div>
      <div class="dash-quote">“Un mejor CV te acerca a un mejor futuro”<br><br>— CVProfit</div>`;
    main.insertBefore(side,app);

    const top=document.createElement('div');top.className='dash-top';top.innerHTML=`<div class="dash-welcome"><h1>Hola, bienvenido a CVProfit 👋</h1><p>Crea, optimiza y presenta tu perfil profesional con una imagen impecable.</p></div><div class="dash-user"><div class="dash-avatar">CV</div><div><b id="dashUserEmail">Tu cuenta CVProfit</b><small>Sesión activa</small></div></div>`;
    app.insertBefore(top,app.firstChild);

    const quick=document.createElement('div');quick.className='dash-quick';quick.innerHTML=`
      <button class="q1" data-go="cv"><span class="qicon">📄</span><span><b>Crear CV</b><small>Diseña tu currículum profesional</small></span><strong>→</strong></button>
      <button class="q2" data-go="carta"><span class="qicon">✉️</span><span><b>Carta de presentación</b><small>Genera una carta personalizada</small></span><strong>→</strong></button>
      <button class="q3" data-go="entrevista"><span class="qicon">🎙️</span><span><b>Simulador de entrevista</b><small>Practica con IA antes de tu entrevista</small></span><strong>→</strong></button>
      <button class="q4" data-go="oferta"><span class="qicon">🎯</span><span><b>Analizar oferta</b><small>Optimiza tu CV para una oferta de empleo</small></span><strong>→</strong></button>`;
    app.insertBefore(quick,app.firstChild.nextSibling);
    const tip=document.createElement('div');tip.className='dash-tip';tip.innerHTML='💡 <b>Consejo:</b> completa primero tu experiencia y habilidades. Después utiliza la IA para adaptar tu CV a cada oferta.';app.insertBefore(tip,app.querySelector('.panel'));

    const go=(action)=>{document.querySelectorAll('.dash-nav button').forEach(b=>b.classList.toggle('active',b.dataset.go===action));if(action==='inicio')window.scrollTo({top:0,behavior:'smooth'});else if(action==='cv')openTab('cv');else if(action==='carta')openTab('carta');else if(action==='entrevista')openTab('entrevista');else if(action==='oferta')focusOffer()};
    document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>go(b.dataset.go)));
    const email=q('#headerStatus');if(email&&email.textContent&&email.textContent.includes('@')){const u=q('#dashUserEmail');if(u)u.textContent=email.textContent}
  }
  function check(){if(q('#main')&&!q('#main').classList.contains('hidden'))build()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(check,80));else setTimeout(check,80);
  new MutationObserver(check).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class']});

  function ensureImporter(){
    if(q('#cvgoImport'))return;
    const s=document.createElement('script');s.src='/cvimport.js?v=7';s.dataset.cvgoImport='1';s.onerror=addInlineImporter;document.head.appendChild(s);
    setTimeout(()=>{if(!q('#cvgoImport'))addInlineImporter()},900);
  }
  function addInlineImporter(){
    if(q('#cvgoImport')||!q('#cvTab'))return;
    const box=document.createElement('div');box.id='cvgoImport';box.style.cssText='margin:0 0 22px;padding:18px;border:1px solid #dbe3ee;border-radius:14px;background:linear-gradient(135deg,#f8fbff,#fff)';
    box.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:15px"><div><h3 style="margin:0 0 5px;font-size:16px">📄 ¿Ya tienes un CV?</h3><p style="margin:0;color:#667085;font-size:12px;line-height:1.45">Sube tu PDF y CVProfit extraerá tus datos para rellenar automáticamente este nuevo CV.</p></div><button type="button" id="cvgoInlineImportBtn" style="border:0;background:#111827;color:#fff;border-radius:9px;padding:10px 14px;font-weight:800;cursor:pointer;white-space:nowrap">Importar mi CV</button></div><input id="cvgoInlineFile" type="file" accept="application/pdf,.pdf" hidden><div id="cvgoInlineMsg" style="margin-top:10px;font-size:12px"></div>';
    q('#cvTab').insertBefore(box,q('#cvTab').firstElementChild);
    const btn=q('#cvgoInlineImportBtn'),file=q('#cvgoInlineFile'),msg=q('#cvgoInlineMsg');
    btn.onclick=()=>file.click();
    file.onchange=async()=>{
      const f=file.files&&file.files[0];if(!f)return;btn.disabled=true;btn.style.opacity='.6';msg.textContent='⏳ Analizando tu CV...';msg.style.color='#667085';
      try{
        const fd=new FormData();fd.append('file',f);const r=await fetch('/api/cv-import',{method:'POST',body:fd,credentials:'same-origin'});const j=await r.json();if(!r.ok)throw j;
        if(!j.data){throw {error:'IMPORT_FAILED'}}
        if(!confirm('La información encontrada en tu PDF sustituirá los datos actuales de tu CV. ¿Quieres continuar?')){msg.textContent='Importación cancelada.';return}
        const d=j.data;['name','role','email','phone','city','linkedin','summary','skills'].forEach(k=>{const el=document.getElementById(k);if(el&&d[k]!=null){el.value=d[k];el.dispatchEvent(new Event('input',{bubbles:true}))}});
        const fill=(id,items,add,selectors)=>{const c=q('#'+id);if(!c)return;c.innerHTML='';(items||[]).forEach(x=>{add();const a=[...document.querySelectorAll('#'+id+' .item')].at(-1);if(!a)return;selectors.forEach(([s,k])=>{const el=a.querySelector(s);if(el){el.value=x[k]||'';el.dispatchEvent(new Event('input',{bubbles:true))}})});if(!items||!items.length)add()};
        fill('experience',d.experience,()=>typeof addExp==='function'&&addExp(),[['.ep','position'],['.ec','company'],['.ef','from'],['.et','to'],['.ed','description']]);
        fill('education',d.education,()=>typeof addEdu==='function'&&addEdu(),[['.etitle','title'],['.eschool','school'],['.eyear','year']]);
        if(typeof render==='function')render();if(typeof window.cvgoServerSave==='function')await window.cvgoServerSave();
        msg.textContent='✓ CV importado y guardado. Revisa los datos antes de descargarlo.';msg.style.color='#067647';
      }catch(e){msg.textContent=e.error==='PDF_ONLY'?'⚠ Solo puedes subir un PDF.':e.error==='FILE_TOO_LARGE'?'⚠ El PDF supera los 8 MB.':e.error==='PDF_NO_TEXT'?'⚠ No se ha podido leer texto del PDF.':'⚠ No hemos podido importar el CV. Comprueba el archivo e inténtalo de nuevo.';msg.style.color='#b42318'}
      finally{btn.disabled=false;btn.style.opacity='1';file.value=''}
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(ensureImporter,180),{once:true});
  else setTimeout(ensureImporter,180);
})();
