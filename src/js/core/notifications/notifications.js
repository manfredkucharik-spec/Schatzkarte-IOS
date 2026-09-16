/* Phase 12 — local notifications bridge. */
(function(){'use strict';
 const N=window.Capacitor&&window.Capacitor.Plugins?window.Capacitor.Plugins.LocalNotifications:null;
 async function permission(){if(!N?.requestPermissions)return {display:'granted'};return N.requestPermissions()}
 async function schedule(opts={}){if(!N?.schedule)throw new Error('Native notifications are unavailable');return N.schedule({notifications:[{id:Number(opts.id||Date.now()%2147483647),title:opts.title||'Schatz-Karte',body:opts.body||'',schedule:opts.at?{at:new Date(opts.at)}:undefined}]})}
 async function cancel(id){if(N?.cancel)return N.cancel({notifications:[{id:Number(id)}]})}
 window.SchatzkarteNotifications={available:!!N,permission,schedule,cancel};
})();
