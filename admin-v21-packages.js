/* Pickyla v21 admin package setup and verification. Loaded only after backend migration. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₱'+Number(n||0).toLocaleString('en-PH',{maximumFractionDigits:2});
const hub=$('programHubSection');if(!hub)return;
const wrap=document.createElement('section');wrap.id='pkgV21Admin';wrap.className='panel pkg-v21-admin';
wrap.innerHTML='<div class="panel-head"><div><span class="eyebrow">PROGRAM PACKAGE CHECKOUT</span><h2>Online package bookings</h2><p class="panel-note">Packages book automatically when customers upload successful bank transfer screenshots. Review proofs and verify Finance or cancel invalid bookings.</p></div><button id="pkgV21Refresh" class="secondary">Refresh</button></div>'+
'<p id="pkgV21AdminNotice" class="panel-note"></p><details class="pkg-v21-admin-settings"><summary><strong>Bank QR & Messenger settings</strong></summary>'+
'<form id="pkgV21BankForm" class="pkg-v21-admin-grid">'+
'<label>Bank name<input name="bank_name" maxlength="120" required></label><label>Account name<input name="account_name" maxlength="140" required></label>'+
'<label>Account number<input name="account_number" maxlength="100"></label><label>HTTPS QR image URL<input type="url" name="qr_image_url" required placeholder="https://..."></label>'+
'<label>Messenger Page URL<input type="url" name="messenger_url" required placeholder="https://m.me/..."></label>'+
'<label class="pkg-v21-switch"><input type="checkbox" name="enabled"> Enable checkout</label><button class="primary" type="submit">Save bank setup</button></form></details>'+
'<details class="pkg-v21-admin-settings"><summary><strong>Program format & participant capacity</strong></summary><div id="pkgV21Programs">Loading…</div></details>'+
'<h3>Package Bookings & Payment Proofs</h3><div id="pkgV21Requests">Loading…</div><h3>Session reschedule requests</h3><div id="pkgV21Reschedules">Loading…</div>';
hub.insertAdjacentElement('afterend',wrap);
const notice=(m,bad=false)=>{const e=$('pkgV21AdminNotice');e.textContent=m;e.classList.toggle('pkg-v21-alert',bad);};
async function authorized(){const {data}=await db.auth.getSession();return !!data?.session;}
async function settings(){
 const {data,error}=await db.from('program_payment_settings').select('*').eq('id',1).maybeSingle();
 if(error)throw error;const f=$('pkgV21BankForm'),v=data||{};
 ['bank_name','account_name','account_number','qr_image_url','messenger_url'].forEach(k=>f.elements[k].value=v[k]||'');
 f.elements.enabled.checked=!!v.enabled;
}
$('pkgV21BankForm').onsubmit=async e=>{
 e.preventDefault();const f=e.currentTarget,v={id:1,updated_at:new Date().toISOString()};
 ['bank_name','account_name','account_number','qr_image_url','messenger_url'].forEach(k=>v[k]=f.elements[k].value.trim());
 v.enabled=f.elements.enabled.checked;
 if(![v.qr_image_url,v.messenger_url].every(u=>/^https:\/\//i.test(u)))return notice('Bank QR and Messenger links must be HTTPS.',true);
 const {error}=await db.from('program_payment_settings').upsert(v,{onConflict:'id'});
 if(error)notice(error.message,true);else{notice('Bank settings saved.');settings();}
};
async function programs(){
 const {data,error}=await db.from('coaching_programs').select('id,name,session_count,session_duration_hours,fixed_price,package_additional_player_price,package_format,package_min_participants,package_max_participants,package_booking_enabled,is_active').order('name');
 if(error)throw error;
 const el=$('pkgV21Programs');el.innerHTML='';
 (data||[]).forEach(p=>{
  const form=document.createElement('form');form.className='pkg-v21-program-row';
  const title=document.createElement('div');
  title.innerHTML='<strong>'+safe(p.name)+'</strong><small>'+p.session_count+' sessions • '+p.session_duration_hours+' hr/session • Base package '+money(p.fixed_price)+(p.is_active?'':' • INACTIVE')+'</small>';
  form.appendChild(title);
  const type=document.createElement('label');type.textContent='Package format';
  const picker=document.createElement('select');picker.name='format';
  for(const [id,name] of [['one','1-on-1'],['duo','Duo'],['group','Group']]){
    const opt=document.createElement('option');opt.value=id;opt.textContent=name;opt.selected=id===p.package_format;picker.appendChild(opt);
  }
  type.appendChild(picker);form.appendChild(type);
  for(const [key,label,value] of [['min','Minimum participants',p.package_min_participants],['max','Maximum participants',p.package_max_participants]]){
    const lbl=document.createElement('label');lbl.textContent=label;
    const inp=document.createElement('input');inp.name=key;inp.type='number';inp.min='1';inp.max='12';inp.step='1';inp.value=Number(value||1);
    lbl.appendChild(inp);form.appendChild(lbl);
  }
  const fee=document.createElement('label');fee.textContent='Additional group player fee (full package)';
  const feeInput=document.createElement('input');feeInput.name='additional';feeInput.type='number';feeInput.min='0';feeInput.step='.01';feeInput.value=Number(p.package_additional_player_price||0);
  fee.appendChild(feeInput);form.appendChild(fee);
    const onFormat=()=>{
    if(picker.value==='one'){form.elements.min.value='1';form.elements.max.value='1';}
    if(picker.value==='duo'){form.elements.min.value='2';form.elements.max.value='2';}
    if(picker.value==='group'&&Number(form.elements.min.value)<4){form.elements.min.value='4';form.elements.max.value='12';}
  };picker.onchange=onFormat;
  const toggle=document.createElement('label');toggle.className='pkg-v21-switch';
  const box=document.createElement('input');box.name='enabled';box.type='checkbox';box.checked=!!p.package_booking_enabled;
  toggle.append(box,document.createTextNode(' Enable online package booking'));form.append(toggle);
  const btn=document.createElement('button');btn.className='secondary';btn.type='submit';btn.textContent='Save program';form.append(btn);
  form.onsubmit=async e=>{
   e.preventDefault();
   const updated={package_format:form.elements.format.value,package_min_participants:Number(form.elements.min.value),package_max_participants:Number(form.elements.max.value),package_additional_player_price:Number(form.elements.additional.value),package_booking_enabled:form.elements.enabled.checked};
   const {error}=await db.from('coaching_programs').update(updated).eq('id',p.id);
   notice(error?error.message:'Program package pricing saved.',!!error);
  };
  el.appendChild(form);
 });
 if(!data?.length)el.textContent='No programs yet.';
}
// Official, downloadable Pickyla confirmation card: only generated after ADMIN
// verifies the actual bank payment. Automatic booking on upload remains unchanged.
const cardDialog=document.createElement('dialog');
cardDialog.id='pkgV22ConfirmationDialog';
cardDialog.className='pkg-v22-card-dialog';
cardDialog.setAttribute('aria-labelledby','pkgV22CardTitle');
cardDialog.innerHTML='<div class="pkg-v22-card-shell">'+
 '<div class="pkg-v22-card-head"><div><span class="pkg-v22-card-eyebrow">PAYMENT VERIFIED</span><h2 id="pkgV22CardTitle">Booking Confirmation Card</h2><p>Ready to download and share with the client.</p></div>'+
 '<button type="button" id="pkgV22CardClose" class="pkg-v22-card-close" aria-label="Close confirmation card">×</button></div>'+
 '<div class="pkg-v22-card-image-wrap"><img id="pkgV22CardImage" alt="Official Pickyla coaching package confirmation with players, schedule and courts"></div>'+
 '<div class="pkg-v22-card-buttons"><button type="button" id="pkgV22CardDownload" class="primary">Download Confirmation PNG</button>'+
 '<button type="button" id="pkgV22CardCopy" class="secondary">Copy Booking Details</button>'+
 '<button type="button" id="pkgV22CardDismiss" class="secondary">Close</button></div></div>';
document.body.appendChild(cardDialog);
let latestCard=null;
const closeCard=()=>cardDialog.close();
$('pkgV22CardClose').onclick=closeCard;
$('pkgV22CardDismiss').onclick=closeCard;
function prettyDay(iso){
 const date=new Date(String(iso)+'T12:00:00Z');
 return date.toLocaleDateString('en-PH',{weekday:'long',month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
}
function prettyHour(value){
 const h=Number(value);return h===24?'12:00 MN':(h%12||12)+':00 '+(h<12?'AM':'PM');
}
function drawRounded(ctx,x,y,w,h,r,color){
 const q=Math.min(r,w/2,h/2);
 ctx.beginPath();ctx.moveTo(x+q,y);ctx.lineTo(x+w-q,y);
 ctx.quadraticCurveTo(x+w,y,x+w,y+q);ctx.lineTo(x+w,y+h-q);
 ctx.quadraticCurveTo(x+w,y+h,x+w-q,y+h);ctx.lineTo(x+q,y+h);
 ctx.quadraticCurveTo(x,y+h,x,y+h-q);ctx.lineTo(x,y+q);
 ctx.quadraticCurveTo(x,y,x+q,y);ctx.closePath();
 ctx.fillStyle=color;ctx.fill();
}
function drawFit(ctx,str,x,y,max){
 let text=String(str??'');
 if(ctx.measureText(text).width>max){
  while(text.length&&ctx.measureText(text+'…').width>max)text=text.slice(0,-1);
  text+='…';
 }
 ctx.fillText(text,x,y);
}
async function createConfirmationCard(r,slots){
 const players=(Array.isArray(r.participants)?r.participants:[]).map(p=>
  [p.first_name,p.last_name].filter(Boolean).join(' ').trim()).filter(Boolean);
 const count=Math.max(1,players.length);
 const rows=Math.ceil(count/2);
 const slotsSorted=[...slots].sort((a,b)=>Number(a.session_number)-Number(b.session_number));
 const participantFirstY=601,participantEnd=participantFirstY+(rows-1)*42+28;
 const sessionsHeadingY=participantEnd+55,cardsStart=sessionsHeadingY+32;
 const cardsEnd=cardsStart+slotsSorted.length*158+Math.max(0,slotsSorted.length-1)*12;
 const footerY=cardsEnd+36;
 const w=1080,h=footerY+214;
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Your browser cannot generate the confirmation image.');
 ctx.fillStyle='#f0f3f8';ctx.fillRect(0,0,w,h);
 // Pickyla: clean ivory / yellow / charcoal, official brand logotype.
 ctx.fillStyle='#fffbf0';ctx.fillRect(0,0,w,237);
 ctx.fillStyle='#f2c44f';ctx.fillRect(0,231,w,6);
 ctx.fillStyle='#171d27';
 ctx.font='800 41px system-ui,sans-serif';
 let logoDrawn=false;
 try{
   const logo=await new Promise(resolve=>{
     const img=new Image();
     img.onload=()=>resolve(img);
     img.onerror=()=>resolve(null);
     img.src='pickyla-logo-final.png';
   });
   if(logo?.naturalWidth){
     const aspect=logo.naturalWidth/logo.naturalHeight;
     const height=Math.min(89,270/aspect);
     ctx.drawImage(logo,62,38,height*aspect,height);
     logoDrawn=true;
   }
 }catch(_){}
 if(!logoDrawn){
   ctx.strokeStyle='#f2c44f';ctx.lineWidth=4;
   ctx.beginPath();ctx.arc(100,78,37,0,Math.PI*2);ctx.stroke();
   ctx.fillStyle='#151b25';ctx.font='800 48px Georgia,serif';ctx.fillText('P',83,95);
   ctx.font='800 40px system-ui,sans-serif';ctx.fillText('PICKYLA',160,91);
 }
 ctx.font='700 15px system-ui,sans-serif';ctx.fillStyle='#69717c';ctx.fillText('COACHING PACKAGES • OFFICIAL CONFIRMATION',63,147);
 drawRounded(ctx,727,51,295,57,14,'#e4f3de');
 ctx.fillStyle='#27583b';ctx.font='800 21px system-ui,sans-serif';ctx.fillText('✓  PAYMENT VERIFIED',750,89);
 ctx.font='800 56px system-ui,sans-serif';ctx.fillStyle='#131c2a';ctx.fillText('BOOKING CONFIRMED',60,202);
 // Package and payment summary
 drawRounded(ctx,52,261,976,244,24,'#ffffff');
 ctx.fillStyle='#758294';ctx.font='800 17px system-ui,sans-serif';ctx.fillText('PACKAGE AVAILED',83,303);
 ctx.fillStyle='#162436';ctx.font='800 32px system-ui,sans-serif';drawFit(ctx,r.program_name,83,345,620);
 ctx.fillStyle='#65748a';ctx.font='700 17px system-ui,sans-serif';
 const format={one:'1-on-1 Private Coaching',duo:'Duo Coaching',group:'Group Coaching'}[r.format]||'Coaching';
 ctx.fillText(format+'  •  '+slotsSorted.length+' coaching days',83,385);
 ctx.fillStyle='#758294';ctx.font='800 17px system-ui,sans-serif';ctx.fillText('BOOKING REFERENCE',83,438);
 ctx.fillStyle='#142338';ctx.font='800 27px system-ui,sans-serif';ctx.fillText(r.reference,83,469);
 ctx.fillStyle='#916c16';ctx.font='800 17px system-ui,sans-serif';ctx.fillText('PAID PACKAGE',731,303);
 ctx.fillStyle='#161d28';ctx.font='800 43px system-ui,sans-serif';ctx.fillText(money(r.price_amount),731,350);
 ctx.fillStyle='#617087';ctx.font='700 16px system-ui,sans-serif';
 const totalH=slotsSorted.reduce((acc,x)=>acc+Number(x.end_hour)-Number(x.start_hour),0);
 ctx.fillText(totalH+' hours total coaching',733,390);
 ctx.font='600 15px system-ui,sans-serif';
 ctx.fillText('Verified '+new Date(r.verified_at||Date.now()).toLocaleDateString('en-PH',{timeZone:'Asia/Manila',month:'short',day:'numeric',year:'numeric'}),733,463);
 // Participants
 ctx.fillStyle='#192c40';ctx.font='800 23px system-ui,sans-serif';
 ctx.fillText('REGISTERED PLAYERS',58,560);
 ctx.fillStyle='#6c7d8c';ctx.font='700 17px system-ui,sans-serif';ctx.fillText('('+players.length+')',341,560);
 players.forEach((name,i)=>{
  const x=i%2===0?60:555,y=participantFirstY+Math.floor(i/2)*42;
  ctx.fillStyle='#b18b35';ctx.font='800 16px system-ui,sans-serif';ctx.fillText(String(i+1).padStart(2,'0'),x,y);
  ctx.fillStyle='#213248';ctx.font='700 21px system-ui,sans-serif';drawFit(ctx,name,x+39,y,430);
 });
 // Every scheduled date and its original or updated venue
 ctx.fillStyle='#192c40';ctx.font='800 23px system-ui,sans-serif';
 ctx.fillText('YOUR CONFIRMED COACHING SCHEDULE',58,sessionsHeadingY);
 slotsSorted.forEach((slot,i)=>{
  const y=cardsStart+i*170;
  drawRounded(ctx,52,y,976,158,18,'#ffffff');
  drawRounded(ctx,52,y,8,158,4,'#e0ad37');
  drawRounded(ctx,76,y+28,58,58,17,'#172231');
  ctx.font='800 27px system-ui,sans-serif';ctx.fillStyle='#f2c657';ctx.textAlign='center';
  ctx.fillText(String(slot.session_number||i+1),105,y+67);ctx.textAlign='left';
  ctx.font='700 17px system-ui,sans-serif';ctx.fillStyle='#6c7c90';ctx.fillText('COACHING DAY '+(slot.session_number||i+1),153,y+41);
  ctx.font='800 27px system-ui,sans-serif';ctx.fillStyle='#172436';drawFit(ctx,prettyDay(slot.slot_date),153,y+80,544);
  ctx.font='700 22px system-ui,sans-serif';ctx.fillStyle='#7a651c';
  ctx.fillText(prettyHour(slot.start_hour)+'  –  '+prettyHour(slot.end_hour),153,y+119);
  ctx.fillStyle='#66778a';ctx.font='800 16px system-ui,sans-serif';ctx.fillText('COURT VENUE',729,y+61);
  ctx.fillStyle='#182638';ctx.font='800 20px system-ui,sans-serif';
  const court=slot.court_name&&slot.court_name!=='NO COURT YET'?slot.court_name:'To be confirmed';
  drawFit(ctx,court,729,y+95,265);
 });
 // Light Pickyla card footer and required developer credits.
 ctx.fillStyle='#fff7df';ctx.fillRect(0,footerY,w,214);
 ctx.fillStyle='#efbd28';ctx.fillRect(0,footerY,w,5);
 ctx.fillStyle='#171d26';ctx.font='800 22px system-ui,sans-serif';
 ctx.fillText('OFFICIAL PICKYLA COACHING CONFIRMATION',59,footerY+43);
 ctx.fillStyle='#455162';ctx.font='600 17px system-ui,sans-serif';
 ctx.fillText('Please retain this card for your scheduled coaching days.',59,footerY+80);
 ctx.fillStyle='#596475';ctx.font='500 15px system-ui,sans-serif';
 ctx.fillText('Court rental fees are not included. Rescheduling follows Pickyla policy.',59,footerY+107);
 // Credits centered independently from the left-aligned confirmation information.
 ctx.save();
 ctx.textAlign='center';
 ctx.fillStyle='#293544';ctx.font='800 15px system-ui,sans-serif';
 ctx.fillText('©2026 XBALANCED DIGITAL SOLUTIONS',w/2,footerY+154);
 ctx.fillStyle='#6e7783';ctx.font='600 14px system-ui,sans-serif';
 ctx.fillText('Developed by ELDWIN GASPAR',w/2,footerY+177);
 ctx.restore();
 const summary=[
  'PICKYLA — BOOKING CONFIRMED / PAYMENT VERIFIED',
  'Booking reference: '+r.reference,
  'Program: '+r.program_name,
  'Coaching: '+format,
  'Participants: '+players.join(', '),
  'Full package payment: '+money(r.price_amount),
  'Scheduled coaching days:',
  ...slotsSorted.map((sl,i)=>(i+1)+'. '+prettyDay(sl.slot_date)+' | '+prettyHour(sl.start_hour)+' – '+prettyHour(sl.end_hour)+' | Court: '+(sl.court_name||'NO COURT YET')),
  'Court rental not included.'
 ].join('\n');
 return {reference:r.reference,image:canvas.toDataURL('image/png'),summary};
}
async function openConfirmationCard(requestId){
 // Never generate an official verified card from an unverified browser-side status.
 const {data:r,error:e}=await db.from('program_package_requests')
  .select('id,reference,program_name,format,participants,participant_count,price_amount,verified_at,payment_verification_status,status')
  .eq('id',requestId).single();
 if(e)throw e;
 if(r.status!=='confirmed'||r.payment_verification_status!=='verified')
  throw Error('Only a verified, confirmed package can receive an official confirmation card.');
 const {data:slots,error:se}=await db.from('program_package_slots')
  .select('session_number,slot_date,start_hour,end_hour,court_name,booking_id')
  .eq('request_id',requestId).order('session_number');
 if(se)throw se;
 if(!slots?.length||slots.some(x=>!x.booking_id))
  throw Error('Unable to load the complete confirmed coaching schedule.');
 latestCard=await createConfirmationCard(r,slots);
 $('pkgV22CardImage').src=latestCard.image;
 if(!cardDialog.open)cardDialog.showModal();
}
$('pkgV22CardDownload').onclick=()=>{
 if(!latestCard)return;
 const a=document.createElement('a');
 a.href=latestCard.image;
 a.download='Pickyla-Booking-Confirmation-'+latestCard.reference+'.png';
 document.body.appendChild(a);a.click();a.remove();
};
$('pkgV22CardCopy').onclick=async()=>{
 if(!latestCard)return;
 try{await navigator.clipboard.writeText(latestCard.summary);notice('Confirmed booking details copied — ready to send to the client.');}
 catch(_){window.prompt('Copy the booking details:',latestCard.summary);}
};
async function requests(){
 const {data,error}=await db.from('program_package_requests')
  .select('id,reference,program_name,format,participant_count,participants,price_amount,status,created_at,hold_until,payment_verification_status,payment_proof_path')
  .order('created_at',{ascending:false}).limit(60);
 if(error)throw error;
 const el=$('pkgV21Requests');el.innerHTML='';
 for(const r of (data||[])){
  const client=r.participants?.[0]||{};
  const isActive=['held','payment_reported'].includes(r.status)&&new Date(r.hold_until)>new Date();
  const isPending=r.status==='confirmed'&&r.payment_verification_status==='pending'&&!!r.payment_proof_path;
  const row=document.createElement('article');row.className='pkg-v21-request';row.dataset.packageRequestId=r.id;
  const statusText=r.status==='confirmed'?
    (r.payment_verification_status==='verified'?'Booked / Paid — Verified':'Booked — Payment Verification Pending'):
    r.status.replace(/_/g,' ');
  row.innerHTML='<div><strong>'+safe(r.reference)+' • '+safe(r.program_name)+'</strong><span>'+safe(statusText)+'</span></div>'+
    '<p>'+safe([client.first_name,client.last_name].filter(Boolean).join(' '))+' • '+safe(client.contact||'No contact')+' • '+r.participant_count+' player(s)</p>'+
    '<p><strong>'+money(r.price_amount)+'</strong> • Requested '+new Date(r.created_at).toLocaleString('en-PH')+
    (r.status==='held'?' • Hold until '+new Date(r.hold_until).toLocaleString('en-PH'):'')+'</p>';
  const actions=document.createElement('div');actions.className='pkg-v21-admin-actions';
  if(r.payment_proof_path&&r.status==='confirmed'){
    const show=document.createElement('button');show.type='button';show.className='secondary';show.textContent='View Payment Screenshot';
    show.onclick=async()=>{
      show.disabled=true;
      const {data,error}=await db.storage.from('pickyla-package-proofs').createSignedUrl(r.payment_proof_path,90);
      if(error)notice(error.message,true);
      else window.open(data.signedUrl,'_blank','noopener,noreferrer');
      show.disabled=false;
    };
    actions.append(show);
  }
  const makeAction=(text,label,args,confirmText,requestReason)=>{
    const btn=document.createElement('button');btn.type='button';
    btn.className=label==='verify'?'primary':'soft-danger';btn.textContent=text;
    btn.onclick=async()=>{
      if(confirmText&&!confirm(confirmText))return;
      const reason=requestReason?prompt('Cancellation reason (required):'):null;
      if(requestReason&&reason===null)return;
      if(requestReason&&String(reason).trim().length<5)return notice('Enter at least 5 characters for the reason.',true);
      const payload=requestReason?{...args,p_reason:reason}:args;
      btn.disabled=true;
      const rpc=label==='verify'?'admin_verify_program_payment_v22':
        label==='cancel'?'admin_cancel_unverified_package_v22':'admin_reject_program_package_v21';
      const {error}=await db.rpc(rpc,payload);
      if(error)notice(error.message,true);
      else{
        notice(label==='verify'?'Payment verified and recorded in Finance.':label==='cancel'?'Package cancelled and all reserved slots released.':'Hold released.');
        await requests();await loadPackageNotifications();
        if(label==='verify'){
          try{await openConfirmationCard(r.id);}
          catch(err){notice('Payment verified, but confirmation card could not open: '+(err.message||err),true);}
        }
        if(typeof loadDay==='function')loadDay().catch(()=>{});
        if(typeof loadAdminCalendar==='function')loadAdminCalendar().catch(()=>{});
      }
      btn.disabled=false;
    };actions.append(btn);
  };
  if(r.status==='confirmed'&&r.payment_verification_status==='verified'){
    const view=document.createElement('button');view.type='button';view.className='primary';
    view.textContent='View Confirmation Card';
    view.onclick=async()=>{
      view.disabled=true;
      try{await openConfirmationCard(r.id);}
      catch(err){notice('Cannot generate confirmation card: '+(err.message||err),true);}
      finally{view.disabled=false;}
    };
    actions.append(view);
  }
  if(isPending){
    makeAction('Confirm Payment','verify',{p_request_id:r.id},
       'I checked the official MariBank account and confirmed the exact payment was received.',false);
    makeAction('Cancel — Invalid Payment','cancel',{p_request_id:r.id},
       'Cancel ALL package sessions and free their hours? Do this only if payment is invalid.',true);
  }else if(isActive){
    makeAction('Release Pending Hold','reject',{p_request_id:r.id,p_reason:'Released by admin'},null,false);
  }
  row.appendChild(actions);el.appendChild(row);
 }
 if(!data?.length)el.textContent='No package reservations yet.';
}
async function reschedules(){
 const {data,error}=await db.from('program_package_reschedule_requests')
  .select('id,package_request_id,session_number,requested_date,requested_start_hour,requested_end_hour,reason,status,created_at')
  .order('created_at',{ascending:false}).limit(50);
 if(error)throw error;
 const host=$('pkgV21Reschedules');host.innerHTML='';
 const pending=(data||[]).filter(r=>r.status==='pending');
 if(!pending.length){host.textContent='No pending reschedule requests.';return;}
 const ids=[...new Set(pending.map(r=>r.package_request_id))];
 const {data:packages,error:pe}=await db.from('program_package_requests')
  .select('id,reference,program_name,participants').in('id',ids);
 if(pe)throw pe;
 const refs=new Map((packages||[]).map(p=>[p.id,p]));
 pending.forEach(r=>{
   const p=refs.get(r.package_request_id)||{};
   const first=p.participants?.[0]||{};
   const card=document.createElement('article');card.className='pkg-v21-request';
   card.innerHTML='<div><strong>'+safe(p.reference||'Package')+' • '+safe(p.program_name||'Program')+'</strong><span>Session '+r.session_number+'</span></div>'+
    '<p>'+safe((first.first_name||'')+' '+(first.last_name||''))+' • New time: '+safe(r.requested_date)+' '+r.requested_start_hour+':00 – '+r.requested_end_hour+':00</p>'+
    '<p>Reason: '+safe(r.reason||'Not specified')+'</p>';
   const actions=document.createElement('div');actions.className='pkg-v21-admin-actions';
   for(const accept of [true,false]){
     const btn=document.createElement('button');btn.type='button';btn.className=accept?'primary':'soft-danger';
     btn.textContent=accept?'Approve & move scheduled session':'Decline request';
     btn.onclick=async()=>{
       if(accept&&!confirm('Approve reschedule? The existing booking will move to the new available date/time; there will be no new payment.'))return;
       const note=accept?'':prompt('Reason for declining this request:');
       if(!accept&&note===null)return;
       btn.disabled=true;
       const {error}=await db.rpc('admin_decide_program_reschedule_v21',
         {p_request_id:r.id,p_approve:accept,p_note:note});
       notice(error?error.message:accept?'Approved. Calendar updated without extra charge.':'Reschedule declined.',!!error);
       if(!error){await reschedules();if(typeof loadDay==='function')loadDay().catch(()=>{});if(typeof loadAdminCalendar==='function')loadAdminCalendar().catch(()=>{});}
       btn.disabled=false;
     };actions.appendChild(btn);
   }
   card.appendChild(actions);host.appendChild(card);
 });
}

// A per-administrator inbox in the existing bell dialog.
// Marking read removes only the badge/inbox entry for this admin; booking history remains.
const reminderDialog=$('adminReminderDialog'),reminderBox=$('adminReminderSummary');
const bellButton=$('adminNotificationBtn');
const badge=document.createElement('span');badge.id='pkgV22BellBadge';
badge.className='pkg-v22-bell-badge';badge.textContent='0';badge.hidden=true;
bellButton?.appendChild(badge);
const bellSection=document.createElement('section');
bellSection.id='pkgV22BellSection';bellSection.className='pkg-v22-bell-section';
bellSection.innerHTML='<h3>New Package Bookings <span id="pkgV22Unread">0</span></h3><p class="panel-note">Automatically booked after payment screenshot upload. Review MariBank payment in the Programs section.</p><div id="pkgV22BellItems">No new packages.</div>';
reminderBox?.appendChild(bellSection);
new MutationObserver(()=>{
  if(bellSection.parentElement!==reminderBox)reminderBox?.append(bellSection);
}).observe(reminderBox||document.body,{childList:true});
let notificationLoadVersion=0;
async function markPackageNotificationRead(notificationId,userId){
 const {error}=await db.from('program_booking_notification_reads')
   .upsert({notification_id:notificationId,user_id:userId},
     {onConflict:'notification_id,user_id',ignoreDuplicates:true});
 if(error)throw error;
}
async function loadPackageNotifications(){
 const version=++notificationLoadVersion;
 const {data:sessionInfo}=await db.auth.getSession();
 if(version!==notificationLoadVersion)return;
 const userId=sessionInfo?.session?.user?.id;if(!userId)return;
 const {data:items,error}=await db.from('program_booking_notifications')
  .select('id,request_id,created_at').order('created_at',{ascending:false}).limit(100);
 if(version!==notificationLoadVersion)return;
 if(error){notice('Package notifications: '+error.message,true);return;}
 if(!items?.length){
   badge.hidden=true;$('pkgV22Unread').textContent='0';
   $('pkgV22BellItems').textContent='No new package bookings.';return;
 }
 const ids=items.map(x=>x.id);
 const {data:reads,error:re}=await db.from('program_booking_notification_reads')
   .select('notification_id').in('notification_id',ids).eq('user_id',userId);
 if(version!==notificationLoadVersion)return;
 if(re){notice(re.message,true);return;}
 const readIds=new Set((reads||[]).map(x=>x.notification_id));
 const unread=items.filter(x=>!readIds.has(x.id));
 badge.textContent=String(unread.length);badge.hidden=unread.length===0;
 $('pkgV22Unread').textContent=String(unread.length);
 const el=$('pkgV22BellItems');
 if(!unread.length){el.textContent='All package notifications have been read.';return;}
 const {data:packages,error:pe}=await db.from('program_package_requests')
    .select('id,reference,program_name,price_amount,participants,status').in('id',unread.map(x=>x.request_id));
 if(version!==notificationLoadVersion)return;
 if(pe){notice(pe.message,true);return;}
 const fragment=document.createDocumentFragment();
 const byId=new Map((packages||[]).map(x=>[x.id,x]));
 for(const item of unread){
  const r=byId.get(item.request_id)||{};
  const player=r.participants?.[0]||{};
  const row=document.createElement('article');row.className='pkg-v22-bell-item';
  row.innerHTML='<b>'+safe(r.program_name||'Package Booking')+'</b>'+
     '<small>'+safe(r.reference||'')+' • '+safe((player.first_name||'')+' '+(player.last_name||''))+
     ' • '+money(r.price_amount||0)+' • '+new Date(item.created_at).toLocaleString('en-PH')+'</small>';
  const btn=document.createElement('button');btn.type='button';btn.className='secondary';btn.textContent='Mark Read';
  btn.onclick=async()=>{
    btn.disabled=true;
    try{await markPackageNotificationRead(item.id,userId);await loadPackageNotifications();}
    catch(err){notice(err.message||'Could not mark notification as read.',true);}
    btn.disabled=false;
  };
  const open=document.createElement('button');open.type='button';open.className='secondary';open.textContent='View Booking';
  open.onclick=async()=>{
    open.disabled=true;
    try{
      // Viewing a booking is acknowledgment: clear it for this admin automatically.
      await markPackageNotificationRead(item.id,userId);
      await requests();
      await loadPackageNotifications();
      reminderDialog?.close();
      const target=document.querySelector('#pkgV21Requests [data-package-request-id="'+item.request_id+'"]')
        ||$('pkgV21Admin');
      target?.scrollIntoView({behavior:'smooth',block:'start'});
      target?.classList.add('pkg-v22-booking-opened');
      setTimeout(()=>target?.classList.remove('pkg-v22-booking-opened'),2400);
    }catch(err){notice('Could not open this booking: '+(err.message||err),true);}
    finally{open.disabled=false;}
  };
  row.append(btn,open);fragment.append(row);
 }
 if(version===notificationLoadVersion)el.replaceChildren(fragment);
}
bellButton?.addEventListener('click',()=>setTimeout(loadPackageNotifications,0));
$('refreshAdminReminder')?.addEventListener('click',()=>setTimeout(loadPackageNotifications,0));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')loadPackageNotifications().catch(()=>{});});
setInterval(()=>loadPackageNotifications().catch(()=>{}),30000);
async function refresh(){
 if(!await authorized()){notice('Admin login is required to manage package bookings.');return;}
 try{await Promise.all([settings(),programs(),requests(),reschedules(),loadPackageNotifications()]);notice('Package management is up to date.');}
 catch(e){notice('Package database setup is not yet accessible: '+(e.message||e),true);}
}
$('pkgV21Refresh').onclick=refresh;
db.auth.onAuthStateChange((_event,session)=>{if(session)setTimeout(refresh,250);});
setTimeout(refresh,700);
})();
