/* Schatz-Karte Phase 9 — Camera Core
 * One interface for native iOS/Android and browser fallback.
 */
(function(){
  'use strict';
  const NativeCamera = window.Capacitor && window.Capacitor.Plugins ? window.Capacitor.Plugins.Camera : null;

  async function capturePhoto(options={}){
    const quality = Number.isFinite(options.quality) ? options.quality : 70;
    if(NativeCamera && typeof NativeCamera.getPhoto === 'function'){
      const photo = await NativeCamera.getPhoto({
        quality,
        width: options.width || 1200,
        height: options.height || 1200,
        allowEditing: false,
        resultType: 'dataUrl',
        source: 'CAMERA',
        saveToGallery: false,
        promptLabelHeader: options.promptLabelHeader || undefined
      });
      return photo && photo.dataUrl ? photo.dataUrl : null;
    }

    return new Promise((resolve,reject)=>{
      const input=document.createElement('input');
      input.type='file';
      input.accept='image/*';
      input.setAttribute('capture','environment');
      input.style.display='none';
      document.body.appendChild(input);
      input.addEventListener('change',()=>{
        const file=input.files && input.files[0];
        if(!file){ cleanup(); resolve(null); return; }
        const reader=new FileReader();
        reader.onload=()=>{ const result=reader.result; cleanup(); resolve(typeof result==='string'?result:null); };
        reader.onerror=()=>{ cleanup(); reject(reader.error || new Error('Foto konnte nicht gelesen werden.')); };
        reader.readAsDataURL(file);
      },{once:true});
      input.click();
      function cleanup(){ try{input.remove();}catch(_){} }
    });
  }

  async function requestPermissions(){
    if(NativeCamera && typeof NativeCamera.requestPermissions==='function'){
      return NativeCamera.requestPermissions({permissions:['camera','photos']});
    }
    return {camera:'granted',photos:'granted'};
  }

  window.SchatzkarteCamera={capturePhoto,requestPermissions,available:!!NativeCamera};
})();
