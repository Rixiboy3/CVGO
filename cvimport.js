(function(){
  'use strict';

  /* CVProfit: ajustes de impresión + comportamiento de la landing pública. */
  function installPrint(){
    if(document.getElementById('cvgoPrintFix'))return;
    const s=document.createElement('style');
    s.id='cvgoPrintFix';
    s.textContent=`
@page{size:A4 portrait;margin:0!important}
@media print{
 html,body{margin:0!important;padding:0!important;background:#fff!important;width:210mm!important;min-width:210mm!important;max-width:210mm!important;overflow:visible!important}
 body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
 body>header,body>#auth,body>#cvgoMobileEditorBar,body>#cvgoLegalFooter{display:none!important}
 #main{display:block!important;position:static!important;width:210mm!important;min-width:210mm!important;max-width:210mm!important;margin:0!important;padding:0!important;overflow:visible!important}
 #main .dash-sidebar,#main .dash-top,#main .dash-quick,#main .dash-tip,#main .panel,#main #cvgoMobileBack,#main .tabs,#main .trial,#main .actions,#main .score{display:none!important}
 #main .app{display:block!important;width:210mm!important;min-width:210mm!important;max-width:210mm!important;margin:0!important;padding:0!important;overflow:visible!important}
 #main .previewbox{display:block!important;width:210mm!important;min-width:210mm!important;max-width:210mm!important;height:auto!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:visible!important;position:static!important;background:#fff!important}
 #main .previewbox>h3,#main .previewbox:after{display:none!important}
 #preview{display:block!important;width:210mm!important;min-width:210mm!important;max-width:210mm!important;margin:0!important;padding:0!important;overflow:visible!important}
 #preview .cv,#preview .tm{display:block!important;width:210mm!important;min-width:210mm!important;max-width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;margin:0!important;padding:12mm 14mm!important;box-sizing:border-box!important;overflow:hidden!important;transform:none!important;zoom:1!important;box-shadow:none!important;break-after:avoid-page!important;page-break-after:avoid!important}
 #preview .cv *,#preview .tm *{box-sizing:border-box!important;max-width:100%!important}
 #preview .cv:not(.modern):not(.minimal) h1{font-size:27px!important;margin-bottom:3px!important}
 #preview .cv:not(.modern):not(.minimal) .role{font-size:13px!important;margin-bottom:8px!important}
 #preview .cv:not(.modern):not(.minimal) .contact{font-size:8.5px!important;padding-bottom:9px!important;border-bottom-width:1px!important}
 #preview .cv:not(.modern):not(.minimal) .cvsec{margin-top:11px!important}
 #preview .cv:not(.modern):not(.minimal) .cvsec h3{font-size:10px!important;margin-bottom:5px!important}
 #preview .cv:not(.modern):not(.minimal) .cvsec p{font-size:9.2px!important;line-height:1.32!important}
 #preview .cv:not(.modern):not(.minimal) .cvjob{margin-bottom:7px!important}
 #preview .cv:not(.modern):not(.minimal) .cvjob .line{font-size:9.2px!important}
 #preview .cv:not(.modern):not(.minimal) .cvjob .desc{font-size:8.2px!important;line-height:1.28!important;margin-top:2px!important}
 #preview .cv.modern{display:grid!important;grid-template-columns:58mm minmax(0,1fr)!important;padding:0!important}
 #preview .cv.modern .side{padding:12mm 6mm!important}
 #preview .cv.modern .main{padding:12mm 9mm!important}
 #preview .cv.minimal{padding:14mm!important}
}
`;
    document.head.appendChild(s);
  }

  function preparePrint(){
    installPrint();
    const main=document.getElementById('main');
    if(!main||!document.querySelector('#preview .cv,#preview .tm'))return;
    document.querySelectorAll('body>*').forEach(function(el){
      if(el!==main){el.dataset.cvgoPrintHidden=el.style.display||'';el.style.setProperty('display','none','important');}
    });
    main.dataset.cvgoPrintDisplay=main.style.display||'';
    main.style.setProperty('display','block','important');
    main.querySelectorAll('.dash-sidebar,.dash-top,.dash-quick,.dash-tip,.panel,#cvgoMobileBack,#cvgoMobileEditorBar').forEach(function(el){el.dataset.cvgoPrintHidden=el.style.display||'';el.style.setProperty('display','none','important');});
  }

  function restorePrint(){
    document.querySelectorAll('[data-cvgo-print-hidden]').forEach(function(el){const old=el.dataset.cvgoPrintHidden;if(old)el.style.display=old;else el.style.removeProperty('display');delete el.dataset.cvgoPrintHidden;});
    const main=document.getElementById('main');
    if(main&&main.dataset.cvgoPrintDisplay){main.style.display=main.dataset.cvgoPrintDisplay;delete main.dataset.cvgoPrintDisplay;}
  }

  function fixLandingFooter(){
    const footer=document.getElementById('cvgoLegalFooter');
    if(!footer)return;
    /* El footer legal debe ser el último elemento real del documento. */
    if(footer.parentElement!==document.body)document.body.appendChild(footer);
    else if(document.body.lastElementChild!==footer)document.body.appendChild(footer);
    footer.style.position='relative';
    footer.style.zIndex='1';
    footer.style.width='100%';
    footer.style.marginTop='40px';
    footer.style.flexShrink='0';
    document.body.style.display='flex';
    document.body.style.flexDirection='column';
    document.body.style.minHeight='100vh';
    const auth=document.getElementById('auth');
    if(auth&&!auth.classList.contains('hidden'))auth.style.flex='0 0 auto';
    const main=document.getElementById('main');
    if(main&&!main.classList.contains('hidden'))main.style.flex='0 0 auto';
  }

  function protectLandingScroll(){
    if(window.__cvgoLandingScrollGuard)return;
    window.__cvgoLandingScrollGuard=true;
    try{history.scrollRestoration='manual';}catch(e){}
    let lastTrustedY=window.scrollY||0;
    window.addEventListener('scroll',function(e){
      const auth=document.getElementById('auth');
      if(!auth||auth.classList.contains('hidden'))return;
      if(e.isTrusted){lastTrustedY=window.scrollY;return;}
      if(window.scrollY<lastTrustedY-80){
        window.scrollTo({top:lastTrustedY,left:0,behavior:'auto'});
      }
    },{passive:true});
  }

  function initPublicFix(){
    fixLandingFooter();
    const auth=document.getElementById('auth');
    if(auth&&!auth.classList.contains('hidden'))protectLandingScroll();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initPublicFix,{once:true});else initPublicFix();
  window.addEventListener('load',initPublicFix);
  window.addEventListener('beforeprint',preparePrint);
  window.addEventListener('afterprint',restorePrint);
  setTimeout(initPublicFix,300);
  setTimeout(initPublicFix,1800);
})();
