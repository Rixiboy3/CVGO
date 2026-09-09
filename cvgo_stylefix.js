(function(){
  function install(){
    if(document.getElementById('cvgoStyleFix')) return;
    const s=document.createElement('style');
    s.id='cvgoStyleFix';
    s.textContent=`
/* CVGO Professional Layout Normalizer */
#preview{overflow:visible!important}
.tm{font-family:Arial,Helvetica,sans-serif!important;overflow:visible!important}
.tm *{box-sizing:border-box!important;min-width:0!important}
.tm .cvhead{position:relative!important;overflow:visible!important}
.tm .identity{min-width:0!important;max-width:100%!important}
.tm h1{overflow-wrap:anywhere!important;word-break:normal!important}
.tm .role,.tm .headerContact,.tm .sideContact{overflow-wrap:anywhere!important;word-break:normal!important}

/* One strong reading column for ordinary templates.
   Narrow multi-column CV bodies create ugly word wrapping and poor hierarchy. */
.tm:not(.p3):not(.m1):not(.m3) main{display:block!important;width:100%!important}
.tm.c3 main{display:block!important}
.tm.c3 main section{display:block!important;width:100%!important;border:0!important;border-radius:0!important;padding:0!important;background:transparent!important}
.tm.c3 main section+section{border-top:1px solid #d9e7e7!important;padding-top:18px!important}

/* Consistent professional rhythm */
.tm main{min-width:0!important}
.tm section{margin-bottom:25px!important}
.tm section:last-child{margin-bottom:0!important}
.tm section h3{margin-bottom:10px!important;line-height:1.25!important}
.tm section>p{line-height:1.58!important;margin:0!important}
.tm .job{margin-bottom:17px!important;break-inside:avoid!important}
.tm .job:last-child{margin-bottom:0!important}
.tm .jobhead{gap:14px!important;line-height:1.4!important;align-items:start!important}
.tm .jobhead b{font-weight:700!important;overflow-wrap:anywhere!important}
.tm .jobhead span{line-height:1.35!important;white-space:normal!important;overflow-wrap:anywhere!important}
.tm .job p{margin:5px 0 0!important;line-height:1.5!important}
.tm .skills{gap:7px!important;align-items:flex-start!important}
.tm .skills span{line-height:1.25!important;padding:6px 9px!important}

/* Avoid decorative layouts becoming cramped */
.tm.c1 section:first-child{padding:18px 21px!important}
.tm.c2 .cvhead{position:relative!important}
.tm.c4 .cvhead{position:relative!important;padding-bottom:24px!important}
.tm.c4 main{margin-top:0!important}
.tm.n2 .cvhead,.tm.c4 .cvhead{display:block!important;text-align:center!important}
.tm.n2 .headerContact,.tm.c4 .headerContact{max-width:none!important;margin:10px auto 0!important;text-align:center!important}

/* Side-column templates remain two-column, but their main content is always one column */
.tm.p3,.tm.m1,.tm.m3{align-items:stretch!important}
.tm.p3 main,.tm.m1 main,.tm.m3 main{display:block!important;min-width:0!important}
.tm.p3 .sidePanel,.tm.m1 .sidePanel,.tm.m3 .sidePanel{min-width:0!important;overflow:visible!important}
.tm.p3 .sidePanel .skills,.tm.m1 .sidePanel .skills,.tm.m3 .sidePanel .skills{width:100%!important}

/* Screen preview: keep the CV elegant and readable */
@media screen{
  .tm main{padding-top:40px!important;padding-bottom:44px!important}
  .tm section{margin-bottom:27px!important}
  .tm section>p{font-size:11.6px!important;line-height:1.6!important}
  .tm .job{margin-bottom:18px!important}
  .tm .jobhead{font-size:11.6px!important}
  .tm .job p{font-size:10.6px!important;line-height:1.52!important}
  .tm section h3{font-size:12px!important;margin-bottom:11px!important}
}

/* A4/PDF: prioritize legibility and breathing room over squeezing content */
@media print{
  .tm main{padding-top:14mm!important;padding-bottom:14mm!important}
  .tm section{margin-bottom:19pt!important}
  .tm section h3{font-size:10.2pt!important;line-height:1.25!important;margin-bottom:8pt!important}
  .tm section>p{font-size:10pt!important;line-height:1.52!important}
  .tm .job{margin-bottom:12pt!important}
  .tm .jobhead{font-size:10pt!important;line-height:1.38!important;gap:10pt!important}
  .tm .jobhead span{font-size:8.9pt!important;line-height:1.35!important}
  .tm .job p{font-size:9.35pt!important;line-height:1.48!important;margin-top:4pt!important}
  .tm .skills{gap:6pt!important}
  .tm .skills span{font-size:8.5pt!important;line-height:1.2!important;padding:5pt 7pt!important}

  /* Never force the creative grid into tiny columns */
  .tm.c3 main{display:block!important}
  .tm.c3 main section+section{padding-top:10pt!important}

  /* Clean centered headers */
  .tm.n2 .cvhead,.tm.c4 .cvhead{display:block!important;text-align:center!important}
  .tm.n2 .headerContact,.tm.c4 .headerContact{margin:7pt auto 0!important;text-align:center!important;max-width:none!important}

  /* Ensure no header/text overlap in centered creative designs */
  .tm .cvhead>*{position:relative!important;z-index:1!important}
  .tm .tp{position:relative!important;z-index:2!important}
}
`;
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  setTimeout(install,700);
})();
