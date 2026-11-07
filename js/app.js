const API='https://restcountries.com/v3.1';
const GEO=['https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json','https://cdn.jsdelivr.net/gh/johan/world.geo.json@master/countries.geo.json'];
const ALT=['https://cdn.jsdelivr.net/gh/mledoze/countries@master/countries.json','https://raw.githubusercontent.com/mledoze/countries/master/countries.json'];
const CONT={
  america:{n:'América',r:[-75,-8],k:1.05},europe:{n:'Europa',r:[14,52],k:2.6},africa:{n:'África',r:[20,2],k:1.6},
  asia:{n:'Ásia',r:[90,34],k:1.5},oceania:{n:'Oceania',r:[140,-25],k:2.3},antarctica:{n:'Antártida',r:[0,-85],k:1.7}
};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const fmt=n=>Number(n).toLocaleString('pt-BR');
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const nm=c=>c.translations?.por?.common||c.name.common;
const toC=c=>{const x=(c.continents||[])[0];return({'North America':'america','South America':'america',Europe:'europe',Africa:'africa',Asia:'asia',Oceania:'oceania',Antarctica:'antarctica'})[x]||null};
const big=v=>v>=1e12?(v/1e12).toLocaleString('pt-BR',{maximumFractionDigits:2})+' tri':v>=1e9?(v/1e9).toLocaleString('pt-BR',{maximumFractionDigits:1})+' bi':(v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mi';
const j=async(u,t=20000)=>{const ac=new AbortController(),id=setTimeout(()=>ac.abort(),t);try{const r=await fetch(u,{signal:ac.signal});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(id)}};
const first=async(urls,label)=>{let m=label;for(const u of urls){try{return await j(u)}catch(e){m=label+': '+(e.name==='AbortError'?'tempo esgotado':e.message)}}throw new Error(m)};
const wb=(code,ind)=>j('https://api.worldbank.org/v2/country/'+code+'/indicator/'+ind+'?format=json&mrnev=1').then(r=>{const x=r[1]&&r[1][0];return x&&x.value!=null?{v:x.value,y:x.date}:null}).catch(()=>null);
const wiki=t=>j('https://pt.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(t.replace(/ /g,'_'))).then(r=>{if(r.type==='disambiguation'||!r.extract)return null;const s=r.extract.split(/(?<=[.!?])\s+/).slice(0,2).join(' ');return s.length>300?s.slice(0,s.lastIndexOf(' ',300))+'...':s}).catch(()=>null);

const S={by:{},list:[],feat:{},mode:'world',cont:null,sel:null,rot:[-30,-15],k:1,cx:0,cy:0,busy:false};
let W,H,R,paths,gC;
const svg=d3.select('#map'),proj=d3.geoOrthographic().clipAngle(90).precision(.4),path=d3.geoPath(proj),grat=d3.geoGraticule10();
let atm,sph,gr,shade;

function view(){
  const m=W<=800,open=!!S.sel;
  return{cx:open&&!m?(W-400)/2:W/2,cy:open&&m?H*.3+40:H/2+52,f:open&&m?.6:1};
}
function size(){
  W=innerWidth;H=innerHeight;R=Math.max(130,Math.min(W*.44,(H-190)/2));
  svg.attr('viewBox',[0,0,W,H]);
}
function draw(){
  proj.scale(R*S.k).translate([S.cx,S.cy]).rotate(S.rot);
  const r=R*S.k;
  atm.attr('cx',S.cx).attr('cy',S.cy).attr('r',r*1.09);
  sph.attr('cx',S.cx).attr('cy',S.cy).attr('r',r);
  shade.attr('cx',S.cx).attr('cy',S.cy).attr('r',r);
  gr.attr('d',path(grat));
  paths.attr('d',path);
}
function go(rot,k,done){
  const v=view(),dl=((rot[0]-S.rot[0]+540)%360)-180,tr=[S.rot[0]+dl,rot[1]];
  const a=d3.interpolate(S.rot,tr),b=d3.interpolateNumber(S.k,k*(v.f||1)),c=d3.interpolateNumber(S.cx,v.cx),e=d3.interpolateNumber(S.cy,v.cy);
  S.busy=true;
  d3.transition('v').duration(1500).ease(d3.easeCubicInOut).tween('v',()=>t=>{S.rot=a(t);S.k=b(t);S.cx=c(t);S.cy=e(t);draw()}).on('end',()=>{S.busy=false;done&&done()});
}
function paint(){
  paths.classed('dim',d=>S.mode==='cont'&&d.cont!==S.cont).classed('sel',d=>d.code===S.sel);
}
function ui(){
  $('#back').hidden=S.mode==='world';
  $('#back span').textContent=S.sel?CONT[S.cont].n:'Mundo';
  const c=S.cont?CONT[S.cont].n:'',p=S.sel?' / '+nm(S.by[S.sel]):'';
  $('#crumb').textContent=c+p;
  $('#hint').style.opacity=S.sel?0:1;
  $('#hint').textContent=S.mode==='world'?'Passe o mouse sobre um continente e clique':'Escolha um país no mapa';
}
function focus(ct,done){
  S.mode='cont';S.cont=ct;S.sel=null;closePanel();paint();ui();
  go([-CONT[ct].r[0],-CONT[ct].r[1]],CONT[ct].k,done);
}
function back(){
  if(S.sel){S.sel=null;closePanel();paint();ui();go([-CONT[S.cont].r[0],-CONT[S.cont].r[1]],CONT[S.cont].k)}
  else if(S.mode==='cont'){S.mode='world';S.cont=null;paint();ui();go([S.rot[0],-15],1)}
}
function closePanel(){$('#panel').classList.remove('open')}

function facts(c,d){
  const L=S.list,out=[],ct=toC(c);
  const ra=L.filter(x=>x.area>c.area).length+1,rp=L.filter(x=>x.population>c.population).length+1;
  const rc=L.filter(x=>toC(x)===ct&&x.area>c.area).length+1;
  if(c.area&&ra<=25)out.push(ra+'º maior país do mundo em área');
  if(c.population&&rp<=25)out.push(rp+'º país mais populoso do mundo');
  if(c.area&&ct&&rc<=3&&ra>25)out.push(rc+'º maior de '+CONT[ct].n+' em área');
  if(d.landlocked)out.push('Não possui litoral');
  if((d.timezones||[]).length>2)out.push('Abrange '+d.timezones.length+' fusos horários');
  if(d.car&&d.car.side==='left')out.push('Os veículos circulam pela mão esquerda');
  const b=(d.borders||[]).length;if(b>=6)out.push('Faz fronteira com '+b+' países');
  if(c.area&&c.population/c.area>1000)out.push('Densidade acima de 1.000 hab/km²');
  if(!out.length&&d.subregion)out.push('Localizado em '+d.subregion);
  return out.slice(0,2);
}
function card(i,ic,l,v,s,cls){
  return '<div class="card '+(cls||'')+'" style="--i:'+i+'"><i class="bi bi-'+ic+'"></i><small>'+l+'</small><b>'+v+'</b>'+(s?'<em>'+s+'</em>':'')+'</div>';
}
async function select(code){
  const c=S.by[code],f=S.feat[code];
  S.sel=code;paint();ui();
  const b=d3.geoBounds(f);let sp=Math.max(((b[1][0]-b[0][0])+360)%360,b[1][1]-b[0][1]);
  const k=Math.max(1.3,Math.min(8,60/Math.max(sp,1))),ce=d3.geoCentroid(f);
  go([-ce[0],-ce[1]],k);
  const p=$('#panel');
  p.innerHTML='<button class="x" aria-label="Fechar"><i class="bi bi-x-lg"></i></button><h2>'+esc(nm(c))+'</h2><p class="off">'+esc(c.name.official)+'</p><div class="grid"><div class="card w" style="--i:0"><i class="bi bi-flag"></i><small>Bandeira</small><img src="'+esc(c.flags.svg||c.flags.png)+'" alt="Bandeira"></div></div>';
  p.querySelector('.x').onclick=back;
  p.classList.add('open');p.scrollTop=0;
  const [d,gdp,pop,about]=await Promise.all([j(API+'/alpha/'+code).then(a=>a[0]).catch(()=>c),wb(code,'NY.GDP.MKTP.CD'),wb(code,'SP.POP.TOTL'),wiki(nm(c))]);
  if(S.sel!==code)return;
  const pv=pop?pop.v:c.population,fa=facts(c,d);
  const cur=d.currencies?Object.values(d.currencies).map(x=>esc(x.name)+(x.symbol?' ('+esc(x.symbol)+')':'')).join(', '):'—';
  const bd=(d.borders||[]).map(x=>S.by[x]?esc(nm(S.by[x])):null).filter(Boolean);
  const ra=S.list.filter(x=>x.area>c.area).length+1;
  const items=[
    card(1,'building','Capital',esc((c.capital||[]).join(', ')||'—'),''),
    card(2,'people','População',pv!=null?fmt(pv):'—',pop?'Banco Mundial, '+pop.y:'Estimativa'),
    card(3,'cash-coin','PIB',gdp?'US$ '+big(gdp.v):'—',gdp?'Banco Mundial, '+gdp.y:'Dado indisponível'),
    card(4,'rulers','Área',c.area?fmt(c.area)+' km²':'—',c.area?ra+'º do mundo':''),
    card(5,'translate','Idiomas',esc(d.languages?Object.values(d.languages).join(', '):'—'),'','w'),
    card(6,'currency-exchange','Moeda',cur,'','w'),
    card(7,'signpost-split','Fronteiras',bd.length?bd.length+' países':'Nenhuma',bd.length?bd.slice(0,8).join(', ')+(bd.length>8?'...':''):'Sem fronteiras terrestres','w'),
    card(8,'lightbulb','Curiosidade',fa.length?fa.join('<br>'):'—','','w'),
    '<div class="card w" style="--i:9"><i class="bi bi-journal-text"></i><small>Sobre</small><p>'+esc(about||'Resumo indisponível no momento.')+'</p></div>'
  ];
  p.querySelector('.grid').insertAdjacentHTML('beforeend',items.join(''));
  p.insertAdjacentHTML('beforeend','<div class="src">Fontes: REST Countries, Banco Mundial (PIB em dólares correntes e população, último ano disponível) e Wikipédia.</div>');
}

function stars(){
  const s=$('#stars');
  for(let i=0;i<150;i++){const e=document.createElement('span'),z=Math.random()*2+.6;e.style.cssText='left:'+Math.random()*100+'%;top:'+Math.random()*100+'%;width:'+z+'px;height:'+z+'px;opacity:'+(.3+Math.random()*.6)+';animation-delay:'+Math.random()*4+'s';s.appendChild(e)}
}
function build(geo){
  size();
  const d=svg.append('defs');
  d.html('<radialGradient id="oc" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#1a3b54"/><stop offset="1" stop-color="#06111a"/></radialGradient><radialGradient id="at"><stop offset=".9" stop-color="#6db4f0" stop-opacity="0"/><stop offset=".925" stop-color="#6db4f0" stop-opacity=".4"/><stop offset="1" stop-color="#6db4f0" stop-opacity="0"/></radialGradient><radialGradient id="sh" cx="32%" cy="30%" r="85%"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".62"/></radialGradient>');
  atm=svg.append('circle').attr('fill','url(#at)').style('pointer-events','none');
  sph=svg.append('circle').attr('fill','url(#oc)');
  gr=svg.append('path').attr('class','grat');
  gC=svg.append('g');
  shade=svg.append('circle').attr('fill','url(#sh)').style('pointer-events','none');
  geo.features.forEach(f=>{const c=S.by[f.id];f.code=f.id;f.cont=c?toC(c):null;S.feat[f.id]=f});
  paths=gC.selectAll('path').data(geo.features).join('path').attr('class',d=>'c'+(d.cont?'':' na'))
    .on('mouseenter',(e,d)=>over(d)).on('mousemove',mv).on('mouseleave',out).on('click',(e,d)=>clk(d));
  const v=view();S.cx=v.cx;S.cy=v.cy;
  draw();
  svg.call(d3.drag().on('drag',e=>{if(S.busy)return;S.rot=[S.rot[0]+e.dx*.3/Math.sqrt(S.k),Math.max(-85,Math.min(85,S.rot[1]-e.dy*.3/Math.sqrt(S.k)))];draw()}));
  d3.timer(()=>{if(S.mode==='world'&&!S.busy&&!S.hov){S.rot=[S.rot[0]+.08,S.rot[1]];draw()}});
}
function over(d){
  if(!d.cont||S.busy)return;
  const tip=$('#tip');
  if(S.mode==='world'){S.hov=d.cont;paths.classed('hl',x=>x.cont===d.cont);tip.textContent=CONT[d.cont].n}
  else if(d.cont===S.cont&&!S.sel){paths.classed('hv',x=>x===d);tip.textContent=nm(S.by[d.code])}
  else return;
  tip.style.opacity=1;
}
function mv(e){const t=$('#tip');t.style.left=e.clientX+'px';t.style.top=e.clientY+'px'}
function out(){S.hov=null;paths.classed('hl',false).classed('hv',false);$('#tip').style.opacity=0}
function clk(d){
  if(!d.cont||S.busy)return;
  out();
  if(S.mode==='world')focus(d.cont);
  else if(d.cont===S.cont)select(d.code);
}
function pick(code){
  const ct=toC(S.by[code]);if(!ct)return;
  $('#res').style.display='none';$('#q').value='';
  if(S.cont!==ct){focus(ct,()=>select(code))}else select(code);
}
function search(){
  const q=norm($('#q').value.trim()),r=$('#res');
  if(!q){r.style.display='none';return}
  const m=S.list.filter(c=>toC(c)&&[nm(c),c.name.common,c.cca3].some(x=>norm(x).includes(q))).slice(0,7);
  r.innerHTML=m.map(c=>'<button data-c="'+c.cca3+'"><img src="'+esc(c.flags.svg||c.flags.png)+'" alt="">'+esc(nm(c))+'</button>').join('')||'<button disabled>Nenhum resultado</button>';
  r.style.display='block';
}
function fail(msg){
  $('#load').classList.remove('off');
  $('#load').innerHTML='<p>Não foi possível carregar o atlas.<br><br>'+esc(msg)+'</p><button class="pill" style="position:static" onclick="location.reload()"><i class="bi bi-arrow-clockwise"></i><span>Tentar novamente</span></button>';
}
async function loadCountries(){
  try{return await first([API+'/all?fields=name,cca3,cca2,continents,translations,flags,latlng,population,area,capital'],'REST Countries')}
  catch(e){
    const raw=await first(ALT,'Dados dos países (alternativo)'),M={Americas:'North America',Antarctic:'Antarctica'};
    return raw.map(c=>({...c,continents:[M[c.region]||c.region],flags:{svg:'https://flagcdn.com/'+c.cca2.toLowerCase()+'.svg'}}));
  }
}
async function init(){
  stars();
  let list,geo;
  try{[list,geo]=await Promise.all([loadCountries(),first(GEO,'Mapa')])}catch(e){return fail(e.message)}
  try{
    list.sort((a,b)=>nm(a).localeCompare(nm(b),'pt'));
    S.list=list;list.forEach(c=>S.by[c.cca3]=c);
    build(geo);ui();
    $('#load').classList.add('off');
  }catch(e){console.error(e);return fail('Erro ao montar o mapa: '+e.message)}
  $('#back').onclick=back;
  $('#q').addEventListener('input',search);
  $('#res').addEventListener('click',e=>{const b=e.target.closest('[data-c]');if(b)pick(b.dataset.c)});
  addEventListener('keydown',e=>{if(e.key==='Escape')back()});
  addEventListener('resize',()=>{size();const v=view();S.cx=v.cx;S.cy=v.cy;draw()});
}
addEventListener('DOMContentLoaded',init);
