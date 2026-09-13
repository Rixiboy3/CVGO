(function(){
  'use strict';

  /* CVProfit: impresión A4 aislada + ajustes de landing. */
  const PRINT_STYLE = `
    @page { size: A4 portrait; margin: 0 !important; }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 210mm !important;
      min-width: 210mm !important;
      max-width: 210mm !important;
      background: #fff !important;
      overflow: visible !important;
    }
    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    #cvgo-print-root {
      display: block !important;
      width: 210mm !important;
      min-width: 210mm !important;
      max-width: 210mm !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    #cvgo-print-root .cv,
    #cvgo-print-root .tm {
      display: block !important;
      position: relative !important;
      width: 210mm !important;
      min-width: 210mm !important;
      max-width: 210mm !important;
      height: 297mm !important;
      min-height: 297mm !important;
      max-height: 297mm !important;
      margin: 0 !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      transform: none !important;
      transform-origin: top left !important;
      zoom: 1 !important;
      box-shadow: none !important;
      break-after: avoid-page !important;
      page-break-after: avoid !important;
    }
    #cvgo-print-root .cv *,
    #cvgo-print-root .tm * {
      box-sizing: border-box !important;
    }
    #cvgo-print-root .cv.modern {
      display: grid !important;
      grid-template-columns: 58mm minmax(0, 1fr) !important;
      padding: 0 !important;
    }
    #cvgo-print-root .cv.modern .side {
      padding: 12mm 6mm !important;
    }
    #cvgo-print-root .cv.modern .main {
      padding: 12mm 9mm !important;
    }
    #cvgo-print-root .cv.minimal {
      padding: 14mm !important;
    }
    #cvgo-print-root h1,
    #cvgo-print-root .role,
    #cvgo-print-root .contact,
    #cvgo-print-root .headerContact,
    #cvgo-print-root .sideContact {
      overflow-wrap: anywhere !important;
      word-break: break-word !important;
    }
    #cvgo-print-root .cvjob,
    #cvgo-print-root .job {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
  `;

  function buildPrintDocument(){
    const source = document.querySelector('#preview .cv, #preview .tm');
    if(!source) return null;

    const win = window.open('', '_blank', 'width=794,height=1123');
    if(!win) return null;

    const doc = win.document;
    doc.open();
    doc.write('<!doctype html><html><head><meta charset="utf-8"><title>CVProfit - CV</title>');

    document.querySelectorAll('style').forEach(function(style){
      const copy = doc.createElement('style');
      copy.textContent = style.textContent || '';
      doc.head.appendChild(copy);
    });
    document.querySelectorAll('link[rel="stylesheet"]').forEach(function(link){
      const copy = doc.createElement('link');
      copy.rel = 'stylesheet';
      copy.href = link.href;
      doc.head.appendChild(copy);
    });

    const printStyle = doc.createElement('style');
    printStyle.id = 'cvgoPrintA4';
    printStyle.textContent = PRINT_STYLE;
    doc.head.appendChild(printStyle);

    doc.write('</head><body><div id="cvgo-print-root"></div></body></html>');
    doc.close();

    const root = doc.getElementById('cvgo-print-root');
    root.appendChild(source.cloneNode(true));
    return win;
  }

  function printIsolated(){
    const win = buildPrintDocument();
    if(!win){
      alert('No se ha podido preparar el CV para imprimir.');
      return;
    }

    let printed = false;
    const doPrint = function(){
      if(printed) return;
      printed = true;
      win.focus();
      win.print();
    };

    win.addEventListener('afterprint', function(){
      setTimeout(function(){
        try{win.close();}catch(e){}
      }, 250);
    }, {once:true});

    if(win.document.fonts && win.document.fonts.ready){
      win.document.fonts.ready.then(function(){setTimeout(doPrint, 120);});
    }else{
      setTimeout(doPrint, 500);
    }
  }

  /* El botón existente usa window.print(); lo sustituimos por la impresión aislada. */
  const nativePrint = window.print.bind(window);
  window.print = function(){
    const source = document.querySelector('#preview .cv, #preview .tm');
    if(source) return printIsolated();
    return nativePrint();
  };

  function fixLandingFooter(){
    const footer = document.getElementById('cvgoLegalFooter');
    if(!footer) return;
    if(footer.parentElement !== document.body) document.body.appendChild(footer);
    else if(document.body.lastElementChild !== footer) document.body.appendChild(footer);
    footer.style.position = 'relative';
    footer.style.zIndex = '1';
    footer.style.width = '100%';
    footer.style.marginTop = '40px';
    footer.style.flexShrink = '0';
    document.body.style.display = 'flex';
    document.body.style.flexDirection = 'column';
    document.body.style.minHeight = '100vh';
    const auth = document.getElementById('auth');
    if(auth && !auth.classList.contains('hidden')) auth.style.flex = '0 0 auto';
    const main = document.getElementById('main');
    if(main && !main.classList.contains('hidden')) main.style.flex = '0 0 auto';
  }

  function protectLandingScroll(){
    if(window.__cvgoLandingScrollGuard) return;
    window.__cvgoLandingScrollGuard = true;
    try{ history.scrollRestoration = 'manual'; }catch(e){}
    let lastTrustedY = window.scrollY || 0;
    window.addEventListener('scroll', function(e){
      const auth = document.getElementById('auth');
      if(!auth || auth.classList.contains('hidden')) return;
      if(e.isTrusted){
        lastTrustedY = window.scrollY;
        return;
      }
      if(window.scrollY < lastTrustedY - 80){
        window.scrollTo({top:lastTrustedY,left:0,behavior:'auto'});
      }
    }, {passive:true});
  }

  function init(){
    fixLandingFooter();
    const auth = document.getElementById('auth');
    if(auth && !auth.classList.contains('hidden')) protectLandingScroll();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
  window.addEventListener('load', init);
  setTimeout(init, 300);
  setTimeout(init, 1800);

  if(!document.getElementById('cvgoAnalyticsScript')){
    const analytics=document.createElement('script');
    analytics.id='cvgoAnalyticsScript';
    analytics.src='/analytics.js?v=1';
    analytics.defer=true;
    document.head.appendChild(analytics);
  }
})();
