/* Pickyla v23: custom light/yellow date picker for 5+1 package scheduling. */
(function(){
  'use strict';
  const two=n=>String(n).padStart(2,'0');
  const iso=d=>d.getFullYear()+'-'+two(d.getMonth()+1)+'-'+two(d.getDate());
  const parse=t=>{const m=String(t||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(+m[1],+m[2]-1,+m[3],12):null;};
  const manilaToday=()=>{
    const a=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const x=Object.fromEntries(a.map(p=>[p.type,p.value]));
    return x.year+'-'+x.month+'-'+x.day;
  };
  let active=null,month=new Date();month.setDate(1);
  const dialog=document.createElement('dialog');
  dialog.id='pkgV23DateDialog';
  dialog.className='pkg-v23-date-dialog';
  dialog.setAttribute('aria-label','Choose Pickyla coaching date');
  dialog.innerHTML='<section class="pkg-v23-date-panel">'+
    '<div class="pkg-v23-date-heading"><div><span>PICKYLA COACHING PROMOS</span><h2>Choose Your Coaching Date</h2><p id="pkgV23DateHelp">Dates available for your 5+1 training package</p></div><button type="button" id="pkgV23Close" aria-label="Close date calendar">×</button></div>'+
    '<div class="pkg-v23-date-nav"><button type="button" id="pkgV23Prev" aria-label="Previous month">‹</button><strong id="pkgV23Month"></strong><button type="button" id="pkgV23Next" aria-label="Next month">›</button></div>'+
    '<div class="pkg-v23-weekdays"><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span></div>'+
    '<div class="pkg-v23-days" id="pkgV23Days"></div>'+
    '<div class="pkg-v23-date-actions"><button id="pkgV23Today" type="button">Today</button><button id="pkgV23Clear" type="button">Clear</button><button id="pkgV23Cancel" type="button">Close</button></div>'+
    '<p class="pkg-v23-date-foot">©2026 XBALANCED DIGITAL SOLUTIONS</p>'+
  '</section>';
  document.body.appendChild(dialog);
  const get=id=>document.getElementById(id);
  const bounds=()=>{
    const min=parse(active?.min||active?.getAttribute('min'))||parse(manilaToday());
    const max=parse(active?.max||active?.getAttribute('max'))||new Date(min.getFullYear(),min.getMonth()+5,min.getDate());
    return {min,max};
  };
  const allowed=d=>{const {min,max}=bounds();return d>=min&&d<=max;};
  const select=d=>{
    if(!active||!allowed(d))return;
    active.value=iso(d);
    active.dispatchEvent(new Event('input',{bubbles:true}));
    active.dispatchEvent(new Event('change',{bubbles:true}));
    dialog.close();
  };
  const draw=()=>{
    if(!active)return;
    const {min,max}=bounds(),y=month.getFullYear(),m=month.getMonth();
    get('pkgV23Month').textContent=month.toLocaleDateString('en-PH',{month:'long',year:'numeric'});
    get('pkgV23Prev').disabled=new Date(y,m,0,12)<min;
    get('pkgV23Next').disabled=new Date(y,m+1,1,12)>max;
    get('pkgV23Today').disabled=!allowed(parse(manilaToday()));
    const grid=get('pkgV23Days');grid.replaceChildren();
    const empty=(new Date(y,m,1).getDay()+6)%7;
    for(let j=0;j<empty;j++){
      const blank=document.createElement('span');blank.className='pkg-v23-date-blank';grid.appendChild(blank);
    }
    const n=new Date(y,m+1,0).getDate();
    for(let d=1;d<=n;d++){
      const date=new Date(y,m,d,12),b=document.createElement('button');
      b.type='button';b.textContent=d;b.setAttribute('aria-label',date.toLocaleDateString('en-PH',{dateStyle:'full'}));
      if(iso(date)===manilaToday())b.classList.add('today');
      if(iso(date)===active.value)b.classList.add('selected');
      if(!allowed(date)){b.disabled=true;b.title='Outside your package booking window';}
      else b.onclick=()=>select(date);
      grid.appendChild(b);
    }
    const first=iso(min),last=iso(max);
    get('pkgV23DateHelp').textContent='Select a day between '+first+' and '+last+'. Confirm 2 consecutive hours after selecting a date.';
  };
  function open(input){
    if(input.disabled)return;
    active=input;
    const d=parse(input.value)||parse(input.min)||parse(manilaToday());
    month=new Date(d.getFullYear(),d.getMonth(),1,12);
    draw();
    if(!dialog.open)dialog.showModal();
  }
  document.addEventListener('click',event=>{
    const input=event.target.closest?.('#pickylaProgramV21 [data-session-date], #pickylaProgramV21 #pkgV21ResDate');
    if(!input||input.disabled)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open(input);
  },true);
  document.addEventListener('keydown',event=>{
    const input=event.target.closest?.('#pickylaProgramV21 [data-session-date], #pickylaProgramV21 #pkgV21ResDate');
    if(input&&!input.disabled&&(event.key==='Enter'||event.key===' ')){
      event.preventDefault();open(input);
    }
  });
  get('pkgV23Close').onclick=()=>dialog.close();
  get('pkgV23Cancel').onclick=()=>dialog.close();
  get('pkgV23Prev').onclick=()=>{month.setMonth(month.getMonth()-1);draw();};
  get('pkgV23Next').onclick=()=>{month.setMonth(month.getMonth()+1);draw();};
  get('pkgV23Today').onclick=()=>select(parse(manilaToday()));
  get('pkgV23Clear').onclick=()=>{if(!active)return dialog.close();active.value='';active.dispatchEvent(new Event('change',{bubbles:true}));dialog.close();};
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
})();
