/* Schatz-Karte Core — application lifecycle/state contract. */
(function(){
  "use strict";
  if(window.SCHATZKARTE_APP) return;
  let state='booting';
  const allowed={booting:1,locked:1,authenticated:1,loading:1,ready:1,error:1};
  const listeners=new Set();
  function setState(next,meta){
    if(!allowed[next]) throw new Error('Unknown app state: '+next);
    state=next;
    const detail={state:state,meta:meta||null};
    listeners.forEach(fn=>{try{fn(detail);}catch(e){console.warn('[App] subscriber:',e);}});
    try{window.dispatchEvent(new CustomEvent('schatzkarte:app-state',{detail:detail}));}catch(e){}
    return state;
  }
  function subscribe(fn){
    if(typeof fn!=='function') return function(){};
    listeners.add(fn);
    return function(){listeners.delete(fn);};
  }
  const api={get state(){return state;},setState,subscribe,isReady:()=>state==='ready',boot:()=>setState('booting')};
  window.SCHATZKARTE_APP=Object.freeze(api);
})();
