(function(){
  const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const $=id=>document.getElementById(id);
  let state={offer:'',profile:null,asked:[],current:null,answers:[],index:0,busy:false,recognition:null,listening:false,voiceBase:''};

  function profile(){
    const experience=[...document.querySelectorAll('#experience .item')].map(x=>({
      position:x.querySelector('.ep')?.value||'',company:x.querySelector('.ec')?.value||'',
      dates:(x.querySelector('.ef')?.value||'')+' - '+(x.querySelector('.et')?.value||''),
      description:x.querySelector('.ed')?.value||''
    })).filter(x=>x.position||x.company||x.description);
    return {name:$('name')?.value||'',role:$('role')?.value||'',summary:$('summary')?.value||'',skills:$('skills')?.value||'',experience};
  }

  async function callAPI(body){
    const r=await fetch('/api/interview',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(body)});
    const j=await r.json(); if(!r.ok) throw j; return j.result;
  }

  function getOffer(){return (($('job')?.value||'').trim() || ($('aiJob')?.value||'').trim());}

  function shell(){
    const out=$('interviewOut');
    out.innerHTML=`<div id="ivSim" style="border:1px solid #dbe4ee;border-radius:13px;background:#f8fafc;padding:15px">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
        <div><b>🎙️ Simulador de entrevista CVGO</b><div id="ivProgress" style="font-size:12px;color:#667085;margin-top:3px"></div></div>
        <div id="ivScore" style="font-weight:800"></div>
      </div>
      <div id="ivQuestion" style="margin-top:13px"></div>
      <div id="ivAnswerBox" style="margin-top:12px"></div>
      <div id="ivResult" style="margin-top:12px"></div>
    </div>`;
  }

  function renderQuestion(q){
    stopVoice(false);
    state.current=q;
    $('ivProgress').textContent=`Pregunta ${state.index+1} de 8 · ${q.type||'entrevista'}`;
    $('ivQuestion').innerHTML=`<div style="background:#fff;border:1px solid #eaecf0;border-radius:10px;padding:14px">
      <div style="font-size:17px;font-weight:800;line-height:1.4">${esc(q.question)}</div>
      ${q.why?`<div style="margin-top:10px;font-size:12px"><b>Qué evalúa:</b> ${esc(q.why)}</div>`:''}
      ${q.highlight?`<div style="margin-top:6px;font-size:12px;color:#067647"><b>Enfócate en:</b> ${esc(q.highlight)}</div>`:''}
      ${q.avoid?`<div style="margin-top:6px;font-size:12px;color:#b42318"><b>Evita:</b> ${esc(q.avoid)}</div>`:''}
    </div>`;
    $('ivAnswerBox').innerHTML=`<textarea id="ivAnswer" placeholder="Escribe aquí tu respuesta como si estuvieras delante del entrevistador..." style="width:100%;min-height:145px;border:1px solid #d0d5dd;border-radius:9px;padding:11px;resize:vertical"></textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:9px">
        <button type="button" id="ivVoice" onclick="window.cvgoToggleVoice()" style="border:1px solid #d0d5dd;background:#fff;border-radius:9px;padding:10px 13px;font-weight:700;cursor:pointer">🎙️ Responder hablando</button>
        <button type="button" class="primary" id="ivEval" onclick="window.cvgoEvaluateAnswer()" style="margin-top:0;flex:1;min-width:180px">🎯 Evaluar mi respuesta</button>
      </div>
      <div id="ivVoiceStatus" style="font-size:12px;color:#667085;margin-top:7px">Puedes escribir o responder hablando. CVGO convertirá tu voz en texto para evaluarla.</div>`;
    $('ivResult').innerHTML='';
    initVoice();
  }

  function initVoice(){
    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    const btn=$('ivVoice'),status=$('ivVoiceStatus');
    if(!SpeechRecognition){
      if(btn){btn.disabled=true;btn.title='Tu navegador no permite reconocimiento de voz';btn.textContent='🎙️ Voz no disponible';btn.style.opacity='.55'}
      if(status)status.textContent='El reconocimiento de voz no está disponible en este navegador. Puedes escribir tu respuesta normalmente.';
      return;
    }
    if(status)status.textContent='Pulsa “Responder hablando”, habla con normalidad y vuelve a pulsar para terminar.';
  }

  function stopVoice(clearStatus=true){
    if(state.recognition){try{state.recognition.onend=null;state.recognition.stop()}catch(e){}state.recognition=null}
    state.listening=false;state.voiceBase='';
    const btn=$('ivVoice'),status=$('ivVoiceStatus');
    if(btn){btn.textContent='🎙️ Responder hablando';btn.style.background='#fff';btn.style.color='';}
    if(clearStatus&&status)status.textContent='Grabación finalizada. Puedes revisar el texto antes de evaluarlo.';
  }

  window.cvgoToggleVoice=function(){
    if(state.listening){stopVoice(true);return}
    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    const answer=$('ivAnswer'),btn=$('ivVoice'),status=$('ivVoiceStatus');
    if(!SpeechRecognition||!answer)return;
    const recognition=new SpeechRecognition();
    state.recognition=recognition;state.listening=true;state.voiceBase=answer.value.trim();
    recognition.lang='es-ES';
    recognition.continuous=true;
    recognition.interimResults=true;
    recognition.maxAlternatives=1;
    recognition.onstart=()=>{
      if(btn){btn.textContent='⏹️ Terminar respuesta';btn.style.background='#fef3f2';btn.style.color='#b42318'}
      if(status){status.textContent='🔴 Escuchando... habla con naturalidad. Puedes hacer pausas; pulsa “Terminar respuesta” cuando acabes.';status.style.color='#b42318'}
    };
    recognition.onresult=(event)=>{
      let finalText='';let interim='';
      for(let i=event.resultIndex;i<event.results.length;i++){
        const text=event.results[i][0].transcript;
        if(event.results[i].isFinal)finalText+=text+' ';else interim+=text;
      }
      const base=state.voiceBase?state.voiceBase+' ':' ';answer.value=(base+finalText+interim).trim();
      answer.dispatchEvent(new Event('input',{bubbles:true}));
    };
    recognition.onerror=(event)=>{
      const friendly={not-allowed:'El navegador no tiene permiso para usar el micrófono.',service-not-allowed:'El reconocimiento de voz no está permitido.',no-speech:'No se ha detectado voz. Vuelve a intentarlo.',audio-capture:'No se ha detectado ningún micrófono.'};
      stopVoice(false);if(status){status.textContent='⚠️ '+(friendly[event.error]||'No se ha podido usar el micrófono. Puedes escribir la respuesta.');status.style.color='#b42318'}
    };
    recognition.onend=()=>{
      if(state.listening){
        try{recognition.start()}catch(e){stopVoice(true)}
      }
    };
    try{recognition.start()}catch(e){stopVoice(false);if(status)status.textContent='No se pudo iniciar el micrófono. Comprueba los permisos del navegador.';}
  };

  function list(title,items,icon){if(!Array.isArray(items)||!items.length)return '';return `<div style="margin-top:11px"><b>${icon} ${title}</b><ul style="margin:5px 0 0 18px;padding:0;font-size:13px;line-height:1.5">${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`}

  function renderResult(r){
    stopVoice(false);
    const avg=state.answers.reduce((a,x)=>a+x.score,0)/state.answers.length;
    $('ivScore').textContent=`Media: ${Math.round(avg)}/100`;
    $('ivResult').innerHTML=`<div style="background:#fff;border:1px solid #eaecf0;border-radius:10px;padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><b>Evaluación de tu respuesta</b><strong style="font-size:24px">${r.score}/100</strong></div>
      <div class="scorebar"><i style="width:${r.score}%"></i></div>
      <div style="font-weight:800;margin-top:8px">${esc(r.verdict||'Resultado')}</div>
      ${list('Lo mejor',r.strengths,'🟢')}${list('A mejorar',r.weaknesses,'🟠')}${list('Te ha faltado',r.missing,'🔎')}
      ${r.improved_answer?`<div style="margin-top:13px;padding:12px;border-radius:9px;background:#f8fafc"><b>🗣️ Una respuesta más potente</b><p style="font-size:13px;line-height:1.55;margin:7px 0 0">${esc(r.improved_answer)}</p></div>`:''}
      ${r.tip?`<div style="margin-top:10px;font-size:13px"><b>💡 Consejo:</b> ${esc(r.tip)}</div>`:''}
      ${r.risk?`<div style="margin-top:7px;font-size:12px;color:#b42318"><b>⚠️ Riesgo:</b> ${esc(r.risk)}</div>`:''}
      <button class="primary" style="margin-top:13px" onclick="window.cvgoNextInterviewQuestion()">${state.index>=7?'🏁 Ver resultado final':'➡️ Siguiente pregunta'}</button>
    </div>`;
  }

  function showError(e){
    const msg=e?.error==='TRIAL_EXPIRED'?'Tu prueba gratuita ha terminado. Activa PRO para continuar.':e?.error==='AI_NOT_CONFIGURED'?'La IA no está configurada en el servidor.':e?.error==='OFFER_REQUIRED'?'Necesitas una oferta de empleo para preparar la entrevista.':e?.error==='ANSWER_REQUIRED'?'Escribe una respuesta antes de evaluarla.':'No se ha podido conectar con el simulador. Inténtalo de nuevo.';
    const out=$('interviewOut'); if(out)out.innerHTML=`<div style="padding:13px;background:#fef3f2;color:#b42318;border-radius:9px;font-size:13px">${msg}</div>`;
  }

  async function first(){
    state.busy=true;$('ivQuestion').innerHTML='<div style="padding:15px;text-align:center;color:#667085">⏳ Preparando una entrevista específica para tu candidatura...</div>';
    try{const q=await callAPI({mode:'next',offer:state.offer,profile:state.profile,asked:[]});state.index=0;state.asked=[q.question];renderQuestion(q)}catch(e){showError(e)}finally{state.busy=false}
  }

  window.makeInterview=async function(){
    stopVoice(false);
    state.offer=getOffer();state.profile=profile();state.asked=[];state.answers=[];state.index=0;
    if(state.offer.length<30){$('interviewOut').innerHTML='<div style="padding:13px;background:#fef3f2;color:#b42318;border-radius:9px;font-size:13px">Pega primero la oferta de empleo en la pestaña Carta o en Optimiza tu CV con IA.</div>';return}
    shell();await first();
  };

  window.cvgoEvaluateAnswer=async function(){
    if(state.busy||!state.current)return;
    stopVoice(true);
    const answer=($('ivAnswer')?.value||'').trim();
    if(answer.length<10){alert('Habla o escribe una respuesta algo más completa para poder evaluarla.');return}
    state.busy=true;const btn=$('ivEval');if(btn){btn.disabled=true;btn.textContent='⏳ Evaluando tu respuesta...'}
    try{const r=await callAPI({mode:'evaluate',offer:state.offer,profile:state.profile,question:state.current.question,answer});state.answers.push({score:Number(r.score)||0});renderResult(r)}catch(e){showError(e)}finally{state.busy=false}
  };

  window.cvgoNextInterviewQuestion=async function(){
    stopVoice(false);
    if(state.index>=7){
      const avg=Math.round(state.answers.reduce((a,x)=>a+x.score,0)/Math.max(1,state.answers.length));
      $('ivQuestion').innerHTML=`<div style="background:#fff;border:1px solid #eaecf0;border-radius:10px;padding:18px;text-align:center"><div style="font-size:30px">🏁</div><h3 style="margin:7px 0">Entrevista completada</h3><div style="font-size:28px;font-weight:900">${avg}/100</div><p style="font-size:13px;color:#667085">Puntuación media de tus respuestas. Revisa las recomendaciones anteriores para mejorar antes de tu entrevista real.</p><button class="primary" onclick="window.makeInterview()">🔄 Repetir simulación</button></div>`;
      $('ivAnswerBox').innerHTML='';$('ivResult').innerHTML='';return;
    }
    state.busy=true;$('ivQuestion').innerHTML='<div style="padding:15px;text-align:center;color:#667085">⏳ El entrevistador está preparando la siguiente pregunta...</div>';$('ivAnswerBox').innerHTML='';$('ivResult').innerHTML='';
    try{const q=await callAPI({mode:'next',offer:state.offer,profile:state.profile,asked:state.asked});state.index++;state.asked.push(q.question);renderQuestion(q)}catch(e){showError(e)}finally{state.busy=false}
  };
})();
