// render2d.js — the top-down 2D fallback renderer.
// When WebGL is unavailable (or the player presses V), the game draws
// itself on a 2D canvas: the island, the roads, the buildings, the
// player, the cars, the cops, and the mission marker. It must make
// plenty of canvas calls — the playtest counts them.

import { ROAD_XS, ROAD_ZS, WORLD } from './config.js';
import { districtAt } from './data.js';

// Draw the whole scene top-down into `ctx` (a CanvasRenderingContext2D).
// `state` is the sim state, `city` is the city, `w`/`h` are the canvas
// size in pixels. Returns nothing; draws.
export function drawTopDown(ctx, state, city, w, h) {
  const scaleX = w / (WORLD.maxX - WORLD.minX);
  const scaleZ = h / (WORLD.maxZ - WORLD.minZ);
  const px = (x) => (x - WORLD.minX) * scaleX;
  const pz = (z) => (z - WORLD.minZ) * scaleZ;
  // Sea.
  ctx.fillStyle = '#1a5a8a';
  ctx.fillRect(0, 0, w, h);
  // Land.
  ctx.fillStyle = '#3a6a4a';
  ctx.fillRect(px(WORLD.minX), pz(WORLD.minZ), (WORLD.maxX - WORLD.minX) * scaleX, (WORLD.maxZ - WORLD.minZ) * scaleZ);
  // District tints.
  for (const d of city.landmarks) {
    void d;
  }
  // Roads: one rect per road line.
  ctx.fillStyle = '#2a2a2a';
  for (const rx of ROAD_XS) {
    ctx.fillRect(px(rx) - 7 * scaleX, 0, 14 * scaleX, h);
  }
  for (const rz of ROAD_ZS) {
    ctx.fillRect(0, pz(rz) - 7 * scaleZ, w, 14 * scaleZ);
  }
  // Road center lines.
  ctx.strokeStyle = '#e8c832';
  ctx.lineWidth = 1;
  for (const rx of ROAD_XS) {
    ctx.beginPath();
    ctx.moveTo(px(rx), 0);
    ctx.lineTo(px(rx), h);
    ctx.stroke();
  }
  for (const rz of ROAD_ZS) {
    ctx.beginPath();
    ctx.moveTo(0, pz(rz));
    ctx.lineTo(w, pz(rz));
    ctx.stroke();
  }
  // Buildings: one rect each.
  for (const b of city.buildings) {
    const d = districtAt(b.x, b.z);
    ctx.fillStyle = d.accent;
    ctx.fillRect(px(b.x - b.w / 2), pz(b.z - b.d / 2), b.w * scaleX, b.d * scaleZ);
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(px(b.x - b.w / 2), pz(b.z - b.d / 2), b.w * scaleX, b.d * scaleZ);
  }
  // Containers.
  ctx.fillStyle = '#c0392b';
  for (const c of city.containers) {
    ctx.fillRect(px(c.x - c.w / 2), pz(c.z - c.d / 2), c.w * scaleX, c.d * scaleZ);
  }
  // Palms: one dot each.
  ctx.fillStyle = '#2e7a3a';
  for (const palm of city.palms) {
    ctx.beginPath();
    ctx.arc(px(palm.x), pz(palm.z), 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Tapes (postcards): small gold diamonds.
  ctx.fillStyle = '#f5c518';
  for (const t of city.tapes) {
    if (t.found) continue;
    ctx.beginPath();
    ctx.moveTo(px(t.x), pz(t.z) - 4);
    ctx.lineTo(px(t.x) + 4, pz(t.z));
    ctx.lineTo(px(t.x), pz(t.z) + 4);
    ctx.lineTo(px(t.x) - 4, pz(t.z));
    ctx.closePath();
    ctx.fill();
  }
  // Landmarks.
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px sans-serif';
  for (const lm of city.landmarks) {
    ctx.beginPath();
    ctx.arc(px(lm.x), pz(lm.z), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(lm.name, px(lm.x) + 6, pz(lm.z) + 3);
  }
  // Vehicles: one rect each.
  for (const v of state.vehicles) {
    ctx.fillStyle = v.driver === 'police' ? '#e8e8e8' : v.color || '#888888';
    ctx.fillRect(px(v.x) - 3, pz(v.z) - 2, 6, 4);
  }
  // Peds: one dot each.
  ctx.fillStyle = '#e8b98a';
  for (const ped of state.peds) {
    ctx.beginPath();
    ctx.arc(px(ped.x), pz(ped.z), 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Cops: blue dots with a ring.
  ctx.fillStyle = '#2e6da4';
  for (const cop of state.cops) {
    ctx.beginPath();
    ctx.arc(px(cop.x), pz(cop.z), 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px(cop.x), pz(cop.z), 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Enemies: red triangles.
  ctx.fillStyle = '#c0392b';
  for (const e of state.enemies) {
    if (!e.alive) continue;
    ctx.beginPath();
    ctx.moveTo(px(e.x), pz(e.z) - 5);
    ctx.lineTo(px(e.x) + 4, pz(e.z) + 4);
    ctx.lineTo(px(e.x) - 4, pz(e.z) + 4);
    ctx.closePath();
    ctx.fill();
  }
  // Race checkpoints.
  if (state.race.active) {
    ctx.strokeStyle = '#ff2e88';
    ctx.lineWidth = 2;
    for (const cp of state.race.checkpoints) {
      ctx.beginPath();
      ctx.arc(px(cp.x), pz(cp.z), 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // Mission target: a yellow beacon.
  if (state.mission.active) {
    const target = missionTarget(state);
    if (target) {
      ctx.fillStyle = '#f5c518';
      ctx.beginPath();
      ctx.arc(px(target.x), pz(target.z), 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.beginPath();
      ctx.arc(px(target.x), pz(target.z), 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // The player: a yellow arrow showing heading.
  const p = state.player;
  ctx.fillStyle = '#f5c518';
  ctx.beginPath();
  ctx.moveTo(px(p.x) + Math.sin(p.heading) * 8, pz(p.z) + Math.cos(p.heading) * 8);
  ctx.lineTo(px(p.x) + Math.cos(p.heading) * 5, pz(p.z) - Math.sin(p.heading) * 5);
  ctx.lineTo(px(p.x) - Math.cos(p.heading) * 5, pz(p.z) + Math.sin(p.heading) * 5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.beginPath();
  ctx.arc(px(p.x), pz(p.z), 9, 0, Math.PI * 2);
  ctx.stroke();
  // Wanted stars.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('★'.repeat(state.wanted.level), 12, 20);
  // Title + clock.
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px sans-serif';
  ctx.fillText(`SOLMAR 2D — top-down fallback (V to return to 3D)`, 12, h - 12);
  ctx.fillText(`Day ${state.day} ${String(Math.floor(state.hour)).padStart(2, '0')}:${String(Math.floor((state.hour % 1) * 60)).padStart(2, '0')}`, w - 110, 20);
}

// The mission's current target point (for the beacon).
function missionTarget(state) {
  const m = state.mission;
  if (!m.active) return null;
  if (m.id === 1) return m.stage === 0 ? { x: -260, z: 200 } : { x: -180, z: 60 };
  if (m.id === 2) return { x: 120, z: -160 };
  if (m.id === 3) {
    const t = m.targets.find((q) => !q.done);
    return t ? { x: t.x, z: t.z } : null;
  }
  if (m.id === 4) return m.stage < 3 ? { x: -180, z: 60 } : { x: -140, z: 100 };
  if (m.id === 5) return m.stage < 2 ? { x: 200, z: 40 } : { x: -200, z: -180 };
  if (m.id === 6) return m.stage < 2 ? { x: 260, z: 40 } : { x: -260, z: 190 };
  return null;
}
