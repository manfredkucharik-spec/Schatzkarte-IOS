/* iOS-only native shell controller. Android/Web base is intentionally untouched. */
(function(){
  'use strict';
  const root=document.documentElement;
  root.classList.add('sk-ios-native');
  const cap=window.Capacitor;
  if(!cap || typeof cap.registerPlugin!=='function') return;
  const Keyboard=cap.registerPlugin('Keyboard');
  const StatusBar=cap.registerPlugin('StatusBar');
  let keyboardHeight=0;

  function setKeyboardHeight(px){
    keyboardHeight=Math.max(0,Math.round(Number(px)||0));
    root.style.setProperty('--sk-ios-keyboard-height',keyboardHeight+'px');
    document.body?.classList.toggle('sk-ios-keyboard-open',keyboardHeight>0);
  }
  async function configureNativeShell(){
    try{await StatusBar.setOverlaysWebView({overlay:false});}catch(e){console.warn('[iOS] status bar overlay',e)}
    try{await StatusBar.setStyle({style:'LIGHT'});}catch(e){console.warn('[iOS] status bar style',e)}
    try{await StatusBar.show({animation:'NONE'});}catch(_){try{await StatusBar.show();}catch(e){console.warn('[iOS] status bar show',e)}}
    try{await Keyboard.setResizeMode({mode:'none'});}catch(e){console.warn('[iOS] keyboard resize mode',e)}
  }
  function stableMapAfterKeyboard(){
    setTimeout(function(){
      try{
        if(window.map && typeof window.map.invalidateSize==='function') window.map.invalidateSize(false);
        if(typeof window.__positionWanderCombined==='function') window.__positionWanderCombined();
      }catch(_){ }
    },180);
  }
  try{
    Keyboard.addListener('keyboardWillShow',function(info){setKeyboardHeight(info?.keyboardHeight||0);});
    Keyboard.addListener('keyboardDidShow',function(info){setKeyboardHeight(info?.keyboardHeight||keyboardHeight);});
    Keyboard.addListener('keyboardWillHide',function(){setKeyboardHeight(0);});
    Keyboard.addListener('keyboardDidHide',function(){setKeyboardHeight(0);stableMapAfterKeyboard();});
  }catch(e){console.warn('[iOS] keyboard listeners',e)}

  window.addEventListener('orientationchange',function(){setKeyboardHeight(0);stableMapAfterKeyboard();},{passive:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',configureNativeShell,{once:true});
  else configureNativeShell();
})();
