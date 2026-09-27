// Pickyla v20 - gallery admin
(function(){
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function toast20(msg){
    if(typeof toast==='function')return toast(msg);
    const t=$('#toast');if(!t)return alert(msg);t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2400);
  }
  async function load(){
    const root=$('#galleryAdminList');if(!root)return;
    const {data,error}=await db.from('gallery_images').select('*').order('sort_order').order('created_at');
    if(error){root.innerHTML='<div class="empty">'+esc(error.message)+'</div>';return;}
    const rows=data||[];
    root.innerHTML=rows.length?rows.map((x,i)=>{
      const u=db.storage.from('pickyla-gallery').getPublicUrl(x.storage_path).data.publicUrl;
      return '<article class="v20-gallery-admin-row">'+
        '<img src="'+esc(u)+'" alt="">'+
        '<div class="v20-gallery-admin-copy"><strong>'+esc(x.caption||'No caption')+'</strong>'+
        '<small>'+(x.is_visible?'Visible on public site':'Hidden')+' • Position '+(i+1)+'</small>'+
        '<div class="v20-gallery-admin-actions">'+
          '<button type="button" data-up="'+x.id+'" '+(i===0?'disabled':'')+'>↑ Up</button>'+
          '<button type="button" data-down="'+x.id+'" '+(i===rows.length-1?'disabled':'')+'>↓ Down</button>'+
          '<button type="button" data-toggle="'+x.id+'" data-visible="'+x.is_visible+'">'+(x.is_visible?'Hide':'Show')+'</button>'+
          '<button type="button" class="danger" data-delete="'+x.id+'" data-path="'+esc(x.storage_path)+'">Delete</button>'+
        '</div></div></article>';
    }).join(''):'<div class="empty">No Pickyla Moments yet. Upload the first photo above.</div>';
    root.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>move(rows,b.dataset.up,-1));
    root.querySelectorAll('[data-down]').forEach(b=>b.onclick=()=>move(rows,b.dataset.down,1));
    root.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>toggle(b.dataset.toggle,b.dataset.visible!=='true'));
    root.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>remove(b.dataset.delete,b.dataset.path));
  }
  async function move(rows,id,dir){
    const i=rows.findIndex(x=>x.id===id),j=i+dir;if(i<0||j<0||j>=rows.length)return;
    const order=rows.map((x,n)=>({id:x.id,sort:n+1}));
    const a=order.find(x=>x.id===rows[i].id),b=order.find(x=>x.id===rows[j].id),tmp=a.sort;a.sort=b.sort;b.sort=tmp;
    for(const x of order){const {error}=await db.from('gallery_images').update({sort_order:x.sort,updated_at:new Date().toISOString()}).eq('id',x.id);if(error)return toast20(error.message);}
    toast20('Gallery order updated');load();
  }
  async function toggle(id,v){
    const {error}=await db.from('gallery_images').update({is_visible:v,updated_at:new Date().toISOString()}).eq('id',id);
    if(error)return toast20(error.message);toast20(v?'Photo is now visible':'Photo hidden from public site');load();
  }
  async function remove(id,path){
    if(!confirm('Delete this Pickyla Moments photo?'))return;
    const {error:se}=await db.storage.from('pickyla-gallery').remove([path]);if(se)return toast20(se.message);
    const {error}=await db.from('gallery_images').delete().eq('id',id);if(error)return toast20(error.message);
    toast20('Photo deleted');load();
  }
  async function upload(e){
    e.preventDefault();
    const file=$('#galleryFile')?.files?.[0],caption=$('#galleryCaption')?.value.trim()||'',btn=$('#galleryUploadBtn');
    if(!file)return toast20('Choose an image first.');
    if(file.size>8*1024*1024)return toast20('Image must be 8 MB or smaller.');
    const old=btn.textContent;btn.disabled=true;btn.textContent='Uploading…';
    try{
      const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
      const path=Date.now()+'-'+crypto.randomUUID()+'.'+ext;
      const {error:ue}=await db.storage.from('pickyla-gallery').upload(path,file,{cacheControl:'3600',upsert:false});if(ue)throw ue;
      const {data:max}=await db.from('gallery_images').select('sort_order').order('sort_order',{ascending:false}).limit(1);
      const {error:ie}=await db.from('gallery_images').insert({storage_path:path,caption:caption||null,sort_order:Number(max?.[0]?.sort_order||0)+1,is_visible:true});
      if(ie){await db.storage.from('pickyla-gallery').remove([path]);throw ie;}
      $('#galleryUploadForm').reset();toast20('Photo added to Pickyla Moments');load();
    }catch(err){toast20(err.message||'Upload failed.');}
    finally{btn.disabled=false;btn.textContent=old;}
  }
  async function refresh(){
    const {data:{session}}=await db.auth.getSession();if(!session)return;load();
  }
  function init(){
    $('#galleryUploadForm')?.addEventListener('submit',upload);
    $('#refreshGalleryBtn')?.addEventListener('click',refresh);
    db.auth.onAuthStateChange((_,s)=>{if(s)setTimeout(refresh,300);});
    refresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();