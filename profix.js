(function(){
  const $=id=>document.getElementById(id);
  async function init(){
    try{
      const r=await fetch('/api/me',{credentials:'same-origin',cache:'no-store'});
      const me=await r.json();
      if(!me?.logged_in || !me?.pro) return;
      const billing=me.billing||{};
      if($('cvprofitManageBtn')) return;
      const style=document.createElement('style');
      style.textContent=`#cvprofitManageBtn{position:fixed;right:150px;top:10px;z-index:9999;border:0;border-radius:9px;background:#111827;color:#fff;padding:9px 13px;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 3px 12px #0002}#cvprofitManageModal{position:fixed;inset:0;z-index:10001;background:#10182899;display:flex;align-items:center;justify-content:center;padding:20px}#cvprofitManageModal .box{width:min(520px,100%);background:#fff;border-radius:20px;padding:26px;box-shadow:0 20px 60px #0004}#cvprofitManageModal h2{margin:0 0 10px;color:#101828}#cvprofitManageModal .info{background:#f8fafc;border:1px solid #eaecf0;border-radius:12px;padding:15px;color:#475467;font-size:14px;line-height:1.6;margin:16px 0}#cvprofitCancel{border:1px solid #d92d20;background:#fff;color:#b42318;border-radius:9px;padding:10px 14px;font-weight:800;cursor:pointer}#cvprofitClose{border:1px solid #d0d5dd;background:#fff;color:#344054;border-radius:9px;padding:10px 14px;font-weight:700;cursor:pointer;margin-left:8px}`;
      document.head.appendChild(style);
      const b=document.createElement('button');b.id='cvprofitManageBtn';b.textContent='⚙ Gestionar PRO';b.onclick=openModal;document.body.appendChild(b);
      function openModal(){
        if($('cvprofitManageModal'))return;
        const m=document.createElement('div');m.id='cvprofitManageModal';
        const plan=billing.plan==='annual'?'Anual':'Mensual';
        const end=billing.current_period_end?new Date(billing.current_period_end).toLocaleDateString('es-ES'):'';
        const cancelled=!!billing.cancel_at_period_end;
        m.innerHTML=`<div class="box"><h2>⭐ Tu suscripción PRO</h2><div class="info"><strong>Plan ${plan}</strong>${end?`<br>Próxima renovación: ${end}`:''}<br>${cancelled?'La renovación automática está cancelada. Mantendrás PRO hasta el final del periodo actual.':'Tu suscripción se renovará automáticamente.'}</div>${cancelled?'': '<button id="cvprofitCancel">Cancelar renovación</button>'}<button id="cvprofitClose">Cerrar</button><div id="cvprofitMsg" style="margin-top:12px;color:#b42318;font-size:13px"></div></div>`;
        document.body.appendChild(m);
        $('cvprofitClose').onclick=()=>m.remove();
        m.onclick=e=>{if(e.target===m)m.remove()};
        const c=$('cvprofitCancel');
        if(c)c.onclick=async()=>{
          if(!confirm('¿Quieres cancelar la renovación automática? Mantendrás PRO hasta el final del periodo ya pagado.'))return;
          c.disabled=true;c.textContent='Cancelando...';
          try{
            const r=await fetch('/api/cancel-subscription',{method:'POST',credentials:'same-origin'});
            const j=await r.json();
            if(!r.ok)throw j;
            m.remove();
            location.reload();
          }catch(e){c.disabled=false;c.textContent='Cancelar renovación';$('cvprofitMsg').textContent='No se ha podido cancelar la renovación. Inténtalo de nuevo.'}
        };
      }
    }catch(e){}
  }
  setTimeout(init,1600);
})();
