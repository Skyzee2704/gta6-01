import { createMaterials, makeCanvasTexture } from './materials.js';
const THREE = typeof window === 'undefined' ? null : window.THREE;
function start(mats) {
  if (!THREE) throw new Error('THREE is required to build street props.');
  return [new THREE.Group(), mats || createMaterials()];
}
const geometryCache = new Map();
function geo(kind, args) {
  const key=kind+JSON.stringify(args);
  if(!geometryCache.has(key)) geometryCache.set(key,new THREE[kind](...args));
  return geometryCache.get(key);
}
function part(g,kind,args,mat,x=0,y=0,z=0,rx=0,ry=0,rz=0) {
  const mesh=new THREE.Mesh(geo(kind,args),mat);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,rz);
  mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
}
const box=(g,m,x,y,z,w,h,d)=>part(g,'BoxGeometry',[w,h,d],m,x,y,z);
const cyl=(g,m,x,y,z,rt,rb,h)=>part(g,'CylinderGeometry',[rt,rb,h,8],m,x,y,z);
function tint(mat,color) {const m=mat.clone();m.color.set(color);return m;}
function brace(g,m,a,b,r=.05) {
  const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);
  const p=cyl(g,m,0,0,0,r,r,delta.length());p.position.copy(av.add(bv).multiplyScalar(.5));p.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return p;
}
export function buildTree(kind='oak',rng=Math.random,mats) {
  const [g,m]=start(mats),h=kind==='palm'?6+rng()*2:4+rng()*2;
  const trunk=kind==='palm'?h*.82:h*.55;
  cyl(g,m.trunkBrown,0,trunk*.25,0,.16,.25,trunk*.5).rotation.z=-.07;
  cyl(g,m.trunkBrown,.14,trunk*.75,0,.09,.16,trunk*.54).rotation.z=-.12;
  if(kind==='palm') {
    const n=5+Math.floor(rng()*3);
    for(let i=0;i<n;i++) {
      const geometry=new THREE.PlaneGeometry(.65,3,3,8),p=geometry.attributes.position;
      for(let j=0;j<p.count;j++) {
        const t=(p.getY(j)+1.5)/3;
        p.setXYZ(j,p.getX(j)*Math.sin(Math.PI*(.08+.9*t)), -Math.pow(t,1.6)*1.35, t*3);
      }
      geometry.computeVertexNormals();
      const frond=new THREE.Mesh(geometry,i%2?m.foliagePalm:m.foliageGreen);
      frond.position.set(.28,trunk,0);frond.rotation.y=i/n*Math.PI*2+rng()*.2;frond.castShadow=true;g.add(frond);
    }
  } else {
    const n=3+Math.floor(rng()*3);
    for(let i=0;i<n;i++) {
      const pine=kind==='pine', y=pine?trunk+i*.5:trunk+.5+rng()*1.2;
      const p=part(g,'IcosahedronGeometry',[pine?1.4-i*.18:1.2+rng()*.4,1],i%2?m.foliagePalm:m.foliageGreen,
        pine?.2:Math.cos(i*2.4)*.65,y,pine?0:Math.sin(i*2.4)*.65);
      if(pine)p.scale.y=1.3;
    }
  }
  g.userData={kind,swayPhase:rng()*Math.PI*2};return g;
}
export function buildLamp(type='modern',mats) {
  const [g,m]=start(mats),pole=type==='classic'?tint(m.metal,'#303c37'):m.metal;
  cyl(g,pole,0,1.7,0,.10,.17,3.4);cyl(g,pole,0,4.3,0,.065,.10,1.8);
  part(g,'TorusGeometry',[.7,.065,5,10,Math.PI/2],pole,.7,5.2,0,0,0,Math.PI/2);
  const head=part(g,'SphereGeometry',[1,8,5],pole,.7,5.9,0);head.scale.set(.42,.13,type==='harbor'?.4:.24);
  const bulbMat=new THREE.MeshBasicMaterial({color:'#ffdfa0'});
  part(g,'SphereGeometry',[.12,8,5],bulbMat,.7,5.78,0);
  if(type==='classic')cyl(g,pole,0,.15,0,.28,.33,.3);
  g.userData.bulbMat=bulbMat;return g;
}
export function buildSign(text,opts={},mats) {
  const [g]=start(mats),{w=3,h=.8,bg='#183e48',fg='#ffffff',font='bold 44px sans-serif'}=opts;
  const texture=makeCanvasTexture(512,128,(c,cw,ch)=>{
    c.fillStyle=bg;c.fillRect(0,0,cw,ch);c.strokeStyle=fg;c.lineWidth=4;c.strokeRect(7,7,cw-14,ch-14);
    c.fillStyle=fg;c.font=font;c.textAlign='center';c.textBaseline='middle';c.fillText(String(text),cw/2,ch/2,cw-30);
  });
  part(g,'PlaneGeometry',[w,h],new THREE.MeshStandardMaterial({map:texture,roughness:.7,side:THREE.DoubleSide}));return g;
}
export function buildFurniture(kind,mats,opts={}) {
  const [g,m]=start(mats);
  if(kind==='hydrant') {
    const red=tint(m.metal,'#ba352a');cyl(g,red,0,.4,0,.16,.20,.7);
    part(g,'SphereGeometry',[.17,8,5],red,0,.76,0);
    part(g,'CylinderGeometry',[.09,.09,.5,8],red,0,.5,0,0,0,Math.PI/2);
  } else if(kind==='bench') {
    for(let i=0;i<3;i++)box(g,m.wood,0,.52,(i-1)*.16,1.8,.09,.13);
    for(const x of [-.65,.65])box(g,m.metal,x,.25,0,.08,.5,.5);
    box(g,m.wood,0,.95,.24,1.8,.28,.08);
  } else if(kind==='trash-bin') {
    cyl(g,m.roofDark,0,.45,0,.3,.26,.9);part(g,'TorusGeometry',[.3,.045,5,10],m.metal,0,.9,0,Math.PI/2);
  } else if(kind==='awning') {
    const map=makeCanvasTexture(128,128,(c,w,h)=>{for(let i=0;i<8;i++){c.fillStyle=i%2?'#f4e7cf':opts.color||opts.bg||'#a94f41';c.fillRect(i*w/8,0,w/8,h);}});
    part(g,'PlaneGeometry',[3,1.5],new THREE.MeshStandardMaterial({map,side:THREE.DoubleSide}),0,2.4,.6,-Math.PI/3);
    for(const x of [-1.4,1.4])brace(g,m.metal,[x,1.9,1.2],[x,2.8,0]);
  } else if(kind==='utility-box') {
    const map=makeCanvasTexture(128,128,(c,w,h)=>{c.fillStyle='#929b99';c.fillRect(0,0,w,h);c.strokeStyle='#4b5555';c.strokeRect(9,6,110,116);for(let i=0;i<5;i++)c.fillRect(20,17+i*6,55,2);c.fillStyle='#333b3a';c.fillRect(99,65,4,12);});
    box(g,new THREE.MeshStandardMaterial({map,roughness:.65}),0,.65,0,.85,1.3,.45);
  } else if(kind==='bus-stop') {
    cyl(g,m.metal,0,1.6,0,.05,.07,3.2);const sign=buildSign('BUS STOP',{w:1.2,h:.65,bg:'#235b9c'},m);sign.position.y=2.8;g.add(sign);
    const bench=buildFurniture('bench',m);bench.position.x=1.3;g.add(bench);
  } else if(kind==='planter') {
    box(g,m.concrete,0,.18,0,1.2,.36,1.2);
    for(const x of [-.55,.55])box(g,m.concrete,x,.45,0,.1,.25,1.2);
    for(const z of [-.55,.55])box(g,m.concrete,0,.45,z,1.2,.25,.1);
    for(let i=0;i<3;i++)part(g,'IcosahedronGeometry',[.4,0],m.foliageGreen,(i-1)*.28,.62,0);
  } else throw new Error(`Unknown furniture kind: ${kind}`);
  return g;
}
export function buildTrafficLight(mats) {
  const [g,m]=start(mats);cyl(g,m.metal,0,1.7,0,.06,.1,3.4);box(g,m.roofDark,0,3.45,0,.38,1.1,.3);
  const lamps={};for(const [i,key,color] of [[0,'red','#ed352b'],[1,'yellow','#ffcf36'],[2,'green','#36db78']]) {
    const mat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.08});
    part(g,'SphereGeometry',[.115,8,5],mat,0,3.78-i*.32,.17).scale.z=.35;lamps[key]=mat;
  }
  g.userData.lamps=lamps;return g;
}
export function buildContainer(color='#b95637',mats) {
  const [g,m]=start(mats),paint=tint(m.metal,color);box(g,paint,0,1.3,0,6,2.6,2.4);
  for(const side of [-1,1])for(let i=0;i<4;i++)box(g,paint,-2.3+i*1.53,1.3,side*1.23,.08,2.5,.08);
  for(const x of [-2.95,2.95])for(const z of [-1.18,1.18])for(const y of [.08,2.52])box(g,m.metal,x,y,z,.18,.16,.18);
  return g;
}
export function buildCrane(mats) {
  const [g,m]=start(mats),paint=tint(m.metal,'#dba52d');
  for(const x of [-1,1])for(const z of [-1,1])box(g,paint,x,5,z,.22,10,.22);
  for(let y=0;y<10;y+=2)for(const z of [-1,1])brace(g,paint,[-1,y,z],[1,y+2,z],.065);
  box(g,paint,4,10,0,14,.4,.5);box(g,paint,-4,9.3,0,1.6,1.2,1.4);
  brace(g,paint,[0,12,0],[10,10,0]);brace(g,paint,[0,12,0],[-3,10,0]);
  cyl(g,m.roofDark,9,7,0,.035,.035,6);part(g,'TorusGeometry',[.22,.055,5,9,Math.PI*1.5],m.metal,9,3.9,0);return g;
}
export function buildLighthouse(mats) {
  const [g,m]=start(mats),white=tint(m.concrete,'#ffffff'),red=tint(m.concrete,'#d44a3c');
  for(let i=0;i<5;i++)cyl(g,i%2?red:white,0,.7+i*1.4,0,1.2-i*.12,1.32-i*.12,1.4);
  cyl(g,m.glassLit,0,7.4,0,.9,.9,.8);cyl(g,m.roofDark,0,7,0,1.1,1.1,.15);
  part(g,'ConeGeometry',[1.25,.65,12],red,0,8.1,0);
  part(g,'SphereGeometry',[.28,8,5],new THREE.MeshBasicMaterial({color:'#ffebbb'}),0,7.45,0);return g;
}
export function buildNeonArch(mats) {
  const [g,m]=start(mats);for(const x of [-4,4]){box(g,m.metal,x,3,0,.35,6,.4);cyl(g,m.neonPink,x,3,-.24,.055,.055,5.8);}
  box(g,m.metal,0,6,0,8.4,.6,.4);part(g,'CylinderGeometry',[.06,.06,8.3,8],m.neonTeal,0,6.4,-.23,0,0,Math.PI/2);
  const sign=buildSign('NEON MILE',{w:6,h:1,bg:'#251632',fg:'#ff72ca'},m);sign.position.set(0,5.9,-.25);g.add(sign);return g;
}
