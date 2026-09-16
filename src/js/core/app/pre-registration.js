(function(){
  'use strict';

  var overlay=null;
  var submitting=false;
  var storageSubmitted='schatzkarte_pre_registration_submitted';
  var storageSeen='schatzkarte_pre_registration_seen';

  function html(){
    return '<div id="preRegistrationSurvey" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="preRegistrationTitle">'+
      '<div class="pre-reg-card">'+
        '<button class="pre-reg-close" id="preRegistrationClose" type="button" aria-label="Schließen">×</button>'+
        '<header class="pre-reg-hero"><div class="pre-reg-logo" aria-hidden="true"></div><div class="pre-reg-kicker">Vorregistrierung · Release-Umfrage</div><h2 id="preRegistrationTitle">Hilf uns, die Schatz-Karte richtig zu starten</h2><p class="pre-reg-lead">Welche Version würdest du nach dem Release wirklich nutzen – und passen die geplanten Preise?</p></header>'+
        '<div class="pre-reg-story"><strong>Geschichte ist überall – bisher war sie nur schwer gemeinsam auffindbar.</strong><br>Die Schatz-Karte ist keine Kopie einer bestehenden Karte und keine zufällige Sammlung von Pins. Sie verbindet Burgen, Schlachtfelder, historische Wege, Lost Places, Wanderziele und mögliche Sondelgebiete in einer intelligenten Entdeckerkarte. Die historische KI recherchiert Zusammenhänge, findet interessante Orte in deiner Nähe und entwickelt die Karte mit neuen, nachvollziehbaren Erkenntnissen weiter. Neue Punkte werden nicht still gespeichert, sondern erst nach Prüfung und Bestätigung übernommen.</div>'+
        '<div class="pre-reg-benefits"><div class="pre-reg-benefit"><b>🗺️ Eine Karte</b>Historische Kategorien, Wege und Entdeckungsziele gemeinsam erkunden.</div><div class="pre-reg-benefit"><b>🤖 Historische KI</b>Fragen stellen, Umgebung recherchieren und Zusammenhänge entdecken.</div><div class="pre-reg-benefit"><b>🧭 Wächst laufend</b>Neue Quellen, Kategorien und geprüfte Vorschläge erweitern die Karte.</div></div>'+
        '<form id="preRegistrationForm" novalidate>'+
          '<section class="pre-reg-section"><h3>1. Welchen Tarif würdest du am ehesten wählen?</h3><p class="pre-reg-help">Das ist noch kein Kauf und keine verbindliche Bestellung.</p><div class="pre-reg-options plans">'+
            '<label class="pre-reg-option"><input type="radio" name="preferred_plan" value="standard"><span><b>🗺️ Standard · 5,99 €/Monat</b>Vollständige Karte, alle Kategorien, Suche und laufend neue historische Orte.</span></label>'+
            '<label class="pre-reg-option"><input type="radio" name="preferred_plan" value="premium"><span><b>🤖 Premium · 19,99 €/Monat</b>Alles aus Standard plus historische KI und 100 KI-Punkte pro Monat.</span></label>'+
            '<label class="pre-reg-option wide"><input type="radio" name="preferred_plan" value="undecided"><span><b>Ich bin noch unsicher</b>Ich möchte erst mehr vom fertigen Produkt sehen.</span></label>'+
          '</div></section>'+
          '<section class="pre-reg-section"><h3>2. Wie wirken die Preise auf dich?</h3><div class="pre-reg-inline-options">'+
            '<label class="pre-reg-option"><input type="radio" name="price_opinion" value="fair"><span>Fair und passend</span></label><label class="pre-reg-option"><input type="radio" name="price_opinion" value="acceptable"><span>Etwas hoch, aber akzeptabel</span></label><label class="pre-reg-option"><input type="radio" name="price_opinion" value="too_high"><span>Zu hoch</span></label><label class="pre-reg-option"><input type="radio" name="price_opinion" value="undecided"><span>Noch unsicher</span></label>'+
          '</div></section>'+
          '<section class="pre-reg-section"><h3>3. Wie wahrscheinlich würdest du abonnieren?</h3><div class="pre-reg-inline-options">'+
            '<label class="pre-reg-option"><input type="radio" name="subscription_likelihood" value="definitely"><span>Sehr wahrscheinlich</span></label><label class="pre-reg-option"><input type="radio" name="subscription_likelihood" value="probably"><span>Eher wahrscheinlich</span></label><label class="pre-reg-option"><input type="radio" name="subscription_likelihood" value="unsure"><span>Noch unsicher</span></label><label class="pre-reg-option"><input type="radio" name="subscription_likelihood" value="unlikely"><span>Eher nicht</span></label>'+
          '</div></section>'+
          '<section class="pre-reg-section"><h3>4. Was interessiert dich besonders?</h3><div class="pre-reg-interests">'+
            '<label class="pre-reg-check"><input type="checkbox" name="interests" value="sondeln">Sondeln & Fundstellen</label><label class="pre-reg-check"><input type="checkbox" name="interests" value="lost_places">Lost Places</label><label class="pre-reg-check"><input type="checkbox" name="interests" value="burgen_schlachten">Burgen & Schlachtfelder</label><label class="pre-reg-check"><input type="checkbox" name="interests" value="wandern">Historisches Wandern</label><label class="pre-reg-check"><input type="checkbox" name="interests" value="ki_recherche">KI-Recherche</label><label class="pre-reg-check"><input type="checkbox" name="interests" value="allgemeine_geschichte">Geschichte allgemein</label>'+
          '</div></section>'+
          '<section class="pre-reg-section"><h3>5. Für den Release vormerken</h3><input class="pre-reg-field" id="preRegistrationEmail" type="email" autocomplete="email" maxlength="254" placeholder="Deine E-Mail-Adresse" required><textarea class="pre-reg-field" id="preRegistrationFeedback" maxlength="1000" placeholder="Optional: Was müsste die App können, damit du sie abonnierst?"></textarea></section>'+
          '<label class="pre-reg-consent"><input id="preRegistrationConsent" type="checkbox" required><span>Ich möchte zum Release per E-Mail informiert werden und stimme zu, dass meine Angaben zur Auswertung dieser Umfrage und für die Release-Information gespeichert werden. Die Einwilligung kann ich jederzeit per E-Mail an manfred.kucharik@gmail.com widerrufen.</span></label>'+
          '<button class="pre-reg-submit" id="preRegistrationSubmit" type="submit">Unverbindlich vormerken</button><div class="pre-reg-status" id="preRegistrationStatus" role="status" aria-live="polite"></div><div class="pre-reg-fineprint">Keine Zahlung · kein Vertragsabschluss · eine Auswertung pro E-Mail-Adresse</div>'+
        '</form>'+
      '</div></div>';
  }

  function selected(name){var el=overlay&&overlay.querySelector('input[name="'+name+'"]:checked');return el?el.value:'';}
  function status(message,type){var el=document.getElementById('preRegistrationStatus');if(!el)return;el.textContent=message;el.className='pre-reg-status '+(type||'');}
  function markButton(){var btn=document.getElementById('openPreRegistrationButton');if(btn&&localStorage.getItem(storageSubmitted)==='1')btn.textContent='✓ Für den Release vorgemerkt';}
  function open(){
    if(!overlay)return;
    var loginEmail=document.getElementById('authEmail'),surveyEmail=document.getElementById('preRegistrationEmail');
    if(surveyEmail&&loginEmail&&loginEmail.value&&!surveyEmail.value)surveyEmail.value=loginEmail.value.trim();
    overlay.classList.add('open');overlay.setAttribute('aria-hidden','false');document.body.classList.add('pre-registration-open');
    try{overlay.scrollTop=0;overlay.querySelector('.pre-reg-card').scrollTop=0;}catch(_){}
  }
  function close(remember){if(!overlay)return;overlay.classList.remove('open');overlay.setAttribute('aria-hidden','true');document.body.classList.remove('pre-registration-open');if(remember!==false)try{localStorage.setItem(storageSeen,'1');}catch(_){}}
  function waitForClient(timeout){return new Promise(function(resolve){var started=Date.now();(function poll(){if(window.mapSupabase&&window.mapSupabase.rpc)return resolve(window.mapSupabase);if(Date.now()-started>=timeout)return resolve(null);setTimeout(poll,80);})();});}

  async function submit(event){
    event.preventDefault();if(submitting)return;
    var email=(document.getElementById('preRegistrationEmail').value||'').trim();
    var plan=selected('preferred_plan'),price=selected('price_opinion'),likelihood=selected('subscription_likelihood');
    var consent=document.getElementById('preRegistrationConsent').checked;
    var interests=Array.prototype.map.call(overlay.querySelectorAll('input[name="interests"]:checked'),function(x){return x.value;});
    if(!plan||!price||!likelihood){status('Bitte beantworte zuerst die drei Tarif- und Preisfragen.','error');return;}
    if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){status('Bitte gib eine gültige E-Mail-Adresse ein.','error');return;}
    if(!consent){status('Bitte bestätige die Einwilligung zur Speicherung und Release-Information.','error');return;}
    var button=document.getElementById('preRegistrationSubmit');submitting=true;button.disabled=true;button.textContent='Wird sicher gespeichert …';status('','');
    try{
      var client=await waitForClient(8000);if(!client)throw new Error('Die Verbindung zur Datenbank ist gerade nicht erreichbar.');
      var result=await client.rpc('submit_pre_registration',{
        p_email:email,p_preferred_plan:plan,p_price_opinion:price,p_subscription_likelihood:likelihood,
        p_interests:interests,p_feedback:(document.getElementById('preRegistrationFeedback').value||'').trim()||null,
        p_locale:(document.documentElement.lang||'de').slice(0,10),p_client_version:String(window.APP_VERSION||'android-pre-release')
      });
      if(result.error)throw result.error;
      try{localStorage.setItem(storageSubmitted,'1');localStorage.setItem(storageSeen,'1');}catch(_){}
      markButton();
      status(result.data==='duplicate'?'Du bist bereits vorgemerkt – deine E-Mail wird nur einmal gezählt.':'Danke! Deine Einschätzung wurde gespeichert und du bist für den Release vorgemerkt.','success');
      button.textContent='✓ Erfolgreich vorgemerkt';
      setTimeout(function(){close(false);},2600);
    }catch(error){console.error('[Pre-registration]',error);status(error.message||'Speichern ist gerade nicht möglich. Bitte versuche es später erneut.','error');button.disabled=false;button.textContent='Unverbindlich vormerken';}
    finally{submitting=false;}
  }

  function init(){
    if(document.getElementById('preRegistrationSurvey'))return;
    document.body.insertAdjacentHTML('beforeend',html());overlay=document.getElementById('preRegistrationSurvey');
    var openButton=document.getElementById('openPreRegistrationButton'),closeButton=document.getElementById('preRegistrationClose'),form=document.getElementById('preRegistrationForm');
    if(openButton)openButton.addEventListener('click',open);if(closeButton)closeButton.addEventListener('click',function(){close(true);});if(form)form.addEventListener('submit',submit);
    overlay.addEventListener('click',function(e){if(e.target===overlay)close(true);});
    markButton();
    var observer=new MutationObserver(function(){if(document.body.classList.contains('map-active'))close(false);});observer.observe(document.body,{attributes:true,attributeFilter:['class']});
    setTimeout(async function(){
      try{if(localStorage.getItem(storageSeen)==='1'||localStorage.getItem(storageSubmitted)==='1'||document.body.classList.contains('map-active'))return;}catch(_){}
      var client=await waitForClient(2500),hasSession=false;
      try{if(client&&client.auth){var session=await client.auth.getSession();hasSession=!!(session&&session.data&&session.data.session);}}catch(_){}
      if(!hasSession&&!document.body.classList.contains('map-active'))open();
    },2600);
  }

  window.openPreRegistrationSurvey=open;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
