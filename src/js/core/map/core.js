/* Schatz-Karte Core – Map owner
 * Phase 6: centralizes map creation and layer-state ownership.
 * No business/data loading belongs here.
 */
(function(){
  'use strict';

  if(window.SCHATZKARTE_MAP_CORE) return;

  function initMap(options){
    if(!window.L || typeof window.L.map !== 'function'){
      throw new Error('[Map Core] Leaflet/MapLibre compatibility layer is not ready.');
    }
    if(window.map && window.map.__schatzkarteCoreOwned){
      return window.map;
    }

    const o=options||{};
    const map=L.map('map',{
      preferCanvas:o.preferCanvas!==false,
      zoomControl:o.zoomControl!==false,
      tap:o.tap,
      touchZoom:o.touchZoom!==false,
      dragging:o.dragging!==false,
      doubleClickZoom:o.doubleClickZoom!==false,
      boxZoom:o.boxZoom===true,
      scrollWheelZoom:o.scrollWheelZoom!==false,
      zoomSnap:Number.isFinite(o.zoomSnap)?o.zoomSnap:0.1,
      zoomDelta:Number.isFinite(o.zoomDelta)?o.zoomDelta:1,
      bounceAtZoomLimits:o.bounceAtZoomLimits===true,
      zoomAnimation:o.zoomAnimation!==false,
      fadeAnimation:o.fadeAnimation===true,
      markerZoomAnimation:o.markerZoomAnimation===true,
      wheelDebounceTime:Number.isFinite(o.wheelDebounceTime)?o.wheelDebounceTime:20,
      wheelPxPerZoomLevel:Number.isFinite(o.wheelPxPerZoomLevel)?o.wheelPxPerZoomLevel:60
    }).setView(o.center||[50,15], Number.isFinite(o.zoom)?o.zoom:4.2);

    map.__schatzkarteCoreOwned=true;
    window.map=map;
    return map;
  }

  function createLayerState(registry){
    if(!Array.isArray(registry) || !registry.length){
      throw new Error('[Map Core] Layer registry is missing or empty.');
    }
    if(!window.L || typeof window.L.layerGroup !== 'function'){
      throw new Error('[Map Core] LayerGroup API is not ready.');
    }

    const LAYER=Object.create(null);
    const allCreatedItems=[];
    const layerEnabled=Object.create(null);

    registry.forEach(name=>{
      const group=L.layerGroup();
      group.name=name;
      LAYER[name]=group;
      layerEnabled[name]=false;
    });

    // Protected areas are a safety/research layer and remain enabled by default.
    if(Object.prototype.hasOwnProperty.call(LAYER,'protected')){
      layerEnabled.protected=true;
      const protectedToggle=document.getElementById('chk_protected');
      if(protectedToggle) protectedToggle.checked=true;
    }

    return {LAYER,allCreatedItems,layerEnabled};
  }

  window.SCHATZKARTE_MAP_CORE={
    version:'6.0.0',
    initMap,
    createLayerState
  };
})();
