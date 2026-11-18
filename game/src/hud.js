// hud.js — the DOM HUD. Weapon bar (5 slots), wanted stars, money,
// police response panel, race board, district banner, dialogue box,
// notices, and the pause menu (% COMPLETE + lifetime STATS). The HUD is
// plain DOM over the canvas; the 3D canvas never draws text.

// The HUD element ids (created by main.js / index.html).
let els = {};

export function bindHud(elements) {
  els = elements;
}

// The 5 weapon slots: 1 Pistol, 2 SMG, 3 Rifle, 4 Shotgun, 5 Sniper.
// No Fists slot. The current weapon is highlighted.
const WEAPON_SLOTS = [
  { key: '1', name: 'Pistol', id: 'pistol' },
  { key: '2', name: 'SMG', id: 'smg' },
  { key: '3', name: 'Rifle', id: 'rifle' },
  { key: '4', name: 'Shotgun', id: 'shotgun' },
  { key: '5', name: 'Sniper', id: 'sniper' },
];

export function weaponSlots() {
  return WEAPON_SLOTS;
}

// Render the whole HUD from the state. Called every frame (cheap DOM
// writes only when the text changes).
const cache = {};
function setText(el, key, value) {
  if (!el) return;
  if (cache[key] !== value) {
    cache[key] = value;
    el.textContent = value;
  }
}

export function renderHud(state, world, ui) {
  if (!els.root) return;
  const p = state.player;
  const w = state.wanted;
  // Money + respect.
  setText(els.money, 'money', `$${state.money}`);
  setText(els.respect, 'respect', `REP ${state.respect}`);
  // Wanted stars.
  if (els.stars) {
    const stars = '★'.repeat(w.level) + '☆'.repeat(5 - w.level);
    setText(els.stars, 'stars', stars);
    els.stars.style.color = w.level >= 3 ? '#ff3333' : '#ffd27a';
  }
  // Health + armor bars.
  if (els.health) els.health.style.width = `${Math.max(0, p.health)}%`;
  if (els.armor) els.armor.style.width = `${Math.max(0, p.armor || 0)}%`;
  // Weapon bar: 5 slots, owned weapons lit, current highlighted.
  if (els.weaponBar) {
    const owned = state.weapons.owned || {};
    const current = state.weapons.current;
    const ammo = state.weapons.ammo || {};
    let html = '';
    for (const slot of WEAPON_SLOTS) {
      const has = !!owned[slot.id];
      const isCur = current === slot.id;
      const a = has ? (ammo[slot.id] ?? 0) : 0;
      html += `<div class="wslot ${has ? 'owned' : ''} ${isCur ? 'current' : ''}"><span class="wkey">${slot.key}</span><span class="wname">${slot.name}</span><span class="wammo">${has ? a : '—'}</span></div>`;
    }
    if (cache.weaponBar !== html) {
      cache.weaponBar = html;
      els.weaponBar.innerHTML = html;
    }
  }
  // Police response panel: each cop as UNIT-n with distance, state, and
  // the ROADBLOCK / SPOTLIGHT flags at high wanted levels.
  if (els.policePanel) {
    const cops = state.cops || [];
    let html = '';
    if (cops.length > 0) {
      html += `<div class="pp-title">POLICE RESPONSE — ${w.level}★</div>`;
      for (const c of cops.slice(0, 6)) {
        const d = Math.hypot(c.x - p.x, c.z - p.z);
        const mode = c.onFoot ? 'ON FOOT' : (c.state === 'pursuit' ? 'PURSUIT' : c.state.toUpperCase());
        html += `<div class="pp-unit">UNIT-${c.id + 1} <span>${Math.round(d)}m</span> <b>${mode}</b></div>`;
      }
      if (w.level >= 3) html += `<div class="pp-flag">ROADBLOCK ACTIVE</div>`;
      if (w.level >= 4) html += `<div class="pp-flag">SPOTLIGHT — HELI INBOUND</div>`;
    }
    if (cache.policePanel !== html) {
      cache.policePanel = html;
      els.policePanel.innerHTML = html;
    }
  }
  // Race board (when a race is active).
  if (els.raceBoard) {
    const race = state.race;
    let html = '';
    if (race && race.active) {
      const rows = [{ name: 'YOU', cp: race.cp || 0, x: p.x, z: p.z }, ...(race.rivals || []).map(r => ({ name: r.name, cp: r.cp || 0, x: r.x, z: r.z }))];
      rows.sort((a, b) => b.cp - a.cp);
      html = `<div class="rb-title">STREET RACE — LAP ${race.lap || 1}/3</div>`;
      rows.forEach((r, i) => {
        html += `<div class="rb-row ${r.name === 'YOU' ? 'you' : ''}">${i + 1}. ${r.name} <span>CP ${r.cp}</span></div>`;
      });
      if (race.countdown !== undefined && race.countdown > 0) {
        html += `<div class="rb-count">${Math.ceil(race.countdown)}</div>`;
      } else if (race.countdown === 0) {
        html += `<div class="rb-count go">GO!</div>`;
      }
    }
    if (cache.raceBoard !== html) {
      cache.raceBoard = html;
      els.raceBoard.innerHTML = html;
    }
  }
  // Mission objective line.
  if (els.objective) {
    const m = state.mission;
    let text = '';
    if (m && m.active) {
      text = m.objective || `Job ${m.id} — stage ${m.stage + 1}`;
    } else if (m && m.done && m.done.some(Boolean)) {
      text = 'Free roam — visit the Diner for the next job';
    }
    setText(els.objective, 'objective', text);
  }
  // District banner (set by the game when the player crosses a border).
  if (els.district && ui.district) {
    setText(els.district, 'district', ui.district);
    els.district.classList.add('show');
  }
  // Notices (pickups, mission updates).
  if (els.notices) {
    const notices = (state.notices || []).slice(-3);
    const html = notices.map(n => `<div class="notice">${n}</div>`).join('');
    if (cache.notices !== html) {
      cache.notices = html;
      els.notices.innerHTML = html;
    }
  }
  // Dialogue box (mission briefing lines).
  if (els.dialogue) {
    const d = state.dialogue;
    let html = '';
    if (d && d.lines && d.lines.length > 0) {
      const line = d.lines[d.index || 0];
      if (line) html = `<div class="dlg-speaker">${line.speaker}</div><div class="dlg-text">${line.text}</div>`;
    }
    if (cache.dialogue !== html) {
      cache.dialogue = html;
      els.dialogue.innerHTML = html;
      els.dialogue.style.display = html ? 'block' : 'none';
    }
  }
  // Radio now-playing.
  if (els.radio) {
    const r = ui.radio;
    const text = r ? `♪ ${r.station} — ${r.track}` : '';
    setText(els.radio, 'radio', text);
  }
  // Clock + day.
  if (els.clock) {
    const h = Math.floor(state.hour || 0);
    const mnt = Math.floor(((state.hour || 0) % 1) * 60);
    setText(els.clock, 'clock', `DAY ${state.day || 1} — ${String(h).padStart(2, '0')}:${String(mnt).padStart(2, '0')}`);
  }
}

// Pause menu: % COMPLETE + lifetime STATS (persisted in save.js).
export function renderPause(state) {
  if (!els.pause) return;
  const stats = state.stats || {};
  const done = (state.mission.done || []).filter(Boolean).length;
  const total = (state.mission.done || []).length || 6;
  const pct = Math.round((done / total) * 100);
  const html = `
    <div class="pause-title">PAUSED</div>
    <div class="pause-complete">COMPLETION ${pct}% (${done}/${total} jobs)</div>
    <div class="pause-stats">
      <div>Distance driven: ${Math.round(stats.distanceDriven || 0)} m</div>
      <div>Distance walked: ${Math.round(stats.distanceWalked || 0)} m</div>
      <div>Cars stolen: ${stats.carsStolen || 0}</div>
      <div>Cops evaded: ${stats.copsEvaded || 0}</div>
      <div>Shots fired: ${stats.shotsFired || 0}</div>
      <div>Hits: ${stats.hits || 0}</div>
      <div>Kills: ${stats.kills || 0}</div>
      <div>Deaths: ${stats.deaths || 0}</div>
      <div>Money earned: $${stats.moneyEarned || 0}</div>
      <div>Tapes found: ${(state.tapesFound || []).length}/20</div>
      <div>Time played: ${Math.round((stats.playTime || 0) / 60)} min</div>
    </div>
    <div class="pause-hint">ESC to resume — P to save</div>
  `;
  if (cache.pause !== html) {
    cache.pause = html;
    els.pause.innerHTML = html;
  }
}

// Show / hide the pause overlay.
export function showPause(show) {
  if (els.pause) els.pause.style.display = show ? 'block' : 'none';
}
