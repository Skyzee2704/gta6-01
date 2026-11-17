// Combat on foot: fists up close, a pistol at range, and the Vultures who
// shoot back. Hits are instant (hitscan) with a tracer the renderer draws;
// damage goes through armor first, then health. Enemies are simple: they
// close to range, take cover in nothing, and fire in bursts.
import {
  PISTOL_MAG, PISTOL_RESERVE, PISTOL_DAMAGE, PISTOL_RANGE,
  FIST_DAMAGE, FIST_RANGE, ENEMY_HP,
} from './config.js';
import { range, chance } from './random.js';
import { buildingHit, pushOutOfBuildings } from './city.js';

let nextEnemyId = 1;

export function createLoadout() {
  return {
    weapon: 'fists', // 'fists' | 'pistol'
    pistolMag: PISTOL_MAG,
    pistolReserve: PISTOL_RESERVE,
    cooldown: 0,
    reloadTimer: 0,
    reloading: false,
  };
}

export function createEnemy(rng, x, y) {
  return {
    id: nextEnemyId,
    x, y,
    angle: 0,
    hp: ENEMY_HP,
    maxHp: ENEMY_HP,
    speed: 150,
    shootTimer: range(rng, 0.5, 1.5),
    burst: 0,
    state: 'hunt',
  };
}

export function resetEnemyIds() {
  nextEnemyId = 1;
}

// A straight line from (x0, y0) to (x1, y1) is clear when no building sits
// between the two points. Sampled in steps; cheap and good enough for a
// top-down shooter.
export function lineOfSightClear(city, x0, y0, x1, y1) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 24));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    if (buildingHit(city, x, y, 4)) return false;
  }
  return true;
}

// Armor soaks damage first; whatever is left comes off health. Returns the
// damage actually applied.
export function applyDamage(target, amount) {
  let left = amount;
  if (target.armor > 0) {
    const soaked = Math.min(target.armor, left);
    target.armor -= soaked;
    left -= soaked;
  }
  target.hp = Math.max(0, target.hp - left);
  return amount;
}

// Fire the pistol: one hitscan shot toward the aim point. The first enemy
// (or traffic car) in the way takes the hit; a wall stops the bullet.
export function firePistol(world, fromX, fromY, aimX, aimY) {
  const loadout = world.player.loadout;
  if (loadout.cooldown > 0 || loadout.reloading) return null;
  if (loadout.pistolMag <= 0) {
    startReload(world);
    return null;
  }
  loadout.pistolMag -= 1;
  loadout.cooldown = 0.28;
  const angle = Math.atan2(aimY - fromY, aimX - fromX);
  const rangeEnd = PISTOL_RANGE;
  let endX = fromX + Math.cos(angle) * rangeEnd;
  let endY = fromY + Math.sin(angle) * rangeEnd;
  let hitEnemy = null;
  let hitDist = rangeEnd;
  // Clip the shot at the first building it meets.
  const steps = Math.ceil(rangeEnd / 20);
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const x = fromX + Math.cos(angle) * rangeEnd * t;
    const y = fromY + Math.sin(angle) * rangeEnd * t;
    if (buildingHit(world.city, x, y, 4)) {
      endX = x;
      endY = y;
      hitDist = rangeEnd * t;
      break;
    }
  }
  for (const enemy of world.enemies) {
    if (enemy.hp <= 0) continue;
    const dx = enemy.x - fromX;
    const dy = enemy.y - fromY;
    const along = dx * Math.cos(angle) + dy * Math.sin(angle);
    if (along < 0 || along > hitDist) continue;
    const side = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
    if (side > 20) continue;
    if (along < hitDist) {
      hitDist = along;
      hitEnemy = enemy;
      endX = enemy.x;
      endY = enemy.y;
    }
  }
  if (hitEnemy) {
    hitEnemy.hp -= PISTOL_DAMAGE;
    world.events.push({ type: 'enemyHit', x: hitEnemy.x, y: hitEnemy.y });
    if (hitEnemy.hp <= 0) {
      world.events.push({ type: 'enemyDown', x: hitEnemy.x, y: hitEnemy.y });
    }
  }
  world.events.push({ type: 'shot', x: fromX, y: fromY, endX, endY, hit: hitEnemy !== null });
  return { hit: hitEnemy, endX, endY };
}

export function startReload(world) {
  const loadout = world.player.loadout;
  if (loadout.reloading || loadout.pistolMag >= PISTOL_MAG || loadout.pistolReserve <= 0) return;
  loadout.reloading = true;
  loadout.reloadTimer = 1.1;
}

export function finishReload(world) {
  const loadout = world.player.loadout;
  const need = PISTOL_MAG - loadout.pistolMag;
  const taken = Math.min(need, loadout.pistolReserve);
  loadout.pistolMag += taken;
  loadout.pistolReserve -= taken;
  loadout.reloading = false;
  loadout.reloadTimer = 0;
}

// A punch: short range, quick, and it knocks the target back a step.
export function punch(world, fromX, fromY, aimAngle) {
  const loadout = world.player.loadout;
  if (loadout.cooldown > 0) return null;
  loadout.cooldown = 0.38;
  let hitEnemy = null;
  for (const enemy of world.enemies) {
    if (enemy.hp <= 0) continue;
    const dx = enemy.x - fromX;
    const dy = enemy.y - fromY;
    const dist = Math.hypot(dx, dy);
    if (dist > FIST_RANGE) continue;
    const toTarget = Math.atan2(dy, dx);
    let diff = Math.abs(toTarget - aimAngle);
    if (diff > Math.PI) diff = Math.PI * 2 - diff;
    if (diff > 1.1) continue;
    hitEnemy = enemy;
    break;
  }
  if (hitEnemy) {
    hitEnemy.hp -= FIST_DAMAGE;
    hitEnemy.x += Math.cos(aimAngle) * 26;
    hitEnemy.y += Math.sin(aimAngle) * 26;
    world.events.push({ type: 'enemyHit', x: hitEnemy.x, y: hitEnemy.y });
    if (hitEnemy.hp <= 0) {
      world.events.push({ type: 'enemyDown', x: hitEnemy.x, y: hitEnemy.y });
    }
  }
  world.events.push({ type: 'punch', x: fromX, y: fromY, angle: aimAngle, hit: hitEnemy !== null });
  return hitEnemy;
}

// Enemy behaviour: walk toward the player until in range, then fire in
// short bursts with a pause between them. They miss more at long range.
export function updateEnemies(world, dt, rng) {
  const player = world.player;
  for (const enemy of world.enemies) {
    if (enemy.hp <= 0) continue;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    enemy.angle = Math.atan2(dy, dx);
    if (dist > 300) {
      enemy.x += Math.cos(enemy.angle) * enemy.speed * dt;
      enemy.y += Math.sin(enemy.angle) * enemy.speed * dt;
    } else if (dist < 130) {
      enemy.x -= Math.cos(enemy.angle) * enemy.speed * 0.5 * dt;
      enemy.y -= Math.sin(enemy.angle) * enemy.speed * 0.5 * dt;
    }
    // Vultures walk the streets, not through walls.
    const body = { x: enemy.x, y: enemy.y, r: 12 };
    if (pushOutOfBuildings(world.city, body)) {
      enemy.x = body.x;
      enemy.y = body.y;
    }
    enemy.shootTimer -= dt;
    if (enemy.shootTimer <= 0 && dist < 420 && player.hp > 0) {
      if (lineOfSightClear(world.city, enemy.x, enemy.y, player.x, player.y)) {
        enemy.burst = 3;
        enemy.shootTimer = range(rng, 1.4, 2.4);
      } else {
        enemy.shootTimer = 0.6;
      }
    }
    if (enemy.burst > 0) {
      enemy.burst -= dt * 6;
      if (Math.floor(enemy.burst) !== Math.floor(enemy.burst + dt * 6)) {
        const hitChance = dist < 180 ? 0.34 : dist < 320 ? 0.2 : 0.1;
        const muzzleX = enemy.x + Math.cos(enemy.angle) * 18;
        const muzzleY = enemy.y + Math.sin(enemy.angle) * 18;
        if (chance(rng, hitChance)) {
          applyDamage(player, 9);
          world.events.push({ type: 'playerHit', x: player.x, y: player.y });
        }
        world.events.push({ type: 'shot', x: muzzleX, y: muzzleY, endX: player.x, endY: player.y, hit: false, enemy: true });
      }
    }
  }
  world.enemies = world.enemies.filter((e) => e.hp > 0);
}
