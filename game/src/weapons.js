import { WEAPONS, VEHICLE_TYPES } from './data.js';
import { registerSystem, addNotice, addMoney, addHeat, pushEvent, spawnParticles, damagePlayer } from './world.js';
import { damageVehicle } from './vehicles.js';
import { damageEnemy } from './combat.js';
export const currentWeapon=w=>WEAPONS.find(v=>v.id===w.player.weapon)||WEAPONS[0];
export function giveWeapon(w,id,withAmmo=true){const v=WEAPONS.find(v=>v.id===id);if(!v)return false;const a=w.player.ammo[id];w.player.ammo[id]=a||{mag:withAmmo?v.magSize:0,reserve:withAmmo?v.reserveMax:0};if(a&&withAmmo){a.mag=v.magSize;a.reserve=v.reserveMax;}return true;}
export function switchWeapon(w,dir){const owned=WEAPONS.filter(v=>w.player.ammo[v.id]);if(!owned.length)return;const i=owned.findIndex(v=>v.id===w.player.weapon);w.player.weapon=owned[((i+(dir<0?-1:1))%owned.length+owned.length)%owned.length].id;}
export function buyWeapon(w,id){const v=WEAPONS.find(v=>v.id===id);if(!v)return false;if(w.money<v.price){addNotice(w,`Not enough cash for ${v.name} ($${v.price}).`);return false;}if(w.respectLevel<v.respectLevel){addNotice(w,`${v.name} needs Respect level ${v.respectLevel}.`);return false;}addMoney(w,-v.price);giveWeapon(w,id);addNotice(w,`${v.name} bought!`);return true;}
export function reloadWeapon(w){const v=currentWeapon(w),a=w.player.ammo[v.id];if(!a||v.id==='melee')return false;const n=Math.min(v.magSize-a.mag,a.reserve);if(n<=0)return false;a.mag+=n;a.reserve-=n;pushEvent(w,'reload',{weapon:v.id});return true;}
function hurtNpc(w,n,dmg){if(n.dead)return;n.health=Math.max(0,n.health-dmg);n.state='flee';n.panicT=6;if(!n.health){n.dead=true;w.stats.kills++;addHeat(w,2,'civilian-killed');addNotice(w,'Civilian killed. The police are on alert.');}}
function ray(w,angle,range,damage,arc){const p=w.player,dx=Math.cos(angle),dz=Math.sin(angle);let best=null,nearest=range;
  for(const [kind,list] of [['enemy',w.enemies],['npc',w.npcs],['vehicle',w.vehicles]])for(const t of list){if(t.dead||t.health<=0||t.id===p.vehicleId)continue;const x=t.x-p.x,z=t.z-p.z,along=x*dx+z*dz;if(along<0||along>range)continue;let reach=along;
    if(kind==='vehicle'){const def=VEHICLE_TYPES.find(v=>v.id===t.type),half=(def?.length||4.5)/2,ux=Math.cos(t.heading||0),uz=Math.sin(t.heading||0);const cross=x*dz-z*dx,den=ux*dz-uz*dx;const s=Math.abs(den)>1e-8?Math.max(-half,Math.min(half,-cross/den)):0;const xx=x+s*ux,zz=z+s*uz;reach=xx*dx+zz*dz;if(reach<0||reach>range||Math.abs(xx*dz-zz*dx)>(def?.width||2)/2)continue;
    }else if(Math.abs(Math.atan2(Math.sin(Math.atan2(z,x)-angle),Math.cos(Math.atan2(z,x)-angle)))>arc)continue;
    if(reach<nearest){nearest=reach;best={kind,t};}}
  if(best){if(best.kind==='enemy')damageEnemy(w,best.t,damage);else if(best.kind==='npc')hurtNpc(w,best.t,damage);else damageVehicle(w,best.t,damage,'gunfire');}
  return !!best;
}
export function fireWeapon(w){const p=w.player,v=currentWeapon(w);if(p.dead||p.busted||(w.flags.weaponCooldown||0)>0)return false;const a=p.ammo[v.id];if(!a&&v.id!=='melee')return false;
  w.flags.weaponCooldown=1/v.fireRate;
  if(v.id!=='melee'&&a.mag<=0){pushEvent(w,'dry-click');if(a.reserve>0)reloadWeapon(w);return false;}
  if(v.id!=='melee')a.mag--;w.stats.shots++;let hit=false;
  if(v.id==='molotov'){const flight=1.5,speed=v.range/flight;w.projectiles.push({kind:'molotov',x:p.x,y:1.5,z:p.z,vx:Math.cos(p.heading)*speed,vz:Math.sin(p.heading)*speed,vy:6,gravity:9.333333333,life:flight});(w.flags.fires ||= []).push({x:p.x+Math.cos(p.heading)*v.range,z:p.z+Math.sin(p.heading)*v.range,delay:flight,life:4,particleT:0});}
  else {const count=v.id==='shotgun'?8:1;for(let i=0;i<count;i++){const angle=p.heading+(w.rng()-0.5)*(v.id==='shotgun'?0.36:v.id==='sniper'?0.002:0.025);hit=ray(w,angle,v.id==='melee'?2.5:v.range,v.id==='shotgun'?12:v.damage,v.id==='melee'?0.8:0.12)||hit;if(v.id!=='melee')w.projectiles.push({kind:'tracer',x:p.x,y:1.3,z:p.z,vx:Math.cos(angle)*160,vz:Math.sin(angle)*160,life:v.range/160});}}
  if(hit)w.stats.hits++;spawnParticles(w,p.x+Math.cos(p.heading),1.3,p.z+Math.sin(p.heading),'muzzle',2);pushEvent(w,'shot',{x:p.x,z:p.z,weapon:v.id});return true;
}
export function stepWeapons(w,input,dt){w.flags.weaponCooldown=Math.max(0,(w.flags.weaponCooldown||0)-dt);w.player.aiming=!!input.shoot&&w.player.onFoot;
  if(input.pressed?.weaponNext)switchWeapon(w,1);if(input.pressed?.weaponPrev)switchWeapon(w,-1);if(input.pressed?.reload)reloadWeapon(w);
  if(input.pressed?.shoot||(input.shoot&&['smg','rifle'].includes(w.player.weapon)))fireWeapon(w);
  for(const f of w.flags.fires||[]){const wait=Math.max(0,f.delay);f.delay-=dt;const active=Math.min(f.life,Math.max(0,dt-wait));if(!active)continue;f.life-=active;f.particleT-=active;if(f.particleT<=0){spawnParticles(w,f.x,0,f.z,'fire',4);f.particleT=0.15;}const near=t=>Math.hypot(t.x-f.x,t.z-f.z)<4;
    if(near(w.player))damagePlayer(w,25*active,'fire');for(const e of [...w.enemies])if(near(e))damageEnemy(w,e,25*active,'fire');for(const n of w.npcs)if(near(n))hurtNpc(w,n,25*active);for(const v of [...w.vehicles])if(near(v))damageVehicle(w,v,25*active,'fire');}
  w.flags.fires=(w.flags.fires||[]).filter(f=>f.life>0);
}
registerSystem('weapons',stepWeapons);
