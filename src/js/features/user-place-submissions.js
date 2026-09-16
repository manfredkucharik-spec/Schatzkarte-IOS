(function(){
  'use strict';
  if(window.SchatzkartePlaceSubmission) return;

  const $ = id => document.getElementById(id);
  const ui = v => window.SKUI?.text(v)||v;
  let state = {lat:null,lon:null,accuracy:null,image:null,imageBlob:null};
  let layer = null;

  const taxonomy = {
    loaded:false,
    loading:null,
    categories:[],
    subtypes:[],
    periods:[],
    translations:[],
    byKey:new Map(),
    sections:[]
  };

  function esc(v){
    return String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function session(){
    return window.mapSupabase.auth.getSession().then(r=>r?.data?.session||null);
  }
  function language(){
    return String(document.documentElement.lang || localStorage.getItem('historischeAbenteuerkarte.language') || 'de').toLowerCase().slice(0,2);
  }
  function translatedCategoryLabel(row){
    if(!row) return '';
    const lang=language();
    if(lang==='de') return row.label||row.key;
    const hit=taxonomy.translations.find(x=>x.category_key===row.key&&x.language===lang);
    return hit?.label || row.label || row.key;
  }
  function subtypeLabel(row){ const v=row?.label || row?.key || ''; return window.SKUI?.text(v)||v; }
  function canonicalPeriod(value){
    const raw=String(value||'').trim();
    if(!raw) return '';
    const direct=taxonomy.periods.find(x=>x.period_value===raw||x.key===raw||x.label===raw);
    if(direct) return direct.period_value;
    const p=raw.toLowerCase().replace(/[–—]/g,'-');
    if(/ww1|erster\s*weltkrieg|first\s*world\s*war|1914\s*[-/]\s*1918/.test(p)) return 'ww1';
    if(/ww2|zweiter\s*weltkrieg|second\s*world\s*war|1939\s*[-/]\s*1945/.test(p)) return 'ww2';
    if(/kalter\s*krieg|cold\s*war|moderne\s*geschichte|postwar|contemporary|gegenwart/.test(p)) return 'cold_war_modern';
    if(/wikinger|viking/.test(p)) return 'vikings';
    if(/röm|roem|roman/.test(p)) return 'roman';
    if(/frühmittelalter|fruehmittelalter|hochmittelalter|spätmittelalter|spaetmittelalter|mittelalter|medieval/.test(p)) return 'medieval';
    if(/urgeschichte|vorgeschichte|prehistor|neolith|bronzezeit|eisenzeit|antike|antiquity/.test(p)) return 'prehistoric';
    if(/napoleon|frühe\s*neuzeit|fruehe\s*neuzeit|zwischenkriegs|vorkriegs|neuzeit|early\s*modern|modern/.test(p)) return 'modern';
    return '';
  }
  function periodLabel(value){
    const p=taxonomy.periods.find(x=>x.period_value===value||x.key===value);
    const v=p?.label || value || ''; return window.SKUI?.text(v)||v;
  }
  function sectionLabel(key,fallback){
    const lang=language();
    const labels={
      de:{recommended:'⭐ Empfohlene Sondenplätze',historical:'🏛️ Historisches & Archäologie',vikings:'🪓 Wikingerzeit (ca. 750–1100)',napoleonic:'🇫🇷 Napoleonische Kriege (1792–1815)',cold_war:'☢️ Kalter Krieg & Stellvertreterkriege (ca. 1947–1991)',ww1:'🪖 Erster Weltkrieg (1914–1918)',ww2:'🎖️ Zweiter Weltkrieg (1939–1945)',modern_military:'🎖️ Moderne Militäranlagen',lost_places:'🏚️ Lost Places',magnet:'🎣 Magnetfischen & Fischen'},
      en:{recommended:'⭐ Recommended detecting spots',historical:'🏛️ History & Archaeology',vikings:'🪓 Viking Age (ca. 750–1100)',napoleonic:'🇫🇷 Napoleonic Wars (1792–1815)',cold_war:'☢️ Cold War & proxy conflicts',ww1:'🪖 First World War (1914–1918)',ww2:'🎖️ Second World War (1939–1945)',modern_military:'🎖️ Modern military sites',lost_places:'🏚️ Lost Places',magnet:'🎣 Magnet fishing & fishing'},
      cs:{recommended:'⭐ Doporučená místa pro hledání',historical:'🏛️ Historie a archeologie',vikings:'🪓 Vikingské období (cca 750–1100)',napoleonic:'🇫🇷 Napoleonské války (1792–1815)',cold_war:'☢️ Studená válka a zástupné konflikty',ww1:'🪖 První světová válka (1914–1918)',ww2:'🎖️ Druhá světová válka (1939–1945)',modern_military:'🎖️ Moderní vojenská zařízení',lost_places:'🏚️ Lost Places',magnet:'🎣 Magnet fishing'},
      hu:{recommended:'⭐ Ajánlott keresőhelyek',historical:'🏛️ Történelem és régészet',vikings:'🪓 Viking kor (kb. 750–1100)',napoleonic:'🇫🇷 Napóleoni háborúk (1792–1815)',cold_war:'☢️ Hidegháború és helyettesítő konfliktusok',ww1:'🪖 Első világháború (1914–1918)',ww2:'🎖️ Második világháború (1939–1945)',modern_military:'🎖️ Modern katonai létesítmények',lost_places:'🏚️ Lost Places',magnet:'🎣 Mágneshorgászat'}
    };
    return labels[lang]?.[key] || fallback || key;
  }

  async function loadTaxonomy(force=false){
    if(taxonomy.loaded&&!force) return taxonomy;
    if(taxonomy.loading&&!force) return taxonomy.loading;
    taxonomy.loading=(async()=>{
      if(!window.mapSupabase?.from) throw new Error(window.SKUI?.text('Datenbank ist noch nicht bereit.')||'Datenbank ist noch nicht bereit.');
      const [cats,subs,periods,translations]=await Promise.all([
        window.mapSupabase.from('map_category_config').select('key,label,emoji,description,submission_section_key,submission_section_label,submission_section_order,submission_sort_order,submission_requires_subcategory,submission_target_category,submission_target_subtype,submission_default_period,submission_lock_period,submission_object_type').eq('enabled',true).eq('submission_enabled',true).order('submission_section_order').order('submission_sort_order'),
        window.mapSupabase.from('map_category_submission_subtypes').select('category_key,key,label,emoji,sort_order,target_category,target_subtype,default_period,lock_period').eq('enabled',true).order('sort_order'),
        window.mapSupabase.from('map_period_config').select('key,label,period_value,sort_order').eq('enabled',true).order('sort_order'),
        window.mapSupabase.from('map_category_translations').select('category_key,language,label')
      ]);
      if(cats.error) throw cats.error;
      if(subs.error) throw subs.error;
      if(periods.error) throw periods.error;
      taxonomy.categories=Array.isArray(cats.data)?cats.data:[];
      taxonomy.subtypes=Array.isArray(subs.data)?subs.data:[];
      taxonomy.periods=Array.isArray(periods.data)?periods.data:[];
      taxonomy.translations=translations.error?[]:(Array.isArray(translations.data)?translations.data:[]);
      taxonomy.byKey=new Map(taxonomy.categories.map(x=>[x.key,x]));
      const sections=new Map();
      taxonomy.categories.forEach(c=>{
        const key=c.submission_section_key||'other';
        if(!sections.has(key)) sections.set(key,{key,label:c.submission_section_label||key,order:Number(c.submission_section_order)||999,categories:[]});
        sections.get(key).categories.push(c);
      });
      taxonomy.sections=[...sections.values()].sort((a,b)=>a.order-b.order||a.label.localeCompare(b.label,'de'));
      taxonomy.loaded=true;
      return taxonomy;
    })();
    try{return await taxonomy.loading;}finally{taxonomy.loading=null;}
  }

  function subtypesFor(categoryKey){
    return taxonomy.subtypes.filter(x=>x.category_key===categoryKey).sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0));
  }
  function getCategory(key){ return taxonomy.byKey.get(String(key||''))||null; }
  function selectedMeta(categoryKey,subcategoryKey,periodValue){
    const category=getCategory(categoryKey);
    const subtype=category?.submission_requires_subcategory?subtypesFor(categoryKey).find(x=>x.key===subcategoryKey)||null:null;
    const defaultPeriod=canonicalPeriod(subtype?.default_period||category?.submission_default_period||'');
    const locked=Boolean(subtype?.lock_period||category?.submission_lock_period);
    const requested=canonicalPeriod(periodValue);
    const period=locked&&defaultPeriod?defaultPeriod:(requested||defaultPeriod||'');
    return {category,subtype,period,locked,defaultPeriod};
  }

  function legacyLostCategory(sub){
    const map={
      'Verlassene Gebäude & Orte (allgemein)':'lostplaces',
      'Verlassene Krankenhäuser':'lostplaces_hospitals',
      'Verlassene Hotels':'lostplaces_hotels',
      'Verlassene Schulen':'lostplaces_schools',
      'Verlassene Industrieanlagen':'lostplaces_industry',
      'Verlassene Städte & Siedlungen':'lostplaces_cities',
      'Verlassene Höfe & Bauernhöfe':'lostplaces_farms',
      'Verlassene Militäranlagen':'lostplaces_military',
      'Verlassene Ruinen & Wüstungen':'lostplaces_ruins',
      'Vergessene & unbekannte Orte':'forgotten'
    };
    return map[sub]||'lostplaces';
  }
  function normalizeLegacySelection(category,subcategory,title='',period=''){
    period=canonicalPeriod(period);
    const raw=String(category||'').trim(),sub=String(subcategory||'').trim(),blob=(raw+' '+sub+' '+title).toLowerCase(),p=String(period||'').toLowerCase();
    const graveSub=()=>{
      if(/grabhügel|grabhugel|hügelgrab|huegelgrab|barrow|tumulus|tumuli|mohyla|halomsír|halomsir/.test(blob)) return 'burial_mounds';
      if(/gräberfeld|graeberfeld|nekropole|grave field|gravefield|necropolis|friedhof|cemetery/.test(blob)) return 'cemeteries_necropolises';
      if(/megalith|dolmen|steingrab|ganggrab|passage grave|stone grave/.test(blob)) return 'megalithic_tombs';
      if(/urnenfeld|brandgrab|brandgräber|brandgraeber|urnfield|cremation/.test(blob)) return 'cemeteries_necropolises';
      if(/einzelgrab|einzelgräber|einzelgraeber|bestattung|single grave|single burial|grave site|burial site|grab\b/.test(blob)) return 'individual_graves';
      return 'individual_graves';
    };
    if(taxonomy.byKey.has(raw)) return {category:raw,subcategory:sub||'',period:period||''};
    if(raw==='Burg & Ruine'||raw==='Burgen'||raw==='Schlösser'||raw==='Ruinen'){
      let sk='castle';
      if(raw==='Schlösser'||/schloss|palace|palais|château|chateau|zámek|zamek|kastély|kastely/.test(blob)) sk='palace';
      else if(raw==='Ruinen'||/ruine|ruin|burgstall/.test(blob)) sk='castle_ruin';
      else if(/herrensitz|gutshof|adelssitz/.test(blob)) sk='manor_estate';
      return {category:'castles_ruins_estates',subcategory:sk,period:period||''};
    }
    if(raw==='Gräber & Bestattungsplätze'||raw==='Graeber & Bestattungsplaetze') return {category:'graves_burial_sites',subcategory:graveSub(),period:period||''};
    if(raw==='Lost Places') return {category:legacyLostCategory(sub),subcategory:'',period:period||''};
    if(raw==='Magnetfischen') return {category:'magnet',subcategory:'',period:period||''};
    if(raw==='Empfohlene Sondenplätze'||raw==='recommended_search') return {category:'recommended_search',subcategory:'',period:period||''};
    if(raw==='Archäologie') return {category:/röm|roman/.test(blob)?'roman_sites':'historical_places_buildings',subcategory:'',period:period||''};
    if(raw==='Historischer Ort'||raw==='Sonstiges') return {category:'historical_places_buildings',subcategory:'',period:period||''};
    if(raw==='Bunker & Militär'){
      if(/zweiter|ww2|wk2/.test(p+' '+blob)) return {category:'ww2_bunkers',subcategory:'',period:period||'ww2'};
      if(/erster|ww1|wk1/.test(p+' '+blob)) return {category:'ww1_positions',subcategory:'',period:period||'ww1'};
      return {category:'ancient_historical_military',subcategory:'',period:period||''};
    }
    if(/recommended_search|ai_sondenplatz/.test(blob)) return {category:'recommended_search',subcategory:'',period:period||''};
    if(/gräberfeld|graeberfeld|grabhügel|grabhugel|hügelgrab|huegelgrab|nekropole|megalith|dolmen|steingrab|urnenfeld|brandgrab|grab|gräber|bestattung/.test(blob)) return {category:'graves_burial_sites',subcategory:graveSub(),period:period||''};
    if(/lostplace|lost_place|abandoned/.test(blob)) return {category:'lostplaces',subcategory:'',period:period||''};
    if(/schloss|palace/.test(blob)) return {category:'castles_ruins_estates',subcategory:'palace',period:period||''};
    if(/ruine|ruin/.test(blob)) return {category:'castles_ruins_estates',subcategory:'castle_ruin',period:period||''};
    if(/burg|castle|fortress/.test(blob)) return {category:'castles_ruins_estates',subcategory:'castle',period:period||''};
    return {category:'historical_places_buildings',subcategory:'',period:period||''};
  }

  function reset(){
    state={lat:null,lon:null,accuracy:null,image:null,imageBlob:null};
    const w=$('upsWizard');
    w?.querySelector('form')?.reset();
    w?.querySelectorAll('.has-image').forEach(x=>x.classList.remove('has-image'));
    if($('upsPhotoPreview')) $('upsPhotoPreview').removeAttribute('src');
    showStep(1);syncPosition();
    renderTaxonomyControls();
  }

  function ensure(){
    if($('upsWizard')) return;
    const w=document.createElement('div');
    w.id='upsWizard';
    w.innerHTML=`
      <header class="ups-head"><button id="upsBack" type="button">‹</button><h2>📍 Ort zur Karte hinzufügen</h2><button id="upsClose" type="button">×</button></header>
      <div class="ups-steps"><div class="ups-step active" data-step="1"><i>1</i>Position</div><div class="ups-step" data-step="2"><i>2</i>Details</div><div class="ups-step" data-step="3"><i>3</i>Vorschau</div></div>
      <main class="ups-body">
        <section class="ups-page active" data-page="1"><h3>Position des Ortes</h3><p class="ups-intro">Wie möchtest du die Position festlegen?</p><button class="ups-choice" id="upsGps" type="button"><span>⌖</span>Meinen Standort verwenden</button><button class="ups-choice" id="upsPick" type="button"><span>▧</span>Position auf Satellitenkarte auswählen</button><div class="ups-position-card"><b id="upsPositionTitle">Noch keine Position gewählt</b><small id="upsCoords">GPS oder Karte verwenden</small></div><button class="ups-primary" id="upsToDetails" type="button" disabled>Position übernehmen</button></section>
        <section class="ups-page" data-page="2"><h3>Details zum Ort</h3><p class="ups-intro">Wähle den Bereich und genau die Kategorie, in der der Ort später auf der Karte erscheinen soll.</p>
          <form id="upsForm">
            <label class="ups-field">Titel *<input id="upsTitle" maxlength="160" required placeholder="z. B. Verlassene Mühle"></label>
            <label class="ups-field">Bereich *<select id="upsSection" required><option value="">Kategorien werden geladen …</option></select></label>
            <label class="ups-field">Kategorie *<select id="upsCategory" required disabled><option value="">Zuerst Bereich auswählen</option></select></label>
            <label class="ups-field ups-conditional" id="upsSubcategoryField" hidden>Unterkategorie *<select id="upsSubcategory"><option value="">Bitte auswählen</option></select></label>
            <label class="ups-field">Epoche <span class="ups-optional">optional</span><select id="upsPeriod"><option value="">Keine Angabe</option></select><small id="upsPeriodHint" class="ups-field-hint"></small></label>
            <label class="ups-field">Beschreibung *<textarea id="upsDescription" maxlength="4000" required placeholder="Was befindet sich dort? Welche sichtbaren Besonderheiten gibt es?"></textarea></label>
            <div class="ups-photo" id="upsPhotoBox"><img id="upsPhotoPreview" alt="Ausgewähltes Foto"><button class="ups-secondary" id="upsPhoto" type="button">Kamera / Foto hinzufügen</button></div>
            <button class="ups-primary" type="submit">Weiter zur Vorschau</button>
          </form>
        </section>
        <section class="ups-page" data-page="3"><h3>Vorschau</h3><p class="ups-intro">Bitte prüfe deinen Vorschlag vor dem Absenden.</p><article class="ups-preview" id="upsPreview"><img id="upsPreviewImage" alt="Foto des Ortes"><div class="ups-preview-content"><small id="upsPreviewCategory"></small><h3 id="upsPreviewTitle"></h3><p id="upsPreviewDescription"></p><small id="upsPreviewPeriod"></small><small id="upsPreviewCoords"></small></div></article><div class="ups-actions"><button class="ups-secondary" id="upsEdit" type="button">Bearbeiten</button><button class="ups-primary" id="upsSubmit" type="button">Vorschlag senden</button></div></section>
      </main>`;
    document.body.appendChild(w);
    const picker=document.createElement('div');
    picker.id='upsMapPicker';
    picker.innerHTML='<div class="ups-map-bar"><button class="ups-map-cancel" type="button">'+esc(ui('Abbrechen'))+'</button><button class="ups-map-confirm" type="button">'+esc(ui('Position übernehmen'))+'</button></div>';
    document.body.appendChild(picker);
    bind();
  }

  function showStep(n){
    document.querySelectorAll('.ups-page').forEach(x=>x.classList.toggle('active',x.dataset.page==n));
    document.querySelectorAll('.ups-step').forEach(x=>x.classList.toggle('active',x.dataset.step==n));
  }

  function populatePeriods(selected=''){
    const select=$('upsPeriod'); if(!select) return;
    select.innerHTML='<option value="">'+esc(ui('Keine Angabe'))+'</option>'+taxonomy.periods.map(p=>'<option value="'+esc(p.period_value)+'">'+esc(periodLabel(p.period_value))+'</option>').join('');
    if(selected&&[...select.options].some(o=>o.value===selected)) select.value=selected;
  }
  function renderTaxonomyControls(){
    const section=$('upsSection'),category=$('upsCategory'); if(!section||!category) return;
    if(!taxonomy.loaded){
      section.innerHTML='<option value="">'+esc(ui('Kategorien werden geladen …'))+'</option>';section.disabled=true;
      category.innerHTML='<option value="">'+esc(ui('Zuerst Kategorien laden'))+'</option>';category.disabled=true;
      populatePeriods();return;
    }
    section.disabled=false;
    section.innerHTML='<option value="">'+esc(ui('Bitte Bereich auswählen'))+'</option>'+taxonomy.sections.map(s=>'<option value="'+esc(s.key)+'">'+esc(sectionLabel(s.key,s.label))+'</option>').join('');
    category.innerHTML='<option value="">'+esc(ui('Zuerst Bereich auswählen'))+'</option>';category.disabled=true;
    populatePeriods();
    updateSubcategoryAndPeriod();
  }
  function onSectionChanged(){
    const key=$('upsSection')?.value||'',category=$('upsCategory'); if(!category)return;
    const section=taxonomy.sections.find(s=>s.key===key);
    const cats=section?.categories||[];
    category.disabled=!cats.length;
    category.innerHTML='<option value="">'+esc(ui('Bitte Kategorie auswählen'))+'</option>'+cats.map(c=>'<option value="'+esc(c.key)+'">'+esc((c.emoji?c.emoji+' ':'')+translatedCategoryLabel(c))+'</option>').join('');
    if($('upsSubcategory')) $('upsSubcategory').innerHTML='<option value="">'+esc(ui('Bitte auswählen'))+'</option>';
    if($('upsSubcategoryField')) $('upsSubcategoryField').hidden=true;
    populatePeriods();
    updateSubcategoryAndPeriod();
  }
  function updateSubcategoryAndPeriod(){
    const category=getCategory($('upsCategory')?.value),field=$('upsSubcategoryField'),sub=$('upsSubcategory'),period=$('upsPeriod'),hint=$('upsPeriodHint');
    if(!field||!sub||!period) return;
    const subs=category?subtypesFor(category.key):[];
    const needs=Boolean(category?.submission_requires_subcategory);
    field.hidden=!needs;
    sub.required=needs;
    sub.disabled=!needs;
    sub.innerHTML='<option value="">'+esc(ui('Bitte auswählen'))+'</option>'+subs.map(x=>'<option value="'+esc(x.key)+'">'+esc((x.emoji?x.emoji+' ':'')+subtypeLabel(x))+'</option>').join('');
    const def=category?.submission_default_period||'';
    const locked=Boolean(category?.submission_lock_period&&def);
    populatePeriods(def);
    period.disabled=locked;
    if(locked&&def) period.value=def;
    if(hint) hint.textContent=locked?'Für diese Kategorie wird die Epoche automatisch als „'+periodLabel(def)+'“ gespeichert.':'Du kannst die Epoche angeben, wenn sie bekannt ist.';
  }
  function onSubtypeChanged(){
    const cat=$('upsCategory')?.value||'',sub=$('upsSubcategory')?.value||'',period=$('upsPeriod'),hint=$('upsPeriodHint');
    const meta=selectedMeta(cat,sub,period?.value||'');
    if(!period) return;
    if(meta.locked&&meta.period){period.value=meta.period;period.disabled=true;if(hint)hint.textContent=ui('Für diese Auswahl wird die Epoche automatisch als „'+periodLabel(meta.period)+'“ gespeichert.');}
    else{period.disabled=false;if(!period.value&&meta.defaultPeriod)period.value=meta.defaultPeriod;if(hint)hint.textContent=ui('Du kannst die Epoche angeben, wenn sie bekannt ist.');}
  }
  function setSelection(sel){
    if(!taxonomy.loaded)return;
    const category=getCategory(sel.category); if(!category)return;
    const section=taxonomy.sections.find(s=>s.categories.some(c=>c.key===category.key));
    if(section){$('upsSection').value=section.key;onSectionChanged();}
    $('upsCategory').value=category.key;updateSubcategoryAndPeriod();
    if(category.submission_requires_subcategory&&sel.subcategory){$('upsSubcategory').value=sel.subcategory;onSubtypeChanged();}
    if(sel.period&&$('upsPeriod')&&!$('upsPeriod').disabled&&[...$('upsPeriod').options].some(o=>o.value===sel.period))$('upsPeriod').value=sel.period;
  }

  function syncPosition(){
    const valid=Number.isFinite(state.lat)&&Number.isFinite(state.lon);
    if($('upsPositionTitle')) $('upsPositionTitle').textContent=valid?'Position ausgewählt':'Noch keine Position gewählt';
    if($('upsCoords')) $('upsCoords').textContent=valid?state.lat.toFixed(6)+', '+state.lon.toFixed(6):'GPS oder Karte verwenden';
    if($('upsToDetails')) $('upsToDetails').disabled=!valid;
  }

  async function open(){
    ensure();reset();$('haiOverlay')?.classList.remove('open');$('upsWizard').classList.add('open');
    try{await loadTaxonomy();renderTaxonomyControls();}
    catch(e){console.warn('[Place submissions] taxonomy',e);const s=$('upsSection');if(s){s.disabled=true;s.innerHTML='<option>'+esc(ui('Kategorien konnten nicht geladen werden'))+'</option>';}await window.SchatzkarteDialog.alert(ui('Die Kategorien konnten gerade nicht aus der Datenbank geladen werden. Bitte versuche es erneut.'),ui('Kategorien nicht verfügbar'));}
  }
  function close(){closePicker(false);$('upsWizard')?.classList.remove('open');window.__historicalAI?.open?.('');}
  function gps(){
    const g=window.__schatzkarteGeo;if(!g){window.SchatzkarteDialog.alert(ui('GPS ist momentan nicht verfügbar.'));return;}
    g.getCurrentPosition(p=>{state.lat=Number(p.coords.latitude);state.lon=Number(p.coords.longitude);state.accuracy=Number(p.coords.accuracy)||null;syncPosition();},()=>window.SchatzkarteDialog.alert(ui('Standort konnte nicht bestimmt werden.')),{enableHighAccuracy:true,timeout:12000,maximumAge:0});
  }
  async function pick(){
    const button=$('upsPick');button.disabled=true;button.lastChild.textContent=' '+ui('Standort wird bestimmt …');
    try{
      await new Promise(resolve=>{const g=window.__schatzkarteGeo;if(!g){resolve();return;}g.getCurrentPosition(p=>{state.lat=Number(p.coords.latitude);state.lon=Number(p.coords.longitude);state.accuracy=Number(p.coords.accuracy)||null;resolve();},()=>resolve(),{enableHighAccuracy:true,timeout:12000,maximumAge:15000});});
      if(Number.isFinite(state.lat)&&Number.isFinite(state.lon)) window.map?.setView?.([state.lat,state.lon],18,{animate:false});
      $('upsWizard').classList.remove('open');$('haiOverlay')?.classList.remove('open');document.getElementById('skSatellite')?.click();$('upsMapPicker').classList.add('open');window.map?.invalidateSize?.();
    }finally{button.disabled=false;button.lastChild.textContent=' '+ui('Position auf Satellitenkarte auswählen');}
  }
  function closePicker(use){
    if(!$('upsMapPicker')?.classList.contains('open'))return;
    if(use&&window.map){const c=window.map.getCenter();state.lat=c.lat;state.lon=c.lng;state.accuracy=null;syncPosition();}
    $('upsMapPicker').classList.remove('open');$('upsWizard').classList.add('open');
  }
  function photo(){
    const input=document.createElement('input');input.type='file';input.accept='image/*';
    input.onchange=()=>{const file=input.files?.[0];if(!file)return;if(file.size>12e6){window.SchatzkarteDialog.alert(ui('Das Foto ist zu groß.'));return;}const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const max=1800,s=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);c.toBlob(b=>{state.imageBlob=b;state.image=c.toDataURL('image/jpeg',.82);$('upsPhotoPreview').src=state.image;$('upsPhotoBox').classList.add('has-image');URL.revokeObjectURL(url);},'image/jpeg',.82);};img.src=url;};
    input.click();
  }
  function currentSelection(){
    const category=$('upsCategory')?.value||'',subcategory=$('upsSubcategoryField')?.hidden?'':($('upsSubcategory')?.value||''),period=$('upsPeriod')?.value||'';
    return selectedMeta(category,subcategory,period);
  }
  function preview(){
    const title=$('upsTitle').value.trim(),desc=$('upsDescription').value.trim(),section=$('upsSection').value,cat=$('upsCategory').value,sub=$('upsSubcategoryField').hidden?'':$('upsSubcategory').value;
    const meta=selectedMeta(cat,sub,$('upsPeriod').value);
    if(title.length<2||desc.length<5||!section||!meta.category||(meta.category.submission_requires_subcategory&&!meta.subtype)){window.SchatzkarteDialog.alert(ui('Bitte fülle Titel, Bereich, Kategorie'+(meta.category?.submission_requires_subcategory?', Unterkategorie':'')+' und Beschreibung aus.'));return false;}
    $('upsPreviewTitle').textContent=title;$('upsPreviewDescription').textContent=desc;
    const parts=[sectionLabel(meta.category.submission_section_key,meta.category.submission_section_label),translatedCategoryLabel(meta.category)];if(meta.subtype)parts.push(subtypeLabel(meta.subtype));
    $('upsPreviewCategory').textContent=parts.join(' · ');
    $('upsPreviewPeriod').textContent=meta.period?'Epoche: '+periodLabel(meta.period):'Epoche: keine Angabe';
    $('upsPreviewCoords').textContent=state.lat.toFixed(6)+', '+state.lon.toFixed(6);
    const box=$('upsPreview');box.classList.toggle('has-image',!!state.image);if(state.image)$('upsPreviewImage').src=state.image;showStep(3);return true;
  }
  async function submit(){
    const b=$('upsSubmit');b.disabled=true;b.textContent=ui('Wird gesendet …');let uploaded='';
    try{
      const s=await session();if(!s)throw Error('Du bist nicht angemeldet.');
      const meta=currentSelection();if(!meta.category)throw Error('Bitte wähle eine gültige Kategorie.');if(meta.category.submission_requires_subcategory&&!meta.subtype)throw Error('Bitte wähle eine Unterkategorie.');
      const id=crypto.randomUUID(),payload={id,user_id:s.user.id,title:$('upsTitle').value.trim(),description:$('upsDescription').value.trim(),category:meta.category.key,subcategory:meta.subtype?.key||null,period:meta.period||null,latitude:state.lat,longitude:state.lon,location_accuracy:state.accuracy,status:'pending'};
      if(state.imageBlob){uploaded=s.user.id+'/'+id+'/place.jpg';const up=await window.mapSupabase.storage.from('user-place-submissions').upload(uploaded,state.imageBlob,{contentType:'image/jpeg',upsert:false});if(up.error)throw up.error;payload.image_path=uploaded;}
      const r=await window.mapSupabase.from('user_place_submissions').insert(payload).select('*').single();if(r.error)throw r.error;
      await addMarker(r.data);$('upsWizard').classList.remove('open');window.map?.setView?.([r.data.latitude,r.data.longitude],17,{animate:true});
      await window.SchatzkarteDialog.alert(ui('Der Ort ist jetzt als privater Vorschlag auf deiner Karte sichtbar. Für alle anderen erscheint er erst nach der Freigabe.'),ui('Vorschlag gespeichert'));
    }catch(e){if(uploaded)await window.mapSupabase.storage.from('user-place-submissions').remove([uploaded]);await window.SchatzkarteDialog.alert(ui('Der Vorschlag konnte nicht gespeichert werden:')+' '+(e.message||e),ui('Fehler'));}
    finally{b.disabled=false;b.textContent=ui('Vorschlag senden');}
  }

  async function saveResearchCandidate(item){
    const s=await session();if(!s)throw Error('Du bist nicht angemeldet.');
    await loadTaxonomy();
    const lat=Number(item?.lat),lon=Number(item?.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))throw Error('Dieser Treffer hat keine gültige Position.');
    const normalized=normalizeLegacySelection(item?.category_key||item?.submission_category||item?.category,item?.subcategory_key||item?.submission_subcategory||item?.subtype,item?.name,item?.period);
    const meta=selectedMeta(normalized.category,normalized.subcategory,normalized.period);
    if(!meta.category)throw Error('Für diesen Recherchetreffer konnte keine gültige Kartenkategorie bestimmt werden.');
    const id=crypto.randomUUID(),source=String(item?.source_url||item?.source||'Externe Recherche').trim();
    const payload={id,user_id:s.user.id,title:String(item?.name||'Extern recherchierter Ort').slice(0,160),description:(String(item?.description||'Extern recherchierter historischer Ortskandidat.')+'\n\nQuelle: '+source).slice(0,4000),category:meta.category.key,subcategory:meta.subtype?.key||null,latitude:lat,longitude:lon,location_accuracy:null,status:'pending',radius_m:Number.isFinite(Number(item?.radius_m))?Math.max(100,Math.min(5000,Math.round(Number(item.radius_m)))):null,period:meta.period||null,source_title:String(item?.source_title||item?.source||'').slice(0,300)||null,source_url:/^https:\/\//i.test(String(item?.source_url||''))?String(item.source_url).slice(0,1600):null,external_image_url:/^https:\/\//i.test(String(item?.image_url||''))?String(item.image_url).slice(0,1600):null};
    const r=await window.mapSupabase.from('user_place_submissions').insert(payload).select('*').single();if(r.error)throw r.error;
    const marker=await addMarker(r.data);window.map?.setView?.([lat,lon],17,{animate:true});setTimeout(()=>marker?.openPopup?.(),260);return Object.assign(r.data,{__marker:marker});
  }

  async function imageUrl(path){if(!path)return '';const r=await window.mapSupabase.storage.from('user-place-submissions').createSignedUrl(path,3600);return r.error?'':r.data?.signedUrl||'';}
  function ensureLayer(){if(!layer&&window.L){layer=window.L.layerGroup();layer.name='user_place_submissions';layer.addTo(window.map);}return layer;}
  function displayMeta(item){
    const normalized=normalizeLegacySelection(item?.category,item?.subcategory,item?.title,item?.period),meta=selectedMeta(normalized.category,normalized.subcategory,normalized.period);
    if(!meta.category)return {category:String(item?.category||''),subcategory:String(item?.subcategory||''),period:String(item?.period||'')};
    return {category:translatedCategoryLabel(meta.category),subcategory:meta.subtype?subtypeLabel(meta.subtype):'',period:meta.period?periodLabel(meta.period):''};
  }
  function popupHtml(item,url=''){
    const d=displayMeta(item),meta=[d.category,d.subcategory].filter(Boolean).join(' · ');
    return '<div class="ups-popup">'+(url?'<img src="'+esc(url)+'" alt="'+esc(ui('Foto des vorgeschlagenen Ortes'))+'">':'')+'<span class="ups-pending">'+esc(ui('Dein Vorschlag · wartet auf Freigabe'))+'</span><h3>'+esc(item.title)+'</h3><small>'+esc(meta)+'</small>'+(d.period?'<small class="ups-popup-period">'+esc(ui('Epoche'))+': '+esc(d.period)+'</small>':'')+'<p>'+esc(item.description)+'</p></div>';
  }
  async function addMarker(item){
    if(!ensureLayer())return null;
    const icon=window.L.divIcon({className:'ups-marker',html:'<div><span>!</span></div>',iconSize:[40,46],iconAnchor:[20,43],popupAnchor:[0,-40]});
    const marker=window.L.marker([Number(item.latitude),Number(item.longitude)],{icon,bubblingMouseEvents:false});marker.bindPopup(popupHtml(item),{maxWidth:320,closeButton:true});
    let photoLoaded=false;const external=/^https:\/\//i.test(String(item.external_image_url||''))?String(item.external_image_url):'';if(external)marker.bindPopup(popupHtml(item,external),{maxWidth:320,closeButton:true});
    marker.on('popupopen',async()=>{if(photoLoaded||!item.image_path)return;photoLoaded=true;try{const url=await imageUrl(item.image_path);if(url)marker.bindPopup(popupHtml(item,url),{maxWidth:320,closeButton:true});}catch(e){console.warn('[Place submissions] popup image',e);}});marker.addTo(layer);return marker;
  }
  async function load(){
    try{const s=await session();if(!s||!window.map)return;await loadTaxonomy();ensureLayer()?.clearLayers();const r=await window.mapSupabase.from('user_place_submissions').select('*').eq('status','pending').order('created_at',{ascending:false});if(r.error)throw r.error;(r.data||[]).forEach(addMarker);}catch(e){console.warn('[Place submissions]',e);}
  }
  function bind(){
    $('upsClose').onclick=close;$('upsBack').onclick=()=>{const page=document.querySelector('.ups-page.active')?.dataset.page;if(page==='1')close();else showStep(Number(page)-1);};$('upsGps').onclick=gps;$('upsPick').onclick=pick;$('upsToDetails').onclick=()=>showStep(2);$('upsSection').onchange=onSectionChanged;$('upsCategory').onchange=updateSubcategoryAndPeriod;$('upsSubcategory').onchange=onSubtypeChanged;$('upsPhoto').onclick=photo;$('upsForm').onsubmit=e=>{e.preventDefault();preview();};$('upsEdit').onclick=()=>showStep(2);$('upsSubmit').onclick=submit;$('upsMapPicker').querySelector('.ups-map-cancel').onclick=()=>closePicker(false);$('upsMapPicker').querySelector('.ups-map-confirm').onclick=()=>closePicker(true);
  }
  function init(){
    let n=0,t=setInterval(()=>{if(window.map&&window.mapSupabase){clearInterval(t);loadTaxonomy().then(load).catch(e=>console.warn('[Place submissions] taxonomy init',e));}else if(n++>100)clearInterval(t);},100);
    window.mapSupabase?.auth?.onAuthStateChange(e=>{if(e==='SIGNED_OUT')layer?.clearLayers();else if(['SIGNED_IN','INITIAL_SESSION'].includes(e))setTimeout(load,300);});
    document.addEventListener('map-language-changed',()=>{if(taxonomy.loaded&&$('upsWizard')){const sec=$('upsSection')?.value,cat=$('upsCategory')?.value,sub=$('upsSubcategory')?.value,per=$('upsPeriod')?.value;renderTaxonomyControls();if(sec){$('upsSection').value=sec;onSectionChanged();if(cat){$('upsCategory').value=cat;updateSubcategoryAndPeriod();if(sub)$('upsSubcategory').value=sub;if(per&&!$('upsPeriod').disabled)$('upsPeriod').value=per;}}}});
  }

  window.SchatzkartePlaceTaxonomy={load:loadTaxonomy,get data(){return taxonomy;},getCategory,subtypesFor,selectedMeta,normalizeLegacySelection,canonicalPeriod,translatedCategoryLabel,subtypeLabel,periodLabel,sectionLabel,setSelection};
  window.SchatzkartePlaceSubmission={open,load,saveResearchCandidate};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
