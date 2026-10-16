import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const __va=(n,d)=>{try{window.va&&window.va('event',{name:n,data:d})}catch(e){}};const __t0=performance.now();let __rs=0;
window.addEventListener('error',e=>__va('client_error',{message:String(e.message||'error').slice(0,120)}));

const $=id=>document.getElementById(id);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x87ceeb);scene.fog=new THREE.Fog(0x87ceeb,30,80);
const cam=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,200);
addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
scene.add(new THREE.HemisphereLight(0xffffff,0x446,1.2));const sun=new THREE.DirectionalLight(0xffffff,1.5);sun.position.set(10,20,8);sun.castShadow=true;
Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20});scene.add(sun);
// ---- assets (fallback to boxes) + LoadingManager progress ----
const A={};
const manager=new THREE.LoadingManager();
manager.onProgress=(url,loaded,total)=>{const pct=total?Math.round(100*loaded/total):0;$('loadbar').style.width=pct+'%';$('load').textContent=`加载模型中… ${pct}% (${loaded}/${total})`};
manager.onError=url=>console.warn('Load error',url);
const loader=new GLTFLoader(manager);
function fit(obj,size,alignBottom=true){const b=new THREE.Box3().setFromObject(obj),s=b.getSize(new THREE.Vector3());const k=size/Math.max(s.x,s.y,s.z);obj.scale.setScalar(k);
 const b2=new THREE.Box3().setFromObject(obj),c=b2.getCenter(new THREE.Vector3());obj.position.sub(c);if(alignBottom)obj.position.y+=c.y-b2.min.y;const g=new THREE.Group();g.add(obj);g.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true}});return g}
const load=n=>loader.loadAsync(`assets/${n}/model.glb`).then(g=>A[n]=g.scene).catch(e=>console.warn('GLB fail',n,e));
await Promise.all(['hero','rival','tile','spikebox'].map(load));
$('loadbar').style.width='100%';
$('load').textContent=Object.keys(A).length===4?'模型就绪 ✔':'部分模型加载失败，使用方块替代';$('start').disabled=false;__va('game_load_ready',{load_ms:Math.round(performance.now()-__t0)});
const T=2,GRID=8;// tile size, grid
const TileProto=A.tile?fit(A.tile.clone(),T*.98,false):null;
function makeTile(){if(TileProto){const g=TileProto.clone(true);g.traverse(o=>{if(o.isMesh)o.material=o.material.clone()});return g}
 const m=new THREE.Mesh(new THREE.BoxGeometry(T*.96,T*.6,T*.96),new THREE.MeshLambertMaterial({color:0x6bbf3b}));m.castShadow=m.receiveShadow=true;return m}
const HeroProto=A.hero?fit(A.hero.clone(),1.4):null,RivalProto=A.rival?fit(A.rival.clone(),1.4):null;
function makeBean(hero,color){const p=hero?HeroProto:RivalProto;let g;
 if(p){g=p.clone(true);if(!hero)g.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color=new THREE.Color(color)}})}
 else{g=new THREE.Mesh(new THREE.CapsuleGeometry(.4,.6,4,8),new THREE.MeshLambertMaterial({color}));g.geometry.translate(0,.7,0)}
 const r=new THREE.Group();r.add(g);return r}
const SpikeProto=A.spikebox?fit(A.spikebox.clone(),1.6):null;
// ---- state ----
let tiles=[],beans=[],spike,timer,state='menu',points={};const keys={};
addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='Space')e.preventDefault()});addEventListener('keyup',e=>keys[e.code]=false);
const TOP=0;// tile top surface y
function reset(){tiles.forEach(t=>scene.remove(t.m));beans.forEach(b=>scene.remove(b.m));if(spike)scene.remove(spike.m);tiles=[];beans=[];
 for(let i=0;i<GRID;i++)for(let j=0;j<GRID;j++){const m=makeTile();const x=(i-GRID/2+.5)*T,z=(j-GRID/2+.5)*T;m.position.set(x,TOP-(TileProto?T*.98/2*0:0.3),z);if(TileProto)m.position.y=TOP-new THREE.Box3().setFromObject(m).max.y+m.position.y;scene.add(m);
  tiles.push({m,x,z,y0:m.position.y,st:'ok',t:0,vy:0,crack:5+Math.random()*45})}
 const n=6+Math.floor(Math.random()*3);const cols=[0xff5555,0x55aaff,0xffdd33,0xaa66ff,0xff9933,0x33ddaa,0xff66cc];
 for(let k=0;k<n;k++){const a=k/n*Math.PI*2,m=makeBean(k===0,cols[k%7]);const b={m,p:new THREE.Vector3(Math.cos(a)*5,3,Math.sin(a)*5),v:new THREE.Vector3(),ai:k>0,alive:true,cd:0,ground:false,name:k?`Bot${k}`:'你',tgt:null,tt:0};m.position.copy(b.p);scene.add(m);beans.push(b);points[b.name]=0}
 const sm=SpikeProto?SpikeProto.clone(true):new THREE.Mesh(new THREE.BoxGeometry(1.4,1.4,1.4),new THREE.MeshLambertMaterial({color:0x999999}));if(!SpikeProto)sm.geometry.translate(0,.7,0);
 spike={m:sm,a:0};scene.add(sm);timer=60;state='count';cnt=3}
let cnt=0;
function tileAt(x,z){const i=Math.floor(x/T+GRID/2),j=Math.floor(z/T+GRID/2);if(i<0||j<0||i>=GRID||j>=GRID)return null;return tiles[i*GRID+j]}
function control(b,dt){let mx=0,mz=0,jump=false,push=false;
 if(!b.ai){mx=(keys.KeyD?1:0)-(keys.KeyA?1:0);mz=(keys.KeyS?1:0)-(keys.KeyW?1:0);jump=keys.Space;push=keys.KeyE}
 else{b.tt-=dt;const here=tileAt(b.p.x,b.p.z);
  if(b.tt<=0||!b.tgt||b.tgt.st!=='ok'){const ok=tiles.filter(t=>t.st==='ok');b.tgt=ok.sort((a,c)=>(a.x-b.p.x)**2+(a.z-b.p.z)**2-((c.x-b.p.x)**2+(c.z-b.p.z)**2))[Math.floor(Math.random()*Math.min(4,ok.length))];b.tt=1+Math.random()*2}
  let tx=b.tgt?b.tgt.x:0,tz=b.tgt?b.tgt.z:0;
  const foe=beans.find(o=>o!==b&&o.alive&&o.p.distanceTo(b.p)<1.6);if(foe&&Math.random()<.5){tx=foe.p.x;tz=foe.p.z;push=true}
  const dx=tx-b.p.x,dz=tz-b.p.z,d=Math.hypot(dx,dz);if(d>.3){mx=dx/d;mz=dz/d}
  if(here&&here.st!=='ok'&&b.ground)jump=Math.random()<.1;
  // gap ahead → jump
  const ah=tileAt(b.p.x+mx*1.2,b.p.z+mz*1.2);if(b.ground&&(!ah||ah.st==='gone'))jump=true}
 const sp=6,l=Math.hypot(mx,mz)||1;const ax=mx/l*sp,az=mz/l*sp,k=b.ground?10:3;b.v.x+=(ax-b.v.x)*Math.min(1,k*dt);b.v.z+=(az-b.v.z)*Math.min(1,k*dt);
 if(mx||mz)b.m.rotation.y=Math.atan2(mx,mz);
 if(jump&&b.ground){b.v.y=8;b.ground=false}
 b.cd-=dt;if(push&&b.cd<=0){b.cd=.8;const f=new THREE.Vector3(Math.sin(b.m.rotation.y),0,Math.cos(b.m.rotation.y));
  for(const o of beans)if(o!==b&&o.alive){const d=o.p.clone().sub(b.p);if(d.length()<1.8&&d.normalize().dot(f)>.3){o.v.addScaledVector(d,12);o.v.y=4;if(!b.ai)points[b.name]+=1}}
  b.m.scale.setScalar(1.25);setTimeout(()=>b.m.scale.setScalar(1),120)}}
function physics(b,dt){b.v.y-=22*dt;b.p.addScaledVector(b.v,dt);b.ground=false;const t=tileAt(b.p.x,b.p.z);
 if(t&&t.st!=='gone'){const top=t.m.position.y-t.y0+TOP;if(b.p.y<top&&b.p.y>top-1){b.p.y=top;b.v.y=Math.max(0,b.v.y);b.ground=true}}
 for(const o of beans)if(o!==b&&o.alive){const d=b.p.clone().sub(o.p);d.y=0;const l=d.length();if(l<.8&&l>0){d.multiplyScalar((.8-l)/l/2);b.p.add(d);o.p.sub(d)}}
 if(b.p.y<-15){b.alive=false;if(!b.ai)__va('player_eliminated',{survival_s:Math.round((performance.now()-__rs)/1000),cause:'fell'});scene.remove(b.m);flash(`${b.name} 出局！`)}b.m.position.copy(b.p)}
let msgT=0;function flash(s,t=1.2){$('msg').textContent=s;msgT=t}
function end(){const alive=beans.filter(b=>b.alive);let w;if(alive.length===1)w=alive[0].name;else{alive.forEach(b=>points[b.name]+=10);w=alive.sort((a,c)=>points[c.name]-points[a.name])[0]?.name||'无人'}
 state='over';__va('round_end',{result:w==='你'?'win':'lose',alive:beans.filter(b=>b.alive).length,push_score:points['你']||0});flash(`${w==='你'?'🏆 你赢了！':w+' 获胜'} — 按 R 重开`,999)}
const clock=new THREE.Clock();
function loop(){requestAnimationFrame(loop);const dt=Math.min(clock.getDelta(),.05);
 if(msgT>0){msgT-=dt;if(msgT<=0)$('msg').textContent=''}
 if(keys.KeyR&&state==='over')reset();
 if(state==='count'){cnt-=dt;$('msg').textContent=cnt>0?Math.ceil(cnt):'GO!';if(cnt<=0){state='play';msgT=.6;__rs=performance.now();__va('game_start',{})}beans.forEach(b=>physics(b,dt))}
 else if(state==='play'||state==='over'){if(state==='play')timer-=dt;const el=60-timer;
  for(const t of tiles){if(t.st==='ok'&&el>t.crack){t.st='crack';t.t=1.5;t.m.traverse(o=>{if(o.material)o.material.emissive=new THREE.Color(0xff3300)})}
   else if(t.st==='crack'){t.t-=dt;t.m.position.x=t.x+(Math.random()-.5)*.1;if(t.t<=0)t.st='fall'}
   else if(t.st==='fall'){t.vy-=20*dt;t.m.position.y+=t.vy*dt;if(t.m.position.y<-30){t.st='gone';t.m.visible=false}}}
  spike.a+=dt*.7;const sx=Math.cos(spike.a)*6,sz=Math.sin(spike.a*1.3)*6;spike.m.position.set(sx,TOP,sz);spike.m.rotation.y+=dt*2;
  for(const b of beans)if(b.alive){if(state==='play')control(b,dt);physics(b,dt);const d=b.p.clone().sub(spike.m.position);d.y=0;if(d.length()<1.3&&b.p.y<TOP+1.6){b.v.addScaledVector(d.normalize(),14);b.v.y=6}}
  const alive=beans.filter(b=>b.alive);if(state==='play'&&(alive.length<=1||timer<=0||!beans[0].alive&&false))end();
  if(state==='play'&&!beans[0].alive&&!beans[0].told){beans[0].told=1;flash('你掉下去了…观战中',2)}}
 const me=beans[0];if(me){const f=me.alive?me.p:new THREE.Vector3();cam.position.lerp(new THREE.Vector3(f.x,f.y+9,f.z+11),.1);cam.lookAt(f.x,f.y,f.z)}
 $('hud').innerHTML=state==='menu'?'':`⏱ ${Math.max(0,timer).toFixed(0)}s · 存活 ${beans.filter(b=>b.alive).length}/${beans.length} · 推人分 ${points['你']||0}<br><small>WASD 移动 · Space 跳 · E 推 · R 重开(结束后)</small>`;
 renderer.render(scene,cam)}
$('start').onclick=()=>{$('splash').remove();reset()};window.__game={get state(){return state},get beans(){return beans}};loop();
