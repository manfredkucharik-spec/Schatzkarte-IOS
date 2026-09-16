/* Phase 11 — mobile capability helpers. No platform-specific UI duplication. */
(function(){'use strict';
 const isMobile=()=>/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)||Math.min(innerWidth,innerHeight)<700;
 function init(){document.documentElement.classList.toggle('sk-mobile',isMobile());document.documentElement.classList.toggle('sk-native',!!window.Capacitor);}
 window.SchatzkarteMobileUI={isMobile,init}; if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
