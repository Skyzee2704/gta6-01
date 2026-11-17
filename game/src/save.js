// Save and load: one localStorage slot holding the player's progress —
// money, respect, which missions are done, where the player stands, and the
// best haul. Saved automatically when a mission completes and by hand from
// the pause menu; loaded when the player picks Continue.
import { SAVE_KEY } from './config.js';

export function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(world) {
  try {
    const data = {
      version: 1,
      money: world.player.money,
      respect: world.player.respect,
      completed: world.mission.completed.slice(),
      nextMission: nextMissionIndex(world),
      playerX: Math.round(world.player.x),
      playerY: Math.round(world.player.y),
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function nextMissionIndex(world) {
  const done = world.mission.completed;
  for (let i = 0; i < 6; i += 1) {
    if (!done.includes(i)) return i;
  }
  return 6;
}

export function applySave(world, data) {
  if (!data) return false;
  world.player.money = typeof data.money === 'number' ? data.money : 0;
  world.player.respect = typeof data.respect === 'number' ? data.respect : 0;
  if (Array.isArray(data.completed)) {
    world.mission.completed = data.completed.filter((n) => Number.isInteger(n) && n >= 0 && n < 6);
  }
  if (typeof data.playerX === 'number' && typeof data.playerY === 'number') {
    world.player.x = data.playerX;
    world.player.y = data.playerY;
    world.camera.x = data.playerX;
    world.camera.y = data.playerY;
  }
  return true;
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be off: nothing to clear then.
  }
}
