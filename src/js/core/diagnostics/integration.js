/* Phase 14 — runtime diagnostics; intentionally non-invasive. */
(function(){'use strict';
 function run(){const checks=[
  ['Supabase',!!window.SchatzkarteSupabase||!!window.getClient],
  ['GPS',!!window.SchatzkarteGPS],['Camera',!!window.SchatzkarteCamera],
  ['Store',!!window.SchatzkarteStore],['Offline',!!window.SchatzkarteOffline],
  ['MobileUI',!!window.SchatzkarteMobileUI],['Notifications',!!window.SchatzkarteNotifications]
 ]; const result=Object.fromEntries(checks);result.native=!!window.Capacitor;result.online=navigator.onLine!==false;window.SchatzkarteDiagnostics=result;return result}
 window.SchatzkarteDiagnosticsRun=run; if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
})();
