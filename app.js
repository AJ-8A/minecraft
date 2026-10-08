import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";

const mobile=matchMedia("(max-width:700px)").matches;
const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(72,innerWidth/innerHeight,.05,180);
const renderer=new THREE.WebGLRenderer({antialias:!mobile,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:2));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=!mobile;document.getElementById("game").appendChild(renderer.domElement);

const sun=new THREE.DirectionalLight(0xfff1cf,2.2);sun.position.set(25,35,15);sun.castShadow=!mobile;
if(!mobile)sun.shadow.mapSize.set(1024,1024);
const hemi=new THREE.HemisphereLight(0xbde4ff,0x35402d,1.15);scene.add(sun,hemi);

const mats={
 grass:new THREE.MeshLambertMaterial({color:0x62a84e}),dirt:new THREE.MeshLambertMaterial({color:0x795136}),
 stone:new THREE.MeshLambertMaterial({color:0x7f878a}),wood:new THREE.MeshLambertMaterial({color:0x8c633e}),
 leaves:new THREE.MeshLambertMaterial({color:0x3f8f45,transparent:true,opacity:.92}),
 cherry:new THREE.MeshLambertMaterial({color:0xff9fc8,transparent:true,opacity:.9}),
 sand:new THREE.MeshLambertMaterial({color:0xd7bd78}),water:new THREE.MeshLambertMaterial({color:0x3e9dd1,transparent:true,opacity:.62}),
 ladder:new THREE.MeshLambertMaterial({color:0xc99558}),coal:new THREE.MeshLambertMaterial({color:0x25282a}),
 iron:new THREE.MeshLambertMaterial({color:0xd7c9b7}),gold:new THREE.MeshLambertMaterial({color:0xffc62e,emissive:0x4a3000}),
 diamond:new THREE.MeshLambertMaterial({color:0x53eaff,emissive:0x123b45}),emerald:new THREE.MeshLambertMaterial({color:0x32e06f,emissive:0x082e15}),
redstone:new THREE.MeshLambertMaterial({color:0xf04444,emissive:0x3a0505}),snow:new THREE.MeshLambertMaterial({color:0xf4f8ff})
};
const blocks=["grass","dirt","stone","wood","leaves","cherry","sand","water","ladder","coal","iron","gold","diamond","emerald","redstone","snow"];
const icons={grass:"🌿",dirt:"🟫",stone:"⬜",wood:"🪵",leaves:"🍃",cherry:"🌸",sand:"🟨",water:"💧",ladder:"🪜",coal:"⚫",iron:"🔩",gold:"🟡",diamond:"💎",emerald:"💚",redstone:"🔴",snow:"❄️"};
const geo=new THREE.BoxGeometry(1,1,1), world=new Map(), key=(x,y,z)=>x+","+y+","+z;
let selected=0,diamonds=0,biome="Plains",weather="Clear";

function put(x,y,z,type){const k=key(x,y,z);if(world.has(k))return;const m=new THREE.Mesh(geo,mats[type]||mats.stone);m.position.set(x+.5,y+.5,z+.5);m.castShadow=!mobile;m.receiveShadow=true;m.userData={x,y,z,type};scene.add(m);world.set(k,m)}
function remove(x,y,z){const k=key(x,y,z),m=world.get(k);if(m){if(["diamond","gold","emerald"].includes(m.userData.type))diamonds+=m.userData.type==="diamond"?1:0;scene.remove(m);world.delete(k)}}
function hash(x,z){return Math.abs(Math.sin(x*127.1+z*311.7)*43758.5453)%1}
function h(x,z){return Math.max(1,Math.floor(3+Math.sin(x*.27)*1.3+Math.cos(z*.31)*1.1+Math.sin((x+z)*.12)))}
function isCherry(x,z){return x>5&&z>2&&x<19}
function addTree(x,z,cherry=false){const y=h(x,z);for(let i=1;i<4;i++)put(x,y+i,z,"wood");for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=3;dy<=4;dy++)if(Math.abs(dx)+Math.abs(dz)<4)put(x+dx,y+dy,z+dz,cherry?"cherry":"leaves")}
function addOre(x,y,z,type){if(hash(x*3+y,z*5)>0.52)put(x,y,z,type)}
for(let x=-24;x<24;x++)for(let z=-24;z<24;z++){
 const y0=h(x,z);const desert=x<-10&&z<4,snowy=z<-13;
 for(let y=0;y<=y0;y++){let t=y===y0?(snowy?"snow":desert?"sand":"grass"):y>y0-3?"dirt":"stone";put(x,y,z,t)}
 if(y0>2&&hash(x,z)>.88)addOre(x,y0-2,z,"coal");
 if(y0>3&&hash(x+2,z)>.91)addOre(x,y0-3,z,"iron");
 if(y0>4&&hash(x,z+2)>.95)addOre(x,y0-4,z,"gold");
 if(y0>5&&hash(x+4,z+3)>.97)addOre(x,y0-5,z,"diamond");
}
for(let x=-18;x<20;x+=5)for(let z=-18;z<20;z+=6){if(Math.abs(x)+Math.abs(z)<7)continue;addTree(x,z,isCherry(x,z))}
for(let x=-20;x<-13;x++)for(let z=8;z<20;z++)put(x,2,z,"water");

const cavePositions=[];for(let x=-18;x<18;x++)for(let z=-18;z<18;z++){const y=2+Math.floor(hash(x+8,z+4)*3);if(hash(x*2,z*3)>.91){remove(x,y,z);cavePositions.push([x,y,z])}}
document.getElementById("blockCount").textContent=world.size;

const player={x:0,y:h(0,0)+1.05,z:6};let yaw=0,pitch=0,vy=0,onGround=false;
camera.position.set(player.x,player.y+1.55,player.z);
const keys=new Set();addEventListener("keydown",e=>{keys.add(e.code);if(e.code.startsWith("Digit"))select(+e.code.slice(5)-1);if(e.code==="KeyQ")breakTarget();if(e.code==="KeyE")placeTarget();if(e.code==="KeyF")toggleWeather()});addEventListener("keyup",e=>keys.delete(e.code));

const hot=document.getElementById("hotbar");blocks.forEach((b,i)=>{const d=document.createElement("button");d.className="slot";d.innerHTML="<span>"+icons[b]+"</span><em>"+(i+1)+"</em>";d.onclick=()=>select(i);hot.appendChild(d)});
function select(i){if(i<0||i>=blocks.length)return;selected=i;document.querySelectorAll(".slot").forEach((e,n)=>e.classList.toggle("active",n===i))}
select(0);

let locked=false;document.getElementById("play").onclick=()=>{document.getElementById("start").classList.add("hidden");if(!mobile)renderer.domElement.requestPointerLock()};
document.addEventListener("pointerlockchange",()=>locked=document.pointerLockElement===renderer.domElement);
document.addEventListener("mousemove",e=>{if(!locked)return;yaw-=e.movementX*.0022;pitch-=e.movementY*.0022;pitch=Math.max(-1.45,Math.min(1.45,pitch))});

function ray(){const r=new THREE.Raycaster();r.setFromCamera({x:0,y:0},camera);return r.intersectObjects([...world.values()])[0]}
function breakTarget(){const q=ray();if(!q)return;const p=q.object.userData;if(p.type==="bedrock")return;remove(p.x,p.y,p.z);document.getElementById("blockCount").textContent=world.size}
function placeTarget(){const q=ray();if(!q)return;const p=q.object.userData,n=q.face.normal,x=p.x+n.x,y=p.y+n.y,z=p.z+n.z;if(y>=0&&!world.has(key(x,y,z))){put(x,y,z,blocks[selected]);document.getElementById("blockCount").textContent=world.size}}
renderer.oncontextmenu=e=>e.preventDefault();renderer.onmousedown=e=>{if((locked||mobile)&&e.button===0)breakTarget();if((locked||mobile)&&e.button===2)placeTarget()};

let sx=0,sz=0,drag=false;const stick=document.getElementById("stick");
stick.onpointerdown=e=>{drag=true;stick.setPointerCapture(e.pointerId)};
stick.onpointermove=e=>{if(!drag)return;const r=stick.getBoundingClientRect();sx=Math.max(-1,Math.min(1,(e.clientX-r.left-r.width/2)/35));sz=Math.max(-1,Math.min(1,(e.clientY-r.top-r.height/2)/35));stick.querySelector("i").style.transform="translate("+sx*25+"px,"+sz*25+"px)"};
stick.onpointerup=()=>{drag=false;sx=sz=0;stick.querySelector("i").style.transform=""};
document.getElementById("jumpBtn").onclick=()=>{if(onGround)vy=.19};document.getElementById("breakBtn").onclick=breakTarget;document.getElementById("placeBtn").onclick=placeTarget;

const animals=[];const animalTypes=[["🐑",0xcfcfcf],["🐄",0xeee5d4],["🐖",0xf09a9a],["🐔",0xf2f2f2],["🐎",0x754b31],["🐇",0xd8c0ad],["🦊",0xd86c32],["🐺",0x9aa3ad]];
function makeAnimal(type,i){const g=new THREE.Group(),body=new THREE.Mesh(new THREE.BoxGeometry(.8,.65,1.15),new THREE.MeshLambertMaterial({color:type[1]}));body.position.y=.65;g.add(body);const head=new THREE.Mesh(new THREE.BoxGeometry(.55,.55,.55),body.material);head.position.set(0,.98,.62);g.add(head);g.position.set(-18+hash(i,4)*36,h(Math.floor(-18+hash(i,4)*36),Math.floor(-18+hash(i,8)*36))+1, -18+hash(i,8)*36);g.userData={speed:.3+hash(i,9)*.5,phase:hash(i,2)*6.28};scene.add(g);animals.push(g)}
const animalCap=mobile?10:18;for(let i=0;i<animalCap;i++)makeAnimal(animalTypes[i%animalTypes.length],i);

const petals=new THREE.BufferGeometry(),petalCount=mobile?90:180,pa=new Float32Array(petalCount*3);
for(let i=0;i<petalCount;i++){pa[i*3]=(hash(i,1)*50)-25;pa[i*3+1]=4+hash(i,2)*12;pa[i*3+2]=(hash(i,3)*50)-25}
petals.setAttribute("position",new THREE.BufferAttribute(pa,3));const petalMat=new THREE.PointsMaterial({color:0xffa9cf,size:mobile?.11:.16,transparent:true,opacity:.85});const petalPoints=new THREE.Points(petals,petalMat);scene.add(petalPoints);

const rainGeo=new THREE.BufferGeometry(),rainCount=mobile?180:420,ra=new Float32Array(rainCount*3);
for(let i=0;i<rainCount;i++){ra[i*3]=(hash(i,12)*50)-25;ra[i*3+1]=hash(i,13)*22;ra[i*3+2]=(hash(i,14)*50)-25}
rainGeo.setAttribute("position",new THREE.BufferAttribute(ra,3));const rain=new THREE.Points(rainGeo,new THREE.PointsMaterial({color:0x8fc9ff,size:.055,transparent:true,opacity:.7}));rain.visible=false;scene.add(rain);
function toggleWeather(){weather=weather==="Clear"?"Rain":"Clear";rain.visible=weather==="Rain";document.getElementById("weather").textContent=weather}

let tod=0,frames=0,last=performance.now(),ft=last;
function update(dt,now){
 let f=(keys.has("KeyW")?1:0)-(keys.has("KeyS")?1:0)-sz,s=(keys.has("KeyD")?1:0)-(keys.has("KeyA")?1:0)+sx,sp=(keys.has("ShiftLeft")?7:4.2)*dt;
 player.x+=(Math.sin(yaw)*f+Math.cos(yaw)*s)*sp;player.z+=(Math.cos(yaw)*f-Math.sin(yaw)*s)*sp;
 vy-=.011;player.y+=vy;const floor=h(Math.floor(player.x),Math.floor(player.z))+1.05;
 if(player.y<=floor){player.y=floor;vy=0;onGround=true}else onGround=false;if(keys.has("Space")&&onGround)vy=.19;
 camera.position.set(player.x,player.y+1.55,player.z);camera.rotation.set(pitch,yaw,0,"YXZ");
 animals.forEach((a,i)=>{a.position.x+=Math.sin(now*.00025+a.userData.phase)*a.userData.speed*dt;a.position.z+=Math.cos(now*.0002+a.userData.phase)*a.userData.speed*dt;a.position.y=h(Math.floor(a.position.x),Math.floor(a.position.z))+1;});
 const pp=petals.geometry.attributes.position.array;for(let i=0;i<petalCount;i++){pp[i*3+1]-=dt*(.5+.3*Math.sin(i));pp[i*3]+=Math.sin(now*.0004+i)*dt*.25;if(pp[i*3+1]<2)pp[i*3+1]=14}petals.geometry.attributes.position.needsUpdate=true;
 const rr=rain.geometry.attributes.position.array;if(rain.visible)for(let i=0;i<rainCount;i++){rr[i*3+1]-=dt*10;if(rr[i*3+1]<0)rr[i*3+1]=22}rain.geometry.attributes.position.needsUpdate=true;
 tod=(tod+dt*.035)%1;const angle=tod*Math.PI*2,day=Math.max(.08,Math.sin(angle)*.5+.5);sun.position.set(Math.cos(angle)*35,8+day*30,Math.sin(angle)*35);sun.intensity=.45+day*2;hemi.intensity=.45+day*.8;scene.background.setHSL(.57,.52,.28+day*.38);scene.fog.color.copy(scene.background);
}
function loop(now){requestAnimationFrame(loop);const dt=Math.min(.033,(now-last)/1000);last=now;update(dt,now);renderer.render(scene,camera);frames++;if(now-ft>500){document.getElementById("fps").textContent=Math.round(frames*1000/(now-ft))+" FPS";frames=0;ft=now}document.getElementById("coords").textContent=Math.floor(player.x)+","+Math.floor(player.y)+","+Math.floor(player.z);document.getElementById("blockCount").textContent=world.size;document.getElementById("entities").textContent=animals.length;document.getElementById("diamonds").textContent=diamonds}loop(performance.now());

document.getElementById("debugBtn").onclick=()=>document.getElementById("debug").classList.toggle("hidden");
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:2))});
