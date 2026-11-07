/* Fotos (Wikipédia/Wikimedia Commons), parallax, contagem animada, tilt e lightbox */
const WP=(q)=>'https://en.wikipedia.org/w/api.php?format=json&origin=*&redirects=1&'+q;
async function wpImg(t){try{const j=await(await fetch(WP('action=query&prop=pageimages&piprop=thumbnail&pithumbsize=1600&titles='+encodeURIComponent(t)))).json();return Object.values(j.query.pages)[0]?.thumbnail?.source||null}catch(e){return null}}
function countUp(){document.querySelectorAll('#page [data-count]').forEach(el=>{const n=+el.dataset.count,t0=performance.now();(function f(t){const k=Math.min(1,(t-t0)/1300);el.textContent=fmt(Math.round(n*(1-Math.pow(1-k,3))));if(k<1)requestAnimationFrame(f)})(t0)})}
async function loadMedia(d,code){
  countUp();
  const pg=document.getElementById('page');
  pg.onscroll=()=>{const b=document.getElementById('ban');if(b)b.style.setProperty('--py',Math.min(80,pg.scrollTop*.25)+'px')};
  const cap=(d.capital||[])[0];let u=null;
  for(const t of [cap,d.name.common]){if(t&&(u=await wpImg(t)))break}
  const ban=document.getElementById('ban');if(S.code!==code||!ban)return;
  if(u){const im=new Image();im.onload=()=>{if(S.code!==code)return;ban.style.setProperty('--img','url("'+u+'")');ban.innerHTML='<span>📍 '+esc(cap||nm(d))+'</span>';ban.classList.add('on')};im.onerror=()=>ban.remove();im.src=u}else ban.remove();
  try{
    const j=await(await fetch(WP('action=query&generator=images&gimlimit=50&prop=imageinfo&iiprop=url|mime&iiurlwidth=700&titles='+encodeURIComponent(d.name.common)))).json();
    const im=Object.values(j.query?.pages||{}).filter(p=>p.imageinfo&&p.imageinfo[0].mime==='image/jpeg'&&!/flag|coat|map|locator|seal|emblem|logo|icon|signature|portrait|stamp/i.test(p.title)).slice(0,9);
    const g=document.getElementById('gal');if(S.code!==code||im.length<2||!g)return;
    g.innerHTML='<h2 class="sec">📷 Galeria</h2><div class="gal">'+im.map(p=>{const i=p.imageinfo[0];return '<figure><img loading="lazy" onload="this.classList.add(\'ld\')" src="'+esc(i.thumburl)+'" data-full="'+esc(i.url)+'" data-page="'+esc(i.descriptionurl)+'" alt="'+esc(p.title.replace(/^File:|\.\w+$/g,''))+'"></figure>'}).join('')+'</div><span class="src">Imagens: Wikimedia Commons (licenças variadas; o link no visualizador leva à página de crédito).</span>';
  }catch(e){}
}
document.addEventListener('click',e=>{
  const im=e.target.closest&&e.target.closest('.gal img');
  if(im){const lb=document.createElement('div');lb.id='lb';lb.innerHTML='<img src="'+esc(im.dataset.full)+'" alt="'+esc(im.alt)+'"><a target="_blank" rel="noopener" href="'+esc(im.dataset.page)+'">'+esc(im.alt)+' — crédito e licença ↗</a>';lb.onclick=ev=>{if(ev.target.tagName!=='A')lb.remove()};document.body.appendChild(lb)}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('lb')?.remove()});
if(matchMedia('(pointer:fine)').matches)document.addEventListener('pointermove',e=>{
  const c=e.target.closest&&e.target.closest('#page .card:not(.w)');
  document.querySelectorAll('.card.tl').forEach(x=>{if(x!==c){x.classList.remove('tl');x.style.transform=''}});
  if(!c)return;const r=c.getBoundingClientRect(),px=(e.clientX-r.left)/r.width-.5,py=(e.clientY-r.top)/r.height-.5;
  c.classList.add('tl');c.style.transform='perspective(700px) rotateX('+(-py*6)+'deg) rotateY('+(px*6)+'deg) translateY(-2px)';
});
