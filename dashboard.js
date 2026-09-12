(function(){
'use strict';
var built=false;
function q(s){return document.querySelector(s)}
function fixHeader(){
 var h=q('header');if(!h)return;
 h.style.cssText+=';display:flex!important;align-items:center!important;gap:16px!important;justify-content:flex-start!important;position:sticky!important;top:0!important;z-index:100!important;min-height:72px!important;padding:0 34px!important;';
 var logo=h.querySelector('.logo');if(logo)logo.style.marginRight='auto';
 var status=q('#headerStatus');if(status){status.style.cssText+=';margin:0!important;white-space:nowrap!important;max-width:360px!important;overflow:hidden!important;text-overflow:ellipsis!important;';}
 var manage=q('#cvprofitManageBtn');if(manage&&manage.parentElement!==h)h.appendChild(manage);
 if(manage){manage.style.cssText+=';position:static!important;right:auto!important;top:auto!important;margin:0!important;white-space:nowrap!important;';}
 var pro=q('#cvgoProBtn');if(pro&&pro.parentElement!==h)h.appendChild(pro);
 if(pro){pro.style.cssText+=';position:static!important;margin:0!important;white-space:nowrap!important;';}
 var logout=q('#cvgoLogoutBtn');if(logout){logout.style.cssText+=';margin:0 0 0 2px!important;white-space:nowrap!important;';}
}
function fitPreview(){
 var box=q('.previewbox'),area=q('#preview');if(!box||!area)return;
 var cv=area.querySelector('.cv');if(!cv)return;
 if(window.innerWidth<=900){cv.style.zoom='';return}
 var base=794,available=Math.max(280,area.clientWidth-8),scale=Math.min(1,available/base);
 cv.style.zoom=scale.toFixed(3);
}
function openTab(name){if(typeof window.tab!=='function')return;var btn=[...document.querySelectorAll('.tab')].find(function(b){return b.textContent.trim().toLowerCase()===name});window.tab(name==='carta'?'cover':name==='entrevista'?'interview':'cv',btn);setTimeout(fitPreview,40)}
function focusOffer(){var el=[...document.querySelectorAll('textarea,input')].find(function(x){return /oferta/i.test(x.placeholder||'')||x.id==='job'});if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.focus()}}
function build(){
 var main=q('#main'),app=q('.app');
 fixHeader();
 if(!main||!app||main.classList.contains('hidden'))return false;
 document.body.classList.add('cvgo-dashboard');
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
 document.querySelectorAll('[data-go]').forEach(function(b){if(b.dataset.dashBound)return;b.dataset.dashBound='1';b.addEventListener('click',function(){var a=b.dataset.go;document.querySelectorAll('.dash-nav button').forEach(function(n){n.classList.toggle('active',n.dataset.go===a)});if(a==='inicio')window.scrollTo({top:0,behavior:'smooth'});else if(a==='oferta')focusOffer();else openTab(a)})});
 var hs=q('#headerStatus'),du=q('#dashUserEmail');if(hs&&du&&/@/.test(hs.textContent))du.textContent=hs.textContent.trim();
 fitPreview();
 built=true;return true;
}
function boot(){fixHeader();if(build())return;if(!built)setTimeout(boot,250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('load',boot);
window.addEventListener('resize',fitPreview);
var observer=new MutationObserver(function(){fixHeader();if(!built)boot();fitPreview()});
if(document.documentElement)observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
})();