// Pickyla v20 - Coach Kyle style Tournament / Unavailable blocking
(function(){
  const byId=id=>document.getElementById(id);
  const pad=n=>String(n).padStart(2,'0');
  const today=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
  const hour=h=>{h=Number(h);if(h===24)return '12:00 MN';return (h%12||12)+':00 '+(h<12?'AM':'PM');};
  const reasons=['Coach Unavailable','Training','Tournament','Personal Schedule','Rest Day','Other'];
  const key=r=>({'Coach Unavailable':'unavailable','Training':'training','Tournament':'tournament','Personal Schedule':'personal','Rest Day':'rest'}[r]||'other');
  let selectedHour=null,currentRows=new Map(),mode='single',rangeStart=null,rangeEnd=null;

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
    panel.innerHTML='<div class="panel-head"><div><span class="eyebrow">SCHEDULE CONTROL</span><h2>Tournament / unavailable</h2><p class="panel-note">Use Single Hour for one block, or Multiple Hours: tap a start hour then an end hour to select the full consecutive range.</p></div><span class="panel-tag muted">HOURLY</span></div>'+
      '<label class="v20-block-date-label">Date<input id="v20BlockDate" type="date" data-date-title="Tournament / unavailable date"></label>'+
      '<div class="v20-block-mode"><button type="button" class="active" data-block-mode="single">Single Hour</button><button type="button" data-block-mode="multiple">Multiple Hours</button></div>'+
      '<div class="v20-block-legend"><span><i class="reason-unavailable"></i>Unavailable</span><span><i class="reason-training"></i>Training</span><span><i class="reason-tournament"></i>Tournament</span><span><i class="reason-personal"></i>Personal</span><span><i class="reason-rest"></i>Rest Day</span><span><i class="reason-other"></i>Other</span></div>'+
      '<div id="v20BlockSlots" class="v20-block-slots"><div class="empty">Loading hours…</div></div>'+
      '<div id="v20BlockSelectionBar" class="v20-block-selection hidden"><span id="v20BlockSelectionCount">Tap a start hour</span><div><button id="v20ClearBlockSelection" type="button" class="secondary">Clear</button><button id="v20BlockSelected" type="button" class="primary">Block Selected Hours</button></div></div>';
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
    date.onchange=()=>{rangeStart=null;rangeEnd=null;load();};
    window.pickylaV20DatePicker?.enhance?.(date);
    panel.querySelectorAll('[data-block-mode]').forEach(btn=>btn.onclick=()=>{
      mode=btn.dataset.blockMode;
      panel.querySelectorAll('[data-block-mode]').forEach(x=>x.classList.toggle('active',x===btn));
      rangeStart=null;rangeEnd=null;renderSelectionBar();load();
    });
    byId('v20ClearBlockSelection').onclick=()=>{rangeStart=null;rangeEnd=null;renderSelectionBar();load();};
    byId('v20BlockSelected').onclick=()=>{
      const hours=rangeHours();
      if(!hours.length)return;
      selectedHour=hours;
      openReason(hours);
    };
    byId('v20BlockReason').onchange=()=>byId('v20BlockOtherWrap').classList.toggle('hidden',byId('v20BlockReason').value!=='Other');
    byId('v20BlockClose').onclick=()=>dlg.close();
    byId('v20BlockCancel').onclick=()=>dlg.close();
    byId('v20BlockReasonForm').onsubmit=save;
  }

  function openReason(h){
    selectedHour=h;
    const hours=Array.isArray(h)?h:[h];
    const label=hours.length===1
      ? hour(hours[0])+'–'+hour(hours[0]+1)
      : hours.map(x=>hour(x)+'–'+hour(x+1)).join(', ');
    byId('v20BlockTime').textContent=byId('v20BlockDate').value+' • '+label;
    byId('v20BlockReason').value='Coach Unavailable';byId('v20BlockOther').value='';
    byId('v20BlockOtherWrap').classList.add('hidden');byId('v20BlockPublic').checked=true;
    byId('v20BlockReasonDialog').showModal();
  }
  function rangeHours(){
    if(rangeStart===null)return [];
    const a=Math.min(rangeStart,rangeEnd===null?rangeStart:rangeEnd);
    const b=Math.max(rangeStart,rangeEnd===null?rangeStart:rangeEnd);
    const hours=[];
    for(let h=a;h<=b;h++){
      const row=currentRows.get(h),status=row?.status||'available';
      if(status!=='available')return [];
      hours.push(h);
    }
    return hours;
  }
  function inRange(h){
    if(rangeStart===null)return false;
    const a=Math.min(rangeStart,rangeEnd===null?rangeStart:rangeEnd);
    const b=Math.max(rangeStart,rangeEnd===null?rangeStart:rangeEnd);
    return h>=a&&h<=b;
  }
  function chooseRangeHour(h){
    const row=currentRows.get(h),status=row?.status||'available';
    if(status!=='available')return;
    if(rangeStart===null||rangeEnd!==null){
      rangeStart=h;rangeEnd=null;
    }else{
      const a=Math.min(rangeStart,h),b=Math.max(rangeStart,h);
      let valid=true;
      for(let x=a;x<=b;x++){
        const r=currentRows.get(x),s=r?.status||'available';
        if(s!=='available'){valid=false;break;}
      }
      if(valid)rangeEnd=h;
      else{rangeStart=h;rangeEnd=null;}
    }
    renderSelectionBar();load();
  }
  function renderSelectionBar(){
    const bar=byId('v20BlockSelectionBar'),count=byId('v20BlockSelectionCount');
    if(!bar||!count)return;
    const hours=rangeHours(),n=hours.length;
    bar.classList.toggle('hidden',mode!=='multiple');
    if(mode!=='multiple')return;
    if(rangeStart===null)count.textContent='Tap a start hour';
    else if(rangeEnd===null)count.textContent='Start: '+hour(rangeStart)+' • Tap an end hour';
    else count.textContent='Selected: '+hour(Math.min(rangeStart,rangeEnd))+'–'+hour(Math.max(rangeStart,rangeEnd)+1)+' • '+n+' hour'+(n===1?'':'s');
    byId('v20BlockSelected').disabled=rangeStart===null||rangeEnd===null||!n;
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
    const hours=Array.isArray(selectedHour)?selectedHour:[selectedHour];
    const payload=hours.map(h=>({slot_date:byId('v20BlockDate').value,start_hour:h,status:'unavailable',notes:note,client_name:null,contact:null,coaching_type:null,rate:null,booking_id:null}));
    const btn=byId('v20BlockReasonForm').querySelector('button[type="submit"]'),old=btn.textContent;btn.disabled=true;btn.textContent='Saving…';
    try{
      const {error}=await db.from('schedule_slots').upsert(payload,{onConflict:'slot_date,start_hour'});
      if(error)throw error;
      byId('v20BlockReasonDialog').close();selectedHour=null;rangeStart=null;rangeEnd=null;renderSelectionBar();await refreshAll();
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
    renderSelectionBar();
    for(let h=8;h<24;h++){
      const row=currentRows.get(h),status=row?.status||'available',btn=document.createElement('button');
      btn.type='button';btn.className='v20-block-slot '+status;
      let detail='Available';
      if(status==='booked'){detail='Booked • '+(row.client_name||'Client');btn.disabled=true;}
      else if(status==='unavailable'){const meta=reasonFromNotes(row.notes);detail=meta.reason+(meta.isPublic?' • Public':' • Private');btn.classList.add('block-'+key(meta.reason));}
      btn.innerHTML='<span>'+hour(h)+'–'+hour(h+1)+'</span><small>'+detail+'</small>';
      if(status==='unavailable')btn.onclick=()=>reopen(row,h);
      else if(status==='available'){
        if(mode==='multiple'){
          if(inRange(h))btn.classList.add('selected');
          if(rangeStart===h&&rangeEnd===null)btn.classList.add('range-start');
          btn.onclick=()=>chooseRangeHour(h);
        }else btn.onclick=()=>openReason(h);
      }
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