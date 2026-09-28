// PICKYLA v20 - final turnover pack
// Header shortcuts, finance exclusions/review, private/public weekly cards, and share filenames.
(function(){
  const byId=id=>document.getElementById(id);
  const FINANCE_MARKER='[FINANCE_EXCLUDE]';
  let financeRows=[];
  let confirmationContext=null;
  let weeklyCopies={coach:null,gc:null,start:'',end:''};

  const pad=n=>String(n).padStart(2,'0');
  const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const peso20=n=>'₱'+Number(n||0).toLocaleString('en-PH',{maximumFractionDigits:2});
  const safeFile=v=>String(v||'player').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,48)||'player';
  const isCancelled=b=>b?.status==='cancelled'||['client_cancelled','coach_cancelled','cancelled'].includes(b?.session_status);
  function hasAutoExclude(b){
    const outcome=String(b?.session_outcome_note||'');
    const notes=String(b?.notes||'');
    const name=String(b?.client_name||'').trim();
    return /\b(test|testing|void|refund|refunded)\b/i.test(outcome+' '+notes)||/^(test|testing)(\s|$)/i.test(name);
  }
  function isFinanceExcluded(b){
    return isCancelled(b)||String(b?.session_outcome_note||'').includes(FINANCE_MARKER)||hasAutoExclude(b);
  }

  function installHeaderShortcuts(){
    const host=document.querySelector('.v20-premium-topbar .admin-top-actions');
    if(!host||byId('v20HeaderNewBooking'))return;
    const wrap=document.createElement('div');
    wrap.className='v20-turnover-shortcuts';
    wrap.innerHTML='<button id="v20HeaderNewBooking" type="button" title="Go to New Booking"><span>＋</span><b>New Booking</b></button>'+
      '<button id="v20HeaderBlockSchedule" type="button" title="Go to Block Schedule"><span>▦</span><b>Block Sched</b></button>';
    host.prepend(wrap);
    byId('v20HeaderNewBooking').onclick=()=>{
      const target=byId('quickBookingForm')||byId('bookingToolsSection');
      target?.scrollIntoView({behavior:'smooth',block:'start'});
      setTimeout(()=>byId('bookingDate')?.focus(),420);
    };
    byId('v20HeaderBlockSchedule').onclick=()=>{
      const target=byId('v20ScheduleBlockSection');
      target?.scrollIntoView({behavior:'smooth',block:'start'});
      setTimeout(()=>byId('v20BlockDate')?.focus(),420);
    };
  }

  function ensureFinanceReview(){
    if(byId('v20FinanceReview'))return;
    const anchor=byId('paymentDashboardSection');
    if(!anchor)return;
    const section=document.createElement('section');
    section.id='v20FinanceReview';
    section.className='panel v20-finance-review';
    section.innerHTML='<div class="panel-head"><div><span class="eyebrow">FINANCE REVIEW</span><h2>Income integrity check</h2><p class="panel-note">Cancelled, test, void, refund, and manually excluded sessions stay in history but are not counted in earnings.</p></div><span class="panel-tag">AUDIT</span></div>'+
      '<div class="v20-finance-review-grid">'+
        '<article><span>Earned • Completed</span><strong id="v20FinanceEarned">₱0</strong><small>Valid completed coaching value</small></article>'+
        '<article><span>Excluded / Cancelled</span><strong id="v20FinanceExcluded">₱0</strong><small>Booking value removed from earnings</small></article>'+
        '<article class="review"><span>Payments to Review</span><strong id="v20FinanceReviewAmount">₱0</strong><small>Cash recorded against excluded sessions</small></article>'+
      '</div>'+
      '<div id="v20FinanceReviewList" class="v20-finance-review-list"><div class="empty">No excluded payments need review.</div></div>';
    anchor.before(section);
  }

  async function renderFinanceReview(rows){
    ensureFinanceReview();
    financeRows=rows||[];
    const valid=financeRows.filter(b=>!isFinanceExcluded(b));
    const excluded=financeRows.filter(isFinanceExcluded);
    const earned=valid.filter(b=>b.session_status==='completed').reduce((a,b)=>a+Number(b.total_amount||0),0);
    const excludedValue=excluded.reduce((a,b)=>a+Number(b.total_amount||0),0);
    const ids=excluded.map(b=>b.id).filter(Boolean);
    const paidMap=new Map();
    if(ids.length&&typeof db!=='undefined'){
      const {data,error}=await db.from('booking_payments').select('booking_id,amount').in('booking_id',ids);
      if(!error)(data||[]).forEach(p=>{
        const k=String(p.booking_id);
        paidMap.set(k,(paidMap.get(k)||0)+Number(p.amount||0));
      });
    }
    const reviewRows=excluded.map(b=>({...b,_reviewPaid:Number(paidMap.get(String(b.id)) ?? b.amount_paid ?? 0)}))
      .filter(b=>b._reviewPaid>0.001)
      .sort((a,b)=>String(b.session_closed_at||b.session_date||'').localeCompare(String(a.session_closed_at||a.session_date||'')));
    const reviewAmount=reviewRows.reduce((a,b)=>a+b._reviewPaid,0);
    if(byId('v20FinanceEarned'))byId('v20FinanceEarned').textContent=peso20(earned);
    if(byId('v20FinanceExcluded'))byId('v20FinanceExcluded').textContent=peso20(excludedValue);
    if(byId('v20FinanceReviewAmount'))byId('v20FinanceReviewAmount').textContent=peso20(reviewAmount);
    const list=byId('v20FinanceReviewList');
    if(!list)return;
    if(!reviewRows.length){
      list.innerHTML='<div class="empty">No cancelled/excluded payments need refund or credit review.</div>';
      return;
    }
    list.innerHTML=reviewRows.slice(0,6).map(b=>{
      const reason=isCancelled(b)?(b.session_status==='client_cancelled'?'Player cancelled':b.session_status==='coach_cancelled'?'Coach cancelled':'Cancelled'):(hasAutoExclude(b)?'Test / void / refund excluded':'Excluded from income');
      return '<div class="v20-finance-review-row"><div><strong>'+escapeHtml20(b.client_name||'Player')+'</strong><span>'+escapeHtml20(b.session_date||'')+' • '+escapeHtml20(reason)+'</span></div><b>'+peso20(b._reviewPaid)+'</b></div>';
    }).join('')+'<p class="v20-finance-review-note">These payments are not counted as earnings. Review whether a refund, credit, or other settlement is required.</p>';
  }

  function escapeHtml20(v){
    return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function installFinancialReportFilter(){
    if(window.__pickylaV20TurnoverReports)return;
    window.__pickylaV20TurnoverReports=true;
    if(typeof loadReports!=='function')return;
    loadReports=async function(){
      const {data,error}=await db.from('bookings').select('id,client_name,session_date,start_hour,end_hour,total_amount,amount_paid,status,session_status,session_closed_at,session_outcome_note,notes,participant_count');
      if(error)return;
      const rows=data||[];
      const active=rows.filter(b=>!isFinanceExcluded(b));
      const now=new Date(),today=ymd(now);
      const weekStart=new Date(now);weekStart.setHours(0,0,0,0);weekStart.setDate(now.getDate()-((now.getDay()+6)%7));
      const weekEnd=new Date(weekStart);weekEnd.setDate(weekStart.getDate()+6);
      const monthStart=new Date(now.getFullYear(),now.getMonth(),1),monthEnd=new Date(now.getFullYear(),now.getMonth()+1,0);
      const calc=(arr,prefix)=>{
        const gross=arr.reduce((a,b)=>a+Number(b.total_amount||0),0);
        const paid=arr.reduce((a,b)=>a+Number(b.amount_paid||0),0);
        const g=byId(prefix+'Gross'),m=byId(prefix+'Meta');
        if(g)g.textContent=peso20(gross);
        if(m)m.textContent=arr.length+' session(s) • '+peso20(paid)+' collected';
      };
      calc(active.filter(b=>b.session_date===today),'today');
      calc(active.filter(b=>b.session_date>=ymd(weekStart)&&b.session_date<=ymd(weekEnd)),'week');
      const monthRows=active.filter(b=>b.session_date>=ymd(monthStart)&&b.session_date<=ymd(monthEnd));
      calc(monthRows,'month');
      calc(active,'all');
      const mh=byId('monthHours');if(mh)mh.textContent=monthRows.reduce((a,b)=>a+(Number(b.end_hour)-Number(b.start_hour)),0);
      const cc=byId('cancelCount');if(cc)cc.textContent=rows.filter(isCancelled).length;
      if(typeof renderCharts==='function')renderCharts(active);
      await renderFinanceReview(rows);
    };
  }

  function parseBlockReason(notes){
    const s=String(notes||'').trim();
    if(!s)return {reason:'Blocked',isPublic:false};
    if(s.startsWith('PUBLIC:'))return {reason:s.slice(7).trim()||'Blocked',isPublic:true};
    if(s.startsWith('PRIVATE:'))return {reason:s.slice(8).trim()||'Blocked',isPublic:false};
    return {reason:s,isPublic:false};
  }
  function blockStyle(reason){
    const r=String(reason||'').toLowerCase();
    if(r.includes('training'))return {bg:'#dbe9ff',fg:'#244c82'};
    if(r.includes('tournament'))return {bg:'#fff0b8',fg:'#725600'};
    if(r.includes('personal'))return {bg:'#eee4fb',fg:'#5c4281'};
    if(r.includes('rest'))return {bg:'#deede4',fg:'#345747'};
    if(r.includes('other'))return {bg:'#eadfd5',fg:'#6b4c37'};
    return {bg:'#d9d9d9',fg:'#4e4e4e'};
  }
  function firstName(name){
    const s=String(name||'').trim();
    return s?s.split(/\s+/)[0]:'Booked';
  }
  function rounded(ctx,x,y,w,h,r,fill){
    ctx.beginPath();
    if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);
    else{ctx.rect(x,y,w,h);}
    ctx.fillStyle=fill;ctx.fill();
  }
  function fitFont(ctx,text,maxWidth,start=19,min=10){
    let size=start;
    while(size>min){ctx.font='800 '+size+'px Arial, sans-serif';if(ctx.measureText(text).width<=maxWidth)break;size--;}
    return size;
  }
  function imgLoad(src){
    return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;});
  }
  async function fetchDetailedWeek(start,end){
    const {data,error}=await db.from('schedule_slots').select('slot_date,start_hour,status,client_name,notes').gte('slot_date',start).lte('slot_date',end).order('slot_date').order('start_hour');
    if(error)throw error;
    return data||[];
  }
  function monday(input){
    const d=input instanceof Date?new Date(input):new Date(String(input||ymd(new Date()))+'T12:00:00');
    d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d;
  }
  function weekDays(input){
    const start=monday(input),out=[];
    for(let i=0;i<7;i++){const d=new Date(start);d.setDate(start.getDate()+i);out.push(d);}
    return out;
  }
  function hourText(h){
    h=Number(h);const name=v=>v===24?'12:00 MN':((v%12||12)+':00 '+(v<12?'AM':'PM'));
    return name(h)+' – '+name(h+1);
  }
  function rangeText(days){
    const a=days[0],b=days[6],sameYear=a.getFullYear()===b.getFullYear();
    return a.toLocaleDateString('en-PH',{month:'short',day:'numeric',year:sameYear?undefined:'numeric'})+' – '+b.toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'});
  }
  async function drawWeekly(rows,days,variant){
    const W=1920,H=1320,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
    x.fillStyle='#f8f8f6';x.fillRect(0,0,W,H);
    x.fillStyle='#111';x.fillRect(0,0,W,178);x.fillStyle='#f5c400';x.fillRect(0,174,W,4);
    try{
      const emblem=await imgLoad('pickyla-emblem-final.png');
      x.save();x.beginPath();if(x.roundRect)x.roundRect(56,24,130,130,18);else x.rect(56,24,130,130);x.clip();x.drawImage(emblem,56,24,130,130);x.restore();
    }catch(_e){}
    x.fillStyle='#fff';x.font='900 58px Arial, sans-serif';x.fillText('PICKYLA',218,78);
    x.fillStyle='#f5c400';x.font='800 24px Arial, sans-serif';x.fillText(variant==='coach'?'COACH WEEKLY SCHEDULE':'PLAYER / GC WEEKLY SCHEDULE',220,118);
    x.fillStyle='#d9d9d9';x.font='500 22px Arial, sans-serif';x.fillText(rangeText(days),220,150);
    x.textAlign='right';x.fillStyle='#fff';x.font='700 23px Arial, sans-serif';x.fillText('MONDAY → SUNDAY',W-66,76);
    x.fillStyle='#bdbdbd';x.font='500 19px Arial, sans-serif';x.fillText('8:00 AM – 12:00 Midnight',W-66,111);
    x.fillStyle='#f5c400';x.font='700 18px Arial, sans-serif';x.fillText(variant==='coach'?'INTERNAL COACH COPY':'PRIVACY-SAFE SHARE COPY',W-66,145);x.textAlign='left';

    const left=55,top=215,timeW=245,gridW=W-left*2,dayW=(gridW-timeW)/7,headH=82,rowH=55;
    rounded(x,left,top,timeW,headH,10,'#111');x.fillStyle='#fff';x.textAlign='center';x.font='800 24px Arial, sans-serif';x.fillText('TIME',left+timeW/2,top+50);
    const names=['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
    names.forEach((name,i)=>{
      const xx=left+timeW+i*dayW;rounded(x,xx+2,top,dayW-4,headH,10,'#111');
      x.fillStyle='#fff';x.font='800 21px Arial, sans-serif';x.fillText(name,xx+dayW/2,top+32);
      x.fillStyle='#f5c400';x.font='700 16px Arial, sans-serif';x.fillText(days[i].toLocaleDateString('en-PH',{month:'short',day:'numeric'}).toUpperCase(),xx+dayW/2,top+58);
    });
    const map=new Map(rows.map(r=>[r.slot_date+'|'+Number(r.start_hour),r]));
    const now=new Date();
    for(let h=8;h<24;h++){
      const row=h-8,yy=top+headH+row*rowH;
      rounded(x,left,yy+2,timeW,rowH-4,8,'#eeeeec');x.fillStyle='#202020';x.font='700 16px Arial, sans-serif';x.fillText(hourText(h),left+timeW/2,yy+34);
      for(let i=0;i<7;i++){
        const ds=ymd(days[i]),xx=left+timeW+i*dayW,r=map.get(ds+'|'+h),status=r?.status||'available';
        let bg='#dff4df',fg='#215b29',label='AVAILABLE',sub='';
        if(status==='booked'){
          bg='#f6c5c5';fg='#8f2020';
          if(variant==='coach'){label=firstName(r?.client_name);sub='BOOKED';}
          else label='BOOKED';
        }else if(status==='unavailable'){
          const info=parseBlockReason(r?.notes),showReason=variant==='coach'||info.isPublic;
          label=showReason?info.reason.toUpperCase():'BLOCKED';
          const st=showReason?blockStyle(info.reason):blockStyle('');
          bg=st.bg;fg=st.fg;
        }else{
          const slot=new Date(days[i]);slot.setHours(h,0,0,0);
          if(slot<=now){bg='#eeeeec';fg='#8a8a86';label='PAST';}
        }
        rounded(x,xx+2,yy+2,dayW-4,rowH-4,8,bg);
        const fs=fitFont(x,label,dayW-20,sub?17:19,10);x.font='800 '+fs+'px Arial, sans-serif';x.fillStyle=fg;
        x.fillText(label,xx+dayW/2,yy+(sub?27:34));
        if(sub){x.font='700 9px Arial, sans-serif';x.fillText(sub,xx+dayW/2,yy+43);}
      }
    }
    x.textAlign='left';
    const footerY=top+headH+16*rowH+30;
    x.fillStyle='#111';x.font='800 21px Arial, sans-serif';x.fillText('STATUS',left,footerY+28);
    const legend=[['#dff4df','#215b29','AVAILABLE'],['#f6c5c5','#8f2020','BOOKED'],['#d9d9d9','#4e4e4e','BLOCKED'],['#eeeeec','#8a8a86','PAST']];
    legend.forEach((it,i)=>{const xx=left+120+i*250;rounded(x,xx,footerY,218,44,10,it[0]);x.fillStyle=it[1];x.font='800 16px Arial, sans-serif';x.textAlign='center';x.fillText(it[2],xx+109,footerY+28);});
    x.textAlign='right';x.fillStyle='#7b7b7b';x.font='500 15px Arial, sans-serif';x.fillText(variant==='coach'?'Names and coach block reasons included':'Player names and private reasons hidden',W-left,footerY+27);
    x.textAlign='center';x.fillStyle='#8a8a8a';x.font='600 14px Arial, sans-serif';x.fillText('©2026 XBALANCED DIGITAL SOLUTIONS',W/2,H-28);
    return c.toDataURL('image/png',1);
  }

  function ensureWeeklyActions(){
    const actions=byId('weeklyPreviewWrap')?.querySelector('.weekly-preview-actions');
    if(!actions)return;
    const old=byId('downloadWeeklyBtn');
    if(old)old.textContent='Download Player / GC Copy';
    if(!byId('downloadWeeklyCoachBtn')){
      const coach=document.createElement('button');coach.id='downloadWeeklyCoachBtn';coach.type='button';coach.className='secondary';coach.textContent='Download Coach Copy';
      actions.insertBefore(coach,old||actions.firstChild);
    }
    if(!byId('weeklyPreviewCoachBtn')){
      const switcher=document.createElement('div');switcher.className='v20-weekly-preview-switch';
      switcher.innerHTML='<button id="weeklyPreviewCoachBtn" type="button">Preview Coach</button><button id="weeklyPreviewGcBtn" type="button" class="active">Preview Player / GC</button>';
      actions.prepend(switcher);
    }
    byId('weeklyPreviewCoachBtn').onclick=()=>{
      if(weeklyCopies.coach){byId('weeklyPreview').src=weeklyCopies.coach;byId('weeklyPreviewCoachBtn').classList.add('active');byId('weeklyPreviewGcBtn').classList.remove('active');}
    };
    byId('weeklyPreviewGcBtn').onclick=()=>{
      if(weeklyCopies.gc){byId('weeklyPreview').src=weeklyCopies.gc;byId('weeklyPreviewGcBtn').classList.add('active');byId('weeklyPreviewCoachBtn').classList.remove('active');}
    };
    byId('downloadWeeklyCoachBtn').onclick=()=>downloadData(weeklyCopies.coach,'pickyla-weekly-schedule-coach-'+weeklyCopies.start+'-to-'+weeklyCopies.end+'.png');
    if(old)old.onclick=()=>downloadData(weeklyCopies.gc,'pickyla-weekly-schedule-player-gc-'+weeklyCopies.start+'-to-'+weeklyCopies.end+'.png');
  }
  function downloadData(url,filename){
    if(!url)return;
    const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
  }
  function installWeeklyExports(){
    ensureWeeklyActions();
    if(typeof generateWeeklyScheduleImage!=='function'||window.__pickylaV20TurnoverWeekly)return;
    window.__pickylaV20TurnoverWeekly=true;
    generateWeeklyScheduleImage=async function(){
      const btn=byId('generateWeeklyBtn'),input=byId('weeklyWeekDate');if(!btn||!input)return;
      const old=btn.textContent;btn.disabled=true;btn.textContent='Generating both copies…';
      try{
        const days=weekDays(input.value||ymd(new Date())),start=ymd(days[0]),end=ymd(days[6]),rows=await fetchDetailedWeek(start,end);
        const [coach,gc]=await Promise.all([drawWeekly(rows,days,'coach'),drawWeekly(rows,days,'gc')]);
        weeklyCopies={coach,gc,start,end};
        const preview=byId('weeklyPreview'),wrap=byId('weeklyPreviewWrap');
        if(preview)preview.src=gc;
        if(wrap){wrap.classList.remove('hidden');wrap.scrollIntoView({behavior:'smooth',block:'nearest'});}
        byId('weeklyPreviewGcBtn')?.classList.add('active');byId('weeklyPreviewCoachBtn')?.classList.remove('active');
        if(typeof toast==='function')toast('Coach and Player / GC weekly copies are ready');
      }catch(e){alert('Could not generate weekly schedule images.\n'+(e?.message||e));}
      finally{btn.disabled=false;btn.textContent=old;}
    };
    byId('generateWeeklyBtn').onclick=generateWeeklyScheduleImage;
  }

  function installConfirmationFilename(){
    if(typeof openConfirmationCard!=='function'||window.__pickylaV20TurnoverFilename)return;
    window.__pickylaV20TurnoverFilename=true;
    const prior=openConfirmationCard;
    openConfirmationCard=async function(b){confirmationContext=b||null;return prior(b);};
    const btn=byId('downloadConfirmationCard');
    if(btn)btn.onclick=()=>{
      if(typeof confirmationCardDataUrl==='undefined'||!confirmationCardDataUrl)return;
      const name=safeFile(confirmationContext?.client_name||'player');
      const date=String(confirmationContext?.session_date||ymd(new Date()));
      downloadData(confirmationCardDataUrl,'pickyla-booking-confirmation-'+name+'-'+date+'.png');
    };
  }

  async function refresh(){
    if(typeof loadReports==='function')await loadReports();
  }

  function install(){
    installHeaderShortcuts();
    ensureFinanceReview();
    installFinancialReportFilter();
    installWeeklyExports();
    installConfirmationFilename();
    if(byId('adminView')&&!byId('adminView').classList.contains('hidden'))setTimeout(refresh,160);
    if(typeof db!=='undefined'){
      db.auth.onAuthStateChange((event,session)=>{if(session&&(event==='SIGNED_IN'||event==='INITIAL_SESSION'))setTimeout(refresh,500);});
    }
    window.pickylaTurnoverFinance={refresh,isExcluded:isFinanceExcluded,marker:FINANCE_MARKER};
    window.pickylaTurnoverWeekly={regenerate:()=>generateWeeklyScheduleImage?.()};
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();