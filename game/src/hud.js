// HUD: DOM + CSS. Health, armor, money, wanted stars + SPOTTED/EVADING +
// escape bar, weapon + ammo, mission objective, clock, weather icon, radio
// station + EQ bar, speedometer, district banner, dialogue box, notices,
// E prompt, hurt flash, crosshair, weapon wheel, and all screens.
import { WEAPONS, DISTRICTS, CAST, MISSIONS, RACES, RADIO } from './data.js';
import { drawPortrait } from './portraits.js';
import { INTERIORS } from './interiors.js';
import { weatherIcon } from './weather.js';
import { drawCityMap } from './minimap.js';

export function createHud(state, city) {
  const root = document.getElementById('hud');
  root.innerHTML = `
    <div id="hud-top-left"><div id="hud-health">❤ 100</div><div id="hud-armor">🛡 0</div><div id="hud-money">$250</div><div id="hud-wanted"></div><div id="hud-police"></div></div>
    <div id="hud-top-right"><div id="hud-clock">18:15</div><div id="hud-weather">☀</div><div id="hud-radio"></div><div id="hud-slots"></div></div>
    <div id="hud-objective"></div>
    <div id="hud-race"></div>
    <div id="hud-result"></div>
    <div id="hud-banner"></div>
    <div id="hud-dialogue"></div>
    <div id="hud-notices"></div>
    <div id="hud-prompt"></div>
    <div id="hud-crosshair">+</div>
    <div id="hud-hitmark">×</div>
    <div id="hud-speed"></div>
    <div id="hud-weapon"></div>
    <div id="hud-wheel"></div>
    <div id="hud-hurt"></div>
    <div id="hud-screen"></div>`;
  const el = (id) => document.getElementById(id);
  function fmtClock(h) {
    const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  function update(screen) {
    const inMenu = screen === 'title' || screen === 'map';
    el('hud-top-left').style.display = inMenu ? 'none' : '';
    el('hud-top-right').style.display = inMenu ? 'none' : '';
    el('hud-objective').style.display = inMenu ? 'none' : '';
    el('hud-weapon').style.display = inMenu ? 'none' : '';
    el('hud-speed').style.display = inMenu ? 'none' : '';
    const p = state.player;
    el('hud-health').textContent = `❤ ${Math.ceil(p.health)}`;
    el('hud-armor').textContent = `🛡 ${Math.ceil(p.armor)}`;
    el('hud-money').textContent = `$${state.money.toLocaleString()} · R${state.respectLevel} · 🎞 ${state.tapesTaken}/20`;
    const w = state.wanted;
    const stars = '★'.repeat(w.level) + '☆'.repeat(5 - w.level);
    el('hud-wanted').innerHTML = w.level > 0 ? `${stars} ${w.spotted ? 'SPOTTED' : 'EVADING'} <div class="escape"><div style="width:${w.spotted ? 100 : Math.min(100, (w.escape / (5 + w.level * 1.5)) * 100)}%"></div></div>` : stars;
    // Police response panel: every responding unit, its distance and state.
    if (w.level > 0 && state.cops.length) {
      const rows = state.cops.map((c, i) => {
        const d = Math.round(Math.hypot(c.x - p.x, c.z - p.z));
        return `<div>UNIT-${i + 1} · ${d}m · ${c.onFoot ? 'ON FOOT' : 'PURSUIT'}</div>`;
      }).join('');
      const extra = `${state._roadblock ? '<div>🚧 ROADBLOCK AHEAD</div>' : ''}${state._searchlight ? '<div>🔦 SPOTLIGHT — HELI OVERHEAD</div>' : ''}`;
      el('hud-police').innerHTML = rows + extra;
    } else el('hud-police').innerHTML = '';
    // 5-slot weapon bar (keys 1-5): the five firearms, LOCKED + price when
    // unowned. No fists slot — there is no fists weapon or key.
    const slotNames = ['Pistol', 'SMG', 'Rifle', 'Shotgun', 'Sniper'];
    el('hud-slots').innerHTML = WEAPONS.slice(0, 5).map((wd, i) => {
      const owned = !!state.weapons.owned[wd.id];
      const cur = state.weapons.current === wd.id;
      return `<span class="slot${cur ? ' cur' : ''}${owned ? '' : ' locked'}">${i + 1} ${slotNames[i]}${owned ? '' : ' 🔒 $' + wd.price}</span>`;
    }).join('');
    el('hud-clock').textContent = `${fmtClock(state.hour)} · Day ${state.day}`;
    el('hud-weather').textContent = weatherIcon(state);
    const station = RADIO[state._radio || 0].name;
    el('hud-radio').textContent = p.onFoot ? '' : `📻 ${station} — ${state._track || ''}`;
    // Per-mission results screen (shown for 6 s after a mission completes).
    const res = state.missionResult;
    if (res && state.time - res.at < 6) {
      const acc = res.shots > 0 ? Math.round((res.hits / res.shots) * 100) : 0;
      el('hud-result').innerHTML = `<div class="result-panel"><div class="result-title">MISSION COMPLETE: ${res.title}</div><div>+$${res.payout} · +${res.respect} respect · ${res.time.toFixed(1)}s</div><div>Accuracy ${acc}% (${res.hits}/${res.shots}) · Kills ${res.kills} · Crashes ${res.crashes} · Top speed ${Math.round(res.topSpeed)} km/h</div></div>`;
    } else el('hud-result').innerHTML = '';
    const m = state.mission;
    // Race board replaces the objective while a race runs: live place,
    // checkpoint, time, gap, best, and the 4-driver standings.
    const raceEl = el('hud-race');
    if (state.race.active) {
      const race = RACES.find(q => q.id === state.race.id);
      const cd = state.race.countdown || 0;
      el('hud-objective').textContent = '';
      if (cd > 0) {
        const n = Math.ceil(cd);
        raceEl.innerHTML = `<div class="race-count">${n}</div><div>${race.name} — get ready</div>`;
      } else {
        const total = race.checkpoints.length;
        const drivers = [{ name: 'You', cp: state.race.checkpoint, x: p.x, z: p.z, speed: p.speed || 0, you: true }];
        for (const rv of state.race.rivals || []) drivers.push({ name: rv.name, cp: rv.cp, x: rv.x, z: rv.z, speed: rv.speed || 0 });
        for (const d of drivers) { const nc = race.checkpoints[Math.min(d.cp, total - 1)]; d.distNext = Math.hypot(nc[0] - d.x, nc[1] - d.z); }
        drivers.sort((a, b) => (b.cp - a.cp) || (a.distNext - b.distNext));
        const youIdx = drivers.findIndex(d => d.you);
        const place = youIdx + 1;
        let gapTxt = '';
        if (place > 1) {
          const ahead = drivers[youIdx - 1];
          gapTxt = `Gap +${(Math.hypot(ahead.x - p.x, ahead.z - p.z) / Math.max(p.speed || 0, 5)).toFixed(1)}s`;
        } else if (drivers.length > 1) {
          const behind = drivers[1];
          gapTxt = `Lead ${(Math.hypot(behind.x - p.x, behind.z - p.z) / Math.max(p.speed || 0, 5)).toFixed(1)}s`;
        }
        const best = state.race.best[state.race.id];
        const ord = ['st', 'nd', 'rd', 'th'][place - 1] || 'th';
        const standings = drivers.map((d, i) => `<div>${i + 1}. ${d.name} — CP ${Math.min(d.cp + 1, total)}/${total}</div>`).join('');
        raceEl.innerHTML = `<div class="race-head">${place}${ord} / ${drivers.length} · CP ${Math.min(state.race.checkpoint + 1, total)}/${total} · ${state.race.time.toFixed(1)}s · ${gapTxt} · Best ${best ? best.toFixed(1) + 's' : '—'}</div>${standings}`;
      }
    } else {
      raceEl.innerHTML = '';
      el('hud-objective').textContent = m.active ? `Mission ${m.id}: ${MISSIONS[m.id - 1].title} — ${m.text}` : (state.taxi.active ? 'Solmar Cab: drop off the passenger' : 'Free roam — press M for the map, E near a car to get in');
    }
    const d = DISTRICTS.find(q => q.id === state.district);
    el('hud-banner').style.opacity = state.districtTimer > 0 ? '1' : '0';
    el('hud-banner').innerHTML = d ? `<div class="banner-name" style="border-color:${d.accent}">${d.name}</div><div class="banner-tag">${d.tagline}</div>` : '';
    const dlg = state.dialogue[0];
    el('hud-dialogue').style.display = dlg ? 'flex' : 'none';
    if (dlg) {
      const speaker = dlg.text.split(':')[0];
      const cast = CAST.find(c => c.name.split(' ')[0] === speaker || c.name === speaker);
      el('hud-dialogue').innerHTML = `<canvas id="dlg-portrait" width="72" height="72"></canvas><div><b>${speaker}</b><div>${dlg.text.split(':').slice(1).join(':')}</div></div>`;
      const c2 = document.getElementById('dlg-portrait');
      if (c2 && cast) drawPortrait(c2.getContext('2d'), cast.id, 0, 0, 56);
    }
    const notices = state.notices.slice(-3);
    el('hud-notices').innerHTML = notices.map(n => `<div>${n}</div>`).join('');
    el('hud-prompt').textContent = state.interior ? 'Interior — Esc to leave' : '';
    el('hud-crosshair').style.display = p.onFoot && p.aiming ? 'block' : 'none';
    // Hit marker: a red X at the crosshair for 0.3 s after a shot lands.
    el('hud-hitmark').style.display = (state._hitMark && state.time - state._hitMark < 0.3) ? 'block' : 'none';
    const v = state.vehicles.find(q => q.id === p.vehicleId);
    el('hud-speed').textContent = v ? `${Math.round(Math.abs(v.speed) * 3.6)} KM/H · ${v.def.name} · HP ${Math.ceil(v.hp)}` : (state.helis.find(h => h.pilot) ? 'HELIKOPTER' : state.boats.find(b => b.driver) ? 'PERAHU' : '');
    const cur = state.weapons.owned[state.weapons.current];
    const wdef = WEAPONS.find(q => q.id === state.weapons.current);
    el('hud-weapon').textContent = wdef ? `${wdef.name} ${cur && cur.mag !== undefined ? cur.mag + '/' + cur.reserve : ''}` : '';
    el('hud-hurt').style.opacity = p.health < 40 ? String((40 - p.health) / 40) : '0';
    if (state.weapons.wheelOpen) {
      el('hud-wheel').innerHTML = WEAPONS.map((wd, i) => `<div class="${state.weapons.owned[wd.id] ? '' : 'locked'}">${i + 1}. ${wd.name} ${state.weapons.owned[wd.id] ? '' : '🔒 $' + wd.price}</div>`).join('');
    } else el('hud-wheel').innerHTML = '';
    if (state.interior) {
      const room = INTERIORS[state.interior];
      el('hud-screen').innerHTML = `<div class="panel"><h2>${room.name}</h2><p>${room.keeperLine}</p>${room.menu.map(it => `<button data-buy="${it.id}">${it.name} — $${it.price} · ${it.desc}</button>`).join('')}<button data-leave="1">Leave</button></div>`;
      el('hud-screen').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => window.__buyInterior(b.dataset.buy));
      const lv = el('hud-screen').querySelector('[data-leave]');
      if (lv) lv.onclick = () => window.__leaveInterior();
    } else if (screen === 'title') {
      el('hud-screen').innerHTML = `<div class="panel title"><h1>SOLMAR 3D</h1><p>Streets of Gold — a coastal city, six districts, six missions, seven weapons.</p><p>Continue: Mission ${state.mission.done.filter(Boolean).length + 1} · $${state.money} · Day ${state.day}</p><button data-start="1">New Game</button> <button data-start="1">Continue</button><p class="small">WASD walk · E enter car · Shift run · Space jump · Q weapon wheel · R reload · M map · V top-down · Esc pause</p></div>`;
      el('hud-screen').querySelectorAll('[data-start]').forEach(b => b.onclick = () => window.__startGame());
    } else if (screen === 'paused') {
      const missionsDone = state.mission.done.filter(Boolean).length;
      const raceBests = Object.keys(state.race.best).length;
      const pct = Math.round(((missionsDone / 6) + (state.tapesTaken / 20) + (raceBests / 3) + (state.penthouseOwned ? 1 : 0)) / 4 * 100);
      const bests = Object.entries(state.race.best).map(([id, t]) => `${id} ${t.toFixed(1)}s`).join(' · ') || '—';
      el('hud-screen').innerHTML = `<div class="panel"><h2>Paused</h2><p>COMPLETION ${pct}% — Missions ${missionsDone}/6 · Postcards ${state.tapesTaken}/20 · Race bests ${raceBests}/3 · ${state.penthouseOwned ? 'Penthouse owned' : 'No penthouse yet'}</p><p>STATS — Distance ${(state.stats.distance / 1000).toFixed(1)} km · Cars stolen ${state.stats.steals} · Escapes ${state.stats.escapes} · Races won ${state.stats.racesWon} · Taxi fares ${state.stats.fares} · Missions ${missionsDone} · Postcards ${state.tapesTaken} · Best times: ${bests}</p><button data-resume="1">Resume</button> <button data-map="1">City Map (M)</button> <button data-quit="1">Quit to Title</button></div>`;
      const r = el('hud-screen').querySelector('[data-resume]'); if (r) r.onclick = () => window.__resumeGame();
      const q = el('hud-screen').querySelector('[data-quit]'); if (q) q.onclick = () => window.__quitToTitle();
    } else if (screen === 'map') {
      const rows = MISSIONS.map(mm => `<div>${mm.chapter}. ${mm.title} — $${mm.payout} — ${state.mission.done[mm.id - 1] ? 'Complete' : state.mission.id === mm.id ? 'Next' : 'Locked'}</div>`).join('');
      el('hud-screen').innerHTML = `<div class="panel map"><h2>Solmar City Map</h2><canvas id="hud-citymap" width="600" height="440" style="max-width:100%;border-radius:8px"></canvas><p>Cash $${state.money} · Respect ${state.respect} (Lv ${state.respectLevel}) · Postcards ${state.tapesTaken}/20 · Property: ${state.penthouseOwned ? 'Safehouse + Penthouse' : 'Safehouse'}</p>${rows}<p>Legend: 🚗 car · 👮 police · 🎯 job · 🎞 postcard · 🍽 diner · 🔫 gun store · 💈 respray · 🏠 safehouse · 🚁 helipad · ⛵ pier · 🏁 race</p><button data-resume="1">Close (M)</button></div>`;
      const cm = document.getElementById('hud-citymap');
      if (cm) drawCityMap(cm.getContext('2d'), state, city, 600, 440);
      const r = el('hud-screen').querySelector('[data-resume]'); if (r) r.onclick = () => window.__resumeGame();
    } else if (screen === 'over') {
      el('hud-screen').innerHTML = `<div class="panel"><h2>WASTED</h2><p>The hospital charged a fee. Try again.</p><button data-start="1">Retry</button></div>`;
      el('hud-screen').querySelectorAll('[data-start]').forEach(b => b.onclick = () => window.__startGame());
    } else el('hud-screen').innerHTML = '';
  }
  return { update };
}
