/* Globo 3D com shaders (Three.js): textura gerada do GeoJSON, atmosfera (fresnel) e estrelas */
function initGlobe(){
  const intro=document.getElementById('intro'),cv=document.getElementById('gl'),tip=document.getElementById('gtip');
  const open=()=>intro.classList.add('show'),close=()=>intro.classList.remove('show');
  document.getElementById('go').onclick=close;document.getElementById('bg').onclick=open;
  if(!window.THREE||!S.geo){close();return}
  try{
    const W=2048,H=1024,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
    x.fillStyle='#0c1e29';x.fillRect(0,0,W,H);
    S.geo.features.forEach(f=>{
      const k=S.by[f.id]?toC(S.by[f.id].continents):null,g=f.geometry,ps=g.type==='Polygon'?[g.coordinates]:g.coordinates;
      x.beginPath();ps.forEach(p=>p.forEach(r=>r.forEach((q,i)=>{const a=(q[0]+180)/360*W,b=(90-q[1])/180*H;i?x.lineTo(a,b):x.moveTo(a,b)})));
      x.fillStyle=k?CONT[k].c:'#8a8f90';x.fill('evenodd');x.strokeStyle='rgba(255,255,255,.4)';x.lineWidth=1.2;x.stroke();
    });
    const ren=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});ren.setPixelRatio(Math.min(devicePixelRatio,2));
    const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(40,1,.1,100),grp=new THREE.Group();sc.add(grp);
    const tex=new THREE.CanvasTexture(c);tex.anisotropy=8;
    const earth=new THREE.Mesh(new THREE.SphereGeometry(1,96,96),new THREE.ShaderMaterial({
      uniforms:{t:{value:tex},sun:{value:new THREE.Vector3(-.6,.45,.7).normalize()}},
      vertexShader:'varying vec2 v;varying vec3 n;void main(){v=uv;n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'uniform sampler2D t;uniform vec3 sun;varying vec2 v;varying vec3 n;void main(){vec3 c=texture2D(t,v).rgb;float d=clamp(dot(n,sun),0.,1.);float rim=pow(1.-clamp(n.z,0.,1.),3.);float sp=pow(max(dot(reflect(-sun,n),vec3(0,0,1)),0.),24.)*.25*(1.-step(.35,c.r));gl_FragColor=vec4(c*(.22+.9*d)+vec3(.2,.42,.6)*rim*.55+sp,1.);}'}));
    const atmo=new THREE.Mesh(new THREE.SphereGeometry(1.16,64,64),new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,depthWrite:false,blending:THREE.AdditiveBlending,
      vertexShader:'varying vec3 n;void main(){n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'varying vec3 n;void main(){float i=pow(.68-dot(n,vec3(0,0,1.)),3.);gl_FragColor=vec4(.35,.62,.95,1.)*i*1.4;}'}));
    grp.add(earth,atmo);
    const N=1600,pos=new Float32Array(N*3),sz=new Float32Array(N),ph=new Float32Array(N),sg=new THREE.BufferGeometry();
    for(let i=0;i<N;i++){const r=20+Math.random()*30,t=Math.random()*6.283,u=Math.random()*2-1,s=Math.sqrt(1-u*u);pos.set([r*s*Math.cos(t),r*u,r*s*Math.sin(t)],i*3);sz[i]=Math.random()*2.2+.8;ph[i]=Math.random()*6.28}
    sg.setAttribute('position',new THREE.BufferAttribute(pos,3));sg.setAttribute('size',new THREE.BufferAttribute(sz,1));sg.setAttribute('ph',new THREE.BufferAttribute(ph,1));
    const sm=new THREE.ShaderMaterial({uniforms:{time:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
      vertexShader:'attribute float size;attribute float ph;uniform float time;varying float a;void main(){a=.5+.5*sin(time*1.5+ph);gl_PointSize=size*(1.+a);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'varying float a;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(.85,.9,1.,(.5-d)*2.*(.35+.65*a));}'});
    sc.add(new THREE.Points(sg,sm));
    function rs(){const w=intro.clientWidth,h=intro.clientHeight;ren.setSize(w,h,false);cam.aspect=w/h;cam.position.z=w>h?3.4:4.6;grp.position.x=w>h*1.1?.75:0;cam.updateProjectionMatrix()}
    rs();addEventListener('resize',rs);
    const inR=(r,px,py)=>{let o=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>py)!=(b[1]>py)&&px<(b[0]-a[0])*(py-a[1])/(b[1]-a[1])+a[0])o=!o}return o};
    const inG=(g,px,py)=>(g.type==='Polygon'?[g.coordinates]:g.coordinates).some(p=>inR(p[0],px,py)&&!p.slice(1).some(h=>inR(h,px,py)));
    const rc=new THREE.Raycaster(),m=new THREE.Vector2();
    function pick(e){const r=cv.getBoundingClientRect();m.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);rc.setFromCamera(m,cam);
      const h=rc.intersectObject(earth)[0];if(!h)return null;
      const lo=h.uv.x*360-180,la=h.uv.y*180-90;return S.geo.features.find(f=>S.by[f.id]&&inG(f.geometry,lo,la))||null}
    let drag=false,sx=0,sy=0,vx=.0018,vy=0,moved=0,ly=0,lx=0;
    cv.addEventListener('pointerdown',e=>{drag=true;moved=0;sx=lx=e.clientX;sy=ly=e.clientY;cv.setPointerCapture(e.pointerId)});
    cv.addEventListener('pointermove',e=>{
      if(drag){vx=(e.clientX-lx)*.005;vy=(e.clientY-ly)*.005;earth.rotation.y+=vx;earth.rotation.x=Math.max(-1,Math.min(1,earth.rotation.x+vy));lx=e.clientX;ly=e.clientY;moved=Math.hypot(e.clientX-sx,e.clientY-sy);tip.style.display='none';return}
      const f=pick(e);cv.classList.toggle('pk',!!f);
      if(f){tip.textContent=nm(S.by[f.id]);tip.style.display='block';tip.style.left=e.clientX+14+'px';tip.style.top=e.clientY+12+'px'}else tip.style.display='none'});
    cv.addEventListener('pointerup',e=>{drag=false;if(moved<6){const f=pick(e);if(f){close();location.hash='#/p/'+f.id}}});
    const clk=new THREE.Clock();
    (function loop(){requestAnimationFrame(loop);if(!intro.classList.contains('show'))return;
      sm.uniforms.time.value=clk.getElapsedTime();
      if(!drag){earth.rotation.y+=vx;vx+=(.0018-vx)*.02;earth.rotation.x+=(0-earth.rotation.x)*.01}
      ren.render(sc,cam)})();
    if(!location.hash||location.hash==='#/')open();
  }catch(err){console.warn('Globo 3D indisponível',err);close()}
}
