import { CONFIG } from './config.js';
import { VEHICLE_TYPES } from './data.js';
import { clamp } from './random.js';
import { nearestNode } from './city.js';
import { spawnVehicle, damageVehicle } from './vehicles.js';
import { registerSystem, clearWanted, addNotice, pushEvent, collideCircle } from './world.js';
let serial=0;
const pick=(w,a)=>a[Math.floor(w.rng()*a.length)];
export function setWantedLevel(w,level){w.wanted=clamp(Math.floor(level),0,5);w.heat=w.wanted;w.escapeTimer=0;
  w.searchZone=w.wanted?{x:w.player.x,z:w.player.z,radius:240+w.wanted*85}:null;}
export function spawnCop(w,x,z){const v=spawnVehicle(w,'cruiser',x,z,0,{driver:'cop'});
  const c={id:`cop-${++serial}`,vehicleId:v.id,state:'patrol',searchT:0,arrestT:0};w.cops.push(c);return c;}
export function stepPolice(w,input,dt){
  if(!w.city)return;
  const p=w.player;
  w.cops=w.cops.filter(c=>w.vehicles.some(v=>v.id===c.vehicleId&&v.driver==='cop'));
  w.wanted=clamp(Math.floor(w.heat),0,5);
  if(w.wanted>0){
    if(!w.flags.wantedEpisode){w.flags.wantedEpisode=true;w.flags.roadblock=false;w.flags.noCopSightT=0;}
    if(!w.searchZone)w.searchZone={x:p.x,z:p.z,radius:240+w.wanted*85};
    w.searchZone.radius=240+w.wanted*85;
    const safe=w.city.spawn.safehouse;
    if(safe&&Math.hypot(p.x-safe.x,p.z-safe.z)<12)clearWanted(w,'safehouse');
  }
  if(w.wanted>0){
    const target=Math.min(2+w.wanted,CONFIG.MAX_COPS),points=w.city.graph.filter(n=>{const d=Math.hypot(n.x-p.x,n.z-p.z);return d>=60&&d<=120;});
    while(w.cops.length<target&&points.length){const n=pick(w,points);spawnCop(w,n.x,n.z);}
    if(w.wanted>=4&&!w.flags.roadblock&&w.cops.length>=2){
      const node=nearestNode(w.city,p.x+Math.cos(p.heading)*55,p.z+Math.sin(p.heading)*55);
      for(let i=0;i<2;i++){const c=w.cops[w.cops.length-1-i],v=w.vehicles.find(v=>v.id===c.vehicleId);c.state='roadblock';
        v.x=node.x+Math.cos(p.heading)*(i?3:-3);v.z=node.z+Math.sin(p.heading)*(i?3:-3);v.heading=p.heading+Math.PI/2;v.speed=0;v.parked=true;}
      w.flags.roadblock=true;
    }
  }
  let close=false,inZone=false;
  const top=VEHICLE_TYPES.find(t=>t.id==='cruiser').topSpeed;
  for(const c of w.cops){const v=w.vehicles.find(v=>v.id===c.vehicleId);let d=Math.hypot(v.x-p.x,v.z-p.z);
    if(w.wanted>0){
      if(d<60)close=true;if(d<(w.searchZone?.radius||240))inZone=true;
      if(c.state!=='roadblock'){
        c.state=d<100?'chase':'search';c.searchT+=dt;v.heading=Math.atan2(p.z-v.z,p.x-v.x);
        v.speed=Math.min(top,Math.max(8,Math.abs(p.speed)+2));
        // Keep a bumper gap while pursuing cars: overlapping every frame traps
        // the player's acceleration in the vehicle collision damping loop.
        const travel=p.onFoot||w.wanted<4?v.speed*dt:Math.min(v.speed*dt,Math.max(0,d-3.2));
        const q=collideCircle(w,v.x+Math.cos(v.heading)*travel,v.z+Math.sin(v.heading)*travel,1.1);v.x=q.x;v.z=q.z;
      }
      d=Math.hypot(v.x-p.x,v.z-p.z);
      c.arrestT=p.onFoot&&d<3?c.arrestT+dt:0;
      if(c.arrestT>=1.5&&!p.busted&&!p.dead){p.busted=true;w.money=Math.max(0,w.money-500);p.weapon='pistol';p.ammo={pistol:{mag:12,reserve:0}};if(p.weapons)p.weapons=['pistol'];
        pushEvent(w,'busted');addNotice(w,'CUFFED. Bail 500 dollars, weapons seized (except the pistol).');clearWanted(w,'busted');c.arrestT=0;}
      c.ramT=Math.max(0,(c.ramT||0)-dt);
      if(!p.onFoot&&d<3&&c.ramT===0){const car=w.vehicles.find(v=>v.id===p.vehicleId);if(car)damageVehicle(w,car,3,'police-ram');c.ramT=1;}
    }else{
      c.state='patrol';c.arrestT=0;v.parked=false;
      if(c.patrolNode===undefined)c.patrolNode=nearestNode(w.city,v.x,v.z).id;
      const node=w.city.graph[c.patrolNode],distance=Math.hypot(node.x-v.x,node.z-v.z);
      if(distance<1)c.patrolNode=pick(w,node.edges);
      const goal=w.city.graph[c.patrolNode];v.heading=Math.atan2(goal.z-v.z,goal.x-v.x);v.speed=5;
      const q=collideCircle(w,v.x+Math.cos(v.heading)*5*dt,v.z+Math.sin(v.heading)*5*dt,1.1);v.x=q.x;v.z=q.z;
    }
  }
  if(w.wanted>=3){const angle=w.elapsed*0.5;w.flags.heli={x:p.x+Math.cos(angle)*25,z:p.z+Math.sin(angle)*25,y:60,active:true};
    w.flags.heliSpotT=(w.flags.heliSpotT||0)+dt;if(w.flags.heliSpotT>=2){pushEvent(w,'heli-spotlight',{x:p.x,z:p.z});w.flags.heliSpotT=0;}}
  else if(w.flags.heli)w.flags.heli.active=false;
  if(w.wanted>0){
    w.escapeTimer=inZone?0:w.escapeTimer+dt;
    if(w.escapeTimer>5+w.wanted*1.5){clearWanted(w,'escaped');w.stats.escapes++;addNotice(w,'Wanted level cleared. You got away.');}
    else {w.flags.noCopSightT=close?0:(w.flags.noCopSightT||0)+dt;if(w.flags.noCopSightT>10){w.heat=Math.max(0,w.heat-0.1*dt);w.wanted=Math.min(5,Math.floor(w.heat));if(w.wanted===0)clearWanted(w,'cooled');}}
  }else{w.heat=Math.max(0,w.heat-0.02*dt);w.flags.wantedEpisode=false;w.flags.roadblock=false;w.flags.noCopSightT=0;}
}
registerSystem('police',stepPolice);
