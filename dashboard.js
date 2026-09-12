(function(){
'use strict';
var built=false;
function q(s){return document.querySelector(s)}
function fixPublicMobile(){
 if(q('#cvgoPublicMobileFix'))return;
 var auth=q('#auth'),main=q('#main');
 if(!auth||!main||!auth.classList.contains('hidden')){
  var style=document.createElement('style');style.id='cvgoPublicMobileFix';style.textContent='@media(max-width:650px){body:not(.cvgo-dashboard){display:flex!important;flex-direction:column!important;min-height:100vh!important}body:not(.cvgo-dashboard)>header{order:0!important;flex:0 0 auto!important}body:not(.cvgo-dashboard)>#auth{order:1!important;width:100%!important;max-width:430px!important;margin:8px auto 16px!important;padding:16px!important}body:not(.cvgo-dashboard)>#cvgoLanding{order:2!important;width:100%!important;margin:0 auto 24px!important}body:not(.cvgo-dashboard)>#main{order:3!important;width:100%!important}body:not(.cvgo-dashboard) #cvgoAuthPitch{display:none!important}body:not(.cvgo-dashboard) #auth .card{padding:24px 20px!important}body:not(.cvgo-dashboard) #auth h1{font-size:28px!important;margin-bottom:8px!important}body:not(.cvgo-dashboard) #authText{margin-top:0!important;line-height:1.45!important}}';document.head.appendChild(style);
 }
}
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
function mobileWork(name){
 if(window.innerWidth>650)return;
 document.body.classList.add('cvgo-mobile-work');
 var main=q('#main'),panel=q('.panel'),preview=q('.previewbox'),top=q('.dash-top'),quick=q('.dash-quick'),tip=q('.dash-tip'),side=q('.dash-sidebar');
 if(top)top.style.display='none';if(quick)quick.style.display='none';if(tip)tip.style.display='none';
 if(side)side.style.display='none';
 if(panel){panel.style.display='block';panel.style.width='100%';}
 if(preview){preview.style.display='block';preview.style.width='100%';}
 var back=q('#cvgoMobileBack');
 if(!back&&main){back=document.createElement('button');back.id='cvgoMobileBack';back.type='button';back.textContent='← Volver al inicio';back.onclick=function(){mobileHome()};main.insertBefore(back,main.firstElementChild)}
 if(back)back.style.display='block';
 openTab(name);
 setTimeout(function(){if(panel)panel.scrollIntoView({behavior:'smooth',block:'start'})},60);
}
function mobileHome(){
 if(window.innerWidth>650)return;
 document.body.classList.remove('cvgo-mobile-work');
 var panel=q('.panel'),preview=q('.previewbox'),top=q('.dash-top'),quick=q('.dash-quick'),tip=q('.dash-tip'),side=q('.dash-sidebar'),back=q('#cvgoMobileBack');
 if(panel)panel.style.display='none';if(preview)preview.style.display='none';
 if(top)top.style.display='flex';if(quick)quick.style.display='grid';if(tip)tip.style.display='block';if(side)side.style.display='block';
 if(back)back.style.display='none';
 window.scrollTo({top:0,behavior:'smooth'});
}
function buildMobile(){
 if(window.innerWidth>650)return;
 var main=q('#main'),panel=q('.panel');if(!main||!panel||main.classList.contains('hidden'))return;
 if(!q('#cvgoMobileStyle')){
  var style=document.createElement('style');style.id='cvgoMobileStyle';style.textContent=`
@media(max-width:650px){
 body.cvgo-dashboard{overflow-x:hidden;background:#f5f8fc}
 body.cvgo-dashboard header{height:64px!important;min-height:64px!important;padding:0 16px!important;position:sticky!important;top:0!important;z-index:1000!important;gap:8px!important}
 body.cvgo-dashboard header .logo{font-size:22px!important}
 body.cvgo-dashboard #headerStatus{display:none!important}
 body.cvgo-dashboard #cvgoLogoutBtn{font-size:12px!important;padding:9px 11px!important;margin-left:auto!important}
 body.cvgo-dashboard #cvgoProBtn,body.cvgo-dashboard #cvprofitManageBtn{display:none!important}
 body.cvgo-dashboard .app{display:block!important;padding:0 14px 35px!important;margin:0!important;width:100%!important;max-width:none!important}
 body.cvgo-dashboard .dash-sidebar{position:static!important;display:block!important;width:calc(100% + 28px)!important;margin:0 -14px!important;padding:12px 12px 10px!important;background:#101a2c!important;border-radius:0 0 18px 18px!important}
 body.cvgo-dashboard .dash-brand{display:flex!important;padding:2px 8px 12px!important;margin:0 0 10px!important}
 body.cvgo-dashboard .dash-nav{display:flex!important;overflow-x:auto!important;gap:7px!important;padding:0 2px 3px!important;scrollbar-width:none!important;-webkit-overflow-scrolling:touch!important}
 body.cvgo-dashboard .dash-nav::-webkit-scrollbar{display:none}
 body.cvgo-dashboard .dash-nav button{flex:0 0 auto!important;min-width:106px!important;width:auto!important;min-height:58px!important;padding:9px 11px!important;display:block!important;text-align:left!important;border-radius:11px!important}
 body.cvgo-dashboard .dash-nav button i{display:block!important;width:auto!important;font-size:15px!important;margin-bottom:2px!important}
 body.cvgo-dashboard .dash-nav button span{font-size:11px!important;white-space:nowrap!important}.dash-nav button small{font-size:9px!important;white-space:nowrap!important}
 body.cvgo-dashboard .dash-pro,body.cvgo-dashboard .dash-quote{display:none!important}
 body.cvgo-dashboard .dash-top{display:flex!important;margin:20px 0 14px!important}
 body.cvgo-dashboard .dash-welcome h1{font-size:22px!important;line-height:1.15!important}.dash-welcome p{font-size:12px!important}
 body.cvgo-dashboard .dash-user{display:none!important}
 body.cvgo-dashboard .dash-quick{display:grid!important;grid-template-columns:1fr!important;gap:10px!important;margin:0!important}
 body.cvgo-dashboard .dash-quick button{min-height:72px!important;padding:13px!important;border-radius:14px!important}
 body.cvgo-dashboard .dash-tip{margin:10px 0 0!important;font-size:11px!important;padding:11px 13px!important}
 body.cvgo-dashboard .panel,body.cvgo-dashboard .previewbox{display:none!important}
 body.cvgo-dashboard #cvgoMobileBack{display:none;position:sticky;top:74px;z-index:90;width:100%;border:1px solid #dbe3ef;background:#fff;color:#172b4d;border-radius:11px;padding:11px 13px;margin:12px 0;font-weight:800;text-align:left;box-shadow:0 5px 15px rgba(16,24,40,.06)}
 body.cvgo-dashboard.cvgo-mobile-work #cvgoMobileBack{display:block!important}
 body.cvgo-dashboard.cvgo-mobile-work .panel{display:block!important;margin:0!important;padding:16px!important;border-radius:15px!important;box-shadow:0 6px 20px rgba(16,24,40,.06)!important}
 body.cvgo-dashboard.cvgo-mobile-work .previewbox{display:block!important;position:static!important;height:auto!important;margin:14px 0 0!important;padding:12px!important;border-radius:15px!important;overflow:hidden!important}
 body.cvgo-dashboard.cvgo-mobile-work #preview{width:100%!important;max-width:100%!important;overflow:hidden!important;display:block!important}
 body.cvgo-dashboard.cvgo-mobile-work #preview .cv{width:100%!important;min-width:0!important;max-width:100%!important;height:auto!important;min-height:0!important;transform:none!important;zoom:1!important;margin:0!important;padding:24px 20px!important;box-shadow:0 2px 12px rgba(0,0,0,.08)!important}
 body.cvgo-dashboard.cvgo-mobile-work .cv.modern{display:grid!important;grid-template-columns:31% 69%!important;padding:0!important}
 body.cvgo-dashboard.cvgo-mobile-work .cv.modern .side{padding:24px 13px!important}.cvgo-dashboard.cvgo-mobile-work .cv.modern .main{padding:24px 16px!important}
 body.cvgo-dashboard.cvgo-mobile-work .tabs{position:sticky!important;top:64px!important;z-index:80!important;margin:0 -4px 18px!important}
 body.cvgo-dashboard.cvgo-mobile-work .tab{font-size:11px!important;padding:10px 5px!important;white-space:nowrap!important}
 body.cvgo-dashboard.cvgo-mobile-work .grid{grid-template-columns:1fr!important}
 body.cvgo-dashboard.cvgo-mobile-work .field input,body.cvgo-dashboard.cvgo-mobile-work .field textarea{font-size:16px!important}
 body.cvgo-dashboard.cvgo-mobile-work .section{margin-bottom:23px!important}
 body.cvgo-dashboard.cvgo-mobile-work .item{padding:12px!important}
 body.cvgo-dashboard.cvgo-mobile-work .actions{display:grid!important;grid-template-columns:1fr!important}
 body.cvgo-dashboard.cvgo-mobile-work .templateBtns{display:grid!important;grid-template-columns:1fr!important}
 body.cvgo-dashboard.cvgo-mobile-work .cvgoImportCard{width:100%!important;max-width:100%!important}
}
`;
  document.head.appendChild(style);
 }
 if(!q('#cvgoMobileBack')){var b=document.createElement('button');b.id='cvgoMobileBack';b.type='button';b.textContent='← Volver al inicio';b.onclick=mobileHome;main.insertBefore(b,main.firstElementChild)}
 if(!document.body.classList.contains('cvgo-mobile-work'))mobileHome();
}
function bind(){
 document.querySelectorAll('[data-go]').forEach(function(b){if(b.dataset.dashBound)return;b.dataset.dashBound='1';b.addEventListener('click',function(){var a=b.dataset.go;document.querySelectorAll('.dash-nav button').forEach(function(n){n.classList.toggle('active',n.dataset.go===a)});if(a==='inicio')mobileHome();else if(a==='oferta')mobileWork('oferta');else mobileWork(a)})});
}
function build(){
 var main=q('#main'),app=q('.app');
 fixPublicMobile();fixHeader();
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
 bind();
 var hs=q('#headerStatus'),du=q('#dashUserEmail');if(hs&&du&&/@/.test(hs.textContent))du.textContent=hs.textContent.trim();
 buildMobile();
 fitPreview();
 built=true;return true;
}
function boot(){fixPublicMobile();fixHeader();if(build())return;if(!built)setTimeout(boot,250)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('load',boot);
window.addEventListener('resize',function(){if(window.innerWidth>650){var b=q('#cvgoMobileBack');if(b)b.style.display='none';document.body.classList.remove('cvgo-mobile-work');var p=q('.panel'),v=q('.previewbox'),t=q('.dash-top'),qq=q('.dash-quick'),tip=q('.dash-tip'),side=q('.dash-sidebar');if(p)p.style.display='';if(v)v.style.display='';if(t)t.style.display='';if(qq)qq.style.display='';if(tip)tip.style.display='';if(side)side.style.display='';}else{buildMobile();}fitPreview();});
var observer=new MutationObserver(function(){fixPublicMobile();fixHeader();if(!built)boot();bind();fitPreview();});
if(document.documentElement)observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
})();