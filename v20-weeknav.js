// PICKYLA v20 Batch 3 - Monday-Sunday week navigation
(function(){
  const byId=id=>document.getElementById(id);
  const pad=n=>String(n).padStart(2,'0');
  const ymd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
  function monday(input=new Date()){
    const d=input instanceof Date?new Date(input):new Date(String(input)+'T12:00:00');
    d.setHours(0,0,0,0);
    d.setDate(d.getDate()-((d.getDay()+6)%7));
    return d;
  }
  function mondayOffset(offset=0){
    const d=monday(new Date());
    d.setDate(d.getDate()+Number(offset||0)*7);
    return d;
  }

  function installAdmin(){
    const input=byId('weeklyWeekDate'),controls=document.querySelector('#weeklyShareSection .weekly-export-controls');
    if(!input||!controls||byId('v20WeekNavAdmin'))return;
    const nav=document.createElement('div');
    nav.id='v20WeekNavAdmin';nav.className='v20-week-nav';
    nav.innerHTML='<button type="button" data-v20-week="-1">Past Week</button><button type="button" data-v20-week="0">This Week</button><button type="button" data-v20-week="1">Next Week</button>';
    controls.prepend(nav);
    function syncActive(){
      const selected=input.value?monday(input.value):mondayOffset(0);
      const diff=Math.round((selected-mondayOffset(0))/(7*86400000));
      nav.querySelectorAll('[data-v20-week]').forEach(b=>b.classList.toggle('active',Number(b.dataset.v20Week)===diff));
    }
    nav.querySelectorAll('[data-v20-week]').forEach(btn=>btn.onclick=async()=>{
      input.value=ymd(mondayOffset(Number(btn.dataset.v20Week)));
      if(typeof refreshWeeklyRange==='function')refreshWeeklyRange();
      syncActive();
      const preview=byId('weeklyPreviewWrap');
      if(preview&&!preview.classList.contains('hidden')&&typeof generateWeeklyScheduleImage==='function')await generateWeeklyScheduleImage();
    });
    input.addEventListener('change',syncActive);
    input.value=ymd(mondayOffset(0));
    if(typeof refreshWeeklyRange==='function')refreshWeeklyRange();
    syncActive();
  }

  let publicOffset=0;
  function installPublic(){
    const modal=byId('weekPreviewModal'),help=modal?.querySelector('.public-week-help');
    if(!modal||!help||byId('v20WeekNavPublic'))return;
    if(typeof publicSunday==='function'){
      publicSunday=function(d=new Date()){return monday(d);};
    }
    if(typeof publicWeekDates==='function'){
      publicWeekDates=function(){
        const s=mondayOffset(publicOffset),out=[];
        for(let i=0;i<7;i++){const d=new Date(s);d.setDate(s.getDate()+i);out.push(d);}
        return out;
      };
    }
    const nav=document.createElement('div');
    nav.id='v20WeekNavPublic';nav.className='v20-week-nav v20-week-nav-public';
    nav.innerHTML='<button type="button" data-v20-public-week="-1">Past Week</button><button type="button" data-v20-public-week="0">This Week</button><button type="button" data-v20-public-week="1">Next Week</button>';
    help.insertAdjacentElement('beforebegin',nav);
    function sync(){
      nav.querySelectorAll('[data-v20-public-week]').forEach(b=>b.classList.toggle('active',Number(b.dataset.v20PublicWeek)===publicOffset));
      const range=byId('publicWeekRange');if(range&&!range.textContent.includes('Monday'))range.dataset.v20Week='1';
    }
    nav.querySelectorAll('[data-v20-public-week]').forEach(btn=>btn.onclick=async()=>{
      publicOffset=Number(btn.dataset.v20PublicWeek);
      sync();
      if(typeof loadPublicWeekPreview==='function')await loadPublicWeekPreview();
    });
    if(typeof openWeekPreview==='function'&&!window.__pickylaV20WeekOpen){
      window.__pickylaV20WeekOpen=true;
      const prior=openWeekPreview;
      openWeekPreview=async function(){publicOffset=0;sync();return prior();};
    }
    sync();
  }

  function install(){
    installAdmin();
    installPublic();
    const publicRange=byId('publicWeekRange');
    if(publicRange&&/Sunday/i.test(publicRange.textContent))publicRange.textContent='Monday–Sunday';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();