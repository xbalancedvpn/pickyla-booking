// Pickyla v20 - reliable earnings chart modes
(function(){
  const byId=id=>document.getElementById(id);
  let mode='daily',rows=[],wired=false;
  let customFrom='',customTo='';

  const ymFromDate=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  const parseYm=s=>{const [y,m]=String(s||'').split('-').map(Number);return y&&m?new Date(y,m-1,1):null;};
  const monthLabel=d=>d.toLocaleDateString('en-PH',{month:'short',year:'numeric'});
  const peso20=n=>'₱'+Number(n||0).toLocaleString('en-PH',{maximumFractionDigits:2});

  function activeRows(input){return (input||[]).filter(x=>x&&x.status!=='cancelled');}
  function monthTotal(y,m){
    return rows.filter(x=>{
      if(!x.session_date)return false;
      const d=new Date(x.session_date+'T00:00:00');
      return !Number.isNaN(d.getTime())&&d.getFullYear()===y&&d.getMonth()===m;
    }).reduce((a,x)=>a+Number(x.total_amount||0),0);
  }
  function firstDataMonth(){
    const dated=rows.filter(x=>x.session_date&&Number(x.total_amount||0)>0).map(x=>new Date(x.session_date+'T00:00:00')).filter(d=>!Number.isNaN(d.getTime()));
    if(!dated.length){const n=new Date();return new Date(n.getFullYear(),n.getMonth(),1);}
    const d=new Date(Math.min(...dated.map(x=>x.getTime())));
    return new Date(d.getFullYear(),d.getMonth(),1);
  }
  function monthOptions(){
    const start=firstDataMonth(),end=new Date();end.setDate(1);
    const out=[];
    for(let d=new Date(start);d<=end;d=new Date(d.getFullYear(),d.getMonth()+1,1)){
      out.push({value:ymFromDate(d),label:d.toLocaleDateString('en-PH',{month:'long',year:'numeric'})});
    }
    return out;
  }
  function ensureCustomOptions(){
    const from=byId('earningsCustomFrom'),to=byId('earningsCustomTo');if(!from||!to)return;
    const opts=monthOptions();
    const html=opts.map(o=>'<option value="'+o.value+'">'+o.label+'</option>').join('');
    const oldFrom=customFrom||from.value,oldTo=customTo||to.value;
    from.innerHTML=html;to.innerHTML=html;
    from.value=opts.some(o=>o.value===oldFrom)?oldFrom:(opts[0]?.value||'');
    to.value=opts.some(o=>o.value===oldTo)?oldTo:(opts.at(-1)?.value||'');
    customFrom=from.value;customTo=to.value;
  }
  function buildSeries(){
    const labels=[],values=[],now=new Date();
    let datasetLabel='Daily booked value',title='This Month Earnings',xTicks={autoSkip:false,maxRotation:65,minRotation:45,font:{size:9}};

    if(mode==='year'){
      const y=now.getFullYear();
      for(let m=0;m<12;m++){
        const d=new Date(y,m,1);
        labels.push(d.toLocaleDateString('en-PH',{month:'short'}));
        values.push(monthTotal(y,m));
      }
      datasetLabel='Monthly booked value';
      title='Monthly Earnings · '+y;
      xTicks={autoSkip:false,maxRotation:0,minRotation:0,font:{size:9}};
    }else if(mode==='custom'){
      const start=parseYm(customFrom),end=parseYm(customTo);
      if(!start||!end||start>end)return {error:'Choose a valid From and To month.'};
      for(let d=new Date(start);d<=end;d=new Date(d.getFullYear(),d.getMonth()+1,1)){
        labels.push(monthLabel(d));
        values.push(monthTotal(d.getFullYear(),d.getMonth()));
      }
      datasetLabel='Monthly booked value';
      title='Custom Earnings · '+monthLabel(start)+' – '+monthLabel(end);
      xTicks={autoSkip:false,maxRotation:35,minRotation:0,font:{size:9}};
    }else{
      const y=now.getFullYear(),m=now.getMonth(),days=new Date(y,m+1,0).getDate();
      for(let day=1;day<=days;day++){
        const d=new Date(y,m,day);
        const ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
        labels.push(d.toLocaleDateString('en-PH',{month:'short',day:'numeric'}));
        values.push(rows.filter(x=>x.session_date===ds).reduce((a,x)=>a+Number(x.total_amount||0),0));
      }
    }
    return {labels,values,datasetLabel,title,xTicks};
  }
  function setMode(next){
    mode=next;
    byId('earningsDailyBtn')?.classList.toggle('active',mode==='daily');
    byId('earningsMonthlyBtn')?.classList.toggle('active',mode==='year');
    byId('earningsCustomBtn')?.classList.toggle('active',mode==='custom');
    byId('earningsCustomControls')?.classList.toggle('hidden',mode!=='custom');
    if(mode==='custom')ensureCustomOptions();
    draw();
  }
  function wire(){
    if(wired)return;wired=true;
    byId('earningsDailyBtn')?.addEventListener('click',()=>setMode('daily'));
    byId('earningsMonthlyBtn')?.addEventListener('click',()=>setMode('year'));
    byId('earningsCustomBtn')?.addEventListener('click',()=>setMode('custom'));
    byId('earningsCustomGenerate')?.addEventListener('click',()=>{
      customFrom=byId('earningsCustomFrom')?.value||'';
      customTo=byId('earningsCustomTo')?.value||'';
      draw();
    });
    byId('earningsCustomFrom')?.addEventListener('change',e=>customFrom=e.target.value);
    byId('earningsCustomTo')?.addEventListener('change',e=>customTo=e.target.value);
  }
  function drawMix(){
    const groups=[1,2,3,4,5].map(n=>rows.filter(x=>Number(x.participant_count)===n).length);
    if(typeof mixChart!=='undefined'&&mixChart)mixChart.destroy();
    mixChart=new Chart(byId('mixChart'),{
      type:'doughnut',
      data:{labels:['1 player','2 players','3 players','4 players','5 players'],datasets:[{data:groups,backgroundColor:['#111111','#f5c400','#d8a800','#9d9d9d','#e8dfbd']}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:10}}}}}
    });
  }
  function draw(){
    wire();
    const series=buildSeries(),error=byId('earningsCustomError');
    if(series.error){
      if(error){error.textContent=series.error;error.classList.remove('hidden');}
      return;
    }
    error?.classList.add('hidden');
    const title=byId('incomeChartTitle');if(title)title.textContent=series.title;
    if(typeof incomeChart!=='undefined'&&incomeChart)incomeChart.destroy();
    incomeChart=new Chart(byId('incomeChart'),{
      type:'bar',
      data:{labels:series.labels,datasets:[{label:series.datasetLabel,data:series.values,backgroundColor:'#f5c400',borderColor:'#111111',borderWidth:1,borderRadius:5}]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>' '+peso20(c.raw||0)}}},scales:{x:{ticks:series.xTicks},y:{beginAtZero:true,ticks:{callback:v=>peso20(v)}}}}
    });
  }

  function install(){
    if(typeof renderCharts!=='function'||typeof Chart==='undefined')return;
    const legacy=renderCharts;
    renderCharts=function(active){
      rows=activeRows(active);
      ensureCustomOptions();
      draw();
      // Keep the group-size chart behavior from the original report.
      drawMix();
    };
    wire();
    // If legacy report already rendered before this module loaded, reload once with fresh rows.
    if(typeof db!=='undefined'){
      db.from('bookings').select('session_date,total_amount,status,participant_count').then(({data,error})=>{
        if(!error){rows=activeRows(data||[]);ensureCustomOptions();draw();drawMix();}
      });
    }
    window.pickylaV20Earnings={setMode,redraw:draw,getMode:()=>mode};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();