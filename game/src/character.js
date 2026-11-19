import { CAST } from './data.js';
const THREE = typeof window === 'undefined' ? null : window.THREE;
function ready() { if(!THREE) throw new Error('THREE is required to build or animate characters.'); }
const geometryCache=new Map();
function geometry(type,args) {
  const key=type+JSON.stringify(args);
  if(!geometryCache.has(key))geometryCache.set(key,new THREE[type](...args));
  return geometryCache.get(key);
}
export function mergeParts(parts) {
  ready();
  let vertices=0,indices=0;
  for(const p of parts){vertices+=p.geometry.attributes.position.count;indices+=p.geometry.index?.count ?? p.geometry.attributes.position.count;}
  const positions=new Float32Array(vertices*3),normals=new Float32Array(vertices*3),colors=new Float32Array(vertices*3);
  const uvs=new Float32Array(vertices*2);
  const index=new (vertices>65535?Uint32Array:Uint16Array)(indices);
  const v=new THREE.Vector3(),n=new THREE.Vector3(),normalMatrix=new THREE.Matrix3(),identity=new THREE.Matrix4();
  let offset=0,io=0;
  for(const p of parts) {
    const source=p.geometry,pa=source.attributes.position,na=source.attributes.normal,matrix=p.matrix || identity;
    const color=new THREE.Color(p.color ?? '#ffffff');normalMatrix.getNormalMatrix(matrix);
    for(let i=0;i<pa.count;i++) {
      if(source.attributes.uv){uvs[(offset+i)*2]=source.attributes.uv.getX(i);uvs[(offset+i)*2+1]=source.attributes.uv.getY(i);}
      v.fromBufferAttribute(pa,i).applyMatrix4(matrix);v.toArray(positions,(offset+i)*3);
      if(na)n.fromBufferAttribute(na,i).applyMatrix3(normalMatrix).normalize();else n.set(0,1,0);
      n.toArray(normals,(offset+i)*3);color.set(p.color ?? '#ffffff');if(source.attributes.color&&!p.color)color.fromBufferAttribute(source.attributes.color,i);if(p.tint)color.multiply(p.tint);color.toArray(colors,(offset+i)*3);
    }
    const count=source.index?.count ?? pa.count;
    for(let i=0;i<count;i++)index[io++]=offset+(source.index?source.index.getX(i):i);
    offset+=pa.count;
  }
  const result=new THREE.BufferGeometry();result.setAttribute('uv',new THREE.BufferAttribute(uvs,2));result.setAttribute('position',new THREE.BufferAttribute(positions,3));
  result.setAttribute('normal',new THREE.BufferAttribute(normals,3));result.setAttribute('color',new THREE.BufferAttribute(colors,3));
  result.setIndex(new THREE.BufferAttribute(index,1));result.computeBoundingBox();result.computeBoundingSphere();return result;
}
let figureMaterial,shadowMaterial;
function materials() {
  ready();
  figureMaterial ||= new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85});
  shadowMaterial ||= new THREE.MeshBasicMaterial({color:'#171a1d',transparent:true,opacity:.22,depthWrite:false});
}
function add(parts,type,args,color,x,y,z,sx=1,sy=1,sz=1,rx=0) {
  const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,0,0)),new THREE.Vector3(sx,sy,sz));
  parts.push({geometry:geometry(type,args),matrix,color});
}
function definition(def={}) {return {skin:'#bc825c',hair:'short',hairColor:'#30251f',jacket:'#e3bb36',pants:'#354454',shoes:'#24252a',height:1.8,...def};}
function bodyParts(d) {
  const p={hips:[],torso:[],head:[],armL:[],armR:[],legL:[],legR:[]};
  add(p.hips,'SphereGeometry',[1,8,6],d.pants,0,.88,0,.18,.13,.105);
  add(p.torso,'SphereGeometry',[1,10,8],d.jacket,0,.23,0,.225,.30,.12);
  add(p.torso,'CylinderGeometry',[.055,.065,.09,8],d.skin,0,.55,0);
  add(p.head,'SphereGeometry',[.12,12,8],d.skin,0,0,0);
  const long=d.hair==='bob',tied=d.hair==='tied-back';
  if(d.hair!=='none') {
    add(p.head,'SphereGeometry',[1,10,6,0,Math.PI*2,0,Math.PI/2],d.hairColor,0,.025,0,.124,long?.13:.105,.125);
    if(long)add(p.head,'SphereGeometry',[1,8,6],d.hairColor,0,-.025,-.055,.13,.12,.075);
    if(tied)add(p.head,'SphereGeometry',[.065,8,6],d.hairColor,0,.015,-.14);
  }
  for(const [side,x] of [['L',-.285],['R',.285]]) {
    add(p['arm'+side],'CylinderGeometry',[.065,.043,.46,8],d.jacket,0,-.23,0);
    add(p['arm'+side],'BoxGeometry',[.075,.105,.08],d.skin,0,-.50,0);
    add(p['leg'+side],'CylinderGeometry',[.09,.055,.70,8],d.pants,0,-.35,0);
    add(p['leg'+side],'BoxGeometry',[.125,.10,.24],d.shoes,0,-.75,.045);
  }
  const feature=String(d.feature || '').toLowerCase();
  if(feature.includes('bandana'))add(p.head,'TorusGeometry',[.121,.018,5,16,Math.PI*1.8],'#cc3434',0,.045,0,1,1,1,Math.PI/2);
  if(feature.includes('chain'))add(p.torso,'TorusGeometry',[.09,.009,5,12],'#c9cdd0',0,.31,.115,1,1.3,1);
  if(feature.includes('aviator')) {
    for(const x of [-.055,.055])add(p.head,'BoxGeometry',[.085,.045,.015],'#182c36',x,.01,.113);
    add(p.head,'BoxGeometry',[.035,.01,.018],'#c5beb1',0,.015,.12);
  }
  if(feature.includes('hat') || feature.includes('cap')) {
    const cap=feature.includes('cap'),color=cap?'#233b60':'#63503c';
    add(p.head,'CylinderGeometry',[.13,.135,cap?.065:.11,10],color,0,.13,0);
    add(p.head,'CylinderGeometry',[cap?.14:.18,cap?.14:.18,.018,12],color,0,.095,cap?.035:0);
  }
  if(feature.includes('mustache'))add(p.head,'BoxGeometry',[.08,.018,.018],d.hairColor,0,-.046,.112);
  return p;
}
const origins={hips:[0,0,0],torso:[0,1.02,0],head:[0,1.68,0],armL:[-.255,1.49,0],armR:[.255,1.49,0],legL:[-.105,.80,0],legR:[.105,.80,0]};
function mesh(parts) {const m=new THREE.Mesh(mergeParts(parts),figureMaterial);m.castShadow=true;m.receiveShadow=true;return m;}
function groupFor(d) {
  materials();const group=new THREE.Group();group.scale.setScalar(d.height/1.8);
  const shadow=new THREE.Mesh(geometry('CircleGeometry',[.25,12]),shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.008;shadow.name='shadow';group.add(shadow);
  group.userData={def:d,phase:Math.random()*Math.PI*2,height:d.height};return group;
}
export function buildFigure(def,mats) {
  ready();const d=definition(def),group=groupFor(d),parts=bodyParts(d),all=[];
  for(const [name,list] of Object.entries(parts)) {
    const translation=new THREE.Matrix4().makeTranslation(...origins[name]);
    for(const p of list)all.push({...p,matrix:translation.clone().multiply(p.matrix)});
  }
  group.add(mesh(all));return group;
}
export function buildPlayerFigure(def,mats) {
  ready();const d=definition(def),group=groupFor(d),parts=bodyParts(d),rig={};
  const hips=new THREE.Group();hips.name='hips';group.add(hips);
  for(const [name,list] of Object.entries(parts)) {
    const pivot=mesh(list);pivot.name=name;pivot.position.set(...origins[name]);hips.add(pivot);rig[name]=pivot;
  }
  group.userData.rig={...rig,hips};return group;
}
export function animateFigure(group,phase,speed=0,aiming=false,dt=0) {
  ready();const factor=Math.min(1,Math.max(0,Math.abs(speed)/9));
  const next=(Number.isFinite(phase)?phase:group.userData.phase)+Math.max(0,dt)*(4+Math.abs(speed)*1.2);
  group.userData.phase=next;const swing=Math.sin(next)*factor*.7,rig=group.userData.rig;
  if(rig) {
    rig.legL.rotation.x=swing;rig.legR.rotation.x=-swing;
    rig.armL.rotation.x=aiming?-1.35:-swing;rig.armR.rotation.x=aiming?-1.45:swing;
    rig.torso.rotation.x=factor*.12;rig.torso.scale.y=1+Math.sin(next*.6)*.008*(1-factor);
    rig.head.rotation.z=Math.sin(next*.5)*.012*(1-factor);
  } else {
    // Preserve a renderer-supplied terrain height, avoiding accumulated vertical drift.
    const previous=group.userData.bobOffset || 0,base=group.position.y-previous;
    const bob=Math.abs(Math.sin(next))*.05*factor;group.position.y=base+bob;group.userData.bobOffset=bob;
    group.rotation.x=factor*.055;group.rotation.z=Math.sin(next)*factor*.025;
  }
  return next;
}
const skins=['#f0c6a2','#d6a17d','#bc825c','#966447','#634333'];
const clothes=['#c85140','#daa636','#487280','#3b5245','#775d83','#c6b99c','#29394f','#6b463a'];
const pick=(rng,values)=>values[Math.floor(rng()*values.length)%values.length];
export function npcVariation(rng=Math.random) {
  return {skin:pick(rng,skins),hair:pick(rng,['short','bob','tied-back']),hairColor:pick(rng,['#201e1c','#684532','#bb965a']),jacket:pick(rng,clothes),pants:pick(rng,clothes),shoes:'#29282b',height:1.65+rng()*.3};
}
export function policeVariation(rng=Math.random) {return {...npcVariation(rng),jacket:'#294466',pants:'#24364d',feature:'cap'};}
export function vultureVariation(rng=Math.random) {return {...npcVariation(rng),jacket:'#25242b',pants:'#31343b',feature:'chain'};}
export function castFigure(castId,mats) {
  ready();const cast=CAST.find(c=>c.id===castId);if(!cast)throw new Error(`Unknown cast member: ${castId}`);
  const features={milo:'',rosa:'bandana',kane:'chain',juno:'aviators',mags:'hat mustache',benning:'cap'};
  const def={...cast,jacket:cast.jacketColor,pants:castId==='benning'?'#24364d':'#35404d',feature:features[castId],height:1.8};
  return castId==='milo'?buildPlayerFigure(def,mats):buildFigure(def,mats);
}
