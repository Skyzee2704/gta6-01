// SOLMAR 3D — the HUD. One 2D canvas over the 3D view. Layout is fixed:
// mission banner top-left; cash, wanted stars and the PCPD response
// list top-right; weapon slots and the held weapon's picture bottom-
// left; vehicle card bottom-right; radio now-playing centre-bottom;
// dialog with a 64×64 portrait above the radio; crosshair and hit
// marker dead centre. No Fists slot — five weapons, as designed.
import { weaponSpec, weaponShape } from './weapons.js';
import { missionObjectiveText } from './missions.js';
import { policeResponse } from './police.js';
import { drawPortrait, castById } from './portraits.js';
import { respectTitleFor, completionPercent } from './economy.js';

const GOLD = '#ffd34a';
const CREAM = '#f2ead8';
const DARK = 'rgba(16,14,24,0.82)';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = DARK;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,211,74,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
}

function star(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = GOLD;
    ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(242,234,216,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export function drawHUD(ctx, state, W, H, project) {
  const p = state.player;
  ctx.clearRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  // Damage vignette when hurt.
  if (p.health < 40) {
    const a = (40 - p.health) / 40 * 0.35 * (0.7 + 0.3 * Math.sin(state.time.elapsed * 6));
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    g.addColorStop(0, 'rgba(200,20,20,0)');
    g.addColorStop(1, `rgba(200,20,20,${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // Mission banner, top-left.
  const mission = missionObjectiveText(state);
  if (mission) {
    // The banner grows when a mission has BOTH a countdown and a
    // marker: the timer sits on its own line above the marker, never
    // on top of it (mission 6 used to draw both at y=86).
    const twoLines = mission.timer !== null && mission.marker;
    panel(ctx, 16, 16, 340, twoLines ? 96 : 78);
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 15px Arial';
    ctx.fillText(`MISSION ${mission.number}/6 — ${mission.mission}`, 28, 40);
    ctx.fillStyle = CREAM;
    ctx.font = '13px Arial';
    ctx.fillText(mission.objective, 28, 62);
    if (mission.timer !== null) {
      ctx.fillStyle = '#ff5a4a';
      ctx.font = 'bold 18px Arial';
      ctx.fillText(`ESCAPE ${mission.timer}s`, 28, 86);
    }
    if (mission.marker) {
      const d = Math.round(Math.hypot(p.x - mission.marker.x, p.z - mission.marker.z));
      ctx.fillStyle = '#7ad9ff';
      ctx.font = '12px Arial';
      ctx.fillText(`${mission.marker.label} — ${d}m`, 28, twoLines ? 104 : 86);
    }
  }
  // Cash, wanted stars, PCPD response — top-right.
  const rx = W - 296;
  panel(ctx, rx, 16, 280, 60 + (p.wanted > 0 ? policeResponse(state).length * 18 + 8 : 0));
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`$${p.cash.toLocaleString('en-US')}`, W - 28, 46);
  ctx.textAlign = 'left';
  for (let i = 0; i < 5; i++) star(ctx, rx + 18 + i * 26, 58, 10, i < p.wanted);
  if (p.wanted > 0) {
    ctx.font = '12px Arial';
    policeResponse(state).forEach((u, i) => {
      ctx.fillStyle = u.kind === 'heli' ? '#ff5a4a' : CREAM;
      ctx.fillText(`${u.callsign}  ${u.dist}m  ${u.state}`, rx + 12, 84 + i * 18);
    });
  }
  // Health / armor bars, under the cash panel.
  ctx.fillStyle = 'rgba(16,14,24,0.7)';
  ctx.fillRect(rx, 84 + (p.wanted > 0 ? policeResponse(state).length * 18 + 8 : 0), 280, 10);
  ctx.fillStyle = '#4ad84a';
  ctx.fillRect(rx, 84 + (p.wanted > 0 ? policeResponse(state).length * 18 + 8 : 0), 280 * (p.health / 100), 10);
  // Weapon slots, bottom-left: five slots, no Fists.
  const slots = ['pistol', 'smg', 'vk47', 'shotgun', 'sniper'];
  const slotY = H - 92;
  slots.forEach((id, i) => {
    const x = 16 + i * 64;
    const owned = state.weapons.owned.includes(id);
    const current = state.weapons.current === id;
    ctx.fillStyle = current ? 'rgba(255,211,74,0.9)' : DARK;
    ctx.fillRect(x, slotY, 56, 56);
    ctx.strokeStyle = current ? GOLD : 'rgba(242,234,216,0.4)';
    ctx.strokeRect(x + 0.5, slotY + 0.5, 56, 56);
    if (owned) {
      drawWeaponPicture(ctx, id, x + 6, slotY + 8, 44, 22, current ? '#16121a' : CREAM);
      ctx.fillStyle = current ? '#16121a' : CREAM;
      ctx.font = 'bold 10px Arial';
      // Short tag only ("VK-47", not "VK-47 RIFLE"): the full name is
      // already in the weapon card, and the long name overflowed the
      // 56 px slot into the next one.
      ctx.fillText(weaponSpec(id).name.split(' ')[0].toUpperCase(), x + 5, slotY + 48);
    } else {
      ctx.fillStyle = 'rgba(242,234,216,0.35)';
      ctx.font = '10px Arial';
      ctx.fillText('LOCKED', x + 8, slotY + 32);
    }
  });
  // Held weapon: picture + ammo, big, above the slots.
  const spec = weaponSpec(state.weapons.current);
  const ammo = state.weapons.ammo[state.weapons.current];
  panel(ctx, 16, H - 170, 220, 66);
  drawWeaponPicture(ctx, state.weapons.current, 28, H - 158, 88, 34, CREAM);
  ctx.fillStyle = CREAM;
  ctx.font = 'bold 15px Arial';
  ctx.fillText(spec.name, 124, H - 140);
  ctx.font = 'bold 20px Arial';
  ctx.fillStyle = ammo.mag === 0 ? '#ff5a4a' : GOLD;
  ctx.fillText(`${ammo.mag} / ${ammo.reserve}`, 124, H - 114);
  if (state.weapons.reloadTimer > 0) {
    ctx.fillStyle = '#7ad9ff';
    ctx.font = '12px Arial';
    ctx.fillText('RELOADING…', 28, H - 114);
  }
  // Vehicle card, bottom-right — or on-foot status.
  panel(ctx, W - 236, H - 92, 220, 76);
  if (!p.onFoot && p.vehicleId && p.vehicleId !== 'heli') {
    const v = state.vehicles.find((x) => x.id === p.vehicleId);
    if (v) {
      ctx.fillStyle = GOLD;
      ctx.font = 'bold 15px Arial';
      ctx.fillText(v.name, W - 224, H - 64);
      ctx.fillStyle = CREAM;
      ctx.font = 'bold 24px Arial';
      ctx.fillText(`${Math.round(Math.abs(v.speed) * 3.6)} KM/H`, W - 224, H - 34);
      ctx.font = '12px Arial';
      ctx.fillStyle = v.damage > 60 ? '#ff5a4a' : CREAM;
      ctx.fillText(`Damage ${Math.round(v.damage)}%`, W - 224, H - 20);
    }
  } else if (p.vehicleId === 'heli') {
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 15px Arial';
    ctx.fillText('PCPD HELICOPTER', W - 224, H - 64);
    ctx.fillStyle = CREAM;
    ctx.font = '12px Arial';
    ctx.fillText('Space climbs — S descends', W - 224, H - 34);
  } else if (state.playerBoat !== null && state.boats.find((b) => b.id === state.playerBoat)) {
    // Display-only: the boat is not a vehicleId, so without this the
    // card falls through to ON FOOT while sailing. Never touches state.
    const boat = state.boats.find((b) => b.id === state.playerBoat);
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 15px Arial';
    ctx.fillText(boat.name.toUpperCase(), W - 224, H - 64);
    ctx.fillStyle = CREAM;
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`${Math.round(Math.abs(boat.speed) * 3.6)} KM/H`, W - 224, H - 34);
    ctx.font = '12px Arial';
    ctx.fillText('W throttle — A/D steer', W - 224, H - 20);
  } else {
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 15px Arial';
    ctx.fillText('ON FOOT', W - 224, H - 64);
    ctx.fillStyle = CREAM;
    ctx.font = '12px Arial';
    ctx.fillText(`Health ${Math.round(p.health)}  Armor ${Math.round(p.armor)}`, W - 224, H - 34);
    ctx.fillText(`Respect: ${respectTitleFor(p.respect)}`, W - 224, H - 20);
  }
  // Radio now-playing, centre-bottom.
  const np = state.audio.nowPlaying();
  ctx.fillStyle = DARK;
  const radioText = `${np.station.name}  •  ${np.track.title} — ${np.track.artist}`;
  ctx.font = '13px Arial';
  const rw = ctx.measureText(radioText).width + 24;
  ctx.fillRect(W / 2 - rw / 2, H - 36, rw, 24);
  ctx.fillStyle = np.station.color;
  ctx.fillRect(W / 2 - rw / 2, H - 36, 4, 24);
  ctx.fillStyle = CREAM;
  ctx.fillText(radioText, W / 2 - rw / 2 + 14, H - 19);
  // Crosshair + hit marker.
  if (p.onFoot) {
    const cx = W / 2;
    const cy = H / 2;
    ctx.strokeStyle = 'rgba(242,234,216,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy + 10);
    ctx.stroke();
    if (state.combat.hitMarker) {
      ctx.strokeStyle = '#ff4a4a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy - 12);
      ctx.lineTo(cx + 12, cy + 12);
      ctx.moveTo(cx + 12, cy - 12);
      ctx.lineTo(cx - 12, cy + 12);
      ctx.stroke();
    }
  }
  // Red chevron over the current target.
  if (state.combat.target && !state.combat.target.dead && project) {
    const t = state.combat.target;
    const s2 = project(t.x, 1.9, t.z);
    if (s2 && s2.visible) {
      ctx.fillStyle = '#ff4a4a';
      ctx.beginPath();
      ctx.moveTo(s2.x, s2.y);
      ctx.lineTo(s2.x - 10, s2.y - 14);
      ctx.lineTo(s2.x + 10, s2.y - 14);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Dialog box with the 64×64 portrait.
  if (state.dialog) {
    const d = state.dialog;
    const bw = 560;
    const bx = (W - bw) / 2;
    const by = H - 210;
    panel(ctx, bx, by, bw, 92);
    drawPortrait(ctx, d.speaker, bx + 12, by + 14, 64);
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 14px Arial';
    ctx.fillText(d.name, bx + 88, by + 30);
    ctx.fillStyle = CREAM;
    ctx.font = '14px Arial';
    wrapText(ctx, d.text, bx + 88, by + 52, bw - 100, 18);
  }
  // Notices, right side under the cash panel.
  let ny = 110 + (p.wanted > 0 ? policeResponse(state).length * 18 + 8 : 0);
  ctx.font = '13px Arial';
  for (const n of state.notices.slice(-4)) {
    ctx.fillStyle = DARK;
    const nw = ctx.measureText(n.text).width + 20;
    ctx.fillRect(W - nw - 16, ny, nw, 24);
    ctx.fillStyle = CREAM;
    ctx.fillText(n.text, W - nw - 6, ny + 17);
    ny += 30;
  }
  // Wanted flash when the stars rise.
  if (p.wanted >= 4) {
    ctx.fillStyle = 'rgba(216,58,42,0.9)';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('HELICOPTER INBOUND — BREAK LINE OF SIGHT', W / 2, 120);
    ctx.textAlign = 'left';
  }
}

function drawWeaponPicture(ctx, id, x, y, w, h, color) {
  const shape = weaponShape(id);
  const scale = w / 58;
  ctx.save();
  ctx.translate(x, y + h / 2);
  ctx.scale(scale, scale);
  ctx.translate(0, -10);
  ctx.fillStyle = color;
  for (const [px, py, pw, ph] of shape.parts) {
    ctx.fillRect(px, py, pw, ph);
  }
  ctx.restore();
}

function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lh;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}

// Title screen: SOLMAR 3D over the live city, Continue with the save
// summary, the six-cast row, New Game.
export function drawTitle(ctx, state, W, H, save) {
  ctx.fillStyle = 'rgba(10,8,18,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 84px Arial';
  ctx.fillText('SOLMAR', W / 2, 150);
  ctx.fillStyle = CREAM;
  ctx.font = 'bold 40px Arial';
  ctx.fillText('3 D', W / 2, 200);
  ctx.font = '16px Arial';
  ctx.fillStyle = 'rgba(242,234,216,0.8)';
  ctx.fillText('A SOLMAR CITY STORY — SIX MISSIONS, ONE ISLAND, NO WAY OUT BUT THROUGH', W / 2, 236);
  if (save) {
    panel(ctx, W / 2 - 260, 280, 520, 110);
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 18px Arial';
    ctx.fillText('CONTINUE', W / 2, 312);
    ctx.fillStyle = CREAM;
    ctx.font = '15px Arial';
    ctx.fillText(`Job ${Math.min(6, save.missionsCompleted.length + 1)}  •  $${save.cash.toLocaleString('en-US')}  •  ${save.respectTitle}`, W / 2, 340);
    ctx.fillText(`Day ${save.day}  •  ${save.postcardsFound.length}/20 postcards  •  ${save.weaponsOwned.length} weapons`, W / 2, 364);
  }
  ctx.fillStyle = CREAM;
  ctx.font = 'bold 18px Arial';
  ctx.fillText(save ? 'NEW GAME' : 'NEW GAME', W / 2, save ? 430 : 300);
  ctx.font = '13px Arial';
  ctx.fillStyle = 'rgba(242,234,216,0.7)';
  ctx.fillText('WASD move  •  Mouse look  •  E enter car  •  R reload  •  ] / [ radio  •  M map  •  P pause', W / 2, H - 70);
  // Cast row: portraits + names sit well above the control line
  // (was H-180/H-100 vs H-90 — 10 px apart, the baselines collided).
  const size = 72;
  const gap = 14;
  const total = 6 * size + 5 * gap;
  const startX = W / 2 - total / 2;
  for (let i = 0; i < 6; i++) {
    const c = ['milo', 'kane', 'rosa', 'lena', 'dario', 'vex'][i];
    drawPortrait(ctx, c, startX + i * (size + gap), H - 200, size);
    ctx.fillStyle = CREAM;
    ctx.font = '11px Arial';
    ctx.fillText(castById(c).name, startX + i * (size + gap) + size / 2, H - 118);
  }
  ctx.textAlign = 'left';
}

// Pause menu: MAP / STATS / STORY / SETTINGS tabs, % complete, lifetime.
export function drawPause(ctx, state, W, H, tab) {
  ctx.fillStyle = 'rgba(10,8,18,0.78)';
  ctx.fillRect(0, 0, W, H);
  const tabs = ['MAP', 'STATS', 'STORY', 'SETTINGS'];
  ctx.textAlign = 'center';
  tabs.forEach((t, i) => {
    ctx.fillStyle = tab === i ? GOLD : CREAM;
    ctx.font = 'bold 18px Arial';
    ctx.fillText(t, W / 2 - 180 + i * 120, 90);
  });
  ctx.textAlign = 'left';
  const complete = completionPercent(state);
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 26px Arial';
  ctx.fillText(`${complete}% COMPLETE`, W / 2 - 300, 150);
  if (tab === 1) {
    const rows = [
      ['Missions done', `${state.missions.completed.length}/6`],
      ['Postcards', `${state.postcardsFound.size}/20`],
      ['Races won', `${state.racesWon}/3`],
      ['Cash earned', `$${state.stats.cashEarned.toLocaleString('en-US')}`],
      ['Distance driven', `${(state.stats.distanceDriven / 1000).toFixed(1)} km`],
      ['Shots fired', `${state.stats.shotsFired}`],
      ['Accuracy', state.stats.shotsFired ? `${Math.round((state.stats.shotsHit / state.stats.shotsFired) * 100)}%` : '—'],
      ['Kills', `${state.stats.kills}`],
      ['Days', `${state.time.day}`],
    ];
    ctx.font = '16px Arial';
    rows.forEach(([k, v], i) => {
      ctx.fillStyle = CREAM;
      ctx.fillText(k, W / 2 - 300, 190 + i * 28);
      ctx.fillStyle = GOLD;
      ctx.fillText(v, W / 2 + 100, 190 + i * 28);
    });
  } else if (tab === 2) {
    ctx.font = '16px Arial';
    ctx.fillStyle = CREAM;
    const done = state.missions.completed;
    for (let i = 1; i <= 6; i++) {
      ctx.fillText(`${done.includes(i) ? '✓' : '○'}  Mission ${i}`, W / 2 - 300, 190 + i * 28);
    }
  } else {
    ctx.font = '16px Arial';
    ctx.fillStyle = CREAM;
    ctx.fillText('Sound: ON  •  Radio: ] / [ to change station', W / 2 - 300, 190);
    ctx.fillText('Controls: WASD move, mouse look, E enter, R reload, M map, P pause', W / 2 - 300, 220);
  }
}

export function drawGameOver(ctx, state, W, H) {
  ctx.fillStyle = 'rgba(10,8,18,0.85)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5a4a';
  ctx.font = 'bold 64px Arial';
  ctx.fillText('WASTED', W / 2, H / 2 - 20);
  ctx.fillStyle = CREAM;
  ctx.font = '18px Arial';
  ctx.fillText('The city moves on without you. Press Enter to respawn at the hospital.', W / 2, H / 2 + 30);
  ctx.textAlign = 'left';
}
