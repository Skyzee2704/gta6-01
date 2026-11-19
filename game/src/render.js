import { createMaterials, createGroundTexture, createDetailTexture, makeCanvasTexture } from './materials.js';
import { buildTree, buildLamp, buildSign, buildFurniture, buildTrafficLight, buildCrane, buildLighthouse, buildNeonArch, buildContainer } from './props.js';
import { buildPlayerFigure, buildFigure, animateFigure, npcVariation, policeVariation, vultureVariation, mergeParts } from './character.js';
import { VEHICLE_TYPES } from './data.js';
import { trafficLightAt } from './traffic.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const height=b=>b.totalH??b.height??b.h??12;
const wallHeight=b=>b.totalH!=null?b.totalH-(b.roof?.height||0):height(b);
function windowSamples(b) { return (b.windows||[]).filter(w=>w.floor===0||w.floor===Math.floor((b.floors||3)/2)||w.floor===(b.floors||3)-1); }
export function estimateSceneStats(city={}) {
  const buildings=city.buildings||[],props=city.props||[],roads=city.roads||[];
  const windows=Math.min(6000,buildings.reduce((n,b)=>n+windowSamples(b).length*2,0));
  const roofs=new Set(buildings.map(b=>b.roof?.type||'flat'));
  const signs=Math.min(80,buildings.filter(b=>b.sign).length);
  const kinds=new Set(props.map(p=>p.kind));
  return {drawCalls:8+(buildings.length?1:0)+roofs.size+(windows?1:0)+signs+kinds.size*3+(city.intersections||[]).length*5+36,
    triangles:24+buildings.length*24+windows*2+signs*2+roads.length*24+props.reduce((n,p)=>n+(['oak','pine','palm'].includes(p.kind)?500:p.kind==='lamp'?210:140),0)+(city.intersections||[]).length*160+9000};
}
function requireThree() {
  if(typeof window==='undefined'||!window.THREE) throw new Error('SOLMAR renderer requires window.THREE. Load the three.js r160 UMD classic script before the module scripts.');
  return window.THREE;
}
const vehicleCaches=new WeakMap();
export function buildVehicleMesh(typeId='sedan',color='#718b99',mats) {
  const T=requireThree(),m=mats||createMaterials();
  let cache=vehicleCaches.get(T);if(!cache){cache={geo:new Map(),paint:new Map(),plate:null};vehicleCaches.set(T,cache);}
  const g=new T.Group(),body=new T.Group();g.add(body);
  const geo=(name,args)=>{const key=name+args.join(',');if(!cache.geo.has(key))cache.geo.set(key,new T[name](...args));return cache.geo.get(key);};
  const paintKey=typeId+color;if(!cache.paint.has(paintKey))cache.paint.set(paintKey,new T.MeshStandardMaterial({color:typeId==='taxi'?'#f7c72b':color,roughness:.32,metalness:.45}));
  const paint=cache.paint.get(paintKey);const tailMaterial=new T.MeshStandardMaterial({color:'#d51f24',emissive:'#ff1420',emissiveIntensity:.6});
  const part=(name,args,mat,x,y,z)=>{const p=new T.Mesh(geo(name,args),mat);p.position.set(x,y,z);p.castShadow=true;p.receiveShadow=true;body.add(p);return p;};
  const box=(mat,x,y,z,w,h,d)=>part('BoxGeometry',[w,h,d],mat,x,y,z);
  const wheels=[];g.userData={body,wheels,lastSpeed:0,spin:0,type:typeId,color,tailMaterial};
  if(typeId==='boat'||typeId==='speedboat'||typeId==='yacht') {
    const l=typeId==='yacht'?12:typeId==='speedboat'?7:5;
    const hull=part('CylinderGeometry',[1,1,l,4],paint,0,.4,0);hull.rotation.z=Math.PI/2;hull.scale.z=1.5;
    box(m.wood,0,.85,0,l*.82,.15,2.1);box(m.glassDark,-.6,1.2,0,l*.3,.7,1.5);box(m.concrete,-1,1.65,0,l*.34,.12,1.8);
    box(m.chrome,-l*.4,1.2,0,.08,.8,2.2);return g;
  }
  if(typeId==='heli') {
    const hull=part('SphereGeometry',[1,14,10],paint,0,1.6,0);hull.scale.set(2,1,1.1);
    const glass=part('SphereGeometry',[1,12,8],m.glassDark,1,1.7,0);glass.scale.set(1.1,.8,1.05);
    box(paint,-3,1.7,0,4,.3,.3);box(paint,-4.7,2.2,0,.5,1.3,.15);
    for(const z of [-1.1,1.1]){box(m.chrome,0,.35,z,4,.12,.12);box(m.chrome,0,.8,z,.12,1,.12);}
    const rotor=new T.Group();rotor.position.y=2.9;body.add(rotor);const blade=box(m.roofDark,0,0,0,9,.08,.24);body.remove(blade);rotor.add(blade);g.userData.rotor=rotor;return g;
  }
  const t=VEHICLE_TYPES.find(v=>v.id===typeId)||VEHICLE_TYPES[0],l=t.length,w=t.width,h=t.height,bike=t.kind==='bike'||typeId==='scooter';
  box(paint,0,bike?.65:.65,0,l,bike?.3:.6,w);
  if(bike){box(m.tireBlack,-.3,1,0,l*.4,.16,w*.8);box(m.chrome,.65,1.15,0,.12,.12,w*1.5);}
  else {
    const tall=typeId==='bus'||typeId==='van',pickup=typeId==='pickup';
    box(m.glassDark,pickup?l*.12:-l*.08,h*.72,0,l*(tall?.78:.36),h*.45,w*.88);
    box(paint,pickup?l*.12:-l*.08,h*.97,0,l*(tall?.8:.38),.12,w*.94);
    if(pickup){box(m.roofDark,-l*.28,.99,0,l*.35,.06,w*.8);for(const z of [-w*.46,w*.46])box(paint,-l*.28,1.1,z,l*.4,.4,.12);}
    if(typeId==='bus')for(let x=-l*.3;x<l*.4;x+=.85)box(paint,x,h*.7,0,.08,h*.5,w*.91);
    for(const side of [-1,1]){box(m.chrome,l*.12,1.2,side*(w*.56),.22,.16,.15);box(m.chrome,-.2,.85,side*w*.51,.24,.05,.04);}
  }
  for(const x of [-l*.3,l*.3])for(const z of bike?[0]:[-w*.5,w*.5]) {
    const pivot=new T.Group();pivot.position.set(x,.36,z);body.add(pivot);
    const tire=new T.Mesh(geo('CylinderGeometry',[bike?.33:.36,bike?.33:.36,bike?.18:.24,12]),m.tireBlack);tire.rotation.x=Math.PI/2;pivot.add(tire);
    const hub=new T.Mesh(geo('CylinderGeometry',[.19,.19,bike?.19:.26,10]),m.chrome);hub.rotation.x=Math.PI/2;tire.add(hub);hub.rotation.x=0;
    wheels.push({pivot,tire,front:x>0});
  }
  for(const z of [-w*.32,w*.32]){box(m.glassLit,l*.505,.77,z,.07,.18,w*.22);box(tailMaterial,-l*.505,.77,z,.07,.16,w*.2);}
  box(m.roofDark,l*.512,.55,0,.08,.18,w*.45);
  for(const x of [-l*.51,l*.51])box(m.chrome,x,.4,0,.12,.12,w*.96);
  box(m.chrome,-l*.51,.3,w*.25,.2,.09,.09);
  if(!cache.plate)cache.plate=new T.MeshStandardMaterial({map:makeCanvasTexture(128,32,(c)=>{c.fillStyle='#eee8d5';c.fillRect(0,0,128,32);c.fillStyle='#27394a';c.font='bold 22px monospace';c.fillText('SOL 617',8,24);})});
  const plate=part('PlaneGeometry',[.44,.13],cache.plate,-l*.515,.55,0);plate.rotation.y=-Math.PI/2;
  if(typeId==='taxi'){box(m.glassLit,-.2,h+.2,0,.6,.22,.32);for(const z of [-w*.505,w*.505])box(m.roofDark,0,.8,z,.7,.22,.02);}
  if(typeId==='police'||typeId==='cruiser') {
    const red=new T.MeshStandardMaterial({color:'#ed2334',emissive:'#ff1020',emissiveIntensity:2}),blue=new T.MeshStandardMaterial({color:'#336bff',emissive:'#174fff',emissiveIntensity:2});
    box(red,-.1,h+.16,-.28,.6,.18,.45);box(blue,-.1,h+.16,.28,.6,.18,.45);g.userData.lightBar=[red,blue];
  }
  return g;
}

export function createRenderer(canvas,initialWorld) {
  const T=requireThree();if(!initialWorld?.city)throw new Error('SOLMAR renderer requires a world with city data.');
  const city=initialWorld.city,mats=createMaterials(),scene=new T.Scene(),outdoors=new T.Group();scene.add(outdoors);
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.outputColorSpace=T.SRGBColorSpace;renderer.info.autoReset=false;
  const camera=new T.PerspectiveCamera(58,1,.1,2000),dummy=new T.Group(),color=new T.Color(),target=new T.Vector3(),desired=new T.Vector3(),projection=new T.Vector3();
  let width=canvas.clientWidth||1280,hgt=canvas.clientHeight||720,scale=1,quality='high',fps=60,frameMs=16.67,adaptT=0,lastNow=0,shot=false,disposed=false,contextLost=false;
  const sun=new T.DirectionalLight('#fff1d4',2);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-60,right:60,top:60,bottom:-60,near:1,far:350});sun.shadow.bias=-.0003;sun.shadow.normalBias=.04;scene.add(sun,sun.target);
  scene.add(new T.HemisphereLight('#bdd9ff','#a28b68',1.25),new T.AmbientLight('#ffffff',.15));scene.fog=new T.Fog('#bcd8df',180,700);
  const skyUniforms={top:{value:new T.Color()},horizon:{value:new T.Color()},sunDir:{value:new T.Vector3(0,1,0)}};
  const sky=new T.Mesh(new T.SphereGeometry(900,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:skyUniforms,
    vertexShader:'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 vDirection; uniform vec3 top; uniform vec3 horizon; uniform vec3 sunDir; void main(){vec3 d=normalize(vDirection);float h=pow(max(d.y,0.),.55);vec3 c=mix(horizon,top,h);float s=max(dot(d,normalize(sunDir)),0.);c+=vec3(1.,.72,.36)*(pow(s,420.)*2.+pow(s,18.)*.14);gl_FragColor=vec4(c,1.);}' }));sky.frustumCulled=false;scene.add(sky);
  const waterUniforms={time:{value:0},light:{value:1}};
  const water=new T.Mesh(new T.PlaneGeometry(1800,1000,64,48),new T.ShaderMaterial({uniforms:waterUniforms,side:T.DoubleSide,
    vertexShader:'uniform float time;varying vec3 vP;void main(){vec3 p=position;p.z+=sin(p.x*.13+time*1.5)*.17+sin(p.y*.17+time)*.12;vP=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
    fragmentShader:'uniform float time;uniform float light;varying vec3 vP;void main(){float w=sin(vP.x*.19+vP.y*.11+time)*.5+.5;vec3 c=mix(vec3(.025,.22,.34),vec3(.08,.48,.58),w);c+=vec3(.16,.23,.23)*smoothstep(-350.,400.,vP.y);gl_FragColor=vec4(c*light,1.);}' }));water.rotation.x=-Math.PI/2;water.position.set(0,-.12,city.waterLineZ+500);outdoors.add(water);
  const groundMat=new T.MeshStandardMaterial({map:createGroundTexture(city).texture,roughness:.9});
  const ground=new T.Mesh(new T.PlaneGeometry(640,480),groundMat);ground.userData.keepGround=true;ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;outdoors.add(ground);
  const detailMap=createDetailTexture();detailMap.repeat.set(32,32);const detail=new T.Mesh(new T.PlaneGeometry(256,256),new T.MeshBasicMaterial({map:detailMap,transparent:true,opacity:.12,blending:T.MultiplyBlending,depthWrite:false}));detail.rotation.x=-Math.PI/2;detail.position.y=.018;outdoors.add(detail);
  function instances(geometry,material,items,transform) {
    if(!items.length)return null;const mesh=new T.InstancedMesh(geometry,material,items.length);mesh.castShadow=true;mesh.receiveShadow=true;
    for(let i=0;i<items.length;i++){dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);transform(items[i],dummy,i);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
    mesh.instanceMatrix.needsUpdate=true;outdoors.add(mesh);return mesh;
  }
  const boxGeo=new T.BoxGeometry(1,1,1),buildings=city.buildings||[];
  const bodies=instances(boxGeo,new T.MeshStandardMaterial({roughness:.78}),buildings,(b,d)=>{d.position.set(b.x,wallHeight(b)/2,b.z);d.scale.set(b.w,wallHeight(b),b.d);});
  if(bodies)for(let i=0;i<buildings.length;i++)bodies.setColorAt(i,color.set(buildings[i].baseColor||'#d4c6ac'));
  const roofTypes=['flat','gabled','hipped','pyramidal','mansard','skillion'];
  for(const type of roofTypes){const list=buildings.filter(b=>(b.roof?.type||'flat')===type);let geo=boxGeo;
    if(type==='gabled') {
      geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([-.5,-.5,-.5,.5,-.5,-.5,.5,-.5,.5,-.5,-.5,.5,-.5,.5,0,.5,.5,0],3));
      geo.setIndex([0,4,5,0,5,1,3,2,5,3,5,4,0,3,4,1,5,2,0,1,2,0,2,3]);geo.computeVertexNormals();
    }
    if(type==='hipped'||type==='pyramidal')geo=new T.ConeGeometry(Math.SQRT1_2,1,4,1,false,Math.PI/4);
    if(type==='mansard')geo=new T.CylinderGeometry(.38,Math.SQRT1_2,1,4,1,false,Math.PI/4);
    const mesh=instances(geo,new T.MeshStandardMaterial({roughness:.85}),list,(b,d)=>{const rh=b.roof?.height||1;const thin=type==='flat'||type==='skillion',h=thin?.3:rh;d.position.set(b.x,wallHeight(b)+h*.5-.02,b.z);d.scale.set(b.w+.4,h,b.d+.4);});
    if(mesh)for(let i=0;i<list.length;i++)mesh.setColorAt(i,color.set(type==='flat'||type==='skillion'?'#3e474b':'#ae563b'));
  }
  const windows=[];for(const b of buildings)for(const w of windowSamples(b))for(const side of [-1,1])if(windows.length<6000)windows.push({b,w,side});
  const windowMesh=instances(new T.PlaneGeometry(1,1),new T.MeshStandardMaterial({color:'#ffffff',emissive:'#ffffff',emissiveIntensity:.55,roughness:.2,metalness:.4}),windows,({b,w,side},d)=>{d.position.set(b.x+(w.bay+.5)/(b.bays||4)*b.w-b.w/2,(w.floor+.55)*(b.floorH||3.2),b.z+side*(b.d/2+.025));d.rotation.y=side<0?Math.PI:0;d.scale.set(b.w/(b.bays||4)*.62,1.65,1);});
  if(windowMesh)for(let i=0;i<windows.length;i++)windowMesh.setColorAt(i,color.set(windows[i].w.lit?'#ffd78b':'#193449'));
  let signs=0;for(const b of buildings)if(b.sign&&signs++<80){const s=buildSign(b.sign.text||b.sign,{w:Math.min(b.w*.8,8),h:1.2},mats);s.position.set(b.x,2.3,b.z+b.d/2+.06);outdoors.add(s);}
  const curbs=[];for(const r of city.roads||[])for(const side of [-1,1])curbs.push({r,side});
  instances(boxGeo,mats.concrete,curbs,({r,side},d)=>{d.position.set((r.x0+r.x1)/2+(r.horizontal?0:side*8.3),.075,(r.z0+r.z1)/2+(r.horizontal?side*8.3:0));d.scale.set(r.horizontal?Math.abs(r.x1-r.x0):.45,.15,r.horizontal?.45:Math.abs(r.z1-r.z0));});
  // Bake detailed templates into two material batches per tree family.
  const foliage=[];
  function bake(template,select) {const parts=[];template.updateMatrixWorld(true);template.traverse(o=>{if(o.isMesh&&select(o)){const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);parts.push(g);}});const merged=mergeParts(parts.map(geometry=>({geometry})));for(const p of parts)p.dispose();return merged;}
  for(const kind of ['oak','pine','palm']){const list=(city.props||[]).filter(p=>p.kind===kind);if(!list.length)continue;const tree=buildTree(kind,()=>.42,mats);
    for(const leaves of [false,true]){const geometry=bake(tree,o=>[mats.foliageGreen,mats.foliagePalm].includes(o.material)===leaves);const mesh=instances(geometry,leaves?mats.foliageGreen:mats.trunkBrown,list,(p,d)=>{d.position.set(p.x,0,p.z);d.rotation.y=p.rot||0;d.scale.setScalar(p.scale||1);});if(leaves)foliage.push({mesh,list});}}
  const lamps=[];for(const type of ['modern','classic','harbor']){const list=(city.props||[]).filter(p=>p.kind==='lamp'&&(p.type||'modern')===type);if(!list.length)continue;const lamp=buildLamp(type,mats),bulb=lamp.userData.bulbMat;lamps.push(bulb);
    for(const luminous of [false,true])instances(bake(lamp,o=>(o.material===bulb)===luminous),luminous?bulb:mats.metal,list,(p,d)=>{d.position.set(p.x,0,p.z);d.rotation.y=p.rot||0;d.scale.setScalar(p.scale||1);});}
  for(const kind of ['hydrant','bench','trash-bin','awning','utility-box','bus-stop','planter']){const list=(city.props||[]).filter(p=>p.kind===kind);if(!list.length)continue;const template=buildFurniture(kind,mats);const byMat=new Map();template.traverse(o=>{if(o.isMesh)byMat.set(o.material,true);});for(const mat of byMat.keys())instances(bake(template,o=>o.material===mat),mat,list,(p,d)=>{d.position.set(p.x,0,p.z);d.rotation.y=p.rot||0;d.scale.setScalar(p.scale||1);});}
  const lights=[];for(const p of city.intersections||[]){const light=buildTrafficLight(mats);light.position.set(p.x+9,0,p.z+9);lights.push({group:light,id:p.id});outdoors.add(light);}
  for(const l of city.landmarks||[]){let g;if(l.kind==='lighthouse')g=buildLighthouse(mats);if(l.kind==='crane')g=buildCrane(mats);if(l.kind==='arch')g=buildNeonArch(mats);if(g){g.position.set(l.x,0,l.z);outdoors.add(g);}
    if(l.kind==='pier')for(let i=0;i<60;i++){const plank=new T.Mesh(new T.BoxGeometry(7,.25,.8),mats.wood);plank.position.set(l.x,.35,l.z+i*.82);plank.receiveShadow=true;outdoors.add(plank);}
    if(l.kind==='towers')for(let i=0;i<3;i++){const tower=new T.Mesh(new T.BoxGeometry(12,58+i*12,12),mats.glassDark);tower.position.set(l.x+(i-1)*16,29+i*6,l.z);outdoors.add(tower);for(let y=3;y<58+i*12;y+=4){const strip=new T.Mesh(new T.BoxGeometry(12.1,.13,12.1),mats.glassLit);strip.position.set(tower.position.x,y,l.z);outdoors.add(strip);}}}
  const containers=Array.from({length:18},(_,i)=>({x:255+(i%3)*8,z:75+Math.floor(i/3)*5}));const container=buildContainer('#b65837',mats);const containerMats=new Set();container.traverse(o=>{if(o.isMesh)containerMats.add(o.material);});for(const mat of containerMats)instances(bake(container,o=>o.material===mat),mat,containers,(p,d)=>d.position.set(p.x,0,p.z));
  for(let i=0;i<3;i++){const yacht=buildVehicleMesh('yacht','#eef0e5',mats);yacht.position.set(-100+i*22,.1,city.waterLineZ+22+i*5);outdoors.add(yacht);}
  const retired=[],vehicleMap=new Map(),figures=new Map(),player=buildPlayerFigure(undefined,mats);outdoors.add(player);
  const rainMat=new T.MeshBasicMaterial({color:'#b8d4ed',transparent:true,opacity:.3,depthWrite:false});const rain=new T.InstancedMesh(new T.BoxGeometry(.025,.8,.025),rainMat,1200);rain.frustumCulled=false;scene.add(rain);
  const flashes=new T.InstancedMesh(new T.SphereGeometry(1,6,4),new T.MeshBasicMaterial({color:'#fff3a0',toneMapped:false}),512);flashes.frustumCulled=false;outdoors.add(flashes);
  const rainSeed=new Float32Array(1200*3);for(let i=0;i<1200;i++){rainSeed[i*3]=((i*73)%1200)/1200*70-35;rainSeed[i*3+1]=((i*193)%1200)/1200*35;rainSeed[i*3+2]=((i*467)%1200)/1200*70-35;}
  const rooms=new T.Group();rooms.visible=false;scene.add(rooms);const roomGroups=[];const interiorPlayer=buildPlayerFigure(undefined,mats),interiorKeeper=buildFigure(npcVariation(()=>.42),mats);rooms.add(interiorPlayer,interiorKeeper);
  for(let i=0;i<2;i++){const room=new T.Group();room.position.set(i*40,0,-1100);rooms.add(room);roomGroups.push(room);
    const addBox=(x,y,z,w,h,d,mat)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);room.add(mesh);};
    addBox(0,-.15,0,16,.3,14,mats.wood);addBox(0,2.5,-7,16,5,.3,mats.concrete);addBox(-8,2.5,0,.3,5,14,mats.brickPainted);addBox(8,2.5,0,.3,5,14,mats.brickPainted);addBox(0,.7,-4,11,1.4,1.2,mats.wood);
    for(let n=0;n<3;n++){addBox(-4+n*4,.8,1,2,.15,2,mats.wood);const bench=buildFurniture('bench',mats);bench.position.set(-4+n*4,0,3);room.add(bench);}
    const lamp=new T.PointLight('#ffd3a0',35,24,2);lamp.position.set(0,3.8,0);room.add(lamp);}
  const quadScene=new T.Scene(),quadCamera=new T.OrthographicCamera(-1,1,1,-1,0,1),quad=new T.Mesh(new T.PlaneGeometry(2,2));quad.frustumCulled=false;quadScene.add(quad);
  let bloom=null,bloomFailed=false;
  function setupBloom(){try{const targets=Array.from({length:3},()=>new T.WebGLRenderTarget(1,1,{depthBuffer:false}));targets[0].depthBuffer=true;
    const vertexShader='varying vec2 uvP;void main(){uvP=uv;gl_Position=vec4(position.xy,0.,1.);}';
    const threshold=new T.ShaderMaterial({uniforms:{source:{value:targets[0].texture}},vertexShader,fragmentShader:'varying vec2 uvP;uniform sampler2D source;void main(){vec3 c=texture2D(source,uvP).rgb;gl_FragColor=vec4(c*smoothstep(.72,1.2,max(c.r,max(c.g,c.b))),1.);}'});
    const blur=new T.ShaderMaterial({uniforms:{source:{value:null},stepUV:{value:new T.Vector2()}},vertexShader,fragmentShader:'varying vec2 uvP;uniform sampler2D source;uniform vec2 stepUV;void main(){vec3 c=texture2D(source,uvP).rgb*.375;c+=(texture2D(source,uvP+stepUV).rgb+texture2D(source,uvP-stepUV).rgb)*.25;c+=(texture2D(source,uvP+stepUV*2.).rgb+texture2D(source,uvP-stepUV*2.).rgb)*.0625;gl_FragColor=vec4(c,1.);}'});
    const composite=new T.ShaderMaterial({uniforms:{source:{value:targets[1].texture}},vertexShader,fragmentShader:'varying vec2 uvP;uniform sampler2D source;void main(){gl_FragColor=vec4(texture2D(source,uvP).rgb*.28,1.);}',transparent:true,blending:T.AdditiveBlending,depthTest:false,depthWrite:false});
    bloom={targets,threshold,blur,composite};}catch(error){bloomFailed=true;bloom=null;console.warn('Bloom unavailable; using direct rendering.',error);}}
  setupBloom();
  function resize(w,h){width=Math.max(1,w);hgt=Math.max(1,h);camera.aspect=width/hgt;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5)*scale);renderer.setSize(width,hgt,false);if(bloom)for(const rt of bloom.targets)rt.setSize(Math.max(1,Math.floor(width*renderer.getPixelRatio()/2)),Math.max(1,Math.floor(hgt*renderer.getPixelRatio()/2)));}
  function setQuality(q){quality=['high','medium','low'].includes(q)?q:'medium';renderer.shadowMap.enabled=quality!=='low';sun.castShadow=quality!=='low';const size=quality==='high'?2048:1024;if(sun.shadow.mapSize.x!==size){sun.shadow.mapSize.set(size,size);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}}resize(width,hgt);}
  // Consolidate opaque untextured parts by material, retaining animated world transforms.
  const partBatches=new Map(),batchMaterials=new Map();
  function batchParts(){
    for(const b of partBatches.values()){scene.remove(b);b.geometry.dispose();}
    partBatches.clear();scene.updateMatrixWorld(true);const frustum=new T.Frustum().setFromProjectionMatrix(new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
    const groups=new Map(),hidden=[];
    scene.traverseVisible(o=>{if(!o.isMesh||o.isInstancedMesh||!o.material||Array.isArray(o.material)||o.material.transparent||o.material.isShaderMaterial)return;
      if(!frustum.intersectsObject(o)){hidden.push(o);return;}if(o.material.map&&o.geometry.type==='PlaneGeometry'&&!o.userData.keepGround&&o.getWorldPosition(new T.Vector3()).distanceTo(camera.position)>110){hidden.push(o);return;}const m=o.material,key=[m.type,m.map?.uuid||'',m.roughness,m.metalness,m.emissive?.getHex(),Math.round((m.emissiveIntensity||0)*10),m.side].join(':');let mat=batchMaterials.get(key);if(!mat){mat=m.clone();mat.color?.set('#ffffff');mat.vertexColors=true;batchMaterials.set(key,mat);}let list=groups.get(mat);if(!list)groups.set(mat,list=[]);list.push({geometry:o.geometry,matrix:o.matrixWorld,tint:m.color});hidden.push(o);
    });
    for(const [mat,parts] of groups){const mesh=new T.Mesh(mergeParts(parts),mat);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);partBatches.set(mat,mesh);}
    for(const o of hidden)o.visible=false;
    return ()=>{for(const o of hidden)o.visible=true;};
  }
  function draw(){renderer.info.reset();renderer.setRenderTarget(null);renderer.autoClear=true;renderer.render(scene,camera);if(!bloom||bloomFailed||quality!=='high')return;
    try{const b=bloom,[source,a,c]=b.targets;renderer.setRenderTarget(source);renderer.render(scene,camera);quad.material=b.threshold;renderer.setRenderTarget(a);renderer.render(quadScene,quadCamera);
      quad.material=b.blur;b.blur.uniforms.source.value=a.texture;b.blur.uniforms.stepUV.value.set(1/a.width,0);renderer.setRenderTarget(c);renderer.render(quadScene,quadCamera);
      b.blur.uniforms.source.value=c.texture;b.blur.uniforms.stepUV.value.set(0,1/c.height);renderer.setRenderTarget(a);renderer.render(quadScene,quadCamera);
      renderer.setRenderTarget(null);renderer.autoClear=false;quad.material=b.composite;renderer.render(quadScene,quadCamera);
    }catch(error){bloomFailed=true;renderer.setRenderTarget(null);renderer.autoClear=true;renderer.render(scene,camera);console.warn('Bloom disabled after render failure.',error);}finally{renderer.autoClear=true;}}
  function syncVehicle(v,kind,stamp,dt,time){let g=vehicleMap.get(v.id);const type=kind||v.type||'sedan';if(g&&(g.userData.type!==type||g.userData.color!==(v.color||'#718b99'))){outdoors.remove(g);retired.push(g);vehicleMap.delete(v.id);g=null;}
    if(!g){g=buildVehicleMesh(type,v.color||'#718b99',mats);vehicleMap.set(v.id,g);outdoors.add(g);}g.userData.stamp=stamp;g.position.set(v.x,v.y||0,v.z);g.rotation.y=-(v.heading||0);
    const d=g.userData,speed=v.speed||0,steer=v.steering||0;d.body.rotation.x=clamp(-steer*speed*.004,-.07,.07);d.body.rotation.z=clamp((speed-d.lastSpeed)/Math.max(dt,.001)*-.002,-.052,.052);d.tailMaterial.emissiveIntensity=speed<d.lastSpeed-.05?2.5:.6;d.lastSpeed=speed;d.spin+=speed*dt/.36;
    for(const w of d.wheels){w.pivot.rotation.y=w.front?-steer:0;w.tire.rotation.y=-d.spin;}
    if(d.lightBar){d.lightBar[0].emissiveIntensity=Math.sin(time*14)>0?3:.1;d.lightBar[1].emissiveIntensity=Math.sin(time*14)>0?.1:3;}if(d.rotor)d.rotor.rotation.y=v.rotor??time*24;
  }
  let stamp=0;
  function syncFigure(n,kind,dt,w){let g=figures.get(n.id);if(!g){const def=kind==='cop'?policeVariation(()=>.42):kind==='enemy'?vultureVariation(()=>.42):npcVariation(()=>.42);if(n.skin)def.skin=n.skin;if(n.clothes)def.jacket=n.clothes;if(n.hair)def.hair=n.hair;if(n.height)def.height=n.height;g=buildFigure(def,mats);figures.set(n.id,g);outdoors.add(g);}g.userData.stamp=stamp;
    let x=n.x,z=n.z,heading=n.heading||0;if(kind==='cop'&&!Number.isFinite(x)){const v=w.vehicles.find(v=>v.id===n.vehicleId);if(v){x=v.x;z=v.z;heading=v.heading||0;g.visible=n.state==='roadblock'||n.state==='arrest';}else g.visible=false;}else g.visible=true;
    if(!Number.isFinite(x)||!Number.isFinite(z)){g.visible=false;return;}g.position.set(x,n.y||0,z);g.rotation.set(n.dead?Math.PI/2:0,-heading+Math.PI/2,0);animateFigure(g,g.userData.phase,n.dead?0:n.speed||0,false,dt);
  }
  const dayTop=new T.Color('#82c5ef'),dayHorizon=new T.Color('#c4dfe7'),nightTop=new T.Color('#071225'),nightHorizon=new T.Color('#263750'),duskTop=new T.Color('#4f548e'),duskHorizon=new T.Color('#eea06b'),dawnHorizon=new T.Color('#d4c5b5');
  function update(w,input={},dt=1/60){if(disposed||contextLost)return;dt=clamp(Number.isFinite(dt)?dt:1/60,.001,.1);const now=performance.now();if(lastNow){const ms=clamp(now-lastNow,1,250);frameMs+=(ms-frameMs)*.05;fps=1000/frameMs;}lastNow=now;adaptT+=dt;if(adaptT>1){adaptT=0;const next=clamp(scale+(frameMs>24?-.05:frameMs<18?.025:0),.6,1);if(next!==scale){scale=next;resize(width,hgt);}}
    const p=w.player,time=w.elapsed||0,hour=((w.hour??w.clock?.hour??(typeof w.time==='number'?w.time:w.time?.hour)??12)%24+24)%24,night=hour>=17.5||hour<6;
    const daylight=hour>=6&&hour<=19.5?clamp(Math.sin((hour-6)/13.5*Math.PI),0,1):0,twilight=Math.max(0,1-Math.abs(hour-19.3)/1.8),dawn=Math.max(0,1-Math.abs(hour-6)/1.3);
    skyUniforms.top.value.copy(nightTop).lerp(dayTop,daylight).lerp(duskTop,twilight*.7);skyUniforms.horizon.value.copy(nightHorizon).lerp(dayHorizon,daylight).lerp(duskHorizon,twilight).lerp(dawnHorizon,dawn*.8);
    const angle=(hour-6)/13.5*Math.PI;skyUniforms.sunDir.value.set(Math.cos(angle),Math.sin(angle),-.2).normalize();sky.position.copy(camera.position);scene.fog.color.copy(skyUniforms.horizon.value);renderer.setClearColor(scene.fog.color);
    sun.position.copy(skyUniforms.sunDir.value).multiplyScalar(150);sun.position.x+=p.x;sun.position.z+=p.z;sun.position.y=Math.max(25,sun.position.y+(p.y||0));sun.target.position.set(p.x,p.y||0,p.z);sun.target.updateMatrixWorld();sun.intensity=.25+1.75*daylight+1.5*twilight+(w.weather?.lightning>0?3:0);
    waterUniforms.time.value=time;waterUniforms.light.value=.35+.65*daylight;groundMat.roughness=.9-.65*(w.weather?.rain||0);groundMat.color.setScalar(1-.22*(w.weather?.rain||0));mats.asphalt.roughness=groundMat.roughness;
    for(const bulb of lamps)bulb.color.set(night?'#ffdfa0':'#756b50');for(const key of ['neonPink','neonTeal','neonYellow'])mats[key].emissiveIntensity=night?2:.35;
    for(const light of lights){const state=trafficLightAt(city,light.id,time);for(const key in light.group.userData.lamps)light.group.userData.lamps[key].emissiveIntensity=key===state?2.5:.04;}
    for(const batch of foliage){for(let i=0;i<batch.list.length;i++){const prop=batch.list[i];dummy.position.set(prop.x,0,prop.z);dummy.rotation.set(0,prop.rot||0,Math.sin(time*1.2+i)*.012);dummy.scale.setScalar(prop.scale||1);dummy.updateMatrix();batch.mesh.setMatrixAt(i,dummy.matrix);}batch.mesh.instanceMatrix.needsUpdate=true;}
    stamp++;for(const v of w.vehicles||[])syncVehicle(v,null,stamp,dt,time);for(const h of w.helis||[])syncVehicle(h,'heli',stamp,dt,time);for(const [id,g]of vehicleMap)if(g.userData.stamp!==stamp){outdoors.remove(g);retired.push(g);vehicleMap.delete(id);}
    for(const n of w.npcs||[])syncFigure(n,'npc',dt,w);for(const n of w.enemies||[])syncFigure(n,'enemy',dt,w);for(const n of w.cops||[])syncFigure(n,'cop',dt,w);for(const [id,g]of figures)if(g.userData.stamp!==stamp){outdoors.remove(g);retired.push(g);figures.delete(id);}
    player.visible=!!p.onFoot&&!p.heliId&&!p.boatId;player.position.set(p.x,p.y||0,p.z);player.rotation.y=-(p.heading||0)+Math.PI/2;animateFigure(player,player.userData.phase,p.speed||Math.hypot(p.vx||0,p.vz||0),!!input.aim,dt);
    const interior=w.flags?.interior;rooms.visible=!!interior;outdoors.visible=!interior;
    if(interior){const index=interior==='gunstore'?1:0;interiorPlayer.position.set(index*40,0,-1100);interiorKeeper.position.set(index*40,0,-1104);interiorKeeper.rotation.y=Math.PI;animateFigure(interiorPlayer,interiorPlayer.userData.phase,0,false,dt);for(let i=0;i<roomGroups.length;i++)roomGroups[i].visible=i===index;if(!shot){camera.position.set(index*40+6,4,-1093);camera.lookAt(index*40,1.3,-1102);} }
    else if(!shot){let actor=p;const id=p.vehicleId||p.boatId||p.heliId;if(id){for(const v of w.vehicles||[])if(v.id===id)actor=v;for(const v of w.helis||[])if(v.id===id)actor=v;}
      const speed=Math.abs(actor.speed||0),heading=actor.heading||0,heli=!!p.heliId,boom=heli?19:9+Math.min(3,speed*.1),swing=(actor.steering||0)*Math.min(2,speed*.05);
      target.set(actor.x,(actor.y||0)+1.5,actor.z);desired.set(actor.x-Math.cos(heading)*boom-Math.sin(heading)*swing,(actor.y||0)+(heli?9:4.5),actor.z-Math.sin(heading)*boom+Math.cos(heading)*swing);
      for(const b of buildings)if(Math.abs(desired.x-b.x)<b.w/2+1&&Math.abs(desired.z-b.z)<b.d/2+1&&desired.y<height(b)+2)desired.y=height(b)+3;
      camera.position.lerp(desired,1-Math.pow(.88,dt*60));for(const b of buildings)if(Math.abs(camera.position.x-b.x)<b.w/2+.3&&Math.abs(camera.position.z-b.z)<b.d/2+.3&&camera.position.y<height(b)+1)camera.position.y=height(b)+2;
      camera.lookAt(target);camera.fov+=(58+Math.min(16,speed*.45)-camera.fov)*.1;camera.updateProjectionMatrix();}
    detail.position.x=Math.round(camera.position.x/8)*8;detail.position.z=Math.round(camera.position.z/8)*8;
    const amount=clamp(w.weather?.rain||0,0,1);rain.visible=amount>0&&!interior;rain.count=Math.floor(1200*amount);rainMat.opacity=.15+.3*amount;
    if(rain.visible){for(let i=0;i<rain.count;i++){dummy.position.set(camera.position.x+rainSeed[i*3],camera.position.y+((rainSeed[i*3+1]-time*22)%35+35)%35-8,camera.position.z+rainSeed[i*3+2]);dummy.rotation.set(0,0,-.15);dummy.scale.set(1,1,1);dummy.updateMatrix();rain.setMatrixAt(i,dummy.matrix);}rain.instanceMatrix.needsUpdate=true;}
    const sparks=(w.particles||[]).filter(p=>p.kind==='muzzle').slice(0,512);flashes.count=sparks.length;for(let i=0;i<sparks.length;i++){const p=sparks[i];dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(.32);dummy.updateMatrix();flashes.setMatrixAt(i,dummy.matrix);}flashes.instanceMatrix.needsUpdate=true;
    camera.updateMatrixWorld();const restore=batchParts();draw();restore();
  }
  const onLost=e=>{e.preventDefault();contextLost=true;};const onRestored=()=>{contextLost=false;lastNow=0;resize(width,hgt);};canvas.addEventListener?.('webglcontextlost',onLost);canvas.addEventListener?.('webglcontextrestored',onRestored);
  const shotHelpers={projectToNDC(x,y,z){camera.updateMatrixWorld();projection.set(x,y,z).project(camera);return {x:projection.x,y:projection.y,inside:projection.z>=-1&&projection.z<=1&&Math.abs(projection.x)<=1&&Math.abs(projection.y)<=1};},setShotCamera(pos,lookAt,fov=58){shot=true;camera.position.set(pos.x??pos[0],pos.y??pos[1],pos.z??pos[2]);target.set(lookAt.x??lookAt[0],lookAt.y??lookAt[1],lookAt.z??lookAt[2]);camera.fov=fov;camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();}};
  function dispose(){if(disposed)return;disposed=true;canvas.removeEventListener?.('webglcontextlost',onLost);canvas.removeEventListener?.('webglcontextrestored',onRestored);const geometries=new Set(),materials=new Set(),textures=new Set();const collect=o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const mat of Array.isArray(o.material)?o.material:[o.material])materials.add(mat);if(o.isInstancedMesh)o.dispose();};scene.traverse(collect);for(const g of retired)g.traverse(collect);quadScene.traverse(collect);if(bloom){for(const rt of bloom.targets)rt.dispose();materials.add(bloom.threshold);materials.add(bloom.blur);materials.add(bloom.composite);}for(const mat of materials){for(const key of ['map','normalMap','roughnessMap'])if(mat[key])textures.add(mat[key]);mat.dispose();}for(const t of textures)t.dispose();for(const g of geometries)g.dispose();renderer.dispose();vehicleMap.clear();figures.clear();}
  camera.position.set(initialWorld.player.x-9,5,initialWorld.player.z);resize(width,hgt);
  return {renderer,scene,camera,update,resize,setQuality,stats:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,fps,resolutionScale:scale}),dispose,shotHelpers};
}
