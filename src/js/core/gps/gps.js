/* Schatz-Karte Core — GPS / location bridge.
 * Phase 8: one API for Capacitor native builds and secure-browser fallback.
 */
(function(){
  "use strict";
  if(window.SCHATZKARTE_GPS) return;

  const DEFAULTS={enableHighAccuracy:true,timeout:20000,maximumAge:0};
  let nativeWatchId=null;
  function ui(v){ return window.SKUI?.text?.(v) || v; }

  function isNative(){
    try{
      return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform==='function' && window.Capacitor.isNativePlatform());
    }catch(e){ return false; }
  }

  function nativePlugin(){
    try{
      return window.Capacitor?.Plugins?.Geolocation || null;
    }catch(e){ return null; }
  }

  function normalizeOptions(options){
    const o=Object.assign({},DEFAULTS,options||{});
    if(Number.isFinite(o.timeout)) o.timeout=Math.max(1000,Number(o.timeout));
    if(Number.isFinite(o.maximumAge)) o.maximumAge=Math.max(0,Number(o.maximumAge));
    return o;
  }

  async function ensurePermission(){
    const plugin=nativePlugin();
    if(!isNative() || !plugin || typeof plugin.checkPermissions!=='function') return null;
    let p=await plugin.checkPermissions();
    if(p.location==='denied' || p.coarseLocation==='denied') return p;
    if((p.location==='prompt'||p.location==='prompt-with-rationale'||p.coarseLocation==='prompt') && typeof plugin.requestPermissions==='function') p=await plugin.requestPermissions();
    return p;
  }

  async function getCurrentPosition(options){
    const opts=normalizeOptions(options);
    if(isNative()){
      const plugin=nativePlugin();
      if(!plugin || typeof plugin.getCurrentPosition!=='function') throw new Error(ui('Native GPS ist in dieser App-Version nicht verfügbar.'));
      const permission=await ensurePermission();
      if(permission && permission.location==='denied' && permission.coarseLocation==='denied'){
        const e=new Error(ui('Standortzugriff verweigert.')); e.code=1; throw e;
      }
      return plugin.getCurrentPosition({enableHighAccuracy:!!opts.enableHighAccuracy,timeout:opts.timeout,maximumAge:opts.maximumAge});
    }
    if(!window.isSecureContext && location.hostname!=='localhost' && location.hostname!=='127.0.0.1'){
      const e=new Error(ui('GPS im Browser benötigt HTTPS.')); e.code=1; throw e;
    }
    if(!navigator.geolocation) throw new Error(ui('Dieser Browser unterstützt keine Geolokalisation.'));
    return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,opts));
  }

  async function startWatch(onPosition,onError,options){
    const opts=normalizeOptions(options);
    stopWatch();
    if(isNative()){
      const plugin=nativePlugin();
      if(!plugin || typeof plugin.watchPosition!=='function') throw new Error(ui('Native GPS-Watch ist nicht verfügbar.'));
      const permission=await ensurePermission();
      if(permission && permission.location==='denied' && permission.coarseLocation==='denied'){
        const e=new Error(ui('Standortzugriff verweigert.')); e.code=1; throw e;
      }
      nativeWatchId=await plugin.watchPosition({enableHighAccuracy:!!opts.enableHighAccuracy,timeout:opts.timeout,maximumAge:opts.maximumAge},(position,err)=>{
        if(err){ onError?.(err); return; }
        if(position) onPosition?.(position);
      });
      return nativeWatchId;
    }
    if(!navigator.geolocation) throw new Error(ui('Dieser Browser unterstützt keine Geolokalisation.'));
    nativeWatchId=navigator.geolocation.watchPosition(onPosition,onError,opts);
    return nativeWatchId;
  }

  async function stopWatch(){
    const id=nativeWatchId;
    nativeWatchId=null;
    if(id==null) return;
    if(isNative()){
      const plugin=nativePlugin();
      try{ if(plugin?.clearWatch) await plugin.clearWatch({id}); }catch(e){ console.warn('[GPS] clearWatch',e); }
    }else{
      try{ navigator.geolocation.clearWatch(id); }catch(e){}
    }
  }

  window.SCHATZKARTE_GPS=Object.freeze({
    isNative,
    getCurrentPosition,
    startWatch,
    stopWatch,
    hasNativePlugin:()=>!!nativePlugin()
  });
})();
