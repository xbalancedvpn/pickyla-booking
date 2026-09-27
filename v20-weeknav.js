// PICKYLA v20 - Monday-Sunday unlimited week navigation
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
  function addWeeks(date,weeks){const d=new Date(date);d.setDate(d.getDate()+Number(weeks||0)*7);return d;}
  function currentMonday(){return monday(new Date());}
  function relativeLabel(offset){
    if(offset===0)return 'This Week';
    if(offset===-1)return 'Past Week';
    if(offset===1)return 'Next Week';
    if(offset<0)return Math.abs(offset)+' Weeks Ago';
    return offset+' Weeks Ahead';
  }

  function installAdmin(){
    const input=byId('weeklyWeekDate'),controls=document.querySelector('#weeklyShareSection .weekly-export-controls');
    if(!input||!controls||byId('v20WeekNavAdmin'))return;
    let offset=0;
    const nav=document.createElement('div');
    nav.id='v20WeekNavAdmin';nav.className='v20-week-nav';
    nav.innerHTML='<button type="button" data-dir="-1">← Previous Week</button><button type="button" data-current> This Week </button><button type="button" data-dir="1">Next Week →</button>';
    controls.prepend(nav);

    async function apply(nextOffset,regenerate=true){
      offset=nextOffset;
      input.value=ymd(addWeeks(currentMonday(),offset));
      if(typeof refreshWeeklyRange==='function')refreshWeeklyRange();
      const currentBtn=nav.querySelector('[data-current]');
      if(currentBtn)currentBtn.textContent=relativeLabel(offset);
      input.dataset.v20WeekOffset=String(offset);
      const preview=byId('weeklyPreviewWrap');
      if(regenerate&&preview&&!preview.classList.contains('hidden')&&typeof generateWeeklyScheduleImage==='function'){
        await generateWeeklyScheduleImage();
      }
    }
    nav.querySelector('[data-dir="-1"]').onclick=()=>apply(offset-1);
    nav.querySelector('[data-dir="1"]').onclick=()=>apply(offset+1);
    nav.querySelector('[data-current]').onclick=()=>apply(0);
    input.addEventListener('change',()=>{
      const chosen=monday(input.value||new Date());
      offset=Math.round((chosen-currentMonday())/(7*86400000));
      const currentBtn=nav.querySelector('[data-current]');
      if(currentBtn)currentBtn.textContent=relativeLabel(offset);
    });
    apply(0,false);
  }

  let publicOffset=0;
  function installPublic(){
    const modal=byId('weekPreviewModal'),help=modal?.querySelector('.public-week-help');
    if(!modal||!help||byId('v20WeekNavPublic'))return;

    if(typeof publicSunday==='function')publicSunday=function(d=new Date()){return monday(d);};
    if(typeof publicWeekDates==='function'){
      publicWeekDates=function(){
        const s=addWeeks(currentMonday(),publicOffset),out=[];
        for(let i=0;i<7;i++){const d=new Date(s);d.setDate(s.getDate()+i);out.push(d);}
        return out;
      };
    }

    const nav=document.createElement('div');
    nav.id='v20WeekNavPublic';nav.className='v20-week-nav v20-week-nav-public';
    nav.innerHTML='<button type="button" data-dir="-1">← Previous Week</button><button type="button" data-current>This Week</button><button type="button" data-dir="1">Next Week →</button>';
    help.insertAdjacentElement('beforebegin',nav);

    async function apply(nextOffset){
      publicOffset=nextOffset;
      const currentBtn=nav.querySelector('[data-current]');
      if(currentBtn)currentBtn.textContent=relativeLabel(publicOffset);
      if(typeof loadPublicWeekPreview==='function')await loadPublicWeekPreview();
    }
    nav.querySelector('[data-dir="-1"]').onclick=()=>apply(publicOffset-1);
    nav.querySelector('[data-dir="1"]').onclick=()=>apply(publicOffset+1);
    nav.querySelector('[data-current]').onclick=()=>apply(0);

    if(typeof openWeekPreview==='function'&&!window.__pickylaV20WeekOpen){
      window.__pickylaV20WeekOpen=true;
      const prior=openWeekPreview;
      openWeekPreview=async function(){publicOffset=0;nav.querySelector('[data-current]').textContent='This Week';return prior();};
    }
  }

  function install(){
    installAdmin();
    installPublic();
    const r=byId('publicWeekRange');
    if(r&&/Sunday/i.test(r.textContent))r.textContent='Monday–Sunday';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();