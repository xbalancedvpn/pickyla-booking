// Pickyla v20 - Coach Kyle style 1-5 self-assessment buttons
(function(){
  const labels={1:'Needs work',2:'Emerging',3:'Developing',4:'Proficient',5:'Strong'};

  function enhance(){
    const grid=document.getElementById('v17fSelfAssessmentGrid');
    if(!grid)return;
    if(!grid.querySelector('.v20-rating-legend')){
      const legend=document.createElement('div');
      legend.className='v20-rating-legend';
      legend.innerHTML=[1,2,3,4,5].map(n=>'<span><b>'+n+'</b>'+labels[n]+'</span>').join('');
      grid.prepend(legend);
    }

    grid.querySelectorAll('label').forEach(label=>{
      const select=label.querySelector('select[data-self-score]');
      if(!select||label.dataset.v20Rating==='1')return;
      label.dataset.v20Rating='1';
      label.classList.add('v20-rating-field');
      select.classList.add('v20-rating-source');

      const controls=document.createElement('div');
      controls.className='v20-rating-control';
      for(let n=1;n<=5;n++){
        const b=document.createElement('button');
        b.type='button';
        b.className='v20-rating-chip';
        b.textContent=String(n);
        b.dataset.value=String(n);
        b.onclick=()=>{
          select.value=String(n);
          select.dispatchEvent(new Event('change',{bubbles:true}));
          [...controls.children].forEach(x=>x.classList.toggle('active',x===b));
          caption.textContent=n+' — '+labels[n];
          caption.classList.add('selected');
        };
        controls.appendChild(b);
      }

      const caption=document.createElement('span');
      caption.className='v20-rating-caption';
      caption.textContent='Not rated — tap 1 to 5';

      label.appendChild(controls);
      label.appendChild(caption);

      if(select.value){
        const active=controls.querySelector('[data-value="'+select.value+'"]');
        active?.classList.add('active');
        caption.textContent=select.value+' — '+labels[select.value];
        caption.classList.add('selected');
      }
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});
  else enhance();
})();