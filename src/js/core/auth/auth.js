/* Schatz-Karte Core — canonical authentication service.
 * Single source of truth for session/profile/access state.
 * UI code should use this service instead of calling supabase.auth directly.
 */
(function(){
  "use strict";
  if(window.SCHATZKARTE_AUTH) return;

  const subscribers = new Set();
  let state = Object.freeze({status:'booting', session:null, user:null, profile:null, accessGranted:false});
  let listenerAttached = false;

  function client(){ return window.mapSupabase; }
  function requireClient(){
    const sb=client();
    if(!sb?.auth) throw new Error(window.SKUI?.text?.('Supabase Auth ist noch nicht bereit.') || 'Supabase Auth ist noch nicht bereit.');
    return sb;
  }
  function publish(next){
    state=Object.freeze(Object.assign({}, state, next));
    subscribers.forEach(fn=>{ try{ fn(state); }catch(e){ console.warn('[Auth] subscriber:',e); } });
    try{ window.dispatchEvent(new CustomEvent('schatzkarte:auth-state',{detail:state})); }catch(e){}
  }
  function eventState(event, session){
    if(event==='SIGNED_OUT') return {status:'signed_out',session:null,user:null,profile:null,accessGranted:false};
    if(session?.user) return {status:'authenticated',session,user:session.user,profile:state.profile,accessGranted:state.accessGranted};
    return {status:'anonymous',session:null,user:null,profile:null,accessGranted:false};
  }

  async function getSession(){
    const sb=requireClient();
    const result=await sb.auth.getSession();
    if(result.error) throw result.error;
    return result.data?.session || null;
  }

  async function getUser(){
    const session=await getSession();
    return session?.user || null;
  }

  async function getProfile(userId){
    if(!userId) return null;
    const sb=requireClient();
    const result=await sb.from('profiles').select('id,email,access_granted,is_admin').eq('id',userId).maybeSingle();
    if(result.error) throw result.error;
    return result.data || null;
  }

  async function refresh(){
    const session=await getSession();
    if(!session?.user){ publish(eventState('SIGNED_OUT',null)); return state; }
    const profile=await getProfile(session.user.id);
    publish({status:'authenticated',session,user:session.user,profile,accessGranted:profile?.access_granted===true});
    return state;
  }

  async function verifyAccess(userId){
    const id=userId || state.user?.id || (await getUser())?.id;
    if(!id){ publish({accessGranted:false,profile:null}); return false; }
    let profile=state.profile;
    if(!profile || profile.id!==id) profile=await getProfile(id);
    const granted=profile?.access_granted===true;
    publish({status:'authenticated',user:state.user || {id:id},profile,accessGranted:granted});
    return granted;
  }

  async function signInWithPassword(email,password){
    const sb=requireClient();
    const result=await sb.auth.signInWithPassword({email,password});
    if(result.error) throw result.error;
    const session=result.data?.session || null;
    const user=result.data?.user || session?.user || null;
    publish({status:'authenticated',session,user,profile:null,accessGranted:false});
    if(user) await verifyAccess(user.id);
    return result.data;
  }

  async function signUp(email,password,options){
    const sb=requireClient();
    const result=await sb.auth.signUp({email,password,options});
    if(result.error) throw result.error;
    return result.data;
  }

  async function resetPassword(email,redirectTo){
    const sb=requireClient();
    const result=await sb.auth.resetPasswordForEmail(email,{redirectTo:redirectTo || 'https://schatz-karte.ct.ws/'});
    if(result.error) throw result.error;
    return result.data;
  }

  async function signOut(){
    const sb=requireClient();
    const result=await sb.auth.signOut();
    if(result.error) throw result.error;
    publish(eventState('SIGNED_OUT',null));
  }

  function subscribe(fn){
    if(typeof fn!=='function') return function(){};
    subscribers.add(fn);
    return function(){ subscribers.delete(fn); };
  }

  function attach(){
    if(listenerAttached || !client()?.auth) return false;
    listenerAttached=true;
    client().auth.onAuthStateChange(function(event,session){
      const next=eventState(event,session);
      publish(next);
      // Profile/access lookup happens outside the auth callback stack to avoid
      // nested Supabase auth calls inside onAuthStateChange.
      if(event==='SIGNED_IN' || event==='INITIAL_SESSION'){
        setTimeout(function(){ refresh().catch(function(e){ console.warn('[Auth] refresh:',e); }); },0);
      }
    });
    return true;
  }

  function waitForClient(timeoutMs){
    return new Promise(function(resolve){
      if(client()?.auth) return resolve(true);
      const start=Date.now();
      const timer=setInterval(function(){
        if(client()?.auth){ clearInterval(timer); attach(); resolve(true); }
        else if(Date.now()-start>=timeoutMs){ clearInterval(timer); resolve(false); }
      },50);
    });
  }

  const api={
    get state(){ return state; },
    getSession, getUser, getProfile, refresh, verifyAccess,
    signInWithPassword, signUp, resetPassword, signOut,
    subscribe, attach, waitForClient
  };
  window.SCHATZKARTE_AUTH=Object.freeze(api);

  if(client()?.auth) attach();
  else waitForClient(10000).catch(function(e){ console.warn('[Auth] client wait:',e); });
})();
