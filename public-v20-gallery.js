// Pickyla v20 - public gallery / moments carousel
(function(){
  const root=document.getElementById('pickylaGalleryCarousel');
  const section=document.getElementById('gallerySection');
  const dots=document.getElementById('pickylaGalleryDots');
  if(!root||!section||!dots||typeof db==='undefined')return;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let index=0,timer=null,count=0,startX=null;

  function go(next){
    if(!count)return;
    index=(next+count)%count;
    root.style.transform='translateX(-'+(index*100)+'%)';
    [...dots.children].forEach((d,i)=>d.classList.toggle('active',i===index));
  }
  function restart(){
    clearInterval(timer);
    if(count>1)timer=setInterval(()=>go(index+1),10000);
  }

  async function load(){
    const {data,error}=await db.from('gallery_images')
      .select('id,storage_path,caption,sort_order')
      .eq('is_visible',true)
      .order('sort_order')
      .order('created_at');
    if(error||!data?.length){
      section.classList.add('hidden');
      return;
    }
    section.classList.remove('hidden');
    count=data.length;
    root.innerHTML=data.map((x,i)=>{
      const u=db.storage.from('pickyla-gallery').getPublicUrl(x.storage_path).data.publicUrl;
      return '<article class="v20-gallery-slide" aria-hidden="'+(i===0?'false':'true')+'">'+
        '<img src="'+esc(u)+'" alt="'+esc(x.caption||'Pickyla training moment')+'" loading="'+(i===0?'eager':'lazy')+'">'+
        (x.caption?'<div class="v20-gallery-caption">'+esc(x.caption)+'</div>':'')+
      '</article>';
    }).join('');
    dots.innerHTML=data.map((_,i)=>'<button type="button" aria-label="Show photo '+(i+1)+'" class="'+(i===0?'active':'')+'"></button>').join('');
    [...dots.children].forEach((b,i)=>b.onclick=()=>{go(i);restart();});
    root.addEventListener('touchstart',e=>{startX=e.touches[0]?.clientX??null},{passive:true});
    root.addEventListener('touchend',e=>{
      if(startX===null)return;
      const end=e.changedTouches[0]?.clientX??startX,dx=end-startX;
      if(Math.abs(dx)>45){go(index+(dx<0?1:-1));restart();}
      startX=null;
    },{passive:true});
    go(0);restart();
  }
  load();
})();