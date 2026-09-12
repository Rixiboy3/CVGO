/* CVProfit — importación automática de CV desactivada.
   Se conserva el backend para no afectar datos existentes, pero no se muestra
   ni se ofrece esta función a los usuarios hasta disponer de un extractor fiable.
*/
(function(){
  'use strict';
  function removeImportUI(){
    var card=document.getElementById('cvgoImportCard');
    if(card)card.remove();
    var legacy=document.getElementById('cvgoImport');
    if(legacy)legacy.remove();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',removeImportUI,{once:true});
  else removeImportUI();
})();