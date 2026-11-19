// SOLMAR 3D — combat: hit detection, enemy chevron + hit marker data,
// corpses with blood pools (cleaned after 25 s), damage numbers, cover
// checks. Pure logic; the renderer draws markers from the returned state.
import { createRng } from './random.js';
import { spreadFor } from './weapons.js';

export function createCombat(seed = 1) {
  return {
    rng: createRng(seed * 23 + 5),
    corpses: [],
    markers: [],
    hits: [],
    blood: [],
  };
}

export function distance2D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function fireAt(combat, shooter, target, weapon) {
  const dist = distance2D(shooter, target);
  const inRange = dist <= weapon.def.range;
  if (!inRange) return { hit: false, reason: 'out-of-range', distance: dist };
  const base = Math.max(0.2, 1 - dist / weapon.def.range);
  const hitChance = base * (1 - spreadFor(weapon.def.id) * 0.5);
  const roll = combat.rng.next();
  const hit = roll < hitChance;
  const result = { hit, distance: dist, weapon: weapon.def.id, target: target.id || 'target' };
  if (hit) {
    const damage = weapon.def.damage * (0.85 + combat.rng.next() * 0.3);
    target.health = Math.max(0, (target.health || 100) - damage);
    result.damage = Math.round(damage);
    result.killed = target.health <= 0;
    result.healthLeft = target.health;
    combat.hits.push({ x: target.x, y: target.y, damage: result.damage, t: 0 });
    if (result.killed) {
      addCorpse(combat, target);
    }
  }
  return result;
}

export function addCorpse(combat, target) {
  combat.corpses.push({
    x: target.x,
    y: target.y,
    heading: target.heading || 0,
    t: 0,
    name: target.name || 'Vulture',
  });
  combat.blood.push({ x: target.x, y: target.y, t: 0, size: 1.2 });
  return combat.corpses.length;
}

export function updateCombat(combat, dt) {
  for (const c of combat.corpses) c.t += dt;
  for (const b of combat.blood) b.t += dt;
  for (const h of combat.hits) h.t += dt;
  combat.corpses = combat.corpses.filter((c) => c.t < 25);
  combat.blood = combat.blood.filter((b) => b.t < 25);
  combat.hits = combat.hits.filter((h) => h.t < 1.2);
  return combat;
}

export function targetChevron(target, player) {
  const dist = distance2D(player, target);
  return {
    x: target.x,
    y: target.y,
    above: 2.4,
    visible: dist < 90 && (target.health || 0) > 0,
    color: 0xff2e2e,
    distance: Math.round(dist),
  };
}

export function hitMarkerData(hit) {
  return {
    show: hit.hit,
    killed: hit.killed || false,
    damage: hit.damage || 0,
    t: 0,
  };
}

export function meleeAttack(attacker, target) {
  const dist = distance2D(attacker, target);
  if (dist > 2.2) return { hit: false, reason: 'too-far', distance: dist };
  target.health = Math.max(0, (target.health || 100) - 25);
  return { hit: true, damage: 25, killed: target.health <= 0, healthLeft: target.health };
}

export function explosionAt(combat, x, y, radius, damage) {
  const affected = [];
  for (const c of combat.corpses) {
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < radius) affected.push({ kind: 'corpse', id: c.name, distance: d });
  }
  return { x, y, radius, damage, affected };
}
