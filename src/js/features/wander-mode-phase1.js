(function(){
'use strict';
if(window.SchatzkarteWanderPhase1)return;

const $=id=>document.getElementById(id);
const ui=v=>window.SKUI?.text(v)||v;
const lng=()=>window.SKUI?.lang?.()||'de';
const locale=()=>({de:'de-DE',en:'en-GB',cs:'cs-CZ',hu:'hu-HU'}[lng()]||'de-DE');
const RADII=[100,250,300,500,1000,2000];
const DISCOVERY_RADIUS=100;
const XP_PER_DISCOVERY=20;
const KEY='schatzkarte_explorer_ui_v1';
const MODES={
  walk:{id:'walk',icon:'🚶',label:'Zu Fuß',maxSpeedMps:5.5,maximumAge:4000},
  bike:{id:'bike',icon:'🚲',label:'Fahrrad',maxSpeedMps:18,maximumAge:2500}
};
const CATS=[
  ['all','🧭','Alle Kategorien'],
  ['recommended','recommended','Empfohlene Sondenplätze'],
  ['history','archaeology','Historisches & Archäologie'],
  ['graves','graves_burial_sites','Gräber & Bestattungsplätze'],
  ['roads','roman_road','Historische Straßen & Routen'],
  ['vikings','viking','Wikingerzeit'],
  ['napoleonic','napoleonic','Napoleonische Kriege'],
  ['coldwar','cold_war_modern','Kalter Krieg'],
  ['ww1','ww1','Erster Weltkrieg'],
  ['ww2','ww2','Zweiter Weltkrieg'],
  ['military','modern_military','Moderne Militäranlagen'],
  ['lostplaces','lostplace_general','Lost Places'],
  ['magnet','magnet','Magnetfischen'],
  ['other','archaeology','Weitere & Sonstiges']
];
function art(key,size=34){if(key==='🧭')return '🧭';const u=window.SCHATZKARTE_CATEGORY_ICON_URL?.(key)||('icons/categories/'+key+'.webp');return '<img class="wm2-category-art" src="'+u+'" alt="" style="width:'+size+'px;height:'+size+'px;object-fit:contain">'}
const LAYERS={
  recommended:['road_hotspots','recommended_search','metaldetect'],
  history:['castles','palaces','castle_ruins','cities','cityhistory','medieval_sites','military','ancient_military','roman_sites','roman','outlaws','battles','archaeology'],
  graves:['graves_burial_mounds','graves_necropolises','graves_single_burials','graves_megalithic'],
  roads:['roman_roads_main_certain','roman_roads_main_conjectured','roman_roads_main_hypothetical','roman_roads_secondary_certain','roman_roads_secondary_conjectured','roman_roads_secondary_hypothetical','amber','danubian','medieval_trade'],
  vikings:['vikings','vikings_battles','vikings_settlements','vikings_findspots','vikings_ports','vikings_routes','vikings_graves','vikings_treasures','vikings_military'],
  napoleonic:['napoleonic_battles','napoleonic_camps','napoleonic_military'],
  coldwar:['cold_war_battles'],
  ww1:['ww1_battlefields','ww1_positions','ww1_trenches','ww1_military'],
  ww2:['ww2_battlefields','ww2_bunkers','ww2_positions','ww2_trenches','ww2_military','ww2_camps','ww2_industry','ww2_airforce','ww2_navy'],
  military:['modern_military'],
  lostplaces:['lostplaces','lost_places','lostplaces_hospitals','lostplaces_hotels','lostplaces_schools','lostplaces_industry','lostplaces_cities','lostplaces_farms','lostplaces_military','lostplaces_ruins','forgotten'],
  magnet:['magnet'],
  other:['protected','research']
};

let state={active:false,paused:false,follow:true,radius:300,categories:['all'],mode:'walk'};
let watchId=null;
let radiusLayer=null;
let nearbyLayer=null;
let lastPos=null;
let lastQueryPos=null;
let lastQueryAt=0;
let querying=false;
let runId=0;
let cache={rows:[],lat:null,lon:null,radius:0};
let programmaticMove=false;
let currentNearby=[];
let session=null;
let discoveryToastTimer=null;
let persistedDiscoveredIds=new Set();
let persistedDiscoveryUserId=null;
let nativeStateTimer=null;
let nativeDistanceOwner=false;
let nativeStateBusy=false;

function newSession(){
  return {
    startedAt:Date.now(),
    distanceM:0,
    discoveredIds:new Set(),
    discoveries:[],
    xp:0,
    tourId:null,
    lastCheckpointDistanceM:0,
    lastCheckpointAt:0,
    checkpointBusy:false,
    lastTrackPos:null,
    acceptedFixes:0,
    rejectedFixes:0
  };
}
function load(){
  try{
    const x=JSON.parse(localStorage.getItem(KEY)||'null');
    if(x)state={...state,...x,active:false,paused:false,follow:true};
  }catch(_){ }
  if(!MODES[state.mode])state.mode='walk';
  if(!RADII.includes(Number(state.radius)))state.radius=300;
  if(!Array.isArray(state.categories)||!state.categories.length)state.categories=['all'];
}
function save(){
  try{localStorage.setItem(KEY,JSON.stringify({radius:state.radius,categories:state.categories,mode:state.mode}));}catch(_){ }
}
function label(r){return r>=1000?(r/1000).toLocaleString(locale(),{maximumFractionDigits:1})+' km':r+' '+(lng()==='en'?'metres':lng()==='cs'?'metrů':lng()==='hu'?'méter':'Meter')}
function selectedText(){return state.categories.includes('all')?ui('Alle Kategorien'):(lng()==='en'?state.categories.length+' categories selected':lng()==='cs'?state.categories.length+' kategorií vybráno':lng()==='hu'?state.categories.length+' kategória kiválasztva':state.categories.length+' Kategorien ausgewählt')}
function modeMeta(){const m=MODES[state.mode]||MODES.walk;return {...m,label:ui(m.label)}}
function durationText(ms){
  const total=Math.max(0,Math.floor(ms/1000)),h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;
  if(h)return lng()==='en'?h+' h '+String(m).padStart(2,'0')+' min':lng()==='cs'?h+' h '+String(m).padStart(2,'0')+' min':lng()==='hu'?h+' ó '+String(m).padStart(2,'0')+' p':h+' Std. '+String(m).padStart(2,'0')+' Min.';
  if(m)return lng()==='hu'?m+' p '+String(s).padStart(2,'0')+' mp':m+' min '+String(s).padStart(2,'0')+' s';
  return lng()==='hu'?s+' mp':s+' s';
}
function kmText(m){return (Math.max(0,m)/1000).toLocaleString(locale(),{minimumFractionDigits:1,maximumFractionDigits:2})+' km'}
function distance(a,b){
  const R=6371000,p1=a.lat*Math.PI/180,p2=b.lat*Math.PI/180,dp=(b.lat-a.lat)*Math.PI/180,dl=(b.lon-a.lon)*Math.PI/180;
  const q=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(q)));
}
function normalize(v){return String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_')}
function graveExplorerLayer(sub){
  const s=normalize(sub);
  if(['burial_mounds','burial_mound','graves_burial_mounds'].includes(s))return'graves_burial_mounds';
  if(['cemeteries_necropolises','cemetery','necropolis','graves_necropolises'].includes(s))return'graves_necropolises';
  if(['megalithic_tombs','megalith','dolmen','graves_megalithic'].includes(s))return'graves_megalithic';
  return'graves_single_burials';
}
function layerOf(o){
  const c=normalize(o.category),s=normalize(o.subtype),p=normalize(o.period),blob=c+' '+s+' '+p;
  if(c==='lost_places')return'lostplaces';
  if(c==='recommended_search'||c==='metaldetect')return'road_hotspots';
  if(c==='graves_burial_sites'||c==='graves')return graveExplorerLayer(s);
  if(['graves_burial_mounds','graves_necropolises','graves_single_burials','graves_megalithic'].includes(c))return c;
  if(c==='ww2_airfields'||c==='ww2_air')return'ww2_airforce';
  if(c==='ww2_naval')return'ww2_navy';
  if(c==='ww2_defences')return'ww2_positions';
  if(c==='historical_places_buildings')return'cityhistory';
  if(c==='castles_ruins_estates')return'castles';
  if(c==='historical_ruins')return'castle_ruins';
  if(c==='cities_trade_centers')return'cities';
  if(c==='ancient_historical_military')return'military';
  if(c==='military_sites')return'military';
  if(c.startsWith('lostplaces_')||c.startsWith('ww1_')||c.startsWith('ww2_')||c.startsWith('vikings_')||c.startsWith('napoleonic_')||c.startsWith('roman_roads_'))return c;
  if(c==='lostplaces'){
    const x={hospital:'lostplaces_hospitals',hotel:'lostplaces_hotels',school:'lostplaces_schools',industrial:'lostplaces_industry',industry:'lostplaces_industry',city:'lostplaces_cities',farm:'lostplaces_farms',military:'lostplaces_military',ruin:'lostplaces_ruins'};
    return x[s]||'lostplaces';
  }
  if(/1939|1945|world_war_ii|zweiter_weltkrieg/.test(blob))return c==='bunkers'?'ww2_bunkers':'ww2_battlefields';
  if(/1914|1918|world_war_i|erster_weltkrieg/.test(blob))return'ww1_battlefields';
  return c||'cityhistory';
}
function wanted(o){
  if(state.categories.includes('all'))return true;
  const layer=layerOf(o);
  return state.categories.some(k=>(LAYERS[k]||[]).includes(layer));
}
function live(title,text,error=false){
  const box=$('wm2Live');if(!box)return;
  box.classList.toggle('error',error);
  box.querySelector('b').textContent=title;
  box.querySelector('small').textContent=text;
}
function sessionStats(){
  const s=session||newSession();
  return {distanceM:s.distanceM||0,discovered:s.discoveredIds?.size||0,durationMs:state.active?Date.now()-s.startedAt:0};
}
function mount(){
  const panel=$('skWander');if(!panel)return;
  load();
  panel.className='sk-panel sk-wander sk-wander-v2';
  panel.setAttribute('aria-label','Entdecker-Modus');
  panel.innerHTML=`
    <div class="wm2-handle"></div>
    <div class="wm2-head">
      <span class="wm2-head-icon">🧭</span>
      <div class="wm2-head-copy"><h2>Entdecker-Modus</h2><p>Entdecke historische Orte wirklich vor Ort.</p></div>
      <button class="wm2-close" type="button" aria-label="Schließen">×</button>
    </div>
    <div class="wm2-content">
      <div class="wm2-main-view">
        <div class="wm2-section-title">Wie bist du unterwegs?</div>
        <div class="wm2-mode-grid" id="wm2Modes">
          <button type="button" data-mode="walk"><span>🚶</span><b>Zu Fuß</b></button>
          <button type="button" data-mode="bike"><span>🚲</span><b>Fahrrad</b></button>
        </div>
        <div class="wm2-radius-head"><strong>Suchradius</strong><span class="wm2-radius-value" id="wm2RadiusValue"></span></div>
        <input class="wm2-range" id="wm2Radius" type="range" min="0" max="5" step="1">
        <div class="wm2-scale"><span>100 m</span><span>250 m</span><span>500 m</span><span>1 km</span><span>2 km</span></div>
        <div class="wm2-discovery-info"><span>🟢</span><div><b>Entdeckungszone: 100 m</b><small>Ein Ort zählt erst als entdeckt, wenn du dich ihm auf höchstens 100 Meter näherst.</small></div></div>
        <button class="wm2-category-button" id="wm2Categories" type="button"><span><b>Welche Kategorien suchen?</b><small id="wm2CategorySummary"></small></span><span>›</span></button>
        <div class="wm2-live" id="wm2Live"><span class="wm2-live-icon">⌖</span><div><b>Bereit</b><small>GPS startet erst mit dem Entdecker-Modus.</small></div></div>
        <button class="wm2-start" id="wm2Start" type="button">Entdecken starten</button>
        <p class="wm2-note">Nur während des aktiven Entdecker-Modus werden Strecke und Entdeckungen für diese Tour gezählt.</p>
      </div>
      <div class="wm2-category-view" hidden>
        <div class="wm2-subhead"><button class="wm2-back" type="button">‹</button><h3>Kategorien</h3></div>
        <div class="wm2-category-list" id="wm2CategoryList"></div>
        <button class="wm2-apply" type="button">Übernehmen</button>
      </div>
    </div>`;

  if(!$('wm2Status')){
    document.body.insertAdjacentHTML('beforeend',`
      <div id="wm2Status">
        <span class="wm2-status-icon">🧭</span>
        <div class="wm2-status-copy"><b>Entdecker-Modus aktiv</b><small><i class="wm2-dot"></i><span id="wm2StatusText"></span></small></div>
        <button class="wm2-follow" type="button" aria-label="Standort wieder verfolgen">◎</button>
        <button class="wm2-end" type="button">Beenden</button>
      </div>
      <div id="wm2DiscoveryToast" role="status" aria-live="polite">
        <div class="wm2-toast-visual"><span id="wm2DiscoveryToastIcon" class="wm2-toast-icon">🧭</span><i>✓</i></div>
        <div class="wm2-toast-copy">
          <span id="wm2DiscoveryToastEyebrow" class="wm2-toast-eyebrow">NEU ENTDECKT</span>
          <b id="wm2DiscoveryToastName">Historischer Ort</b>
          <small id="wm2DiscoveryToastMeta" class="wm2-toast-meta"></small>
          <div class="wm2-toast-rewards"><span id="wm2DiscoveryToastXp" class="wm2-toast-xp">+20 XP</span><span id="wm2DiscoveryToastTotal" class="wm2-toast-total"></span></div>
        </div>
      </div>
      <div id="wm2Dialog" class="wm2-dialog"><div class="wm2-dialog-card"><h3 id="wm2DialogTitle"></h3><p id="wm2DialogText"></p><div class="wm2-dialog-actions" id="wm2DialogActions"></div></div></div>`);
  }
  renderCats();bind();sync();
}
function renderCats(){
  const h=$('wm2CategoryList');if(!h)return;
  h.innerHTML=CATS.map(x=>'<label class="wm2-category-option"><span>'+art(x[1],28)+'</span><b>'+ui(x[2])+'</b><input type="checkbox" value="'+x[0]+'"></label>').join('');
  h.querySelectorAll('input').forEach(x=>x.checked=state.categories.includes(x.value));
}
function sync(){
  const start=$('wm2Start');
  if(start)start.textContent=state.active?'Entdecker-Modus beenden':'Entdecken starten';
  const range=$('wm2Radius');if(range)range.value=Math.max(0,RADII.indexOf(state.radius));
  if($('wm2RadiusValue'))$('wm2RadiusValue').textContent=label(state.radius);
  if($('wm2CategorySummary'))$('wm2CategorySummary').textContent=selectedText();
  document.querySelectorAll('#wm2Modes [data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode));
  const s=$('wm2Status');
  if(s){
    s.classList.toggle('active',state.active);
    const st=sessionStats(),mode=modeMeta();
    $('wm2StatusText').textContent=mode.icon+' '+mode.label+' · '+kmText(st.distanceM)+' · '+st.discovered+' entdeckt';
    s.querySelector('b').textContent=state.follow?'Entdecker-Modus aktiv':'Karte frei bewegt';
    const f=s.querySelector('.wm2-follow');
    f.classList.toggle('off',!state.follow);f.textContent=state.follow?'◎':'⌖';
  }
  save();
}
function view(main){
  const a=document.querySelector('#skWander .wm2-main-view'),b=document.querySelector('#skWander .wm2-category-view');
  if(a)a.hidden=!main;if(b)b.hidden=main;if(!main)renderCats();
}
function applyCats(){
  let a=[...$('wm2CategoryList').querySelectorAll('input:checked')].map(x=>x.value);
  state.categories=a.includes('all')||!a.length?['all']:a;
  cache.rows=[];lastQueryPos=null;view(true);sync();if(lastPos)search(lastPos,true);
}
function dialog(title,text,buttons){
  $('wm2DialogTitle').textContent=title;$('wm2DialogText').textContent=text;
  const h=$('wm2DialogActions');h.innerHTML='';
  buttons.forEach(b=>{
    const x=document.createElement('button');x.className=b.cls;x.textContent=b.text;
    x.onclick=()=>{closeDialog();b.go?.()};h.appendChild(x);
  });
  $('wm2Dialog').classList.add('open');
}
function closeDialog(){if($('wm2Dialog'))$('wm2Dialog').classList.remove('open')}
function radiusPoints(p,radius=state.radius){
  const points=[],latScale=radius/111320,lonScale=radius/(111320*Math.max(.2,Math.cos(p.lat*Math.PI/180)));
  for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;points.push([p.lat+Math.sin(a)*latScale,p.lon+Math.cos(a)*lonScale])}
  return points;
}
function updateCircle(p){
  if(!window.L||!window.map)return;
  if(!radiusLayer){radiusLayer=L.layerGroup();radiusLayer.name='__explorer_radius';radiusLayer.disableClustering=true;radiusLayer.addTo(map)}
  radiusLayer.clearLayers();
  const outer=L.polygon(radiusPoints(p,state.radius),{color:'#e8bd52',weight:3,opacity:1,fillColor:'#e8bd52',fillOpacity:.10,interactive:false});
  const discovery=L.polygon(radiusPoints(p,DISCOVERY_RADIUS),{color:'#32d583',weight:3,opacity:1,fillColor:'#32d583',fillOpacity:.16,interactive:false,dashArray:'7 5'});
  const marker=L.circleMarker([p.lat,p.lon],{radius:9,color:'#fff',fillColor:'#1683ff',fillOpacity:1,weight:3,opacity:1,interactive:false});
  radiusLayer.addLayer(outer);radiusLayer.addLayer(discovery);radiusLayer.addLayer(marker);
}
function placeName(o){
  const n=o?.name_i18n;
  try{const x=typeof n==='string'?JSON.parse(n):n;return x?.de||x?.en||o?.name||o?.title||'Historischer Ort'}
  catch(_){return o?.name||o?.title||'Historischer Ort'}
}
function placeEmoji(o){
  const c=layerOf(o);
  if(c.includes('castle_ruin')||c.includes('historical_ruin'))return'__RUIN_CASTLE__';if(c.includes('lost'))return'🏚️';if(c.includes('bunker')||c.includes('military'))return'🛡️';if(c.includes('battle'))return'⚔️';
  if(c.includes('roman'))return'🏛️';if(c.includes('road'))return'🛣️';if(c.includes('estate')||String(o?.category||'').includes('Burgen'))return'🏰';
  if(c==='road_hotspots')return'⭐';return'📍';
}
function ensureNearbyLayer(){
  if(!nearbyLayer&&window.L&&window.map){nearbyLayer=L.layerGroup();nearbyLayer.name='__explorer_nearby';nearbyLayer.disableClustering=true;nearbyLayer.addTo(map)}
  return nearbyLayer;
}
function renderNearby(near,p){
  const layer=ensureNearbyLayer();if(!layer)return;
  layer.clearLayers();
  near.slice(0,80).forEach(o=>{
    const d=Math.round(distance(p,{lat:+o.lat,lon:+o.lon}));
    const id=String(o.id||'');
    const discovered=persistedDiscoveredIds.has(id)||session?.discoveredIds?.has(id);
    const icon=placeEmoji(o),layerKey=layerOf(o),assetKey=window.SCHATZKARTE_ICON_KEY_FOR_LAYER?.(layerKey)||'archaeology',assetUrl=window.SCHATZKARTE_CATEGORY_ICON_URL?.(assetKey)||'';
    const marker=L.marker([+o.lat,+o.lon],{icon:L.divIcon({assetKey,html:'<div class="wm2-nearby-pin '+(discovered?'is-discovered':'')+'" data-object-id="'+id+'"><span>'+(assetUrl?'<img src="'+assetUrl+'" alt="">':icon)+'</span>'+(discovered?'<i>✓</i>':'')+'</div>',iconSize:[40,40],iconAnchor:[20,20],className:'wander-discovery-marker category-image-marker'})});
    marker.d=o;
    marker.bindPopup(()=>typeof window.__historicalPopupRenderer==='function'?window.__historicalPopupRenderer(o,layerOf(o)):'<div class="popup"><h3>'+placeName(o)+'</h3><p>'+d+' m entfernt</p></div>',{maxWidth:280,closeButton:true});
    layer.addLayer(marker);
  });
}
const DISCOVERY_COPY={
  de:{newOne:'NEU ENTDECKT',newMany:'ORTE ENTDECKT',more:'weitere',total:'Orte insgesamt',near:'entfernt'},
  en:{newOne:'NEW DISCOVERY',newMany:'PLACES DISCOVERED',more:'more',total:'places total',near:'away'},
  cs:{newOne:'NOVĚ OBJEVENO',newMany:'OBJEVENÁ MÍSTA',more:'další',total:'míst celkem',near:'daleko'},
  hu:{newOne:'ÚJ FELFEDEZÉS',newMany:'FELFEDEZETT HELYEK',more:'további',total:'hely összesen',near:'távol'}
};
function discoveryCopy(){return DISCOVERY_COPY[lng()]||DISCOVERY_COPY.de}
function discoveryPeriod(v){
  const k=normalize(v),m={
    prehistoric:{de:'Urgeschichte',en:'Prehistory',cs:'Pravěk',hu:'Őskor'},roman:{de:'Römerzeit',en:'Roman era',cs:'Římské období',hu:'Római kor'},
    medieval:{de:'Mittelalter',en:'Middle Ages',cs:'Středověk',hu:'Középkor'},vikings:{de:'Wikingerzeit',en:'Viking Age',cs:'Vikingské období',hu:'Viking kor'},
    modern:{de:'Neuzeit',en:'Modern era',cs:'Novověk',hu:'Újkor'},ww1:{de:'Erster Weltkrieg',en:'First World War',cs:'První světová válka',hu:'Első világháború'},
    ww2:{de:'Zweiter Weltkrieg',en:'Second World War',cs:'Druhá světová válka',hu:'Második világháború'},cold_war_modern:{de:'Kalter Krieg & Moderne',en:'Cold War & modern era',cs:'Studená válka a současnost',hu:'Hidegháború és modern kor'}
  };
  return m[k]?.[lng()]||String(v||'').trim();
}
function setDiscoveryVisual(o,multiple=false){
  const box=$('wm2DiscoveryToastIcon');if(!box)return;
  box.textContent='';
  if(multiple){box.textContent='🧭';return}
  const layerKey=layerOf(o),assetKey=window.SCHATZKARTE_ICON_KEY_FOR_LAYER?.(layerKey)||'archaeology',assetUrl=window.SCHATZKARTE_CATEGORY_ICON_URL?.(assetKey)||'';
  if(assetUrl){const img=document.createElement('img');img.src=assetUrl;img.alt='';box.appendChild(img)}else box.textContent=placeEmoji(o)||'📍';
}
function flashDiscoveredPins(newOnes){
  const els=[];
  (newOnes||[]).forEach(x=>{
    const id=String(x?.o?.id||'');if(!id)return;
    document.querySelectorAll('.wm2-nearby-pin[data-object-id="'+id+'"]').forEach(el=>{el.classList.remove('just-discovered');void el.offsetWidth;el.classList.add('just-discovered');els.push(el)});
  });
  if(els.length)setTimeout(()=>els.forEach(el=>el.classList.remove('just-discovered')),2100);
}
function showDiscoveryToast(newOnes){
  const toast=$('wm2DiscoveryToast');if(!toast||!newOnes.length)return;
  const c=discoveryCopy(),count=newOnes.length,xp=newOnes.reduce((sum,x)=>sum+(Number(x.xp)||XP_PER_DISCOVERY),0),first=placeName(newOnes[0].o);
  const last=newOnes[newOnes.length-1]||{},total=Math.max(0,Number(last.totalDiscovered)||0);
  const distanceM=Math.max(0,Math.round(Number(newOnes[0].d)||0)),period=discoveryPeriod(newOnes[0]?.o?.period);
  setDiscoveryVisual(newOnes[0].o,count>1);
  if($('wm2DiscoveryToastEyebrow'))$('wm2DiscoveryToastEyebrow').textContent=count===1?c.newOne:count+' '+c.newMany;
  if($('wm2DiscoveryToastName'))$('wm2DiscoveryToastName').textContent=count===1?first:first+' + '+(count-1)+' '+c.more;
  if($('wm2DiscoveryToastMeta'))$('wm2DiscoveryToastMeta').textContent=(period?period+' · ':'')+distanceM+' m '+c.near;
  if($('wm2DiscoveryToastXp'))$('wm2DiscoveryToastXp').textContent='+'+xp+' XP';
  if($('wm2DiscoveryToastTotal'))$('wm2DiscoveryToastTotal').textContent=total?total+' '+c.total:'';
  toast.classList.remove('show');void toast.offsetWidth;toast.classList.add('show');
  clearTimeout(discoveryToastTimer);discoveryToastTimer=setTimeout(()=>toast.classList.remove('show'),4200);
}
function announceDiscovery(newOnes){
  if(!newOnes.length)return;
  try{navigator.vibrate?.([35,30,70])}catch(_){ }
  flashDiscoveredPins(newOnes);
  showDiscoveryToast(newOnes);
}
async function loadPersistentDiscoveries(){
  const sb=window.mapSupabase;
  if(!sb?.auth){persistedDiscoveredIds=new Set();persistedDiscoveryUserId=null;return persistedDiscoveredIds}
  try{
    const sr=await sb.auth.getSession(),uid=sr?.data?.session?.user?.id;
    if(!uid){persistedDiscoveredIds=new Set();persistedDiscoveryUserId=null;return persistedDiscoveredIds}
    const ids=new Set();
    for(let n=0;;n+=1000){
      const r=await sb.from('user_place_discoveries').select('map_object_id').order('discovered_at',{ascending:true}).range(n,n+999);
      if(r.error)throw r.error;
      (r.data||[]).forEach(x=>ids.add(String(x.map_object_id)));
      if((r.data||[]).length<1000)break;
    }
    persistedDiscoveredIds=ids;persistedDiscoveryUserId=String(uid);return ids;
  }catch(e){
    console.warn('[Explorer discoveries] load',e);persistedDiscoveredIds=new Set();persistedDiscoveryUserId=null;return persistedDiscoveredIds;
  }
}
async function recordDiscoveries(near,p){
  if(!session||!window.mapSupabase)return [];
  const newly=[];let latestTotals=null;
  for(const o of near){
    const id=String(o.id||'');if(!id||persistedDiscoveredIds.has(id)||session.discoveredIds.has(id))continue;
    const d=distance(p,{lat:+o.lat,lon:+o.lon});
    if(d>DISCOVERY_RADIUS)continue;
    const numericId=Number(id);if(!Number.isFinite(numericId))continue;
    try{
      const accuracy=Number(p.accuracy);
      const r=await window.mapSupabase.rpc('record_place_discovery',{
        p_map_object_id:numericId,
        p_lat:+p.lat,
        p_lon:+p.lon,
        p_accuracy_m:Number.isFinite(accuracy)?accuracy:null,
        p_mode:state.mode
      });
      if(r.error)throw r.error;
      const row=Array.isArray(r.data)?r.data[0]:r.data;
      if(!row)continue;
      if(row.new_discovery===true){
        const xp=Math.max(0,Number(row.xp_awarded)||XP_PER_DISCOVERY);
        persistedDiscoveredIds.add(id);session.discoveredIds.add(id);session.xp=(session.xp||0)+xp;
        session.discoveries.push({id,name:placeName(o),lat:+o.lat,lon:+o.lon,at:Date.now(),distanceM:Math.round(d),xp});
        latestTotals={xp_total:Number(row.total_xp)||0,discovered_count:Number(row.discovered_count)||0};
        newly.push({o,d,xp,totalDiscovered:latestTotals.discovered_count,totalXp:latestTotals.xp_total});
      }else if(Number(row.distance_m)<=DISCOVERY_RADIUS){
        persistedDiscoveredIds.add(id);
      }
    }catch(e){console.warn('[Explorer discovery] '+id,e)}
  }
  if(latestTotals){
    try{window.dispatchEvent(new CustomEvent('schatzkarte:profile-stats-changed',{detail:latestTotals}))}catch(_){ }
  }
  if(newly.length){
    checkpointTour(true,false);
    syncNativeState();
  }
  return newly;
}
async function startServerTour(){
  if(!session||!window.mapSupabase?.rpc)return null;
  try{const r=await window.mapSupabase.rpc('start_explorer_tour',{p_mode:state.mode});if(r.error)throw r.error;session.tourId=Array.isArray(r.data)?r.data[0]:r.data;session.lastCheckpointAt=Date.now();return session.tourId}catch(e){console.warn('[Explorer tour] start',e);return null}
}
async function checkpointTour(force=false,finish=false){
  if(!session?.tourId||session.checkpointBusy||!window.mapSupabase?.rpc)return null;
  const now=Date.now(),dist=Math.max(0,Math.round(session.distanceM||0));
  if(!force&&!finish&&dist-(session.lastCheckpointDistanceM||0)<250&&now-(session.lastCheckpointAt||0)<60000)return null;
  session.checkpointBusy=true;
  try{
    const r=await window.mapSupabase.rpc('checkpoint_explorer_tour',{p_tour_id:session.tourId,p_distance_m:dist,p_discoveries_count:session.discoveredIds?.size||0,p_xp_earned:session.xp||0,p_finish:!!finish});
    if(r.error)throw r.error;
    const row=Array.isArray(r.data)?r.data[0]:r.data;
    session.lastCheckpointDistanceM=Math.max(session.lastCheckpointDistanceM||0,Number(row?.tour_distance_m)||dist);session.lastCheckpointAt=now;
    if(finish&&row){try{window.dispatchEvent(new CustomEvent('schatzkarte:profile-stats-changed',{detail:{explorer_distance_m:Number(row.total_distance_m)||0}}))}catch(_){ }}
    return row;
  }catch(e){console.warn('[Explorer tour] checkpoint',e);return null}finally{if(session)session.checkpointBusy=false}
}
function clearWatch(){if(watchId!==null&&window.__schatzkarteGeo)try{window.__schatzkarteGeo.clearWatch(watchId)}catch(_){ }watchId=null}
function nativeBackgroundPlugin(){return window.Capacitor?.Plugins?.WanderBackground||null}
function hasNativeDistanceOwner(){
  const bg=nativeBackgroundPlugin();
  return !!(window.__schatzkarteGeo?.isNative?.()&&bg?.start&&bg?.getState&&bg?.syncState);
}
async function currentAccessToken(){
  try{return (await window.mapSupabase?.auth?.getSession?.())?.data?.session?.access_token||''}catch(_){return''}
}
async function startBackground(){
  const bg=nativeBackgroundPlugin(),cfg=window.MAP_SUPABASE;if(!bg?.start||!cfg?.url||!cfg?.anonKey)return false;
  try{
    const accessToken=await currentAccessToken();
    await bg.start({
      url:cfg.url,
      key:cfg.anonKey,
      accessToken,
      discoveryRadius:DISCOVERY_RADIUS,
      searchRadius:state.radius,
      categories:JSON.stringify(state.categories),
      mode:state.mode,
      tourId:String(session?.tourId||''),
      startedAt:Number(session?.startedAt||Date.now()),
      distanceM:Number(session?.distanceM||0),
      discoveriesCount:Number(session?.discoveredIds?.size||0),
      xp:Number(session?.xp||0)
    });
    nativeDistanceOwner=hasNativeDistanceOwner();
    return true;
  }catch(e){console.warn('[Explorer background]',e);nativeDistanceOwner=false;return false}
}
async function syncNativeState(){
  const bg=nativeBackgroundPlugin();
  if(!state.active||!session||!nativeDistanceOwner||!bg?.syncState)return;
  try{
    await bg.syncState({
      accessToken:await currentAccessToken(),
      distanceM:Number(session.distanceM||0),
      discoveriesCount:Number(session.discoveredIds?.size||0),
      xp:Number(session.xp||0)
    });
  }catch(e){console.warn('[Explorer native sync]',e)}
}
async function pullNativeState(force=false){
  const bg=nativeBackgroundPlugin();
  if(!state.active||!session||!nativeDistanceOwner||!bg?.getState||nativeStateBusy)return null;
  nativeStateBusy=true;
  try{
    const r=await bg.getState();
    if(!r||!session||!state.active)return r;
    const d=Number(r.distanceM);
    if(Number.isFinite(d))session.distanceM=Math.max(Number(session.distanceM)||0,d);
    const nx=Number(r.xp);
    if(Number.isFinite(nx))session.xp=Math.max(Number(session.xp)||0,nx);
    let ids=r.discoveredIds;
    if(typeof ids==='string'){try{ids=JSON.parse(ids)}catch(_){ids=[]}}
    if(Array.isArray(ids))ids.forEach(id=>{id=String(id||'');if(id){session.discoveredIds.add(id);persistedDiscoveredIds.add(id)}});
    if(force||!document.hidden)sync();
    return r;
  }catch(e){console.warn('[Explorer native state]',e);return null}
  finally{nativeStateBusy=false}
}
function startNativeStateTimer(){
  stopNativeStateTimer();
  if(!nativeDistanceOwner||!state.active||document.hidden)return;
  nativeStateTimer=setInterval(()=>pullNativeState(false),4000);
}
function stopNativeStateTimer(){if(nativeStateTimer){clearInterval(nativeStateTimer);nativeStateTimer=null}}
function stopBackground(){
  stopNativeStateTimer();
  try{window.Capacitor?.Plugins?.WanderBackground?.stop?.()}catch(_){ }
}
function stopTracking(remove=true){
  runId++;clearWatch();querying=false;
  if(remove&&radiusLayer){try{radiusLayer.clearLayers();map.removeLayer(radiusLayer)}catch(_){ }radiusLayer=null}
  if(remove&&nearbyLayer){try{nearbyLayer.clearLayers();map.removeLayer(nearbyLayer)}catch(_){ }nearbyLayer=null}
}
async function fetchArea(p){
  const r=Math.max(1000,state.radius*2.5);
  if(cache.rows.length&&distance(p,{lat:cache.lat,lon:cache.lon})<Math.max(250,cache.radius-state.radius-100))return cache.rows;
  const dy=r/111320,dx=r/(111320*Math.max(.2,Math.cos(p.lat*Math.PI/180))),rows=[];
  const cols='id,category,subtype,object_type,lat,lon,name,name_i18n,description_i18n,country,period';
  for(let n=0;;n+=1000){
    const q=await mapSupabase.from('map_objects').select(cols).eq('is_deleted',false).gte('lat',p.lat-dy).lte('lat',p.lat+dy).gte('lon',p.lon-dx).lte('lon',p.lon+dx).order('id').range(n,n+999);
    if(q.error)throw q.error;rows.push(...q.data);if(q.data.length<1000)break;
  }
  cache={rows,lat:p.lat,lon:p.lon,radius:r};return rows;
}
async function search(p,force=false){
  if(!state.active||state.paused||querying||!window.mapSupabase)return;
  const now=Date.now(),move=Math.max(20,Math.min(120,state.radius*.25));
  if(!force&&lastQueryPos&&now-lastQueryAt<8000&&distance(p,lastQueryPos)<move)return;
  querying=true;const token=runId;
  live('Umgebung wird geprüft …','Der Suchradius zeigt Orte; entdeckt wird erst innerhalb von 100 m.');
  try{
    const rows=await fetchArea(p);
    if(token!==runId||!state.active||state.paused)return;
    const near=rows.filter(o=>wanted(o)&&Number.isFinite(+o.lat)&&Number.isFinite(+o.lon)&&distance(p,{lat:+o.lat,lon:+o.lon})<=state.radius)
      .sort((a,b)=>distance(p,{lat:+a.lat,lon:+a.lon})-distance(p,{lat:+b.lat,lon:+b.lon}));
    lastQueryAt=now;lastQueryPos={lat:p.lat,lon:p.lon};currentNearby=near;window.__schatzkarteWanderNearby=near;
    renderNearby(near,p);
    const newly=await recordDiscoveries(near,p);
    if(newly.length)renderNearby(near,p);
    live(near.length+' '+(near.length===1?'Ort':'Orte')+' im Suchradius',(session?.discoveredIds.size||0)+' neu entdeckt · feste Entdeckungszone 100 m');
    sync();
    if(newly.length)announceDiscovery(newly,p);
  }catch(e){
    console.warn('[Explorer mode]',e);
    live('Umgebung momentan nicht verfügbar','GPS läuft weiter; beim nächsten Standort wird erneut gesucht.',true);
  }finally{querying=false}
}
function followMap(p,first){
  try{
    programmaticMove=true;
    if(first){
      const points=radiusPoints(p),maxZoom=state.radius<=250?16.5:state.radius<=500?15.5:state.radius<=1000?14.5:13.5;
      map.fitBounds(L.latLngBounds(points).pad(.1),{padding:85,maxZoom});
    }else map.setView([p.lat,p.lon],map.getZoom());
    setTimeout(()=>programmaticMove=false,250);
  }catch(_){programmaticMove=false}
}
function trackDistance(p){
  if(!session||nativeDistanceOwner)return;
  const now=Number(p.timestamp)||Date.now(),accuracy=Math.max(0,Number(p.accuracy)||0);
  const cur={lat:p.lat,lon:p.lon,accuracy,timestamp:now};
  const prev=session.lastTrackPos;
  session.lastTrackPos=cur;
  if(!prev)return;
  const dt=Math.max(.1,(now-prev.timestamp)/1000),seg=distance(prev,cur),speed=seg/dt,maxSpeed=modeMeta().maxSpeedMps;
  const jitterFloor=Math.max(4,Math.min(24,(prev.accuracy+accuracy)*.22));
  if(accuracy>100||prev.accuracy>100||seg<jitterFloor||speed>maxSpeed){session.rejectedFixes++;return}
  session.distanceM+=seg;session.acceptedFixes++;checkpointTour(false,false);
}
function onPosition(p){
  if(!state.active||state.paused)return;
  const lat=+p?.coords?.latitude,lon=+p?.coords?.longitude,accuracy=Math.round(+p?.coords?.accuracy||0);
  if(!Number.isFinite(lat)||!Number.isFinite(lon))return;
  const first=!lastPos;
  lastPos={lat,lon,accuracy,timestamp:+p.timestamp||Date.now()};
  window.__schatzkarteUserLatLng={lat,lon,accuracy,timestamp:lastPos.timestamp};
  trackDistance(lastPos);updateCircle(lastPos);if(state.follow)followMap(lastPos,first);search(lastPos);sync();
}
async function startTracking(){
  if(!state.active||state.paused||watchId!==null||document.hidden)return;
  if(!window.__schatzkarteGeo){live('GPS nicht verfügbar','Das Standortmodul konnte nicht geladen werden.',true);return}
  const token=++runId;live('GPS wird gesucht …','Bitte erlaube den Standortzugriff, falls Android fragt.');
  try{
    if(window.__schatzkarteGeo.isNative?.()){
      const p=await window.__schatzkarteGeo.requestPermissions();if(p?.location==='denied')throw Error('Standortzugriff wurde verweigert.');
    }
    watchId=window.__schatzkarteGeo.watchPosition(
      p=>{if(token===runId)onPosition(p)},
      e=>{if(token===runId)live('Standort momentan nicht verfügbar',e?.code===1?'Bitte erlaube der App den Standortzugriff.':'Der Entdecker-Modus versucht es weiter.',true)},
      {enableHighAccuracy:true,maximumAge:modeMeta().maximumAge,timeout:20000}
    );
  }catch(e){live('GPS konnte nicht gestartet werden',e.message||'Bitte prüfe die Standortberechtigung.',true)}
}
function resetAfterEnd(){
  state.active=false;state.paused=false;state.follow=true;window.__wanderModeActiveForUi=false;
  stopTracking(true);stopBackground();nativeDistanceOwner=false;lastPos=null;lastQueryPos=null;lastQueryAt=0;cache.rows=[];currentNearby=[];window.__schatzkarteWanderNearby=[];
  live('Bereit','GPS startet erst mit dem Entdecker-Modus.');sync();
}
async function end(showSummary=true){
  const done=session;
  if(done&&nativeDistanceOwner)await pullNativeState(true);
  if(done)await checkpointTour(true,true);
  resetAfterEnd();session=null;
  if(showSummary&&done){
    const elapsed=Date.now()-done.startedAt;
    const text=lng()==='en'?'Distance: '+kmText(done.distanceM)+'\nPlaces discovered: '+done.discoveredIds.size+'\nXP earned: +'+(done.xp||0)+'\nDuration: '+durationText(elapsed)+'\n\nThe distance has been credited to your profile.':lng()==='cs'?'Vzdálenost: '+kmText(done.distanceM)+'\nObjevená místa: '+done.discoveredIds.size+'\nZískané XP: +'+(done.xp||0)+'\nDoba: '+durationText(elapsed)+'\n\nVzdálenost byla připsána do tvého profilu.':lng()==='hu'?'Távolság: '+kmText(done.distanceM)+'\nFelfedezett helyek: '+done.discoveredIds.size+'\nSzerzett XP: +'+(done.xp||0)+'\nIdőtartam: '+durationText(elapsed)+'\n\nA távolság jóváírásra került a profilodban.':'Strecke: '+kmText(done.distanceM)+'\nEntdeckte Orte: '+done.discoveredIds.size+'\nXP gesammelt: +'+(done.xp||0)+'\nDauer: '+durationText(elapsed)+'\n\nDie Strecke wurde deinem Profil gutgeschrieben.';
    const ttl=lng()==='en'?'Tour finished':lng()==='cs'?'Trasa ukončena':lng()==='hu'?'Túra befejezve':'Tour beendet';
    const doneBtn=lng()==='en'?'Done':lng()==='cs'?'Hotovo':lng()==='hu'?'Kész':'Fertig';
    setTimeout(()=>dialog(ttl,text,[{text:doneBtn,cls:'wm2-dialog-primary'}]),40);
  }
}
function confirmEnd(){
  const st=sessionStats();
  const msg=lng()==='en'?'Current tour: '+kmText(st.distanceM)+' · '+st.discovered+' discovered.\nYou will then see your tour summary.':lng()==='cs'?'Aktuální trasa: '+kmText(st.distanceM)+' · '+st.discovered+' objeveno.\nPoté uvidíš souhrn trasy.':lng()==='hu'?'Aktuális túra: '+kmText(st.distanceM)+' · '+st.discovered+' felfedezve.\nEzután megjelenik a túra összegzése.':'Aktuelle Tour: '+kmText(st.distanceM)+' · '+st.discovered+' entdeckt.\nDanach siehst du deine Tour-Zusammenfassung.';
  dialog(ui('Entdecker-Modus beenden?'),msg,[
    {text:lng()==='en'?'End tour':lng()==='cs'?'Ukončit trasu':lng()==='hu'?'Túra befejezése':'Tour beenden',cls:'wm2-dialog-danger',go:()=>end(true)},
    {text:ui('Weiter entdecken'),cls:'wm2-dialog-cancel'}
  ]);
}
let nativeGeoPermissionPlugin=null,nativeNotificationPermissionPlugin=null;
function nativePlugin(name){
  try{
    const cap=window.Capacitor;if(!cap)return null;
    if(name==='Geolocation'&&nativeGeoPermissionPlugin)return nativeGeoPermissionPlugin;
    if(name==='LocalNotifications'&&nativeNotificationPermissionPlugin)return nativeNotificationPermissionPlugin;
    const p=typeof cap.registerPlugin==='function'?cap.registerPlugin(name):(cap.Plugins?.[name]||null);
    if(name==='Geolocation')nativeGeoPermissionPlugin=p;
    if(name==='LocalNotifications')nativeNotificationPermissionPlugin=p;
    return p;
  }catch(e){console.warn('[Explorer native plugin]',name,e);return null}
}
async function checkNativePermissions(){
  let gps='prompt',notes='prompt';
  const g=nativePlugin('Geolocation'),n=nativePlugin('LocalNotifications');
  try{if(g?.checkPermissions)gps=(await g.checkPermissions())?.location||gps}catch(e){console.warn('[Explorer GPS permission check]',e)}
  try{if(n?.checkPermissions)notes=(await n.checkPermissions())?.display||notes}catch(e){console.warn('[Explorer notification permission check]',e)}
  return {gps,notes};
}
async function requestNativePermissions(){
  let gps='prompt',notes='prompt';
  const g=nativePlugin('Geolocation'),n=nativePlugin('LocalNotifications');
  // Request both independently. A location error must never suppress the
  // notification prompt (the previous iOS build did exactly that).
  try{if(g?.requestPermissions)gps=(await g.requestPermissions())?.location||gps}catch(e){console.warn('[Explorer GPS permission request]',e)}
  try{if(n?.requestPermissions)notes=(await n.requestPermissions())?.display||notes}catch(e){console.warn('[Explorer notification permission request]',e)}
  return {gps,notes};
}
async function start(){
  if(state.active){confirmEnd();return}
  const native=window.__schatzkarteGeo?.isNative?.();
  if(native){
    const perms=await checkNativePermissions();
    if(perms.gps!=='granted'||perms.notes!=='granted'){
      dialog('Berechtigungen für Entdecker-Modus','Damit der Entdecker-Modus dich zuverlässig auf historische Orte hinweisen kann, benötigt er Standortzugriff. Benachrichtigungen sind für Hinweise empfohlen.',[
        {text:'Berechtigungen erlauben',cls:'wm2-dialog-primary',go:async()=>{
          const granted=await requestNativePermissions();
          if(granted.gps!=='granted'){
            live('Standortzugriff fehlt','Bitte erlaube der Schatz-Karte den Standort in den iPhone-Einstellungen.',true);
            return;
          }
          await activate(true);
        }},{text:'Jetzt nicht',cls:'wm2-dialog-cancel'}
      ]);return;
    }
  }
  activate(true);
}
async function activate(permissionsReady=false){
  if(window.__schatzkarteGeo?.isNative?.()&&!permissionsReady){
    const granted=await requestNativePermissions();
    if(granted.gps!=='granted'){live('Standortzugriff fehlt','Bitte erlaube der Schatz-Karte den Standort in den iPhone-Einstellungen.',true);return}
  }
  await loadPersistentDiscoveries();
  state.active=true;state.paused=false;state.follow=true;window.__wanderModeActiveForUi=true;session=newSession();
  await startServerTour();
  nativeDistanceOwner=hasNativeDistanceOwner();
  lastPos=null;lastQueryPos=null;lastQueryAt=0;cache.rows=[];currentNearby=[];
  $('skWander').classList.remove('open');document.querySelectorAll('.sk-bottom-nav button').forEach(x=>x.classList.remove('active'));
  setTimeout(()=>window.SchatzkarteMapChat?.sync?.(),0);
  sync();
  await startBackground();
  startTracking();
  startNativeStateTimer();
  if(nativeDistanceOwner)setTimeout(()=>pullNativeState(true),900);
}
async function showPermissionIntro(){
  if(!window.__schatzkarteGeo?.isNative?.())return;
  const key='schatzkarte_explorer_permission_intro_seen';
  try{
    if(localStorage.getItem(key))return;
    const perms=await checkNativePermissions();
    if(perms.gps==='granted'&&perms.notes==='granted'){localStorage.setItem(key,'1');return}
    localStorage.setItem(key,'1');
    dialog('Damit alles funktioniert','Erlaube kurz Standort für deine Position und Benachrichtigungen für Entdeckungen im Entdecker-Modus.',[
      {text:'Berechtigungen erlauben',cls:'wm2-dialog-primary',go:requestNativePermissions},{text:'Später',cls:'wm2-dialog-cancel'}
    ]);
  }catch(_){ }
}
function bind(){
  const p=$('skWander');
  p.querySelector('.wm2-close').onclick=()=>{p.classList.remove('open');setTimeout(()=>window.SchatzkarteMapChat?.sync?.(),0)};
  $('wm2Modes').onclick=e=>{const b=e.target.closest('[data-mode]');if(!b||state.active)return;state.mode=b.dataset.mode;sync()};
  $('wm2Radius').oninput=e=>{state.radius=RADII[+e.target.value]||300;cache.rows=[];lastQueryPos=null;if(lastPos)updateCircle(lastPos);sync();if(lastPos)search(lastPos,true)};
  $('wm2Categories').onclick=()=>view(false);p.querySelector('.wm2-back').onclick=()=>view(true);p.querySelector('.wm2-apply').onclick=applyCats;
  $('wm2CategoryList').onchange=e=>{
    if(e.target.value==='all'&&e.target.checked)$('wm2CategoryList').querySelectorAll('input').forEach(x=>x.checked=x===e.target);
    else if(e.target.value!=='all'&&e.target.checked)$('wm2CategoryList').querySelector('input[value="all"]').checked=false;
  };
  $('wm2Start').onclick=start;
  document.querySelector('#wm2Status .wm2-end').onclick=confirmEnd;
  document.querySelector('#wm2Status .wm2-follow').onclick=()=>{if(lastPos){state.follow=true;followMap(lastPos,true);sync()}};
  $('wm2Status').onclick=e=>{if(!e.target.closest('button')){p.classList.add('open');setTimeout(()=>window.SchatzkarteMapChat?.sync?.(),0)}};
  $('wm2Dialog').onclick=e=>{if(e.target===$('wm2Dialog'))closeDialog()};
  map?.on?.('movestart',()=>{if(state.active&&!programmaticMove){state.follow=false;sync()}});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){
      stopNativeStateTimer();
      if(session){
        if(nativeDistanceOwner)syncNativeState();
        else session.lastTrackPos=null;
        checkpointTour(true,false);
      }
      stopTracking(false);
    }else{
      if(nativeDistanceOwner){pullNativeState(true);startNativeStateTimer()}
      startTracking();
    }
  });
}
window.SchatzkarteWanderPhase1={
  end:()=>end(false),
  getNearby:()=>window.__schatzkarteWanderNearby||[],
  getSession:()=>session?{startedAt:session.startedAt,distanceM:session.distanceM,discovered:session.discoveries.slice(),xp:session.xp||0,mode:state.mode,tourId:session.tourId}:null,
  isActive:()=>state.active
};
window.SchatzkarteExplorerPhase1=window.SchatzkarteWanderPhase1;
window.SchatzkarteExplorerPhase2=window.SchatzkarteWanderPhase1;
window.addEventListener('schatzkarte:map-opened',()=>setTimeout(showPermissionIntro,650));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
else{mount();if(document.body.classList.contains('map-active'))setTimeout(showPermissionIntro,650)}
})();
