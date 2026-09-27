// PICKYLA v20 usability pass - Coach Kyle tap-to-select hour range
(function(){
  const byId=id=>document.getElementById(id);

  function isOpen(h){
    if(!selectedDate)return false;
    return statusFor(keyDate(selectedDate),h)==='available';
  }
  function isSelected(h){
    return selectedStart!==null&&selectedEnd!==null&&h>=selectedStart&&h<selectedEnd;
  }
  function duration(){
    return selectedStart!==null&&selectedEnd!==null?selectedEnd-selectedStart:0;
  }
  function selectionValid(){
    if(selectedStart===null||selectedEnd===null||selectedEnd<=selectedStart)return false;
    for(let h=selectedStart;h<selectedEnd;h++)if(!isOpen(h))return false;
    return true;
  }
  function updateSelectionSummary(){
    const d=duration();
    if(!selectedDate){
      durationSummary.textContent='Choose a date, then tap an available hour.';
    }else if(!d){
      durationSummary.textContent='Tap an available hour to begin. Tap another consecutive hour to extend your session.';
    }else{
      durationSummary.textContent=`Selected: ${hourName(selectedStart)} – ${hourName(selectedEnd)} • ${d} hour${d>1?'s':''}`;
    }
    updateSummary();
  }
  function chooseHour(h){
    if(!isOpen(h))return;

    if(selectedStart===null||selectedEnd===null){
      selectedStart=h;
      selectedEnd=h+1;
    }else if(isSelected(h)){
      const d=duration();
      if(d===1){
        selectedStart=null;
        selectedEnd=null;
      }else if(h===selectedStart){
        selectedStart++;
      }else if(h===selectedEnd-1){
        selectedEnd--;
      }else{
        // Tapping the middle of an existing range starts a fresh one-hour range.
        selectedStart=h;
        selectedEnd=h+1;
      }
    }else{
      const candidateStart=Math.min(selectedStart,h);
      const candidateEnd=Math.max(selectedEnd,h+1);
      let continuous=true;
      for(let x=candidateStart;x<candidateEnd;x++){
        if(!isOpen(x)){continuous=false;break;}
      }
      if(continuous){
        selectedStart=candidateStart;
        selectedEnd=candidateEnd;
      }else{
        // A booked/blocked hour sits between the old and new tap: reset to the new hour.
        selectedStart=h;
        selectedEnd=h+1;
      }
    }

    renderSlots();
    updateSelectionSummary();
  }

  function install(){
    const picker=document.querySelector('#booking .range-picker');
    if(picker){
      picker.classList.add('v20-hour-dropdowns-removed');
      picker.setAttribute('aria-hidden','true');
    }
    const heading=document.querySelector('#booking .section-heading p');
    if(heading)heading.textContent='Pick a date, then tap one or more consecutive available hour blocks. Duration is calculated automatically.';
    const title=document.querySelector('#booking .availability-title');
    if(title)title.textContent='Tap available hours';

    renderSlots=function(){
      slotsEl.innerHTML='';
      if(!selectedDate){
        selectedDateText.textContent='Choose a date';
        return;
      }
      const ds=keyDate(selectedDate);
      selectedDateText.textContent=niceDate(selectedDate);
      for(let h=8;h<24;h++){
        const b=document.createElement('button'),s=statusFor(ds,h);
        b.className='slot v20-hour-slot';
        b.type='button';
        b.innerHTML='<span>'+hourLabel(h)+'</span>';
        if(s==='booked'){
          b.classList.add('booked');
          b.disabled=true;
        }else if(s==='unavailable'){
          const reason=typeof publicReasonFor==='function'?publicReasonFor(ds,h):'';
          b.classList.add('unavailable');
          if(reason){
            const key=String(reason).toLowerCase().includes('tournament')?'tournament':String(reason).toLowerCase().includes('training')?'training':String(reason).toLowerCase().includes('personal')?'personal':String(reason).toLowerCase().includes('rest')?'rest':String(reason).toLowerCase().includes('unavailable')?'unavailable':'other';
            b.classList.add('block-'+key);
            b.innerHTML='<span>'+hourLabel(h)+'</span><small>'+reason+'</small>';
          }else b.innerHTML='<span>'+hourLabel(h)+'</span><small>Blocked</small>';
          b.disabled=true;
        }else{
          if(isSelected(h))b.classList.add('in-range','selected','range-selected');
          b.onclick=()=>chooseHour(h);
        }
        slotsEl.appendChild(b);
      }
    };

    populateStartTimes=function(){
      if(clientStart){clientStart.innerHTML='';clientStart.disabled=true;}
      if(clientEnd){clientEnd.innerHTML='';clientEnd.disabled=true;}
      if(!selectedDate){
        selectedStart=null;selectedEnd=null;
        updateSelectionSummary();
        return;
      }
      if(!selectionValid()){selectedStart=null;selectedEnd=null;}
      const ds=keyDate(selectedDate);
      let hasOpen=false;
      for(let h=8;h<24;h++)if(statusFor(ds,h)==='available'){hasOpen=true;break;}
      if(!hasOpen)durationSummary.textContent='No available coaching time on this date.';
      else updateSelectionSummary();
      renderSlots();
    };

    populateEndTimes=function(){
      if(selectedStart===null){
        selectedEnd=null;
        updateSelectionSummary();
        renderSlots();
        return;
      }
      if(selectedEnd===null)selectedEnd=selectedStart+1;
      if(!selectionValid()){
        selectedEnd=selectedStart+1;
        if(!selectionValid()){selectedStart=null;selectedEnd=null;}
      }
      renderSlots();
      updateSelectionSummary();
    };

    updateDuration=function(){
      if(!selectionValid()){selectedStart=null;selectedEnd=null;}
      renderSlots();
      updateSelectionSummary();
    };

    // Reset the legacy automatic first-hour selection immediately.
    selectedStart=null;
    selectedEnd=null;
    renderSlots();
    updateSelectionSummary();

    window.pickylaV20Hours={chooseHour,reset(){
      selectedStart=null;selectedEnd=null;renderSlots();updateSelectionSummary();
    }};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();