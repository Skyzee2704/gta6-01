// Story-jobs system for the six jobs in data.js (MISSIONS).
// stageStart sets up each stage and its targets.
// stepMissions advances the per-stage state machine.
// Handles the start, complete, fail, and abandon lifecycle.
// Cleans up mission entities when a job ends.
// Awards money, respect, and progression unlocks on completion.
// Supplies the current mission objective text shown in the HUD.
import { MISSIONS, RESPECT_LEVELS } from './data.js';
import { registerSystem, addNotice, say, pushEvent, addMoney, addRespect, addHeat } from './world.js';
import { spawnVehicle, enterVehicle } from './vehicles.js';
import { spawnEnemy } from './combat.js';
import { nearestNode } from './city.js';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const kind=s=>({'deliver-garage':'deliver','pickup-juno':'pickup-person','pickup-crew':'pickup-person','steal-sports':'steal-car','escape-wanted-4':'escape'}[s.kind]||s.kind);
function location(w,target){const aliases={'juno':'garage','cordon-exit':'garage','palm-heights-buyer':'penthouse','harbor-lot':'harbor-crane','harbor-vault-truck':'harbor-crane','vulture-car':'garage'};target=aliases[target]||target;return w.city.spawn[target]||w.city.landmarks.find(l=>l.id===target||l.kind===target)||(()=>{const d=w.city.districts.find(d=>d.id===target);return d?nearestNode(w.city,(d.x0+d.x1)/2,(d.z0+d.z1)/2):w.city.spawn.garage;})();}
function car(w,a,type,pos){const v=spawnVehicle(w,type,pos.x,pos.z,0,{missionId:a.id,parked:true});return v;}
function stageStart(w){const a=w.mission.active,s=a.stages[a.stageIndex],k=kind(s),pos=location(w,s.target);a.stage=s;s.timer=0;s.progress=0;s.lastVehicleId=w.player.vehicleId;s.position={x:pos.x,z:pos.z};s.targets=[];
  if(k==='pickup-car'||k==='steal-car'){const v=car(w,a,s.detail.vehicle||'sedan',pos);a.vehicleId=v.id;s.vehicleId=v.id;s.targets.push(v.id);if(k==='steal-car')for(let i=0;i<3;i++){const e=spawnEnemy(w,pos.x+8+i*4,pos.z-8,{weapon:'smg'});if(e){e.missionId=a.id;s.targets.push(e.id);}}}
  if(k==='deliver')s.vehicleId=a.vehicleId;
  if(k==='pickup-person'){const names=s.detail.crew||[s.target==='juno'?'juno':s.detail.npc||s.target];s.people=names.map((name,i)=>{let n=w.npcs.find(n=>n.id===name);if(!n){n={id:name,x:pos.x+i,z:pos.z,health:100,dead:false,state:'idle',idleT:1e9,missionId:a.id};w.npcs.push(n);}return {...n};});s.targets=s.people.map(n=>n.id);}
  if(k==='exit-cordon'){s.center={...pos};s.radius=s.detail.radius||90;addHeat(w,Math.max(0,(s.detail.wantedLevel||2)-w.heat),'mission');}
  if(k==='collect'){const districts=s.detail.districts||[s.target];s.packages=districts.map((d,i)=>{const p=location(w,d),item={id:`package-${a.id}-${a.stageIndex}-${i}`,kind:'package',x:p.x,z:p.z,title:'Cargo package',taken:false,missionId:a.id};w.pickups.push(item);return item.id;});s.targets=[...s.packages];}
  if(k==='defend'){s.wave=1;spawnWave(w,s);}
  if(k==='chase'){const p=nearestNode(w.city,pos.x,pos.z),v=car(w,a,'coupe',p);v.driver='mission';s.vehicleId=v.id;s.node=p.id;s.nextNode=w.city.graph[p.id].edges[0];s.targets=[v.id];}
  if(k==='crack-vault'){const v=car(w,a,'van',pos);s.vehicleId=v.id;s.targets=[v.id];addHeat(w,Math.max(0,(s.detail.wantedLevel||1)-w.heat),'vault');}
  if(k==='escape'){addHeat(w,Math.max(0,(s.detail.initialWantedLevel||4)-w.heat),'escape');s.reachedFour=w.wanted>=4;}
}
function spawnWave(w,s){const a=w.mission.active,p=s.position;s.targets=[];for(let i=0;i<(s.detail.enemies||4);i++){const angle=i*Math.PI*2/(s.detail.enemies||4),e=spawnEnemy(w,p.x+Math.cos(angle)*20,p.z+Math.sin(angle)*20,{weapon:s.wave>1?'rifle':'pistol'});if(e){e.missionId=a.id;s.targets.push(e.id);}}if((s.detail.wave||s.wave)>1)addNotice(w,`Wave ${s.detail.wave||s.wave}!`);}
export function startMission(w,idx){if(!Number.isInteger(idx)||idx<0||idx>=w.mission.unlocked||!MISSIONS[idx]||w.mission.active||!w.city)return false;const data=MISSIONS[idx];w.mission.results=null;w.mission.index=idx;w.mission.active={id:data.id,stageIndex:0,timer:0,stats:{shots:w.stats.shots,hits:w.stats.hits,kills:w.stats.kills,crashes:w.stats.crashes},startTime:w.elapsed,data,stages:data.stages.map(s=>({...s,detail:{...s.detail}})),packages:0};stageStart(w);say(w,data.giver,data.giverLine);addNotice(w,`Job ${data.id}: ${data.title} — ${data.blurb}`);pushEvent(w,'mission-start',{id:data.id});return true;}
function cleanup(w,id){w.enemies=w.enemies.filter(e=>e.missionId!==id);w.pickups=w.pickups.filter(p=>p.missionId!==id);w.npcs=w.npcs.filter(n=>n.missionId!==id);w.vehicles=w.vehicles.filter(v=>v.missionId!==id||v.id===w.player.vehicleId);for(const v of w.vehicles)if(v.missionId===id)delete v.missionId;}
export function completeMission(w){const a=w.mission.active;if(!a)return;const shots=w.stats.shots-a.stats.shots,hits=w.stats.hits-a.stats.hits,respect=40+20*a.id,results={title:a.data.title,payout:a.data.payout,respect,time:w.elapsed-a.startTime,accuracy:shots?Math.min(1,hits/shots):0,takedowns:w.stats.kills-a.stats.kills,crashes:w.stats.crashes-a.stats.crashes,topSpeed:w.stats.topSpeed,unlocks:MISSIONS[a.id]?[MISSIONS[a.id].title]:[]};addMoney(w,results.payout);const previousLevel=w.respectLevel;addRespect(w,respect);for(const level of RESPECT_LEVELS)if(level.level>previousLevel&&level.level<=w.respectLevel)results.unlocks.push(...level.unlocks);if(!w.mission.completed.includes(a.id))w.mission.completed.push(a.id);w.mission.unlocked=Math.min(MISSIONS.length,Math.max(w.mission.unlocked,a.id+1));w.mission.results=results;cleanup(w,a.id);w.mission.active=null;w.stats.missionsDone++;addNotice(w,`JOB COMPLETE: ${results.title} +$${results.payout} +${respect} respect`);pushEvent(w,'mission-complete',results);if(a.id===6){addNotice(w,'EMPIRE: King of Solmar! Free roam open, every job replayable.');say(w,'rosa','You built a home here, Milo. Take a breath and enjoy the city.');}}
export function failMission(w,reason){const a=w.mission.active;if(!a)return;cleanup(w,a.id);w.mission.active=null;addNotice(w,'JOB BLOWN: '+reason);pushEvent(w,'mission-failed',{reason});}
export function abandonMission(w){if(!w.mission.active)return;const a=w.mission.active;cleanup(w,a.id);w.mission.active=null;addNotice(w,'Job abandoned. Free roam.');pushEvent(w,'mission-failed',{reason:'Job abandoned.'});}
export function missionObjectiveText(w){const a=w.mission.active;return a?`Job ${a.id}: ${a.data.title} — ${a.stages[a.stageIndex].text}`:'Free roam — press M for map, E near a car to get in';}
export function stepMissions(w,input,dt){const a=w.mission.active;if(!a)return;const s=a.stages[a.stageIndex],k=kind(s),p=w.player;a.timer+=dt;s.timer+=dt;if(p.dead||p.busted){failMission(w,p.dead?'The crew lost its driver.':'The police caught the driver.');return;}if((s.detail.timeLimit&&s.timer>s.detail.timeLimit)||(a.data.timeLimit&&a.timer>a.data.timeLimit)){failMission(w,"Time's up.");return;}let done=false;const v=w.vehicles.find(v=>v.id===s.vehicleId);
  if(['pickup-car','steal-car','deliver','chase','crack-vault'].includes(k)&&!v){if(k==='chase')done=true;else {failMission(w,'The target vehicle was lost.');return;}}
  if(k==='pickup-car'||k==='steal-car')done=p.vehicleId===s.vehicleId;
  if(k==='deliver')done=p.vehicleId===s.vehicleId&&distance(p,s.position)<10;
  if(k==='pickup-person'){const vehicle=w.vehicles.find(v=>v.id===(p.vehicleId||s.lastVehicleId));done=!!vehicle&&distance(p,vehicle)<6&&!!input.pressed?.enter&&s.people.every(n=>distance(n,vehicle)<4);if(p.vehicleId)s.lastVehicleId=p.vehicleId;if(done){if(p.onFoot)enterVehicle(w,vehicle);a.vehicleId=vehicle.id;for(const line of a.data.dialogue||[])say(w,line.speaker,line.text);}}
  if(k==='exit-cordon')done=distance(p,s.center)>s.radius;
  if(k==='lose-wanted')done=w.wanted===0;
  if(k==='collect'){for(const item of w.pickups)if(s.packages.includes(item.id)&&!item.taken&&distance(p,item)<3){item.taken=true;a.packages++;addNotice(w,`Package ${a.packages} of 3 picked up.`);}done=s.packages.every(id=>w.pickups.find(p=>p.id===id)?.taken);}
  if(k==='defend'&&!w.enemies.some(e=>s.targets.includes(e.id))){if(s.wave<(s.detail.waves||1)){s.wave++;spawnWave(w,s);}else done=true;}
  if(k==='chase'&&v){let remaining=14*dt;while(remaining>0){const goal=w.city.graph[s.nextNode],d=distance(v,goal);if(d>remaining){v.heading=Math.atan2(goal.z-v.z,goal.x-v.x);v.x+=Math.cos(v.heading)*remaining;v.z+=Math.sin(v.heading)*remaining;remaining=0;}else{v.x=goal.x;v.z=goal.z;remaining-=d;const options=goal.edges.filter(id=>id!==s.node);s.node=goal.id;s.nextNode=(options.length?options:goal.edges)[Math.floor(w.rng()*(options.length||goal.edges.length))];}}v.speed=14;s.progress=distance(p,v)<5?s.progress+dt:0;done=v.health<=20||s.progress>=3;}
  if(k==='crack-vault'&&v){s.progress=distance(p,v)<12&&w.wanted>=1?s.progress+dt:Math.max(0,s.progress-dt);done=s.progress>=(s.detail.holdSeconds||12);}
  if(k==='escape'){s.reachedFour ||= w.wanted>=4;done=s.reachedFour&&w.wanted===0;}
  if(done){addNotice(w,s.text);a.stageIndex++;if(a.stageIndex===a.stages.length)completeMission(w);else stageStart(w);}
}
registerSystem('missions',stepMissions);
