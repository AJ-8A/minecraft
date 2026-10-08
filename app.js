import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const mobile=matchMedia("(max-width:700px)").matches;
const CHUNK=16, R=mobile?2:3, MAXY=12;
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x8fc8ef); scene.fog=new THREE.Fog(0x8fc8ef,28,95);
const camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.05,180);
const renderer=new THREE.WebGLRenderer({antialias:!mobile,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.3:2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=!mobile;
document.getElementById("game").appendChild(renderer.domElement);

const sun=new THREE.DirectionalLight(0xfff3d0,2.1);sun.position.set(25,35,15);sun.castShadow=!mobile;if(!mobile)sun.shadow.mapSize.set(1024,1024);
const hemi=new THREE.HemisphereLight(0xbde4ff,0x35402d,1.1);scene.add(sun,hemi);

const colors={grass:0x62a84e,dirt:0x7d5335,stone:0x81898b,wood:0x8c633e,leaves:0x3f8f45,cherry:0xff9fc8,sand:0xd5bd78,water:0x3e9dd1,coal:0x25282a,iron:0xd7c9b7,gold:0xffc62e,diamond:0x53eaff,snow:0xf4f8ff};
const blocks=["grass","dirt","stone","wood","leaves","cherry","sand","water","coal","iron","gold","diamond","snow"];
const icons={grass:"🌿",dirt:"🟫",stone:"⬜",wood:"🪵",leaves:"🍃",cherry:"🌸",sand:"🟨",water:"💧",coal:"⚫",iron:"🔩",gold:"🟡",diamond:"💎",snow:"❄️"};
const solid=new Set(blocks), world=new Map(), chunks=new Map(), edits=new Map();
const key=(x,y,z)=>x+","+y+","+z, ck=(cx,cz)=>cx+","+cz;
function hash(x,z){const n=Math.sin(x*127.1+z*311.7)*43758.5453;return n-Math.floor(n)}
function height(x,z){return Math.max(1,Math.min(MAXY-1,Math.floor(4+Math.sin(x*.17)*1.7+Math.cos(z*.21)*1.4+Math.sin((x+z)*.09)*1.2)))}
function biomeAt(x,z){if(x>10&&z>0)return"Cherry Blossom";if(x<-10&&z<5)return"Desert";if(z<-12)return"Snow";return"Forest"}
function generated(x,y,z){
 if(y<0||y>=MAXY)return null;
 const top=height(x,z), b=biomeAt(x,z);
 if(y>top)return null;
 if(y===top)return b==="Cherry Blossom"?"grass":b==="Desert"?"sand":b==="Snow"?"snow":"grass";
 if(y>=top-2)return"dirt";
 if(y<=1&&hash(x*3+y,z*5)>.94)return"diamond";
 if(y<=2&&hash(x+7,z-3)>.89)return"gold";
 if(y<=3&&hash(x-4,z+5)>.87)return"iron";
 if(y<=4&&hash(x+2,z+8)>.82)return"coal";
 if(y>=2&&y<=4&&hash(x*2,z*2)>.955)return null;
 return"stone";
}
function get(x,y,z){const k=key(x,y,z);if(edits.has(k))return edits.get(k);return generated(x,y,z)}
function setBlock(x,y,z,type){if(y<0||y>=MAXY)return;const k=key(x,y,z);edits.set(k,type);if(type==="air")edits.set(k,null);mark(x,z);mark(x-1,z);mark(x+1,z);mark(x,z-1);mark(x,z+1)}
function mark(x,z){const cx=Math.floor(x/CHUNK),cz=Math.floor(z/CHUNK);chunks.get(ck(cx,cz))?.dirty=true}

function addTree(x,z,cherry=false){
 const y=height(x,z); for(let i=1;i<=3;i++)setBlock(x,y+i,z,"wood");
 for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=3;dy<=4;dy++)
   if(Math.abs(dx)+Math.abs(dz)<4)setBlock(x+dx,y+dy,z+dz,cherry?"cherry":"leaves");
}
for(let x=-48;x<48;x+=6)for(let z=-48;z<48;z+=7){
 if(Math.abs(x)+Math.abs(z)<8)continue;
 const b=biomeAt(x,z); if(b!=="Desert"&&hash(x,z)>.45)addTree(x,z,b==="Cherry Blossom");
}
for(let x=-28;x<-17;x++)for(let z=10;z<27;z++){const y=height(x,z);if(y<5)setBlock(x,y,z,"water")}

const faceDefs=[
 [[1,0,0],[[1,0,0],[1,1,0],[1,1,1],[1,0,1]]],
 [[-1,0,0],[[0,0,1],[0,1,1],[0,1,0],[0,0,0]]],
 [[0,1,0],[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]],
 [[0,-1,0],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]],
 [[0,0,1],[[1,0,1],[1,1,1],[0,1,1],[0,0,1]]],
 [[0,0,-1],[[0,0,0],[0,1,0],[1,1,0],[1,0,0]]]
];
function chunkMesh(cx,cz){
 const pos=[],norm=[],col=[],waterPos=[],waterNorm=[],waterCol=[];
 const addFace=(arrP,arrN,arrC,x,y,z,face,color)=>{
   for(const v of face[1]){arrP.push(x+v[0],y+v[1],z+v[2]);arrN.push(...face[0]);const c=new THREE.Color(color);arrC.push(c.r,c.g,c.b)}
   const base=arrP.length/3-4;arrP.push(); // removed below
 };
 const face=(arrP,arrN,arrC,x,y,z,f,color)=>{
   const vs=f[1], ids=[0,1,2,0,2,3];for(const i of ids){const v=vs[i];arrP.push(x+v[0],y+v[1],z+v[2]);arrN.push(...f[0]);const c=new THREE.Color(color);arrC.push(c.r,c.g,c.b)}
 };
 const startX=cx*CHUNK,startZ=cz*CHUNK;
 for(let x=0;x<CHUNK;x++)for(let z=0;z<CHUNK;z++)for(let y=0;y<MAXY;y++){
   const gx=startX+x,gz=startZ+z,t=get(gx,y,gz);if(!t)continue;
   const isWater=t==="water", p=isWater?waterPos:pos,n=isWater?waterNorm:norm,c=isWater?waterCol:col;
   for(const f of faceDefs){const d=f[0],nt=get(gx+d[0],y+d[1],gz+d[2]);if(!nt||nt==="water"&&t!=="water")face(p,n,c,gx,y,gz,f,colors[t])}
 }
 function make(P,N,C,transparent){
   if(!P.length)return null;const g=new THREE.BufferGeometry();g.setAttribute("position",new THREE.Float32BufferAttribute(P,3));g.setAttribute("normal",new THREE.Float32BufferAttribute(N,3));g.setAttribute("color",new THREE.Float32BufferAttribute(C,3));
   const m=new THREE.MeshLambertMaterial({vertexColors:true,transparent,opacity:transparent?.66:1,side:THREE.DoubleSide});
   const mesh=new THREE.Mesh(g,m);mesh.frustumCulled=true;mesh.castShadow=!mobile;mesh.receiveShadow=true;return mesh;
 }
 const group=new THREE.Group();const a=make(pos,norm,col,false),w=make(waterPos,waterNorm,waterCol,true);if(a)group.add(a);if(w)group.add(w);group.userData={cx,cz};return group;
}
function buildChunk(cx,cz){
 const id=ck(cx,cz),old=chunks.get(id);if(old?.group)scene.remove(old.group);
 const group=chunkMesh(cx,cz);chunks.set(id,{cx,cz,group,dirty:false});if(group)scene.add(group);
}
function visibleChunks(){
 const pcx=Math.floor(player.x/CHUNK),pcz=Math.floor(player.z/CHUNK);
 for(let cx=pcx-R;cx<=pcx+R;cx++)for(let cz=pcz-R;cz<=pcz+R;cz++){const c=chunks.get(ck(cx,cz));if(!c||c.dirty)buildChunk(cx,cz)}
 for(const [id,c] of chunks){if(Math.abs(c.cx-pcx)>R+1||Math.abs(c.cz-pcz)>R+1){if(c.group)scene.remove(c.group);chunks.delete(id)}}
}
function countBlocks(){let n=0;for(let x=-R*CHUNK;x<R*CHUNK;x++)for(let z=-R*CHUNK;z<R*CHUNK;z++)for(let y=0;y<MAXY;y++)if(get(x,y,z))n++;return n}

const player={x:0,y:height(0,6)+1.05,z:6};let yaw=0,pitch=0,vy=0,onGround=false,selected=0;
camera.position.set(player.x,player.y+1.55,player.z);
const keys=new Set();addEventListener("keydown",e=>{keys.add(e.code);if(e.code.startsWith("Digit"))select(+e.code.slice(5)-1);if(e.code==="KeyQ")breakTarget();if(e.code==="KeyE")placeTarget();});addEventListener("keyup",e=>keys.delete(e.code));

const hot=document.getElementById("hotbar");blocks.forEach((b,i)=>{const d=document.createElement("button");d.className="slot";d.innerHTML="<span>"+icons[b]+"</span><em>"+(i+1)+"</em>";d.onclick=()=>select(i);hot.appendChild(d)});
function select(i){if(i<0||i>=blocks.length)return;selected=i;document.querySelectorAll(".slot").forEach((e,n)=>e.classList.toggle("active",n===i))}select(0);

let locked=false;document.getElementById("play").onclick=()=>{document.getElementById("start").classList.add("hidden");if(!mobile)renderer.domElement.requestPointerLock()};document.addEventListener("pointerlockchange",()=>locked=document.pointerLockElement===renderer.domElement);
document.addEventListener("mousemove",e=>{if(!locked)return;yaw-=e.movementX*.0022;pitch-=e.movementY*.0022;pitch=Math.max(-1.45,Math.min(1.45,pitch))});

function ray(){const r=new THREE.Raycaster();r.setFromCamera({x:0,y:0},camera);return r.intersectObjects([...chunks.values()].flatMap(c=>c.group?[c.group]:[]),true)[0]}
function blockFromHit(q,placing=false){if(!q)return null;const p=q.point.clone();if(placing)p.add(q.face.normal.clone().multiplyScalar(.02));else p.add(q.face.normal.clone().multiplyScalar(-.02));return{x:Math.floor(p.x),y:Math.floor(p.y),z:Math.floor(p.z)}}
function rebuildAround(x,z){for(const [cx,cz] of [[Math.floor(x/CHUNK),Math.floor(z/CHUNK)],[Math.floor((x-1)/CHUNK),Math.floor(z/CHUNK)],[Math.floor((x+1)/CHUNK),Math.floor(z/CHUNK)],[Math.floor(x/CHUNK),Math.floor((z-1)/CHUNK)],[Math.floor(x/CHUNK),Math.floor((z+1)/CHUNK)]])mark(cx*CHUNK,cz*CHUNK)}
function breakTarget(){const q=ray(),p=blockFromHit(q);if(!p||p.y===0)return;setBlock(p.x,p.y,p.z,"air");rebuildAround(p.x,p.z)}
function placeTarget(){const q=ray(),p=blockFromHit(q,true);if(!p||p.y<0||p.y>=MAXY||get(p.x,p.y,p.z))return;setBlock(p.x,p.y,p.z,blocks[selected]);rebuildAround(p.x,p.z)}
renderer.domElement.onmousedown=e=>{if((locked||mobile)&&e.button===0)breakTarget();if((locked||mobile)&&e.button===2)placeTarget()};renderer.domElement.oncontextmenu=e=>e.preventDefault();

let sx=0,sz=0,drag=false;const stick=document.getElementById("stick");stick.onpointerdown=e=>{drag=true;stick.setPointerCapture(e.pointerId)};stick.onpointermove=e=>{if(!drag)return;const r=stick.getBoundingClientRect();sx=Math.max(-1,Math.min(1,(e.clientX-r.left-r.width/2)/35));sz=Math.max(-1,Math.min(1,(e.clientY-r.top-r.height/2)/35));stick.querySelector("i").style.transform="translate("+sx*25+"px,"+sz*25+"px)"};stick.onpointerup=()=>{drag=false;sx=sz=0;stick.querySelector("i").style.transform=""};
document.getElementById("jumpBtn").onclick=()=>{if(onGround)vy=.19};document.getElementById("breakBtn").onclick=breakTarget;document.getElementById("placeBtn").onclick=placeTarget;

const cloudMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.7});for(let i=0;i<(mobile?5:10);i++){const c=new THREE.Mesh(new THREE.BoxGeometry(7,1,3),cloudMat);c.position.set((i*17)%70-35,13,(i*23)%70-35);scene.add(c)}

let last=performance.now(),frames=0,ft=last,chunkTick=0;
function update(dt,now){
 const f=(keys.has("KeyW")?1:0)-(keys.has("KeyS")?1:0)-sz,s=(keys.has("KeyD")?1:0)-(keys.has("KeyA")?1:0)+sx,sp=(keys.has("ShiftLeft")?7:4.2)*dt;
 player.x+=(Math.sin(yaw)*f+Math.cos(yaw)*s)*sp;player.z+=(Math.cos(yaw)*f-Math.sin(yaw)*s)*sp;
 vy-=.011;player.y+=vy;const floor=height(Math.floor(player.x),Math.floor(player.z))+1.05;
 if(player.y<=floor){player.y=floor;vy=0;onGround=true}else onGround=false;if(keys.has("Space")&&onGround)vy=.19;
 camera.position.set(player.x,player.y+1.55,player.z);camera.rotation.set(pitch,yaw,0,"YXZ");
 if(now-chunkTick>250){visibleChunks();chunkTick=now}
 const angle=(now*.000025)% (Math.PI*2),day=Math.max(.08,Math.sin(angle)*.5+.5);sun.position.set(Math.cos(angle)*35,8+day*30,Math.sin(angle)*35);sun.intensity=.45+day*1.8;hemi.intensity=.45+day*.8;scene.background.setHSL(.57,.52,.27+day*.4);scene.fog.color.copy(scene.background);
}
visibleChunks();
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.033,(now-last)/1000);last=now;update(dt,now);renderer.render(scene,camera);frames++;if(now-ft>500){document.getElementById("fps").textContent=Math.round(frames*1000/(now-ft))+" FPS";frames=0;ft=now}document.getElementById("coords").textContent=Math.floor(player.x)+","+Math.floor(player.y)+","+Math.floor(player.z);document.getElementById("blockCount").textContent=countBlocks()}loop(performance.now());
document.getElementById("debugBtn").onclick=()=>document.getElementById("debug").classList.toggle("hidden");
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.3:2))});