import {fresh,assert,run,stepWorld,blankInput} from './sim-common.mjs';
import {missionRun} from './mission-auto.mjs';
import {spawnVehicle,enterVehicle,exitVehicle} from '../game/src/vehicles.js';
import {storeVehicle,retrieveVehicle} from '../game/src/interiors.js';
run(()=>{
 const w=fresh();let failure;
 try{for(let idx=0;idx<6;idx++)missionRun(w,idx);}catch(e){failure=e;}
 const garageWorld=failure?fresh():w;
 if(!garageWorld.player.onFoot)exitVehicle(garageWorld);
 const v=spawnVehicle(garageWorld,'sedan',garageWorld.player.x,garageWorld.player.z,0,{owned:true});
 assert(enterVehicle(garageWorld,v)&&storeVehicle(garageWorld,v),'garage store failed');
 const car=retrieveVehicle(garageWorld,'safehouse',0);
 assert(car&&garageWorld.player.vehicleId===car.id&&car.driver==='player','garage retrieve not drivable');
 const old={x:car.x,z:car.z},i=blankInput();i.forward=true;
 for(let n=0;n<60;n++)stepWorld(garageWorld,i,1/60);
 assert(Math.hypot(car.x-old.x,car.z-old.z)>1,'retrieved car does not drive');
 console.log('PASS garage store/retrieve and 60 driving steps'+(failure?' (isolated world after mission failure)':''));
 console.log(`story complete ${w.mission.completed.length}/6 respect=${w.respectLevel} escapes=${w.stats.escapes}`);
 if(failure)throw failure;
 assert(w.mission.completed.length===6,'story incomplete');
 console.log('PASS missionCheck');
});
