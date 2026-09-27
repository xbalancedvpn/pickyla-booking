// Pickyla v20 - Coach Kyle style Tournament / Unavailable blocking
(function(){
  const byId=id=>document.getElementById(id);
  const pad=n=>String(n).padStart(2,'0');
  const today=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
  const hour=h=>{h=Number(h);if(h===24)return '12:00 MN';return (h%12||12)+':00 '+(h<12?'AM':'PM');};
  const reasons=['Coach Unavailable','Training','Tournament','Personal Schedule','Rest Day','Other'];
  const key=r=>({'Coach Unavailable':'unavailable','Training':'training','Tournament':'tournament','Personal Schedule':'personal','Rest Day':'rest'}[r]||'other');
  let selectedHour=null,currentRows=new Map();

  function reasonFromNotes(notes){
    const s=String(notes||'').trim();
    if(!s)return {reason:'Coach Unavailable',isPublic:false};
    if(s.startsWith('PUBLIC:'))return {reason:s.slice(7).trim()||'Coach Unavailable',isPublic:true};
    if(s.startsWith('PRIVATE:'))return {reason:s.slice(8).trim()||'Coach Unavailable',isPublic:false};
    return {reason:s,isPublic:false};
  }
  function ensurePanel(){
    const old=byId('blockForm');if(old)old.classList.add('hidden');
    if(byId('v20ScheduleBlockSection'))return;
    const host=old?.parentElement||byId('bookingToolsSection');
    if(!host)return;
    const panel=document.createElement('section');
    panel.id='v20ScheduleBlockSection';panel.className='panel v20-block-panel';
    panel.innerHTML='<div class="panel-head"><div><span class="eyebrow">SCHEDULE CONTROL</span><h2>Tournament / unavailable</h2><p class="panel-note">Select a date, then tap any open hour to block it. Booked hours are protected.</p></div><span class="panel-tag muted">HOURLY</span></div>'+
      '<label class="v20-block-date-label">Date<input id="v20BlockDate" type="date" data-date-title="Tournament / unavailable date"></label>'+
      '<div class="v20-block-legend"><span><i class="reason-unavailable"></i>Unavailable</span><span><i class="reason-training"></i>Training</span><span><i class="reason-tournament"></i>Tournament</span><span><i class="reason-personal"></i>Personal</span><span><i class="reason-rest"></i>Rest Day</span><span><i class="reason-other"></i>Other</span></div>'+
      '<div id="v20BlockSlots" class="v20-block-slots"><div class="empty">Loading hours…</div></div>';
    host.insertBefore(panel,old||null);

    const dlg=document.createElement('dialog');dlg.id='v20BlockReasonDialog';dlg.className='v20-block-dialog';
    dlg.innerHTML='<form id="v20BlockReasonForm" class="v20-modal-card">'+
      '<button type="button" id="v20BlockClose" class="v20-modal-x">×</button>'+
      '<span class="eyebrow">COACH SCHEDULE</span><h2>Block This Hour</h2><div id="v20BlockTime" class="panel-note"></div>'+
      '<label>Reason<select id="v20BlockReason">'+reasons.map(r=>'<option value="'+r+'">'+r+'</option>').join('')+'</select></label>'+
      '<label id="v20BlockOtherWrap" class="hidden">Other reason<input id="v20BlockOther" maxlength="80" placeholder="Short reason"></label>'+
      '<label class="v20-block-public"><input id="v20BlockPublic" type="checkbox" checked> Show this reason publicly</label>'+
      '<small class="v20-block-privacy">When off, the public site only shows “Blocked”.</small>'+
      '<div class="v20-modal-actions"><button type="button" id="v20BlockCancel" class="secondary">Cancel</button><button type="submit" class="primary">Block Hour</button></div>'+
    '</form>';
    document.body.appendChild(dlg);

    const date=byId('v20BlockDate');date.value=today();
    date.onchange=load;
    window.pickylaV20DatePicker?.enhance?.(date);
    byId('v20BlockReason').onchange=()=>byId('v20BlockOtherWrap').classList.toggle('hidden',byId('v20BlockReason').value!=='Other');
    byId('v20BlockClose').onclick=()=>dlg.close();
    byId('v20BlockCancel').onclick=()=>dlg.close();
    byId('v20BlockReasonForm').onsubmit=save;
  }

  function openReason(h){
    selectedHour=h;
    byId('v20BlockTime').textContent=byId('v20BlockDate').value+' • '+hour(h)+'–'+hour(h+1);
    byId('v20BlockReason').value='Coach Unavailable';byId('v20BlockOther').value='';
    byId('v20BlockOtherWrap').classList.add('hidden');byId('v20BlockPublic').checked=true;
    byId('v20BlockReasonDialog').showModal();
  }
  async function reopen(row,h){
    const ok=window.confirm?confirm('Reopen '+hour(h)+'–'+hour(h+1)+'?'):true;
    if(!ok)return;
    const {error}=await db.from('schedule_slots').delete().eq('id',row.id);
    if(error)return alert(error.message);
    await refreshAll();
  }
  async function save(e){
    e.preventDefault();if(selectedHour===null)return;
    let reason=byId('v20BlockReason').value;
    if(reason==='Other')reason=String(byId('v20BlockOther').value||'').trim()||'Coach Unavailable';
    const note=(byId('v20BlockPublic').checked?'PUBLIC:':'PRIVATE:')+reason;
    const payload={slot_date:byId('v20BlockDate').value,start_hour:selectedHour,status:'unavailable',notes:note,client_name:null,contact:null,coaching_type:null,rate:null,booking_id:null};
    const btn=byId('v20BlockReasonForm').querySelector('button[type="submit"]'),old=btn.textContent;btn.disabled=true;btn.textContent='Saving…';
    try{
      const {error}=await db.from('schedule_slots').upsert(payload,{onConflict:'slot_date,start_hour'});
      if(error)throw error;
      byId('v20BlockReasonDialog').close();selectedHour=null;await refreshAll();
    }catch(err){alert(err.message||'Could not block hour.');}
    finally{btn.disabled=false;btn.textContent=old;}
  }
  async function load(){
    const date=byId('v20BlockDate')?.value;if(!date)return;
    const root=byId('v20BlockSlots');root.innerHTML='<div class="empty">Loading hours…</div>';
    const {data,error}=await db.from('schedule_slots').select('id,start_hour,status,notes,client_name').eq('slot_date',date).order('start_hour');
    if(error){root.innerHTML='<div class="empty">'+error.message+'</div>';return;}
    currentRows=new Map((data||[]).map(r=>[Number(r.start_hour),r]));
    root.innerHTML='';
    for(let h=8;h<24;h++){
      const row=currentRows.get(h),status=row?.status||'available',btn=document.createElement('button');
      btn.type='button';btn.className='v20-block-slot '+status;
      let detail='Available';
      if(status==='booked'){detail='Booked • '+(row.client_name||'Client');btn.disabled=true;}
      else if(status==='unavailable'){const meta=reasonFromNotes(row.notes);detail=meta.reason+(meta.isPublic?' • Public':' • Private');btn.classList.add('block-'+key(meta.reason));}
      btn.innerHTML='<span>'+hour(h)+'–'+hour(h+1)+'</span><small>'+detail+'</small>';
      if(status==='unavailable')btn.onclick=()=>reopen(row,h);
      else if(status==='available')btn.onclick=()=>openReason(h);
      root.appendChild(btn);
    }
  }
  async function refreshAll(){
    await load();
    const date=byId('v20BlockDate')?.value;
    if(date&&byId('adminDate')?.value===date&&typeof loadDay==='function')await loadDay();
    if(typeof loadAdminCalendar==='function')await loadAdminCalendar();
    if(typeof loadBookingAvailability==='function')await loadBookingAvailability();
  }
  function init(){ensurePanel();setTimeout(()=>{window.pickylaV20DatePicker?.enhance?.(byId('v20BlockDate'));load();},0);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.pickylaV20Schedule={refresh:load};
})();