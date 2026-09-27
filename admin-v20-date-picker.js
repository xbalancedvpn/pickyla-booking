// Pickyla v20 - reusable Monday-first Admin date picker
(function(){
  const pad=n=>String(n).padStart(2,'0');
  const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  const parse=s=>{const [y,m,d]=String(s||'').split('-').map(Number);return y&&m&&d?new Date(y,m-1,d):null;};
  let target=null,view=new Date();view.setDate(1);

  function ensure(){
    let dlg=document.getElementById('v20DatePickerDialog');
    if(dlg)return dlg;
    dlg=document.createElement('dialog');
    dlg.id='v20DatePickerDialog';dlg.className='v20-date-dialog';
    dlg.innerHTML='<div class="v20-date-card">'+
      '<div class="v20-date-head"><div><span class="eyebrow">SELECT DATE</span><h2 id="v20DateTitle">Choose a date</h2></div><button type="button" id="v20DateClose" aria-label="Close">×</button></div>'+
      '<div class="v20-date-nav"><button type="button" id="v20DatePrev">‹</button><strong id="v20DateMonth"></strong><button type="button" id="v20DateNext">›</button></div>'+
      '<div class="v20-date-weekdays"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>'+
      '<div id="v20DateGrid" class="v20-date-grid"></div>'+
      '<div class="v20-date-actions"><button type="button" id="v20DateToday" class="secondary">Today</button><button type="button" id="v20DateClear" class="secondary">Clear</button><button type="button" id="v20DateCancel" class="primary">Close</button></div>'+
    '</div>';
    document.body.appendChild(dlg);
    document.getElementById('v20DateClose').onclick=()=>dlg.close();
    document.getElementById('v20DateCancel').onclick=()=>dlg.close();
    document.getElementById('v20DatePrev').onclick=()=>{view.setMonth(view.getMonth()-1);render();};
    document.getElementById('v20DateNext').onclick=()=>{view.setMonth(view.getMonth()+1);render();};
    document.getElementById('v20DateToday').onclick=()=>pick(new Date());
    document.getElementById('v20DateClear').onclick=()=>{
      if(!target)return dlg.close();
      target.value='';target.dispatchEvent(new Event('input',{bubbles:true}));target.dispatchEvent(new Event('change',{bubbles:true}));dlg.close();
    };
    return dlg;
  }

  function allowed(d){
    if(!target)return true;
    const min=parse(target.dataset.dateMin||target.getAttribute('min'));
    const max=parse(target.dataset.dateMax||target.getAttribute('max'));
    const x=new Date(d);x.setHours(0,0,0,0);
    if(min){min.setHours(0,0,0,0);if(x<min)return false;}
    if(max){max.setHours(0,0,0,0);if(x>max)return false;}
    return true;
  }
  function pick(d){
    if(!target||!allowed(d))return;
    target.value=ymd(d);
    target.dispatchEvent(new Event('input',{bubbles:true}));
    target.dispatchEvent(new Event('change',{bubbles:true}));
    ensure().close();
  }
  function render(){
    const grid=document.getElementById('v20DateGrid'),label=document.getElementById('v20DateMonth');
    if(!grid||!label)return;
    label.textContent=view.toLocaleDateString('en-PH',{month:'long',year:'numeric'});
    grid.innerHTML='';
    const y=view.getFullYear(),m=view.getMonth(),first=(new Date(y,m,1).getDay()+6)%7,last=new Date(y,m+1,0).getDate();
    for(let i=0;i<first;i++){const s=document.createElement('span');s.className='v20-date-blank';grid.appendChild(s);}
    const selected=parse(target?.value),today=new Date();today.setHours(0,0,0,0);
    for(let day=1;day<=last;day++){
      const d=new Date(y,m,day),b=document.createElement('button');b.type='button';b.textContent=day;
      if(d.getTime()===today.getTime())b.classList.add('today');
      if(selected&&ymd(selected)===ymd(d))b.classList.add('selected');
      if(!allowed(d)){b.disabled=true;b.classList.add('disabled');}
      else b.onclick=()=>pick(d);
      grid.appendChild(b);
    }
  }
  function open(input){
    target=input;const current=parse(input.value)||new Date();view=new Date(current.getFullYear(),current.getMonth(),1);
    document.getElementById('v20DateTitle').textContent=input.dataset.dateTitle||'Choose a date';
    render();ensure().showModal();
  }
  function enhance(input){
    if(!input||input.dataset.v20DateReady==='1')return;
    input.dataset.v20DateReady='1';
    input.dataset.dateMin=input.getAttribute('min')||'';
    input.dataset.dateMax=input.getAttribute('max')||'';
    input.type='text';input.readOnly=true;input.autocomplete='off';input.classList.add('v20-date-input');
    input.addEventListener('click',e=>{e.preventDefault();open(input);});
    input.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open(input);}});
  }
  function scan(){document.querySelectorAll('input[type="date"]').forEach(enhance);}
  function init(){ensure();scan();window.pickylaV20DatePicker={enhance,open,scan};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();