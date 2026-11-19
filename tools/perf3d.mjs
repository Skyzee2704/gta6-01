import {measureRender} from './measure-render.mjs';
import {performance} from 'node:perf_hooks';
import {estimateSceneStats} from '../game/src/render.js';
import {setWantedLevel} from '../game/src/police.js';
import {spawnVehicle,enterVehicle} from '../game/src/vehicles.js';
import {fresh,stepWorld,roadInput,assert,run} from './sim-common.mjs';
run(async()=>{const w=fresh(),v=spawnVehicle(w,'sedan',w.player.x,w.player.z,0);enterVehicle(w,v);setWantedLevel(w,4);const times=[];for(let n=0;n<2400;n++){const i=roadInput(w);if(n%30===0)i.pressed.shoot=true;const t=performance.now();stepWorld(w,i,1/60);times.push(performance.now()-t);}times.sort((a,b)=>a-b);const avg=times.reduce((a,b)=>a+b,0)/times.length,s=estimateSceneStats(w.city);console.log(JSON.stringify({...s,avgMs:avg,p99Ms:times[Math.floor(times.length*.99)],maxMs:times.at(-1),vehicles:w.vehicles.length,npcs:w.npcs.length,cops:w.cops.length}));assert(Object.values(s).every(Number.isFinite),'NaN scene estimate');const measured=await measureRender();console.log('REAL chase renderer:',JSON.stringify(measured),'formula estimate:',s.drawCalls);assert(measured.drawCalls<=100,`real drawCalls ${measured.drawCalls} > 100`);assert(measured.triangles<=200000,'real triangles over budget');assert(s.triangles<=200000,`triangles ${s.triangles} > 200000`);assert(avg<=8,`avg ${avg} > 8ms`);console.log('PASS perf3d');});
