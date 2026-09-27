// Pickyla v20 final cleanup - compact goal selector
(function(){
  const byId=id=>document.getElementById(id);
  const goals=[
    {focus:'beginner',label:'Beginner Fundamentals',icon:'🌱',title:'Beginner',desc:'Rules, grip, scoring & core fundamentals',tier:'primary'},
    {focus:'consistency',label:'Intermediate Development',icon:'📈',title:'Intermediate',desc:'Consistency, movement & better shot selection',tier:'primary'},
    {focus:'tournament',label:'Advanced / Competitive',icon:'🏆',title:'Advanced',desc:'Pressure play, patterns & match preparation',tier:'primary'},
    {focus:'serve-return',label:'Serve & Return',icon:'🎯',title:'Serve & Return',desc:'Depth, placement and reliable point starts'},
    {focus:'footwork',label:'Footwork & Court Movement',icon:'👟',title:'Footwork',desc:'Move early, recover and stay balanced'},
    {focus:'dinking',label:'Dinking & Kitchen Play',icon:'🤝',title:'Dinking & Kitchen',desc:'Soft-game control at the non-volley zone'},
    {focus:'strategy',label:'Third Shot Drops',icon:'3️⃣',title:'Third Shot Drops',desc:'Build a repeatable drop and transition forward'},
    {focus:'strategy',label:'Resets & Transition',icon:'🛡️',title:'Resets & Transition',desc:'Neutralize pace and move through transition'},
    {focus:'consistency',label:'Volleys & Fast Hands',icon:'⚡',title:'Volleys & Fast Hands',desc:'Compact counters, blocks and hand speed'},
    {focus:'consistency',label:'Drives & Consistency',icon:'📊',title:'Drives & Consistency',desc:'Cleaner contact and fewer unforced errors'},
    {focus:'strategy',label:'Doubles Strategy & Positioning',icon:'🧠',title:'Doubles Strategy',desc:'Spacing, patterns and smarter decisions'},
    {focus:'tournament',label:'Tournament Preparation',icon:'🏅',title:'Tournament Prep',desc:'Match scenarios, pressure and competition routines'}
  ];

  function render(){
    const root=byId('goalOptions');if(!root)return;
    root.innerHTML='';
    goals.forEach((g,i)=>{
      const b=document.createElement('button');
      b.type='button';
      b.dataset.focus=g.focus;
      b.dataset.label=g.label;
      b.className='v20-goal-card'+(i>=3?' v20-goal-extra hidden':'');
      b.innerHTML='<b>'+g.icon+'</b><span>'+g.title+'</span><small>'+g.desc+'</small>';
      b.onclick=()=>{
        if(typeof chooseGoal==='function')chooseGoal(g.focus,g.label);
        root.querySelectorAll('button[data-v20-goal]').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
      };
      b.dataset.v20Goal='1';
      root.appendChild(b);
    });
    const row=document.createElement('div');
    row.className='v20-goal-toggle-row';
    row.innerHTML='<button id="v20GoalShowAll" type="button" class="v20-goal-show-all">Show All Goals</button>';
    root.insertAdjacentElement('afterend',row);
    const toggle=byId('v20GoalShowAll');
    toggle.onclick=()=>{
      const extras=[...root.querySelectorAll('.v20-goal-extra')];
      const open=toggle.getAttribute('aria-expanded')==='true';
      extras.forEach(x=>x.classList.toggle('hidden',open));
      toggle.setAttribute('aria-expanded',String(!open));
      toggle.textContent=open?'Show All Goals':'Show Only 3';
    };
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();