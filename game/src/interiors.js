import { WEAPONS, VEHICLE_TYPES } from './data.js';
import { registerSystem, addNotice, addMoney, pushEvent, say, collideCircle } from './world.js';
import { buyWeapon } from './weapons.js';
import { spawnVehicle, enterVehicle, exitVehicle } from './vehicles.js';
export const INTERIORS = [
  {id:'diner',name:"Rosa's Diner",landmark:'rosas-diner',keeper:'rosa',keeperLine:'Sit down, Milo. Eat first, then work.',menu:[
    {id:'lunch',name:"Rosa's Lunch",price:25,desc:'Full health',effect:'heal'},
    {id:'coffee',name:'Coffee',price:5,desc:'A quick boost',effect:'coffee'},
    {id:'pie',name:'Sunset Pie',price:10,desc:'Sweet and warm',effect:'heal-half'}]},
  {id:'gunstore',name:'Harbor Arms',landmark:'harbor-arms',keeper:'mags',keeperLine:'Good guns, honest prices. Bought here before, right?',menu:[
    ...WEAPONS.map(({id,name,price,desc,respectLevel})=>({id,name,price,desc,respectLevel})),
    ...WEAPONS.filter(v=>v.id!=='melee').map(v=>({id:`ammo-${v.id}`,name:`${v.name} Ammo`,price:30,desc:'60 reserve rounds'}))]}
];
const door=(w,d)=>w.city?.landmarks.find(l=>l.id===d?.landmark);
export function nearestInterior(w){let best=null;for(const d of INTERIORS){const l=door(w,d);if(!l)continue;const distance=Math.hypot(w.player.x-l.x,w.player.z-l.z);if(distance<=8&&(!best||distance<best.distance))best={...d,distance};}return best;}
export function enterInterior(w,id){const d=INTERIORS.find(d=>d.id===id),l=door(w,d);if(!l||w.flags.interior)return false;
  if(!w.player.onFoot)exitVehicle(w);w.flags.interior=id;w.player.onFoot=true;
  w.flags.interiorAnchor={x:l.x,z:l.z};w.player.x=l.x;w.player.z=l.z;w.player.speed=0;
  const keeper={id:`keeper-${id}`,x:l.x,z:l.z-3,y:0,heading:Math.PI/2,speed:0,state:'idle',idleT:Infinity,health:100,dead:false,skin:'#c58c63',clothes:'#437e91',hair:'short',height:1.8};
  w.npcs.push(keeper);w.flags.keeperNpc=keeper.id;say(w,d.keeper,d.keeperLine);pushEvent(w,'enter-interior',{id});return true;
}
export function leaveInterior(w){const d=INTERIORS.find(d=>d.id===w.flags.interior);if(!d)return false;const l=door(w,d);
  w.npcs=w.npcs.filter(n=>n.id!==w.flags.keeperNpc);w.flags.keeperNpc=null;w.flags.interior=null;w.flags.interiorAnchor=null;
  if(l)Object.assign(w.player,collideCircle(w,l.x,l.z+6,0.45));w.player.speed=0;w.flags.interiorCooldown=0.5;pushEvent(w,'exit-interior',{id:d.id});return true;}
export function buyInteriorItem(w,itemId){const d=INTERIORS.find(d=>d.id===w.flags.interior),item=d?.menu.find(i=>i.id===itemId);if(!item)return false;
  if(w.money<item.price){addNotice(w,`Not enough cash for ${item.name} ($${item.price}).`);return false;}
  if(d.id==='gunstore'&&!itemId.startsWith('ammo-'))return buyWeapon(w,itemId);
  if(itemId.startsWith('ammo-')){const ammo=w.player.ammo[itemId.slice(5)];if(!ammo){addNotice(w,'Buy the weapon first.');return false;}ammo.reserve+=60;}
  else if(item.effect==='heal')w.player.health=100;else if(item.effect==='coffee')w.flags.coffeeT=30;else w.player.health=Math.min(100,w.player.health+50);
  addMoney(w,-item.price);addNotice(w,itemId==='lunch'?"Ate at Rosa's Diner. Full health.":`${item.name} bought.`);return true;
}
export function stepInteriors(w,input,dt){w.flags.coffeeT=Math.max(0,(w.flags.coffeeT||0)-dt);w.flags.interiorCooldown=Math.max(0,(w.flags.interiorCooldown||0)-dt);
  if(w.flags.interior){if(input.pressed?.pause||(input.pressed?.interact&&(input.action==='leave'||input.pressed.leave))){leaveInterior(w);return;}
    Object.assign(w.player,w.flags.interiorAnchor,{speed:0,vx:0,vz:0});w.heat=Math.max(0,w.heat-0.2*dt);w.wanted=Math.min(5,Math.floor(w.heat));
    // Police runs earlier: resetting its timers prevents accumulation on subsequent steps.
    for(const c of w.cops)c.arrestT=0;
    const k=w.npcs.find(n=>n.id===w.flags.keeperNpc);if(k){k.x=w.player.x;k.z=w.player.z-3;k.speed=0;k.state='idle';k.idleT=Infinity;}return;}
  if(w.player.onFoot&&!w.flags.interiorCooldown&&input.pressed?.interact){const d=nearestInterior(w);if(d)enterInterior(w,d.id);}}
export function garagePanel(w){const list=slot=>(w.garage[slot]||[]).map(v=>({name:VEHICLE_TYPES.find(t=>t.id===v.type)?.name||v.type,hp:v.health,color:v.color}));return {safehouse:list('safehouse'),penthouse:list('penthouse')};}
export function storeVehicle(w,v){if(!v?.owned){addNotice(w,'Only your own cars go in the garage.');return false;}if(w.player.vehicleId!==v.id||v.driver!=='player'||!w.vehicles.includes(v))return false;
  const slot=['safehouse','penthouse'].find(s=>w.properties[s]&&w.garage[s].length<(s==='safehouse'?1:2));if(!slot){addNotice(w,'Your garage is full.');return false;}
  w.garage[slot].push({type:v.type,health:v.health,color:v.color,owned:true});exitVehicle(w);w.vehicles=w.vehicles.filter(o=>o!==v);return true;}
export function retrieveVehicle(w,slot,index){const list=w.garage[slot],p=w.city?.spawn[slot];if(!w.properties[slot]||!p||!Array.isArray(list)||!Number.isInteger(index)||!list[index])return false;
  if(!w.player.onFoot)exitVehicle(w);const data=list.splice(index,1)[0],pos=collideCircle(w,p.x,p.z+7,1.1);const v=spawnVehicle(w,data.type,pos.x,pos.z,0,{...data,owned:true});enterVehicle(w,v);return v;}
registerSystem('interiors',stepInteriors);
