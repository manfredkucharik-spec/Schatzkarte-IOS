/* Schatz-Karte Core — canonical Supabase data access contract. */
(function(){
  "use strict";
  if(window.__SCHATZKARTE_DATA_PIPELINE__) return;
  const client=()=>window.mapSupabase;
  const requireClient=()=>{const sb=client();if(!sb?.from)throw new Error('Supabase client is not ready');return sb;};
  async function getMapObjectsPage({from=0,to=999,category=null,excludeRomanRoads=false}={}){
    let q=requireClient().from('map_objects')
      .select('id,source_dataset,category,subtype,object_type,lat,lon,name,name_i18n,description_i18n,country,period,geometry,raw_item,dedupe_key,battlefield_ratings')
      .eq('is_deleted',false).order('dedupe_key',{ascending:true});
    if(category) q=q.eq('category',category);
    if(excludeRomanRoads) q=q.not('category','like','roman_roads_%');
    const {data,error}=await q.range(from,to);
    if(error) throw error;
    return Array.isArray(data)?data:[];
  }
  async function countMapObjects({category=null,excludeRomanRoads=false}={}){
    let q=requireClient().from('map_objects').select('dedupe_key',{count:'exact',head:true}).eq('is_deleted',false);
    if(category) q=q.eq('category',category);
    if(excludeRomanRoads) q=q.not('category','like','roman_roads_%');
    const {count,error}=await q;if(error)throw error;return Number(count)||0;
  }
  async function getCategoryCounts(){const {data,error}=await requireClient().rpc('get_map_category_counts');if(error)throw error;return Array.isArray(data)?data:[];}
  async function getCategoryRules(){const {data,error}=await requireClient().from('map_category_rules').select('source_category,source_subtype,ui_category,priority').order('priority',{ascending:true});if(error)throw error;return Array.isArray(data)?data:[];}
  async function getAccessGranted(userId){if(!userId)return false;const {data,error}=await requireClient().from('profiles').select('access_granted').eq('id',userId).maybeSingle();if(error)throw error;return data?.access_granted===true;}
  window.SCHATZKARTE_DATA=Object.freeze({getMapObjectsPage,countMapObjects,getCategoryCounts,getCategoryRules,getAccessGranted});
  window.__SCHATZKARTE_DATA_PIPELINE__=true;
})();
