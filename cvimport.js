(function(){
  'use strict';
  function load(src){return new Promise(function(resolve,reject){var s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
  function css(href){if(document.querySelector('link[data-cvgo-dashboard]'))return;var l=document.createElement('link');l.rel='stylesheet';l.href=href;l.dataset.cvgoDashboard='1';document.head.appendChild(l)}
  css('/dashboard.css?v=4');
  load('/dashboard.js?v=8').catch(function(){}).finally(function(){load('/cvimport_core.js?v=1').catch(function(){})});
})();