/* Schatz-Karte Core — single Supabase client/config source of truth. */
(function(){
  "use strict";
  if(window.__SCHATZKARTE_SUPABASE_CLIENT__) return;
  const config=window.MAP_SUPABASE||{
    url:'https://ycdzzlkzvsmyklmwearl.supabase.co',
    anonKey:'sb_publishable_2bR4G0eeoy0Vsg4PVQ1Iyw_f_-qcbsX'
  };
  window.MAP_SUPABASE=Object.freeze({url:config.url,anonKey:config.anonKey});
  if(!window.mapSupabase){
    if(window.supabase?.createClient){
      window.mapSupabase=window.supabase.createClient(window.MAP_SUPABASE.url,window.MAP_SUPABASE.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    }else console.error('[Schatz-Karte] Supabase SDK konnte nicht geladen werden.');
  }
  window.__SCHATZKARTE_SUPABASE_CLIENT__=true;
})();
