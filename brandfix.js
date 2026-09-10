(function(){
  const BRAND='CVProfit';
  function replaceText(node){
    if(node.nodeType===Node.TEXT_NODE){
      if(node.nodeValue&&node.nodeValue.includes('CVGO'))node.nodeValue=node.nodeValue.replace(/CVGO/g,BRAND);
      return;
    }
    if(node.nodeType!==Node.ELEMENT_NODE)return;
    if(node.tagName==='SCRIPT'||node.tagName==='STYLE')return;
    for(const child of [...node.childNodes])replaceText(child);
    for(const attr of ['title','aria-label','placeholder']){
      if(node.hasAttribute(attr)){
        const v=node.getAttribute(attr);
        if(v&&v.includes('CVGO'))node.setAttribute(attr,v.replace(/CVGO/g,BRAND));
      }
    }
  }
  function run(){
    document.title=document.title.replace(/CVGO/g,BRAND);
    replaceText(document.body);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  new MutationObserver(muts=>muts.forEach(m=>m.addedNodes.forEach(replaceText))).observe(document.documentElement,{childList:true,subtree:true});
})();
