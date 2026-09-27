// PICKYLA v20 - coaching pricing + optional additional player details
(function(){
  const byId=id=>document.getElementById(id);
  const peso20=v=>'₱'+Number(v||0).toLocaleString('en-PH',{maximumFractionDigits:2});

  function mode20(){
    return /group drills/i.test(String(selectedPackage||''))?'group':'private';
  }
  function hourly20(count,mode){
    const n=Math.max(1,Math.min(12,Number(count)||1));
    const m=mode||mode20();
    return m==='group'?n*250:400+Math.max(0,n-1)*200;
  }
  function bill20(){
    const hrs=(selectedStart!==null&&selectedEnd!==null)?Math.max(0,selectedEnd-selectedStart):0;
    return hourly20(selectedPlayers||1)*hrs;
  }
  function completePlayers20(rows){
    const out=[];
    for(let i=0;i<rows.length;i++){
      const p=rows[i];
      const first=smartName(p.first_name),last=smartName(p.last_name),contact=cleanSpaces(p.contact)||null;
      if(i===0){
        if(!first||!last)return null;
        out.push({first_name:first,last_name:last,contact:contact});
        continue;
      }
      const touched=!!(first||last||contact);
      if(!touched)continue;
      if(!first||!last)return null;
      out.push({first_name:first,last_name:last,contact:contact});
    }
    return out;
  }
  function getPlayers20(strict){
    const rows=participantDrafts();
    if(strict)return completePlayers20(rows);
    return rows.map((p,i)=>({
      first_name:smartName(p.first_name),
      last_name:smartName(p.last_name),
      contact:cleanSpaces(p.contact)||null,
      required:i===0
    }));
  }
  function renderPlayers20(count){
    if(!publicParticipantList)return;
    count=Math.min(12,Math.max(1,Number(count)||1));
    const prev=participantDrafts(),saved=rememberedPrimary();
    publicParticipantList.innerHTML='';
    for(let i=0;i<count;i++){
      const draft=prev[i]||(i===0&&saved?saved:{}),card=document.createElement('article'),req=i===0;
      card.className='public-participant-card';
      card.dataset.order=String(i+1);
      card.innerHTML=
        '<div class="participant-card-head"><div><span>PLAYER '+(i+1)+'</span><strong>'+(req?'Primary / required':'Optional details')+'</strong></div>'+
        (req?'<span class="primary-chip">REQUIRED</span>':'<span class="v20-optional-chip">OPTIONAL</span>')+
        '</div><div class="participant-fields">'+
        '<label>First name '+(req?'<em>required</em>':'<small>optional</small>')+'<input data-first type="text" maxlength="60" autocomplete="'+(req?'given-name':'off')+'" placeholder="'+(req?'First name':'Optional')+'" '+(req?'required':'')+'></label>'+
        '<label>Last name '+(req?'<em>required</em>':'<small>optional</small>')+'<input data-last type="text" maxlength="80" autocomplete="'+(req?'family-name':'off')+'" placeholder="'+(req?'Last name':'Optional')+'" '+(req?'required':'')+'></label>'+
        '<label class="participant-contact">Contact <small>optional</small><input data-contact type="text" maxlength="120" autocomplete="'+(req?'tel':'off')+'" placeholder="Messenger / mobile"></label>'+
        '</div><div class="participant-suggestions hidden"></div>';
      card.querySelector('[data-first]').value=draft.first_name||'';
      card.querySelector('[data-last]').value=draft.last_name||'';
      card.querySelector('[data-contact]').value=draft.contact||'';
      card.querySelectorAll('input').forEach(inp=>{
        inp.addEventListener('input',()=>{showPlayerSuggestions(card);updateSummary();updatePrice20();});
        inp.addEventListener('blur',()=>{
          if(inp.hasAttribute('data-first')||inp.hasAttribute('data-last'))inp.value=smartName(inp.value);
          setTimeout(()=>card.querySelector('.participant-suggestions')?.classList.add('hidden'),180);
          updateSummary();updatePrice20();
        });
      });
      publicParticipantList.appendChild(card);
    }
    if(saved&&rememberPrimaryDetails){rememberPrimaryDetails.checked=true;forgetRememberedDetails?.classList.remove('hidden');}
    updateSummary();updatePrice20();
  }
  function priceFormula20(n){
    return mode20()==='group'
      ? n+' players × ₱250'
      : (n===1?'₱400 base':'₱400 + '+(n-1)+' additional × ₱200');
  }
  function updatePrice20(){
    const box=byId('v20PublicPricePreview');
    if(!box)return;
    const n=Number(selectedPlayers||1),hrs=(selectedStart!==null&&selectedEnd!==null)?Math.max(0,selectedEnd-selectedStart):0,hourly=hourly20(n),total=hourly*hrs;
    box.innerHTML='<span>Estimated coaching fee</span><strong>'+peso20(total)+'</strong><small>'+priceFormula20(n)+' = '+peso20(hourly)+'/hr'+(hrs?' × '+hrs+' hr'+(hrs>1?'s':''):'')+'</small>';
  }
  function message20(){
    const players=getPlayers20(true);
    if(!selectedDate||selectedStart===null||selectedEnd===null||!selectedPackage||!players)return '';
    const hrs=selectedEnd-selectedStart,n=Number(selectedPlayers||1),hourly=hourly20(n),total=hourly*hrs,primary=players[0],court=window.pickylaV20PublicCourt?.value?.()||'';if(!court)return '';
    const context=[selectedGoalLabel?'Goal: '+selectedGoalLabel:'',selectedProgramInterest?'Program Interest: '+selectedProgramInterest.name:''].filter(Boolean).join('\n');
    const roster=['Player 1: '+fullPlayerName(primary)+(primary.contact?' | Contact: '+primary.contact:' | Contact: Not provided')];
    players.slice(1).forEach((p,i)=>roster.push('Player '+(i+2)+': '+fullPlayerName(p)+(p.contact?' | Contact: '+p.contact:'')));
    const unnamed=n-players.length;
    if(unnamed>0)roster.push('Additional player details not provided: '+unnamed);
    const rateText=mode20()==='group'
      ? '₱250/player/hr × '+n+' players'
      : (n===1?'₱400/hour':'₱400/hour + ₱200/hour × '+(n-1)+' additional player'+(n-1>1?'s':''));
    return 'Hi Kyla! I would like to request a pickleball coaching session.\n\n'+
      'Name: '+fullPlayerName(primary)+'\n'+
      'Contact: '+(primary.contact||'Not provided')+'\n'+
      'Date: '+niceDate(selectedDate)+'\n'+
      'Time: '+hourName(selectedStart)+' - '+hourName(selectedEnd)+' ('+hrs+' hour'+(hrs>1?'s':'')+')\n'+
      'Players: '+n+'\n'+roster.join('\n')+'\n'+
      'Coaching: '+selectedPackage+'\n'+
      'Rate: '+rateText+'\n'+
      'Estimated Coaching Fee: '+peso20(total)+(context?'\n'+context:'')+'\n'+
      'Court: '+court+'\nCourt Fee: Not included; confirmed separately.\nVenue: Santiago City, Isabela\n\nPlease confirm if this schedule is still available. Thank you!';
  }
  function updateReady20(){
    const rows=getPlayers20(false),p1=rows[0]||{};
    const extrasValid=rows.slice(1).every(p=>{
      const touched=!!(p.first_name||p.last_name||p.contact);
      return !touched||(!!p.first_name&&!!p.last_name);
    });
    const court=window.pickylaV20PublicCourt?.value?.()||'';const ready=selectedDate&&selectedStart!==null&&selectedEnd!==null&&selectedPackage&&court&&p1.first_name&&p1.last_name&&extrasValid;
    if(ready){
      const hrs=selectedEnd-selectedStart;
      summaryText.textContent=fullPlayerName(p1)+' • '+niceDate(selectedDate)+' • '+hourName(selectedStart)+'–'+hourName(selectedEnd)+' • '+hrs+' hr • '+selectedPlayers+' player(s) • '+selectedPackage+' • '+peso20(bill20());
      copyButton.classList.remove('disabled');copyOpenButton.classList.remove('disabled');sendRequestButton?.classList.remove('disabled');
    }else{
      summaryText.textContent='Select date, hours, coaching type, court, and complete Player 1. Additional player details are optional.';
      copyButton.classList.add('disabled');copyOpenButton.classList.add('disabled');sendRequestButton?.classList.add('disabled');
    }
    if(requestSubmitStatus&&!requestSubmitStatus.dataset.keep){requestSubmitStatus.className='request-submit-status hidden';requestSubmitStatus.textContent='';}
    updatePrice20();
  }
  function install(){
    const area=document.querySelector('#booking .package-options');
    if(!area)return;
    area.innerHTML=
      '<button data-package="Private Coaching" data-mode="private" data-players="1" data-min="1" data-max="3">Private Coaching <small>₱400/hr + ₱200/additional player</small></button>'+
      '<button data-package="Group Drills Training" data-mode="group" data-players="4" data-min="4" data-max="12">Group Drills Training <small>4–12 players • ₱250/player/hr</small></button>';
    const wrap=area.closest('.package-area');
    if(wrap&&!byId('v20PublicPricePreview')){
      const preview=document.createElement('div');
      preview.id='v20PublicPricePreview';preview.className='v20-public-price-preview';
      preview.innerHTML='<span>Estimated coaching fee</span><strong>₱0</strong><small>Select coaching type, players, and hours.</small>';
      wrap.appendChild(preview);
    }
    renderPublicParticipants=renderPlayers20;
    getPublicParticipants=getPlayers20;
    setPlayerCountOptions=function(min,max){
      groupSize.innerHTML='';
      for(let n=min;n<=max;n++){
        const o=document.createElement('option');o.value=String(n);o.textContent=n+' player'+(n===1?'':'s');groupSize.appendChild(o);
      }
      selectedPlayers=min;renderPlayers20(selectedPlayers);
    };
    area.querySelectorAll('button').forEach(b=>b.onclick=()=>{
      area.querySelectorAll('button').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      selectedPackage=b.dataset.package;
      setPlayerCountOptions(Number(b.dataset.min),Number(b.dataset.max));
      groupSizeWrap.classList.remove('hidden');
      selectedPlayers=Number(groupSize.value);
      selectedRate=String(hourly20(selectedPlayers,b.dataset.mode));
      renderPlayers20(selectedPlayers);
      updateReady20();
    });
    groupSize.onchange=()=>{
      selectedPlayers=Number(groupSize.value);
      selectedRate=String(hourly20(selectedPlayers));
      renderPlayers20(selectedPlayers);
      updateReady20();
    };
    bookingMessage=message20;
    updateSummary=updateReady20;

    if(sendRequestButton){
      sendRequestButton.onclick=async()=>{
        const players=getPlayers20(true),text=message20();
        if(!text||!players){updateReady20();return;}
        const original=sendRequestButton.textContent;
        sendRequestButton.disabled=true;sendRequestButton.textContent='Sending…';
        if(requestSubmitStatus){requestSubmitStatus.dataset.keep='1';requestSubmitStatus.className='request-submit-status hidden';}
        try{
          saveParticipantMemory(players);
          const selfAssessment=window.pickylaGetSelfAssessment?.()||null;const useV17f=typeof window.pickylaGetSelfAssessment==='function';
          const args={
            p_preferred_date:keyDate(selectedDate),
            p_start_hour:selectedStart,
            p_end_hour:selectedEnd,
            p_participant_count:Number(selectedPlayers||1),
            p_coaching_type:selectedPackage,
            p_quoted_rate:hourly20(selectedPlayers||1),
            p_source_text:text,
            p_goal_focus:selectedGoalLabel||null,
            p_program_interest:selectedProgramInterest?.name||null,
            p_participants:players
          };
          if(useV17f)args.p_self_assessment=selfAssessment;
          const result=await db.rpc(useV17f?'submit_public_inquiry_v17f':'submit_public_inquiry_v17d',args);
          if(result.error)throw result.error;
          requestSubmitStatus.className='request-submit-status ok';
          requestSubmitStatus.textContent=selfAssessment?'Request sent to Pickyla Admin with Player 1 self-assessment. Your slot is still subject to final confirmation by Kyla.':'Request sent to Pickyla Admin. Your slot is still subject to final confirmation by Kyla.';
        }catch(e){
          requestSubmitStatus.className='request-submit-status error';
          requestSubmitStatus.textContent=e.message||'Could not send your request. Please try Messenger instead.';
        }finally{
          sendRequestButton.disabled=false;sendRequestButton.textContent=original;
          setTimeout(()=>{if(requestSubmitStatus)delete requestSubmitStatus.dataset.keep;},1200);
        }
      };
    }
    copyButton.onclick=async()=>{
      const text=message20(),players=getPlayers20(true);if(!text||!players)return false;
      saveParticipantMemory(players);
      try{await navigator.clipboard.writeText(text);showToast();return true;}
      catch(e){const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();if(ok)showToast();return ok;}
    };
    copyOpenButton.onclick=async()=>{if(!message20())return;await copyButton.onclick();setTimeout(()=>window.open(FACEBOOK_URL,'_blank'),180);};

    const intro=document.querySelector('.participant-intro');
    if(intro)intro.innerHTML='Player 1 first and last name are <strong>required</strong>. Contact is optional. Players 2–12 are optional details—leave them blank if you do not want to encode the other names.';
    updateReady20();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.pickylaV20Pricing={hourlyTotalFor:hourly20,billTotal:bill20};
})();