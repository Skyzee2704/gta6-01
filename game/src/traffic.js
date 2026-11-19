import { CONFIG } from './config.js';
import { hashString, clamp } from './random.js';
import { spawnVehicle } from './vehicles.js';
import { registerSystem, pushEvent, addNotice } from './world.js';
export function trafficLightAt(city,nodeId,time){const phase=((time+hashString(String(nodeId))*24)%24+24)%24;return phase<14?'green':phase<17?'yellow':'red';}
const pick=(w,a)=>a[Math.floor(w.rng()*a.length)];
const types=['sedan','coupe','suv','pickup','van','taxi'];
const seen=new WeakSet();
export function stepTraffic(w,input,dt){
  if(!w.city?.graph.length)return;
  const graph=w.city.graph,p=w.player;
  const shots=w.events.filter(e=>{if(seen.has(e))return false;seen.add(e);return e.kind==='shot';});
  w.traffic=w.traffic.filter(t=>{const v=w.vehicles.find(v=>v.id===t.vehicleId);if(!v||v.driver!=='traffic')return false;
    if(Math.hypot(v.x-p.x,v.z-p.z)>320){w.vehicles=w.vehicles.filter(o=>o!==v);return false;}return true;});
  while(w.traffic.length<CONFIG.MAX_TRAFFIC){
    const choices=graph.filter(n=>Math.hypot(n.x-p.x,n.z-p.z)<200);if(!choices.length)break;
    const a=pick(w,choices),b=graph[pick(w,a.edges)],progress=w.rng();
    const v=spawnVehicle(w,pick(w,types),a.x+(b.x-a.x)*progress,a.z+(b.z-a.z)*progress,Math.atan2(b.z-a.z,b.x-a.x),{driver:'traffic'});
    w.traffic.push({vehicleId:v.id,node:a.id,nextNode:b.id,progress,speed:0,state:'drive',honkT:0,jamT:0,cruise:8+w.rng()*4,panicChecked:false});
  }
  for(const t of w.traffic){
    const v=w.vehicles.find(v=>v.id===t.vehicleId);if(!v)continue;
    const nearby=Math.hypot(v.x-p.x,v.z-p.z)<80;
    const alarm=(w.wanted>=3&&nearby)||shots.some(e=>Math.hypot((e.x??p.x)-v.x,(e.z??p.z)-v.z)<40);
    if(alarm&&!t.panicChecked){t.panicChecked=true;if(w.rng()<0.5)t.state='panic';}if(!alarm)t.panicChecked=false;
    let a=graph[t.node],b=graph[t.nextNode],length=Math.hypot(b.x-a.x,b.z-a.z);
    const remaining=(1-t.progress)*length,panic=t.state==='panic';
    let target=t.cruise*(w.weather.kind==='rain'?0.85:1)*(panic?1.5:1),jam=false;
    if(!panic&&b.edges.length>2&&remaining<12&&trafficLightAt(w.city,b.id,w.elapsed)!=='green')target=remaining<2?0:Math.min(target,remaining*0.8);
    for(const o of w.traffic)if(o!==t&&o.node===t.node&&o.nextNode===t.nextNode){const gap=(o.progress-t.progress)*length;if(gap>0&&gap<8){target=Math.min(target,gap<4?0:o.speed);jam=true;}}
    t.speed+=clamp(target-t.speed,-10*dt,4*dt);v.speed=t.speed;
    t.jamT=jam&&t.speed<0.5?t.jamT+dt:0;t.honkT=Math.max(0,t.honkT-dt);
    if(t.jamT>4&&t.honkT===0){pushEvent(w,'honk',{x:v.x,z:v.z});if(nearby)addNotice(w,"Honk! Traffic's jammed ahead of you.");t.honkT=10;}
    if(!panic)t.state=t.speed<0.5?'stop':'drive';
    let distance=t.progress*length+t.speed*dt;
    while(distance>=length&&length>0){distance-=length;const previous=a.id;a=b;const options=a.edges.filter(id=>id!==previous);b=graph[pick(w,options.length?options:a.edges)];t.node=a.id;t.nextNode=b.id;length=Math.hypot(b.x-a.x,b.z-a.z);}
    t.progress=length?distance/length:0;v.x=a.x+(b.x-a.x)*t.progress;v.z=a.z+(b.z-a.z)*t.progress;v.heading=Math.atan2(b.z-a.z,b.x-a.x);
  }
}
registerSystem('traffic',stepTraffic);
