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
})();
