// PICKYLA v20 Batch 2 - Admin booking court + confirmation workflow
(function(){
  const byId=id=>document.getElementById(id);
  const COURTS=['NANOMOLY','DINK VALLEY','HC SANTIAGO','CASA PLAY','COURTYARD','OTHERS'];

  function clean(v){return String(v||'').trim().replace(/\s+/g,' ');}
  function courtFromText(text){
    const m=String(text||'').match(/^Court:\s*(.+)$/mi);
    const value=clean(m?.[1]||'');return /^(not decided yet|to be decided|tbd|none)$/i.test(value)?'':value;
  }
  function courtFromBooking(b){return clean(b?.court_name)||courtFromText(b?.notes)||'Not specified';}
  function stripCourtLine(text){return String(text||'').replace(/^Court:\s*.+(?:\r?\n)?/mi,'').trim();}
  function getCourt(){
    const select=byId('v20AdminCourt');
    if(!select||!select.value)return '';
    if(select.value==='OTHERS')return clean(byId('v20AdminCourtOther')?.value);
    return select.value;
  }
  function setCourt(value){
    value=clean(value);
    const select=byId('v20AdminCourt'),other=byId('v20AdminCourtOther');
    if(!select)return;
    if(!value){select.value='';if(other)other.value='';syncOther();return;}
    if(COURTS.includes(value.toUpperCase())&&value.toUpperCase()!=='OTHERS'){
      select.value=value.toUpperCase();if(other)other.value='';
    }else{
      select.value='OTHERS';if(other)other.value=value;
    }
    syncOther();
  }
  function syncOther(){
    const select=byId('v20AdminCourt'),wrap=byId('v20AdminCourtOtherWrap'),input=byId('v20AdminCourtOther');
    const isOther=select?.value==='OTHERS';
    if(wrap)wrap.classList.toggle('hidden',!isOther);
    if(input){input.required=!!isOther;if(!isOther)input.value='';}
  }
  function ensureUi(){
    if(byId('v20AdminCourtWrap'))return true;
    const participants=byId('adminParticipantList')?.closest('.admin-participants-box');
    if(!participants)return false;
    const wrap=document.createElement('div');
    wrap.id='v20AdminCourtWrap';
    wrap.className='full v20-admin-court-wrap';
    wrap.innerHTML='<div class="v20-admin-court-grid"><label>Court <small>(optional — can be added later)</small><select id="v20AdminCourt"><option value="">Court not decided yet</option>'+
      COURTS.map(c=>'<option value="'+c+'">'+c+'</option>').join('')+
      '</select></label><label id="v20AdminCourtOtherWrap" class="hidden">Other court<input id="v20AdminCourtOther" maxlength="120" placeholder="Enter court name"></label></div>'+
      '<small>Court fee remains separate from Pickyla coaching income.</small>';
    participants.insertAdjacentElement('afterend',wrap);
    byId('v20AdminCourt').addEventListener('change',syncOther);
    return true;
  }
  function wrapBookingSubmit(){
    const form=byId('quickBookingForm'),notes=byId('bookingNotes');
    if(!form||!notes||!form.onsubmit||window.__pickylaV20CourtSubmit)return;
    window.__pickylaV20CourtSubmit=true;
    const prior=form.onsubmit;
    form.onsubmit=async function(e){
      const court=getCourt();
      const original=stripCourtLine(notes.value);
      const injected=court?('Court: '+court+(original?'\n'+original:'')):original;
      notes.value=injected;
      try{
        await prior.call(this,e);
        if(notes.value===''){
          setCourt('');
          setTimeout(()=>window.pickylaV20Ops?.refresh?.(),250);
        }else if(court&&notes.value.startsWith('Court: '+court)){
          notes.value=original;
        }
      }catch(err){
        notes.value=original;
        throw err;
      }
    };
  }
  function wrapInquiryLoader(){
    if(typeof v17dLoadInquiryToBooking!=='function'||window.__pickylaV20CourtInquiry)return;
    window.__pickylaV20CourtInquiry=true;
    const prior=v17dLoadInquiryToBooking;
    v17dLoadInquiryToBooking=async function(i){
      await prior(i);
      setCourt(courtFromText(i?.source_text));
    };
  }
  function wirePasteParser(){
    const btn=byId('parseBtn'),box=byId('pasteInquiry');
    if(!btn||!box||btn.dataset.v20Court)return;
    btn.dataset.v20Court='1';
    btn.addEventListener('click',()=>{
      const court=courtFromText(box.value);
      if(court)setCourt(court);
    });
  }
  function wireManualShortcut(){
    const host=document.querySelector('#v20OperationsFlow .v20-ops-heading');
    if(!host||byId('v20ManualBookingBtn'))return;
    const btn=document.createElement('button');
    btn.id='v20ManualBookingBtn';btn.type='button';btn.className='secondary v20-manual-booking-btn';btn.textContent='+ Manual Booking';
    btn.onclick=()=>{byId('bookingToolsSection')?.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>byId('bookingDate')?.focus(),450);};
    host.appendChild(btn);
  }
  function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
  function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines=2){
    const words=String(text||'').split(/\s+/),lines=[];let line='';
    for(const word of words){const test=line?line+' '+word:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word;}else line=test;}
    if(line)lines.push(line);
    lines.slice(0,maxLines).forEach((l,i)=>ctx.fillText(l,x,y+i*lineHeight));
    return y+(Math.min(lines.length,maxLines)-1)*lineHeight;
  }
  function image(src){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});}
  function replaceConfirmationGenerator(){
    if(typeof generateConfirmationCard!=='function'||window.__pickylaV20CourtCard)return;
    window.__pickylaV20CourtCard=true;
    generateConfirmationCard=async function(b){
      const c=document.createElement('canvas');c.width=1080;c.height=1350;const x=c.getContext('2d');
      x.fillStyle='#111';x.fillRect(0,0,c.width,c.height);x.fillStyle='#f5c400';x.fillRect(0,0,c.width,18);x.fillRect(0,1332,c.width,18);
      try{const logo=await image('pickyla-emblem-final.png');x.drawImage(logo,70,70,150,150);}catch(_e){}
      x.fillStyle='#f5c400';x.font='800 28px Manrope, Arial';x.fillText('PICKYLA',250,120);
      x.fillStyle='#fff';x.font='800 54px Manrope, Arial';x.fillText('BOOKING CONFIRMED',70,305);
      x.fillStyle='#aaa';x.font='600 24px Arial';x.fillText('Pickleball Coaching • Santiago City, Isabela',70,350);
      x.fillStyle='#222';roundRect(x,70,405,940,750,34);x.fill();
      const rows=[
        ['PLAYER',b.client_name],
        ['DATE',new Date(String(b.session_date)+'T12:00:00').toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric',year:'numeric'})],
        ['TIME',(typeof hourName==='function'?hourName(Number(b.start_hour)):b.start_hour)+' – '+(typeof hourName==='function'?hourName(Number(b.end_hour)):b.end_hour)],
        ['PLAYERS',(b.participant_count||1)+' player'+(Number(b.participant_count||1)===1?'':'s')],
        ['COURT',courtFromBooking(b)],
        ['COACHING',b.coaching_type||'Pickleball Coaching']
      ];
      if(b.client_program_id)rows.push(['PROGRAM SESSION','Session '+(b.program_session_number||'—')]);
      let yy=475;
      for(const [label,value] of rows){
        x.fillStyle='#f5c400';x.font='800 18px Arial';x.fillText(label,120,yy);
        x.fillStyle='#fff';x.font='700 27px Manrope, Arial';yy=wrapText(x,value,120,yy+38,820,34,2)+32;
      }
      const p=typeof paymentState==='function'?paymentState(b):{balance:Math.max(0,Number(b.total_amount||0)-Number(b.amount_paid||0))};
      x.fillStyle='#f5c400';x.font='800 19px Arial';x.fillText('PAYMENT',120,1080);
      x.fillStyle='#fff';x.font='700 28px Manrope, Arial';x.fillText(b.client_program_id?'Program package payment tracked separately':(p.balance<=0?'Fully Collected':(typeof peso==='function'?peso(p.balance):money(p.balance))+' outstanding'),120,1122);
      x.fillStyle='#aaa';x.font='500 20px Arial';x.fillText('Court fee is separate from the coaching fee.',70,1210);
      x.fillText('Please message Pickyla if you need to change your schedule.',70,1245);
      x.textAlign='center';x.fillStyle='#777';x.font='600 14px Arial';x.fillText('© 2026 XBALANCED DIGITAL SOLUTIONS',540,1305);x.textAlign='left';
      return c.toDataURL('image/png');
    };
  }
  function money(v){return '₱'+Number(v||0).toLocaleString('en-PH',{maximumFractionDigits:2});}

  function install(){
    if(!ensureUi())return;
    syncOther();
    wrapBookingSubmit();
    wrapInquiryLoader();
    wirePasteParser();
    wireManualShortcut();
    replaceConfirmationGenerator();
    window.pickylaV20Court={get:getCourt,set:setCourt,fromText:courtFromText,fromBooking:courtFromBooking,options:[...COURTS],stripCourtLine};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,0),{once:true});else setTimeout(install,0);
})();