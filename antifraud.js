(function(){
  const KEY='cvprofit_trial_device_id';
  function deviceId(){
    try{
      let id=localStorage.getItem(KEY);
      if(!id){
        const c=window.crypto;
        id=(c&&typeof c.randomUUID==='function')?c.randomUUID():'cvp-'+Date.now()+'-'+Math.random().toString(36).slice(2)+Math.random().toString(36).slice(2);
        localStorage.setItem(KEY,id);
      }
      return id;
    }catch(e){return ''}
  }
  const originalFetch=window.fetch.bind(window);
  window.fetch=async function(input,init){
    let url='';
    try{url=typeof input==='string'?input:(input&&input.url)||''}catch(e){}
    const isRegister=/\/api\/register(?:\?|$)/.test(url);
    if(isRegister){
      init=init?{...init}:{method:'GET'};
      const headers=new Headers(init.headers||{});
      headers.set('X-CVProfit-Device',deviceId());
      init.headers=headers;
    }
    const response=await originalFetch(input,init);
    if(isRegister&&!response.ok){
      try{
        const data=await response.clone().json();
        if(data&&data.message){
          const msg=document.getElementById('authMsg');
          if(msg)msg.textContent=data.message;
        }
      }catch(e){}
    }
    return response;
  };
})();
