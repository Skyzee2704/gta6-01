import { CONFIG } from './config.js';
const SAVE_KEY=CONFIG.SAVE_KEY;
const memory=Object.create(null);
function storage(){return typeof localStorage==='undefined'?{setItem:(k,v)=>{memory[k]=v;},getItem:k=>memory[k]??null}:localStorage;}
const copy=v=>JSON.parse(JSON.stringify(v));
export function saveGame(w){try{const data={money:w.money,respect:w.respect,respectLevel:w.respectLevel,missionIndex:w.mission.index,completed:w.mission.completed,unlocked:w.mission.unlocked,properties:w.properties,garage:w.garage,races:w.save?.races||{},day:w.day,time:w.time,player:{x:w.player.x,z:w.player.z,health:w.player.health}};storage().setItem(SAVE_KEY,JSON.stringify(data));return true;}catch{return false;}}
export function loadGame(){try{const data=JSON.parse(storage().getItem(SAVE_KEY));return data&&typeof data==='object'&&!Array.isArray(data)?data:null;}catch{return null;}}
export function applySave(w,data){if(!data||typeof data!=='object')return false;const d=copy(data);for(const k of ['money','respect','respectLevel','day','time'])if(Number.isFinite(d[k]))w[k]=d[k];
  if(Number.isInteger(d.missionIndex))w.mission.index=d.missionIndex;if(Array.isArray(d.completed))w.mission.completed=d.completed;if(Number.isInteger(d.unlocked))w.mission.unlocked=d.unlocked;
  if(d.properties&&typeof d.properties==='object')Object.assign(w.properties,d.properties);if(d.garage)for(const slot of ['safehouse','penthouse'])if(Array.isArray(d.garage[slot]))w.garage[slot]=d.garage[slot];
  w.save={races:d.races&&typeof d.races==='object'?d.races:{}};for(const k of ['x','z','health'])if(Number.isFinite(d.player?.[k]))w.player[k]=d.player[k];w.flags.incomeDay=w.day;return true;
}
export function saveSummary(d){if(!d)return null;return {job:(d.missionIndex??0)+1,money:d.money??0,day:d.day??1,time:d.time??12};}
