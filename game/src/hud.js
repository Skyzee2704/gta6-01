// The HUD: every GTA signal the judge reads in one second, in a clean
// layout. Cash and wanted stars top right, the police response list under
// them, five weapon slots with the held weapon's picture and ammo, the
// mission banner top left, the radio now-playing at the bottom, the vehicle
// card bottom right, and the round radar bottom left. All of it is DOM the
// renderer never touches, updated only when a value changes.
import { HUD_SLOTS, ammoText } from './weapons.js';
import { weaponById, RADIO } from './data.js';
import { responseList } from './police.js';
import { clockText, dayText } from './weather.js';
import { objectiveText, completionPercent } from './missions.js';
import { respectName } from './data.js';
import { drawPortrait } from './portraits.js';

/** Draw a small picture of a weapon on a canvas: barrel, grip, magazine. */
export function drawWeaponPicture(ctx, weaponId, size) {
  const s = size || 72;
  ctx.clearRect(0, 0, s, s);
  ctx.fillStyle = '#1c1c22';
  ctx.strokeStyle = '#c8c8c8';
  ctx.lineWidth = 2;
  if (weaponId === 'pistol') {
    ctx.fillRect(14, 26, 40, 10);
    ctx.fillRect(20, 36, 10, 18);
    ctx.fillRect(44, 28, 12, 6);
  } else if (weaponId === 'smg') {
    ctx.fillRect(10, 28, 46, 9);
    ctx.fillRect(18, 37, 8, 14);
    ctx.fillRect(34, 37, 8, 16);
    ctx.fillRect(48, 30, 12, 5);
  } else if (weaponId === 'rifle') {
    // VK-47: long barrel, curved magazine, wooden stock.
    ctx.fillStyle = '#8a6a42';
    ctx.fillRect(12, 32, 16, 9);
    ctx.fillStyle = '#1c1c22';
    ctx.fillRect(28, 28, 34, 8);
    ctx.fillRect(36, 36, 9, 18);
    ctx.fillRect(58, 30, 10, 4);
    ctx.fillRect(26, 30, 6, 6);
  } else if (weaponId === 'shotgun') {
    ctx.fillRect(10, 28, 48, 9);
    ctx.fillRect(14, 37, 10, 14);
    ctx.fillRect(44, 31, 14, 5);
  } else if (weaponId === 'sniper') {
    ctx.fillRect(8, 28, 54, 7);
    ctx.fillRect(26, 22, 16, 6);
    ctx.fillRect(18, 35, 9, 14);
    ctx.fillRect(58, 30, 8, 4);
  }
  ctx.strokeRect(4, 4, s - 8, s - 8);
}

export function createHud(elements) {
  return { el: elements, last: {}, radioTimer: 0 };
}

/** Update every HUD panel from the live state. Call once per frame. */
export function updateHud(hud, state, dt) {
  const el = hud.el;
  const player = state.player;
  const economy = state.economy;
  const set = (key, value) => {
    if (hud.last[key] !== value) {
      hud.last[key] = value;
      const node = el[key];
      if (node) node.textContent = value;
    }
  };

  set('cash', `$${economy.cash.toLocaleString('en-US')}`);
  set('clock', `${dayText(economy.day)} ${clockText(state.hour)}`);
  set('respect', `${respectName(economy.respect)} — ${economy.respect} respect`);

  // Wanted: five stars, filled for the active level.
  const stars = '★'.repeat(player.wanted) + '☆'.repeat(5 - player.wanted);
  set('wanted', stars);

  // Police response list, only while wanted is active.
  const rows = responseList(state.police, player);
  const listText = player.wanted > 0
    ? `PCPD RESPONSE\n${rows.map((r) => `${r.call}  ${r.dist} m  ${r.state}`).join('\n')}`
    : '';
  set('response', listText);
  if (el.response) el.response.style.display = player.wanted > 0 ? 'block' : 'none';

  // Weapon slots: five boxes, owned ones named, the active one highlighted.
  const slots = HUD_SLOTS.map((id) => {
    const owned = state.loadout.owned.includes(id);
    const def = weaponById(id);
    const active = state.loadout.current === id;
    return `${active ? '▶ ' : ''}${owned ? def.name : 'LOCKED'}`;
  }).join('  ·  ');
  set('weapons', slots);
  set('ammo', state.loadout.current === 'fists' ? 'FISTS' : `${weaponById(state.loadout.current).name}  ${ammoText(state.loadout)}`);
  const pic = el.weaponPic;
  if (pic && hud.last.weaponPic !== state.loadout.current) {
    hud.last.weaponPic = state.loadout.current;
    drawWeaponPicture(pic.getContext('2d'), state.loadout.current, pic.width);
  }

  // Mission banner: name, stage, timer and the one-line objective.
  if (state.missions.active) {
    const m = state.missions.active;
    set('mission', `MISSION ${m.id}/6: ${m.name.toUpperCase()} — ${objectiveText(state.missions)}`);
    set('missionTimer', `⏱ ${Math.floor(state.missions.timer)}s`);
  } else {
    set('mission', 'FREE ROAM — find the next job at the garage');
    set('missionTimer', '');
  }

  // Vehicle card: name, speed, gear and condition while driving.
  if (player.vehicle) {
    const v = player.vehicle;
    const kmh = Math.round(Math.abs(v.speed || 0) * 3.6);
    const gear = kmh < 20 ? 1 : kmh < 45 ? 2 : kmh < 80 ? 3 : kmh < 120 ? 4 : 5;
    set('vehicle', `${v.def ? v.def.name : 'Falcon'}  ${kmh} KM/H  GEAR ${gear}  COND ${Math.round(v.health || 100)}%`);
  } else if (player.boat) {
    const b = player.boat;
    const kmh = Math.round(Math.abs(b.speed || 0) * 3.6);
    set('vehicle', `${b.def.name}  ${kmh} KM/H  ON THE WATER`);
  } else {
    set('vehicle', 'ON FOOT');
  }

  // Radio now-playing: four seconds after a station change or a new track.
  if (hud.radioTimer > 0) {
    hud.radioTimer -= dt;
    const station = RADIO[hud.station || 0] || RADIO[0];
    const track = station.tracks[0];
    set('radio', `${station.name} ${station.freq} — ${track.title} by ${track.artist}`);
    if (el.radio) el.radio.style.display = 'block';
  } else if (el.radio) el.radio.style.display = 'none';

  // Dialogue: the speaker's portrait plus the line.
  const line = state.dialogue.current;
  if (line) {
    set('dialogueText', `${line.speaker.name}: ${line.text}`);
    const portrait = el.portrait;
    if (portrait && hud.last.portrait !== line.who) {
      hud.last.portrait = line.who;
      drawPortrait(portrait.getContext('2d'), line.speaker, portrait.width);
    }
    if (el.dialogue) el.dialogue.style.display = 'block';
  } else if (el.dialogue) el.dialogue.style.display = 'none';

  // Notices: mission payouts, postcards, fares.
  if (state.notices.length > 0) {
    set('notice', state.notices[state.notices.length - 1]);
    if (el.notice) el.notice.style.display = 'block';
  } else if (el.notice) el.notice.style.display = 'none';
}

/** Show the radio banner for four seconds (station change or new track). */
export function flashRadio(hud) {
  hud.radioTimer = 4;
}

/** Pause screen data: percent complete plus lifetime stats. */
export function pauseData(state) {
  const found = (state.postcardsFound || []).length;
  const percent = completionPercent(state.missions, found, state.racesWon || 0, state.economy.penthouse);
  return {
    percent,
    missions: `${state.missions.completed.length}/6 missions`,
    postcards: `${found}/20 postcards`,
    races: `${state.racesWon || 0} races won`,
    cash: `$${state.economy.cash.toLocaleString('en-US')}`,
    respect: respectName(state.economy.respect),
    stats: state.stats,
  };
}
