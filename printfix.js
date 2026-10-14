(function(){
  function install(){
    if(document.getElementById('cvgoPrintFix')) return;
    const s=document.createElement('style');
    s.id='cvgoPrintFix';
    s.textContent=`
@page { size: A4 portrait; margin: 0; }
@media print {
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    width: 210mm !important;
    min-width: 0 !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  header { display: none !important; }
  .app {
    display: block !important;
    width: 210mm !important;
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .app > .panel { display: none !important; }
  .previewbox {
    display: block !important;
    width: 210mm !important;
    height: auto !important;
    max-height: none !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    overflow: visible !important;
    position: static !important;
  }
  .previewbox > h3 { display: none !important; }
  #preview {
    display: block !important;
    width: 210mm !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
  }
  /*
   * Keep the selected template's own typography, spacing, colours and columns.
   * Only normalize the outer page dimensions for A4. This prevents print-only
   * rules from redesigning the CV and making it differ from the live preview.
   */
  #preview .tm {
    width: 210mm !important;
    min-width: 0 !important;
    max-width: 210mm !important;
    height: auto !important;
    min-height: 297mm !important;
    margin: 0 !important;
    box-shadow: none !important;
    transform: none !important;
    overflow: visible !important;
  }
  #preview .tm * {
    box-sizing: border-box !important;
  }
}
`;
    document.head.appendChild(s);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install);
  else install();
  setTimeout(install,500);
})();
