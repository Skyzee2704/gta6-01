// Interiors: the restaurants, bars, gun shop and homes the player can
// walk into. Each one is a small room off the street with its own purpose:
// eat, drink, buy guns, sleep, save.
import { INTERIORS } from './data.js';
import { dist2d } from './random.js';

export { INTERIORS };

/** The interior whose door the player is standing at, or null. */
export function interiorAt(x, z) {
  for (const place of INTERIORS) {
    if (dist2d(x, z, place.x, place.y) < 5) return place;
  }
  return null;
}

/** Enter a place: returns its room description for the HUD. */
export function enterInterior(place) {
  return {
    id: place.id, name: place.name, kind: place.kind, desc: place.desc,
    // A small room: 14 by 10 metres, door at the south wall.
    room: { w: 14, d: 10, doorX: 0, doorZ: 5 },
  };
}

/** What the player can do inside each kind of place. */
export function interiorActions(kind) {
  if (kind === 'restaurant') return ['Eat ($12, +10 health)', 'Sit and watch the street'];
  if (kind === 'bar') return ['Drink ($8)', 'Play pool', 'Talk to Kane'];
  if (kind === 'gunshop') return ['Buy weapons', 'Buy ammo'];
  if (kind === 'home') return ['Sleep and save', 'Change clothes'];
  return ['Look around'];
}

/** Eating restores health; returns the health gained. */
export function eatMeal(player, cash) {
  if (cash < 12 || player.health >= 100) return { gained: 0, cash };
  const gained = Math.min(10, 100 - player.health);
  player.health += gained;
  return { gained, cash: cash - 12 };
}
