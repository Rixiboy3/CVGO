(function(){
  function install(){
    if(document.getElementById('cvgoPrintFix')) return;
    const s=document.createElement('style');
    s.id='cvgoPrintFix';
    s.textContent=`
@page{size:A4 portrait;margin:0!important}
@media print{
  html,body{margin:0!important;padding:0!important;background:#fff!important;width:210mm!important;min-width:210mm!important}
  body{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  header{display:none!important}
  .app{display:block!important;width:210mm!important;max-width:none!important;margin:0!important;padding:0!important}
  .app>.panel{display:none!important}
  .previewbox{display:block!important;width:210mm!important;height:auto!important;max-height:none!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:visible!important;position:static!important}
  .previewbox>h3{display:none!important}
  #preview{display:block!important;width:210mm!important;margin:0!important;padding:0!important}
  .tm{width:210mm!important;min-width:210mm!important;max-width:210mm!important;min-height:297mm!important;height:auto!important;margin:0!important;padding:0!important;overflow:visible!important;box-shadow:none!important;transform:none!important;font-family:Arial,Helvetica,sans-serif!important}
  .tm *{box-sizing:border-box!important;max-width:100%!important}

  /* Typography: more breathing room and a more premium A4 hierarchy */
  .tm h1{font-size:26pt!important;line-height:1.08!important;overflow-wrap:anywhere!important;word-break:break-word!important}
  .tm .role{font-size:11pt!important;line-height:1.35!important;overflow-wrap:anywhere!important;word-break:break-word!important;margin-top:4pt!important}
  .tm .contact,.tm .headerContact,.tm .sideContact{font-size:8.8pt!important;line-height:1.45!important;overflow-wrap:anywhere!important;word-break:break-word!important}
  .tm section{margin-bottom:19pt!important;break-inside:auto!important}
  .tm section h3{font-size:10pt!important;line-height:1.25!important;letter-spacing:1.25pt!important;margin:0 0 8pt!important}
  .tm section>p{font-size:10pt!important;line-height:1.52!important;margin:0!important;overflow-wrap:anywhere!important;word-break:break-word!important}
  .tm .job{margin-bottom:11pt!important;break-inside:avoid!important}
  .tm .jobhead{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(70px,145px)!important;gap:10pt!important;font-size:10pt!important;line-height:1.35!important;align-items:start!important}
  .tm .jobhead b{overflow-wrap:anywhere!important;word-break:break-word!important}
  .tm .jobhead span{white-space:normal!important;text-align:right!important;overflow-wrap:anywhere!important;word-break:break-word!important;font-size:8.8pt!important;line-height:1.35!important}
  .tm .job p{font-size:9.3pt!important;line-height:1.48!important;margin:4pt 0 0!important;overflow-wrap:anywhere!important;word-break:break-word!important}
  .tm .skills{display:flex!important;flex-wrap:wrap!important;gap:6pt!important}
  .tm .skills span{font-size:8.5pt!important;line-height:1.2!important;padding:5pt 7pt!important;max-width:100%!important;overflow-wrap:anywhere!important;word-break:break-word!important}
  .tm .tp{max-width:none!important;flex:none!important}

  /* Standard A4 margins */
  .tm.p1,.tm.p2,.tm.p4,.tm.n1,.tm.n2,.tm.n3,.tm.n4,.tm.c2,.tm.c3,.tm.c4,.tm.e2,.tm.e4{padding-left:16mm!important;padding-right:16mm!important}
  .tm.p1{padding-top:17mm!important;padding-bottom:14mm!important}
  .tm.p2{padding-top:15mm!important;padding-bottom:14mm!important}
  .tm.p4{padding-top:15mm!important;padding-bottom:14mm!important}
  .tm.n1,.tm.n2,.tm.n3,.tm.n4{padding-top:17mm!important;padding-bottom:14mm!important}
  .tm.c2,.tm.c3,.tm.c4{padding-top:15mm!important;padding-bottom:14mm!important}
  .tm.e2,.tm.e4{padding-top:15mm!important;padding-bottom:14mm!important}

  /* Lateral layouts */
  .tm.p3{grid-template-columns:58mm minmax(0,1fr)!important;min-height:297mm!important}
  .tm.p3 aside{padding:16mm 7mm!important}
  .tm.p3 main{padding:17mm 11mm 16mm!important}
  .tm.m1{grid-template-columns:58mm minmax(0,1fr)!important;min-height:297mm!important}
  .tm.m1 aside{padding:16mm 7mm!important}
  .tm.m1 main{padding:17mm 11mm 16mm!important}
  .tm.m3{grid-template-columns:52mm minmax(0,1fr)!important;min-height:297mm!important}
  .tm.m3 aside{padding:14mm 6mm!important}
  .tm.m3 main{padding:15mm 13mm 15mm!important}

  /* Individual model rhythm */
  .tm.m2{min-height:297mm!important}
  .tm.m2 header{padding:16mm 16mm!important}
  .tm.m2 main{padding:13mm 16mm 16mm!important}
  .tm.m4 header{padding:14mm 16mm 8mm!important}
  .tm.m4 .topcontact{margin:0 16mm!important}
  .tm.m4 main{padding:10mm 16mm 16mm!important}
  .tm.n3 .columns{grid-template-columns:minmax(0,1.7fr) minmax(0,1fr)!important;gap:9mm!important;padding-top:9mm!important}
  .tm.n3 .columns aside{padding-left:7mm!important}
  .tm.c1 header{padding:16mm 16mm!important}
  .tm.c1>.contact{padding:5mm 16mm!important}
  .tm.c1 main{padding:11mm 16mm 16mm!important}
  .tm.c2 header{padding-left:4mm!important}
  .tm.c2 main{padding:10mm 0 0 4mm!important}
  .tm.c2>.contact{margin-left:4mm!important}
  .tm.c3 main{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:6mm!important}
  .tm.c4 main{margin-top:8mm!important;padding-top:8mm!important}
  .tm.e1 header{padding:16mm 16mm!important}
  .tm.e1 main{padding:13mm 16mm 16mm!important}
  .tm.e2{font-family:Georgia,serif!important}
  .tm.e2 main{padding-top:10mm!important}
  .tm.e3 header{padding:16mm 16mm!important}
  .tm.e3 main{padding:11mm 16mm 16mm!important}
  .tm.e4 header{grid-template-columns:24mm minmax(0,1fr) minmax(35mm,50mm)!important;gap:5mm!important;padding:13mm 13mm 7mm!important}
  .tm.e4 main{padding:10mm 13mm 16mm!important}

  /* Restore CV headers while hiding only the application chrome */
  .tm.p1 header,.tm.p2 header,.tm.p4 header,.tm.m2 header,.tm.m3 header,.tm.m4 header,.tm.n1 header,.tm.n3 header,.tm.n4 header,.tm.c1 header,.tm.c2 header,.tm.c3 header,.tm.e1 header,.tm.e2 header,.tm.e3 header,.tm.e4 header{display:flex!important}
  .tm.e4 header{display:grid!important}
  .tm.n2 header,.tm.c4 header{display:block!important}
  .tm.p3,.tm.m1{break-inside:avoid!important}
}
`;
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  setTimeout(install,500);
})();
