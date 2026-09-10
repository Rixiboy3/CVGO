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
    if(node.hasAttribute('href')){
      const href=node.getAttribute('href');
      if(href==='/legal#condiciones')node.setAttribute('href','/legal/condiciones');
      if(href==='/legal#privacidad')node.setAttribute('href','/legal/privacidad');
    }
  }
  function setHeadline(){
    const title=document.getElementById('authTitle');
    const text=document.getElementById('authText');
    const btn=document.getElementById('authBtn');
    if(title&&btn&&btn.textContent.includes('3 días')){
      title.textContent='Tu CV, diseñado para destacar.';
      if(text)text.textContent='Crea, optimiza y adapta tu CV con IA para destacar en cada oferta de empleo.';
    }
  }
  function run(){
    document.title=document.title.replace(/CVGO/g,BRAND);
    replaceText(document.body);
    setHeadline();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  new MutationObserver(muts=>muts.forEach(m=>m.addedNodes.forEach(node=>{replaceText(node);setHeadline();}))).observe(document.documentElement,{childList:true,subtree:true});
})();
