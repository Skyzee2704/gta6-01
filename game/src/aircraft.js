import { registerSystem, pointInBuilding, damagePlayer, spawnParticles, addNotice, pushEvent } from './world.js';
let serial=0;
export function spawnHeli(w,x,z){const h={id:`player-heli-${++serial}`,x,z,y:0,heading:0,speed:0,vy:0,driver:null,rotor:0,health:100};(w.helis ||= []).push(h);return h;}
// C is input.crouch; keysC is accepted for older input adapters.
export function stepAircraft(w,input,dt){if(!w.city)return;if(!w.flags.aircraftSpawned){w.flags.aircraftSpawned=true;const p=w.city.spawn.helipads[0];spawnHeli(w,p.x,p.z);}
  const p=w.player;for(const h of [...(w.helis||[])]){h.crashT=Math.max(0,(h.crashT||0)-dt);
    if(p.heliId===h.id){h.driver='player';p.onFoot=false;p.vehicleId=null;
      if(input.pressed?.enter&&h.y<2){h.driver=null;p.heliId=null;Object.assign(p,{onFoot:true,x:h.x+5,z:h.z,y:0,speed:0});continue;}
      h.heading+=(Number(!!input.right)-Number(!!input.left))*1.1*dt;
      h.speed+=(Number(!!input.forward)-Number(!!input.back))*16*dt;h.speed*=Math.exp(-0.35*dt);h.speed=Math.max(-15,Math.min(input.run?40:32,h.speed));
      h.vy+=(Number(!!input.jump)-Number(!!(input.crouch||input.keysC)))*15*dt;h.vy*=Math.exp(-1.5*dt);h.y+=h.vy*dt;
      if(h.y>=120){h.y=120;h.vy=Math.min(0,h.vy);}if(h.y<=0){h.y=0;h.vy=0;h.speed*=Math.exp(-3*dt);}
      const old={x:h.x,z:h.z};h.x+=Math.cos(h.heading)*h.speed*dt;h.z+=Math.sin(h.heading)*h.speed*dt;
      const building=pointInBuilding(w.city,h.x,h.z)&&w.city.buildings.find(b=>Math.abs(h.x-b.x)<=b.w/2&&Math.abs(h.z-b.z)<=b.d/2&&h.y<(b.totalH??b.height??b.h??10));
      if(building&&!h.crashT){h.health-=40;h.x=old.x;h.z=old.z;h.y=0;h.speed=0;h.vy=0;h.crashT=2;damagePlayer(w,10,'helicopter-crash');addNotice(w,'Helicopter hit a building! Emergency landing.');pushEvent(w,'heli-crash',{id:h.id});
        if(h.health<=0){spawnParticles(w,h.x,h.y,h.z,'fire',24);w.helis=w.helis.filter(o=>o!==h);p.heliId=null;Object.assign(p,{onFoot:true,x:h.x,z:h.z,y:0,speed:0});damagePlayer(w,30,'helicopter-crash');continue;}}
      Object.assign(p,{x:h.x,z:h.z,y:h.y,heading:h.heading,speed:h.speed,onFoot:false});
    }else if(p.onFoot&&!p.boatId&&!w.flags.interior&&input.pressed?.enter&&h.y<2&&Math.hypot(p.x-h.x,p.z-h.z)<8){p.heliId=h.id;p.onFoot=false;p.vehicleId=null;h.driver='player';pushEvent(w,'heli-board',{id:h.id});}
    h.rotor+=dt*(h.driver?10+Math.abs(h.speed):0);
  }
}
registerSystem('aircraft',stepAircraft);
