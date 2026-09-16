(function(){
  'use strict';
  if(window.SchatzkarteDialog)return;
  function show(options){return new Promise(resolve=>{
    let root=document.getElementById('skAppDialog');if(root)root.remove();
    root=document.createElement('div');root.id='skAppDialog';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
    const fields=(options.fields||[]).map((f,i)=>'<label for="skDialogField'+i+'">'+escapeHtml(f.label)+'</label>'+(f.multiline?'<textarea':'<input')+' id="skDialogField'+i+'" maxlength="'+Number(f.maxlength||4000)+'">'+(f.multiline?escapeHtml(f.value||'')+'</textarea>':'') ).join('');
    root.innerHTML='<div class="sk-dialog-card"><h2>'+escapeHtml(options.title||'Schatz-Karte')+'</h2><p>'+escapeHtml(options.message||'')+'</p>'+fields+'<div class="sk-dialog-actions">'+(options.cancelText?'<button type="button" data-action="cancel">'+escapeHtml(options.cancelText)+'</button>':'')+'<button type="button" class="'+(options.danger?'sk-dialog-danger':'sk-dialog-primary')+'" data-action="ok">'+escapeHtml(options.okText||'OK')+'</button></div></div>';
    document.body.appendChild(root);
    (options.fields||[]).forEach((f,i)=>{const el=document.getElementById('skDialogField'+i);if(el&&!f.multiline)el.value=f.value||'';});
    const done=value=>{root.remove();resolve(value);};
    root.addEventListener('click',e=>{const action=e.target.closest?.('[data-action]')?.dataset.action;if(action==='cancel'||e.target===root)done(null);if(action==='ok'){const values=(options.fields||[]).map((_,i)=>document.getElementById('skDialogField'+i)?.value||'');done(options.fields?.length?values:true);}});
    root.addEventListener('keydown',e=>{if(e.key==='Escape'&&options.cancelText)done(null);});
    setTimeout(()=>document.getElementById('skDialogField0')?.focus(),60);
  });}
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  window.SchatzkarteDialog={
    alert:(message,title)=>show({title:title||'Hinweis',message,okText:'Verstanden'}),
    confirm:(message,options={})=>show({title:options.title||'Bitte bestätigen',message,cancelText:options.cancelText||'Abbrechen',okText:options.okText||'Bestätigen',danger:!!options.danger}),
    form:(options)=>show(options)
  };
})();
