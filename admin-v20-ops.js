// PICKYLA v20 Batch 1 - Coach Kyle operational workflow adoption
(function(){
  const byId=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>'₱'+Number(v||0).toLocaleString('en-PH',{maximumFractionDigits:2});
  const pad=n=>String(n).padStart(2,'0');
  const todayKey=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
  const hour=h=>{h=Number(h);if(h===24)return '12:00 MN';return (h%12||12)+':00 '+(h<12?'AM':'PM');};
  const cancelled=b=>b.status==='cancelled'||['client_cancelled','coach_cancelled'].includes(b.session_status);
  const state={rows:[],paid:new Map(),loading:null,expanded:{upcoming:false,past:false,payment:false,completed:false,cancelled:false}};
  const limits={upcoming:3,past:3,payment:3,completed:3,cancelled:3};

  function adminActive(){const v=byId('adminView');return !!v&&!v.classList.contains('hidden');}
  function paidFor(b){return Number(state.paid.get(String(b.id)) ?? b.amount_paid ?? 0);}
  function paymentInfo(b){
    const total=Number(b.total_amount||0),paid=paidFor(b),balance=Math.max(0,total-paid);
    return {total,paid,balance,status:balance<=0.001?'Paid':paid>0?'Partial':'Unpaid'};
  }
  function courtOf(b){
    const direct=String(b?.court_name||'').trim();
    if(direct&&!/^(court not decided yet|not decided yet|not specified|to be confirmed|tbd)$/i.test(direct))return direct;
    const m=String(b?.notes||'').match(/^Court:\s*(.+)$/mi);
    const fromNotes=String(m?.[1]||'').trim();
    return fromNotes||'Court not decided yet';
  }
  function buckets(){
    const today=todayKey();
    const active=state.rows.filter(b=>!cancelled(b));
    const scheduled=active.filter(b=>(b.session_status||'scheduled')==='scheduled');
    const upcoming=scheduled.filter(b=>String(b.session_date)>today)
      .sort((a,b)=>String(a.session_date).localeCompare(String(b.session_date))||Number(a.start_hour)-Number(b.start_hour));
    const past=scheduled.filter(b=>String(b.session_date)<today)
      .sort((a,b)=>String(b.session_date).localeCompare(String(a.session_date))||Number(a.start_hour)-Number(b.start_hour));
    const completed=active.filter(b=>b.session_status==='completed');
    const payment=completed.filter(b=>paymentInfo(b).balance>0.001)
      .sort((a,b)=>String(b.session_closed_at||b.session_date).localeCompare(String(a.session_closed_at||a.session_date)));
    const settled=completed.filter(b=>paymentInfo(b).balance<=0.001)
      .sort((a,b)=>String(b.session_closed_at||b.session_date).localeCompare(String(a.session_closed_at||a.session_date)));
    const cancelledRows=state.rows.filter(cancelled)
      .sort((a,b)=>String(b.session_closed_at||b.session_date).localeCompare(String(a.session_closed_at||a.session_date))||Number(b.start_hour)-Number(a.start_hour));
    return {upcoming,past,payment,completed:settled,cancelled:cancelledRows};
  }
  function emptyText(kind){
    return {
      upcoming:'No upcoming confirmed bookings.',
      past:'No past sessions need completion.',
      payment:'No completed sessions need payment follow-up.',
      completed:'No fully settled completed sessions yet.',
      cancelled:'No cancelled bookings yet.'
    }[kind];
  }
  function cardHtml(b,kind){
    const p=paymentInfo(b);
    const date=new Date(String(b.session_date)+'T12:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'});
    const court=courtOf(b);
    const stateLabel=kind==='past'?'Needs Closing':kind==='payment'?'Completed • Balance Due':kind==='completed'?'Completed':kind==='cancelled'?(b.session_status==='client_cancelled'?'Player Cancelled':b.session_status==='coach_cancelled'?'Coach Cancelled':'Cancelled'):'Scheduled';
    let actions='';
    if(b.client_id)actions+='<button type="button" data-v20-act="profile" data-id="'+esc(b.id)+'">Player Profile</button>';
    actions+='<button type="button" data-v20-act="card" data-id="'+esc(b.id)+'">Confirmation Card</button>';
    if(kind==='upcoming'||kind==='past')actions+='<button type="button" data-v20-act="edit" data-id="'+esc(b.id)+'">Edit Booking</button>';
    if(kind==='upcoming')actions+='<button type="button" data-v20-act="court" data-id="'+esc(b.id)+'">'+(court==='Court not decided yet'?'Set Court':'Change Court')+'</button>';
    if(kind!=='cancelled'&&p.balance>0.001&&!b.client_program_id)actions+='<button type="button" class="primary" data-v20-act="pay" data-id="'+esc(b.id)+'">'+(kind==='payment'?'Record Remaining Payment':'Record Payment')+'</button>';
    if(kind==='completed'||kind==='payment'){
      const excluded=String(b.session_outcome_note||'').includes('[FINANCE_EXCLUDE]');
      actions+='<button type="button" class="v20-finance-exclude '+(excluded?'active':'')+'" data-v20-act="finance" data-id="'+esc(b.id)+'">'+(excluded?'Include in Income':'Exclude from Income')+'</button>';
    }
    if(kind==='upcoming'||kind==='past'){
      actions+='<button type="button" class="v20-complete" data-v20-act="status" data-status="completed" data-id="'+esc(b.id)+'">Mark Completed</button>';
      if(kind==='past')actions+='<button type="button" data-v20-act="status" data-status="no_show" data-id="'+esc(b.id)+'">No Show</button>';
      actions+='<button type="button" class="v20-cancel" data-v20-act="status" data-status="client_cancelled" data-id="'+esc(b.id)+'">Player Cancelled</button>';
      actions+='<button type="button" class="v20-cancel" data-v20-act="status" data-status="coach_cancelled" data-id="'+esc(b.id)+'">Coach Cancelled</button>';
    }
    return '<article class="v20-ops-card">'+
      '<div class="v20-ops-card-top"><div><span class="v20-ops-date">'+esc(date)+' • '+hour(b.start_hour)+'–'+hour(b.end_hour)+'</span>'+
      '<h3>'+esc(b.client_name||'Player')+'</h3><p>'+Number(b.participant_count||1)+' player'+(Number(b.participant_count||1)===1?'':'s')+
      ' • '+esc(b.coaching_type||'Coaching')+'<br><strong>Court:</strong> '+esc(court)+'</p></div>'+
      '<span class="v20-ops-state '+kind+'">'+esc(stateLabel)+'</span></div>'+
      '<div class="v20-ops-money"><strong>'+money(p.total)+'</strong><span>'+esc(p.status)+' • Collected '+money(p.paid)+' • Balance '+money(p.balance)+'</span></div>'+
      '<div class="v20-ops-actions">'+actions+'</div></article>';
  }
  let courtTarget=null;
  function ensureCourtModal(){
    let modal=byId('v20CourtModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='v20CourtModal';
    modal.className='v20-court-modal hidden';
    modal.innerHTML='<div class="v20-court-backdrop" data-court-close></div>'+
      '<form id="v20CourtForm" class="v20-court-card" novalidate>'+
        '<button type="button" class="v20-court-x" data-court-close aria-label="Close">×</button>'+
        '<span class="eyebrow">BOOKING COURT</span>'+
        '<h2 id="v20CourtTitle">Set Court</h2>'+
        '<p id="v20CourtBookingMeta" class="panel-note"></p>'+
        '<label>Court<select id="v20CourtSelect">'+
          '<option value="">Court not decided yet</option>'+
          '<option value="NANOMOLY">NANOMOLY</option>'+
          '<option value="DINK VALLEY">DINK VALLEY</option>'+
          '<option value="HC SANTIAGO">HC SANTIAGO</option>'+
          '<option value="CASA PLAY">CASA PLAY</option>'+
          '<option value="COURTYARD">COURTYARD</option>'+
          '<option value="OTHERS">OTHERS</option>'+
        '</select></label>'+
        '<label id="v20CourtOtherWrap" class="hidden">Other court<input id="v20CourtOther" maxlength="120" placeholder="Enter court name"></label>'+
        '<div id="v20CourtError" class="v20-court-error hidden"></div>'+
        '<div class="v20-court-actions"><button type="button" class="secondary" data-court-close>Cancel</button><button type="submit" class="primary">Save Court</button></div>'+
      '</form>';
    document.body.appendChild(modal);

    const select=byId('v20CourtSelect');
    select.addEventListener('change',()=>{
      byId('v20CourtOtherWrap').classList.toggle('hidden',select.value!=='OTHERS');
      byId('v20CourtError').classList.add('hidden');
    });
    modal.querySelectorAll('[data-court-close]').forEach(x=>x.addEventListener('click',()=>closeCourtModal()));
    byId('v20CourtForm').addEventListener('submit',saveCourtModal);
    return modal;
  }
  function closeCourtModal(){
    const modal=byId('v20CourtModal');if(!modal)return;
    modal.classList.add('hidden');
    document.body.classList.remove('v20-modal-open');
    courtTarget=null;
  }
  function openCourtModal(b){
    const modal=ensureCourtModal(),select=byId('v20CourtSelect'),other=byId('v20CourtOther');
    courtTarget=b;
    const current=courtOf(b)==='Court not decided yet'?'':courtOf(b);
    const optionValues=[...select.options].map(o=>o.value);
    if(!current){select.value='';other.value='';}
    else if(optionValues.includes(current)){select.value=current;other.value='';}
    else{select.value='OTHERS';other.value=current;}
    byId('v20CourtOtherWrap').classList.toggle('hidden',select.value!=='OTHERS');
    byId('v20CourtError').classList.add('hidden');
    byId('v20CourtTitle').textContent=current?'Change Court':'Set Court';
    byId('v20CourtBookingMeta').textContent=(b.client_name||'Player')+' • '+String(b.session_date||'')+' • '+hour(b.start_hour)+'–'+hour(b.end_hour);
    modal.classList.remove('hidden');
    document.body.classList.add('v20-modal-open');
    setTimeout(()=>select.focus(),0);
  }
  async function saveCourtModal(e){
    e.preventDefault();
    if(!courtTarget)return;
    const select=byId('v20CourtSelect'),other=byId('v20CourtOther'),errorBox=byId('v20CourtError');
    let court=select.value;
    if(court==='OTHERS')court=String(other.value||'').trim();
    if(select.value==='OTHERS'&&!court){
      errorBox.textContent='Enter the court name.';
      errorBox.classList.remove('hidden');
      other.focus();
      return;
    }
    const save=e.submitter,old=save.textContent;
    save.disabled=true;save.textContent='Saving…';errorBox.classList.add('hidden');
    try{
      const {data:savedNotes,error}=await db.rpc('set_booking_court',{p_booking_id:courtTarget.id,p_court:court||null});
      if(error)throw error;
      const saved=String(savedNotes||'');
      const expected=court?String(court).trim():'';
      const parsed=String(saved.match(/^Court:\s*(.+)$/mi)?.[1]||'').trim();
      if(expected&&parsed.toLowerCase()!==expected.toLowerCase())throw new Error('Court change was not confirmed by the database.');
      if(!expected&&parsed)throw new Error('Court removal was not confirmed by the database.');

      const local=state.rows.find(x=>String(x.id)===String(courtTarget.id));
      if(local)local.notes=saved||null;
      courtTarget.notes=saved||null;
      closeCourtModal();
      renderAll();
      if(typeof toast==='function')toast(expected?'Court updated':'Court cleared');
      setTimeout(()=>loadOps(true),250);
    }catch(err){
      console.error('Pickyla v20 court save failed:',err);
      errorBox.textContent=err?.message||'Could not update court.';
      errorBox.classList.remove('hidden');
    }finally{
      save.disabled=false;save.textContent=old;
    }
  }


  let editTarget=null;
  const editHourly=(n,mode)=>mode==='group'?Number(n)*250:400+Math.max(0,Number(n)-1)*200;
  function editModeFor(b){return /group drills/i.test(String(b?.coaching_type||''))||Number(b?.participant_count||1)>=4?'group':'private';}
  function fillHourSelect(select,min,max,current){
    select.innerHTML='';
    for(let h=min;h<=max;h++){
      const o=document.createElement('option');o.value=String(h);o.textContent=hour(h);select.appendChild(o);
    }
    select.value=String(current);
  }
  function editSyncPax(){
    const mode=byId('v20EditMode')?.value||'private',sel=byId('v20EditPax');if(!sel)return;
    const min=mode==='group'?4:1,max=mode==='group'?12:3,cur=Number(sel.value||editTarget?.participant_count||min);
    sel.innerHTML='';
    for(let n=min;n<=max;n++){const o=document.createElement('option');o.value=String(n);o.textContent=n+' player'+(n===1?'':'s');sel.appendChild(o);}
    sel.value=String(Math.min(max,Math.max(min,cur)));
    editRecalc();
  }
  function editRecalc(){
    if(!editTarget)return;
    const mode=byId('v20EditMode')?.value||'private',n=Number(byId('v20EditPax')?.value||1),start=Number(byId('v20EditStart')?.value||8),end=Number(byId('v20EditEnd')?.value||start+1),rateMode=byId('v20EditRateMode')?.value||'standard',rate=byId('v20EditRate');
    if(rateMode==='standard'){rate.value=editHourly(n,mode).toFixed(2);rate.readOnly=true;}else rate.readOnly=false;
    const hourlyRate=Number(rate.value||0),hrs=Math.max(1,end-start),total=hourlyRate*hrs,paid=paidFor(editTarget),balance=Math.max(0,total-paid);
    byId('v20EditTotal').textContent=money(total);
    byId('v20EditCalc').textContent=hrs+' hr × '+money(hourlyRate)+'/hr';
    byId('v20EditPaid').textContent='Collected '+money(paid)+' • New balance '+money(balance);
    const err=byId('v20EditError');if(err)err.classList.add('hidden');
  }
  function editSyncEnd(){
    const start=Number(byId('v20EditStart')?.value||8),end=byId('v20EditEnd'),current=Math.max(start+1,Number(end?.value||start+1));
    if(end)fillHourSelect(end,start+1,24,Math.min(24,current));
    editRecalc();
  }
  function ensureEditModal(){
    let modal=byId('v20EditBookingModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='v20EditBookingModal';modal.className='v20-edit-modal hidden';
    modal.innerHTML='<div class="v20-edit-backdrop" data-edit-close></div>'+
      '<form id="v20EditBookingForm" class="v20-edit-card" novalidate>'+
        '<button type="button" class="v20-edit-x" data-edit-close aria-label="Close">×</button>'+
        '<span class="eyebrow">EDIT CONFIRMED BOOKING</span><h2>Edit booking</h2><p id="v20EditMeta" class="panel-note"></p>'+
        '<div class="v20-edit-grid">'+
          '<label>Date<input id="v20EditDate" type="date" data-date-title="Booking date"></label>'+
          '<label>Coaching type<select id="v20EditMode"><option value="private">Private Coaching</option><option value="group">Group Drills Training</option></select></label>'+
          '<label>Start time<select id="v20EditStart"></select></label>'+
          '<label>End time<select id="v20EditEnd"></select></label>'+
          '<label>Players<select id="v20EditPax"></select></label>'+
          '<label>Court<select id="v20EditCourt"><option value="">Court not decided yet</option><option>NANOMOLY</option><option>DINK VALLEY</option><option>HC SANTIAGO</option><option>CASA PLAY</option><option>COURTYARD</option><option value="OTHERS">OTHERS</option></select></label>'+
          '<label id="v20EditCourtOtherWrap" class="hidden v20-edit-full">Other court<input id="v20EditCourtOther" maxlength="120" placeholder="Enter court name"></label>'+
          '<label>Rate type<select id="v20EditRateMode"><option value="standard">Standard coaching rate</option><option value="custom">Custom hourly rate</option></select></label>'+
          '<label>Hourly coaching rate<input id="v20EditRate" type="number" min="0" step="50"></label>'+
        '</div>'+
        '<div class="v20-edit-summary"><span>Updated coaching fee</span><strong id="v20EditTotal">₱0</strong><small id="v20EditCalc"></small><small id="v20EditPaid"></small></div>'+
        '<p class="v20-edit-note">Saving updates the booking schedule, finance totals, weekly/admin schedule, and future confirmation cards. Existing payments are preserved.</p>'+
        '<div id="v20EditError" class="v20-edit-error hidden"></div>'+
        '<div class="v20-edit-actions"><button type="button" class="secondary" data-edit-close>Cancel</button><button id="v20EditSave" type="submit" class="primary">Save Changes</button></div>'+
      '</form>';
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-edit-close]').forEach(x=>x.addEventListener('click',closeEditModal));
    byId('v20EditMode').addEventListener('change',editSyncPax);
    byId('v20EditPax').addEventListener('change',editRecalc);
    byId('v20EditStart').addEventListener('change',editSyncEnd);
    byId('v20EditEnd').addEventListener('change',editRecalc);
    byId('v20EditRateMode').addEventListener('change',editRecalc);
    byId('v20EditRate').addEventListener('input',editRecalc);
    byId('v20EditCourt').addEventListener('change',()=>{
      byId('v20EditCourtOtherWrap').classList.toggle('hidden',byId('v20EditCourt').value!=='OTHERS');
    });
    byId('v20EditBookingForm').addEventListener('submit',saveEditModal);
    window.pickylaV20DatePicker?.scan?.();
    return modal;
  }
  function closeEditModal(){
    const modal=byId('v20EditBookingModal');if(modal)modal.classList.add('hidden');
    document.body.classList.remove('v20-modal-open');editTarget=null;
  }
  async function openEditModal(b){
    editTarget=b;
    const modal=ensureEditModal(),mode=editModeFor(b),court=courtOf(b),select=byId('v20EditCourt'),other=byId('v20EditCourtOther');
    byId('v20EditMeta').textContent=(b.client_name||'Player')+' • '+String(b.session_date||'')+' • '+hour(b.start_hour)+'–'+hour(b.end_hour);
    byId('v20EditDate').value=String(b.session_date||'');
    byId('v20EditMode').value=mode;
    fillHourSelect(byId('v20EditStart'),8,23,Number(b.start_hour||8));
    fillHourSelect(byId('v20EditEnd'),Number(b.start_hour||8)+1,24,Number(b.end_hour||Number(b.start_hour||8)+1));
    editSyncPax();byId('v20EditPax').value=String(Number(b.participant_count||1));
    const known=[...select.options].map(o=>o.value);
    if(court==='Court not decided yet'){select.value='';other.value='';}
    else if(known.includes(court)){select.value=court;other.value='';}
    else{select.value='OTHERS';other.value=court;}
    byId('v20EditCourtOtherWrap').classList.toggle('hidden',select.value!=='OTHERS');
    byId('v20EditRateMode').value=b.rate_mode==='custom'?'custom':'standard';
    byId('v20EditRate').value=Number(b.hourly_coaching_rate??b.rate_per_person??editHourly(b.participant_count,mode)).toFixed(2);
    editRecalc();
    modal.classList.remove('hidden');document.body.classList.add('v20-modal-open');
    setTimeout(()=>byId('v20EditDate')?.focus(),0);
  }
  async function saveEditModal(e){
    e.preventDefault();if(!editTarget)return;
    const save=byId('v20EditSave'),old=save.textContent,err=byId('v20EditError');
    const date=byId('v20EditDate').value,start=Number(byId('v20EditStart').value),end=Number(byId('v20EditEnd').value),n=Number(byId('v20EditPax').value),mode=byId('v20EditMode').value,rateMode=byId('v20EditRateMode').value,rate=Number(byId('v20EditRate').value||0),total=(end-start)*rate;
    let court=byId('v20EditCourt').value;if(court==='OTHERS')court=String(byId('v20EditCourtOther').value||'').trim();
    if(!date||!start||!end||end<=start){err.textContent='Choose a valid date and time range.';err.classList.remove('hidden');return;}
    if(byId('v20EditCourt').value==='OTHERS'&&!court){err.textContent='Enter the court name.';err.classList.remove('hidden');return;}
    save.disabled=true;save.textContent='Saving…';err.classList.add('hidden');
    try{
      const {data,error}=await db.rpc('edit_confirmed_booking',{
        p_booking_id:editTarget.id,p_session_date:date,p_start_hour:start,p_end_hour:end,p_participant_count:n,
        p_coaching_type:mode==='group'?'Group Drills Training':'Private Coaching',p_rate_mode:rateMode,
        p_hourly_rate:rate,p_total_amount:total,p_court:court||null
      });
      if(error)throw error;
      closeEditModal();
      if(typeof toast==='function')toast('Booking updated');
      await loadOps(true);
      const jobs=[];
      if(typeof loadReports==='function')jobs.push(loadReports());
      if(typeof loadTodayCommandCenter==='function')jobs.push(loadTodayCommandCenter());
      if(typeof loadPaymentDashboard==='function')jobs.push(loadPaymentDashboard());
      if(typeof loadCollectionAlerts==='function')jobs.push(loadCollectionAlerts());
      if(typeof loadAdminCalendar==='function')jobs.push(loadAdminCalendar());
      if(typeof loadBookingAvailability==='function')jobs.push(loadBookingAvailability());
      if(typeof loadDay==='function')jobs.push(loadDay());
      await Promise.allSettled(jobs);
      document.dispatchEvent(new CustomEvent('coach:data-changed',{detail:{bookingId:editTarget?.id}}));
    }catch(x){
      console.error('Pickyla booking edit failed:',x);
      err.textContent=x?.message||'Could not update this booking.';err.classList.remove('hidden');
    }finally{save.disabled=false;save.textContent=old;}
  }

  function bindActions(list,rows){
    const map=new Map(rows.map(b=>[String(b.id),b]));
    list.querySelectorAll('[data-v20-act]').forEach(btn=>{
      btn.onclick=async()=>{
        const b=map.get(String(btn.dataset.id));if(!b)return;
        const act=btn.dataset.v20Act;
        if(act==='profile'){
          if(typeof openV17Client==='function')await openV17Client(b.client_id);
          return;
        }
        if(act==='edit'){openEditModal(b);return;}
        if(act==='card'){
          if(typeof openConfirmationCard==='function')await openConfirmationCard({...b,amount_paid:paidFor(b)});
          return;
        }
        if(act==='pay'){
          if(typeof updatePayment==='function')updatePayment({...b,amount_paid:paidFor(b)});
          return;
        }
        if(act==='finance'){
          const marker='[FINANCE_EXCLUDE]';
          const current=String(b.session_outcome_note||'');
          const excluded=current.includes(marker);
          const clean=current.replace(/\s*\[FINANCE_EXCLUDE\]\s*/g,' ').trim();
          const next=excluded?(clean||null):((clean?clean+'\n':'')+marker);
          const {error}=await db.from('bookings').update({session_outcome_note:next}).eq('id',b.id);
          if(error)return alert('Could not update income status.\n'+error.message);
          b.session_outcome_note=next;
          renderAll();
          if(typeof loadReports==='function')await loadReports();
          if(typeof toast==='function')toast(excluded?'Included in income again':'Excluded from income');
          return;
        }
        if(act==='status'&&typeof setV17SessionStatus==='function'){
          await setV17SessionStatus({...b,amount_paid:paidFor(b)},btn.dataset.status);
          await loadOps(true);
          if(typeof loadReports==='function')await loadReports();
        }
      };
    });
  }
  function renderList(kind,rows,listId,countId,toggleId){
    const list=byId(listId),count=byId(countId),toggle=byId(toggleId);if(!list)return;
    if(count)count.textContent=String(rows.length);
    const shown=state.expanded[kind]?rows:rows.slice(0,limits[kind]);
    list.innerHTML=shown.length?shown.map(b=>cardHtml(b,kind)).join(''):'<div class="empty">'+emptyText(kind)+'</div>';
    if(toggle){
      toggle.hidden=rows.length<=limits[kind];
      toggle.textContent=state.expanded[kind]?'Show Less':'Show All ('+rows.length+')';
      toggle.setAttribute('aria-expanded',String(state.expanded[kind]));
    }
    bindActions(list,shown);
  }
  function renderAll(){
    const b=buckets();
    renderList('upcoming',b.upcoming,'v20UpcomingList','v20UpcomingCount','v20UpcomingToggle');
    renderList('past',b.past,'v20PastList','v20PastCount','v20PastToggle');
    renderList('payment',b.payment,'v20PaymentList','v20PaymentCount','v20PaymentToggle');
    renderList('completed',b.completed,'v20CompletedList','v20CompletedCount','v20CompletedToggle');
    renderList('cancelled',b.cancelled,'v20CancelledList','v20CancelledCount','v20CancelledToggle');
  }
  async function loadOps(force=false){
    if(!adminActive())return;
    if(state.loading&&!force)return state.loading;
    state.loading=(async()=>{
      const {data,error}=await db.from('bookings').select('*').order('session_date',{ascending:false}).order('start_hour',{ascending:true}).limit(700);
      if(error)throw error;
      state.rows=data||[];
      state.paid=new Map();
      const ids=state.rows.map(x=>x.id);
      if(ids.length){
        const {data:p,error:pe}=await db.from('booking_payments').select('booking_id,amount').in('booking_id',ids);
        if(pe)throw pe;
        (p||[]).forEach(x=>{
          const key=String(x.booking_id);
          state.paid.set(key,(state.paid.get(key)||0)+Number(x.amount||0));
        });
      }
      renderAll();
    })();
    try{return await state.loading;}
    catch(e){
      console.error('Pickyla v20 operations load failed:',e);
      ['v20UpcomingList','v20PastList','v20PaymentList','v20CompletedList','v20CancelledList'].forEach(id=>{
        const el=byId(id);if(el)el.innerHTML='<div class="empty">'+esc(e.message||'Could not load operations data.')+'</div>';
      });
    }finally{state.loading=null;}
  }
  function wire(){
    ensureCourtModal();
    document.addEventListener('click',async e=>{
      const btn=e.target.closest?.('[data-v20-act="court"]');
      if(!btn)return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const id=String(btn.dataset.id||'');
      let b=state.rows.find(x=>String(x.id)===id);
      if(!b){
        const {data,error}=await db.from('bookings').select('*').eq('id',id).maybeSingle();
        if(error)return;
        b=data;
      }
      if(b)openCourtModal(b);
    },true);
    [['upcoming','v20UpcomingToggle','v20UpcomingSection'],['past','v20PastToggle','v20PastSection'],['payment','v20PaymentToggle','v20PaymentSection'],['completed','v20CompletedToggle','v20CompletedSection'],['cancelled','v20CancelledToggle','v20CancelledSection']].forEach(([kind,id,sectionId])=>{
      const btn=byId(id);if(btn)btn.onclick=()=>{
        state.expanded[kind]=!state.expanded[kind];
        renderAll();
        requestAnimationFrame(()=>byId(sectionId)?.scrollIntoView({behavior:'smooth',block:'start'}));
      };
    });
    byId('collectionAlertSection')?.classList.add('v20-ops-legacy-hidden');
    byId('paymentForm')?.addEventListener('submit',()=>setTimeout(()=>loadOps(true),900));
    byId('quickBookingForm')?.addEventListener('submit',()=>setTimeout(()=>loadOps(true),1100));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden&&adminActive())loadOps(true);});
  }
  async function boot(){
    wire();
    try{
      const {data:{session}}=await db.auth.getSession();
      if(session&&adminActive())await loadOps(true);
    }catch(e){console.warn('Pickyla v20 operations boot:',e);}
    db.auth.onAuthStateChange((event,session)=>{
      if(session&&(event==='SIGNED_IN'||event==='INITIAL_SESSION'))setTimeout(()=>loadOps(true),450);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.pickylaV20Ops={refresh:()=>loadOps(true),editBooking:async bookingOrId=>{
    let b=bookingOrId;
    if(typeof bookingOrId==='string'){
      b=state.rows.find(x=>String(x.id)===String(bookingOrId));
      if(!b){const {data}=await db.from('bookings').select('*').eq('id',bookingOrId).maybeSingle();b=data;}
    }
    if(b)openEditModal(b);
  }};
})();