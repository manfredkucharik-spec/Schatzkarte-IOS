/* Phase 13 — offline foundation. It detects connectivity and exposes a small cache API. */
(function(){'use strict';
 let online=navigator.onLine!==false; const listeners=new Set();
 function emit(){online=navigator.onLine!==false;listeners.forEach(fn=>{try{fn(online)}catch(_){}});window.dispatchEvent(new CustomEvent('schatzkarte:network',{detail:{online}}))}
 addEventListener('online',emit);addEventListener('offline',emit);
 async function put(key,value){return window.SchatzkarteStore?.set('cache:'+key,value)}
 async function get(key){return window.SchatzkarteStore?.get('cache:'+key,null)}
 function onChange(fn){listeners.add(fn);return()=>listeners.delete(fn)}
 window.SchatzkarteOffline={isOnline:()=>online,put,get,onChange};
})();
