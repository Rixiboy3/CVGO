(function(){
  'use strict';
  /* Importación de CV retirada. Este asset se mantiene como punto de compatibilidad
     y aplica únicamente el modo de impresión limpio del CV. */
  function installPrint(){
    if(document.getElementById('cvgoPrintFix')) return;
    const s=document.createElement('style');
    s.id='cvgoPrintFix';
    s.textContent=`
@page{size:A4 portrait;margin:0!important}
@media print{
  html,body{margin:0!important;padding:0!important;background:#fff!important;width:210mm!important;min-width:210mm!important;overflow:visible!important}
  body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}

  /* En impresión no se imprime la aplicación: solo el CV. */
  body>*:not(#main){display:none!important}
  #main{display:block!important;position:static!important;width:210mm!important;min-height:0!important;margin:0!important;padding:0!important;overflow:visible!important}
  #main>.app{display:block!important;width:210mm!important;max-width:none!important;min-width:210mm!important;margin:0!important;padding:0!important;overflow:visible!important}
  #main>.app>.panel,
  #main>.app>.dash-sidebar,
  #main>.app>.dash-top,
  #main>.app>.dash-quick,
  #main>.app>.dash-tip,
  #main>#cvgoMobileBack,
  #cvgoMobileEditorBar{display:none!important}

  #main>.app>.previewbox{display:block!important;width:210mm!important;height:auto!important;max-height:none!important;min-width:210mm!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:visible!important;position:static!important;background:#fff!important}
  #main>.app>.previewbox>h3,
  #main>.app>.previewbox:after{display:none!important}
  #preview{display:block!important;width:210mm!important;min-width:210mm!important;max-width:210mm!important;margin:0!important;padding:0!important;overflow:visible!important}

  /* Todas las plantillas de CV parten de una página A4 real. */
  #preview .cv,#preview .tm{
    display:block!important;
    width:210mm!important;
    min-width:210mm!important;
    max-width:210mm!important;
    min-height:297mm!important;
    height:auto!important;
    margin:0!important;
    box-sizing:border-box!important;
    overflow:visible!important;
    transform:none!important;
    zoom:1!important;
    box-shadow:none!important;
  }
  #preview .cv * ,#preview .tm *{box-sizing:border-box!important;max-width:100%!important}

  /* Evita que el contenido se reduzca a una miniatura por las reglas responsive. */
  #preview .cv h1,#preview .tm h1{overflow-wrap:anywhere!important;word-break:break-word!important}
  #preview .cv .role,#preview .tm .role{overflow-wrap:anywhere!important;word-break:break-word!important}
  #preview .cv .contact,#preview .tm .contact,
  #preview .cv .headerContact,#preview .tm .headerContact,
  #preview .cv .sideContact,#preview .tm .sideContact{overflow-wrap:anywhere!important;word-break:break-word!important}

  /* Los bloques de experiencia no se parten en mitad del encabezado. */
  #preview .cvjob,#preview .tm .job{break-inside:avoid!important;page-break-inside:avoid!important}

  /* Plantillas antiguas del editor. */
  #preview .cv.modern{display:grid!important;grid-template-columns:58mm minmax(0,1fr)!important;min-height:297mm!important}
  #preview .cv.modern .side{padding:16mm 7mm!important}
  #preview .cv.modern .main{padding:17mm 11mm 16mm!important}
  #preview .cv.minimal{padding:18mm!important}
}
`;
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installPrint,{once:true});else installPrint();
  setTimeout(installPrint,300);
})();
