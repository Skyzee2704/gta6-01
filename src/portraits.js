// Portraits: the six cast faces, drawn on a 64 by 64 canvas from their
// colours — box jaw, hair block, eyes, and a shirt strip. The same drawing
// is used on the title screen, in dialogue, and on the race board, so a
// face the player meets in a mission is the face on the title screen.
// Box faces, like box bodies: no circles, no spheres, nothing alien.
import { CAST } from './data.js';

/** Draw one portrait into a 64x64 canvas context. The face is a box jaw
 *  in the skin tone, hair is a block across the top with side pieces, eyes
 *  are two dark boxes, the mouth is one short box, and the shirt strip at
 *  the bottom carries the character's colour. */
export function drawPortrait(ctx, person, size) {
  const s = size || 64;
  const u = s / 64;
  ctx.clearRect(0, 0, s, s);
  // Background: the character's colour.
  ctx.fillStyle = person.color;
  ctx.fillRect(0, 0, s, s);
  // Face: a box jaw in the skin tone.
  ctx.fillStyle = person.skin;
  ctx.fillRect(18 * u, 12 * u, 28 * u, 34 * u);
  // Hair: a block across the top.
  ctx.fillStyle = person.hair;
  ctx.fillRect(16 * u, 8 * u, 32 * u, 12 * u);
  ctx.fillRect(16 * u, 8 * u, 6 * u, 18 * u);
  ctx.fillRect(42 * u, 8 * u, 6 * u, 18 * u);
  // Eyes.
  ctx.fillStyle = '#14141a';
  ctx.fillRect(23 * u, 26 * u, 5 * u, 4 * u);
  ctx.fillRect(36 * u, 26 * u, 5 * u, 4 * u);
  // Mouth.
  ctx.fillStyle = '#7a3a2a';
  ctx.fillRect(28 * u, 38 * u, 8 * u, 2.5 * u);
  // Shirt strip at the bottom.
  ctx.fillStyle = person.shirt;
  ctx.fillRect(0, 52 * u, s, 12 * u);
  return ctx;
}

/** A portrait canvas for a cast member, by id. Unknown ids fall back to
 *  Milo, so a typo in a dialogue line never blanks the dialogue box. */
export function portraitCanvas(id, size) {
  const person = CAST.find((c) => c.id === id) || CAST[0];
  const canvas = document.createElement('canvas');
  canvas.width = size || 64;
  canvas.height = size || 64;
  drawPortrait(canvas.getContext('2d'), person, size || 64);
  return canvas;
}

/** The cast in title-screen order. */
export function titleCast() {
  return CAST.slice();
}

/** A portrait for a mission giver, by mission id — Kane plans the odd
 *  jobs, Rosa drives the even ones. */
export function giverPortrait(missionId) {
  const giver = missionId % 2 === 1 ? 'kane' : 'rosa';
  return portraitCanvas(giver, 64);
}
