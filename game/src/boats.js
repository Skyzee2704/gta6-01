import { registerSystem, pushEvent, spawnParticles } from './world.js';
let serial=0;
export function spawnBoat(w,typeId,x,z,heading=0){const boat={id:`boat-${++serial}`,type:typeId==='speedboat'?'speedboat':'boat',kind:'boat',x,z,y:0,heading,speed:0,health:100,driver:null,bob:0,locked:true};(w.boats ||= []).push(boat);w.vehicles.push(boat);return boat;}
export function stepBoats(w,input,dt){if(!w.city)return;const line=w.city.waterLineZ,p=w.player;
  if(!w.flags.boatsSpawned){w.flags.boatsSpawned=true;const m=w.city.spawn.marina,pier=w.city.spawn.pier;spawnBoat(w,'speedboat',m.x,line-3,0);spawnBoat(w,'boat',pier.x+7,line-3,0);}
  for(const b of w.boats||[]){if(b.health<=0)continue;if(!w.vehicles.includes(b))w.vehicles.push(b);
    const aboard=p.boatId===b.id;
    if(aboard){p.onFoot=false;p.vehicleId=null;b.driver='player';
      if(input.pressed?.enter&&b.z<line+20){p.boatId=null;p.onFoot=true;b.driver=null;Object.assign(p,{x:b.x,z:line-3,y:0,speed:0});continue;}
      b.speed+=(Number(!!input.forward)-Number(!!input.back))*8*dt;b.speed*=Math.exp(-0.25*dt);b.speed=Math.max(-7,Math.min(b.type==='speedboat'?28:22,b.speed));b.heading+=(Number(!!input.right)-Number(!!input.left))*0.6*dt*Math.min(1,Math.abs(b.speed)/3);
    }else if(p.onFoot&&!p.heliId&&!w.flags.interior&&input.pressed?.enter&&Math.hypot(p.x-b.x,p.z-b.z)<6){w.notices=w.notices.filter(n=>n.text!=='That car is locked.');p.onFoot=false;p.boatId=b.id;p.vehicleId=null;b.driver='player';pushEvent(w,'boat-board',{id:b.id});}
    b.x+=Math.cos(b.heading)*b.speed*dt;b.z+=Math.sin(b.heading)*b.speed*dt;
    if(b.z<line-5){b.z=line-5;b.speed=0;}const pier=w.city.spawn.pier;if(Math.hypot(b.x-pier.x,b.z-pier.z)<4)b.speed*=0.5;
    b.bob=Math.sin(w.elapsed*2+Number(b.id.split('-')[1]))*0.15;b.y=b.bob;
    b.wakeT=(b.wakeT||0)+dt;if(Math.abs(b.speed)>5&&b.wakeT>0.15){spawnParticles(w,b.x-Math.cos(b.heading)*3,0,b.z-Math.sin(b.heading)*3,'wake',2);b.wakeT=0;}
    if(p.boatId===b.id)Object.assign(p,{x:b.x,z:b.z,y:b.bob,heading:b.heading,speed:b.speed,onFoot:false});
  }
}
registerSystem('boats',stepBoats);
