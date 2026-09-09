(function(){
  const $=id=>document.getElementById(id);
  window.cvgoPhotoData='';

  function addStyles(){
    if($('cvgoPhotoStyles'))return;
    const s=document.createElement('style');s.id='cvgoPhotoStyles';s.textContent=`
      .cvgoPhotoBox{border:1px solid #eaecf0;border-radius:12px;padding:14px;background:#fafbfc;margin-bottom:25px}
      .cvgoPhotoRow{display:flex;align-items:center;gap:14px}
      .cvgoPhotoPreview{width:76px;height:76px;border-radius:50%;object-fit:cover;border:2px solid #e4e7ec;background:#f2f4f7;display:flex;align-items:center;justify-content:center;color:#98a2b3;font-size:28px;overflow:hidden;flex:none}
      .cvgoPhotoPreview img{width:100%;height:100%;object-fit:cover}
      .cvgoPhotoActions{display:flex;gap:7px;flex-wrap:wrap}
      .cvgoPhotoActions label,.cvgoPhotoActions button{border:1px solid #d0d5dd;background:#fff;border-radius:8px;padding:8px 10px;font-size:12px;font-weight:700;cursor:pointer}
      .cvgoPhotoActions input{display:none}
      .cvgoPhotoHint{font-size:11px;color:#667085;margin-top:7px}
      .cvgoCvPhoto{width:105px;height:105px;border-radius:50%;object-fit:cover;position:absolute;top:42px;right:48px;border:3px solid #fff;box-shadow:0 2px 10px #0002}
      .cv.modern .cvgoCvPhoto{position:static;display:block;margin:0 auto 22px;width:118px;height:118px;border:3px solid #475467;box-shadow:none}
      .cv.modern .side{position:relative}
      .cvgoPhotoSpace{padding-right:125px}
      @media(max-width:950px){.cvgoCvPhoto{right:20px}.cvgoPhotoSpace{padding-right:110px}}
      @media print{.cvgoPhotoBox{display:none!important}}
    `;document.head.appendChild(s);
  }

  function renderControl(){
    const personal=document.querySelector('#cvTab .section');
    if(!personal||$('cvgoPhotoBox'))return;
    addStyles();
    const box=document.createElement('div');box.id='cvgoPhotoBox';box.className='cvgoPhotoBox';
    box.innerHTML=`<div style="font-size:14px;font-weight:800;margin-bottom:8px">📷 Foto para tu CV <span style="font-size:11px;font-weight:500;color:#667085">(opcional)</span></div>
      <div class="cvgoPhotoRow"><div id="cvgoPhotoPreview" class="cvgoPhotoPreview">👤</div><div><div class="cvgoPhotoActions"><label for="cvgoPhotoInput">Subir foto<input id="cvgoPhotoInput" type="file" accept="image/jpeg,image/png,image/webp"></label><button type="button" id="cvgoPhotoRemove">Eliminar</button></div><div class="cvgoPhotoHint">JPG, PNG o WebP · Se optimiza automáticamente para mantener tu CV ligero.</div></div></div>`;
    personal.appendChild(box);
    $('cvgoPhotoInput').addEventListener('change',handleFile);
    $('cvgoPhotoRemove').onclick=()=>{window.cvgoPhotoData='';updateControl();renderPhoto();document.dispatchEvent(new Event('input',{bubbles:true}))};
    updateControl();
  }

  function updateControl(){
    const p=$('cvgoPhotoPreview');if(!p)return;
    p.innerHTML=window.cvgoPhotoData?`<img src="${window.cvgoPhotoData}" alt="Foto del CV">`:'👤';
  }

  function handleFile(e){
    const file=e.target.files?.[0];if(!file)return;
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)){alert('Selecciona una imagen JPG, PNG o WebP.');e.target.value='';return}
    const reader=new FileReader();
    reader.onload=()=>{
      const img=new Image();
      img.onload=()=>{
        const max=700,scale=Math.min(1,max/Math.max(img.width,img.height));
        const w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
        const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,w,h);
        window.cvgoPhotoData=c.toDataURL('image/jpeg',.82);
        updateControl();renderPhoto();document.dispatchEvent(new Event('input',{bubbles:true}));
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  }

  function renderPhoto(){
    const preview=$('preview');if(!preview)return;
    preview.querySelectorAll('.cvgoCvPhoto').forEach(x=>x.remove());
    preview.querySelectorAll('.cvgoPhotoSpace').forEach(x=>x.classList.remove('cvgoPhotoSpace'));
    if(!window.cvgoPhotoData)return;
    const cv=preview.querySelector('.cv');if(!cv)return;
    const img=document.createElement('img');img.className='cvgoCvPhoto';img.src=window.cvgoPhotoData;img.alt='Foto profesional';
    if(cv.classList.contains('modern')){const side=cv.querySelector('.side');if(side)side.insertBefore(img,side.firstChild)}
    else{cv.classList.add('cvgoPhotoSpace');cv.appendChild(img)}
  }

  window.cvgoSetPhoto=function(data){window.cvgoPhotoData=String(data||'');updateControl();renderPhoto()};

  const originalRender=window.render;
  function wrappedRender(){if(typeof originalRender==='function')originalRender.apply(this,arguments);renderPhoto()}
  if(typeof originalRender==='function')window.render=wrappedRender;

  function init(){renderControl();renderPhoto()}
  setTimeout(init,250);
  setTimeout(init,900);
})();
