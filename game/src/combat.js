import { CONFIG } from './config.js';
import { registerSystem, collideCircle, damagePlayer, pushEvent } from './world.js';
export function spawnEnemy(w,x,z,opts={}) {
  if(w.enemies.length>=CONFIG.MAX_ENEMIES)return null;
  const id=`enemy-${w.flags.enemySerial=(w.flags.enemySerial||0)+1}`;
  const e={id,x,z,heading:0,health:100,weapon:['pistol','smg','rifle'].includes(opts.weapon)?opts.weapon:'pistol',state:'cover',cover:null,fireT:0,burstLeft:0,strafeDir:1,...opts};
  w.enemies.push(e);return e;
}
export function damageEnemy(w,e,dmg,from='player') {
  if(!w.enemies.includes(e)||e.health<=0||dmg<=0)return;
  e.health=Math.max(0,e.health-dmg);
  if(!e.health){w.stats.kills++;pushEvent(w,'enemy-down',{id:e.id,from});w.enemies=w.enemies.filter(o=>o!==e);}
}
function move(w,e,x,z,dt,speed=3){const d=Math.hypot(x-e.x,z-e.z);if(!d)return;const t=Math.min(d,speed*dt)/d;Object.assign(e,collideCircle(w,e.x+(x-e.x)*t,e.z+(z-e.z)*t,0.45));}
function corner(w,e){let best=null,dist=15;for(const b of w.city?.buildings||[])for(const sx of [-1,1])for(const sz of [-1,1]){const p={x:b.x+sx*(b.w/2+1),z:b.z+sz*(b.d/2+1)},d=Math.hypot(p.x-e.x,p.z-e.z);if(d<dist){dist=d;best=p;}}return best;}
export function stepCombat(w,input,dt){
  w.enemies=w.enemies.filter(e=>e.health>0&&(e.missionId||Math.hypot(e.x-w.player.x,e.z-w.player.z)<=250)).slice(0,CONFIG.MAX_ENEMIES);
  for(const e of w.enemies){const p=w.player,d=Math.hypot(p.x-e.x,p.z-e.z);e.heading=Math.atan2(p.z-e.z,p.x-e.x);e.fireT-=dt;
    if(d>40){e.state='advance';e.cover=null;move(w,e,p.x,p.z,dt);continue;}
    if(d<12){e.state='strafe';move(w,e,e.x-Math.sin(e.heading)*e.strafeDir*3,e.z+Math.cos(e.heading)*e.strafeDir*3,dt);}
    else {e.cover ||= corner(w,e);e.state='cover';if(e.cover&&Math.hypot(e.cover.x-e.x,e.cover.z-e.z)>0.5){move(w,e,e.cover.x,e.cover.z,dt);continue;}e.state='burst';}
    if(w.flags.interior||(!w.mission.active&&w.wanted===0)||p.dead||e.fireT>0)continue;
    if(!e.burstLeft)e.burstLeft=3+Math.floor(w.rng()*3);
    if(w.rng()<Math.max(0.08,Math.min(0.5,0.55-d*0.008)))damagePlayer(w,e.weapon==='rifle'?12:e.weapon==='smg'?8:6,e.id);
    w.projectiles.push({kind:'tracer',x:e.x,y:1.3,z:e.z,vx:Math.cos(e.heading)*90,vz:Math.sin(e.heading)*90,life:Math.max(0.03,d/90)});
    pushEvent(w,'enemy-shot',{x:e.x,z:e.z,id:e.id});e.burstLeft--;e.fireT=e.burstLeft?0.12:1+w.rng();
  }
}
registerSystem('combat',stepCombat);
