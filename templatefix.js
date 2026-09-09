(function(){
  function install(){
    if(document.getElementById('cvgoTemplateFix')) return;
    const s=document.createElement('style');
    s.id='cvgoTemplateFix';
    s.textContent=`
/* CVGO template safety layer: never allow decorative text to damage the layout. */
.tm .eyebrow{display:none!important}
.tm .sidePanel{min-width:0!important;overflow:hidden!important}
.tm .sidePanel h2{word-break:normal!important;overflow-wrap:break-word!important;white-space:normal!important;line-height:1.12!important}
.tm .sidePanel .role{word-break:normal!important;overflow-wrap:break-word!important;white-space:normal!important;line-height:1.35!important}
.tm .sidePanel .sideContact{word-break:normal!important;overflow-wrap:anywhere!important;white-space:normal!important}
.tm .headerContact{word-break:normal!important;overflow-wrap:anywhere!important;white-space:normal!important}
.tm .identity{min-width:0!important;overflow:hidden!important}
.tm .identity h1{word-break:normal!important;overflow-wrap:break-word!important;white-space:normal!important}
.tm .identity .role{word-break:normal!important;overflow-wrap:break-word!important;white-space:normal!important}

/* Lateral templates: give the sidebar enough breathing room and prevent character-by-character wrapping. */
.tm.p3{grid-template-columns:230px minmax(0,1fr)!important}
.tm.m1{grid-template-columns:235px minmax(0,1fr)!important}
.tm.m3{grid-template-columns:minmax(0,1fr) 220px!important}
.tm.p3 .sidePanel,.tm.m1 .sidePanel,.tm.m3 .sidePanel{min-width:0!important}
.tm.p3 .sidePanel .tp,.tm.m1 .sidePanel .tp,.tm.m3 .sidePanel .tp{max-width:100%!important}

@media print{
  .tm.p3{grid-template-columns:61mm minmax(0,1fr)!important}
  .tm.m1{grid-template-columns:61mm minmax(0,1fr)!important}
  .tm.m3{grid-template-columns:minmax(0,1fr) 58mm!important}
  .tm.p3 .sidePanel,.tm.m1 .sidePanel{padding-left:7mm!important;padding-right:7mm!important}
  .tm.m3 .sidePanel{padding-left:6mm!important;padding-right:6mm!important}
  .tm .sidePanel h2{word-break:normal!important;overflow-wrap:break-word!important}
  .tm .sidePanel .role{word-break:normal!important;overflow-wrap:break-word!important}
}
`;
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  setTimeout(install,700);
})();
