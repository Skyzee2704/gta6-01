import { registerSystem, addMoney, addRespect, addNotice, clearWanted } from './world.js';
import { randomRoadPoint } from './city.js';
import { giveWeapon } from './weapons.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function taxiMarker(w){const t=w.flags.taxi;return t?{x:t.x,z:t.z,color:t.stage==='pickup'?'#ffdb37':'#44df81'}:null;}
function clearTaxi(w){const t=w.flags.taxi;if(t)w.npcs=w.npcs.filter(n=>n.id!==t.passengerId);w.flags.taxi=null;}
export function stepSide(w,input,dt){const p=w.player;
  const cards=w.pickups.filter(c=>c.kind==='postcard');for(const c of cards)if(!c.taken&&!c.collected&&dist(p,c)<3){c.taken=true;c.collected=true;addMoney(w,500);addRespect(w,60);addNotice(w,`Postcard: ${c.title||c.id} +$500`);}
  if(cards.length>=20&&cards.every(c=>c.taken||c.collected)&&!w.flags.postcardBonus){w.flags.postcardBonus=true;addMoney(w,5000);giveWeapon(w,'sniper');addNotice(w,'All 20 postcards! Bonus 5000 dollars + free Sniper Longeye 308.');}
  if(!w.city)return;const v=w.vehicles.find(v=>v.id===p.vehicleId),entered=v?.id!==w.flags.lastSideVehicle;w.flags.lastSideVehicle=v?.id||null;
  if(v?.type==='taxi'&&entered&&!w.flags.taxi){const pos=randomRoadPoint(w.rng,w.city),id=`taxi-passenger-${w.flags.taxiSerial=(w.flags.taxiSerial||0)+1}`;w.npcs.push({id,x:pos.x,z:pos.z,health:100,state:'idle',idleT:1e9,dead:false});w.flags.taxi={stage:'pickup',x:pos.x,z:pos.z,timer:90,vehicleId:v.id,passengerId:id};addNotice(w,'Solmar Cab: pick up the passenger at the yellow marker.');}
  const t=w.flags.taxi;if(t){t.timer-=dt;if(t.timer<=0){addNotice(w,'Cab: passenger gave up, too slow.');clearTaxi(w);}else if(v?.type==='taxi'&&v.id===t.vehicleId&&dist(p,t)<6){if(t.stage==='pickup'){const dest=randomRoadPoint(w.rng,w.city);t.distance=dist(t,dest);t.stage='dropoff';t.x=dest.x;t.z=dest.z;t.timer=120;w.npcs=w.npcs.filter(n=>n.id!==t.passengerId);addNotice(w,'Passenger aboard! Drop them at the green marker.');}else{const fare=50+Math.round(t.distance*0.25)+Math.round(t.timer*5);addMoney(w,fare);addRespect(w,20);addNotice(w,`Cab fare done: +$${fare} + 20 respect.`);clearTaxi(w);}}}
  const spray=w.city.landmarks.find(l=>l.id==='paynspray')||w.city.spawn.respray;if(v&&spray&&dist(v,spray)<10&&input.pressed?.interact){const cost=150+w.wanted*100;if(w.money>=cost){addMoney(w,-cost);clearWanted(w,'respray');let color;do{color='#'+Math.floor(w.rng()*0x1000000).toString(16).padStart(6,'0');}while(color===v.color);v.color=color;addNotice(w,`Pay n Spray: fresh paint, wanted cleared (-$${cost}).`);}else addNotice(w,`Not enough cash for a respray ($${cost}).`);}
}
registerSystem('side',stepSide);
