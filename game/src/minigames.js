import { enterVehicle } from './vehicles.js';
import { RACE_ROUTES } from './data.js';
import { registerSystem, addNotice, addMoney, addRespect, pushEvent } from './world.js';
const route=(w,id)=>w.city?.raceRoutes.find(r=>r.id===id);
export function nearRaceStart(w){if(w.player.onFoot||w.flags.interior)return null;return w.city?.raceRoutes.find(r=>{const p=r.start||r.checkpoints[0];return p&&Math.hypot(w.player.x-p.x,w.player.z-p.z)<=10;})?.id||null;}
export function startRace(w,id){const r=route(w,id);if(!r?.checkpoints.length||w.flags.race)return false;w.flags.race={routeId:id,checkpoint:0,time:0,best:w.save?.races?.[id],awayT:0};w.flags.raceMarkers=r.checkpoints.map(p=>({...p}));addNotice(w,`Race: ${r.name}. Clear ${r.checkpoints.length} checkpoints!`);return true;}
export function stepMinigames(w,input,dt){
  // The car system consumes E first. Preserve an established driver's race interaction.
  const previous=w.flags.raceDriverId;
  w.flags.raceDriverId=w.player.onFoot?null:w.player.vehicleId;
  if(!w.flags.race&&input.pressed?.enter&&w.player.onFoot&&previous){
    const car=w.vehicles.find(v=>v.id===previous&&!v.driver);
    const start=w.city?.raceRoutes.some(r=>{const p=r.start||r.checkpoints[0];return Math.hypot(w.player.x-p.x,w.player.z-p.z)<=10;});
    if(car&&start&&Math.hypot(car.x-w.player.x,car.z-w.player.z)<6){enterVehicle(w,car);w.flags.raceDriverId=car.id;}
  }
  let race=w.flags.race;if(!race){if(input.pressed?.enter){const id=nearRaceStart(w);if(id)startRace(w,id);}return;}
  const r=route(w,race.routeId);if(!r){w.flags.race=null;w.flags.raceMarkers=[];return;}race.time+=dt;
  const p=w.player,cp=r.checkpoints[race.checkpoint];if(cp&&Math.hypot(p.x-cp.x,p.z-cp.z)<8){race.checkpoint++;addNotice(w,`Checkpoint ${race.checkpoint} of ${r.checkpoints.length}`);}
  if(race.checkpoint>=r.checkpoints.length){const reward=r.reward??RACE_ROUTES.find(v=>v.id===r.id)?.reward??300;addMoney(w,reward);addRespect(w,150);addNotice(w,`${r.name} finished in ${race.time.toFixed(1)} seconds! +$${reward} + 150 respect.`);
    w.save ||= {};w.save.races ||= {};const best=w.save.races[r.id];if(!Number.isFinite(best)||race.time<best){w.save.races[r.id]=race.time;addMoney(w,200);addNotice(w,'New best time! +$200 bonus.');}pushEvent(w,'race-complete',{routeId:r.id,time:race.time});w.flags.race=null;w.flags.raceMarkers=[];return;}
  const away=p.onFoot&&r.checkpoints.every(c=>Math.hypot(p.x-c.x,p.z-c.z)>60);race.awayT=away?race.awayT+dt:0;if(race.awayT>=10){w.flags.race=null;w.flags.raceMarkers=[];addNotice(w,'Race cancelled.');}
}
registerSystem('minigames',stepMinigames);
