import { CONFIG } from './config.js';
import { VEHICLE_TYPES } from './data.js';
import { clamp } from './random.js';
import { pointInWater } from './city.js';
import { registerSystem, addNotice, addHeat, pushEvent, damagePlayer, spawnParticles, collideCircle } from './world.js';
let counter = 0;
const definition = v => VEHICLE_TYPES.find(t => t.id === v.type) || VEHICLE_TYPES[0];
export const vehicleForward = v => ({x:Math.cos(v.heading), z:Math.sin(v.heading)});
export function spawnVehicle(world, typeId, x, z, heading, opts = {}) {
  const type = VEHICLE_TYPES.find(t => t.id === typeId);
  if (!type) throw new RangeError(`Unknown vehicle type: ${typeId}`);
  const v = {id:`v${world.vehicles.length+1}_${++counter}`,type:typeId,kind:type.kind,x,z,y:0,heading,
    speed:0,steering:0,health:100,owned:false,color:type.colors[Math.floor(world.rng()*type.colors.length)],
    driver:null,parked:false,locked:false,smoke:false,...opts};
  world.vehicles.push(v); return v;
}
export function nearestVehicle(world, x, z, maxDist = Infinity) {
  let best = null, d = maxDist*maxDist;
  for (const v of world.vehicles) {const n=(x-v.x)**2+(z-v.z)**2; if(n<=d){best=v;d=n;}}
  return best;
}
export function enterVehicle(world, v) {
  if (!v || !world.player.onFoot) return false;
  if (v.locked) {addNotice(world,'That car is locked.');return false;}
  if (v.type==='bus' && !v.owned) {addNotice(world,"Bus locked. Can't steal it.");return false;}
  v.driver='player';v.parked=false;world.traffic=world.traffic.filter(t=>t.vehicleId!==v.id);
  Object.assign(world.player,{onFoot:false,vehicleId:v.id,x:v.x,z:v.z,heading:v.heading,speed:v.speed});return true;
}
export function exitVehicle(world) {
  const p=world.player,v=world.vehicles.find(v=>v.id===p.vehicleId);
  if(v){
    let pos=null;
    for(const side of [1,-1]) {const x=v.x-Math.sin(v.heading)*3*side,z=v.z+Math.cos(v.heading)*3*side;
      const q=collideCircle(world,x,z,0.45);if(!pointInWater(world.city,q.x,q.z)){pos=q;break;}}
    Object.assign(p,pos||{x:v.x,z:Math.min(v.z,world.city.waterLineZ-1)});v.driver=null;
  }
  p.onFoot=true;p.vehicleId=null;p.speed=0;
}
export function stealVehicle(world,v) {
  if(!v) return false;
  const theft=!v.owned, witnessed=!!v.driver || world.npcs.some(n=>!n.dead && Math.hypot(n.x-v.x,n.z-v.z)<25);
  if(!enterVehicle(world,v)) return false;
  if(theft){if(witnessed)addHeat(world,1,'theft');pushEvent(world,'theft',{x:v.x,z:v.z,vehicleId:v.id});addNotice(world,'You stole the car.');}
  return true;
}
export function damageVehicle(world,v,dmg,cause='collision') {
  if(!world.vehicles.includes(v) || dmg<=0)return;
  v.health=Math.max(0,v.health-dmg);v.smoke=v.health<50;
  if(v.health>0)return;
  const occupied=world.player.vehicleId===v.id;
  spawnParticles(world,v.x,1,v.z,'fire',12);spawnParticles(world,v.x,1,v.z,'smoke',12);
  pushEvent(world,'explosion',{x:v.x,z:v.z,cause,vehicleId:v.id});
  if(occupied){damagePlayer(world,40,'explosion');exitVehicle(world);}
  if(occupied||v.owned)addNotice(world,'Your car exploded!');
  world.vehicles=world.vehicles.filter(o=>o!==v);
}
export function stepVehicles(world,input,dt) {
  if(!world.city)return;
  const p=world.player;
  if(input.pressed?.enter){if(p.onFoot)stealVehicle(world,nearestVehicle(world,p.x,p.z,5));else exitVehicle(world);}
  const v=world.vehicles.find(v=>v.id===p.vehicleId && v.driver==='player');
  if(v){
    const speed=Math.abs(v.speed), turn=Number(!!input.right)-Number(!!input.left);
    v.speed+=(Number(!!input.forward)-Number(!!input.back))*CONFIG.CAR_ACCEL*dt;
    if(!input.forward&&!input.back)v.speed*=Math.exp(-0.55*dt);
    v.steering=turn*0.55/(1+speed*0.04);
    if(input.handbrake){v.speed*=Math.exp(-2.4*dt);v.steering*=2;world.stats.driftTime=(world.stats.driftTime||0)+(speed>4?dt:0);
      v.driftSmokeT=(v.driftSmokeT||0)+dt;if(speed>4&&v.driftSmokeT>0.1){spawnParticles(world,v.x,0.2,v.z,'smoke',2);v.driftSmokeT=0;}}
    v.speed=clamp(v.speed,-CONFIG.CAR_REVERSE_SPEED,definition(v).topSpeed);
    v.heading+=v.steering*v.speed*dt*0.9;
    const x=v.x+Math.cos(v.heading)*v.speed*dt,z=v.z+Math.sin(v.heading)*v.speed*dt;
    const q=collideCircle(world,x,z,1.1);v.x=q.x;v.z=q.z;
    let hit=Math.hypot(q.x-x,q.z-z)>0.001;
    for(const other of world.vehicles){if(other===v)continue;const dx=v.x-other.x,dz=v.z-other.z,d=Math.hypot(dx,dz);
      if(d<3){hit=true;const nx=d?dx/d:-Math.cos(v.heading),nz=d?dz/d:-Math.sin(v.heading);v.x=other.x+nx*3;v.z=other.z+nz*3;
        if(speed>8&&other.driver==='traffic'){other.driver=null;other.parked=false;world.traffic=world.traffic.filter(t=>t.vehicleId!==other.id);damageVehicle(world,other,8,'ram');}}}
    if(hit){if(speed>8){world.stats.crashes++;damageVehicle(world,v,clamp(speed*0.5,8,20),'crash');pushEvent(world,'camera-shake',{strength:speed/30});pushEvent(world,'thud',{x:v.x,z:v.z});}v.speed*=0.25;}
    if(p.vehicleId===v.id)Object.assign(p,{x:v.x,z:v.z,heading:v.heading,speed:v.speed});
    world.stats.topSpeed=Math.max(world.stats.topSpeed,Math.abs(v.speed));
  }else if(!p.onFoot){exitVehicle(world);}
  for(const car of [...world.vehicles])if(pointInWater(world.city,car.x,car.z)){
    spawnParticles(world,car.x,0,car.z,'splash',12);if(p.vehicleId===car.id)exitVehicle(world);
    world.vehicles=world.vehicles.filter(o=>o!==car);world.traffic=world.traffic.filter(t=>t.vehicleId!==car.id);
  }
  if(p.onFoot)p.speed=0;
}
registerSystem('vehicles',stepVehicles);
