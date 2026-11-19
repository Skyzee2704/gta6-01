import {createWorld,attachCity,stepWorld,blankInput} from '../game/src/world.js';
import {generateCity,nearestNode,nearestRoadPoint} from '../game/src/city.js';
import '../game/src/missions.js';
import '../game/src/police.js';
import '../game/src/traffic.js';
import '../game/src/npc.js';
import '../game/src/vehicles.js';
import '../game/src/weapons.js';
import '../game/src/combat.js';
import '../game/src/weather.js';
import '../game/src/economy.js';
import '../game/src/dialogue.js';
import '../game/src/side.js';
import '../game/src/minigames.js';
import '../game/src/boats.js';
import '../game/src/aircraft.js';
import '../game/src/interiors.js';
export {stepWorld,blankInput};
export const fresh=()=>{const w=createWorld(1);attachCity(w,generateCity(1));return w;};
export function assert(ok,message){if(!ok)throw Error(message);}
export function run(fn){Promise.resolve().then(fn).catch(e=>{console.error('FAIL:',e.stack);process.exitCode=1;});}
export function steer(w,target,{stop=2}={}){const p=w.player,i=blankInput(),d=Math.hypot(target.x-p.x,target.z-p.z),a=Math.atan2(target.z-p.z,target.x-p.x),delta=Math.atan2(Math.sin(a-p.heading),Math.cos(a-p.heading));i.forward=d>stop;i.run=true;i.left=delta<-.035;i.right=delta>.035;if(!p.onFoot){const desired=d<stop?0:Math.abs(delta)>.3?4:Math.min(23,Math.max(3,d*1.5));i.forward=p.speed<desired-.5;i.back=p.speed>desired+.5;}return i;}
export function roadInput(w){const p=w.player,r=nearestRoadPoint(w.city,p.x,p.z);if(Math.hypot(r.x-p.x,r.z-p.z)>3)return steer(w,r);let n=nearestNode(w.city,p.x,p.z);if(!w.flags.testGoal||Math.hypot(p.x-w.flags.testGoal.x,p.z-w.flags.testGoal.z)<8)w.flags.testGoal=w.city.graph[n.edges[Math.floor(w.elapsed/5)%n.edges.length]];return steer(w,w.flags.testGoal);}
const routes=new WeakMap();
export function route(w,target){const p=w.player,g=w.city.graph,key=`${target.x.toFixed(1)},${target.z.toFixed(1)}`;let r=routes.get(w);if(!r||r.key!==key){const a=nearestNode(w.city,p.x,p.z),b=nearestNode(w.city,target.x,target.z),prev=new Map([[a.id,null]]),q=[a.id];for(let j=0;j<q.length&&!prev.has(b.id);j++)for(const id of g[q[j]].edges)if(!prev.has(id)){prev.set(id,q[j]);q.push(id);}const path=[];let id=b.id;while(id!==null){path.unshift(g[id]);id=prev.get(id);}path.push(target);r={key,path};routes.set(w,r);}while(r.path.length>1&&Math.hypot(p.x-r.path[0].x,p.z-r.path[0].z)<(p.onFoot?1.5:4))r.path.shift();return r.path[0];}
export function finite(w){for(const e of [w.player,...w.vehicles])assert(Number.isFinite(e.x)&&Number.isFinite(e.z),`non-finite position ${e.id||'player'}`);}
