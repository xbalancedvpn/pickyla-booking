// PICKYLA v20 Batch 1 - Coach Kyle operational workflow adoption
(function(){
  const byId=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>'₱'+Number(v||0).toLocaleString('en-PH',{maximumFractionDigits:2});
  const pad=n=>String(n).padStart(2,'0');
  const todayKey=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
  const hour=h=>{h=Number(h);if(h===24)return '12:00 MN';return (h%12||12)+':00 '+(h<12?'AM':'PM');};
  const cancelled=b=>b.status==='cancelled'||['client_cancelled','coach_cancelled'].includes(b.session_status);
  const state={rows:[],paid:new Map(),loading:null,expanded:{upcoming:false,past:false,payment:false,completed:false}};
  const limits={upcoming:3,past:3,payment:3,completed:3};

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
    return {upcoming,past,payment,completed:settled};
  }
  function emptyText(kind){
    return {
      upcoming:'No upcoming confirmed bookings.',
      past:'No past sessions need completion.',
      payment:'No completed sessions need payment follow-up.',
      completed:'No fully settled completed sessions yet.'
    }[kind];
  }
  function cardHtml(b,kind){
    const p=paymentInfo(b);
    const date=new Date(String(b.session_date)+'T12:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'});
    const court=courtOf(b);
    const stateLabel=kind==='past'?'Needs Closing':kind==='payment'?'Completed • Balance Due':kind==='completed'?'Completed':'Scheduled';
    let actions='';
    if(b.client_id)actions+='<button type="button" data-v20-act="profile" data-id="'+esc(b.id)+'">Player Profile</button>';
    actions+='<button type="button" data-v20-act="card" data-id="'+esc(b.id)+'">Confirmation Card</button>';
    if(kind==='upcoming')actions+='<button type="button" data-v20-act="court" data-id="'+esc(b.id)+'">'+(court==='Court not decided yet'?'Set Court':'Change Court')+'</button>';
    if(p.balance>0.001&&!b.client_program_id)actions+='<button type="button" class="primary" data-v20-act="pay" data-id="'+esc(b.id)+'">'+(kind==='payment'?'Record Remaining Payment':'Record Payment')+'</button>';
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
    const strip=window.pickylaV20Court?.stripCourtLine||((t)=>String(t||'').replace(/^Court:\s*.+(?:\r?\n)?/mi,'').trim());
    const base=strip(courtTarget.notes||'');
    const notes=court?('Court: '+court+(base?'\n'+base:'')):base;
    const save=e.submitter,old=save.textContent;
    save.disabled=true;save.textContent='Saving…';errorBox.classList.add('hidden');
    try{
      const {data:saved,error}=await db.from('bookings').update({notes}).eq('id',courtTarget.id).select('id,notes').maybeSingle();
      if(error)throw error;
      if(!saved||String(saved.notes||'')!==String(notes||''))throw new Error('Court change was not confirmed by the database.');

      const local=state.rows.find(x=>String(x.id)===String(courtTarget.id));
      if(local)local.notes=saved.notes;
      closeCourtModal();
      renderAll();
      await loadOps(true);
    }catch(err){
      errorBox.textContent=err.message||'Could not update court.';
      errorBox.classList.remove('hidden');
    }finally{
      save.disabled=false;save.textContent=old;
    }
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
        if(act==='card'){
          if(typeof openConfirmationCard==='function')await openConfirmationCard({...b,amount_paid:paidFor(b)});
          return;
        }
        if(act==='pay'){
          if(typeof updatePayment==='function')updatePayment({...b,amount_paid:paidFor(b)});
          return;
        }
        if(act==='status'&&typeof setV17SessionStatus==='function'){
          await setV17SessionStatus({...b,amount_paid:paidFor(b)},btn.dataset.status);
          await loadOps(true);
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
      ['v20UpcomingList','v20PastList','v20PaymentList','v20CompletedList'].forEach(id=>{
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
    [['upcoming','v20UpcomingToggle','v20UpcomingSection'],['past','v20PastToggle','v20PastSection'],['payment','v20PaymentToggle','v20PaymentSection'],['completed','v20CompletedToggle','v20CompletedSection']].forEach(([kind,id,sectionId])=>{
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
  window.pickylaV20Ops={refresh:()=>loadOps(true)};
})();