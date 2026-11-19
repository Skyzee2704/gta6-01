// Browser resources are created lazily: simulation imports remain safe in Node.
const THREE = typeof window === 'undefined' ? null : window.THREE;
function ready() {
  if (!THREE) throw new Error('THREE is required: load the three.js UMD script before creating materials.');
  if (typeof document === 'undefined') throw new Error('THREE textures require a browser canvas.');
}
export function makeCanvasTexture(w, h, draw) {
  ready();
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('THREE textures require a working 2D canvas context.');
  draw(ctx, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4; texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function surface(base, pattern = 'noise', size = 128) {
  return makeCanvasTexture(size, size, (c, w, h) => {
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    // Fixed integer sequence makes surface grain stable across reloads.
    let seed = 7183;
    const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 1700; i++) {
      c.fillStyle = i % 2 ? 'rgba(255,255,255,.065)' : 'rgba(0,0,0,.09)';
      c.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1);
    }
    if (pattern === 'brick') {
      c.strokeStyle = 'rgba(224,214,193,.65)'; c.lineWidth = 2;
      for (let y = 0; y <= h; y += 16) {
        c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
        for (let x = (y / 16 % 2) * 16; x < w; x += 32) {
          c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 16); c.stroke();
        }
      }
    }
    if (pattern === 'wood') {
      c.strokeStyle = '#493321'; c.lineWidth = 2;
      for (let y = 0; y < h; y += 24) { c.beginPath(); c.moveTo(0,y); c.lineTo(w,y); c.stroke(); }
      c.strokeStyle = 'rgba(40,20,8,.22)'; c.lineWidth = 1;
      for (let y = 4; y < h; y += 5) { c.beginPath(); c.moveTo(0,y); c.bezierCurveTo(40,y-3,80,y+3,w,y); c.stroke(); }
    }
  });
}
let shared;
export function createMaterials() {
  ready(); if (shared) return shared;
  const specs = {
    asphalt:['#34383b',.9], concrete:['#b8b6ac',.92], brickRed:['#a75c49',.85,'brick'],
    brickPainted:['#dfcba3',.85,'brick'], glassDark:['#263e4c',.15], glassLit:['#ffe2a0',.35],
    metal:['#8a9194',.4], wood:['#805c3a',.88,'wood'], sand:['#e2ce9b',1], grass:['#66834b',1],
    roofTerracotta:['#b95735',.85], roofDark:['#353b40',.9], roadMarking:['#fff3cd',.85],
    waterMat:['#238ca8',.15], foliageGreen:['#3c733c',1], foliagePalm:['#659044',1],
    trunkBrown:['#78573c',1,'wood'], neonPink:['#ff499b',.35], neonTeal:['#38ffe2',.35],
    neonYellow:['#ffe86a',.35], tireBlack:['#202124',1], chrome:['#d2dce0',.16]
  };
  shared = {};
  for (const [name, [base, roughness, pattern]] of Object.entries(specs)) {
    const options = {color:0xffffff, map:surface(base,pattern), roughness, metalness:0};
    if (name === 'glassDark') Object.assign(options,{metalness:.9,envMapIntensity:1.2});
    if (name === 'metal' || name === 'chrome') options.metalness = name === 'metal' ? .8 : 1;
    if (name.startsWith('neon') || name === 'glassLit') Object.assign(options,{emissive:base,emissiveIntensity:name === 'glassLit' ? .7 : 2});
    if (name === 'waterMat') Object.assign(options,{transparent:true,opacity:.85,depthWrite:false});
    if (name.startsWith('foliage')) Object.assign(options,{flatShading:true,side:THREE.DoubleSide});
    shared[name] = new THREE.MeshStandardMaterial(options);
  }
  return shared;
}
export function facadeMaterial(facadeId, color = '#ffffff') {
  const mats = createMaterials();
  const id = String(facadeId).toLowerCase();
  const key = id.includes('glass') ? 'glassDark' : id.includes('metal') ? 'metal' : id.includes('wood') ? 'wood' : id.includes('paint') ? 'brickPainted' : id.includes('brick') ? 'brickRed' : 'concrete';
  const mat = mats[key].clone(); mat.color.set(color); return mat;
}
export function createDetailTexture() { return surface('#929184', 'noise', 256); }
export function createGroundTexture(city) {
  ready();
  const texture = makeCanvasTexture(2048,2048,(c,w,h) => {
    // Canvas top is north (-Z). PlaneGeometry rotated -PI/2 maps this to world north.
    const sx=w/640, sz=h/480;
    c.scale(sx,sz); c.translate(320,240);
    const rect=(x0,z0,x1,z1,color)=>{c.fillStyle=color;c.fillRect(x0,z0,x1-x0,z1-z0);};
    rect(-320,-240,320,240,'#83916b');
    const beach=city.beach || {x0:-320,x1:320,z0:200,z1:240};
    rect(beach.x0,beach.z0,beach.x1,beach.z1,'#dfcf9e');
    rect(-320,city.waterLineZ ?? 240,320,240,'#25859d');
    for(const p of city.parks || []) rect(p.x0,p.z0,p.x1,p.z1,'#4b824c');
    const stroke=(r,width,color,dash=[])=>{
      c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.beginPath();c.moveTo(r.x0,r.z0);c.lineTo(r.x1,r.z1);c.stroke();c.setLineDash([]);
    };
    const roads=city.roads || [];
    for(const r of roads) stroke(r,24,'#b5b5ac');
    for(const r of roads) stroke(r,16,'#383c3e');
    for(const r of roads) {
      stroke(r,.45,'#e2c966',[3,3]);
      const dx=r.x1-r.x0,dz=r.z1-r.z0,len=Math.hypot(dx,dz)||1;
      for(const sign of [-1,1]) {
        const ox=-dz/len*7*sign,oz=dx/len*7*sign;
        stroke({x0:r.x0+ox,z0:r.z0+oz,x1:r.x1+ox,z1:r.z1+oz},.32,'#e6e5d8');
      }
    }
    // Only crossings of finite road segments receive pedestrian markings.
    for(const a of roads.filter(r=>r.horizontal)) for(const b of roads.filter(r=>!r.horizontal)) {
      const x=b.x0,z=a.z0;
      if(x<Math.min(a.x0,a.x1)||x>Math.max(a.x0,a.x1)||z<Math.min(b.z0,b.z1)||z>Math.max(b.z0,b.z1)) continue;
      rect(x-8,z-8,x+8,z+8,'#383c3e');
      for(let i=-6;i<7;i+=2) for(const side of [-1,1]) {
        rect(x+i,z+side*10-1.5,x+i+1,z+side*10+1.5,'#f0ecdc');
        rect(x+side*10-1.5,z+i,x+side*10+1.5,z+i+1,'#f0ecdc');
      }
    }
    for(const b of city.buildings || []) {
      const district=city.districts?.find(d=>d.id===b.district);
      rect(b.x-b.w/2,b.z-b.d/2,b.x+b.w/2,b.z+b.d/2,b.baseColor || district?.palette?.[0] || '#b5a68e');
    }
    for(const l of city.landmarks || []) {c.fillStyle='#f5d378';c.beginPath();c.arc(l.x,l.z,1.5,0,Math.PI*2);c.fill();}
  });
  texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
  return {texture,canvas:texture.image};
}
