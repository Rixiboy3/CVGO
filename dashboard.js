(function(){
'use strict';
var built=false;
function q(s){return document.querySelector(s)}
function fixHeader(){
 var h=q('header');if(!h)return;
 h.style.cssText+=';display:flex!important;align-items:center!important;gap:16px!important;justify-content:flex-start!important;position:sticky!important;top:0!important;z-index:1000!important;min-height:72px!important;padding:0 34px!important;';
 var logo=h.querySelector('.logo');if(logo)logo.style.marginRight='auto';
 var status=q('#headerStatus');if(status)status.style.cssText+=';margin:0!important;white-space:nowrap!important;max-width:360px!important;overflow:hidden!important;text-overflow:ellipsis!important;';
 var manage=q('#cvprofitManageBtn');if(manage&&manage.parentElement!==h)h.appendChild(manage);
 if(manage)manage.style.cssText+=';position:static!important;right:auto!important;top:auto!important;margin:0!important;white-space:nowrap!important;';
 var pro=q('#cvgoProBtn');if(pro&&pro.parentElement!==h)h.appendChild(pro);
 if(pro)pro.style.cssText+=';position:static!important;margin:0!important;white-space:nowrap!important;';
 var logout=q('#cvgoLogoutBtn');if(logout)logout.style.cssText+=';margin:0 0 0 2px!important;white-space:nowrap!important;';
}
function fitPreview(){
 var box=q('.previewbox'),area=q('#preview');if(!box||!area)return;
 var cv=area.querySelector('.cv');if(!cv)return;
 if(window.innerWidth<=900){cv.style.zoom='';return}
 var available=Math.max(280,area.clientWidth-8),scale=Math.min(1,available/794);
 cv.style.zoom=scale.toFixed(3);
}
function getTabButton(name){
 var label=name==='cv'?'cv':name==='carta'||name==='oferta'?'carta':'entrevista';
 return [...document.querySelectorAll('.tab')].find(function(b){return b.textContent.trim().toLowerCase()===label});
}
function setTabDirect(name){
 var target=name==='cv'?'cvTab':name==='carta'||name==='oferta'?'coverTab':'interviewTab';
 ['cvTab','coverTab','interviewTab'].forEach(function(id){var el=q('#'+id);if(el)el.classList.toggle('hidden',id!==target)});
 document.querySelectorAll('.tab').forEach(function(b){var t=b.textContent.trim().toLowerCase();var active=(target==='cvTab'&&t==='cv')||(target==='coverTab'&&t==='carta')||(target==='interviewTab'&&t==='entrevista');b.classList.toggle('active',active)});
}
function openTab(name){
 setTabDirect(name);
 if(typeof window.tab==='function'){try{window.tab(name==='cv'?'cv':name==='carta'||name==='oferta'?'cover':'interview',getTabButton(name))}catch(e){}}
 setTabDirect(name);
 if(name==='oferta')focusOffer();
 setTimeout(function(){fitPreview();window.scrollTo({top:0,behavior:'smooth'})},60);
}
function focusOffer(){
 var el=q('#job')||[...document.querySelectorAll('textarea,input')].find(function(x){return /oferta/i.test(x.placeholder||'')});
 if(el){el.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(function(){try{el.focus({preventScroll:true})}catch(e){el.focus()}},180)}
}
function ensureBack(){
 var main=q('#main');if(!main)return null;
 var back=q('#cvgoMobileBack');
 if(!back){back=document.createElement('button');back.id='cvgoMobileBack';back.type='button';back.textContent='← Volver al inicio';back.addEventListener('click',mobileHome);main.insertBefore(back,main.firstElementChild)}
 return back;
}
function ensureMobileEditorUI(){
 var main=q('#main');if(!main)return null;
 var bar=q('#cvgoMobileEditorBar');
 if(!bar){
  bar=document.createElement('div');bar.id='cvgoMobileEditorBar';bar.innerHTML='<div class="mbar-title"><span id="cvgoMobileEditorIcon">📄</span><div><b id="cvgoMobileEditorTitle">Mi CV</b><small id="cvgoMobileEditorSub">Edita tu información</small></div></div><div class="mbar-actions"><button type="button" id="cvgoMobileSave">Guardar</button><button type="button" id="cvgoMobilePreviewToggle">Vista previa</button></div>';
  main.insertBefore(bar,main.firstElementChild);
  bar.querySelector('#cvgoMobileSave').addEventListener('click',async function(){var b=this;b.disabled=true;b.textContent='Guardando…';try{if(typeof window.cvgoServerSave==='function')await window.cvgoServerSave()}finally{b.disabled=false;b.textContent='Guardar'}});
  bar.querySelector('#cvgoMobilePreviewToggle').addEventListener('click',function(){document.body.classList.toggle('cvgo-mobile-preview');var on=document.body.classList.contains('cvgo-mobile-preview');this.textContent=on?'Ocultar vista':'Vista previa';var p=q('.previewbox');if(p)p.style.display=on?'block':'none';if(on)setTimeout(fitPreview,50)});
 }
 if(!q('#cvgoMobileEditorStyle')){
  var style=document.createElement('style');style.id='cvgoMobileEditorStyle';style.textContent='@media(max-width:650px){#cvgoMobileEditorBar{display:none;align-items:center;justify-content:space-between;gap:10px;padding:11px 12px;margin:10px 0 8px;background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 5px 18px rgba(16,24,40,.06)}body.cvgo-dashboard.cvgo-mobile-work #cvgoMobileEditorBar{display:flex}.mbar-title{display:flex;align-items:center;gap:9px;min-width:0}.mbar-title>span{width:34px;height:34px;border-radius:10px;background:#eaf2ff;display:grid;place-items:center;flex:0 0 auto}.mbar-title b{display:block;font-size:13px;color:#172b4d}.mbar-title small{display:block;font-size:10px;color:#667085;margin-top:2px}.mbar-actions{display:flex;gap:6px;flex:0 0 auto}.mbar-actions button{border:1px solid #d7dfeb;background:#fff;color:#172b4d;border-radius:9px;padding:8px 9px;font-size:11px;font-weight:800}.mbar-actions button:first-child{background:#2563eb;border-color:#2563eb;color:#fff}.mbar-actions button:disabled{opacity:.6}body.cvgo-dashboard.cvgo-mobile-work .tabs{display:none!important}body.cvgo-dashboard.cvgo-mobile-work .section{margin-bottom:22px}body.cvgo-dashboard.cvgo-mobile-work .section h2{font-size:16px!important;margin-bottom:11px!important}body.cvgo-dashboard.cvgo-mobile-work .field{margin-bottom:10px}body.cvgo-dashboard.cvgo-mobile-work .field input,body.cvgo-dashboard.cvgo-mobile-work .field textarea{font-size:16px!important;min-height:44px!important;padding:11px 12px!important}body.cvgo-dashboard.cvgo-mobile-work .field textarea{min-height:105px!important}body.cvgo-dashboard.cvgo-mobile-work .item{padding:12px!important;margin-bottom:9px!important}body.cvgo-dashboard.cvgo-mobile-work .grid{grid-template-columns:1fr!important;gap:0!important}body.cvgo-dashboard.cvgo-mobile-work .actions{display:grid!important;grid-template-columns:1fr!important;gap:8px!important;margin-top:18px!important}body.cvgo-dashboard.cvgo-mobile-work .actions button{width:100%!important;padding:12px!important}body.cvgo-dashboard.cvgo-mobile-work .previewbox{overflow:hidden!important}body.cvgo-dashboard.cvgo-mobile-work #preview .cv{width:100%!important;min-width:0!important;max-width:100%!important;box-sizing:border-box!important;transform:none!important;zoom:1!important}.mbar-actions button:last-child{background:#f5f8ff}}';document.head.appendChild(style);
 }
 return bar;
}
function setMobileEditorState(name){
 var bar=ensureMobileEditorUI();if(!bar)return;
 var title=q('#cvgoMobileEditorTitle'),sub=q('#cvgoMobileEditorSub'),icon=q('#cvgoMobileEditorIcon'),toggle=q('#cvgoMobilePreviewToggle');
 var map={cv:['Mi CV','Edita tu currículum','📄'],carta:['Carta de presentación','Crea una carta adaptada','✉️'],oferta:['Analizar oferta','Comprueba la compatibilidad','🎯'],entrevista:['Simulador de entrevista','Prepárate antes de la entrevista','🎙️']};
 var m=map[name]||map.cv;if(title)title.textContent=m[0];if(sub)sub.textContent=m[1];if(icon)icon.textContent=m[2];
 document.body.classList.remove('cvgo-mobile-preview');if(toggle){toggle.style.display=name==='cv'?'block':'none';toggle.textContent='Vista previa'}
}
function mobileHome(){
 if(window.innerWidth>650)return;
 document.body.classList.remove('cvgo-mobile-work','cvgo-mobile-preview');
 var panel=q('.panel'),preview=q('.previewbox'),top=q('.dash-top'),quick=q('.dash-quick'),tip=q('.dash-tip'),side=q('.dash-sidebar'),back=ensureBack(),bar=ensureMobileEditorUI();
 if(panel)panel.style.display='none';
 if(preview)preview.style.display='none';
 if(top)top.style.display='';
 if(quick)quick.style.display='';
 if(tip)tip.style.display='';
 if(side)side.style.display='none';
 if(back)back.style.display='none';
 if(bar)bar.style.display='none';
 setTabDirect('cv');
 document.querySelectorAll('.dash-nav button').forEach(function(n){n.classList.toggle('active',n.dataset.go==='inicio')});
 window.scrollTo({top:0,behavior:'smooth'});
}
function mobileWork(name){
 if(window.innerWidth>650)return;
 var showPreview=name==='cv';
 document.body.classList.add('cvgo-mobile-work');
 document.body.classList.remove('cvgo-mobile-preview');
 var panel=q('.panel'),preview=q('.previewbox'),top=q('.dash-top'),quick=q('.dash-quick'),tip=q('.dash-tip'),side=q('.dash-sidebar'),back=ensureBack();
 if(top)top.style.display='none';
 if(quick)quick.style.display='none';
 if(tip)tip.style.display='none';
 if(side)side.style.display='none';
 if(panel){panel.style.display='block';panel.style.width='100%';}
 if(preview){preview.style.display=showPreview?'block':'none';preview.style.width='100%';}
 if(back)back.style.display='block';
 setMobileEditorState(name);
 openTab(name);
 if(name==='cv'&&showPreview){var toggle=q('#cvgoMobilePreviewToggle');if(toggle)toggle.textContent='Ocultar vista';document.body.classList.add('cvgo-mobile-preview');}
}
function bind(){
 document.querySelectorAll('[data-go]').forEach(function(b){if(b.dataset.dashBound)return;b.dataset.dashBound='1';b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var a=b.dataset.go;document.querySelectorAll('.dash-nav button').forEach(function(n){n.classList.toggle('active',n.dataset.go===a)});if(a==='inicio')mobileHome();else mobileWork(a)})});
}
function build(){
 var main=q('#main'),app=q('.app');fixHeader();
 if(!main||!app||main.classList.contains('hidden'))return false;
 document.body.classList.add('cvgo-dashboard');
 var auth=q('#auth');if(auth){auth.classList.add('hidden');auth.style.setProperty('display','none','important')}
 main.classList.remove('hidden');main.style.setProperty('display','block','important');
 if(!q('.dash-sidebar')){
  var side=document.createElement('aside');side.className='dash-sidebar';side.innerHTML='<div class="dash-brand"><div class="dash-brand-icon">CV</div><div><b>CVProfit</b><small>CV, más oportunidades</small></div></div><nav class="dash-nav"><button class="active" data-go="inicio"><i>⌂</i><span>Inicio<small>Panel principal</small></span></button><button data-go="cv"><i>▣</i><span>Mi CV<small>Crea y edita tu currículum</small></span></button><button data-go="carta"><i>✦</i><span>Carta de presentación<small>Genera cartas personalizadas</small></span></button><button data-go="entrevista"><i>◉</i><span>Simulador de entrevista<small>Prepárate con IA</small></span></button><button data-go="oferta"><i>⌕</i><span>Analizar oferta<small>Adapta tu CV al puesto</small></span></button></nav><div class="dash-pro"><div class="pro-title">✨ Saca todo el partido a CVProfit</div><p>Tu CV, cartas, entrevistas y análisis ATS en un solo lugar.</p><button data-go="cv">Continuar con mi CV →</button></div><div class="dash-quote">“Un mejor CV te acerca a un mejor futuro”<br><br>— CVProfit</div>';
  main.insertBefore(side,app);
 }
 if(!q('.dash-top')){
  var top=document.createElement('div');top.className='dash-top';top.innerHTML='<div class="dash-welcome"><h1>Hola, bienvenido a CVProfit 👋</h1><p>Crea, optimiza y presenta tu perfil profesional con una imagen impecable.</p></div><div class="dash-user"><div class="dash-avatar">CV</div><div><b id="dashUserEmail">Tu cuenta CVProfit</b><small>Sesión activa</small></div></div>';
  app.insertBefore(top,app.firstChild);
 }
 if(!q('.dash-quick')){
  var quick=document.createElement('div');quick.className='dash-quick';quick.innerHTML='<button class="q1" data-go="cv"><span class="qicon">📄</span><span><b>Crear CV</b><small>Diseña tu currículum profesional</small></span><strong>→</strong></button><button class="q2" data-go="carta"><span class="qicon">✉️</span><span><b>Carta de presentación</b><small>Genera una carta personalizada</small></span><strong>→</strong></button><button class="q3" data-go="entrevista"><span class="qicon">🎙️</span><span><b>Simulador de entrevista</b><small>Practica con IA antes de tu entrevista</small></span><strong>→</strong></button><button class="q4" data-go="oferta"><span class="qicon">🎯</span><span><b>Analizar oferta</b><small>Optimiza tu CV para una oferta de empleo</small></span><strong>→</strong></button>';
  app.insertBefore(quick,app.firstChild.nextSibling);
 }
 if(!q('.dash-tip')){var tip=document.createElement('div');tip.className='dash-tip';tip.innerHTML='💡 <b>Consejo:</b> completa primero tu experiencia y habilidades. Después utiliza la IA para adaptar tu CV a cada oferta.';app.insertBefore(tip,app.querySelector('.panel'))}
 ensureBack();ensureMobileEditorUI();bind();
 var hs=q('#headerStatus'),du=q('#dashUserEmail');if(hs&&du&&/@/.test(hs.textContent))du.textContent=hs.textContent.trim();
 if(window.innerWidth<=650)mobileHome();else{var p=q('.panel'),v=q('.previewbox'),s=q('.dash-sidebar'),b=q('#cvgoMobileEditorBar');if(p)p.style.display='';if(v)v.style.display='';if(s)s.style.display='';if(b)b.style.display='none';}
 fitPreview();built=true;return true;
}
function boot(){fixHeader();if(build())return;if(!built)setTimeout(boot,250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('load',boot);
window.addEventListener('resize',function(){if(window.innerWidth>650){document.body.classList.remove('cvgo-mobile-work','cvgo-mobile-preview');var b=q('#cvgoMobileBack'),bar=q('#cvgoMobileEditorBar');if(b)b.style.display='none';if(bar)bar.style.display='none';var p=q('.panel'),v=q('.previewbox'),s=q('.dash-sidebar');if(p)p.style.display='';if(v)v.style.display='';if(s)s.style.display='';}else if(built&&!document.body.classList.contains('cvgo-mobile-work'))mobileHome();fitPreview()});
var observer=new MutationObserver(function(){fixHeader();if(!built)boot();fitPreview()});
if(document.documentElement)observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
})();