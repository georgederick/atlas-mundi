/* Modo escuro, ranking de países e linha do tempo histórica */
(function(){
  const root=document.documentElement,bt=document.getElementById('bt');
  let th=null;try{th=localStorage.getItem('atlas-theme')}catch(e){}
  if(!th)th=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
  const apply=t=>{root.dataset.theme=t;bt.textContent=t==='dark'?'☀️':'🌙';try{localStorage.setItem('atlas-theme',t)}catch(e){}};
  apply(th);bt.onclick=()=>apply(root.dataset.theme==='dark'?'light':'dark');
})();

const RK={population:['👥 População',c=>c.population,'hab.'],area:['📐 Área',c=>c.area,'km²'],dens:['🏙️ Densidade',c=>c.area?c.population/c.area:0,'hab/km²']};
let rkm='population',rkc='';
function rankR(){
  const f=RK[rkm][1],u=RK[rkm][2];
  const rows=S.list.filter(c=>(!rkc||toC(c.continents)===rkc)&&f(c)>0).sort((a,b)=>f(b)-f(a)).slice(0,30);
  const mx=rows.length?f(rows[0]):1;
  ovc.innerHTML='<h2>🏆 Ranking de países</h2><p>'+Object.entries(RK).map(([k,v])=>'<button class="btn" data-rk="'+k+'"'+(k===rkm?' style="border-color:var(--ac);color:var(--ac)"':'')+'>'+v[0]+'</button>').join(' ')
   +' <select id="rkc" style="padding:8px;border-radius:8px;border:1px solid var(--line)"><option value="">Mundo</option>'+Object.entries(CONT).map(([k,v])=>'<option value="'+k+'"'+(k===rkc?' selected':'')+'>'+v.n+'</option>').join('')+'</select></p><div style="display:grid;gap:6px">'
   +rows.map((c,i)=>'<a class="rk" href="#/p/'+c.cca3+'" onclick="ov.classList.remove(\'show\')"><b>'+(i+1)+'</b><img src="'+esc(c.flags.svg||c.flags.png)+'" alt=""><span>'+esc(nm(c))+'</span><div class="rb"><i style="width:'+(f(c)/mx*100)+'%"></i></div><em>'+fmt(Math.round(f(c)*10)/10)+' '+u+'</em></a>').join('')
   +'</div><span class="src">Top 30 • fonte: REST Countries (estimativas). Na densidade, microestados e territórios aparecem no topo.</span>';
}
document.getElementById('br').onclick=()=>{ov.classList.add('show');rankR()};
ov.addEventListener('click',e=>{const b=e.target.closest('[data-rk]');if(b){rkm=b.dataset.rk;rankR()}});
ov.addEventListener('change',e=>{if(e.target.id==='rkc'){rkc=e.target.value;rankR()}});

function buildTimeline(w,d,code){
  if(S.code!==code)return;
  const sc=w.secs,i=sc.findIndex(x=>/^Hist[óo]ria/i.test(x.t));if(i<0)return;
  let txt=sc[i].x;
  for(let k=i+1;k<sc.length&&!/^(Geografia|Pol[íi]tica|Governo|Economia|Demografia|Cultura|Clima|Divis|Fauna|Flora|Popula)/i.test(sc[k].t);k++)txt+=' '+sc[k].x;
  const ev=[],seen=new Set();
  txt.replace(/\s+/g,' ').split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/).forEach(s=>{
    const m=s.match(/\b(\d{3,4})\b/);if(!m)return;
    const y=+m[1];if(y<300||y>2026||seen.has(y)||s.length<40)return;seen.add(y);ev.push({y,s});
  });
  ev.sort((a,b)=>a.y-b.y);
  const pick=ev.length>12?ev.filter((_,j)=>j%Math.ceil(ev.length/12)===0):ev;
  if(pick.length<3)return;
  const url='https://pt.wikipedia.org/wiki/'+encodeURIComponent(w.title.replace(/ /g,'_'));
  const cut=s=>s.length>230?s.slice(0,s.lastIndexOf(' ',230))+'…':s;
  document.getElementById('wk').insertAdjacentHTML('beforeend','<h2 class="sec">⏳ Linha do tempo</h2><div class="card w"><div class="tl">'
    +pick.map((e,j)=>'<div style="animation-delay:'+(j*.07)+'s"><b>'+e.y+'</b><p>'+esc(cut(e.s))+'</p></div>').join('')
    +'</div><span class="src">Trechos com datas extraídos do artigo “'+esc(w.title)+'” — <a target="_blank" rel="noopener" href="'+url+'">Wikipédia (CC BY-SA)</a>. Seleção automática; confira o artigo para o contexto completo.</span></div>');
}
