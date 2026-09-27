// PICKYLA v20 Batch 4 - Player terminology + compact player views
(function(){
  const byId=id=>document.getElementById(id);

  function renameStatic(){
    const hub=byId('clientHubSection');
    if(hub){
      const eye=hub.querySelector('.panel-head .eyebrow');
      const title=hub.querySelector('.panel-head h2');
      const note=hub.querySelector('.panel-note');
      if(eye)eye.textContent='PLAYER MANAGEMENT';
      if(title)title.textContent='Players & coaching history';
      if(note)note.textContent='Search players, review sessions, active programs, payments, notes, and progress.';
    }
    const search=byId('clientSearch');
    if(search)search.placeholder='Search player name or contact';
    const add=byId('addClientBtn');
    if(add)add.textContent='+ Add Player';
    document.querySelectorAll('a[href="#clientHubSection"]').forEach(a=>a.textContent='Players');

    const detail=byId('clientDetailSection');
    const detailEye=detail?.querySelector('.panel-head .eyebrow');
    if(detailEye)detailEye.textContent='PLAYER PROFILE';

    const dialog=byId('clientDialog');
    const dialogTitle=dialog?.querySelector('.editor-head h2');
    if(dialogTitle&&/client/i.test(dialogTitle.textContent))dialogTitle.textContent=dialogTitle.textContent.replace(/client/ig,'Player');

    document.querySelectorAll('button').forEach(b=>{
      const t=b.textContent.trim();
      if(t==='Client Profile')b.textContent='Player Profile';
      if(t==='+ Add Client')b.textContent='+ Add Player';
    });
  }

  function compact(listId,buttonId,limit,label){
    const list=byId(listId);if(!list)return;
    let row=byId(buttonId)?.parentElement;
    let btn=byId(buttonId);
    if(!btn){
      row=document.createElement('div');row.className='v20-show-row';
      btn=document.createElement('button');btn.id=buttonId;btn.type='button';btn.className='secondary';
      row.appendChild(btn);list.insertAdjacentElement('afterend',row);
      btn.dataset.expanded='false';
      btn.onclick=()=>{btn.dataset.expanded=btn.dataset.expanded==='true'?'false':'true';apply();requestAnimationFrame(()=>list.closest('section')?.scrollIntoView({behavior:'smooth',block:'start'}));};
    }
    function apply(){
      const items=[...list.children].filter(el=>!el.classList.contains('empty'));
      const expanded=btn.dataset.expanded==='true';
      items.forEach((el,i)=>el.classList.toggle('v20-compact-hidden',!expanded&&i>=limit));
      btn.hidden=items.length<=limit;
      btn.textContent=expanded?'Show Less':'Show All ('+items.length+')';
      btn.setAttribute('aria-expanded',String(expanded));
      btn.setAttribute('aria-label',expanded?'Show fewer '+label:'Show all '+label);
    }
    apply();
    return {apply,collapse(){btn.dataset.expanded='false';apply();}};
  }

  function applyPlayers(){
    renameStatic();
    const c=compact('clientList','v20PlayerListToggle',3,'players');
    const count=byId('clientCountLabel');
    if(count)count.textContent=count.textContent.replace(/clients?/i,m=>m.toLowerCase().startsWith('client')?(m.endsWith('s')?'players':'player'):m);
    return c;
  }
  function applyHistory(){renameStatic();return compact('clientSessionHistory','v20PlayerHistoryToggle',3,'player session history');}

  function wrap(){
    if(typeof loadV17Clients==='function'&&!window.__pickylaV20PlayerLoad){
      window.__pickylaV20PlayerLoad=true;
      const prior=loadV17Clients;
      loadV17Clients=async function(...args){const r=await prior(...args);applyPlayers();return r;};
    }
    if(typeof renderV17ClientSessions==='function'&&!window.__pickylaV20PlayerHistory){
      window.__pickylaV20PlayerHistory=true;
      const prior=renderV17ClientSessions;
      renderV17ClientSessions=function(...args){const r=prior(...args);applyHistory();return r;};
    }
    if(typeof openV17Client==='function'&&!window.__pickylaV20PlayerOpen){
      window.__pickylaV20PlayerOpen=true;
      const prior=openV17Client;
      openV17Client=async function(...args){const r=await prior(...args);renameStatic();applyHistory();return r;};
    }
    if(typeof renderBookingGroups==='function'&&!window.__pickylaV20PlayerBookingLabels){
      window.__pickylaV20PlayerBookingLabels=true;
      const prior=renderBookingGroups;
      renderBookingGroups=function(...args){const r=prior(...args);renameStatic();return r;};
    }
  }

  function install(){
    renameStatic();wrap();applyPlayers();applyHistory();
    byId('clientSearch')?.addEventListener('input',()=>setTimeout(()=>{const x=applyPlayers();x?.collapse();},0));
    try{
      db.auth.onAuthStateChange((event,session)=>{
        if(session&&(event==='SIGNED_IN'||event==='INITIAL_SESSION'))setTimeout(()=>{renameStatic();applyPlayers();},900);
      });
    }catch(_e){}
  }
  window.pickylaV20Players={applyPlayers,applyHistory,renameStatic};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();