/* Phase 10 — durable local store. IndexedDB first, localStorage fallback. */
(function(){'use strict';
 const DB='schatzkarte'; const VER=1; const STORE='app';
 function open(){return new Promise((res,rej)=>{if(!('indexedDB' in window))return rej(new Error('IndexedDB unavailable'));const r=indexedDB.open(DB,VER);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE);};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
 async function set(key,value){try{const db=await open();return await new Promise((res,rej)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).put(value,key);t.oncomplete=()=>{db.close();res(value)};t.onerror=()=>{db.close();rej(t.error)}})}catch(e){localStorage.setItem('sk:'+key,JSON.stringify(value));return value}}
 async function get(key,fallback=null){try{const db=await open();return await new Promise((res,rej)=>{const t=db.transaction(STORE,'readonly');const r=t.objectStore(STORE).get(key);r.onsuccess=()=>{db.close();res(r.result===undefined?fallback:r.result)};r.onerror=()=>{db.close();rej(r.error)}})}catch(e){try{const v=localStorage.getItem('sk:'+key);return v===null?fallback:JSON.parse(v)}catch(_){return fallback}}}
 async function remove(key){try{const db=await open();return await new Promise((res,rej)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).delete(key);t.oncomplete=()=>{db.close();res()};t.onerror=()=>{db.close();rej(t.error)}})}catch(e){localStorage.removeItem('sk:'+key)}}
 window.SchatzkarteStore={set,get,remove,ready:()=>('indexedDB' in window)};
})();
