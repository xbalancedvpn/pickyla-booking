/* Pickyla v27: Coach Kazu-style request sent / edit / start new.
 * Regular inquiries only; paid Promo Packages remain in their own checkout flow.
 * Runs after legacy public scripts and captures Send Request before older handlers.
 */
(function(){
 'use strict';
 const button=document.getElementById('sendRequestButton');
 const status=document.getElementById('requestSubmitStatus');
 const box=document.querySelector('#booking .booking-actions-client');
 if(!button||!status||!box)return;
 const panel=document.createElement('section');
 panel.id='v27RequestPanel';panel.className='v27-request-panel';panel.hidden=true;
 panel.innerHTML='<div class="v27-request-heading"><span aria-hidden="true">✓</span><div><strong id="v27RequestTitle">Booking Request Sent!</strong><p id="v27RequestHelp">Awaiting Coach Kyla\'s confirmation. This does not reserve your hours yet.</p></div></div>'+
 '<p class="v27-request-reference">Request Reference: <strong id="v27RequestRef"></strong> <small id="v27RequestVersion"></small></p>'+
 '<p id="v27RequestInfo" class="v27-request-info"></p>'+
 '<button id="v27StartNew" type="button" class="v27-request-new">Start New Request</button>';
 box.insertAdjacentElement('afterend',panel);
 let token=null,version=0,requestKind=null,sentSignature=null,busy=false,dirty=false;
 const el=id=>document.getElementById(id);
 const isMulti=()=>!!window.pickylaV20Multi?.isMultiple?.();
 const secureToken=()=>{
   if(window.crypto?.randomUUID)return crypto.randomUUID();
   if(!window.crypto?.getRandomValues)throw Error('Secure browser required. Open Pickyla using HTTPS.');
   const buf=new Uint8Array(16);crypto.getRandomValues(buf);
   buf[6]=(buf[6]&15)|64;buf[8]=(buf[8]&63)|128;
   const hex=Array.from(buf,b=>b.toString(16).padStart(2,'0')).join('');
   return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
 };
 const pkgCount=()=>Number(typeof selectedPlayers!=='undefined'?selectedPlayers:1)||1;
 const rate=()=>{
   if(isMulti())return Number(window.pickylaV20Pricing?.hourlyTotalFor?.(pkgCount())||0);
   return Number(String(typeof selectedRate!=='undefined'?selectedRate||'':'').replace(/[^0-9.]/g,''))||0;
 };
 function payload(){
   const players=typeof getPublicParticipants==='function'?getPublicParticipants(true):null;
   const text=typeof bookingMessage==='function'?bookingMessage():'';
   if(!players||!players.length||!text)return null;
   const multi=isMulti();
   const kind=multi?'multiple':'single';
   let sessions;
   if(multi){
     if(!window.pickylaV20Multi?.ready?.())return null;
     sessions=window.pickylaV20Multi.sessionsForRequest?.();
   }else{
     if(typeof selectedDate==='undefined'||!selectedDate||selectedStart===null||selectedEnd===null)return null;
     const court=window.pickylaV20PublicCourt?.value?.();
     if(!court)return null;
     sessions=[{date:keyDate(selectedDate),start_hour:selectedStart,end_hour:selectedEnd,court}];
   }
   if(!Array.isArray(sessions)||!sessions.length||sessions.some(s=>!s.date||!Number.isInteger(s.start_hour)||!Number.isInteger(s.end_hour)))return null;
   return {
     p_request_kind:kind,p_sessions:sessions,p_participant_count:players.length,
     p_coaching_type:typeof selectedPackage!=='undefined'?selectedPackage||'':null,
     p_quoted_rate:rate(),p_source_text:text,
     p_goal_focus:typeof selectedGoalLabel!=='undefined'?selectedGoalLabel||null:null,
     p_program_interest:typeof selectedProgramInterest!=='undefined'?selectedProgramInterest?.name||null:null,
     p_participants:players,p_self_assessment:window.pickylaGetSelfAssessment?.()||null
   };
 }
 function signature(p){return p?JSON.stringify(p):null;}
 function setStatus(text,error=false){
   status.dataset.keep='1';status.className='request-submit-status '+(error?'error':'ok');
   status.textContent=text;
 }
 function clearStatus(){
   delete status.dataset.keep;
   status.className='request-submit-status hidden';status.textContent='';
 }
 function refreshButton(){
   if(busy)return;
   const p=payload();
   const invalid=!p||button.classList.contains('disabled');
   if(!version){
     button.disabled=false;button.textContent='Send Request to Admin';
     return;
   }
   // After the first successful send, form changes can only update the same token.
   dirty=signature(p)!==sentSignature;
   const wrongMode=p?.p_request_kind!==requestKind;
   if(!dirty){
     button.disabled=true;button.textContent='✓ Request Sent';
     el('v27RequestInfo').textContent='Request submitted. Change your booking details to update it, or start a new request.';
   }else{
     button.disabled=!!(invalid||wrongMode);
     button.textContent=wrongMode?'Start New Request to Change Mode':'Update Request';
     el('v27RequestInfo').textContent=wrongMode
       ?'Single and multiple booking are different request types. Please use Start New Request.'
       :'You have unsent changes. Choose Update Request to send the revised details to Coach Kyla.';
   }
 }
 async function send(){
   if(busy)return;
   const p=payload();
   if(!p){setStatus('Please complete the date, available hours, players, coaching type, and court before sending.',true);return;}
   if(version&&requestKind!==p.p_request_kind){
     setStatus('To change between single and multiple booking, choose Start New Request.',true);return;
   }
   if(version&&signature(p)===sentSignature){refreshButton();return;}
   if(!token)token=secureToken();
   busy=true;button.disabled=true;button.textContent=version?'Updating…':'Sending…';
   clearStatus();
   try{
     const {data,error}=await db.rpc('submit_public_request_v27',{
       p_request_token:token,p_expected_version:version,...p
     });
     if(error)throw error;
     if(!data?.reference||!Number.isInteger(Number(data.version)))throw Error('Could not verify the submitted request.');
     version=Number(data.version);
     requestKind=p.p_request_kind;
     sentSignature=signature(p);
     dirty=false;
     el('v27RequestRef').textContent=data.reference;
     el('v27RequestVersion').textContent='Version '+version;
     el('v27RequestTitle').textContent=data.updated?'Booking Request Updated!':'Booking Request Sent!';
     el('v27RequestHelp').textContent=
       'Received by Pickyla Admin. Your schedule is subject to confirmation by Coach Kyla.';
     el('v27RequestInfo').textContent=data.updated
       ?'Your latest changes were sent to the SAME pending inquiry. No duplicate booking was created.'
       :'Your inquiry has been sent successfully. Selected hours are not reserved until confirmed.';
     panel.hidden=false;
     setStatus(data.updated?'Request updated successfully.':'Request sent to Pickyla Admin.');
     if(typeof saveParticipantMemory==='function')saveParticipantMemory(p.p_participants);
     panel.scrollIntoView({behavior:'smooth',block:'nearest'});
   }catch(e){
     setStatus((e.message||'Unable to send the request.')+
       ' If you already submitted it, retry the same request instead of starting another.',true);
   }finally{busy=false;refreshButton();}
 }
 // Capture on document before legacy onclick and multiple-mode listeners.
 document.addEventListener('click',event=>{
   if(event.target.closest('#sendRequestButton')!==button)return;
   event.preventDefault();event.stopImmediatePropagation();
   if(button.disabled||button.classList.contains('disabled'))return;
   send().catch(e=>setStatus(e.message||'Unable to send request.',true));
 },true);
 // Let existing field handlers update their own selected date, time and player state.
 let pendingRefresh=false;
 function scheduleRefresh(){
   if(!version||pendingRefresh)return;
   pendingRefresh=true;
   setTimeout(()=>{pendingRefresh=false;refreshButton();},0);
 }
 document.getElementById('booking')?.addEventListener('input',scheduleRefresh);
 document.getElementById('booking')?.addEventListener('change',scheduleRefresh);
 document.getElementById('booking')?.addEventListener('click',event=>{
   if(event.target.closest('button')&&!event.target.closest('#sendRequestButton'))scheduleRefresh();
 });
 document.addEventListener('pickyla:v27-changed',scheduleRefresh);
 el('v27StartNew').onclick=()=>{
   if(busy)return;
   token=null;version=0;requestKind=null;sentSignature=null;dirty=false;
   panel.hidden=true;clearStatus();
   window.pickylaV27ResetRegularBooking?.();
   window.pickylaV20Multi?.reset?.();
   // Drop stale success and keep the visitor in the familiar booking flow.
   button.disabled=false;button.textContent='Send Request to Admin';
   if(typeof updateSummary==='function')updateSummary();
   document.getElementById('booking')?.scrollIntoView({behavior:'smooth',block:'start'});
 };
})();
