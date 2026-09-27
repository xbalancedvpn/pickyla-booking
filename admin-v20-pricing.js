// PICKYLA v20 - Admin exact hourly coaching pricing
(function(){
  const byId=id=>document.getElementById(id);
  const peso20=v=>'₱'+Number(v||0).toLocaleString('en-PH',{maximumFractionDigits:2});

  function hourly20(n,mode){
    n=Math.max(1,Math.min(12,Number(n)||1));
    return mode==='group'?n*250:400+Math.max(0,n-1)*200;
  }
  function validRange(mode,n){
    n=Number(n)||1;
    return mode==='group'?(n>=4&&n<=12):(n>=1&&n<=3);
  }
  function populateCounts(mode,keep){
    const sel=byId('participantCount');if(!sel)return;
    const min=mode==='group'?4:1,max=mode==='group'?12:3,current=Number(keep||sel.value||min);
    sel.innerHTML='';
    for(let n=min;n<=max;n++){
      const o=document.createElement('option');o.value=String(n);o.textContent=n+' player'+(n===1?'':'s');sel.appendChild(o);
    }
    sel.value=String(Math.min(max,Math.max(min,current)));
  }
  function standardHourly(){
    const mode=byId('v20AdminCoachingMode')?.value||'private';
    return hourly20(Number(byId('participantCount')?.value||1),mode);
  }
  function updateAdminPricing(){
    const mode=byId('v20AdminCoachingMode')?.value||'private',n=Number(byId('participantCount')?.value||1);
    if(!validRange(mode,n)){populateCounts(mode);return updateAdminPricing();}
    const s=Number(byId('bookingStart')?.value||8),e=Number(byId('bookingEnd')?.value||s+1),duration=Math.max(1,e-s);
    const rateMode=byId('rateMode')?.value||'standard',rateInput=byId('ratePerPerson');
    if(rateMode==='standard'){
      rateInput.value=standardHourly().toFixed(2);
      rateInput.readOnly=true;
    }else rateInput.readOnly=false;
    const hourly=Number(rateInput.value||0),total=hourly*duration;
    if(byId('bookingTotal'))byId('bookingTotal').textContent=peso20(total);
    if(byId('bookingCalc'))byId('bookingCalc').textContent=duration+' hr × '+peso20(hourly)+'/hr = '+peso20(total);
    const note=byId('v20AdminRateBreakdown');
    if(note)note.textContent=mode==='group'
      ? 'Group Drills Training • ₱250 per player per hour • '+n+' players = '+peso20(standardHourly())+'/hr'
      : 'Private Coaching • ₱400/hour + ₱200/hour per additional player • '+n+' player'+(n===1?'':'s')+' = '+peso20(standardHourly())+'/hr';
  }
  function install(){
    const participants=byId('adminParticipantList')?.closest('.admin-participants-box');
    if(!participants)return;

    if(!byId('v20AdminCoachingMode')){
      const field=document.createElement('label');
      field.className='v20-admin-coaching-mode';
      field.innerHTML='Coaching type<select id="v20AdminCoachingMode"><option value="private">Private Coaching</option><option value="group">Group Drills Training</option></select><small id="v20AdminRateBreakdown"></small>';
      participants.insertAdjacentElement('beforebegin',field);
    }

    const rate=byId('ratePerPerson');
    const rateLabel=rate?.closest('label');
    if(rateLabel){
      const textNode=[...rateLabel.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
      if(textNode)textNode.textContent='Hourly coaching rate';
    }
    const standardOption=byId('rateMode')?.querySelector('option[value="standard"]');
    if(standardOption)standardOption.textContent='Standard coaching rate';
    const customOption=byId('rateMode')?.querySelector('option[value="custom"]');
    if(customOption)customOption.textContent='Custom hourly rate';

    updateRate=function(){updateAdminPricing();};
    updateTotal=function(){updateAdminPricing();};

    const modeSel=byId('v20AdminCoachingMode');
    modeSel.onchange=()=>{
      populateCounts(modeSel.value);
      if(typeof v17dRenderAdminParticipants==='function')v17dRenderAdminParticipants(Number(byId('participantCount').value));
      updateAdminPricing();
    };
    byId('participantCount').onchange=()=>{
      const n=Number(byId('participantCount').value);
      if(typeof v17dRenderAdminParticipants==='function')v17dRenderAdminParticipants(n);
      updateAdminPricing();
    };
    byId('rateMode').onchange=updateAdminPricing;
    rate.oninput=()=>{if(byId('rateMode').value==='custom')updateAdminPricing();};
    byId('bookingStart').addEventListener('change',()=>setTimeout(updateAdminPricing,0));
    byId('bookingEnd').addEventListener('change',()=>setTimeout(updateAdminPricing,0));

    populateCounts(modeSel.value||'private',Number(byId('participantCount').value||1));
    if(typeof v17dRenderAdminParticipants==='function')v17dRenderAdminParticipants(Number(byId('participantCount').value||1));
    updateAdminPricing();

    window.pickylaV20AdminPricing={
      hourlyTotal:()=>Number(rate.value||0),
      standardHourly,
      coachingType:()=>modeSel.value==='group'?'Group Drills Training':'Private Coaching',
      mode:()=>modeSel.value,
      setForCount:(n,type,quotedRate)=>{
        const mode=/group drills/i.test(String(type||''))||Number(n)>=4?'group':'private';
        modeSel.value=mode;populateCounts(mode,n);byId('participantCount').value=String(n);
        byId('rateMode').value='standard';
        updateAdminPricing();
        if(Number(quotedRate)>0&&Math.abs(Number(quotedRate)-standardHourly())>0.001){
          byId('rateMode').value='custom';rate.readOnly=false;rate.value=Number(quotedRate).toFixed(2);updateAdminPricing();
        }
      }
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
})();