/* Pickyla v21 - structured package scheduling (private-source staging).
   Requires database/migrations/supabase-v21-program-packages.sql before use. */
(function(){
  'use strict';
  const P=id=>document.getElementById(id);
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'₱'+Number(n||0).toLocaleString('en-PH',{maximumFractionDigits:2});
  const dateISO=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const addDays=(iso,n)=>{const x=new Date(iso+'T12:00:00');x.setDate(x.getDate()+n);return dateISO(x);};
  const nice=iso=>new Date(iso+'T12:00:00').toLocaleDateString('en-PH',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
  const hour=h=>h===24?'12:00 MN':(h%12||12)+':00 '+(h<12?'AM':'PM');
  const state={program:null,settings:null,type:'one',count:1,sessions:[],participants:[],availability:new Map(),reference:null,token:null,holdUntil:null,price:0,loading:false};
  const today=()=>{
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const by=Object.fromEntries(parts.map(p=>[p.type,p.value]));
    return by.year+'-'+by.month+'-'+by.day;
  };
  const root=document.createElement('div');
  root.id='pickylaProgramV21';
  root.className='pkg-v21-overlay hidden';
  root.innerHTML='<section class="pkg-v21-sheet" role="dialog" aria-modal="true" aria-labelledby="pkgV21Title">'+
    '<div class="pkg-v21-header"><div><span class="pkg-v21-eyebrow">PICKYLA COACHING PROMOS</span><h2 id="pkgV21Title">5+1 Promo Booking</h2></div><button type="button" id="pkgV21Close" aria-label="Close">×</button></div>'+
    '<div id="pkgV21Notice" class="pkg-v21-notice hidden" role="status"></div>'+
    '<div id="pkgV21Form">'+
      '<div class="pkg-v21-meta" id="pkgV21Meta"></div>'+
      '<h3>1. Select coaching format</h3><div id="pkgV21Types" class="pkg-v21-types"></div>'+
      '<label id="pkgV21GroupWrap" class="hidden">Number of group players <select id="pkgV21GroupCount"></select></label>'+
      '<h3>2. Schedule and choose courts</h3><p class="pkg-v21-small" id="pkgV21WindowHelp">First session sets the 14-day booking window. Choose consecutive hours and court venue for every day.</p>'+
      '<div id="pkgV21Sessions"></div>'+
      '<h3>3. Participant names</h3><p class="pkg-v21-small">Enter the first and last name of every participant. Contact for Player 1 helps Kyla verify payment.</p>'+
      '<div id="pkgV21Players"></div>'+
      '<div class="pkg-v21-total"><span>Full package price (upfront)</span><strong id="pkgV21Total"></strong><small id="pkgV21PriceHint">Court rental is not included.</small></div>'+
      '<button type="button" class="pkg-v21-main" id="pkgV21Reserve">Reserve schedules & proceed to payment</button>'+
      '<p class="pkg-v21-small" id="pkgV21ReserveHelp">The promo includes 3 coaching days with 2 consecutive hours each. You can review your schedule before confirming.</p>'+
    '</div>'+
    '<div id="pkgV21Preview" class="hidden">'+
      '<h3>Review Your Promo Schedule</h3>'+
      '<p class="pkg-v21-preview-warning"><strong>PREVIEW ONLY — NO RESERVATION OR PAYMENT.</strong> Your choices are not yet reserved. Please do not transfer money until the official booking checkout is enabled or Kyla gives confirmed instructions.</p>'+
      '<div id="pkgV21PreviewDetails" class="pkg-v21-preview-details"></div>'+
      '<button type="button" class="pkg-v21-secondary" id="pkgV21PreviewBack">Edit schedule or participants</button>'+
      '<button type="button" class="pkg-v21-secondary" id="pkgV21PreviewCopy">Copy promo schedule inquiry</button>'+
      '<button type="button" class="pkg-v21-main" id="pkgV21PreviewMessage">Message Coach Kyla</button>'+
      '<p class="pkg-v21-small">Message Coach Kyla directly. Sending an inquiry does not hold the selected dates or confirm a package.</p>'+
    '</div>'+
    '<div id="pkgV21Payment" class="hidden">'+
      '<h3>Bank QR payment</h3><p class="pkg-v21-small">Pay the full amount using the QR, then upload a screenshot of the successful payment. All 3 coaching days are automatically booked when the proof is uploaded successfully — Coach Kyla will check the payment afterward.</p>'+
      '<div class="pkg-v21-payment-meta"><span>Booking reference</span><strong id="pkgV21Ref"></strong><span>Amount to send</span><strong id="pkgV21Amount"></strong><small id="pkgV21Expiry"></small></div>'+
      '<div class="pkg-v21-qr"><img id="pkgV21Qr" alt="Official Pickyla bank payment QR" referrerpolicy="no-referrer"></div>'+
      '<button type="button" id="pkgV21SaveQr" class="pkg-v21-secondary">Open / Save Bank QR Image</button>'+
      '<p id="pkgV21Bank" class="pkg-v21-bank"></p>'+
      '<button type="button" id="pkgV21Copy" class="pkg-v21-secondary">Copy booking/payment details</button>'+
      '<label class="pkg-v21-proof-label" for="pkgV21ProofFile">Upload screenshot of successful bank transfer (JPG, PNG or WebP • max 3 MB)<input type="file" id="pkgV21ProofFile" accept="image/jpeg,image/png,image/webp" required></label>'+
      '<button type="button" id="pkgV21Messenger" class="pkg-v21-secondary">Contact Coach Kyla on Facebook (optional)</button>'+
      '<button type="button" id="pkgV21Proof" class="pkg-v21-main">Upload Proof & Book All Sessions</button>'+
      '<p class="pkg-v21-small">When the upload succeeds, your selected slots are booked immediately. Payment verification remains pending, and an invalid payment may result in cancellation. Do not transfer a second time without contacting Coach Kyla.</p>'+
    '</div>'+
    '<div id="pkgV21Done" class="hidden"><h3 id="pkgV21DoneTitle">Payment verification pending</h3><p id="pkgV21DoneText"></p><div id="pkgV21StatusSessions"></div><button type="button" id="pkgV21Link" class="pkg-v21-secondary">Copy My Program link</button><div id="pkgV21Reschedule" class="hidden"><h3>Request a reschedule</h3><p class="pkg-v21-small">Please request at least 24 hours before your coaching time. Minimum notice is 12 hours; requests require Kyla\'s approval. Only dates within your original 14-day package window can be selected.</p><label>Which session?<select id="pkgV21ResSession"></select></label><label>New date<input id="pkgV21ResDate" type="text" readonly placeholder="Select date" aria-haspopup="dialog"></label><label>New start time<select id="pkgV21ResHour"></select></label><label>Reason<textarea id="pkgV21ResReason" rows="2" maxlength="500" placeholder="Brief reason (optional)"></textarea></label><button type="button" id="pkgV21ResSend" class="pkg-v21-secondary">Send Reschedule Request</button></div></div>'+
    '<footer class="pkg-v21-brand-footer"><strong>PICKYLA COACHING</strong><span>©2026 XBALANCED DIGITAL SOLUTIONS</span><small>Developed by ELDWIN GASPAR</small></footer>'+
  '</section>';
  document.body.appendChild(root);
  P('pkgV21Close').onclick=()=>{root.classList.add('hidden');document.body.classList.remove('pkg-v21-scrolllock');};
  root.addEventListener('click',e=>{if(e.target===root)P('pkgV21Close').click();});
  function notice(text,isError){const el=P('pkgV21Notice');el.textContent=text||'';el.classList.toggle('hidden',!text);el.classList.toggle('error',!!isError);}
  function show(stage){for(const key of ['Form','Preview','Payment','Done'])P('pkgV21'+key).classList.toggle('hidden',key!==stage);root.classList.remove('hidden');document.body.classList.add('pkg-v21-scrolllock');P('pkgV21Close').focus();}
  let COURTS=['NO COURT YET','NANOMOLY','DINK VALLEY','HC SANTIAGO','CASA PLAY','COURTYARD','OTHERS'];
  const courtFor=s=>s?.court==='OTHERS'?'OTHERS: '+String(s?.otherCourt||'').trim().replace(/\s+/g,' ').slice(0,95):(s?.court||'NO COURT YET');
  const readableCourt=value=>String(value||'NO COURT YET').replace(/^OTHERS:\s*/i,'');
  async function refreshSavedCourts(){
    const {data,error}=await db.rpc('pickyla_public_courts_v26');
    if(error||!Array.isArray(data))return;
    const fixed=['NO COURT YET','NANOMOLY','DINK VALLEY','HC SANTIAGO','CASA PLAY','COURTYARD'];
    const extras=[...new Set(data.map(x=>String(x||'').trim().toUpperCase()).filter(x=>x&&!fixed.includes(x)&&x!=='OTHERS'))]
      .map(x=>'OTHERS: '+x);
    COURTS=[...fixed,...extras,'OTHERS'];
  }
  function checkoutEnabled(){return !!(state.program?.package_booking_enabled&&state.settings&&state.settings.enabled&&state.settings.qr_image_url&&state.settings.account_name&&state.settings.bank_name&&state.settings.messenger_url);}
  function priceFor(){const p=state.program;if(!p)return 0;const extra=p.package_format==='group'?Math.max(0,headcount()-Number(p.package_min_participants||4))*Number(p.package_additional_player_price||0):0;return Number(p.fixed_price||0)+extra;}
  function headcount(){return state.type==='one'?1:state.type==='duo'?2:state.count;}
  function renderTypes(){
    const p=state.program;if(!p)return;
    state.type=p.package_format||'one';
    state.count=p.package_min_participants||1;
    const title={one:'1-on-1 Coaching',duo:'Duo Coaching',group:'Group Coaching'}[state.type]||'Coaching';
    P('pkgV21Types').innerHTML='<div class="pkg-v21-format-info"><strong>'+esc(title)+'</strong><small>'+money(p.fixed_price)+' for the full program</small></div>';
    const group=P('pkgV21GroupWrap'),sel=P('pkgV21GroupCount');
    group.classList.toggle('hidden',state.type!=='group');
    sel.innerHTML=Array.from({length:Math.max(0,p.package_max_participants-p.package_min_participants+1)},(_,i)=>i+p.package_min_participants)
      .map(n=>'<option value="'+n+'" '+(n===state.count?'selected':'')+'>'+n+'</option>').join('');
    sel.onchange=()=>{state.count=Number(sel.value);renderPlayers();renderTotal();};
  }
  function renderTotal(){state.price=priceFor();P('pkgV21Total').textContent=money(state.price);const p=state.program;P('pkgV21PriceHint').textContent=p?.package_format==='group'?money(p.fixed_price)+' for '+p.package_min_participants+' players + '+money(p.package_additional_player_price)+' per additional player. Court fee excluded.':'Court fee is not included.';checkReady();}
  function savedPlayers(){return Array.from(P('pkgV21Players').querySelectorAll('.pkg-v21-player'),el=>({first_name:el.querySelector('[data-first]').value.trim(),last_name:el.querySelector('[data-last]').value.trim(),contact:(el.querySelector('[data-contact]')?.value||'').trim()}));}
  function renderPlayers(){
    const previous=savedPlayers();const n=headcount();
    P('pkgV21Players').innerHTML=Array.from({length:n},(_,i)=>{
      const v=previous[i]||state.participants[i]||{first_name:'',last_name:'',contact:''};
      return '<div class="pkg-v21-player"><strong>Player '+(i+1)+'</strong><div class="pkg-v21-player-fields">'+
        '<label>First name<input data-first maxlength="60" autocomplete="off" value="'+esc(v.first_name)+'" required></label>'+
        '<label>Last name<input data-last maxlength="80" autocomplete="off" value="'+esc(v.last_name)+'" required></label>'+
        (i===0?'<label>Messenger / phone<input data-contact maxlength="120" autocomplete="off" value="'+esc(v.contact)+'" required></label>':'')+
        '</div></div>';
    }).join('');
    P('pkgV21Players').querySelectorAll('input').forEach(el=>el.oninput=checkReady);
    checkReady();
  }
  function validStarts(date){
    if(!date||!state.program)return[];
    const duration=Number(state.program.session_duration_hours||1);
    if(!Number.isInteger(duration)||duration<1||duration>8)return[];
    const starts=[];
    for(let h=8;h+duration<=24;h++){
      let free=true;
      for(let slot=h;slot<h+duration;slot++){
        if(state.availability.get(date+'|'+slot)!=='available'){free=false;break;}
      }
      if(free)starts.push(h);
    }
    return starts;
  }
  async function loadAvailability(){
    const first=state.sessions[0]?.date;if(!first)return;
    const last=addDays(first,13);
    const {data,error}=await db.rpc('program_availability_v21',{p_start_date:first,p_end_date:last});
    if(error)throw error;
    state.availability=new Map();
    for(let i=0;i<14;i++)for(let h=8;h<24;h++)state.availability.set(addDays(first,i)+'|'+h,'available');
    (data||[]).forEach(row=>state.availability.set(row.slot_date+'|'+Number(row.start_hour),row.status));
  }
  function renderSessions(){
    if(!state.program)return;
    const count=Number(state.program.session_count||0),first=state.sessions[0]?.date;
    const last=first?addDays(first,13):'',maxDate=addDays(today(),120);
    P('pkgV21WindowHelp').textContent=first?'Your 14-day booking window: '+nice(first)+' to '+nice(last)+'. Select one session per day, in order.':'Choose Session 1 first to set the 14-day window. Select consecutive hours for each session.';
    const titles=(state.program.sessions||[]);
    P('pkgV21Sessions').innerHTML=Array.from({length:count},(_,i)=>{
      const s=state.sessions[i]||{date:'',start:null,court:'NO COURT YET',otherCourt:''},prev=state.sessions[i-1];
      const dateMin=i===0?today():(prev?.date?addDays(prev.date,1):first||today());
      const dateMax=i===0?maxDate:last;
      const starts=validStarts(s.date);
      const valid=starts.includes(Number(s.start));
      if(!valid)s.start=null;
      const options='<option value="">Choose consecutive start hours</option>'+starts.map(h=>'<option value="'+h+'" '+(h===s.start?'selected':'')+'>'+hour(h)+' – '+hour(h+Number(state.program.session_duration_hours))+'</option>').join('');
      const t=titles.find(x=>Number(x.session_number)===i+1);
      return '<div class="pkg-v21-session"><strong>Session '+(i+1)+(t?' • '+esc(t.title):'')+'</strong><div class="pkg-v21-session-fields">'+
        '<label>Day<input data-session-date="'+i+'" type="text" readonly placeholder="Select date" aria-haspopup="dialog" min="'+dateMin+'" max="'+dateMax+'" value="'+esc(s.date)+'" '+(i>0&&!first?'disabled':'')+'></label>'+
        '<label>Time<select data-session-start="'+i+'" '+(!s.date?'disabled':'')+'>'+options+'</select></label></div>'+
        '<div class="pkg-v21-court-fields"><label>Court venue<select data-session-court="'+i+'">'+COURTS.map(c=>'<option value="'+esc(c)+'" '+((s.court||'NO COURT YET')===c?'selected':'')+'>'+esc(readableCourt(c))+'</option>').join('')+'</select></label>'+
        '<label class="'+(s.court==='OTHERS'?'':'hidden')+'" data-session-other-wrap="'+i+'">Specify other court<input type="text" data-session-other="'+i+'" maxlength="95" placeholder="Court name" value="'+esc(s.otherCourt||'')+'"></label></div>'+
        (s.date&&!starts.length?'<small class="pkg-v21-warning">No consecutive '+esc(state.program.session_duration_hours)+'-hour slot on this day.</small>':'')+
        '</div>';
    }).join('');
    P('pkgV21Sessions').querySelectorAll('[data-session-date]').forEach(el=>el.onchange=async()=>{
      const i=Number(el.dataset.sessionDate),date=el.value;
      const oldFirst=state.sessions[0]?.date;state.sessions[i]={...state.sessions[i],date,start:null,court:state.sessions[i]?.court||'NO COURT YET'};
      if(i===0&&date!==oldFirst){for(let j=1;j<count;j++)state.sessions[j]={date:'',start:null};state.availability.clear();}
      if(i>0){for(let j=i+1;j<count;j++)state.sessions[j]={date:'',start:null};}
      try{if(i===0&&date)await loadAvailability();notice('');}
      catch(err){notice('Could not refresh available times. '+(err.message||err),true);}
      renderSessions();checkReady();
    });
    P('pkgV21Sessions').querySelectorAll('[data-session-court]').forEach(el=>el.onchange=()=>{
      const i=Number(el.dataset.sessionCourt);
      state.sessions[i].court=el.value;
      P('pkgV21Sessions').querySelector('[data-session-other-wrap="'+i+'"]').classList.toggle('hidden',el.value!=='OTHERS');
      checkReady();
    });
    P('pkgV21Sessions').querySelectorAll('[data-session-other]').forEach(el=>el.oninput=()=>{
      state.sessions[Number(el.dataset.sessionOther)].otherCourt=el.value;
      checkReady();
    });
    P('pkgV21Sessions').querySelectorAll('[data-session-start]').forEach(el=>el.onchange=()=>{
      const i=Number(el.dataset.sessionStart);
      state.sessions[i].start=el.value?Number(el.value):null;
      checkReady();
    });
    checkReady();
  }
  function checkReady(){
    const btn=P('pkgV21Reserve');if(!btn||!state.program)return;
    const dates=state.sessions.map(x=>x?.date).filter(Boolean);
    const unique=new Set(dates);
    const duration=Number(state.program.session_duration_hours),count=Number(state.program.session_count);
    const scheduleValid=dates.length===count&&unique.size===count&&state.sessions.every(s=>s&&s.date&&Number.isInteger(s.start)&&validStarts(s.date).includes(s.start));
    const players=savedPlayers();
    const namesValid=players.length===headcount()&&players.every(p=>p.first_name&&p.last_name&&p.first_name.length<=60&&p.last_name.length<=80)&&!!players[0]?.contact;
    const courtsValid=state.sessions.every(s=>COURTS.includes(s.court||'NO COURT YET')&&
      (s.court!=='OTHERS'||(String(s.otherCourt||'').trim().length>=2)));
    const valid=scheduleValid&&namesValid&&courtsValid&&state.price>0&&Number.isInteger(duration);
    btn.disabled=!valid||state.loading;
    btn.textContent=checkoutEnabled()?'Reserve schedules & proceed to payment':'Review My Promo Schedule';
    P('pkgV21ReserveHelp').textContent=checkoutEnabled()?
      'Your selected hours will be held for 30 minutes during payment. Once you upload the successful bank transfer screenshot, all sessions are booked immediately while Coach Kyla verifies payment.':
      'Preview only: you can plan all 3 coaching dates and contact Coach Kyla. No slots are reserved and no payment is collected here.';
    return valid;
  }
  async function openProgram(summary){
    if(!summary)return;
    notice('');show('Form');P('pkgV21Title').textContent=summary.name||'Coaching Program';
    state.program=null;state.settings=null;state.reference=null;state.token=null;state.availability.clear();
    P('pkgV21Meta').textContent='Loading package setup…';
    try{
      await refreshSavedCourts().catch(()=>{});
      const [prog,sett,sessions]=await Promise.all([
        db.from('coaching_programs').select('id,name,session_count,session_duration_hours,fixed_price,package_additional_player_price,package_format,package_min_participants,package_max_participants,package_booking_enabled,is_active').eq('id',summary.id).single(),
        db.rpc('program_payment_settings_v21'),
        db.from('coaching_program_sessions').select('session_number,title').eq('program_id',summary.id).order('session_number')
      ]);
      if(prog.error)throw prog.error;if(sessions.error)throw sessions.error;
      if(!prog.data?.is_active)throw new Error('This coaching promo is currently unavailable. Please contact Coach Kyla.');
      const p=prog.data;
      if(!Number.isInteger(Number(p.session_duration_hours))||p.session_count>14||p.session_count<1)throw new Error('This program needs an admin schedule configuration before online booking.');
      state.program={...p,sessions:sessions.data||[]};state.settings=!sett.error&&Array.isArray(sett.data)?sett.data[0]||null:null;
      state.type=p.package_format;state.count=p.package_min_participants;state.sessions=Array.from({length:p.session_count},()=>({date:'',start:null,court:'NO COURT YET',otherCourt:''}));state.participants=[];
      P('pkgV21Meta').textContent=p.session_count+' sessions • '+p.session_duration_hours+' consecutive hours each • 14 calendar days';
      renderTypes();renderSessions();renderPlayers();renderTotal();
      if(!checkoutEnabled())notice('Promo schedule preview is available! Choose your dates and participants, then review your plan. No payment or reservation will be made yet.');
    }catch(err){P('pkgV21Meta').textContent='Package checkout unavailable';P('pkgV21Sessions').innerHTML='';P('pkgV21Types').innerHTML='';P('pkgV21Players').innerHTML='';P('pkgV21Reserve').disabled=true;notice(err.message||String(err),true);}
  }
  async function reserve(){
    if(!checkReady()||state.loading)return;
    const btn=P('pkgV21Reserve');state.loading=true;btn.disabled=true;notice('Checking and holding all selected hours…');
    try{
      await loadAvailability();
      if(!checkReady())throw new Error('An hour is no longer available. Please choose another schedule.');
      const participants=savedPlayers(),duration=Number(state.program.session_duration_hours);
      const sessions=state.sessions.map(s=>({date:s.date,start_hour:s.start,end_hour:s.start+duration,court_name:courtFor(s)}));
      const {data,error}=await db.rpc('reserve_program_package_v21',{p_program_id:state.program.id,p_format:state.type,p_sessions:sessions,p_participants:participants});
      if(error)throw error;
      state.reference=data.reference;state.token=data.access_token;state.price=Number(data.amount);state.holdUntil=data.hold_until;
      P('pkgV21Ref').textContent=data.reference;P('pkgV21Amount').textContent=money(data.amount);
      P('pkgV21Expiry').textContent='Temporary reservation expires '+new Date(data.hold_until).toLocaleString('en-PH');
      P('pkgV21Bank').textContent=[state.settings.bank_name,state.settings.account_name,state.settings.account_number].filter(Boolean).join(' • ');
      const qr=state.settings.qr_image_url;
      if(!/^https:\/\//i.test(qr))throw new Error('Bank QR URL is not configured correctly. Please contact Kyla.');
      P('pkgV21Qr').src=qr;notice('');show('Payment');
    }catch(err){notice(err.message||String(err),true);}
    finally{state.loading=false;checkReady();}
  }
  function paymentText(){
    if(!state.reference)return '';
    const players=savedPlayers(),duration=Number(state.program.session_duration_hours);
    return ['PICKYLA SESSION PROGRAM','Reference: '+state.reference,'Program: '+state.program.name,'Coaching: '+state.type.toUpperCase(),'Players: '+headcount(),'Participants: '+players.map(p=>p.first_name+' '+p.last_name).join(', '),'Sessions:',...state.sessions.map((s,i)=>(i+1)+'. '+nice(s.date)+' • '+hour(s.start)+' – '+hour(s.start+duration)+' • '+courtFor(s)),'Full package payment: '+money(state.price),'Payment proof: Please see attached bank transfer screenshot.'].join('\n');
  }
  async function copyText(text){try{await navigator.clipboard.writeText(text);notice('Details copied. Paste them into your Messenger chat.');}catch(_){notice('Clipboard permission is unavailable. Please copy the details manually.',true);}}
  function previewMessage(){
    const participants=savedPlayers(),duration=Number(state.program.session_duration_hours);
    return [
      'PICKYLA 5+1 COACHING PROMO — SCHEDULE INQUIRY',
      'PREVIEW ONLY — NO CONFIRMED RESERVATION OR PAYMENT',
      'Program: '+state.program.name,
      'Format: '+state.type.toUpperCase(),
      'Participants ('+headcount()+'): '+participants.map(p=>p.first_name+' '+p.last_name).join(', '),
      'Contact: '+(participants[0]?.contact||''),
      'Requested coaching dates:',
      ...state.sessions.map((x,i)=>(i+1)+'. '+nice(x.date)+' | '+hour(x.start)+' to '+hour(x.start+duration)+' | Court: '+readableCourt(courtFor(x))),
      'Total: '+money(state.price)+' for '+state.sessions.length*duration+' coaching hours (court fee excluded).',
      'Please confirm availability and official booking/payment instructions.'
    ].join('\n');
  }
  function previewSchedule(){
    if(!checkReady()||state.loading)return;
    P('pkgV21PreviewDetails').textContent=previewMessage();
    notice('');
    show('Preview');
  }
  P('pkgV21Reserve').onclick=()=>checkoutEnabled()?reserve():previewSchedule();
  P('pkgV21PreviewBack').onclick=()=>{notice('');show('Form');};
  P('pkgV21PreviewCopy').onclick=()=>copyText(previewMessage());
  P('pkgV21PreviewMessage').onclick=()=>{
    window.open('https://www.facebook.com/kylaniczz/','_blank','noopener,noreferrer');
    copyText(previewMessage());
  };
  P('pkgV21Copy').onclick=()=>copyText(paymentText());
  P('pkgV21SaveQr').onclick=()=>{
    if(state.settings&&/^https:\/\//i.test(state.settings.qr_image_url))
      window.open(state.settings.qr_image_url,'_blank','noopener,noreferrer');
  };
  P('pkgV21Messenger').onclick=()=>{
    // Open from the direct click before clipboard awaits, avoiding popup blockers.
    if(state.settings&&/^https:\/\//i.test(state.settings.messenger_url))
      window.open(state.settings.messenger_url,'_blank','noopener,noreferrer');
    copyText(paymentText());
  };
  function trackingLink(){
    const url=new URL(location.href);
    url.searchParams.delete('program_ref');url.searchParams.delete('program_token');
    url.hash=new URLSearchParams({program_ref:state.reference,program_token:state.token}).toString();
    return url.href;
  }
  P('pkgV21Link').onclick=()=>copyText(trackingLink());
  P('pkgV21Proof').onclick=async()=>{
    const btn=P('pkgV21Proof'),file=P('pkgV21ProofFile').files[0];
    if(!state.reference||!state.token)return notice('Please reserve your package schedule first.',true);
    if(!file)return notice('Choose a screenshot of the successful bank transfer.',true);
    if(!['image/png','image/jpeg','image/webp'].includes(file.type))return notice('Choose a PNG, JPG or WebP screenshot.',true);
    if(file.size<100||file.size>3145728)return notice('Payment screenshot must be under 3 MB.',true);
    if(state.loading)return;
    state.loading=true;btn.disabled=true;btn.textContent='Uploading payment proof…';
    const extension={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[file.type];
    const key=state.reference+'/'+state.token+'.'+extension;
    try{
      if(Date.now()>=new Date(state.holdUntil).getTime())throw Error('This 30-minute hold has expired. Please contact Coach Kyla if payment was already sent.');
      const upload=await db.storage.from('pickyla-package-proofs').upload(key,file,{contentType:file.type,upsert:false,cacheControl:'0'});
      if(upload.error)throw upload.error;
      btn.textContent='Booking all coaching days…';
      const {data,error}=await db.rpc('finalize_program_proof_v22',{
        p_reference:state.reference,p_access_token:state.token,p_proof_path:key
      });
      if(error)throw error;
      notice('');
      P('pkgV21DoneTitle').textContent='All Sessions Booked!';
      P('pkgV21DoneText').textContent='Your '+state.program.name+' has been booked immediately. Coach Kyla was notified. Payment verification is pending. Reference: '+state.reference+'. Keep your private My Program link.';
      P('pkgV21StatusSessions').textContent=state.sessions.map((x,i)=>'Session '+(i+1)+': '+nice(x.date)+' • '+hour(x.start)+'–'+hour(x.start+Number(state.program.session_duration_hours))+' • Court: '+courtFor(x)).join('\n');
      show('Done');
    }catch(err){notice((err.message||String(err))+' If the screenshot was uploaded but booking failed, contact Coach Kyla and do not pay twice.',true);btn.disabled=false;}
    finally{state.loading=false;btn.textContent='Upload Proof & Book All Sessions';}
  };
  P('pkgV21ResSend').onclick=async()=>{
    const btn=P('pkgV21ResSend'),n=Number(P('pkgV21ResSession').value),d=P('pkgV21ResDate').value,h=Number(P('pkgV21ResHour').value);
    if(!n||!d||!Number.isInteger(h))return notice('Select a session, new date and start hour.',true);
    btn.disabled=true;notice('Submitting reschedule request…');
    const {error}=await db.rpc('request_program_reschedule_v21',{
      p_reference:state.reference,p_access_token:state.token,p_session_number:n,
      p_date:d,p_start_hour:h,p_reason:P('pkgV21ResReason').value.trim()
    });
    if(error){notice(error.message,true);btn.disabled=false;return;}
    notice('Reschedule requested. Your existing confirmed schedule remains unchanged until Kyla approves.');btn.disabled=false;
  };
  async function resumeFromLink(){
    const fragment=location.hash.replace(/^#/,'');
    const q=new URLSearchParams(fragment.startsWith('program_ref=')?fragment:location.search);
    const reference=q.get('program_ref'),token=q.get('program_token');
    if(!reference||!token)return;
    state.reference=reference;state.token=token;P('pkgV21Title').textContent='My Program';
    show('Done');notice('Checking your program status…');
    const {data,error}=await db.rpc('get_program_package_status_v21',{p_reference:reference,p_access_token:token});
    if(error){notice('This private program link cannot be verified.',true);return;}
    notice('');
    P('pkgV21DoneTitle').textContent='Package status: '+String(data.status||'pending').replace(/_/g,' ');
    P('pkgV21DoneText').textContent=(data.program_name||'Program')+' • '+money(data.amount)+' • Reference '+reference+' • Payment: '+(data.payment_verification==='verified'?'Verified':data.payment_verification==='rejected'?'Rejected — booking cancelled':'Verification pending');
    P('pkgV21StatusSessions').textContent=(data.sessions||[]).map(s=>'Session '+s.session_number+': '+nice(s.slot_date)+' • '+hour(s.start_hour)+' – '+hour(s.end_hour)+' • Court: '+(s.court_name||'NO COURT YET')).join('\n');
    const box=P('pkgV21Reschedule');box.classList.toggle('hidden',data.status!=='confirmed');
    if(data.status==='confirmed'){
      const entries=data.sessions||[],start=data.window_start||entries[0]?.slot_date;
      P('pkgV21ResSession').innerHTML=entries.map(s=>'<option value="'+s.session_number+'">Session '+s.session_number+' — '+esc(s.slot_date)+'</option>').join('');
      P('pkgV21ResDate').min=start;P('pkgV21ResDate').max=addDays(start,13);P('pkgV21ResDate').value='';
      const length=Number(data.duration_hours||2);
      P('pkgV21ResHour').innerHTML=Array.from({length:Math.max(0,17-length)},(_,i)=>i+8).map(h=>'<option value="'+h+'">'+hour(h)+' – '+hour(h+length)+'</option>').join('');
    }
  }
  // When package checkout is disabled, preserve the original public 'I'm Interested'
  // handler and regular booking. Only active and payment-ready packages are intercepted.
  const onlineProgramIds=new Set();
  let acceptingPackagePayments=false;
  const programGrid=document.getElementById('publicProgramGrid');
  function syncProgramButtons(){
    programGrid?.querySelectorAll('.public-program-card[data-program-id]').forEach(card=>{
      const id=card.dataset.programId;
      const button=card.querySelector('.program-interest');
      if(!button)return;
      const enabled=acceptingPackagePayments&&onlineProgramIds.has(id);
      button.textContent=enabled?'Book Full Promo Package':'Choose Promo Schedule';
      button.setAttribute('aria-label',enabled?'Book all sessions for this promo':'Choose dates and preview this coaching promo');
    });
  }
  async function refreshPackageActivation(){
    const [programs,payments]=await Promise.all([
      db.from('coaching_programs').select('id,package_booking_enabled,is_active').eq('is_active',true),
      db.rpc('program_payment_settings_v21')
    ]);
    if(programs.error||payments.error){
      acceptingPackagePayments=false;onlineProgramIds.clear();syncProgramButtons();return;
    }
    acceptingPackagePayments=Array.isArray(payments.data)&&payments.data.some(x=>x.enabled&&x.qr_image_url&&x.messenger_url);
    onlineProgramIds.clear();
    (programs.data||[]).filter(x=>x.is_active&&x.package_booking_enabled).forEach(x=>onlineProgramIds.add(x.id));
    syncProgramButtons();
  }
  if(programGrid)new MutationObserver(syncProgramButtons).observe(programGrid,{childList:true});
  refreshPackageActivation().catch(()=>{});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshPackageActivation().catch(()=>{});});
  document.addEventListener('click',event=>{
    const cardButton=event.target.closest('.program-interest');
    const suggested=event.target.closest('#useRecommendedProgram');
    if(!cardButton&&!suggested)return;
    const found=cardButton?publicPrograms.find(x=>x.id===cardButton.closest('[data-program-id]')?.dataset.programId):publicPrograms.find(x=>selectedGoalFocus&&Array.isArray(x.focus_areas)&&x.focus_areas.includes(selectedGoalFocus));
    if(!found)return;
    event.preventDefault();event.stopImmediatePropagation();
    openProgram(found);
  },true);
  resumeFromLink().catch(err=>notice(err.message||String(err),true));
  window.PickylaProgramV21={openProgram,addDays,validStarts};
})();
