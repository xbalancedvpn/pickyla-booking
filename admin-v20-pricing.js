// PICKYLA v20 - Admin coaching pricing
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
    const min=mode==='group'?4:1,max=mode==='group'?12:3;
    const current=Number(keep||sel.value||min);
    sel.innerHTML='';
    for(let n=min;n<=max;n++){
      const o=document.createElement('option');o.value=String(n);o.textContent=n+' player'+(n===1?'':'s');sel.appendChild(o);
    }
    sel.value=String(Math.min(max,Math.max(min,current)));
  }
  function updateAdminPricing(){
    const mode=byId('v20AdminCoachingMode')?.value||'private';
    const n=Number(byId('participantCount')?.value||1);
    if(!validRange(mode,n)){populateCounts(mode);return updateAdminPricing();}
    const duration=Math.max(1,Number(byId('bookingEnd')?.value||9)-Number(byId('bookingStart')?.value||8));
    const hourly=hourly20(n,mode),total=hourly*duration;
    if(byId('rateMode')?.value==='standard'){
      // Existing schema is per-person/hour. Store an effective per-person rate so total_amount remains correct.
      byId('ratePerPerson').value=(hourly/n).toFixed(2);
      byId('ratePerPerson').readOnly=true;
    }
    const totalEl=byId('bookingTotal'),calc=byId('bookingCalc'),note=byId('v20AdminRateBreakdown');
    if(totalEl)totalEl.textContent=peso20(total);
    if(calc)calc.textContent=duration+' hr × '+(mode==='group'?(n+' players × ₱250'):(n===1?'₱400 base':'₱400 + '+(n-1)+' × ₱200'))+' = '+peso20(total);
    if(note)note.textContent=mode==='group'
      ? 'Group Drills Training • ₱250 per player per hour • 4–12 players'
      : 'Private Coaching • ₱400/hour for Player 1 + ₱200/hour per additional player • 1–3 players';
  }
  function install(){
    const participants=byId('adminParticipantList')?.closest('.admin-participants-box');
    if(!participants||byId('v20AdminCoachingMode'))return;
    const field=document.createElement('label');
    field.className='v20-admin-coaching-mode';
    field.innerHTML='Coaching type<select id="v20AdminCoachingMode"><option value="private">Private Coaching</option><option value="group">Group Drills Training</option></select><small id="v20AdminRateBreakdown"></small>';
    participants.insertAdjacentElement('beforebegin',field);

    const originalUpdateRate=typeof updateRate==='function'?updateRate:null;
    const originalUpdateTotal=typeof updateTotal==='function'?updateTotal:null;
    updateRate=function(){
      const mode=byId('v20AdminCoachingMode')?.value||'private';
      if(byId('rateMode')?.value==='standard'){
        const n=Number(byId('participantCount')?.value||1);
        byId('ratePerPerson').value=(hourly20(n,mode)/n).toFixed(2);
        byId('ratePerPerson').readOnly=true;
      }else{
        byId('ratePerPerson').readOnly=false;
      }
      updateAdminPricing();
    };
    updateTotal=function(){
      if(byId('rateMode')?.value==='standard')return updateAdminPricing();
      if(originalUpdateTotal)originalUpdateTotal();
    };

    const modeSel=byId('v20AdminCoachingMode');
    modeSel.onchange=()=>{
      populateCounts(modeSel.value);
      if(typeof v17dRenderAdminParticipants==='function')v17dRenderAdminParticipants(Number(byId('participantCount').value));
      updateRate();
    };
    byId('participantCount').onchange=()=>{
      const n=Number(byId('participantCount').value);
      if(typeof v17dRenderAdminParticipants==='function')v17dRenderAdminParticipants(n);
      updateRate();
    };
    byId('rateMode').onchange=updateRate;
    byId('ratePerPerson').oninput=()=>{if(byId('rateMode').value==='custom'&&originalUpdateTotal)originalUpdateTotal();};
    byId('bookingStart').addEventListener('change',()=>setTimeout(updateAdminPricing,0));
    byId('bookingEnd').addEventListener('change',()=>setTimeout(updateAdminPricing,0));

    populateCounts('private',1);
    if(typeof v17dRenderAdminParticipants==='function')v17dRenderAdminParticipants(1);
    updateRate();

    window.pickylaV20AdminPricing={
      hourlyTotal:()=>hourly20(Number(byId('participantCount')?.value||1),modeSel.value),
      coachingType:()=>modeSel.value==='group'?'Group Drills Training':'Private Coaching',
      mode:()=>modeSel.value,
      setForCount:(n,type)=>{
        const mode=/group drills/i.test(String(type||''))||Number(n)>=4?'group':'private';
        modeSel.value=mode;populateCounts(mode,n);byId('participantCount').value=String(n);updateRate();
      }
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
})();