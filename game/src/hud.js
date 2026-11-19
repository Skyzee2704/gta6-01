// SOLMAR 3D — HUD: all GTA panels. Cash + wanted stars + PCPD response
// list (top-right), 5 weapon slots (top-centre-right), mission banner +
// dialogue (top-left), round radar + district (bottom-left), vehicle card
// (bottom-right), radio now-playing (bottom-centre), crosshair + hit
// marker + target chevron (centre). Dark transparent + gold accent.
import { ownedSlots } from './weapons.js';
import { drawPortrait } from './portraits.js';

export function createHUD(root) {
  const el = document.createElement('div');
  el.id = 'hud';
  el.innerHTML = [
    '<div id="hud-top-left">',
    '  <div id="hud-mission" class="hud-panel hidden"></div>',
    '  <div id="hud-dialogue" class="hud-panel hidden"></div>',
    '</div>',
    '<div id="hud-top-centre">',
    '  <div id="hud-race" class="hud-panel hidden"></div>',
    '</div>',
    '<div id="hud-top-right">',
    '  <div id="hud-cash" class="hud-panel"></div>',
    '  <div id="hud-stars" class="hud-panel"></div>',
    '  <div id="hud-response" class="hud-panel hidden"></div>',
    '  <div id="hud-weapons" class="hud-panel"></div>',
    '</div>',
    '<div id="hud-bottom-left">',
    '  <div id="hud-district"></div>',
    '  <canvas id="hud-radar" width="180" height="180"></canvas>',
    '</div>',
    '<div id="hud-bottom-right">',
    '  <div id="hud-vehicle" class="hud-panel"></div>',
    '</div>',
    '<div id="hud-bottom-centre">',
    '  <div id="hud-radio" class="hud-panel hidden"></div>',
    '</div>',
    '<div id="hud-centre">',
    '  <div id="hud-crosshair">+</div>',
    '  <div id="hud-hitmarker" class="hidden">X</div>',
    '  <div id="hud-chevron" class="hidden">v</div>',
    '</div>',
    '<div id="hud-clock" class="hud-panel"></div>',
    '<div id="hud-pause" class="hidden">',
    '  <div class="hud-pause-tabs"><span data-tab="map">MAP</span><span data-tab="stats">STATS</span><span data-tab="story">STORY</span><span data-tab="settings">SETTINGS</span></div>',
    '  <div id="hud-pause-body"></div>',
    '</div>',
  ].join('\n');
  root.appendChild(el);
  return {
    root: el,
    mission: el.querySelector('#hud-mission'),
    dialogue: el.querySelector('#hud-dialogue'),
    race: el.querySelector('#hud-race'),
    cash: el.querySelector('#hud-cash'),
    stars: el.querySelector('#hud-stars'),
    response: el.querySelector('#hud-response'),
    weapons: el.querySelector('#hud-weapons'),
    district: el.querySelector('#hud-district'),
    radar: el.querySelector('#hud-radar'),
    vehicle: el.querySelector('#hud-vehicle'),
    radio: el.querySelector('#hud-radio'),
    clock: el.querySelector('#hud-clock'),
    crosshair: el.querySelector('#hud-crosshair'),
    hitmarker: el.querySelector('#hud-hitmarker'),
    chevron: el.querySelector('#hud-chevron'),
    pause: el.querySelector('#hud-pause'),
    pauseBody: el.querySelector('#hud-pause-body'),
  };
}

export function formatCash(cash) {
  return '$' + Math.floor(cash).toLocaleString('en-US');
}

export function starsHTML(wanted) {
  let out = '';
  for (let i = 1; i <= 5; i++) {
    out += i <= wanted ? '<span class="star filled">&#9733;</span>' : '<span class="star">&#9734;</span>';
  }
  return out;
}

export function updateHUD(hud, s) {
  hud.cash.innerHTML = '<span class="cash">' + formatCash(s.cash) + '</span>';
  hud.stars.innerHTML = starsHTML(s.wanted);
  if (s.wanted > 0 && s.response && s.response.length > 0) {
    hud.response.classList.remove('hidden');
    hud.response.innerHTML =
      '<div class="panel-title">PCPD RESPONSE</div>' +
      s.response
        .map((u) => '<div class="resp-row"><span>' + u.callSign + '</span><span>' + u.distance + 'm</span><span class="resp-state">' + u.state + '</span></div>')
        .join('');
  } else {
    hud.response.classList.add('hidden');
  }
  const slots = ownedSlots(s.weaponsOwned || []);
  hud.weapons.innerHTML = slots
    .map((slot, i) => {
      const active = s.activeWeapon && slot.weapon && slot.weapon.id === s.activeWeapon;
      const ammo = slot.weapon ? ' ' + (s.ammo && s.ammo[slot.weapon.id] != null ? s.ammo[slot.weapon.id] : slot.weapon.magazine) + '/' + (s.reserve && s.reserve[slot.weapon.id] != null ? s.reserve[slot.weapon.id] : slot.weapon.reserve) : '';
      const label = slot.locked ? 'LOCKED' : slot.weapon.name.toUpperCase() + ammo;
      return '<div class="wslot' + (active ? ' active' : '') + (slot.locked ? ' locked' : '') + '"><span class="wslot-num">' + (i + 1) + '</span><span class="wslot-name">' + label + '</span></div>';
    })
    .join('');
  if (s.race) {
    const r = s.race;
    hud.race.classList.remove('hidden');
    hud.race.innerHTML =
      '<div class="panel-title">NEON MILE &middot; RACE</div>' +
      '<div class="race-board"><span>' + r.place + 'th / ' + r.of + '</span><span>Lap ' + r.lap + '/' + r.laps + '</span><span>CP ' + r.checkpoint + '/' + r.checkpoints + '</span><span>' + r.time + 's</span><span>Gap +' + r.gap + 's</span></div>' +
      '<div class="race-standings">' +
      r.standings
        .map((st) => '<div class="race-row' + (st.isPlayer ? ' race-player' : '') + '"><span>' + st.place + '</span><span>' + st.name + '</span></div>')
        .join('') +
      '</div>';
  } else {
    hud.race.classList.add('hidden');
  }
  if (s.mission && s.mission.active) {
    hud.mission.classList.remove('hidden');
    const m = s.mission;
    hud.mission.innerHTML =
      '<div class="mission-name">' + m.name + '</div>' +
      '<div class="mission-stage">' + m.stageName + (m.timer > 0 ? ' &middot; ' + m.timer + 's' : '') + '</div>' +
      '<div class="mission-obj">' + m.objective + '</div>' +
      '<div class="mission-prog">' + m.progress + ' / ' + m.total + '</div>';
  } else {
    hud.mission.classList.add('hidden');
  }
  if (s.dialogue) {
    hud.dialogue.classList.remove('hidden');
    // P1-2 (2026-11-19): dialogue box renders the speaker portrait.
    // s.dialogue.portrait comes from dialogue.js (stage dialogue.portrait
    // or giverPortrait, default 'kane'); drawPortrait draws the 128px
    // canvas, CSS shows it at 64px beside the speaker + line.
    hud.dialogue.innerHTML =
      '<canvas class="dlg-portrait" width="128" height="128"></canvas>' +
      '<div class="dlg-text"><div class="dlg-speaker">' + s.dialogue.speaker + '</div>' +
      '<div class="dlg-line">' + s.dialogue.line + '</div></div>';
    const portraitCanvas = hud.dialogue.querySelector('.dlg-portrait');
    if (portraitCanvas) drawPortrait(portraitCanvas, s.dialogue.portrait || 'kane');
  } else {
    hud.dialogue.classList.add('hidden');
  }
  hud.district.innerHTML =
    '<div class="district-name">' + (s.districtName || 'Solmar') + '</div>' +
    '<div class="district-tag">' + (s.districtTag || '') + '</div>';
  if (s.vehicle) {
    const v = s.vehicle;
    const cond = Math.max(0, Math.min(100, v.condition));
    hud.vehicle.innerHTML =
      '<div class="veh-name">' + v.name + '</div>' +
      '<div class="veh-speed">' + Math.round(Math.abs(v.speed) * 3.6) + ' km/h &middot; Gear ' + v.gear + '</div>' +
      '<div class="veh-cond"><div class="veh-cond-fill" style="width:' + cond + '%"></div></div>';
  } else if (s.activeWeapon) {
    hud.vehicle.innerHTML =
      '<div class="veh-name">' + (s.activeWeaponName || 'On foot') + '</div>' +
      '<div class="veh-speed">' + (s.ammoText || '') + '</div>';
  } else {
    hud.vehicle.innerHTML = '<div class="veh-name">On foot</div>';
  }
  if (s.radio && s.radio.visible) {
    hud.radio.classList.remove('hidden');
    hud.radio.innerHTML =
      '<div class="radio-station">' + s.radio.station + ' ' + s.radio.freq + '</div>' +
      '<div class="radio-track">' + s.radio.track + ' &mdash; ' + s.radio.artist + '</div>';
  } else {
    hud.radio.classList.add('hidden');
  }
  const hh = String(Math.floor(s.hour || 18)).padStart(2, '0');
  const mm = String(Math.floor(((s.hour || 18) % 1) * 60)).padStart(2, '0');
  hud.clock.innerHTML = hh + ':' + mm + ' &middot; Day ' + (s.day || 1);
  hud.crosshair.style.display = s.onFoot ? 'block' : 'none';
  if (s.hitMarker && s.hitMarker.show) {
    hud.hitmarker.classList.remove('hidden');
    hud.hitmarker.classList.toggle('kill', !!s.hitMarker.killed);
  } else {
    hud.hitmarker.classList.add('hidden');
  }
  if (s.chevron && s.chevron.visible) {
    hud.chevron.classList.remove('hidden');
  } else {
    hud.chevron.classList.add('hidden');
  }
  return hud;
}

export function showPause(hud, tab, bodyHTML) {
  hud.pause.classList.remove('hidden');
  const tabs = hud.pause.querySelectorAll('.hud-pause-tabs span');
  tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  hud.pauseBody.innerHTML = bodyHTML;
}

export function hidePause(hud) {
  hud.pause.classList.add('hidden');
}

export function pauseMapHTML(world, missions) {
  const rows = missions
    .map((m) => {
      const done = world.missionsDone.includes(m.id);
      const active = world.mission && world.mission.id === m.id;
      const status = done ? 'DONE' : active ? 'ACTIVE' : 'LOCKED';
      return '<div class="map-mission-row"><span>' + m.name + '</span><span>$' + m.payout.toLocaleString('en-US') + '</span><span class="map-status-' + status.toLowerCase() + '">' + status + '</span></div>';
    })
    .join('');
  const legend = ['Player', 'Mission', 'Police', 'Vulture', 'Race gate', 'Marina', 'Bank', 'Diner', 'Penthouse', 'Beach', 'Ferry'];
  return (
    '<div class="pause-map-wrap">' +
    '<canvas id="pause-map-canvas" width="640" height="480"></canvas>' +
    '<div class="pause-map-side">' +
    '<div class="panel-title">JOBS</div>' + rows +
    '<div class="panel-title" style="margin-top:12px">LEGEND</div>' +
    legend.map((l) => '<div class="map-legend-row">◆ ' + l + '</div>').join('') +
    '<div class="map-meta">Cash ' + formatCash(world.cash) + ' &middot; Respect ' + (world.respectName || '') + ' &middot; Postcards ' + world.postcards.length + '/20 &middot; Properties: ' + (world.owned.properties.join(', ') || 'none') + '</div>' +
    '</div></div>'
  );
}

export function pauseStatsHTML(stats, percent) {
  return (
    '<div class="pause-complete">' + percent + '% COMPLETE</div>' +
    '<div class="pause-stats">' +
    '<div>Distance driven: ' + Math.round((stats.distanceDriven || 0) / 1000) + ' km</div>' +
    '<div>Cars stolen: ' + (stats.carsStolen || 0) + '</div>' +
    '<div>Pursuits escaped: ' + (stats.pursuitsEscaped || 0) + '</div>' +
    '<div>Races won: ' + (stats.racesWon || 0) + '</div>' +
    '<div>Taxi fares: ' + (stats.taxiFares || 0) + '</div>' +
    '<div>Kills: ' + (stats.kills || 0) + '</div>' +
    '<div>Shots: ' + (stats.shotsHit || 0) + ' / ' + (stats.shotsFired || 0) + '</div>' +
    '</div>'
  );
}
