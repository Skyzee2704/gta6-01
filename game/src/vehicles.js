// Vehicle definitions + arcade driving physics (x-z plane). Pure sim.
import { VEHICLES } from './data.js';
import { clamp, dist2 } from './random.js';
import { buildingAt } from './city.js';

export function vehicleDef(id) { return VEHICLES.find(v => v.id === id); }
export function createVehicleState(id, model, x, z, heading, color, parked) {
  const def = vehicleDef(model);
  return { id, model, def, x, z, heading, speed: 0, color: color ?? 0x888888, hp: def.hp, parked: !!parked, driver: null, smoke: 0, siren: false, blinker: 0 };
}
export function nearestVehicle(state, x, z, maxD) {
  let best = null, bd = maxD * maxD;
  for (const v of state.vehicles) {
    const d = dist2(v.x, v.z, x, z);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}
export function enterVehicle(state, v, rng) {
  const p = state.player;
  if (v.def.locked) { state.notices.push('Bus is locked. Can\'t be stolen.'); return false; }
  const witnessed = state.peds.some(q => q.alive && dist2(q.x, q.z, p.x, p.z) < 90000) || state.cops.some(c => dist2(c.x, c.z, p.x, p.z) < 270400);
  if (v.parked || !v.driver) {
    if (v.driver === 'civilian') {
      // Driver flees on foot.
      v.driver = null;
      state.stats.steals += 1;
      if (witnessed) { state.wanted.heat = clamp(state.wanted.heat + 0.25, 0, 5.99); state.wanted.level = Math.min(5, Math.floor(state.wanted.heat)); state.wanted.spotted = true; }
    } else if (v.parked) {
      // Stealing a parked car is still a crime when someone sees it.
      state.stats.steals += 1;
      if (witnessed) { state.wanted.heat = clamp(state.wanted.heat + 0.25, 0, 5.99); state.wanted.level = Math.min(5, Math.floor(state.wanted.heat)); state.wanted.spotted = true; }
    }
  } else if (v.driver === 'civilian') {
    v.driver = null; state.stats.steals += 1;
    if (witnessed) { state.wanted.heat = clamp(state.wanted.heat + 0.25, 0, 5.99); state.wanted.level = Math.min(5, Math.floor(state.wanted.heat)); state.wanted.spotted = true; }
  }
  if (v.model === 'cruiser' && state.wanted.level > 0) {
    state.wanted.heat = clamp(state.wanted.heat + 0.25, 0, 5.99); state.wanted.level = Math.min(5, Math.floor(state.wanted.heat));
  }
  v.parked = false; v.driver = 'player';
  p.onFoot = false; p.vehicleId = v.id; p.x = v.x; p.z = v.z; p.heading = v.heading;
  return true;
}
export function exitVehicle(state) {
  const p = state.player;
  const v = state.vehicles.find(q => q.id === p.vehicleId);
  if (!v) { p.onFoot = true; p.vehicleId = -1; return; }
  v.driver = null; v.speed = 0;
  p.onFoot = true; p.vehicleId = -1;
  p.x = v.x + Math.cos(v.heading) * 3; p.z = v.z - Math.sin(v.heading) * 3;
  p.heading = v.heading;
}
export function updateVehicle(state, city, dt, input) {
  const p = state.player;
  const v = state.vehicles.find(q => q.id === p.vehicleId);
  if (!v) { p.onFoot = true; p.vehicleId = -1; return; }
  const grip = state.weather.kind === 'rain' ? 0.85 : 1;
  const top = v.def.top * (input.run ? 1 : 1);
  if (input.forward) v.speed += v.def.accel * dt;
  else if (input.back) v.speed -= v.def.accel * 0.7 * dt;
  else v.speed -= Math.sign(v.speed) * 6 * dt;
  if (input.handbrake) { v.speed *= (1 - 1.4 * dt); }
  v.speed = clamp(v.speed, -10, top);
  if (Math.abs(v.speed) < 0.05 && !input.forward && !input.back) v.speed = 0;
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const turnRate = 2.2 * v.def.grip * grip / (1 + Math.abs(v.speed) * 0.025);
  v.heading += steer * turnRate * dt * (v.speed >= 0 ? 1 : -1) * (input.handbrake ? 1.5 : 1);
  const nx = v.x + Math.sin(v.heading) * v.speed * dt;
  const nz = v.z + Math.cos(v.heading) * v.speed * dt;
  if (buildingAt(city, nx, nz)) {
    // Slide along the wall instead of wedging: try x-only, then z-only.
    if (!buildingAt(city, nx, v.z)) { v.x = nx; }
    else if (!buildingAt(city, v.x, nz)) { v.z = nz; }
    else { v.speed *= -0.25; state.mission.stats.crashes += 1; if (Math.abs(v.speed) > 8) v.hp -= 5; }
  } else {
    v.x = nx; v.z = nz;
  }
  // Car-car bumps.
  for (const o of state.vehicles) {
    if (o === v || o.driver === 'traffic') continue;
    if (dist2(o.x, o.z, v.x, v.z) < 16) { v.speed *= 0.7; o.speed = (o.speed || 0) * 0.5; }
  }
  if (v.x < -318) v.x = -318; if (v.x > 318) v.x = 318;
  if (v.z < -238) v.z = -238; if (v.z > 278) v.z = 278;
  p.x = v.x; p.z = v.z; p.heading = v.heading; p.speed = Math.abs(v.speed);
  state.mission.stats.topSpeed = Math.max(state.mission.stats.topSpeed, Math.abs(v.speed) * 3.6);
  if (v.hp < 40) v.smoke = Math.min(1, v.smoke + dt);
  if (v.hp <= 0) { v.hp = 0; exitVehicle(state); state.notices.push('Mobilmu meledak!'); }
  if (input.enterVehicle) exitVehicle(state);
}
export function spawnTrafficCar(state, city, rng) {
  const models = VEHICLES.filter(v => v.traffic);
  const model = models[Math.floor(rng() * models.length)];
  const id = state.vehicles.length;
  const v = createVehicleState(id, model.id, 0, 0, 0, Math.floor(rng() * 0xffffff), false);
  v.driver = 'traffic';
  return v;
}
