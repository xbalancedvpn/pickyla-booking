/* Pickyla v21 admin package setup and verification. Loaded only after backend migration. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₱'+Number(n||0).toLocaleString('en-PH',{maximumFractionDigits:2});
const hub=$('programHubSection');if(!hub)return;
const wrap=document.createElement('section');wrap.id='pkgV21Admin';wrap.className='panel pkg-v21-admin';
wrap.innerHTML='<div class="panel-head"><div><span class="eyebrow">PROGRAM PACKAGE CHECKOUT</span><h2>Online package bookings</h2><p class="panel-note">Configure package prices, bank QR, and manual payment verification.</p></div><button id="pkgV21Refresh" class="secondary">Refresh</button></div>'+
'<p id="pkgV21AdminNotice" class="panel-note"></p><details class="pkg-v21-admin-settings"><summary><strong>Bank QR & Messenger settings</strong></summary>'+
'<form id="pkgV21BankForm" class="pkg-v21-admin-grid">'+
'<label>Bank name<input name="bank_name" maxlength="120" required></label><label>Account name<input name="account_name" maxlength="140" required></label>'+
'<label>Account number<input name="account_number" maxlength="100"></label><label>HTTPS QR image URL<input type="url" name="qr_image_url" required placeholder="https://..."></label>'+
'<label>Messenger Page URL<input type="url" name="messenger_url" required placeholder="https://m.me/..."></label>'+
'<label class="pkg-v21-switch"><input type="checkbox" name="enabled"> Enable checkout</label><button class="primary" type="submit">Save bank setup</button></form></details>'+
'<details class="pkg-v21-admin-settings"><summary><strong>Program format & participant capacity</strong></summary><div id="pkgV21Programs">Loading…</div></details>'+
'<h3>Reservations & bank verification</h3><div id="pkgV21Requests">Loading…</div><h3>Session reschedule requests</h3><div id="pkgV21Reschedules">Loading…</div>';
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
async function requests(){
 const {data,error}=await db.from('program_package_requests')
  .select('id,reference,program_name,format,participant_count,participants,price_amount,status,created_at,hold_until')
  .order('created_at',{ascending:false}).limit(60);
 if(error)throw error;
 const el=$('pkgV21Requests');el.innerHTML='';
 (data||[]).forEach(r=>{
  const client=r.participants?.[0]||{},active=['held','payment_reported'].includes(r.status)&&new Date(r.hold_until)>new Date();
  const row=document.createElement('article');row.className='pkg-v21-request';
  row.innerHTML='<div><strong>'+safe(r.reference)+' • '+safe(r.program_name)+'</strong><span>'+safe(r.status)+'</span></div>'+
    '<p>'+safe([client.first_name,client.last_name].filter(Boolean).join(' '))+' • '+safe(client.contact||'No contact')+' • '+r.participant_count+' player(s)</p>'+
    '<p><strong>'+money(r.price_amount)+'</strong> • Hold until '+new Date(r.hold_until).toLocaleString('en-PH')+'</p>';
  const actions=document.createElement('div');actions.className='pkg-v21-admin-actions';
  for(const action of (r.status==='payment_reported'&&active?['confirm','reject']:active?['reject']:[])){
   const btn=document.createElement('button');btn.type='button';btn.className=action==='confirm'?'primary':'soft-danger';
   btn.textContent=action==='confirm'?'Verify bank payment & confirm sessions':'Reject / release slots';
   btn.onclick=async()=>{
    const reason=action==='reject'?prompt('Reason for rejecting/releasing reservation:'):null;
    if(action==='reject'&&reason===null)return;
    if(action==='confirm'&&!confirm('Bank transfer verified in the official account? This will create all sessions and record the package payment once.'))return;
    btn.disabled=true;
    const args=action==='confirm'?{p_request_id:r.id}:{p_request_id:r.id,p_reason:reason};
    const {error}=await db.rpc(action==='confirm'?'admin_confirm_program_package_v21':'admin_reject_program_package_v21',args);
    notice(error?error.message:action==='confirm'?'Package confirmed and single upfront payment recorded.':'Reservation released.',!!error);
    if(!error){await requests();if(typeof loadDay==='function')loadDay().catch(()=>{});if(typeof loadAdminCalendar==='function')loadAdminCalendar().catch(()=>{});}
    btn.disabled=false;
   };actions.appendChild(btn);
  }
  row.appendChild(actions);el.appendChild(row);
 });
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
async function refresh(){
 if(!await authorized()){notice('Admin login is required to manage package bookings.');return;}
 try{await Promise.all([settings(),programs(),requests(),reschedules()]);notice('Package management is up to date.');}
 catch(e){notice('Package database setup is not yet accessible: '+(e.message||e),true);}
}
$('pkgV21Refresh').onclick=refresh;
db.auth.onAuthStateChange((_event,session)=>{if(session)setTimeout(refresh,250);});
setTimeout(refresh,700);
})();
