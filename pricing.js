(function(){
  function enhancePricing(){
    const modal=document.getElementById('cvgoProModal');
    if(!modal||modal.dataset.pricingEnhanced==='1')return;
    const box=modal.querySelector('.box');
    if(!box)return;
    modal.dataset.pricingEnhanced='1';

    const title=box.querySelector('h2');
    if(title&&title.textContent.includes('Continúa con CVProfit PRO')){
      title.textContent='🚀 Pasa a CVProfit PRO';
    }

    const sub=box.querySelector('.cvgoSub');
    if(sub&&sub.textContent.includes('Activa PRO')){
      sub.innerHTML='Todo lo que necesitas para crear un CV mejor, adaptarlo a cada oferta y preparar tus entrevistas.';
    }

    const plans=box.querySelector('.cvgoPlans');
    if(plans){
      const cards=plans.querySelectorAll('.cvgoPlan');
      cards.forEach(card=>{
        card.style.transition='transform .18s ease,box-shadow .18s ease';
        card.addEventListener('mouseenter',()=>{card.style.transform='translateY(-3px)';card.style.boxShadow='0 12px 30px #10182818'});
        card.addEventListener('mouseleave',()=>{card.style.transform='';card.style.boxShadow=''});
      });

      const annual=plans.querySelector('.cvgoPlan.best');
      if(annual){
        const p=annual.querySelector('p');
        if(p)p.innerHTML='Solo <strong>5 € al mes</strong>. Paga una vez y disfruta de PRO durante 12 meses.';
        const button=annual.querySelector('button');
        if(button&&!document.getElementById('cvgoAnnualNote')){
          const note=document.createElement('div');
          note.id='cvgoAnnualNote';
          note.style='font-size:11px;color:#667085;text-align:center;margin-top:7px;line-height:1.35';
          note.textContent='Renovación automática anual. Puedes cancelarla antes de la siguiente renovación.';
          button.insertAdjacentElement('afterend',note);
        }
      }
    }

    if(!document.getElementById('cvgoPricingTrust')){
      const close=document.getElementById('cvgoProClose');
      const trust=document.createElement('div');
      trust.id='cvgoPricingTrust';
      trust.style='margin:13px 0 2px;text-align:center;font-size:11px;color:#667085;line-height:1.45';
      trust.innerHTML='🔒 Pago seguro mediante Stripe · Puedes cancelar la renovación automática cuando quieras.';
      if(close)close.insertAdjacentElement('beforebegin',trust);else box.appendChild(trust);
    }
  }

  const observer=new MutationObserver(enhancePricing);
  function start(){
    if(document.body)observer.observe(document.body,{childList:true,subtree:true});
    enhancePricing();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
