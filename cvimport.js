(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  function styles(){
    if($('cvgoImportStyles'))return;
    const s=document.createElement('style');s.id='cvgoImportStyles';s.textContent=`
      .cvgoImport{margin:0 0 22px;padding:18px;border:1px solid #dbe3ee;border-radius:14px;background:linear-gradient(135deg,#f8fbff,#fff)}
      .cvgoImportTop{display:flex;align-items:center;justify-content:space-between;gap:15px}.cvgoImport h3{margin:0 0 5px;font-size:16px}.cvgoImport p{margin:0;color:#667085;font-size:12px;line-height:1.45}
      .cvgoImportBtn{border:0;background:#111827;color:#fff;border-radius:9px;padding:10px 14px;font-weight:800;cursor:pointer;white-space:nowrap}.cvgoImportBtn:disabled{opacity:.6;cursor:wait}
      .cvgoImportMsg{margin-top:10px;font-size:12px}.cvgoImportMsg.ok{color:#067647}.cvgoImportMsg.err{color:#b42318}
      @media(max-width:600px){.cvgoImportTop{align-items:flex-start;flex-direction:column}.cvgoImportBtn{width:100%}}
    `;document.head.appendChild(s);
  }
  function setVal(id,v){const el=$(id);if(!el||!v)return;el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));}
  function clearDynamic(id){const box=$(id);if(box)box.innerHTML='';}
  function fillExperience(items){
    clearDynamic('experience');
    if(!items.length){ if(typeof addExp==='function')addExp(); return; }
    items.forEach((x,i)=>{if(typeof addExp==='function')addExp();const item=[...document.querySelectorAll('#experience .item')].at(-1);if(!item)return;
      const set=(sel,v)=>{const e=item.querySelector(sel);if(e){e.value=v||'';e.dispatchEvent(new Event('input',{bubbles:true}))}};
      set('.ep',x.position);set('.ec',x.company);set('.ef',x.from);set('.et',x.to);set('.ed',x.description);
    });
  }
  function fillEducation(items){
    clearDynamic('education');
    if(!items.length){if(typeof addEdu==='function')addEdu();return;}
    items.forEach(x=>{if(typeof addEdu==='function')addEdu();const item=[...document.querySelectorAll('#education .item')].at(-1);if(!item)return;
      const set=(sel,v)=>{const e=item.querySelector(sel);if(e){e.value=v||'';e.dispatchEvent(new Event('input',{bubbles:true}))}};
      set('.etitle',x.title);set('.eschool',x.school);set('.eyear',x.year);
    });
  }
  function apply(data){
    ['name','role','email','phone','city','linkedin','summary','skills'].forEach(k=>setVal(k,data[k]));
    fillExperience(data.experience||[]);fillEducation(data.education||[]);
    if(typeof render==='function')render();
  }
  function addUI(){
    if($('cvgoImport'))return;
    const tab=$('cvTab');if(!tab)return;
    const box=document.createElement('div');box.id='cvgoImport';box.className='cvgoImport';
    box.innerHTML=`<div class="cvgoImportTop"><div><h3>📄 ¿Ya tienes un CV?</h3><p>Sube tu PDF y CVProfit extraerá tus datos para rellenar automáticamente este nuevo CV.</p></div><button type="button" class="cvgoImportBtn" id="cvgoImportBtn">Importar mi CV</button></div><input id="cvgoImportFile" type="file" accept="application/pdf,.pdf" hidden><div id="cvgoImportMsg" class="cvgoImportMsg"></div>`;
    tab.insertBefore(box,tab.firstElementChild);
    const btn=$('cvgoImportBtn'),file=$('cvgoImportFile');
    btn.onclick=()=>file.click();
    file.onchange=async()=>{
      const f=file.files?.[0];if(!f)return;
      const msg=$('cvgoImportMsg');btn.disabled=true;msg.className='cvgoImportMsg';msg.textContent='⏳ Analizando tu CV...';
      const fd=new FormData();fd.append('file',f);
      try{
        const r=await fetch('/api/cv-import',{method:'POST',body:fd});const j=await r.json();if(!r.ok)throw j;
        apply(j.data);msg.className='cvgoImportMsg ok';msg.textContent=`✓ Hemos encontrado tu información en ${j.pages||1} página${(j.pages||1)===1?'':'s'} y la hemos aplicado al CV. Revisa los datos antes de descargarlo.`;
      }catch(e){
        const text=e.error==='PDF_ONLY'?'Solo puedes subir un archivo PDF.':e.error==='FILE_TOO_LARGE'?'El PDF pesa demasiado (máximo 8 MB).':e.error==='PDF_NO_TEXT'?'No hemos podido leer texto del PDF. Si es un CV escaneado como imagen, prueba con un PDF que permita seleccionar el texto.':e.error==='TRIAL_EXPIRED'?'Tu prueba gratuita ha terminado. Activa PRO para importar tu CV.':e.error==='AI_NOT_CONFIGURED'?'La importación inteligente no está configurada todavía.':'No hemos podido importar el CV. Comprueba el PDF e inténtalo de nuevo.';
        msg.className='cvgoImportMsg err';msg.textContent='⚠ '+text;
      }finally{btn.disabled=false;file.value='';}
    };
  }
  function init(){styles();addUI();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
  const old=window.loadUser;if(typeof old==='function'){
    window.loadUser=async function(){const r=await old.apply(this,arguments);setTimeout(addUI,50);return r};
  }
})();
