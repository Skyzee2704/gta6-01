import { CONFIG } from './config.js';
import { nearestNode, nearestRoadPoint, pointInWater } from './city.js';
import { registerSystem, collideCircle, addHeat, pushEvent, addNotice } from './world.js';
const pick=(w,a)=>a[Math.floor(w.rng()*a.length)];
const seen=new WeakSet();let serial=0;
const offset=CONFIG.ROAD_W/2+CONFIG.SIDEWALK_W/2;
function dress(w,n){
  n.skin=pick(w,['#efc6a4','#c58c63','#8b583c','#57392d']);n.clothes=pick(w,['#d0a347','#437e91','#a34d60','#e5ddd0','#354b68']);
  n.hair=pick(w,['short','curly','long','bald','ponytail']);n.height=1.65+w.rng()*0.3;n.panicT=0;n.walkSpeed=1.2+w.rng()*0.8;
  const road=nearestRoadPoint(w.city,n.x,n.z).road;n.side=w.rng()<0.5?-1:1;
  n.node=nearestNode(w.city,n.x,n.z).id;n.nextNode=null;n.idleT=0;
  n.heading=road.horizontal?0:Math.PI/2;
}
function spawn(w){
  const roads=w.city.roads.filter(r=>{const x=Math.max(r.x0,Math.min(w.player.x,r.x1)),z=Math.max(r.z0,Math.min(w.player.z,r.z1));return Math.hypot(x-w.player.x,z-w.player.z)<180;});
  if(!roads.length)return null;
  const r=pick(w,roads),center=r.horizontal?w.player.x:w.player.z,lo=r.horizontal?r.x0:r.z0,hi=r.horizontal?r.x1:r.z1;
  const along=Math.max(lo,Math.min(hi,center+(w.rng()-0.5)*260)),side=w.rng()<0.5?-1:1;
  const n={id:`npc-${++serial}`,x:r.horizontal?along:r.x0+side*offset,z:r.horizontal?r.z0+side*offset:along,heading:0,speed:0,state:'walk',health:100,dead:false};dress(w,n);return n;
}
export function nearestNpc(w,x,z,maxDist=Infinity){let best=null,d=maxDist;for(const n of w.npcs){const v=Math.hypot(n.x-x,n.z-z);if(!n.dead&&v<=d){d=v;best=n;}}return best;}
export function stepNpcs(w,input,dt){
  if(!w.city)return;
  const events=w.events.filter(e=>{if(seen.has(e))return false;seen.add(e);return e.kind==='shot'||e.kind==='theft'||(e.kind==='crime'&&e.crime==='theft');});
  w.npcs=w.npcs.filter(n=>Math.hypot(n.x-w.player.x,n.z-w.player.z)<=300);
  while(w.npcs.length<CONFIG.MAX_NPCS){const n=spawn(w);if(!n)break;w.npcs.push(n);}
  w.flags.witnessCooldown=Math.max(0,(w.flags.witnessCooldown||0)-dt);
  for(const n of w.npcs){
    if(!n.skin)dress(w,n);if(n.dead){n.speed=0;continue;}
    const near=e=>Math.hypot(n.x-(e.x??w.player.x),n.z-(e.z??w.player.z));
    if((n.state==='walk'||n.state==='idle')&&w.flags.witnessCooldown===0&&events.some(e=>near(e)<25)){
      addHeat(w,0.5,'witnessed');pushEvent(w,'npc-call',{x:n.x,z:n.z});addNotice(w,'A witness called the cops!');w.flags.witnessCooldown=8;
    }
    const chase=w.wanted>=2&&w.cops.some(c=>{const v=w.vehicles.find(v=>v.id===c.vehicleId);return c.state==='chase'&&v&&Math.hypot(v.x-n.x,v.z-n.z)<30;});
    if(events.some(e=>e.kind==='shot'&&near(e)<50)||chase&&n.state!=='flee') {n.state='flee';n.panicT=3+w.rng()*3;n.fleeSpeed=4+w.rng();}
    let tx=n.x,tz=n.z;
    if(n.state==='flee'||n.state==='panic'){
      n.panicT-=dt;n.heading=Math.atan2(n.z-w.player.z,n.x-w.player.x);n.speed=n.fleeSpeed||4.5;
      tx+=Math.cos(n.heading)*n.speed*dt;tz+=Math.sin(n.heading)*n.speed*dt;
      if(n.panicT<=0){n.state='walk';n.node=nearestNode(w.city,n.x,n.z).id;n.nextNode=null;}
    }else if(n.state==='idle') {n.speed=0;n.idleT-=dt;if(n.idleT<=0)n.state='walk';}
    else {
      const a=w.city.graph[n.node];
      if(n.nextNode===null){const options=a.edges.filter(id=>id!==n.previousNode);n.nextNode=pick(w,options.length?options:a.edges);}
      const b=w.city.graph[n.nextNode],angle=Math.atan2(b.z-a.z,b.x-a.x);
      const goalX=b.x-Math.sin(angle)*offset*n.side,goalZ=b.z+Math.cos(angle)*offset*n.side;
      const distance=Math.hypot(goalX-n.x,goalZ-n.z);n.heading=Math.atan2(goalZ-n.z,goalX-n.x);n.speed=n.walkSpeed;
      const move=Math.min(distance,n.speed*dt);tx+=Math.cos(n.heading)*move;tz+=Math.sin(n.heading)*move;
      if(distance<0.3){n.previousNode=n.node;n.node=n.nextNode;n.nextNode=null;
        if(b.edges.length>2&&w.rng()<0.2)n.side*=-1;
        if(w.rng()<0.15){n.state='idle';n.idleT=2+w.rng()*4;}}
    }
    const q=collideCircle(w,tx,tz,0.35);if(!pointInWater(w.city,q.x,q.z)){n.x=q.x;n.z=q.z;}else{n.state='walk';n.node=nearestNode(w.city,n.x,n.z).id;n.nextNode=null;}
  }
}
registerSystem('npcs',stepNpcs);
