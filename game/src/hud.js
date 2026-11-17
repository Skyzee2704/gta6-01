// HUD: DOM + CSS. Health, armor, money, wanted stars + SPOTTED/EVADING +
// escape bar, weapon + ammo, mission objective, clock, weather icon, radio
// station + EQ bar, speedometer, district banner, dialogue box, notices,
// E prompt, hurt flash, crosshair, weapon wheel, and all screens.
import { WEAPONS, DISTRICTS, CAST, MISSIONS } from './data.js';
import { drawPortrait } from './portraits.js';
import { INTERIORS } from './interiors.js';
import { weatherIcon } from './weather.js';

export function createHud(state, city) {
  const root = document.getElementById('hud');
  root.innerHTML = `
    <div id="hud-top-left"><div id="hud-health">❤ 100</div><div id="hud-armor">🛡 0</div><div id="hud-money">$250</div><div id="hud-wanted"></div></div>
    <div id="hud-top-right"><div id="hud-clock">18:15</div><div id="hud-weather">☀</div><div id="hud-radio"></div></div>
    <div id="hud-objective"></div>
    <div id="hud-banner"></div>
    <div id="hud-dialogue"></div>
    <div id="hud-notices"></div>
    <div id="hud-prompt"></div>
    <div id="hud-crosshair">+</div>
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
    el('hud-clock').textContent = `${fmtClock(state.hour)} · Hari ${state.day}`;
    el('hud-weather').textContent = weatherIcon(state);
    const station = ['SOLMAR 88.5 Golden Wave', 'CALLE SOLMAR 95.7 Fuego Latino', 'PASIR 101.3 Tide FM', 'PULSE SOLMAR 104.9 Neon Club'][state._radio || 0];
    el('hud-radio').textContent = p.onFoot ? '' : `📻 ${station}`;
    const m = state.mission;
    el('hud-objective').textContent = m.active ? `Misi ${m.id}: ${MISSIONS[m.id - 1].title} — ${m.text}` : (state.race.active ? `Balapan: checkpoint ${state.race.checkpoint}` : state.taxi.active ? 'Solmar Cab: antar penumpang' : 'Free roam — tekan M untuk peta, E dekat mobil untuk masuk');
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
    el('hud-prompt').textContent = state.interior ? 'Interior — Esc untuk keluar' : '';
    el('hud-crosshair').style.display = p.onFoot && p.aiming ? 'block' : 'none';
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
      el('hud-screen').innerHTML = `<div class="panel"><h2>${room.name}</h2><p>${room.keeperLine}</p>${room.menu.map(it => `<button data-buy="${it.id}">${it.name} — $${it.price} · ${it.desc}</button>`).join('')}<button data-leave="1">Keluar</button></div>`;
      el('hud-screen').querySelectorAll('[data-buy]').forEach(b => b.onclick = () => window.__buyInterior(b.dataset.buy));
      const lv = el('hud-screen').querySelector('[data-leave]');
      if (lv) lv.onclick = () => window.__leaveInterior();
    } else if (screen === 'title') {
      el('hud-screen').innerHTML = `<div class="panel title"><h1>SOLMAR 3D</h1><p>Streets of Gold — kota pantai, enam distrik, enam misi, tujuh senjata.</p><p>Continue: Misi ${state.mission.done.filter(Boolean).length + 1} · $${state.money} · Hari ${state.day}</p><button data-start="1">New Game</button> <button data-start="1">Continue</button><p class="small">WASD jalan · E masuk mobil · Shift lari · Space lompat · Q weapon wheel · R reload · M peta · V top-down · Esc pause</p></div>`;
      el('hud-screen').querySelectorAll('[data-start]').forEach(b => b.onclick = () => window.__startGame());
    } else if (screen === 'paused') {
      el('hud-screen').innerHTML = `<div class="panel"><h2>Paused</h2><button data-resume="1">Resume</button> <button data-map="1">City Map (M)</button> <button data-quit="1">Quit to Title</button></div>`;
      const r = el('hud-screen').querySelector('[data-resume]'); if (r) r.onclick = () => window.__resumeGame();
      const q = el('hud-screen').querySelector('[data-quit]'); if (q) q.onclick = () => window.__quitToTitle();
    } else if (screen === 'map') {
      const rows = MISSIONS.map(mm => `<div>${mm.chapter}. ${mm.title} — $${mm.payout} — ${state.mission.done[mm.id - 1] ? 'Complete' : state.mission.id === mm.id ? 'Next' : 'Locked'}</div>`).join('');
      el('hud-screen').innerHTML = `<div class="panel map"><h2>Peta Kota Solmar</h2><p>Uang $${state.money} · Respect ${state.respect} (Lv ${state.respectLevel}) · Postcard ${state.tapesTaken}/20 · Properti: ${state.penthouseOwned ? 'Safehouse + Penthouse' : 'Safehouse'}</p>${rows}<p>Legenda: 🚗 mobil · 👮 polisi · 🎯 misi · 🎞 postcard · 🍽 diner · 🔫 toko senjata · 💈 respray · 🏠 safehouse · 🚁 helipad · ⛵ dermaga · 🏁 balapan</p><button data-resume="1">Tutup (M)</button></div>`;
      const r = el('hud-screen').querySelector('[data-resume]'); if (r) r.onclick = () => window.__resumeGame();
    } else if (screen === 'over') {
      el('hud-screen').innerHTML = `<div class="panel"><h2>WASTED</h2><p>Rumah sakit menagih biaya. Coba lagi.</p><button data-start="1">Retry</button></div>`;
      el('hud-screen').querySelectorAll('[data-start]').forEach(b => b.onclick = () => window.__startGame());
    } else el('hud-screen').innerHTML = '';
  }
  return { update };
}
