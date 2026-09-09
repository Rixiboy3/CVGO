(function(){
  function install(){
    if(document.getElementById('cvgoStyleFix')) return;
    const s=document.createElement('style');
    s.id='cvgoStyleFix';
    s.textContent=`
/* CVGO Professional Layout Normalizer — v4 */
#preview{overflow:visible!important}
.tm{font-family:Arial,Helvetica,sans-serif!important;overflow:visible!important}
.tm *{box-sizing:border-box!important;min-width:0!important}
.tm .cvhead{position:relative!important;overflow:visible!important;height:auto!important;min-height:0!important;max-height:none!important;flex:none!important}
.tm .identity{min-width:0!important;max-width:100%!important;overflow:visible!important}
.tm .eyebrow{display:none!important}
.tm h1{overflow-wrap:break-word!important;word-break:normal!important;white-space:normal!important}
.tm .role,.tm .headerContact,.tm .sideContact{overflow-wrap:break-word!important;word-break:normal!important;white-space:normal!important}
.tm .cvhead *{max-height:none!important}

/* Ordinary templates: one strong reading column. */
.tm:not(.p3):not(.m1):not(.m3) main{display:block!important;width:100%!important}
.tm.c3 main{display:block!important}
.tm.c3 main section{display:block!important;width:100%!important;border:0!important;border-radius:0!important;padding:0!important;background:transparent!important}
.tm.c3 main section+section{border-top:1px solid #d9e7e7!important;padding-top:18px!important}

/* Consistent professional rhythm. */
.tm main{min-width:0!important}
.tm section{margin-bottom:25px!important}
.tm section:last-child{margin-bottom:0!important}
.tm section h3{margin-bottom:10px!important;line-height:1.25!important}
.tm section>p{line-height:1.58!important;margin:0!important}
.tm .job{margin-bottom:17px!important;break-inside:avoid!important}
.tm .job:last-child{margin-bottom:0!important}
.tm .jobhead{gap:14px!important;line-height:1.4!important;align-items:start!important}
.tm .jobhead b{font-weight:700!important;overflow-wrap:break-word!important;word-break:normal!important}
.tm .jobhead span{line-height:1.35!important;white-space:normal!important;overflow-wrap:break-word!important;word-break:normal!important}
.tm .job p{margin:5px 0 0!important;line-height:1.5!important;overflow-wrap:break-word!important;word-break:normal!important}
.tm .skills{gap:7px!important;align-items:flex-start!important}
.tm .skills span{line-height:1.25!important;padding:6px 9px!important;overflow-wrap:break-word!important;word-break:normal!important}

/* Lateral templates: explicit grid areas prevent main/side from swapping. */
.tm.p3,.tm.m1,.tm.m3{align-items:stretch!important}
.tm.p3{grid-template-columns:230px minmax(0,1fr)!important;grid-template-areas:"side main"!important}
.tm.m1{grid-template-columns:235px minmax(0,1fr)!important;grid-template-areas:"side main"!important}
.tm.m3{grid-template-columns:minmax(0,1fr) 220px!important;grid-template-areas:"main side"!important}
.tm.p3 main,.tm.m1 main,.tm.m3 main{display:block!important;min-width:0!important;grid-area:main!important}
.tm.p3 .sidePanel,.tm.m1 .sidePanel,.tm.m3 .sidePanel{min-width:0!important;overflow:hidden!important;grid-area:side!important;order:initial!important}
.tm.p3 .sidePanel h2,.tm.m1 .sidePanel h2,.tm.m3 .sidePanel h2{word-break:normal!important;overflow-wrap:break-word!important;white-space:normal!important;line-height:1.12!important}
.tm.p3 .sidePanel .role,.tm.m1 .sidePanel .role,.tm.m3 .sidePanel .role{word-break:normal!important;overflow-wrap:break-word!important;white-space:normal!important;line-height:1.35!important}
.tm.p3 .sidePanel .sideContact,.tm.m1 .sidePanel .sideContact,.tm.m3 .sidePanel .sideContact{word-break:normal!important;overflow-wrap:anywhere!important;white-space:normal!important}
.tm.p3 .sidePanel .skills,.tm.m1 .sidePanel .skills,.tm.m3 .sidePanel .skills{width:100%!important}

/* Modern 03: main content left, turquoise profile sidebar right. */
.tm.m3 .sidePanel{display:block!important;grid-area:side!important}
.tm.m3 main{grid-area:main!important}
.tm.m3 .sidePanel .tp{position:static!important;transform:none!important}
.tm.m3 .sidePanel h2{margin-top:0!important}

/* Minimal 02: centered header with the photo in its own row. */
.tm.n2 .cvhead{display:block!important;text-align:center!important;height:auto!important;min-height:0!important;padding-top:32px!important;padding-bottom:24px!important}
.tm.n2 .tp{display:block!important;position:static!important;transform:none!important;margin:0 auto 14px!important}
.tm.n2 .identity{display:block!important;overflow:visible!important}
.tm.n2 .identity h1{display:block!important}
.tm.n2 .role{margin-top:7px!important}
.tm.n2 .headerContact{max-width:none!important;margin:11px auto 0!important;text-align:center!important}

/* Creative 04: clean centered header, no overlap with the photo. */
.tm.c4 .cvhead{display:block!important;text-align:center!important;height:auto!important;min-height:0!important;padding-top:28px!important;padding-bottom:24px!important}
.tm.c4 .tp{display:block!important;position:static!important;transform:none!important;margin:0 auto 14px!important}
.tm.c4 .identity{display:block!important;overflow:visible!important}
.tm.c4 .identity h1{display:block!important}
.tm.c4 .role{margin-top:7px!important}
.tm.c4 .headerContact{max-width:none!important;margin:11px auto 0!important;text-align:center!important}
.tm.c4 main{margin-top:0!important}

/* Executive 04: three-column header with a fixed photo column. */
.tm.e4 .cvhead{display:grid!important;grid-template-columns:84px minmax(0,1fr) minmax(145px,200px)!important;gap:20px!important;align-items:center!important;height:auto!important;min-height:0!important;padding:28px 38px!important}
.tm.e4 .tp{display:block!important;position:static!important;transform:none!important;width:84px!important;height:84px!important;margin:0!important}
.tm.e4 .identity{display:block!important;overflow:visible!important}
.tm.e4 .identity h1{display:block!important}
.tm.e4 .role{margin-top:6px!important}
.tm.e4 .headerContact{max-width:200px!important;margin:0!important;text-align:right!important}

/* Extra protection against accidental positioning in these four. */
.tm.m3 .cvhead,.tm.n2 .cvhead,.tm.c4 .cvhead,.tm.e4 .cvhead,.tm.m3 .tp,.tm.n2 .tp,.tm.c4 .tp,.tm.e4 .tp{transform:none!important}

@media screen{
  .tm main{padding-top:40px!important;padding-bottom:44px!important}
  .tm section{margin-bottom:27px!important}
  .tm section>p{font-size:11.6px!important;line-height:1.6!important}
  .tm .job{margin-bottom:18px!important}
  .tm .jobhead{font-size:11.6px!important}
  .tm .job p{font-size:10.6px!important;line-height:1.52!important}
  .tm section h3{font-size:12px!important;margin-bottom:11px!important}
}

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

  .tm.p3{grid-template-columns:61mm minmax(0,1fr)!important;grid-template-areas:"side main"!important}
  .tm.m1{grid-template-columns:61mm minmax(0,1fr)!important;grid-template-areas:"side main"!important}
  .tm.m3{grid-template-columns:minmax(0,1fr) 58mm!important;grid-template-areas:"main side"!important}
  .tm.p3 main,.tm.m1 main,.tm.m3 main{grid-area:main!important}
  .tm.p3 .sidePanel,.tm.m1 .sidePanel,.tm.m3 .sidePanel{grid-area:side!important;order:initial!important}
  .tm.p3 .sidePanel,.tm.m1 .sidePanel{padding-left:7mm!important;padding-right:7mm!important}
  .tm.m3 .sidePanel{padding-left:6mm!important;padding-right:6mm!important}

  .tm.n2 .cvhead{display:block!important;padding-top:9mm!important;padding-bottom:7mm!important}
  .tm.n2 .tp{width:76px!important;height:76px!important;margin:0 auto 4mm!important}
  .tm.n2 .headerContact{margin:4mm auto 0!important}
  .tm.c4 .cvhead{display:block!important;padding-top:8mm!important;padding-bottom:7mm!important}
  .tm.c4 .tp{width:112px!important;height:112px!important;margin:0 auto 4mm!important}
  .tm.c4 .headerContact{margin:4mm auto 0!important}
  .tm.e4 .cvhead{display:grid!important;grid-template-columns:24mm minmax(0,1fr) minmax(38mm,52mm)!important;gap:5mm!important;align-items:center!important;height:auto!important;min-height:0!important;padding:9mm 11mm 7mm!important}
  .tm.e4 .tp{width:24mm!important;height:24mm!important;margin:0!important}
  .tm.e4 .headerContact{max-width:52mm!important;margin:0!important;text-align:right!important}
  .tm .cvhead>*{position:static!important;z-index:auto!important;transform:none!important}
}
`;
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  setTimeout(install,700);
})();