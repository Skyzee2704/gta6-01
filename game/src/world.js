import { CONFIG } from './config.js';
import { mulberry32, randomPick, clamp } from './random.js';
import { VEHICLE_TYPES, RESPECT_LEVELS } from './data.js';

const systems = new Map();
export function registerSystem(name, stepFn) {
  if (typeof stepFn !== 'function') throw new TypeError('A system must be a function.');
  systems.set(name, stepFn);
}
// Held actions are booleans; mouseDX/mouseDY are numeric deltas.
// pressed maps action names to booleans that last for exactly one step.
export function blankInput() {
  return {forward:false,back:false,left:false,right:false,run:false,jump:false,
    enter:false,shoot:false,reload:false,interact:false,handbrake:false,horn:false,
    weaponNext:false,weaponPrev:false,pause:false,map:false,view2d:false,
    mouseDX:0,mouseDY:0,pressed:{}};
}
export function createWorld(seed) {
  return {seed,rng:mulberry32(seed),time:CONFIG.START_HOUR,day:1,elapsed:0,money:250,
    respect:0,respectLevel:1,wanted:0,heat:0,escapeTimer:0,searchZone:null,
    player:{x:0,z:0,y:0,vx:0,vz:0,vy:0,heading:0,health:100,armor:0,onFoot:true,
      vehicleId:null,weapon:'pistol',ammo:{pistol:{mag:12,reserve:48}},speed:0,
      jumping:false,aiming:false,dead:false,busted:false},
    vehicles:[],npcs:[],cops:[],enemies:[],traffic:[],particles:[],projectiles:[],pickups:[],
    weather:{kind:'clear',t:0,duration:90,rain:0,lightning:0},
    mission:{index:0,active:null,completed:[],unlocked:1,results:null},
    stats:{shots:0,hits:0,kills:0,crashes:0,topSpeed:0,time:0,missionsDone:0,escapes:0},
    garage:{safehouse:[],penthouse:[]},properties:{safehouse:true,penthouse:false},
    flags:{taxi:null,race:null,interior:null,interiorCooldown:0},notices:[],
    dialogue:{queue:[],current:null,charT:0},events:[],city:null};
}

export function attachCity(world, city) {
  world.city=city;
  Object.assign(world.player,city.spawn.player,{y:0,vx:0,vz:0,vy:0});
  world.vehicles=[]; world.npcs=[]; world.traffic=[];
  const cars=VEHICLE_TYPES.filter(v=>v.kind==='car' && v.id!=='cruiser');
  for(let i=0;i<CONFIG.MAX_TRAFFIC;i++) {
    const road=randomPick(world.rng,city.roads), t=0.05+world.rng()*0.9;
    const type=randomPick(world.rng,cars), side=i%2?1:-1;
    const x=road.x0+(road.x1-road.x0)*t+(road.horizontal?0:side*6);
    const z=road.z0+(road.z1-road.z0)*t+(road.horizontal?side*6:0);
    world.vehicles.push({id:`parked-${i}`,type:type.id,kind:type.kind,x,z,y:0,
      vx:0,vz:0,vy:0,speed:0,heading:road.horizontal?Math.PI/2:0,
      health:100,color:randomPick(world.rng,type.colors),parked:true,occupied:false,
      driver:null,stealable:type.stealable});
  }
  for(let i=0;i<CONFIG.MAX_NPCS;i++) {
    const road=randomPick(world.rng,city.roads),t=0.05+world.rng()*0.9,offset=(i%2?1:-1)*(CONFIG.ROAD_W/2+2);
    world.npcs.push({id:`pedestrian-${i}`,x:road.x0+(road.x1-road.x0)*t+(road.horizontal?0:offset),
      z:road.z0+(road.z1-road.z0)*t+(road.horizontal?offset:0),y:0,
      vx:0,vz:0,heading:world.rng()*Math.PI*2,health:100,dead:false,
      state:'walk',speed:1.2+world.rng()*0.6});
  }
  world.pickups=world.pickups.filter(p=>p.kind!=='postcard');
  for(const p of city.postcards) world.pickups.push({...p,kind:'postcard',collected:false});
}

export function stepWorld(world, input, dt) {
  if (!Number.isFinite(dt) || dt < 0) throw new RangeError('Step duration must be finite and nonnegative.');
  world.elapsed+=dt; world.stats.time+=dt;
  world.time+=dt*CONFIG.MINUTES_PER_SECOND/60;
  const days=Math.floor(world.time/24); world.time-=days*24; world.day+=days;
  for(const step of systems.values()) step(world,input,dt);
  for(const key of ['particles','projectiles']) {
    const list=world[key]; let write=0;
    for(const p of list) {
      p.x+=(p.vx||0)*dt; p.y=(p.y||0)+(p.vy||0)*dt; p.z+=(p.vz||0)*dt;
      if (p.gravity) p.vy=(p.vy||0)-p.gravity*dt;
      p.life-=dt;
      if(p.life>0 && !p.dead) list[write++]=p;
    }
    list.length=write;
  }
  for(const notice of world.notices) notice.age+=dt;
  world.notices=world.notices.filter(n=>n.age<4);
  if(systems.has('dialogue')) return;
  const dialogue=world.dialogue;
  if(!dialogue.current && dialogue.queue.length) {
    dialogue.current=dialogue.queue.shift(); dialogue.charT=0;
  }
  if(dialogue.current) {
    dialogue.charT+=dt;
    dialogue.current.visibleChars=Math.min(dialogue.current.text.length,Math.floor(dialogue.charT*35));
    if(dialogue.charT>dialogue.current.text.length/35+3) {
      dialogue.current=null; dialogue.charT=0;
    }
  }
}
export function addNotice(world, text) {
  world.notices.push({text:String(text),age:0});
  if(world.notices.length>3) world.notices.splice(0,world.notices.length-3);
}
export function say(world, speakerId, text) {world.dialogue.queue.push({speakerId,text:String(text)});}
export function pushEvent(world, kind, data={}) {world.events.push({kind,...data});}
export function addHeat(world, amount, crime) {
  world.heat=clamp(world.heat+amount,0,5.99); world.wanted=Math.min(5,Math.floor(world.heat));
  pushEvent(world,'crime',{crime,amount,wanted:world.wanted});
}
export function clearWanted(world, reason) {
  world.wanted=0;world.heat=0;world.escapeTimer=0;world.searchZone=null;
  pushEvent(world,'wanted-cleared',{reason});
}
export function addMoney(world, n) {world.money+=n;}
export function addRespect(world, n) {
  world.respect=Math.max(0,world.respect+n);
  world.respectLevel=RESPECT_LEVELS.reduce((level,r)=>world.respect>=r.at?Math.max(level,r.level):level,1);
}
export function damagePlayer(world, dmg, from) {
  const p=world.player;
  if(p.dead || dmg<=0) return;
  const absorbed=Math.min(p.armor,dmg*CONFIG.ARMOR_ABSORB);
  p.armor-=absorbed;p.health=Math.max(0,p.health-(dmg-absorbed));
  pushEvent(world,'player-damaged',{damage:dmg-absorbed,from});
  if(p.health===0) {p.dead=true;pushEvent(world,'player-dead',{from});}
}
export function spawnParticle(world, p) {
  const particle={x:0,y:0,z:0,vx:0,vy:0,vz:0,life:1,...p};
  world.particles.push(particle);return particle;
}
export function spawnParticles(world, x,y,z,kind,n) {
  for(let i=0;i<n;i++) {
    const angle=world.rng()*Math.PI*2,speed=1+world.rng()*4;
    spawnParticle(world,{x,y,z,kind,vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed,
      vy:1+world.rng()*3,gravity:5,life:0.3+world.rng()*0.8});
  }
}
export function pointInBuilding(city, x, z) {
  return !!city?.buildings.some(b=>x>=b.x-b.w/2 && x<=b.x+b.w/2 && z>=b.z-b.d/2 && z<=b.z+b.d/2);
}
export function collideCircle(world, x, z, r) {
  if(!world.city) return {x,z};
  // Revisit neighboring footprints after each push to resolve corners and alleys.
  for(let pass=0;pass<16;pass++) {
    let moved=false;
    for(const b of world.city.buildings) {
      const x0=b.x-b.w/2,x1=b.x+b.w/2,z0=b.z-b.d/2,z1=b.z+b.d/2;
      const qx=clamp(x,x0,x1),qz=clamp(z,z0,z1),dx=x-qx,dz=z-qz,d2=dx*dx+dz*dz;
      if(d2>=r*r && !(x>x0 && x<x1 && z>z0 && z<z1)) continue;
      if(d2>0) {
        const distance=Math.sqrt(d2),push=r-distance+1e-6;
        x+=dx/distance*push; z+=dz/distance*push;
      } else {
        const exits=[{d:x-x0,axis:'x',value:x0-r-1e-6},{d:x1-x,axis:'x',value:x1+r+1e-6},
          {d:z-z0,axis:'z',value:z0-r-1e-6},{d:z1-z,axis:'z',value:z1+r+1e-6}];
        exits.sort((a,b)=>a.d-b.d);
        if(exits[0].axis==='x') x=exits[0].value; else z=exits[0].value;
      }
      moved=true;
    }
    if(!moved) break;
  }
  return {x,z};
}

// Walking belongs to the simulation so browser and headless inputs behave alike.
registerSystem('player', (w, input, dt) => {
  const p=w.player;
  if(!p.onFoot||p.dead||p.busted||w.flags.interior)return;
  p.heading+=(Number(!!input.right)-Number(!!input.left))*2.8*dt;
  const speed=(Number(!!input.forward)-Number(!!input.back))*(input.run?CONFIG.PLAYER_RUN_SPEED:CONFIG.PLAYER_WALK_SPEED);
  const q=collideCircle(w,p.x+Math.cos(p.heading)*speed*dt,p.z+Math.sin(p.heading)*speed*dt,.45);
  if(!w.city||q.z<=w.city.waterLineZ){p.x=q.x;p.z=q.z;}
  p.vx=Math.cos(p.heading)*speed;p.vz=Math.sin(p.heading)*speed;p.speed=speed;
  if(input.pressed?.jump&&!p.jumping){p.vy=CONFIG.JUMP_VELOCITY;p.jumping=true;}
  if(p.jumping){p.vy-=CONFIG.GRAVITY*dt;p.y+=p.vy*dt;if(p.y<=0){p.y=0;p.vy=0;p.jumping=false;}}
});
