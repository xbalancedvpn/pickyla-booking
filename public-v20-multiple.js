// Pickyla v20 - multiple booking request workflow
(function(){
  const byId=id=>document.getElementById(id);
  const state={mode:'single',sessions:new Map(),active:null,courtMode:'same'};
  const originalRenderCalendar=renderCalendar;
  const originalRenderSlots=renderSlots;
  const originalUpdateSummary=updateSummary;
  const originalBookingMessage=bookingMessage;

  const pad20=n=>String(n).padStart(2,'0');
  const ymd20=d=>d.getFullYear()+'-'+pad20(d.getMonth()+1)+'-'+pad20(d.getDate());
  const parse20=s=>{const [y,m,d]=String(s).split('-').map(Number);return new Date(y,m-1,d);};
  const nice20=s=>parse20(s).toLocaleDateString('en-PH',{weekday:'short',month:'short',day:'numeric',year:'numeric'});

  async function availabilityFor(ds){
    const {data,error}=await db.from('public_schedule').select('start_hour,status').eq('slot_date',ds);
    if(error)throw error;
    return new Map((data||[]).map(r=>[Number(r.start_hour),r.status]));
  }
  function hoursAvailable(map,start,end){
    if(start==null||end==null||end<=start)return false;
    for(let h=start;h<end;h++)if((map.get(h)||'available')!=='available')return false;
    return true;
  }
  function currentSession(){return state.active?state.sessions.get(state.active):null;}
  function courtOptions20(){
    return window.pickylaV20PublicCourt?.options||['NANOMOLY','DINK VALLEY','HC SANTIAGO','CASA PLAY','COURTYARD','OTHERS'];
  }
  function globalCourt20(){return window.pickylaV20PublicCourt?.value?.()||'';}
  function sessionCourt20(s){
    if(state.courtMode==='later')return '';
    if(state.courtMode==='same')return globalCourt20();
    return String(s?.court||'').trim();
  }
  function courtsReady20(){
    if(state.courtMode==='later')return true;
    if(state.courtMode==='same')return !!globalCourt20();
    return [...state.sessions.values()].every(s=>!!String(s.court||'').trim());
  }
  function courtLabel20(s){
    const v=sessionCourt20(s);
    return v||'Court not decided yet';
  }

  async function copySameHours(start,end){
    if(!byId('v20SameHoursAll')?.checked||start==null||end==null)return;
    for(const [ds,s] of state.sessions){
      if(ds===state.active){s.start=start;s.end=end;s.conflict=false;continue;}
      try{
        const map=await availabilityFor(ds);
        if(hoursAvailable(map,start,end)){
          s.start=start;s.end=end;s.conflict=false;
        }else{
          s.start=null;s.end=null;s.conflict=true;
        }
      }catch{
        s.start=null;s.end=null;s.conflict=true;
      }
    }
    renderSessionList();
    syncSummary();
  }

  function renderSessionList(){
    const root=byId('v20MultiSessionList');if(!root)return;
    const rows=[...state.sessions.values()].sort((a,b)=>a.date.localeCompare(b.date));
    if(!rows.length){root.innerHTML='<div class="v20-multi-empty">No dates selected yet. Tap dates in the calendar.</div>';return;}
    root.innerHTML=rows.map((s,i)=>{
      const active=s.date===state.active;
      const time=s.start!=null&&s.end!=null?hourName(s.start)+' – '+hourName(s.end):s.conflict?'Same hours unavailable':'Choose hours';
      const courtUi=state.courtMode==='different'
        ? '<label class="v20-session-court">Court<select data-session-court="'+s.date+'"><option value="">Select court</option>'+courtOptions20().map(x=>'<option value="'+x+'" '+((s.court===x||(!courtOptions20().includes(s.court)&&x==='OTHERS'))?'selected':'')+'>'+x+'</option>').join('')+'</select><input data-session-other="'+s.date+'" class="'+(s.court&& !courtOptions20().includes(s.court)?'':'hidden')+'" value="'+(s.court&& !courtOptions20().includes(s.court)?s.court:'')+'" placeholder="Other court"></label>'
        : '<small class="v20-session-court-label">Court: '+courtLabel20(s)+'</small>';
      return '<article class="v20-multi-session '+(active?'active ':'')+(s.conflict?'conflict':'')+'" data-date="'+s.date+'">'+
        '<div><span>SESSION '+(i+1)+'</span><strong>'+nice20(s.date)+'</strong><small>'+time+'</small>'+courtUi+'</div>'+
        '<div><button type="button" data-edit="'+s.date+'">'+(active?'Editing':'Edit Hours')+'</button><button type="button" class="remove" data-remove="'+s.date+'">Remove</button></div>'+
      '</article>';
    }).join('');
    root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>activateDate(b.dataset.edit,true));
    root.querySelectorAll('[data-session-court]').forEach(sel=>sel.onchange=()=>{
      const s=state.sessions.get(sel.dataset.sessionCourt);if(!s)return;
      const other=root.querySelector('[data-session-other="'+sel.dataset.sessionCourt+'"]');
      if(sel.value==='OTHERS'){
        other?.classList.remove('hidden');
        s.court=String(other?.value||'').trim();
      }else{
        other?.classList.add('hidden');
        s.court=sel.value;
      }
      syncSummary();
    });
    root.querySelectorAll('[data-session-other]').forEach(inp=>inp.oninput=()=>{
      const s=state.sessions.get(inp.dataset.sessionOther);if(!s)return;
      s.court=String(inp.value||'').trim();
      syncSummary();
    });
    root.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{
      const ds=b.dataset.remove;
      state.sessions.delete(ds);
      if(state.active===ds){
        const next=[...state.sessions.keys()].sort()[0]||null;
        state.active=next;
        if(next){
          const s=state.sessions.get(next);selectedDate=parse20(next);selectedStart=s.start;selectedEnd=s.end;
        }else{
          selectedDate=null;selectedStart=null;selectedEnd=null;
        }
      }
      renderCalendar();renderSlots();renderSessionList();syncSummary();
    });
  }

  async function activateDate(ds,loadMonth){
    if(!state.sessions.has(ds))state.sessions.set(ds,{date:ds,start:null,end:null,conflict:false,court:''});
    state.active=ds;
    const s=state.sessions.get(ds);
    selectedDate=parse20(ds);selectedStart=s.start;selectedEnd=s.end;
    if(loadMonth){
      view=new Date(selectedDate.getFullYear(),selectedDate.getMonth(),1);
      await loadMonthSchedule();
    }
    renderCalendar();renderSlots();renderSessionList();syncSummary();
  }

  renderCalendar=function(){
    originalRenderCalendar();
    if(state.mode!=='multiple')return;
    const y=view.getFullYear(),m=view.getMonth();
    [...calendar.querySelectorAll('button.day')].forEach(btn=>{
      const day=Number(btn.querySelector('span')?.textContent);
      if(!day)return;
      const d=new Date(y,m,day),ds=ymd20(d),today=new Date();today.setHours(0,0,0,0);
      if(d<today)return;
      btn.classList.toggle('v20-multi-selected',state.sessions.has(ds));
      btn.classList.toggle('v20-multi-active',state.active===ds);
      btn.onclick=async()=>{
        const fresh=!state.sessions.has(ds);
        await activateDate(ds,false);
        if(fresh&&byId('v20SameHoursAll')?.checked){
          const source=[...state.sessions.values()].find(x=>x.date!==ds&&x.start!=null&&x.end!=null);
          if(source){
            const map=await availabilityFor(ds);
            const target=state.sessions.get(ds);
            if(hoursAvailable(map,source.start,source.end)){
              target.start=source.start;target.end=source.end;target.conflict=false;
              selectedStart=target.start;selectedEnd=target.end;
            }else target.conflict=true;
          }
          renderSlots();renderSessionList();syncSummary();
        }
      };
    });
  };

  renderSlots=function(){
    originalRenderSlots();
    if(state.mode==='multiple'&&state.active){
      const title=byId('selectedDateText');
      if(title)title.textContent=nice20(state.active)+' • Session '+([...state.sessions.keys()].sort().indexOf(state.active)+1);
    }
  };

  async function captureActiveHours(){
    if(state.mode!=='multiple'||!state.active)return;
    const s=state.sessions.get(state.active);if(!s)return;
    s.start=selectedStart;s.end=selectedEnd;s.conflict=false;
    renderSessionList();
    if(byId('v20SameHoursAll')?.checked&&selectedStart!=null&&selectedEnd!=null)await copySameHours(selectedStart,selectedEnd);
    syncSummary();
  }

  function multiReady(){
    const rows=[...state.sessions.values()];
    return rows.length>=2&&rows.every(s=>s.start!=null&&s.end!=null&&!s.conflict);
  }
  function totalHours(){
    return [...state.sessions.values()].reduce((a,s)=>a+(s.start!=null&&s.end!=null?s.end-s.start:0),0);
  }
  function totalFee(){
    const hourly=window.pickylaV20Pricing?.hourlyTotalFor?.(selectedPlayers||1)||0;
    return hourly*totalHours();
  }
  function syncSummary(){
    if(state.mode!=='multiple')return originalUpdateSummary();
    const rows=getPublicParticipants(false),p1=rows[0]||{};
    const extrasValid=rows.slice(1).every(p=>{const touched=!!(p.first_name||p.last_name||p.contact);return !touched||(!!p.first_name&&!!p.last_name);});
    const ready=multiReady()&&courtsReady20()&&selectedPackage&&p1.first_name&&p1.last_name&&extrasValid;
    summaryText.textContent=ready
      ? fullPlayerName(p1)+' • MULTIPLE BOOKING • '+state.sessions.size+' sessions • '+totalHours()+' total hr • '+selectedPlayers+' player(s) • '+pesoPublic(totalFee())
      : 'Multiple Booking: select at least 2 dates, choose hours for every date, set the court option, then complete coaching type and Player 1.';
    [copyButton,copyOpenButton,sendRequestButton].filter(Boolean).forEach(b=>b.classList.toggle('disabled',!ready));
  }

  function multiMessage(){
    if(state.mode!=='multiple')return originalBookingMessage();
    const players=getPublicParticipants(true);
    if(!players||!multiReady()||!courtsReady20()||!selectedPackage)return '';
    const rows=[...state.sessions.values()].sort((a,b)=>a.date.localeCompare(b.date));
    const n=Number(selectedPlayers||1),hourly=window.pickylaV20Pricing?.hourlyTotalFor?.(n)||0,primary=players[0];
    const roster=['Player 1: '+fullPlayerName(primary)+(primary.contact?' | Contact: '+primary.contact:' | Contact: Not provided')];
    players.slice(1).forEach((p,i)=>roster.push('Player '+(i+2)+': '+fullPlayerName(p)+(p.contact?' | Contact: '+p.contact:'')));
    if(n>players.length)roster.push('Additional player details not provided: '+(n-players.length));
    const sessionLines=rows.map((s,i)=>'Session '+(i+1)+': '+nice20(s.date)+' • '+hourName(s.start)+' - '+hourName(s.end)+' ('+(s.end-s.start)+' hr'+(s.end-s.start>1?'s':'')+') • Court: '+courtLabel20(s));
    const rateText=/group drills/i.test(selectedPackage)?'₱250/player/hr × '+n+' players':(n===1?'₱400/hour':'₱400/hour + ₱200/hour × '+(n-1)+' additional player'+(n-1>1?'s':''));
    const context=[selectedGoalLabel?'Goal: '+selectedGoalLabel:'',selectedProgramInterest?'Program Interest: '+selectedProgramInterest.name:''].filter(Boolean);
    return 'Hi Kyla! I would like to request MULTIPLE pickleball coaching sessions.\n\n'+
      'Name: '+fullPlayerName(primary)+'\nContact: '+(primary.contact||'Not provided')+'\n'+
      'Multiple Booking: '+rows.length+' sessions\n'+sessionLines.join('\n')+'\n'+
      'Players: '+n+'\n'+roster.join('\n')+'\nCoaching: '+selectedPackage+'\nRate: '+rateText+'\n'+
      'Hourly Coaching Rate: '+pesoPublic(hourly)+'\nEstimated Total Coaching Fee: '+pesoPublic(totalFee())+'\n'+
      (context.length?context.join('\n')+'\n':'')+
      'Court setup: '+(state.courtMode==='same'?'Same court for all dates':state.courtMode==='different'?'Different court each day':'Court not decided yet')+'\nCourt Fee: Not included; confirmed separately.\nVenue: Santiago City, Isabela\n\nPlease confirm which selected sessions are available. Thank you!';
  }

  async function submitMultiple(){
    const players=getPublicParticipants(true),text=multiMessage();
    if(!players||!text){syncSummary();return;}
    const btn=sendRequestButton,old=btn.textContent;
    btn.disabled=true;btn.textContent='Sending Multiple Request…';
    if(requestSubmitStatus){requestSubmitStatus.dataset.keep='1';requestSubmitStatus.className='request-submit-status hidden';}
    try{
      saveParticipantMemory(players);
      const sessions=[...state.sessions.values()].sort((a,b)=>a.date.localeCompare(b.date)).map(s=>({date:s.date,start_hour:s.start,end_hour:s.end,court:sessionCourt20(s)}));
      const hourly=window.pickylaV20Pricing?.hourlyTotalFor?.(selectedPlayers||1)||0;
      const {data,error}=await db.rpc('submit_public_multiple_inquiry_v20',{
        p_sessions:sessions,
        p_participant_count:Number(selectedPlayers||1),
        p_coaching_type:selectedPackage,
        p_hourly_coaching_rate:hourly,
        p_source_text:text,
        p_goal_focus:selectedGoalLabel||null,
        p_program_interest:selectedProgramInterest?.name||null,
        p_participants:players,
        p_self_assessment:window.pickylaGetSelfAssessment?.()||null
      });
      if(error)throw error;
      requestSubmitStatus.className='request-submit-status ok';
      requestSubmitStatus.textContent='Multiple Booking request sent: '+sessions.length+' sessions are grouped together for Kyla to review.';
      state.sessions.clear();state.active=null;selectedDate=null;selectedStart=null;selectedEnd=null;
      renderCalendar();renderSlots();renderSessionList();syncSummary();
    }catch(e){
      requestSubmitStatus.className='request-submit-status error';
      requestSubmitStatus.textContent=e.message||'Could not send the multiple-booking request.';
    }finally{
      btn.disabled=false;btn.textContent=old;
      setTimeout(()=>{if(requestSubmitStatus)delete requestSubmitStatus.dataset.keep;},1200);
    }
  }

  function switchMode(mode){
    state.mode=mode;
    byId('v20BookingMode')?.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    byId('v20MultiBookingPanel')?.classList.toggle('hidden',mode!=='multiple');
    const courtArea=byId('v20PublicCourtArea');
    if(courtArea)courtArea.classList.toggle('hidden',mode==='multiple'&&state.courtMode!=='same');
    if(mode==='multiple'&&selectedDate){
      const ds=keyDate(selectedDate);
      if(!state.sessions.has(ds))state.sessions.set(ds,{date:ds,start:selectedStart,end:selectedEnd,conflict:false,court:''});
      state.active=ds;
    }
    renderCalendar();renderSlots();renderSessionList();syncSummary();
  }

  function install(){
    byId('v20BookingMode')?.querySelectorAll('button').forEach(b=>b.onclick=()=>switchMode(b.dataset.mode));
    byId('v20BookingMode')?.parentElement?.querySelectorAll('[data-court-mode]');
    document.querySelectorAll('[data-court-mode]').forEach(btn=>btn.onclick=()=>{
      state.courtMode=btn.dataset.courtMode;
      document.querySelectorAll('[data-court-mode]').forEach(x=>x.classList.toggle('active',x===btn));
      const area=byId('v20PublicCourtArea');
      if(area)area.classList.toggle('hidden',state.courtMode!=='same');
      const help=byId('v20MultiCourtHelp');
      if(help)help.textContent=state.courtMode==='same'
        ? 'The selected court below will apply to every selected date.'
        : state.courtMode==='different'
          ? 'Choose a court inside each selected session.'
          : 'You can send the request without a court. Kyla can add it later after confirmation.';
      renderSessionList();syncSummary();
    });
    byId('v20SameHoursAll')?.addEventListener('change',async e=>{
      if(e.target.checked){
        const s=currentSession();
        if(s?.start!=null&&s?.end!=null)await copySameHours(s.start,s.end);
      }else{
        [...state.sessions.values()].forEach(s=>s.conflict=false);
        renderSessionList();syncSummary();
      }
    });

    slotsEl.addEventListener('click',e=>{
      if(state.mode!=='multiple'||!e.target.closest('button.slot'))return;
      setTimeout(captureActiveHours,0);
    });

    bookingMessage=multiMessage;
    updateSummary=syncSummary;

    sendRequestButton?.addEventListener('click',e=>{
      if(state.mode!=='multiple')return;
      e.preventDefault();e.stopImmediatePropagation();
      submitMultiple();
    },true);

    copyButton?.addEventListener('click',async e=>{
      if(state.mode!=='multiple')return;
      e.preventDefault();e.stopImmediatePropagation();
      const text=multiMessage();if(!text)return;
      try{await navigator.clipboard.writeText(text);showToast();}catch{}
    },true);

    copyOpenButton?.addEventListener('click',async e=>{
      if(state.mode!=='multiple')return;
      e.preventDefault();e.stopImmediatePropagation();
      const text=multiMessage();if(!text)return;
      try{await navigator.clipboard.writeText(text);showToast();}catch{}
      setTimeout(()=>window.open(FACEBOOK_URL,'_blank'),180);
    },true);

    renderSessionList();
    window.pickylaV20Multi={
      isMultiple:()=>state.mode==='multiple',
      sessions:()=>[...state.sessions.values()],
      ready:multiReady,
      totalHours,
      totalFee
    };
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();