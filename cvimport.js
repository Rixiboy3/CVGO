(function(){
  'use strict';

  function installPrint(){
    if(document.getElementById('cvgoPrintFix')) return;
    const s=document.createElement('style');
    s.id='cvgoPrintFix';
    s.textContent=`
@page{size:A4 portrait;margin:0!important}
@media print{
  html,body{margin:0!important;padding:0!important;background:#fff!important;width:210mm!important;min-width:210mm!important;max-width:210mm!important;overflow:visible!important}
  body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}

  /* Ocultar toda la interfaz y conservar exclusivamente el documento del CV. */
  body>header,body>#auth,body>#cvgoMobileEditorBar{display:none!important}
  #main{display:block!important;position:static!important;width:210mm!important;min-width:210mm!important;max-width:210mm!important;margin:0!important;padding:0!important;overflow:visible!important}
  #main .dash-sidebar,#main .dash-top,#main .dash-quick,#main .dash-tip,#main .panel,#main #cvgoMobileBack,#main .tabs,#main .trial,#main .actions,#main .score{display:none!important}
  #main .app{display:block!important;width:210mm!important;min-width:210mm!important;max-width:210mm!important;margin:0!important;padding:0!important;overflow:visible!important}
  #main .previewbox{display:block!important;width:210mm!important;min-width:210mm!important;max-width:210mm!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:visible!important;position:static!important;background:#fff!important}
  #main .previewbox>h3,#main .previewbox:after{display:none!important}
  #preview{display:block!important;width:210mm!important;min-width:210mm!important;max-width:210mm!important;margin:0!important;padding:0!important;overflow:visible!important}

  /* A4 real. El contenido se compacta para evitar una segunda página innecesaria. */
  #preview .cv,#preview .tm{
    display:block!important;
    width:210mm!important;
    min-width:210mm!important;
    max-width:210mm!important;
    height:297mm!important;
    min-height:297mm!important;
    max-height:297mm!important;
    margin:0!important;
    box-sizing:border-box!important;
    overflow:hidden!important;
    transform:none!important;
    zoom:1!important;
    box-shadow:none!important;
    break-after:avoid-page!important;
    page-break-after:avoid!important;
  }
  #preview .cv * ,#preview .tm *{box-sizing:border-box!important;max-width:100%!important}
  #preview .cv h1,#preview .tm h1{overflow-wrap:anywhere!important;word-break:break-word!important}
  #preview .cv .role,#preview .tm .role{overflow-wrap:anywhere!important;word-break:break-word!important}
  #preview .cv .contact,#preview .tm .contact,
  #preview .cv .headerContact,#preview .tm .headerContact,
  #preview .cv .sideContact,#preview .tm .sideContact{overflow-wrap:anywhere!important;word-break:break-word!important}

  /* Compactación específica del modelo clásico para mantener un CV de una página. */
  #preview .cv:not(.modern):not(.minimal){padding:12mm 14mm!important}
  #preview .cv:not(.modern):not(.minimal) h1{font-size:27px!important;margin-bottom:3px!important}
  #preview .cv:not(.modern):not(.minimal) .role{font-size:13px!important;margin-bottom:8px!important}
  #preview .cv:not(.modern):not(.minimal) .contact{font-size:8.5px!important;padding-bottom:9px!important;border-bottom-width:1px!important}
  #preview .cv:not(.modern):not(.minimal) .cvsec{margin-top:11px!important}
  #preview .cv:not(.modern):not(.minimal) .cvsec h3{font-size:10px!important;letter-spacing:1px!important;margin-bottom:5px!important}
  #preview .cv:not(.modern):not(.minimal) .cvsec p{font-size:9.2px!important;line-height:1.32!important}
  #preview .cv:not(.modern):not(.minimal) .cvjob{margin-bottom:7px!important;break-inside:auto!important;page-break-inside:auto!important}
  #preview .cv:not(.modern):not(.minimal) .cvjob .line{font-size:9.2px!important}
  #preview .cv:not(.modern):not(.minimal) .cvjob .desc{font-size:8.2px!important;line-height:1.28!important;margin-top:2px!important}
  #preview .cv:not(.modern):not(.minimal) .skill{font-size:8px!important;padding:3px 5px!important}

  #preview .cv.modern{display:grid!important;grid-template-columns:58mm minmax(0,1fr)!important;min-height:297mm!important;height:297mm!important;max-height:297mm!important}
  #preview .cv.modern .side{padding:12mm 6mm!important}
  #preview .cv.modern .main{padding:12mm 9mm!important}
  #preview .cv.minimal{height:297mm!important;min-height:297mm!important;max-height:297mm!important;padding:14mm!important}
}
`;
    document.head.appendChild(s);
  }

  function preparePrint(){
    installPrint();
    const main=document.getElementById('main');
    const preview=document.querySelector('#main .previewbox');
    const cv=document.querySelector('#preview .cv,#preview .tm');
    if(!main||!preview||!cv)return;

    document.querySelectorAll('body>*').forEach(function(el){
      if(el!==main){el.dataset.cvgoPrintHidden=el.style.display||'';el.style.setProperty('display','none','important');}
    });
    main.dataset.cvgoPrintDisplay=main.style.display||'';
    main.style.setProperty('display','block','important');

    /* La barra lateral es hermana de .app, por eso se oculta de forma explícita. */
    main.querySelectorAll('.dash-sidebar,.dash-top,.dash-quick,.dash-tip,.panel,#cvgoMobileBack,#cvgoMobileEditorBar').forEach(function(el){
      el.dataset.cvgoPrintHidden=el.style.display||'';
      el.style.setProperty('display','none','important');
    });
    preview.style.setProperty('display','block','important');
    preview.style.setProperty('width','210mm','important');
    preview.style.setProperty('height','auto','important');

    cv.style.setProperty('width','210mm','important');
    cv.style.setProperty('height','297mm','important');
    cv.style.setProperty('max-height','297mm','important');
    cv.style.setProperty('overflow','hidden','important');
  }

  function restorePrint(){
    const main=document.getElementById('main');
    if(!main)return;
    document.querySelectorAll('[data-cvgo-print-hidden]').forEach(function(el){
      const old=el.dataset.cvgoPrintHidden;
      if(old)el.style.display=old;else el.style.removeProperty('display');
      delete el.dataset.cvgoPrintHidden;
    });
    if(main.dataset.cvgoPrintDisplay){main.style.display=main.dataset.cvgoPrintDisplay;delete main.dataset.cvgoPrintDisplay;}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installPrint,{once:true});else installPrint();
  window.addEventListener('beforeprint',preparePrint);
  window.addEventListener('afterprint',restorePrint);
  setTimeout(installPrint,300);
})();
