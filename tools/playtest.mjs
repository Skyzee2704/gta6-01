import {stepWorld,blankInput,steer,route,assert} from './sim-common.mjs';
import {startMission} from '../game/src/missions.js';
import {spawnVehicle,enterVehicle,exitVehicle} from '../game/src/vehicles.js';
import {clearWanted} from '../game/src/world.js';
function missionRun(w,index){assert(startMission(w,index),`cannot start mission index ${index}`);const a=w.mission.active,before={...w.stats},cash=w.money,respect=w.respect;let last='',completionCash=cash,completionRespect=respect;for(let n=0;n<24000&&w.mission.active;n++){const s=a.stages[a.stageIndex],k=s.kind;last=`${a.stageIndex} ${k} ${JSON.stringify(s.position)}`;let target=s.position,i=blankInput();const v=w.vehicles.find(v=>v.id===s.vehicleId);if(['pickup-car','steal-sports','steal-car'].includes(k)){target=v;if(Math.hypot(w.player.x-v.x,w.player.z-v.z)<4){if(!w.player.onFoot)exitVehicle(w);enterVehicle(w,v);}}
else if(k.startsWith('pickup-')){const current=w.vehicles.find(v=>v.id===w.player.vehicleId);if(index===5&&current&&current.health<90)exitVehicle(w);if(w.player.onFoot)enterVehicle(w,spawnVehicle(w,'sedan',w.player.x,w.player.z,w.player.heading));if(Math.hypot(w.player.x-target.x,w.player.z-target.z)<2)i.pressed.enter=true;}
else if(k==='collect'){target=w.pickups.find(p=>s.packages.includes(p.id)&&!p.taken)||target;}
else if(k==='exit-cordon')target={x:s.center.x+130,z:s.center.z};
else if(k==='lose-wanted'||k.includes('escape')){if(k.includes('escape')&&!w.player.onFoot)exitVehicle(w);target=w.city.spawn.safehouse;}
else if(k==='crack-vault'){const d=Math.hypot(w.player.x-v.x,w.player.z-v.z);const current=w.vehicles.find(v=>v.id===w.player.vehicleId);if(current&&(d>12||current.health<35))exitVehicle(w);if(d<11&&w.player.onFoot)enterVehicle(w,spawnVehicle(w,'sedan',w.player.x,w.player.z,w.player.heading));target=s.position;}
else if(k==='defend'){const e=w.enemies.find(e=>s.targets.includes(e.id));if(e){target=e;if(!w.player.onFoot)exitVehicle(w);w.player.heading=Math.atan2(e.z-w.player.z,e.x-w.player.x);i.pressed.shoot=n%20===0;i.pressed.reload=n%120===0;}}
else if(k==='chase'){if(!v){stepWorld(w,i,1/60);continue;}target=w.city.graph[s.nextNode];if(w.player.onFoot)enterVehicle(w,spawnVehicle(w,'coupe',w.player.x,w.player.z,w.player.heading));if(Math.hypot(v.x-w.player.x,v.z-w.player.z)<40){i.pressed.shoot=n%20===0;i.pressed.reload=n%120===0;}}
if(k==='crack-vault'&&Math.hypot(w.player.x-v.x,w.player.z-v.z)<11){i=blankInput();}else if(!['defend'].includes(k)){const drive=steer(w,route(w,target),{stop:k==='collect'?1:1.5});Object.assign(i,drive,{pressed:i.pressed});}
completionCash=w.money;completionRespect=w.respect;stepWorld(w,i,1/60);if(w.player.dead||w.player.busted)break;}
assert(!w.mission.active&&w.mission.completed.includes(a.id),`mission ${index+1} stalled/failed at ${last}; player=${JSON.stringify(w.player)} notices=${JSON.stringify(w.notices)}`);const r=w.mission.results;assert(r,'missing results');for(const key of ['payout','respect','time','accuracy','takedowns','crashes','topSpeed'])assert(Number.isFinite(r[key]),`invalid results ${key}`);assert(r.payout===w.money-completionCash&&r.respect===w.respect-completionRespect,'payout/respect delta mismatch');assert(Math.abs(r.time-(w.elapsed-a.startTime))<1e-8,'time mismatch');const shots=w.stats.shots-before.shots,hits=w.stats.hits-before.hits;assert(r.accuracy===(shots?Math.min(1,hits/shots):0),'accuracy mismatch');assert(r.takedowns===w.stats.kills-before.kills&&r.crashes===w.stats.crashes-before.crashes&&r.topSpeed===w.stats.topSpeed,'stats mismatch');console.log(`PASS mission ${index+1}: time=${r.time.toFixed(2)} payout=${r.payout} wanted=${w.wanted} results=${JSON.stringify(r)}`);clearWanted(w,'verification-between-missions');assert(w.wanted===0&&w.heat===0,'clearWanted failed');return r;}

import {fresh,run} from './sim-common.mjs';
import {stealVehicle} from '../game/src/vehicles.js';
import {setWantedLevel} from '../game/src/police.js';
import {buyWeapon} from '../game/src/weapons.js';
import {addMoney} from '../game/src/world.js';
import {nearestInterior,enterInterior,leaveInterior} from '../game/src/interiors.js';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,String(v)),removeItem:k=>memory.delete(k)};
run(async()=>{const {saveGame,loadGame,applySave,saveSummary}=await import('../game/src/save.js');const w=fresh();let passed=0,failed=0;async function check(name,fn){try{await fn();passed++;console.log('PASS '+name);}catch(e){failed++;console.error('FAIL '+name+': '+e.message);}}
await check('1 fresh world',()=>assert(w.city&&w.player.health===100,'initial state'));
await check('2 mission 1 completion and results',()=>missionRun(w,0));
await check('3 steal car',()=>{if(!w.player.onFoot)exitVehicle(w);const v=spawnVehicle(w,'sedan',w.player.x,w.player.z,0);assert(stealVehicle(w,v),'steal failed');assert(!enterVehicle(w,v)&&w.player.vehicleId===v.id,'entry state');});
await check('4 drive 600 steps',()=>{const x=w.player.x,z=w.player.z;for(let n=0;n<600;n++)stepWorld(w,steer(w,{x:x+100,z}),1/60);assert(Math.hypot(w.player.x-x,w.player.z-z)>1,'no driving movement');});
await check('5 wanted two',()=>{setWantedLevel(w,2);assert(w.wanted===2,'wanted');});
await check('6 cops chase',()=>{for(let n=0;n<120;n++)stepWorld(w,blankInput(),1/60);assert(w.cops.some(c=>c.state==='chase'||c.state==='search'),'no chase');});
await check('7 buy weapon',()=>{addMoney(w,1000);assert(buyWeapon(w,'pistol')&&w.player.ammo.pistol,'purchase');});
await check('8 approach nearest interior',()=>{clearWanted(w,'playtest');if(!w.player.onFoot)exitVehicle(w);const target=w.city.spawn.diner;for(let n=0;n<12000&&!nearestInterior(w);n++)stepWorld(w,steer(w,route(w,target),{stop:1}),1/60);assert(nearestInterior(w),'no interior in reach '+JSON.stringify(w.player));});
await check('9 enter and leave interior',()=>{const d=nearestInterior(w);assert(d&&enterInterior(w,d.id),'entry');assert(leaveInterior(w)&&!w.flags.interior,'leave');});
await check('10 save/load roundtrip',()=>{assert(saveGame(w),'save failed');const data=loadGame(),copy=fresh();assert(applySave(copy,data)&&copy.money===w.money&&copy.player.x===w.player.x,'roundtrip mismatch');});
await check('11 saveSummary',()=>{const summary=saveSummary(loadGame());assert(summary.money===w.money&&summary.day===w.day&&summary.time===w.time&&summary.job===w.mission.index+1,'summary mismatch');});
console.log(`playtest ${passed}/11 passed ${failed} failed`);assert(failed===0,'playtest checks failed');});
