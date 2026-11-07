const API='https://restcountries.com/v3.1';
const GEO='https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json';
const CONT={
 america:{n:'América',c:'#b8a47e',b:[[-56,-170],[72,-30]]},
 europe:{n:'Europa',c:'#8fa3a8',b:[[34,-25],[72,45]]},
 africa:{n:'África',c:'#c4a07a',b:[[-36,-20],[38,52]]},
 asia:{n:'Ásia',c:'#9eaf94',b:[[-10,25],[78,150]]},
 oceania:{n:'Oceania',c:'#a99bb3',b:[[-48,110],[2,180]]},
 antarctica:{n:'Antártida',c:'#c9d3d6',b:[[-86,-180],[-62,180]]}
};
const WORLD=[[-58,-170],[82,180]];
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const fmt=n=>Number(n).toLocaleString('pt-BR');
const toC=a=>({'North America':'america','South America':'america',Europe:'europe',Africa:'africa',Asia:'asia',Oceania:'oceania',Antarctica:'antarctica'})[(a||[])[0]]||null;
const nm=c=>c.translations?.por?.common||c.name.common;
let favs=[];try{favs=JSON.parse(localStorage.getItem('atlas-favs')||'[]')}catch(e){}
const saveF=()=>{try{localStorage.setItem('atlas-favs',JSON.stringify(favs))}catch(e){}};
const S={metric:null,bins:null,cmp:[],mode:'world',cont:null,code:null,hov:null,list:[],by:{},layers:[],prevCont:undefined};

const map=L.map('map',{minZoom:1,zoomSnap:.25,maxBounds:[[-90,-200],[90,200]],maxBoundsViscosity:.8});
map.fitBounds(WORLD);

function sty(l){
  const c=l.cont;
  if(!c)return{fillColor:'#e4e0d6',color:'#fff',weight:.4,fillOpacity:1};
  if(S.mode==='world'){const h=S.hov===c;return{fillColor:col(l),color:h?'#1f2a30':'#fff',weight:h?1.2:.5,fillOpacity:h?1:.85}}
  if(c===S.cont){const h=S.hov===l.code,s=S.code===l.code;return{fillColor:s?'#8a6d3b':col(l),color:h||s?'#1f2a30':'#fff',weight:h||s?2:.8,fillOpacity:h||s?1:.8}}
  return{fillColor:'#e8e5dc',color:'#fff',weight:.4,fillOpacity:1};
}
const refresh=()=>S.layers.forEach(l=>l.setStyle(sty(l)));
function tip(l){
  const c=S.by[l.code];
  if(S.metric&&c){const v=MET[S.metric](c);return esc(nm(c))+'<br>'+(v>0?fmt(Math.round(v*10)/10)+({population:' hab.',area:' km²',dens:' hab/km²'})[S.metric]:'sem dados')}
  if(S.mode==='world')return l.cont?'Continente: '+CONT[l.cont].n:esc(l.fname);
  return esc(c?nm(c):l.fname);
}
function buildMap(geo){S.geo=geo;
  L.geoJSON(geo,{
    style:{weight:.5},
    onEachFeature(f,l){
      l.code=f.id;l.fname=f.properties.name;
      const c=S.by[f.id];l.cont=c?toC(c.continents):null;
      l.bindTooltip(()=>tip(l),{sticky:true});
      l.on('mouseover',()=>{S.hov=S.mode==='world'?l.cont:l.code;refresh()});
      l.on('mouseout',()=>{S.hov=null;refresh()});
      l.on('click',()=>{
        if(S.mode==='world'){if(l.cont)location.hash='#/c/'+l.cont}
        else if(S.by[l.code])location.hash='#/p/'+l.code;
      });
      S.layers.push(l);
    }
  }).addTo(map);
}

/* ---------- Lista lateral ---------- */
function renderList(){
  const q=norm($('#q').value.trim()),fc=$('#fc').value,ff=$('#ff').checked;
  const items=S.list.filter(c=>{
    if(fc&&toC(c.continents)!==fc)return false;
    if(ff&&!favs.includes(c.cca3))return false;
    if(!q)return true;
    return [nm(c),c.name.common,c.name.official,c.cca3,c.cca2].some(x=>norm(x).includes(q));
  });
  $('#count').textContent=items.length+' de '+S.list.length+' países/territórios';
  $('#list').innerHTML=items.map(c=>`<li data-c="${c.cca3}" class="${S.code===c.cca3?'on':''}"><img loading="lazy" src="${esc(c.flags.svg||c.flags.png)}" alt=""><span>${esc(nm(c))}</span><button class="fav ${favs.includes(c.cca3)?'on':''}" data-f="${c.cca3}" title="Favoritar" aria-label="Favoritar">${favs.includes(c.cca3)?'★':'☆'}</button></li>`).join('')||'<li class="msg">Nenhum país encontrado.</li>';
}
function toggleFav(code){
  favs=favs.includes(code)?favs.filter(x=>x!==code):[...favs,code];saveF();renderList();
  const b=$('#pf');if(b&&S.code===code){b.textContent=favs.includes(code)?'★ Favorito':'☆ Favoritar'}
}
$('#list').addEventListener('click',e=>{
  const f=e.target.closest('[data-f]');if(f){e.stopPropagation();toggleFav(f.dataset.f);return}
  const li=e.target.closest('li[data-c]');if(li){location.hash='#/p/'+li.dataset.c;$('#side').classList.remove('open')}
});
$('#q').addEventListener('input',renderList);$('#fc').addEventListener('change',renderList);$('#ff').addEventListener('change',renderList);
$('#tg').addEventListener('click',()=>$('#side').classList.toggle('open'));
Object.entries(CONT).forEach(([k,v])=>$('#fc').insertAdjacentHTML('beforeend',`<option value="${k}">${v.n}</option>`));

/* ---------- Rotas ---------- */
function route(){
  const h=location.hash.replace(/^#\/?/,'').split('/');
  let page=null;
  if(h[0]==='c'&&CONT[h[1]]){S.mode='cont';S.cont=h[1];S.code=null}
  else if(h[0]==='p'&&S.by[h[1]]){
    const c=S.by[h[1]];S.code=c.cca3;page=c;
    const k=toC(c.continents);
    if(k){S.mode='cont';S.cont=k}else{S.mode='world';S.cont=null}
  }else{S.mode='world';S.cont=null;S.code=null}
  if(S.cont!==S.prevCont){
    const first=S.prevCont===undefined;S.prevCont=S.cont;
    map.flyToBounds(S.cont?CONT[S.cont].b:WORLD,{duration:first?0:.9});
  }
  refresh();
  $('#hint').textContent=S.mode==='world'?'Clique em um continente para explorá-lo':'Clique em um país • arraste para mover • role para dar zoom';
  let cr='<a href="#/">Mundo</a>';
  if(S.cont)cr+=` › <a href="#/c/${S.cont}">${CONT[S.cont].n}</a>`;
  if(page)cr+=' › '+esc(nm(page));
  $('#crumbs').innerHTML=cr;
  $('#fc').value=S.cont||$('#fc').value;
  renderList();
  page?openPage(page):($('#page').classList.remove('show'),$('#hint').style.display='');
  if(page)$('#hint').style.display='none';
}
window.addEventListener('hashchange',route);

/* ---------- Página do país ---------- */
function clip(x){
  x=x.trim().replace(/\n+/g,' ');
  if(x.length<=650)return x;
  const cut=x.slice(0,650),i=cut.lastIndexOf('. ');
  return (i>200?cut.slice(0,i+1):cut)+(i>200?'':'…');
}
function parseWiki(t){
  const p=t.split(/^=+\s*(.+?)\s*=+\s*$/m),o=[{t:'Resumo',x:p[0]}];
  for(let i=1;i<p.length;i+=2)o.push({t:p[i],x:p[i+1]||''});
  return o;
}
const DEFS=[
 ['📖','Resumo',/^Resumo$/],['📜','História',/^Hist[óo]ria/i],['⛰️','Geografia',/^Geografia/i],
 ['🏞️','Relevo e rios',/Relevo|Hidrografia|Rios|Montanhas|Topografia/i],['🌦️','Clima',/^Clima/i],
 ['🏛️','Governo e política',/Pol[íi]tica|Governo|Sistema pol/i],['🕊️','Religião',/Religi/i],
 ['🎭','Cultura e tradições',/^Cultura|Tradi/i],['🍽️','Culinária',/Culin|Gastron|Comida/i],
 ['🎉','Festividades e feriados',/Feriado|Festiv|Festas/i],['📸','Turismo e lugares famosos',/Turismo|Atra[çc]/i]
];
async function getWiki(c){
  for(const t of [c.translations?.por?.common,c.name.common]){
    if(!t)continue;
    try{
      const r=await fetch('https://pt.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&format=json&origin=*&titles='+encodeURIComponent(t));
      const j=await r.json(),pg=Object.values(j.query.pages)[0];
      if(pg&&pg.extract&&pg.extract.length>200)return{title:pg.title,secs:parseWiki(pg.extract)};
    }catch(e){}
  }
  return null;
}
async function openPage(c){
  const el=$('#page');el.classList.add('show');
  el.innerHTML='<div class="msg"><div class="sp" style="margin:0 auto 12px"></div>Carregando informações de '+esc(nm(c))+'…</div>';
  el.scrollTop=0;
  const code=c.cca3;
  let d=c;
  try{const r=await fetch(API+'/alpha/'+code);if(r.ok)d=(await r.json())[0]}catch(e){}
  if(S.code!==code)return;
  const cont=toC(d.continents);
  const sib=S.list.filter(x=>toC(x.continents)===cont);
  const i=sib.findIndex(x=>x.cca3===code),prev=sib[i-1],next=sib[i+1];
  const kv=(l,v)=>v?`<div><small>${l}</small>${v}</div>`:'';
  const langs=d.languages?Object.values(d.languages).join(', '):'';
  const cur=d.currencies?Object.values(d.currencies).map(x=>x.name+(x.symbol?' ('+x.symbol+')':'')).join(', '):'';
  const idd=d.idd?.root?d.idd.root+(d.idd.suffixes?.length===1?d.idd.suffixes[0]:''):'';
  const dem=d.demonyms?.eng?.m;
  const bord=(d.borders||[]).map(b=>S.by[b]?`<a class="chip" href="#/p/${b}">${esc(nm(S.by[b]))}</a>`:'').join('');
  const gen=[
    kv('🏳️ Nome oficial',esc(d.name.official)),kv('📍 Capital',esc((d.capital||[]).join(', '))||'—'),
    kv('🌐 Continente',esc(cont?CONT[cont].n:(d.continents||[]).join(', '))),kv('🧭 Sub-região',esc(d.subregion)),
    kv('👥 População (estimativa)',d.population!=null?`<span data-count="${d.population}">${fmt(d.population)}</span>`:''),kv('📐 Área',d.area?`<span data-count="${d.area}">${fmt(d.area)}</span> km²`:''),
    kv('🗣️ Idioma(s) oficial(is)',esc(langs)),kv('💰 Moeda',esc(cur)),
    kv('🧑 Gentílico (em inglês)',esc(dem)),kv('🕒 Fuso(s) horário(s)',esc((d.timezones||[]).join(', '))),
    kv('📞 Código telefônico',esc(idd)),kv('🔤 Códigos ISO',esc(d.cca2+' / '+d.cca3)),
    kv('🏛️ Status',d.independent===false?'Território / dependência':'Estado soberano'+(d.unMember?' • Membro da ONU':'')),
    kv('🌊 Acesso ao mar',d.landlocked?'Sem litoral':'Possui litoral'),kv('🚗 Mão de direção',d.car?.side==='left'?'Esquerda':d.car?.side==='right'?'Direita':'')
  ].join('');
  const geo=[
    kv('📌 Coordenadas centrais',d.latlng?d.latlng.map(x=>x.toFixed(1)+'°').join(', '):''),
    kv('📏 Extensão territorial',d.area?fmt(d.area)+' km²':'')
  ].join('');
  el.innerHTML=`<div class="wrap">
  <div class="nav">
    ${cont?`<a class="btn" href="#/c/${cont}">← Mapa: ${CONT[cont].n}</a>`:''}
    <a class="btn" href="#/">🌍 Mapa-múndi</a>
    ${prev?`<a class="btn" href="#/p/${prev.cca3}">‹ ${esc(nm(prev))}</a>`:''}
    ${next?`<a class="btn" href="#/p/${next.cca3}">${esc(nm(next))} ›</a>`:''}
  </div>
  <div class="ban" id="ban"></div><div class="hero"><img src="${esc(d.flags.svg||d.flags.png)}" alt="Bandeira: ${esc(d.flags.alt||nm(d))}">
   <div><h1>${esc(nm(d))}</h1><p>${esc(d.name.official)}</p><p>${esc(cont?CONT[cont].n:'')} • ${esc(d.subregion||'')}</p>
   <button class="btn" id="pf">${favs.includes(code)?'★ Favorito':'☆ Favoritar'}</button> <button class="btn" id="pc">⚖️ Comparar</button></div></div>
  <h2 class="sec">Informações gerais</h2>
  <div class="card w"><div class="kv">${gen}</div>
   <span class="src">Fonte: <a href="https://restcountries.com" target="_blank" rel="noopener">REST Countries API</a>. A população é uma estimativa; a API não informa o ano de referência.</span></div>
  <h2 class="sec">Geografia</h2>
  <div class="grid"><div class="card"><h3>🧭 Localização</h3><div class="kv">${geo}</div>
   <span class="src"><a target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${d.latlng?.[0]}&mlon=${d.latlng?.[1]}#map=5/${d.latlng?.[0]}/${d.latlng?.[1]}">Ver no OpenStreetMap</a></span></div>
   <div class="card"><h3>🗺️ Fronteiras</h3>${bord?`<div class="chips">${bord}</div>`:'<p>Sem fronteiras terrestres registradas (ilha ou território isolado).</p>'}</div></div>
  <div class="card w" style="padding:0;overflow:hidden;margin-top:14px"><div id="m2" style="height:260px"></div></div>
  <div class="card w" id="wd" style="display:none;margin-top:14px"></div>
  <div id="gal"></div><div id="wk"><div class="msg">Carregando história, cultura e geografia (Wikipédia)…</div></div></div>`;
  window.loadMedia&&loadMedia(d,code);
  $('#pf').onclick=()=>toggleFav(code);
  $('#pc').onclick=()=>{if(!S.cmp.includes(code)&&S.cmp.length<4)S.cmp.push(code);openOv('cmp')};
  try{
    const m2=L.map('m2',{scrollWheelZoom:false,attributionControl:false});let bb;
    const g=L.geoJSON(S.geo,{style:f=>({fillColor:f.id===code?'#8a6d3b':'#e4e0d6',color:'#fff',weight:.5,fillOpacity:1})}).addTo(m2);
    g.eachLayer(l=>{if(l.feature.id===code)bb=l.getBounds()});
    if(d.latlng)L.circleMarker(d.latlng,{radius:5,color:'#1f2a30',weight:1,fillColor:'#8a6d3b',fillOpacity:1}).addTo(m2);
    bb?m2.fitBounds(bb.pad(.8),{maxZoom:5}):m2.setView(d.latlng||[0,0],4);
  }catch(e){}
  getWD(code).then(h=>{if(h&&S.code===code){$('#wd').innerHTML=h;$('#wd').style.display=''}});
  const w=await getWiki(d);
  if(S.code!==code)return;
  const box=$('#wk');
  if(!w){box.innerHTML='<div class="card"><p>Texto sobre história e cultura indisponível no momento. Tente novamente mais tarde.</p></div>';return}
  const url='https://pt.wikipedia.org/wiki/'+encodeURIComponent(w.title.replace(/ /g,'_'));
  const used=new Set();
  const cards=DEFS.map(([ic,lb,re])=>{
    const s=w.secs.find((x,k)=>!used.has(k)&&re.test(x.t)&&x.x.trim().length>80);
    if(!s)return'';used.add(w.secs.indexOf(s));
    return `<div class="card"><h3>${ic} ${lb}</h3><p>${esc(clip(s.x))}</p><span class="src">Fonte: <a target="_blank" rel="noopener" href="${url}">Wikipédia (CC BY-SA)</a></span></div>`;
  }).join('');
  box.innerHTML=`<h2 class="sec">História, cultura e sociedade</h2><div class="grid">${cards||'<div class="card"><p>Sem seções detalhadas.</p></div>'}</div>
  <p class="src" style="margin-top:14px">Textos resumidos do artigo “${esc(w.title)}”. <a target="_blank" rel="noopener" href="${url}">Leia o artigo completo</a>.</p>`;
  window.buildTimeline&&buildTimeline(w,d,code);
}

/* ---------- Mapa temático ---------- */
const RAMP=['#f1e8d3','#e0cfa4','#cdb27a','#b08f55','#8a6d3b','#5c4521'];
const MET={population:c=>c.population,area:c=>c.area,dens:c=>c.area?c.population/c.area:null};
const col=l=>S.metric?mcol(S.by[l.code]):CONT[l.cont].c;
function mcol(c){const v=MET[S.metric](c);if(!(v>0))return'#e4e0d6';let i=0;while(i<5&&v>=S.bins[i])i++;return RAMP[i]}
function setMetric(m){
  S.metric=m||null;S.bins=null;
  if(m){const v=S.list.map(MET[m]).filter(x=>x>0).sort((a,b)=>a-b);S.bins=[1,2,3,4,5].map(i=>v[Math.floor(v.length*i/6)])}
  const el=$('#lg');
  if(!m)el.style.display='none';
  else{const b=S.bins,f=n=>new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1}).format(n);
    const lab=['até '+f(b[0]),...b.slice(0,4).map((x,i)=>f(x)+' – '+f(b[i+1])),'acima de '+f(b[4])];
    el.style.display='block';
    el.innerHTML='<b>'+({population:'População',area:'Área (km²)',dens:'Hab/km²'})[m]+'</b> (quantis)<br>'+RAMP.map((c,i)=>`<span style="display:inline-block;width:14px;height:10px;background:${c};margin-right:6px"></span>${lab[i]}`).join('<br>')}
  refresh();
}
$('#mm').addEventListener('change',e=>setMetric(e.target.value));

/* ---------- Wikidata: governo e Estado ---------- */
const wdCache={};
async function getWD(code){
  if(wdCache[code]!==undefined)return wdCache[code];
  const cur=(p,v)=>`OPTIONAL{?c p:${p} ?s${v}.?s${v} ps:${p} ?${v}.FILTER NOT EXISTS{?s${v} pq:P582 []}}`;
  const q=`SELECT ?gLabel ?hLabel ?hcLabel ?i ?pLabel WHERE{?c wdt:P298 "${code}".${cur('P122','g')}${cur('P35','h')}${cur('P6','hc')}OPTIONAL{?c wdt:P571 ?i}OPTIONAL{?c wdt:P610 ?p}SERVICE wikibase:label{bd:serviceParam wikibase:language "pt,en".}}LIMIT 60`;
  try{
    const r=await fetch('https://query.wikidata.org/sparql?format=json&origin=*&query='+encodeURIComponent(q));
    const rows=(await r.json()).results.bindings;
    const u=k=>[...new Set(rows.map(x=>x[k]?.value).filter(v=>v&&!/^Q\d+$/.test(v)))];
    const yrs=u('i').map(x=>(x.match(/-?\d{4}/)||[])[0]).filter(Boolean);
    const Y=[...new Set(yrs)].sort().slice(-2).join(' / ');
    const kv=(l,v)=>v?`<div><small>${l}</small>${esc(v)}</div>`:'';
    const body=kv('Forma de governo',u('gLabel').slice(0,3).join('; '))+kv('Chefe de Estado',u('hLabel').slice(0,3).join('; '))+kv('Chefe de governo',u('hcLabel').slice(0,3).join('; '))+kv('Formação / início do Estado (ano)',Y)+kv('Ponto mais alto',u('pLabel').slice(0,2).join('; '));
    return wdCache[code]=body?`<h3>🏛️ Estado e governo</h3><div class="kv">${body}</div><span class="src">Fonte: <a target="_blank" rel="noopener" href="https://www.wikidata.org">Wikidata</a>. Dados colaborativos; confira em fontes oficiais.</span>`:'';
  }catch(e){return wdCache[code]=''}
}

/* ---------- Comparador e Quiz ---------- */
const shuffle=a=>[...a].sort(()=>Math.random()-.5);
const ov=$('#ov'),ovc=$('#ovc'),Q={n:0,s:0,mode:'flag',q:[]};
function openOv(k){ov.classList.add('show');if(k==='cmp')cmpR();else{ovc.innerHTML='<h2>🎯 Quiz geográfico</h2><p>Escolha o modo (10 perguntas):</p><button class="btn" data-q="flag">🏳️ Bandeiras</button> <button class="btn" data-q="cap">📍 Capitais</button>'}}
function cmpR(){
  const L_=S.cmp.map(c=>S.by[c]).filter(Boolean);
  const dens=c=>c.area?c.population/c.area:0;
  const num=[['👥 População (estimativa)',c=>c.population],['📐 Área (km²)',c=>c.area],['🏙️ Densidade (hab/km²)',dens]];
  const opts=S.list.map(c=>`<option value="${c.cca3}">${esc(nm(c))}</option>`).join('');
  let t='';
  if(L_.length){
    t=`<div style="overflow-x:auto"><table class="cp"><tr><th></th>${L_.map(c=>`<th><img src="${esc(c.flags.svg||c.flags.png)}" alt=""><a href="#/p/${c.cca3}" onclick="ov.classList.remove('show')">${esc(nm(c))}</a> <button class="fav" data-rm="${c.cca3}" title="Remover">✕</button></th>`).join('')}</tr>
    <tr><td>📍 Capital</td>${L_.map(c=>`<td>${esc(c.capital?.[0]||'—')}</td>`).join('')}</tr>
    <tr><td>🌐 Continente</td>${L_.map(c=>`<td>${esc(CONT[toC(c.continents)]?.n||'—')}</td>`).join('')}</tr>
    ${num.map(([l,f])=>{const mx=Math.max(...L_.map(f),1);return`<tr><td>${l}</td>${L_.map(c=>`<td>${fmt(Math.round(f(c)*10)/10)}<div class="bar" style="width:${f(c)/mx*100}%"></div></td>`).join('')}</tr>`}).join('')}</table></div>`;
  }else t='<p class="msg">Adicione de 2 a 4 países para comparar.</p>';
  ovc.innerHTML=`<h2>⚖️ Comparar países</h2><p><select id="cs" style="padding:8px;border-radius:8px;border:1px solid var(--line)"><option value="">+ Adicionar país…</option>${opts}</select> <span class="src" style="display:inline">máx. 4 • fonte: REST Countries</span></p>${t}`;
}
function quizStart(m){Q.mode=m;Q.n=0;Q.s=0;Q.q=shuffle(S.list.filter(c=>c.capital?.[0]&&toC(c.continents))).slice(0,10);quizQ()}
function quizQ(){
  if(Q.n>=10){ovc.innerHTML=`<h2>Fim! Você acertou ${Q.s} de 10 ${Q.s>=8?'🏆':Q.s>=5?'👏':'📚'}</h2><button class="btn" data-q="flag">🏳️ Jogar bandeiras</button> <button class="btn" data-q="cap">📍 Jogar capitais</button>`;return}
  const a=Q.q[Q.n],pool=S.list.filter(c=>c.capital?.[0]&&c!==a),flag=Q.mode==='flag';
  const o=shuffle([a,...shuffle(pool).slice(0,3)]);
  ovc.innerHTML=`<p class="src" style="font-size:13px">Pergunta ${Q.n+1}/10 • Acertos: ${Q.s}</p>`+(flag?`<img src="${esc(a.flags.svg||a.flags.png)}" alt="Bandeira" style="width:220px;max-width:80%;border:1px solid var(--line)"><h3 style="margin:10px 0">De qual país é esta bandeira?</h3>`:`<h3 style="margin:10px 0">Qual é a capital de ${esc(nm(a))}?</h3>`)+o.map(x=>`<button class="btn qo" data-k="${x.cca3}">${esc(flag?nm(x):x.capital[0])}</button>`).join('');
}
ov.addEventListener('click',e=>{
  const t=e.target.closest('button');if(!t)return;
  if(t.id==='cl')ov.classList.remove('show');
  else if(t.dataset.rm){S.cmp=S.cmp.filter(x=>x!==t.dataset.rm);cmpR()}
  else if(t.dataset.q)quizStart(t.dataset.q);
  else if(t.dataset.k&&!t.disabled){
    const right=Q.q[Q.n].cca3;if(t.dataset.k===right)Q.s++;
    ovc.querySelectorAll('.qo').forEach(b=>{b.disabled=true;if(b.dataset.k===right)b.style.background='#cfe6c9';else if(b===t)b.style.background='#f0c7c0'});
    setTimeout(()=>{Q.n++;quizQ()},1100);
  }
});
ov.addEventListener('change',e=>{if(e.target.id==='cs'&&e.target.value){if(!S.cmp.includes(e.target.value)&&S.cmp.length<4)S.cmp.push(e.target.value);cmpR()}});
$('#bc').onclick=()=>openOv('cmp');$('#bq').onclick=()=>openOv('quiz');
document.addEventListener('keydown',e=>{if(e.key==='Escape')ov.classList.remove('show')});

/* ---------- Inicialização ---------- */
async function init(){
  $('#boot').style.display='flex';
  $('#boot').innerHTML='<div class="sp"></div><div>Carregando mapas e dados dos países…</div>';
  try{
    const [r,g]=await Promise.all([
      fetch(API+'/all?fields=name,cca3,cca2,continents,translations,flags,latlng,population,area,capital'),
      fetch(GEO)
    ]);
    if(!r.ok||!g.ok)throw new Error('http');
    const list=await r.json(),geo=await g.json();
    list.sort((a,b)=>nm(a).localeCompare(nm(b),'pt'));
    S.list=list;list.forEach(c=>S.by[c.cca3]=c);
    buildMap(geo);
    $('#boot').style.display='none';
    route();
    window.initGlobe&&initGlobe();
  }catch(e){
    $('#boot').innerHTML='<div style="font-size:40px">⚠️</div><div>Não foi possível carregar os dados (verifique sua conexão).</div><button class="btn" id="rt">Tentar novamente</button>';
    $('#rt').onclick=init;
  }
}
addEventListener('DOMContentLoaded',init);
