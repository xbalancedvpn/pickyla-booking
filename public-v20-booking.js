// PICKYLA v20 Batch 2 - public booking court workflow
(function(){
  const byId=id=>document.getElementById(id);
  const COURTS=['NANOMOLY','DINK VALLEY','HOMECOURT','CASA PLAY','OTHERS'];

  function clean(v){return String(v||'').trim().replace(/\s+/g,' ');}
  function courtValue(){
    const select=byId('v20PublicCourt');
    if(!select||!select.value)return '';
    if(select.value==='OTHERS')return clean(byId('v20PublicCourtOther')?.value);
    return select.value;
  }
  function insertCourt(text,court){
    if(!text||!court)return text||'';
    if(/^Court:\s*.+$/mi.test(text))return text.replace(/^Court:\s*.+$/mi,'Court: '+court);
    if(/\nCourt Fee:/i.test(text))return text.replace(/\nCourt Fee:/i,'\nCourt: '+court+'\nCourt Fee:');
    if(/\nVenue:/i.test(text))return text.replace(/\nVenue:/i,'\nCourt: '+court+'\nVenue:');
    return text+'\nCourt: '+court;
  }
  function syncOther(){
    const select=byId('v20PublicCourt'),wrap=byId('v20PublicCourtOtherWrap'),input=byId('v20PublicCourtOther');
    const other=select?.value==='OTHERS';
    if(wrap)wrap.classList.toggle('hidden',!other);
    if(input){input.required=!!other;if(!other)input.value='';}
  }
  function ensureUi(){
    if(byId('v20PublicCourtArea'))return true;
    const packageArea=document.querySelector('#booking .package-area');
    if(!packageArea)return false;
    const area=document.createElement('div');
    area.id='v20PublicCourtArea';
    area.className='v20-public-court-area';
    area.innerHTML='<span class="step">STEP 4</span><h3>Choose court</h3>'+
      '<p class="v20-public-court-note">Court fee is separate. Select where you prefer the coaching session to be held.</p>'+
      '<div class="v20-public-court-grid"><label>Court<select id="v20PublicCourt" required><option value="">Select court</option>'+
      COURTS.map(c=>'<option value="'+c+'">'+c+'</option>').join('')+
      '</select></label><label id="v20PublicCourtOtherWrap" class="hidden">Other court<input id="v20PublicCourtOther" type="text" maxlength="120" placeholder="Enter court name"></label></div>';
    packageArea.insertAdjacentElement('afterend',area);
    const details=document.querySelector('#booking .participant-details');
    if(details){
      const step=details.querySelector('.step');
      if(step)step.textContent='STEP 5';
    }
    byId('v20PublicCourt').addEventListener('change',()=>{syncOther();if(typeof updateSummary==='function')updateSummary();});
    byId('v20PublicCourtOther').addEventListener('input',()=>{if(typeof updateSummary==='function')updateSummary();});
    return true;
  }
  function install(){
    if(!ensureUi())return;
    if(typeof bookingMessage==='function'&&!window.__pickylaV20PublicCourtMessage){
      window.__pickylaV20PublicCourtMessage=true;
      const priorBookingMessage=bookingMessage;
      bookingMessage=function(){
        const court=courtValue();
        if(!court)return '';
        return insertCourt(priorBookingMessage(),court);
      };
    }
    if(typeof updateSummary==='function'&&!window.__pickylaV20PublicCourtSummary){
      window.__pickylaV20PublicCourtSummary=true;
      const priorUpdateSummary=updateSummary;
      updateSummary=function(){
        priorUpdateSummary();
        const court=courtValue();
        const send=byId('sendRequestButton'),copy=byId('copyButton'),open=byId('copyOpenButton'),summary=byId('summaryText');
        const otherwiseReady=send&&!send.classList.contains('disabled');
        if(!court&&otherwiseReady){
          [send,copy,open].filter(Boolean).forEach(b=>b.classList.add('disabled'));
          if(summary)summary.textContent='Booking details ready • Select a court to continue.';
          return;
        }
        if(court&&otherwiseReady&&summary&&!summary.textContent.includes('Court:')){
          summary.textContent+=' • Court: '+court;
        }
      };
    }
    syncOther();
    if(typeof updateSummary==='function')updateSummary();
    window.pickylaV20PublicCourt={value:courtValue};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();