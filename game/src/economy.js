import { RESPECT_LEVELS } from './data.js';
import { registerSystem, addMoney, addNotice } from './world.js';
export const respectForLevel=level=>RESPECT_LEVELS.find(r=>r.level===level)?.at??Infinity;
export const unlocksForLevel=level=>({2:['SMG at Harbor Arms'],3:['Sports cars spawn more often'],4:['Rifle VK-47 at Harbor Arms'],5:['Sniper Longeye 308 at Harbor Arms']}[level]||[]);
export function buyProperty(w,id){if(id!=='penthouse'||w.properties.penthouse)return false;if(w.money<15000){addNotice(w,'Not enough cash for Palm Heights Penthouse ($15000).');return false;}addMoney(w,-15000);w.properties.penthouse=true;addNotice(w,'Penthouse Palm Heights bought! Income 500 dollars per game day.');return true;}
export function stepEconomy(w,input,dt){const previous=w.flags.incomeDay??1;if(w.day>previous&&w.properties.penthouse){for(let day=previous;day<w.day;day++){addMoney(w,500);addNotice(w,'Penthouse income: +$500.');}}w.flags.incomeDay=w.day;}
registerSystem('economy',stepEconomy);
