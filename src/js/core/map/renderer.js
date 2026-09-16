/* Schatz-Karte Core — rendering coordinator
 * Phase 7: centralizes batched map rendering and layer synchronization.
 * It deliberately does not own data fetching or category rules.
 */
(function(){
  'use strict';
  if(window.SCHATZKARTE_MAP_RENDERER) return;

  const nextFrame = (fn)=>{
    if(typeof window.requestAnimationFrame==='function') return window.requestAnimationFrame(fn);
    return window.setTimeout(fn,0);
  };

  async function renderRows(rows, addRow, options){
    const list=Array.isArray(rows)?rows:[];
    if(typeof addRow!=='function') throw new TypeError('[Map Renderer] addRow must be a function');
    const o=options||{};
    const mobileLimit=Number.isFinite(o.mobileBatchSize)?o.mobileBatchSize:30;
    const desktopLimit=Number.isFinite(o.desktopBatchSize)?o.desktopBatchSize:80;
    const mobileMax=Number.isFinite(o.mobileBreakpoint)?o.mobileBreakpoint:700;
    const batchSize=window.innerWidth<=mobileMax?mobileLimit:desktopLimit;
    let index=0, accepted=0, skipped=0;

    await new Promise(resolve=>{
      const step=()=>{
        const end=Math.min(index+Math.max(1,batchSize),list.length);
        for(;index<end;index++){
          try{
            if(addRow(list[index])!==false) accepted++;
            else skipped++;
          }catch(error){
            skipped++;
            if(typeof o.onError==='function') o.onError(error,list[index],index);
          }
        }
        if(typeof o.onProgress==='function'){
          try{o.onProgress(index,list.length,accepted,skipped);}catch(_){ }
        }
        if(index<list.length) nextFrame(step);
        else resolve();
      };
      nextFrame(step);
    });

    return {processed:index,accepted,skipped};
  }

  function syncLayer(group){
    if(!group || !group._dirty || typeof group._sync!=='function') return false;
    group._sync();
    return true;
  }

  function syncAll(layers){
    const source=layers || window.LAYER || {};
    let synced=0;
    Object.values(source).forEach(group=>{
      try{ if(syncLayer(group)) synced++; }
      catch(error){ console.warn('[Map Renderer] layer sync failed',error); }
    });
    return synced;
  }

  window.SCHATZKARTE_MAP_RENDERER=Object.freeze({
    version:'7.0.0',
    renderRows,
    syncLayer,
    syncAll
  });
})();
