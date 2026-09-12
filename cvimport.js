(function(){
  'use strict';
  function styles(){
    if(document.getElementById('cvgoImportStyles'))return;
    const s=document.createElement('style');s.id='cvgoImportStyles';s.textContent=`
      .cvgoImport{margin:0 0 22px;padding:18px;border:1px solid #dbe3ee;border-radius:14px;background:linear-gradient(135deg,#f8fbff,#fff)}
      .cvgoImportTop{display:flex;align-items:center;justify-content:space-between;gap:15px}.cvgoImport h3{margin:0 0 5px;font-size:16px}.cvgoImport p{margin:0;color:#667085;font-size:12px;line-height:1.45}
      .cvgoImportBtn{border:0;background:#111827;color:#fff;border-radius:9px;padding:10px 14px;font-weight:800;cursor:pointer;white-space:nowrap}.cvgoImportBtn:disabled{opacity:.6;cursor:wait}
      .cvgoImportMsg{margin-top:10px;font-size:12px}.cvgoImportMsg.ok{color:#067647}.cvgoImportMsg.err{color:#b42318}
      .cvgoImportConfirm{position:fixed;inset:0;background:rgba(15,23,42,.48);display:flex;align-items:center;justify-content:center;padding:20px;z-index:99999}
      .cvgoImportConfirmCard{width:min(460px,100%);background:#fff;border-radius:18px;padding:24px;box-shadow:0 20px 60px rgba(15,23,42,.25)}
      .cvgoImportConfirmCard h3{margin:0 0 8px;font-size:19px;color:#111827}.cvgoImportConfirmCard p{margin:0;color:#667085;font-size:13px;line-height:1.55}
      .cvgoImportConfirmActions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}.cvgoImportCancel,.cvgoImportApply{border:0;border-radius:9px;padding:10px 15px;font-weight:800;cursor:pointer}.cvgoImportCancel{background:#eef2f6;color:#344054}.cvgoImportApply{background:#111827;color:#fff}
      @media(max-width:600px){.cvgoImportTop{align-items:flex-start;flex-direction:column}.cvgoImportBtn{width:100%}.cvgoImportConfirmActions{flex-direction:column-reverse}.cvgoImportCancel,.cvgoImportApply{width:100%}}
    `;document.head.appendChild(s);
  }
  function setVal(id,v){const el=document.getElementById(id);if(!el||v==null)return;el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));}
  function clearDynamic(id){const box=document.getElementById(id);if(box)box.innerHTML='';}
  function fillExperience(items){
    clearDynamic('experience');
    if(!items.length){if(typeof addExp==='function')addExp();return;}
    items.forEach(x=>{if(typeof addExp==='function')addExp();const all=document.querySelectorAll('#experience .item'),item=all[all.length-1];if(!item)return;const set=(sel,v)=>{const e=item.querySelector(sel);if(e){e.value=v||'';e.dispatchEvent(new Event('input',{bubbles:true))}};set('.ep',x.position);set('.ec',x.company);set('.ef',x.from);set('.et',x.to);set('.ed',x.description)});
  }
  function fillEducation(items){
    clearDynamic('education');
    if(!items.length){if(typeof addEdu==='function')addEdu();return;}
    items.forEach(x=>{if(typeof addEdu==='function')addEdu();const all=document.querySelectorAll('#education .item'),item=all[all.length-1];if(!item)return;const set=(sel,v)=>{const e=item.querySelector(sel);if(e){e.value=v||'';e.dispatchEvent(new Event('input',{bubbles:true))}};set('.etitle',x.title);set('.eschool',x.school);set('.eyear',x.year)});
  }
  function apply(data){
    ['name','role','email','phone','city','linkedin','summary','skills'].forEach(k=>setVal(k,data[k]));
    fillExperience(data.experience||[]);fillEducation(data.education||[]);
    if(typeof render==='function')render();
  }
  function confirmImport(data,pages,msg){
    const old=document.getElementById('cvgoImportConfirm');if(old)old.remove();
    const overlay=document.createElement('div');overlay.id='cvgoImportConfirm';overlay.className='cvgoImportConfirm';
    overlay.innerHTML=`<div class="cvgoImportConfirmCard"><h3>⚠️ Reemplazar el contenido actual</h3><p>La información encontrada en tu PDF se aplicará al formulario y sustituirá los datos que tengas actualmente en tu CV. ¿Quieres continuar?</p><div class="cvgoImportConfirmActions"><button type="button" class="cvgoImportCancel">Cancelar</button><button type="button" class="cvgoImportApply">Sí, importar CV</button></div></div>`;
    document.body.appendChild(overlay);
    const close=()=>overlay.remove();overlay.querySelector('.cvgoImportCancel').onclick=close;
    overlay.querySelector('.cvgoImportApply').onclick=()=>{close();apply(data);msg.className='cvgoImportMsg ok';msg.textContent=`✓ Hemos encontrado tu información en ${pages||1} página${(pages||1)===1?'':'s'} y la hemos aplicado al CV. Revisa los datos antes de descargarlo.`};
    overlay.onclick=e=>{if(e.target===overlay)close()};
  }
  function addUI(){
    const tab=document.getElementById('cvTab');
    if(!tab)return false;
    let box=document.getElementById('cvgoImport');
    if(!box){
      box=document.createElement('div');box.id='cvgoImport';box.className='cvgoImport';
      box.innerHTML=`<div class="cvgoImportTop"><div><h3>📄 ¿Ya tienes un CV?</h3><p>Sube tu PDF y CVProfit extraerá tus datos para rellenar automáticamente este nuevo CV.</p></div><button type="button" class="cvgoImportBtn" id="cvgoImportBtn">Importar mi CV</button></div><input id="cvgoImportFile" type="file" accept="application/pdf,.pdf" hidden><div id="cvgoImportMsg" class="cvgoImportMsg"></div>`;
      tab.insertBefore(box,tab.firstElementChild);
    }
    styles();
    const btn=document.getElementById('cvgoImportBtn'),file=document.getElementById('cvgoImportFile');
    if(btn&&!btn.dataset.bound){
      btn.dataset.bound='1';
      btn.onclick=()=>file.click();
      file.onchange=async()=>{const f=file.files?.[0];if(!f)return;const msg=document.getElementById('cvgoImportMsg');btn.disabled=true;msg.className='cvgoImportMsg';msg.textContent='⏳ Analizando tu CV...';const fd=new FormData();fd.append('file',f);try{const r=await fetch('/api/cv-import',{method:'POST',body:fd,credentials:'same-origin'});const j=await r.json();if(!r.ok)throw j;confirmImport(j.data,j.pages,msg)}catch(e){const text=e.error==='PDF_ONLY'?'Solo puedes subir un archivo PDF.':e.error==='FILE_TOO_LARGE'?'El PDF pesa demasiado (máximo 8 MB).':e.error==='PDF_NO_TEXT'?'No hemos podido leer texto del PDF. Si es un CV escaneado como imagen, prueba con un PDF que permita seleccionar el texto.':e.error==='TRIAL_EXPIRED'?'Tu prueba gratuita ha terminado. Activa PRO para importar tu CV.':e.error==='AI_NOT_CONFIGURED'?'La importación inteligente no está configurada todavía.':'No hemos podido importar el CV. Comprueba el PDF e inténtalo de nuevo.';msg.className='cvgoImportMsg err';msg.textContent='⚠ '+text}finally{btn.disabled=false;file.value=''}};
    }
    return true;
  }
  function init(){styles();addUI()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  const observer=new MutationObserver(()=>{if(addUI())observer.disconnect()});
  observer.observe(document.documentElement,{subtree:true,childList:true});
  let attempts=0;const timer=setInterval(()=>{if(addUI()||++attempts>=40)clearInterval(timer)},250);
})();