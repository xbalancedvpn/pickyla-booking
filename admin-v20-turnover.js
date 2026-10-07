// PICKYLA v20 - final turnover pack
// Header shortcuts, finance exclusions/review, private/public weekly cards, and share filenames.
(function(){
  const byId=id=>document.getElementById(id);
  const FINANCE_MARKER='[FINANCE_EXCLUDE]';
  let financeRows=[];
  let confirmationContext=null;
  let weeklyCopies={coach:null,player:null,start:'',end:''};
  let weeklyPreviewMode='player';

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
    x.fillStyle='#f5c400';x.font='800 24px Arial, sans-serif';x.fillText(variant==='coach'?'COACH WEEKLY SCHEDULE':'PLAYER WEEKLY SCHEDULE',220,118);
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

  function syncWeeklyPreview(mode){
    weeklyPreviewMode=mode==='coach'?'coach':'player';
    const src=weeklyPreviewMode==='coach'?weeklyCopies.coach:weeklyCopies.player;
    const preview=byId('weeklyPreview');
    if(preview&&src)preview.src=src;
    byId('weeklyPreviewCoachBtn')?.classList.toggle('active',weeklyPreviewMode==='coach');
    byId('weeklyPreviewPlayerBtn')?.classList.toggle('active',weeklyPreviewMode==='player');
    const download=byId('downloadWeeklyBtn');
    if(download)download.textContent=weeklyPreviewMode==='coach'?'↓ Download Coach Copy':'↓ Download Player Copy';
  }

  function ensureWeeklyActions(){
    const actions=byId('weeklyPreviewWrap')?.querySelector('.weekly-preview-actions');
    if(!actions)return;
    byId('downloadWeeklyCoachBtn')?.remove();
    const legacyPlayer=byId('weeklyPreviewGcBtn');
    if(legacyPlayer&&!byId('weeklyPreviewPlayerBtn')){
      legacyPlayer.id='weeklyPreviewPlayerBtn';
      legacyPlayer.textContent='Player';
    }
    const coach=byId('weeklyPreviewCoachBtn');
    const player=byId('weeklyPreviewPlayerBtn');
    const download=byId('downloadWeeklyBtn');
    if(coach)coach.onclick=()=>syncWeeklyPreview('coach');
    if(player)player.onclick=()=>syncWeeklyPreview('player');
    if(download)download.onclick=()=>{
      const src=weeklyPreviewMode==='coach'?weeklyCopies.coach:weeklyCopies.player;
      const type=weeklyPreviewMode==='coach'?'coach':'player';
      downloadData(src,'pickyla-weekly-schedule-'+type+'-'+weeklyCopies.start+'-to-'+weeklyCopies.end+'.png');
    };
    syncWeeklyPreview(weeklyPreviewMode);
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
        const [coach,player]=await Promise.all([drawWeekly(rows,days,'coach'),drawWeekly(rows,days,'player')]);
        weeklyCopies={coach,player,start,end};
        const preview=byId('weeklyPreview'),wrap=byId('weeklyPreviewWrap');
        if(preview)preview.src=player;
        if(wrap){wrap.classList.remove('hidden');wrap.scrollIntoView({behavior:'smooth',block:'nearest'});}
        syncWeeklyPreview('player');
        if(typeof toast==='function')toast('Coach and Player copies are ready');
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

// ===== v20 Kyle-inspired finance + admin arrangement =====
(function(){
  const id=x=>document.getElementById(x), q=x=>document.querySelector(x), qa=x=>Array.from(document.querySelectorAll(x));
  const pad=n=>String(n).padStart(2,'0'), ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const money=n=>'₱'+Number(n||0).toLocaleString('en-PH',{maximumFractionDigits:2});
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  let rows=[],earnedChart=null,sizeChart=null,busy=false,timer=null;
  const cancelled=b=>b&&((b.status==='cancelled')||['client_cancelled','coach_cancelled','cancelled'].includes(b.session_status));
  const excluded=b=>cancelled(b)||String((b&&b.session_outcome_note)||'').includes('[FINANCE_EXCLUDE]')||/\b(test|testing|void|refund|refunded)\b/i.test(String((b&&b.session_outcome_note)||'')+' '+String((b&&b.notes)||''))||/^(test|testing)(\s|$)/i.test(String((b&&b.client_name)||'').trim());
  const pstate=r=>r.paid<=.001?'unpaid':r.paid+.001<r.total?'partial':'paid';
  const advance=r=>r.paid>.001&&r.session_status!=='completed';
  const size=n=>(n=Math.max(1,Number(n||1)))===1?'1-on-1':'+'+(n-1)+' ('+n+' pax)';
  const pretty=s=>{const d=new Date(s+'T12:00:00');return isNaN(d)?s:d.toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'});};
  const hour=h=>{h=Number(h);return h===24?'12:00 MN':(h%12||12)+':00 '+(h<12?'AM':'PM');};
  function first(){const d=new Date();return ymd(new Date(d.getFullYear(),d.getMonth(),1));}
  function last(){const d=new Date();return ymd(new Date(d.getFullYear(),d.getMonth()+1,0));}
  function week(){const d=new Date(),s=new Date(d);s.setDate(d.getDate()-(d.getDay()===0?6:d.getDay()-1));const e=new Date(s);e.setDate(s.getDate()+6);return [ymd(s),ymd(e)];}
  function match(r,f){const s=pstate(r);return f==='all'||f===s||(f==='advance'&&advance(r))||(f==='completed_due'&&r.session_status==='completed'&&r.balance>.001);}
  function heading(k,t,p){const s=document.createElement('section');s.className='v20-kyle-flow-heading';s.dataset.kyleFlow='1';s.innerHTML='<span class="eyebrow">'+esc(k)+'</span><h2>'+esc(t)+'</h2><p>'+esc(p)+'</p>';return s;}
  function after(n,a){if(n&&a&&a.parentNode)a.parentNode.insertBefore(n,a.nextSibling);return n||a;}
  function organize(){
    qa('[data-kyle-flow="1"]').forEach(x=>x.remove());
    const today=id('todayCommandSection'),ops=id('v20OperationsFlow');if(today){today.before(heading('OPERATIONS','Bookings & daily coaching','Today first, then upcoming bookings, sessions needing closure, collections, and completed sessions.'));if(ops)after(ops,today);}
    const clients=id('clientHubSection')&&id('clientHubSection').closest('.v17-grid'),detail=id('clientDetailSection'),fin=id('adminReportsSection');
    if(clients&&fin){const h=heading('CLIENTS','Players & coaching progress','Player profiles, programs, session history, payments, and progress in one area.');fin.before(h);h.after(clients);if(detail)after(detail,clients);}
    if(fin)fin.before(heading('FINANCE','Income & collections','Kyle-style reporting for confirmed value, collections, earned completed sessions, outstanding balances, and prepayments.'));
    let cur=fin;[id('paymentDashboardSection'),id('collectionAlertSection'),id('v20FinanceReview'),q('.chart-grid'),id('v20AdvancedFinanceSection')].forEach(n=>{if(n&&cur)cur=after(n,cur);});
    const chart=q('.chart-grid');if(chart)chart.classList.add('v20-secondary-finance');
    const adv=id('v20AdvancedFinanceSection');if(adv){adv.classList.add('v20-advanced-finance');const h=adv.querySelector('.panel-head h2'),p=adv.querySelector('.panel-note');if(h)h.textContent='Advanced / Cash-Date Report';if(p)p.textContent='Use this for payment-date cash reporting, printable details, or the original session-date report.';}
    const weekly=id('weeklyShareSection'),pub=id('shareToolsSection');if(weekly){cur=after(heading('PUBLIC CONTENT','What players see & what you share','Weekly schedule cards, public QR, Pickyla Moments, and testimonials.'),cur||fin);cur=after(weekly,cur);if(pub)cur=after(pub,cur);}
    const bt=id('bookingToolsSection'),quick=id('quickBookingForm')&&id('quickBookingForm').closest('.quick-grid'),block=id('v20ScheduleBlockSection'),inq=id('inquirySection'),cal=id('calendarSection'),day=id('daySection');
    if(bt){cur=after(heading('SCHEDULE & BOOKING TOOLS','Booking setup & calendar','Manual booking, schedule blocking, inquiries, calendar overview, and detailed day management.'),cur||pub||weekly);[bt,quick,block,inq,cal,day].forEach(n=>{if(n&&cur)cur=after(n,cur);});}
  }
  function menu(){
    const nav=q('.admin-menu-links');if(!nav)return;const links=new Map(qa('.admin-menu-links a').map(a=>[a.getAttribute('href'),a])),frag=document.createDocumentFragment();
    function group(name,list){const g=document.createElement('span');g.className='v20-admin-nav-group';g.textContent=name;frag.appendChild(g);list.forEach(v=>{let a=links.get(v[0]);if(!a){a=document.createElement('a');a.href=v[0];}a.textContent=v[1];frag.appendChild(a);});}
    const d=links.get('#adminDashboardTop');if(d){d.textContent='Dashboard';frag.appendChild(d);}
    group('Operations',[['#todayCommandSection','Today'],['#v20UpcomingSection','Upcoming Bookings'],['#v20PastSection','Past Sessions'],['#v20PaymentSection','Payment Follow-up'],['#v20CompletedSection','Completed Sessions'],['#v20CancelledSection','Cancelled Bookings']]);
    group('Clients & Programs',[['#clientHubSection','Player Management'],['#programHubSection','Programs']]);
    group('Finance',[['#adminReportsSection','Income & Collections'],['#paymentDashboardSection','Payment Dashboard'],['#v20FinanceReview','Finance Review'],['#v20AdvancedFinanceSection','Advanced Reports']]);
    group('Public Content',[['#weeklyShareSection','Weekly Schedule'],['#galleryAdminSection','Pickyla Moments'],['#shareToolsSection','Marketing & Testimonials']]);
    group('Schedule & Booking Tools',[['#bookingToolsSection','Manual Booking'],['#v20ScheduleBlockSection','Tournament / Unavailable'],['#inquirySection','Booking Inquiries'],['#calendarSection','Calendar'],['#daySection','Day View']]);
    nav.innerHTML='';nav.appendChild(frag);
  }
  function build(){
    const old=id('adminReportsSection');if(!old||old.classList.contains('v20-kyle-finance-report'))return old;old.id='v20AdvancedFinanceSection';
    const s=document.createElement('section');s.id='adminReportsSection';s.className='panel v20-kyle-finance-report';s.innerHTML='<div class="v20-kyle-finance-head"><div><span class="eyebrow">FINANCIAL REPORTS</span><h2>Income & Collection Report</h2><p>Same quick-report workflow as Coach Kyle, adapted to Pickyla finance exclusions and payment ledger.</p></div><span class="v20-kyle-money-tag">MONEY</span></div>'+
      '<div class="v20-kyle-report-period"><div><span class="eyebrow">REPORT PERIOD</span><strong id="v20KylePeriodLabel">This Month</strong></div><div class="v20-kyle-period-buttons"><button type="button" data-v20-kyle-period="today">Today</button><button type="button" data-v20-kyle-period="week">This Week</button><button type="button" data-v20-kyle-period="month" class="active">This Month</button><button type="button" data-v20-kyle-period="custom">Custom</button></div></div>'+
      '<div id="v20KyleCustomDates" class="v20-kyle-custom-dates is-hidden"><label>From<input id="v20KyleReportFrom" type="date" data-date-title="Report start date"></label><label>To<input id="v20KyleReportTo" type="date" data-date-title="Report end date"></label><button id="v20KyleApplyRange" class="v20-kyle-apply" type="button">Apply Custom Range</button></div>'+
      '<div class="v20-kyle-filter-row"><label>Collection View<select id="v20KyleReportStatus"><option value="all">All confirmed sessions</option><option value="paid">Collected in full</option><option value="partial">Partially collected</option><option value="unpaid">Not collected</option><option value="advance">Advance / prepaid sessions</option><option value="completed_due">Completed with balance due</option></select></label><button id="v20KyleExportCsv" class="v20-kyle-export" type="button">Export CSV</button></div>'+
      '<div class="v20-kyle-report-metrics"><article><span>Confirmed value</span><strong id="v20KyleConfirmed">₱0</strong></article><article><span>Cash collected</span><strong id="v20KyleCollected">₱0</strong></article><article><span>Earned • completed</span><strong id="v20KyleEarned">₱0</strong></article><article><span>Outstanding</span><strong id="v20KyleOutstanding">₱0</strong></article><article><span>Advance / liability</span><strong id="v20KyleAdvance">₱0</strong></article></div>'+
      '<div id="v20KylePaidBreakdown" class="v20-kyle-paid-breakdown">0 fully paid (0 completed • 0 prepaid)</div><div id="v20KyleRangeLabel" class="v20-kyle-range-label"></div>'+
      '<div class="v20-kyle-report-charts"><article><h3>Earned Income</h3><p>Completed coaching value by session date for the selected range.</p><canvas id="v20KyleEarnedChart"></canvas></article><article><h3>Booking Size Mix</h3><p>1-on-1 and group-session mix for the selected range.</p><canvas id="v20KyleSizeChart"></canvas></article></div>'+
      '<div id="v20KyleReportTable" class="v20-kyle-report-table"><div class="empty">Loading finance report…</div></div><div class="v20-kyle-finance-footnote">Session-date view. Payment Dashboard and Advanced Report below remain available for package collections and payment-date cash reporting.</div>';
    old.before(s);window.pickylaV20DatePicker&&window.pickylaV20DatePicker.scan&&window.pickylaV20DatePicker.scan();return s;
  }
  function period(mode,load){const a=id('v20KyleReportFrom'),b=id('v20KyleReportTo'),box=id('v20KyleCustomDates'),lab=id('v20KylePeriodLabel');if(!a||!b)return;let x=a.value,y=b.value,t='Custom Range';if(mode==='today'){x=y=ymd(new Date());t='Today';}else if(mode==='week'){[x,y]=week();t='This Week';}else if(mode==='month'){x=first();y=last();t='This Month';}a.value=x;b.value=y;if(box)box.classList.toggle('is-hidden',mode!=='custom');qa('[data-v20-kyle-period]').forEach(z=>z.classList.toggle('active',z.dataset.v20KylePeriod===mode));if(lab)lab.textContent=t+' • '+pretty(x)+' – '+pretty(y);if(load&&mode!=='custom')report();}
  async function report(){if(busy||typeof db==='undefined')return;const from=id('v20KyleReportFrom')&&id('v20KyleReportFrom').value,to=id('v20KyleReportTo')&&id('v20KyleReportTo').value,filter=(id('v20KyleReportStatus')&&id('v20KyleReportStatus').value)||'all',host=id('v20KyleReportTable');if(!from||!to)return;if(from>to){alert('Start date must be before end date.');return;}busy=true;if(host)host.innerHTML='<div class="empty">Generating finance report…</div>';try{const r=await db.from('bookings').select('*').gte('session_date',from).lte('session_date',to).order('session_date').order('start_hour');if(r.error)throw r.error;const valid=(r.data||[]).filter(b=>!excluded(b)),ids=valid.map(b=>b.id).filter(Boolean),pm=new Map();if(ids.length){const p=await db.from('booking_payments').select('booking_id,amount').in('booking_id',ids);if(p.error)throw p.error;(p.data||[]).forEach(x=>{const k=String(x.booking_id);pm.set(k,(pm.get(k)||0)+Number(x.amount||0));});}rows=valid.map(b=>{const total=Number(b.total_amount||0),ledger=pm.get(String(b.id)),paid=ledger==null?Number(b.amount_paid||0):ledger;return Object.assign({},b,{total:total,paid:paid,balance:Math.max(0,total-paid)});});const shown=rows.filter(x=>match(x,filter)),confirmed=rows.reduce((s,x)=>s+x.total,0),collected=rows.reduce((s,x)=>s+x.paid,0),earned=rows.filter(x=>x.session_status==='completed').reduce((s,x)=>s+x.total,0),outstanding=rows.reduce((s,x)=>s+x.balance,0),adv=rows.filter(advance).reduce((s,x)=>s+x.paid,0),full=rows.filter(x=>pstate(x)==='paid'),done=full.filter(x=>x.session_status==='completed').length,pre=full.filter(advance).length;id('v20KyleConfirmed').textContent=money(confirmed);id('v20KyleCollected').textContent=money(collected);id('v20KyleEarned').textContent=money(earned);id('v20KyleOutstanding').textContent=money(outstanding);id('v20KyleAdvance').textContent=money(adv);id('v20KylePaidBreakdown').textContent=full.length+' fully paid ('+done+' completed • '+pre+' prepaid)';id('v20KyleRangeLabel').textContent=pretty(from)+' – '+pretty(to)+' • '+shown.length+' of '+rows.length+' sessions';table(shown);charts(rows);}catch(e){if(host)host.innerHTML='<div class="empty">'+esc(e.message||'Could not load finance report.')+'</div>';}busy=false;}
  function table(list){const h=id('v20KyleReportTable');if(!h)return;if(!list.length){h.innerHTML='<div class="empty">No sessions match this collection view.</div>';return;}h.innerHTML='<div class="v20-kyle-table-scroll"><table><thead><tr><th>Date</th><th>Player</th><th>Session</th><th>Fee</th><th>Paid</th><th>Balance</th><th>Collection</th></tr></thead><tbody>'+list.map(r=>{const ps=pstate(r),lab=ps==='paid'?(advance(r)?'Paid • Prepayment':r.session_status==='completed'?'Paid • Done':'Paid'):ps==='partial'?'Partial':'Not collected';return '<tr><td>'+esc(r.session_date)+'</td><td><strong>'+esc(r.client_name||'Player')+'</strong><small>'+hour(r.start_hour)+'–'+hour(r.end_hour)+' • '+esc(size(r.participant_count))+'</small></td><td><span class="v20-kyle-pill">'+esc(r.session_status||'scheduled')+'</span></td><td>'+money(r.total)+'</td><td>'+money(r.paid)+'</td><td>'+money(r.balance)+'</td><td><span class="v20-kyle-pill '+ps+'">'+esc(lab)+'</span></td></tr>';}).join('')+'</tbody></table></div>';}
  function charts(list){if(typeof Chart==='undefined')return;const em=new Map();list.filter(r=>r.session_status==='completed').forEach(r=>em.set(r.session_date,(em.get(r.session_date)||0)+r.total));const labels=Array.from(em.keys()).sort(),vals=labels.map(x=>em.get(x)),ec=id('v20KyleEarnedChart');if(ec){if(earnedChart)earnedChart.destroy();earnedChart=new Chart(ec,{type:'bar',data:{labels:labels.length?labels:['No completed sessions'],datasets:[{data:labels.length?vals:[0],backgroundColor:'#ffd600',borderRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#999',font:{size:9}}},y:{beginAtZero:true,ticks:{color:'#999',callback:v=>money(v)},grid:{color:'#242424'}}}}});}const sm=new Map();list.forEach(r=>{const k=size(r.participant_count);sm.set(k,(sm.get(k)||0)+1);});const sl=Array.from(sm.keys()),sv=sl.map(x=>sm.get(x)),sc=id('v20KyleSizeChart');if(sc){if(sizeChart)sizeChart.destroy();sizeChart=new Chart(sc,{type:'doughnut',data:{labels:sl.length?sl:['No bookings'],datasets:[{data:sl.length?sv:[1],backgroundColor:['#ffd600','#fff','#777','#4f4f4f','#b9a400'],borderColor:'#0b0b0b',borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{color:'#aaa',boxWidth:10,font:{size:9}}}}}});}}
  function csv(){const f=(id('v20KyleReportStatus')&&id('v20KyleReportStatus').value)||'all',list=rows.filter(r=>match(r,f));if(!list.length)return alert('No report rows to export.');const c=v=>{const s=String(v==null?'':v);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;},out=[['Date','Player','Time','Pax','Session Status','Fee','Paid','Balance','Payment Status'].join(',')];list.forEach(r=>out.push([r.session_date,r.client_name,hour(r.start_hour)+'-'+hour(r.end_hour),r.participant_count,r.session_status,r.total,r.paid,r.balance,pstate(r)].map(c).join(',')));const blob=new Blob(['\ufeff'+out.join('\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='pickyla-income-'+id('v20KyleReportFrom').value+'-to-'+id('v20KyleReportTo').value+'.csv';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);}
  function wire(){qa('[data-v20-kyle-period]').forEach(b=>b.addEventListener('click',()=>period(b.dataset.v20KylePeriod,true)));id('v20KyleApplyRange').addEventListener('click',()=>{const a=id('v20KyleReportFrom').value,b=id('v20KyleReportTo').value;if(a&&b)id('v20KylePeriodLabel').textContent='Custom Range • '+pretty(a)+' – '+pretty(b);report();});id('v20KyleReportStatus').addEventListener('change',()=>{const list=rows.filter(r=>match(r,id('v20KyleReportStatus').value));table(list);id('v20KyleRangeLabel').textContent=pretty(id('v20KyleReportFrom').value)+' – '+pretty(id('v20KyleReportTo').value)+' • '+list.length+' of '+rows.length+' sessions';});id('v20KyleExportCsv').addEventListener('click',csv);period('month',false);}
  function hook(){if(window.__pickylaKyleFinanceHooked)return;window.__pickylaKyleFinanceHooked=true;if(typeof window.loadReports==='function'){const prev=window.loadReports;window.loadReports=async function(){const v=await prev.apply(this,arguments);clearTimeout(timer);timer=setTimeout(report,80);return v;};}window.addEventListener('coach:data-changed',()=>{clearTimeout(timer);timer=setTimeout(report,100);});}
  function init(){if(window.__pickylaKyleAdminSync)return;window.__pickylaKyleAdminSync=true;if(!build())return;wire();organize();menu();hook();window.pickylaV20DatePicker&&window.pickylaV20DatePicker.scan&&window.pickylaV20DatePicker.scan();report();window.pickylaV20KyleSync={reloadFinance:report,organizePage:organize,organizeMenu:menu};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();