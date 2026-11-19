import { CONFIG } from './config.js';
import { mulberry32, randomPick, randomInt, clamp } from './random.js';
import { DISTRICTS, STREET_NAMES, RACE_ROUTES, STREET_FURNITURE, LAMP_TYPES } from './data.js';
import { generateBuildingsForBlock } from './buildings.js';

export function districtAt(city, x, z) {
  return city.districts.find(d => x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1)?.id || 'marina';
}
export const pointInWater = (city, x, z) => z > city.waterLineZ;
export const beachSDF = (city, x, z) => city.waterLineZ - z;
export function nearestNode(city, x, z) {
  return city.graph.reduce((best, n) => !best || (n.x-x)**2 + (n.z-z)**2 < (best.x-x)**2 + (best.z-z)**2 ? n : best, null);
}
export function nearestRoadPoint(city, x, z) {
  let best = null, distance = Infinity;
  for (const road of city.roads) {
    const px = clamp(x, road.x0, road.x1), pz = clamp(z, road.z0, road.z1);
    const d = (px-x)**2 + (pz-z)**2;
    if (d < distance) { distance = d; best = { x: px, z: pz, road }; }
  }
  return best;
}
export function randomRoadPoint(rng, city) {
  const road = randomPick(rng, city.roads), t = rng();
  return { x: road.x0 + (road.x1-road.x0)*t, z: road.z0 + (road.z1-road.z0)*t, road };
}
export function isOnRoad(city, x, z) {
  const p = nearestRoadPoint(city, x, z);
  return !!p && (p.x-x)**2 + (p.z-z)**2 <= (CONFIG.ROAD_W/2)**2;
}
function connected(nodes) {
  const seen = new Set([0]), queue = [0];
  for (let i = 0; i < queue.length; i++) for (const id of nodes[queue[i]].edges) {
    if (!seen.has(id)) { seen.add(id); queue.push(id); }
  }
  return seen.size === nodes.length;
}

export function generateCity(seed) {
  const rng = mulberry32(seed);
  const halfW = CONFIG.WORLD_W/2, halfH = CONFIG.WORLD_H/2;
  // Rectangles tile the land, including shared district boundaries.
  const bounds = {
    marina: [-halfW, 130, halfW, halfH],
    'old-solmar': [-halfW, -65, -80, 130],
    'neon-mile': [-80, -65, 160, 130],
    'harbor-docks': [160, -halfH, halfW, 130],
    'palm-heights': [-halfW, -halfH, -80, -65],
    downtown: [-80, -halfH, 160, -65],
  };
  const districts = DISTRICTS.map(d => {
    const [x0,z0,x1,z1] = bounds[d.id];
    return { ...d, x0,z0,x1,z1 };
  });
  const city = { seed, districts, roads: [], intersections: [], graph: [], blocks: [], buildings: [],
    landmarks: [], parks: [], beach: { x0:-halfW, x1:halfW, z0:200, z1:240 }, waterLineZ:240,
    spawn: {}, raceRoutes: [], postcards: [], props: [], helpers: {} };
  const xs = Array.from({length:9}, (_,i) => -halfW + 12 + i*(CONFIG.WORLD_W-24)/8);
  const zs = Array.from({length:7}, (_,i) => -halfH + 16 + i*(200+halfH-32)/6);
  function road(x0,z0,x1,z1,horizontal,index) {
    city.roads.push({ id:city.roads.length, name:STREET_NAMES[index%STREET_NAMES.length],
      x0,z0,x1,z1,horizontal,district:districtAt(city,(x0+x1)/2,(z0+z1)/2) });
  }
  zs.forEach((z,i) => road(xs[0],z,xs[8],z,true,i));
  xs.forEach((x,i) => road(x,zs[0],x,zs[6],false,i+7));
  for (let attempt = 0; attempt < 50; attempt++) {
    const nodes = [];
    const node = (x,z) => { const n = {id:nodes.length,x,z,edges:[]}; nodes.push(n); return n.id; };
    const link = (a,b) => { nodes[a].edges.push(b); nodes[b].edges.push(a); };
    const grid = zs.map(z => xs.map(x => node(x,z)));
    city.intersections = nodes.map(n => ({id:n.id,x:n.x,z:n.z}));
    for (let j=0;j<7;j++) for (let i=0;i<9;i++) {
      if (i<8) { const m=node((xs[i]+xs[i+1])/2,zs[j]); link(grid[j][i],m); link(m,grid[j][i+1]); }
      if (j<6) { const m=node(xs[i],(zs[j]+zs[j+1])/2); link(grid[j][i],m); link(m,grid[j+1][i]); }
    }
    if (connected(nodes)) { city.graph=nodes; break; }
  }
  if (!city.graph.length) throw new Error('Road graph could not be connected.');
  const inset = CONFIG.ROAD_W/2 + CONFIG.SIDEWALK_W;
  for (let j=0;j<6;j++) for (let i=0;i<8;i++) {
    const block = {id:city.blocks.length,x0:xs[i]+inset,z0:zs[j]+inset,x1:xs[i+1]-inset,z1:zs[j+1]-inset};
    block.district = districtAt(city,(block.x0+block.x1)/2,(block.z0+block.z1)/2);
    city.blocks.push(block);
  }
  // Reserve portions of three blocks as public green space.
  for (const [index,size] of [[19,18],[8,10],[38,10]]) {
    const b=city.blocks[index];
    city.parks.push({id:`park-${index}`,x0:b.x0,z0:b.z0,x1:b.x1,z1:b.z0+size,district:b.district});
    b.z0 += size+2;
  }
  for (const b of city.blocks) city.buildings.push(...generateBuildingsForBlock(rng,b,districts.find(d=>d.id===b.district)));
  const specs = [
    ['wooden-pier','Wooden Pier','pier',-154,224], ['lighthouse','Lighthouse','lighthouse',-280,220],
    ['neon-arch','Neon Arch','arch',0,116], ['harbor-crane','Harbor Crane','crane',270,116],
    ['hill-viewpoint','Hill Viewpoint','viewpoint',-230,-224], ['glass-towers','Glass Towers','towers',77,-190],
    ['rosas-diner',"Rosa's Diner",'diner',-231,48], ['rosa-garage',"Rosa's Garage",'garage',-154,48],
    ['harbor-arms','Harbor Arms','gunstore',231,48], ['safehouse','Safehouse','safehouse',-231,-20],
    ['penthouse','Palm Heights Penthouse','penthouse',-154,-156], ['paynspray','Pay n Spray','respray',-77,48],
    ['helipad-downtown','Downtown Helipad','helipad',77,-156], ['helipad-harbor','Harbor Helipad','helipad',231,-88],
  ];
  city.landmarks=specs.map(([id,name,kind,x,z])=>({id,name,kind,x,z}));
  const location = id => {const l=city.landmarks.find(l=>l.id===id); return {x:l.x,z:l.z};};
  city.spawn={player:{x:-147,z:48},garage:location('rosa-garage'),pier:location('wooden-pier'),
    diner:location('rosas-diner'),gunstore:location('harbor-arms'),respray:location('paynspray'),
    safehouse:location('safehouse'),penthouse:location('penthouse'),
    helipads:[location('helipad-downtown'),location('helipad-harbor')],marina:{x:-77,z:192}};
  // Perimeter walks give each race an ordered, drivable sequence.
  city.raceRoutes=RACE_ROUTES.map((r,k)=>{
    const row=[5,3,1][k], col=[0,2,5][k];
    const loop=[[col,row],[col+1,row],[col+2,row],[col+2,row-1],[col+2,row-2],
      [col+1,row-2],[col,row-2],[col,row-1],[col,row],[col+1,row]];
    return {...r,checkpoints:loop.slice(0,r.checkpoints).map(([i,j])=>({x:xs[i],z:zs[j],nodeId:j*9+i}))};
  });
  for(let i=0;i<CONFIG.POSTCARD_COUNT;i++) {
    const district=districts[i%districts.length];
    const choices=city.intersections.filter(p=>districtAt(city,p.x,p.z)===district.id);
    const p=i<city.landmarks.length ? city.landmarks[i] : randomPick(rng,choices);
    city.postcards.push({id:`postcard-${i+1}`,x:p.x,z:p.z,y:0.7,district:districtAt(city,p.x,p.z)});
  }
  function sidewalk(i) {
    const road=city.roads[i%city.roads.length], t=0.03+rng()*0.94;
    const offset=(CONFIG.ROAD_W/2+2)*(i%2?1:-1);
    const x=road.x0+(road.x1-road.x0)*t+(road.horizontal?0:offset);
    const z=road.z0+(road.z1-road.z0)*t+(road.horizontal?offset:0);
    return {x,z,district:districtAt(city,x,z),rot:road.horizontal?0:Math.PI/2,scale:0.85+rng()*0.3};
  }
  for(let i=0;i<120;i++) {
    const p=sidewalk(i); const kind=p.district==='marina'?'palm':p.district==='palm-heights'?(i%3?'palm':'pine'):p.district==='harbor-docks'?'pine':'oak';
    city.props.push({kind,...p});
  }
  for(let i=0;i<90;i++) {
    const p=sidewalk(i); const type=LAMP_TYPES.find(l=>l.districts.includes(p.district))?.id || 'modern';
    city.props.push({kind:'lamp',type,...p});
  }
  for(let i=0;i<80;i++) {
    const p=sidewalk(i), options=STREET_FURNITURE.filter(f=>f.districts.includes(p.district));
    let weight=rng()*options.reduce((sum,f)=>sum+f.density,0), chosen=options[0];
    for(const f of options) { weight-=f.density; if(weight<=0) {chosen=f;break;} }
    city.props.push({kind:chosen.kind,...p});
  }
  city.helpers={gridX:xs,gridZ:zs,roadWidth:CONFIG.ROAD_W,sidewalkWidth:CONFIG.SIDEWALK_W,graphConnected:true};
  return city;
}
