// SOLMAR 3D — main: wiring. Screens (title / play / paused / over),
// game loop, player on foot + driving, camera, HUD + minimap updates,
// police / traffic / NPC / mission / race / audio updates, save/load,
// interiors, and the window hooks the shot + playtest tools use.
import { WORLD_W, WORLD_H, GAME_TITLE } from './config.js';
import { createWorld, advanceWorld, setWanted, districtAt, addNotice } from './world.js';
import { buildCity, districtAtPoint } from './city.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER } from './render.js';
import { createMaterials, glowSprite } from './materials.js';
import { buildBuildings, buildingAt } from './buildings.js';
import { buildProps } from './props.js';
import { createInput } from './input.js';
import { createMissionEngine, startMission, updateMission, missionStatus, reportProgress, completeMission, failMission } from './missions.js';
import { createPolice, updatePolice, responseList, wantedForHeat } from './police.js';
import { createNpcManager, updateNpcs } from './npc.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createCombat, updateCombat, fireAt, targetChevron } from './combat.js';
import { createVehicleState, updateVehicle, buildVehicleMesh, updateVehicleMesh, damageVehicle, vehicleById } from './vehicles.js';
import { buildCharacterMesh, buildPedMesh, updateWalkCycle, updateChaseCamera, keepClearPosition } from './character.js';
import { createWeaponState, fireWeapon, startReload, updateWeapon } from './weapons.js';
import { createWeather, updateWeather } from './weather.js';
import { createSideState, findPostcard } from './side.js';
import { createRace, startRace, updateRace, raceBoard, finishRace, nextCheckpoint } from './races.js';
import { createAudio, ensureAudio, nextStation, prevStation, showNowPlaying, nowPlayingVisible, scheduleStep, playGunshot, setEngineSound, playSiren } from './audio.js';
import { createHUD, updateHUD, showPause, hidePause, pauseStatsHTML, pauseMapHTML } from './hud.js';
import { drawMinimap, drawCityMap } from './minimap.js';
import { createDialogue, dialogueFor } from './dialogue.js';
import { drawPortrait, castRow } from './portraits.js';
import { saveGame, loadGame, hasSave, buildMidGameStaging, computeComplete } from './save.js';
import { buyWeapon } from './economy.js';
import { buildHeliMesh, updateHeliMesh } from './aircraft.js';
import { buildBoatMesh, createBoatState, updateBoat } from './boats.js';
import { buildInteriorRoom, interiorAt, enterInterior, exitInterior } from './interiors.js';
import { missionById, weaponById, respectTierFor, MISSIONS } from './data.js';
import { stageShot } from './shots.js';

export function createGame(canvas, hudRoot, opts = {}) {
  const seed = opts.seed || 1;
  const staging = opts.staging ? buildMidGameStaging() : null;
  const world = staging ? { ...createWorld(seed), ...staging, player: { ...createWorld(seed).player, ...staging.player } } : createWorld(seed);
  if (opts.shot) world.frozen = true;
  const city = buildCity(seed);
  const materials = createMaterials();
  const renderer = createRenderer(canvas, world);
  renderer.scene.add(buildBuildings(city, materials));
  renderer.scene.add(buildProps(city, materials));
  const weather = createWeather(seed);
  const input = createInput();
  input.attach();
  const hud = createHUD(hudRoot);
  const audio = createAudio();
  const missions = createMissionEngine();
  const police = createPolice(seed);
  const npcs = createNpcManager(seed);
  const traffic = createTraffic(seed);
  const combat = createCombat(seed);
  const side = createSideState(seed);
  const race = createRace(seed);
  const dialogue = createDialogue();
  const playerMesh = buildCharacterMesh({ skin: 0xe8b890, shirt: 0xc22e2e, pants: 0x2a3542, hair: 0x2a2018 });
  renderer.scene.add(playerMesh);
  const vehicleMeshes = new Map();
  const pedMeshes = new Map();
  const copMeshes = new Map();
  const rivalMeshes = new Map();
  let heliMesh = null;
  let playerVehicle = null;
  let playerVehicleMesh = null;
  let shotCam = null;
  let weapon = createWeaponState(world.owned.weapons[0] || 'pistol', world.ammo[world.owned.weapons[0]] || 48, 90);
  let screen = SCREEN_TITLE;
  let topdown = false;
  let lastTime = 0;
  let frameCount = 0;
  let shotReady = false;
  let beacon = null;

  const game = {
    world,
    city,
    renderer,
    input,
    hud,
    audio,
    missions,
    police,
    npcs,
    traffic,
    combat,
    side,
    race,
    get screen() { return screen; },
    set screen(v) { screen = v; },
    get shotReady() {
      return shotReady;
    },
    start,
    stop,
    enterVehicle,
    exitVehicle,
    triggerMission,
    triggerRace,
    buyWeaponNow(id) { return buyWeapon(world, id); },
    saveNow() { return saveGame(world); },
    loadNow() { return loadGame(); },
    enterInteriorNow() {
      const def = interiorAt(world.player.x, world.player.y);
      if (!def) return null;
      return enterInterior(world, def);
    },
    exitInteriorNow() { return exitInterior(world); },
  };

  function ensureBeacon(x, y, color) {
    if (!beacon) {
      beacon = glowSprite(renderer.glowTex, color || 0xffd27a, 2.5);
      renderer.scene.add(beacon);
    }
    beacon.position.set(x, 4, y);
    beacon.visible = true;
    return beacon;
  }

  function spawnPlayerVehicle(vehicleId) {
    const def = vehicleById(vehicleId);
    playerVehicle = createVehicleState(vehicleId, world.player.x + Math.sin(world.player.heading) * 2, world.player.y + Math.cos(world.player.heading) * 2, world.player.heading);
    playerVehicleMesh = buildVehicleMesh(def, materials, { color: def.color });
    playerVehicleMesh.position.set(playerVehicle.x, 0, playerVehicle.y);
    playerVehicleMesh.rotation.y = playerVehicle.heading;
    renderer.scene.add(playerVehicleMesh);
    playerVehicle.mesh = playerVehicleMesh;
    world.player.vehicleId = vehicleId;
    world.player.onFoot = false;
  }

  function enterVehicle(car) {
    const def = car.def || vehicleById('comet');
    spawnPlayerVehicle(def.id);
    world.stats.carsStolen += 1;
    world.wantedHeat += 40;
    setWanted(world, wantedForHeat(world.wantedHeat));
    addNotice(world, 'Car stolen — PCPD is looking for you.', 'wanted');
    return playerVehicle;
  }

  function exitVehicle() {
    if (!playerVehicle) return;
    world.player.x = playerVehicle.x;
    world.player.y = playerVehicle.y;
    world.player.heading = playerVehicle.heading;
    world.player.onFoot = true;
    world.player.vehicleId = null;
    if (playerVehicleMesh) {
      renderer.scene.remove(playerVehicleMesh);
      playerVehicleMesh = null;
    }
    playerVehicle = null;
  }

  function triggerMission() {
    const next = MISSIONS.find((m) => !world.missionsDone.includes(m.id));
    if (!next) return null;
    const res = startMission(missions, next.id, world);
    if (res.ok) {
      world.mission = { id: next.id, stage: 0, progress: 0, active: true, timer: next.timer || 0 };
      dialogue.enqueueMission(next.id, 0);
      addNotice(world, 'Job started: ' + next.name, 'mission');
    }
    return res;
  }

  function triggerRace() {
    const res = startRace(race, world.player);
    addNotice(world, 'Race started — Neon Mile, 3 laps.', 'race');
    return res;
  }

  function syncTrafficMeshes() {
    const seen = new Set();
    for (const car of traffic.cars) {
      seen.add(car.id);
      if (!vehicleMeshes.has(car.id)) {
        const mesh = buildVehicleMesh(car.def, materials, { color: car.color, simple: true });
        renderer.scene.add(mesh);
        vehicleMeshes.set(car.id, mesh);
      }
      const mesh = vehicleMeshes.get(car.id);
      mesh.position.set(car.x, 0, car.y);
      mesh.rotation.y = car.heading;
    }
    for (const [id, mesh] of vehicleMeshes) {
      if (!seen.has(id)) {
        renderer.scene.remove(mesh);
        vehicleMeshes.delete(id);
      }
    }
  }

  function syncPedMeshes(dt) {
    const seen = new Set();
    for (const ped of [...npcs.peds, ...npcs.vultures]) {
      seen.add(ped.id);
      if (!pedMeshes.has(ped.id)) {
        const mesh = buildPedMesh(ped.look || { skin: 0xe8b890, shirt: 0x2e6fc2, pants: 0x2a3542, hair: 0x2a2018 });
        renderer.scene.add(mesh);
        pedMeshes.set(ped.id, mesh);
      }
      const mesh = pedMeshes.get(ped.id);
      mesh.position.set(ped.x, 0, ped.y);
      mesh.rotation.y = ped.heading;
      updateWalkCycle(mesh, ped.speed, dt);
    }
    for (const [id, mesh] of pedMeshes) {
      if (!seen.has(id)) {
        renderer.scene.remove(mesh);
        pedMeshes.delete(id);
      }
    }
  }

  function nameTagSprite(text) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 48;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(12, 14, 18, 0.75)';
    g.fillRect(0, 0, 256, 48);
    g.strokeStyle = 'rgba(255, 210, 122, 0.8)';
    g.lineWidth = 2;
    g.strokeRect(1, 1, 254, 46);
    g.fillStyle = '#ffd27a';
    g.font = 'bold 26px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 128, 25);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(3.2, 0.6, 1);
    return sprite;
  }

  function syncRivalMeshes() {
    if (!race.active && race.phase !== 'racing' && race.phase !== 'countdown') {
      for (const [id, mesh] of rivalMeshes) {
        renderer.scene.remove(mesh);
        rivalMeshes.delete(id);
      }
      return;
    }
    const seen = new Set();
    for (const r of race.rivals) {
      seen.add(r.id);
      if (!rivalMeshes.has(r.id)) {
        const mesh = buildVehicleMesh(vehicleById(r.vehicleId || 'velora'), materials, { color: r.color || 0x2e6fc2 });
        renderer.scene.add(mesh);
        rivalMeshes.set(r.id, mesh);
        const tag = nameTagSprite(r.name || 'Rival');
        tag.name = 'tag-' + r.id;
        renderer.scene.add(tag);
        rivalMeshes.set('tag-' + r.id, tag);
      }
      const mesh = rivalMeshes.get(r.id);
      mesh.position.set(r.x || 320, 0, r.y || 130);
      mesh.rotation.y = r.heading || 0;
      const tag = rivalMeshes.get('tag-' + r.id);
      if (tag) tag.position.set(r.x || 320, 2.6, r.y || 130);
    }
    for (const [id, mesh] of rivalMeshes) {
      if (!seen.has(id) && !seen.has(id.replace('tag-', ''))) {
        renderer.scene.remove(mesh);
        rivalMeshes.delete(id);
      }
    }
  }

  function syncPoliceMeshes() {
    const seen = new Set();
    for (const u of police.units) {
      seen.add(u.id);
      if (!copMeshes.has(u.id)) {
        const mesh = buildVehicleMesh(vehicleById('cruiser'), materials, { color: 0x1a1a2e, police: true });
        renderer.scene.add(mesh);
        copMeshes.set(u.id, mesh);
      }
      const mesh = copMeshes.get(u.id);
      mesh.position.set(u.x, 0, u.y);
      mesh.rotation.y = u.heading;
    }
    for (const [id, mesh] of copMeshes) {
      if (!seen.has(id)) {
        renderer.scene.remove(mesh);
        copMeshes.delete(id);
      }
    }
    if (police.heli && !heliMesh) {
      heliMesh = buildHeliMesh(materials, true);
      renderer.scene.add(heliMesh);
    }
    if (!police.heli && heliMesh) {
      renderer.scene.remove(heliMesh);
      heliMesh = null;
    }
    if (heliMesh && police.heli) {
      updateHeliMesh(heliMesh, police.heli, 0.016);
    }
  }

  function hudSnapshot() {
    const m = missionStatus(missions);
    const d = districtAt(world.player.x, world.player.y);
    const radio = (opts.shot || nowPlayingVisible(audio)) ? audio.nowPlaying : null;
    return {
      cash: world.cash,
      wanted: world.wanted,
      response: responseList(police, world.player),
      weaponsOwned: world.owned.weapons,
      activeWeapon: weapon.def.id,
      activeWeaponName: weapon.def.name,
      ammo: world.ammo,
      reserve: { pistol: 48, smg: 120, vk47: 90, shotgun: 24, sniper: 15, revolver: 30, carbine: 96 },
      mission: m.active ? m : null,
      race: race.active && race.phase === 'racing' ? raceBoard(race) : null,
      dialogue: dialogue.current(),
      districtName: d.name,
      districtTag: d.tagline,
      vehicle: playerVehicle ? { name: playerVehicle.def.name, speed: playerVehicle.speed, gear: playerVehicle.gear, condition: playerVehicle.condition } : null,
      onFoot: world.player.onFoot,
      radio: radio ? { ...radio, visible: true } : null,
      hour: world.hour,
      day: world.day,
      health: world.player.health,
      armor: world.player.armor,
      respect: world.respect,
      respectName: respectTierFor(world.respect).name,
      hitMarker: combat.hits.length > 0 ? { show: true, killed: false } : null,
      chevron: null,
    };
  }

  function update(dt) {
    advanceWorld(world, dt);
    updateWeather(weather, dt, world.hour);
    updateMission(missions, world, dt);
    updatePolice(police, city, world.player, world, dt);
    updateNpcs(npcs, world.player, dt, city);
    updateTraffic(traffic, city, world.player, dt);
    updateCombat(combat, dt);
    updateWeapon(weapon, dt);
    if (race.active) {
      const done = updateRace(race, world.player, dt);
      if (done && done.won !== undefined) {
        world.cash += done.payout || 0;
        if (done.won) world.stats.racesWon += 1;
        addNotice(world, done.won ? 'Race won! +$' + done.payout : 'Race finished — place ' + done.place, 'race');
      }
    }
    const found = findPostcard(side, world.player);
    if (found) {
      world.postcards.push(found.found.id);
      addNotice(world, 'Postcard found: ' + found.found.name + ' (' + found.total + '/20)', 'info');
    }
    if (input.wasPressed('nextStation')) nextStation(audio);
    if (input.wasPressed('prevStation')) prevStation(audio);
    if (input.wasPressed('wheel')) {
      const idx = world.owned.weapons.indexOf(weapon.def.id);
      const nextId = world.owned.weapons[(idx + 1) % world.owned.weapons.length];
      weapon = createWeaponState(nextId, world.ammo[nextId] || 0, 90);
    }
    if (input.wasPressed('reload')) startReload(weapon);
    if (input.wasPressed('shoot') && world.player.onFoot) {
      const shot = fireWeapon(weapon, { distance: 12 });
      if (shot) {
        playGunshot(audio);
        world.stats.shotsFired += 1;
        const target = npcs.vultures[0];
        if (target) {
          const res = fireAt(combat, world.player, target, weapon);
          if (res.hit) {
            world.stats.shotsHit += 1;
            if (res.killed) {
              world.stats.kills += 1;
              world.wantedHeat += 50;
              setWanted(world, wantedForHeat(world.wantedHeat));
            }
          }
        }
      }
    }
    if (input.wasPressed('interact')) {
      const interior = interiorAt(world.player.x, world.player.y);
      if (interior) {
        enterInterior(world, interior);
        addNotice(world, 'Entered ' + interior.name, 'info');
      } else if (!playerVehicle && traffic.cars.length > 0) {
        const near = traffic.cars.reduce((best, c) => {
          const d = Math.hypot(c.x - world.player.x, c.y - world.player.y);
          return !best || d < best.d ? { car: c, d } : best;
        }, null);
        if (near && near.d < 4) enterVehicle(near.car);
      }
    }
    if (input.wasPressed('map')) {
      screen = SCREEN_PAUSED;
      showPause(hud, 'map', pauseMapHTML({ ...world, respectName: respectTierFor(world.respect).name }, MISSIONS));
      const mapCanvas = document.getElementById('pause-map-canvas');
      if (mapCanvas) drawCityMap(mapCanvas, { city, player: world.player });
    }
    if (input.wasPressed('pause')) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        showPause(hud, 'stats', pauseStatsHTML(world.stats, computeComplete(world)));
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        hidePause(hud);
      }
    }
    if (input.wasPressed('topdown')) topdown = !topdown;
    if (world.player.onFoot) {
      const speed = input.isDown('run') ? 5.2 : 3.2;
      const ax = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
      const ay = (input.isDown('down') ? 1 : 0) - (input.isDown('up') ? 1 : 0);
      if (ax !== 0 || ay !== 0) {
        const len = Math.hypot(ax, ay) || 1;
        world.player.x += (ax / len) * speed * dt;
        world.player.y += (ay / len) * speed * dt;
        world.player.heading = Math.atan2(ax, ay);
        world.player.speed = speed;
      } else {
        world.player.speed = 0;
      }
      playerMesh.position.set(world.player.x, 0, world.player.y);
      playerMesh.rotation.y = world.player.heading;
      updateWalkCycle(playerMesh, world.player.speed, dt);
      playerMesh.visible = true;
      if (playerVehicleMesh) playerVehicleMesh.visible = false;
    } else if (playerVehicle) {
      const vinput = {
        up: input.isDown('up'),
        down: input.isDown('down'),
        left: input.isDown('left'),
        right: input.isDown('right'),
        handbrake: input.isDown('jump'),
      };
      updateVehicle(playerVehicle, vinput, dt);
      world.player.x = playerVehicle.x;
      world.player.y = playerVehicle.y;
      world.player.heading = playerVehicle.heading;
      world.player.speed = playerVehicle.speed;
      world.stats.distanceDriven += Math.abs(playerVehicle.speed) * dt;
      updateVehicleMesh(playerVehicle, dt);
      playerMesh.visible = false;
      if (input.wasPressed('interact')) exitVehicle();
    }
    present(dt);
  }

  function present(dt) {
    const clear = keepClearPosition(city, world.player.x, world.player.y, buildingAt, 4);
    if (clear.steps > 0) {
      world.player.x = clear.x;
      world.player.y = clear.y;
    }
    if (topdown) {
      renderer.camera.position.set(world.player.x, 120, world.player.y + 0.1);
      renderer.camera.lookAt(world.player.x, 0, world.player.y);
    } else if (world.player.onFoot) {
      updateChaseCamera(renderer.camera, { x: world.player.x, y: world.player.y, heading: world.player.heading }, { boom: 8, height: 4, fov: 66, dt, clearFn: (x, y) => buildingAt(city, x, y, 2) != null });
    } else {
      updateChaseCamera(renderer.camera, { x: world.player.x, y: world.player.y, heading: world.player.heading }, { boom: shotCam ? shotCam.boom : 14, height: shotCam ? shotCam.height : 6, fov: 68, dt, lookHeight: shotCam ? shotCam.lookHeight : undefined, clearFn: (x, y) => buildingAt(city, x, y, 2) != null });
    }
    const lightSources = [];
    for (const u of police.units) lightSources.push({ x: u.x, y: u.y, color: 0x4da6ff, intensity: 1.6, distance: 40 });
    if (police.heli) lightSources.push({ x: police.heli.x, y: police.heli.y, color: 0xfff2c0, intensity: 2, distance: 60 });
    renderer.updateLights(lightSources);
    if (world.player.onFoot) {
      playerMesh.position.set(world.player.x, 0, world.player.y);
      playerMesh.rotation.y = world.player.heading;
      playerMesh.visible = true;
      if (playerVehicleMesh) playerVehicleMesh.visible = false;
    } else if (playerVehicleMesh) {
      playerMesh.visible = false;
      playerVehicleMesh.visible = true;
    }
    setEngineSound(audio, playerVehicle ? playerVehicle.speed : 0, playerVehicle ? playerVehicle.def.topSpeed : 1);
    playSiren(audio, world.wanted > 0);
    scheduleStep(audio);
    syncTrafficMeshes();
    syncPedMeshes(dt);
    syncPoliceMeshes();
    syncRivalMeshes();
    updateHUD(hud, hudSnapshot());
    drawMinimap(hud.radar, {
      x: world.player.x,
      y: world.player.y,
      heading: world.player.heading,
      health: world.player.health,
      armor: world.player.armor,
      respect: world.respect,
      city,
      searchZone: police.searchZone,
      police: police.units,
      vultures: npcs.vultures,
      missionBlip: world.mission && world.mission.active ? { x: 320, y: 130 } : null,
    });
    if (race.active && race.phase === 'racing') {
      const cp = nextCheckpoint(race);
      ensureBeacon(cp.x, cp.y, 0x2ee85c);
    } else if (world.mission && world.mission.active) {
      ensureBeacon(320, 130, 0xffd27a);
    } else if (beacon) {
      beacon.visible = false;
    }
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - lastTime) / 1000 || 0.016);
    lastTime = t;
    if (screen === SCREEN_PLAY) {
      if (opts.shot) {
        present(0);
      } else {
        update(dt);
      }
      renderer.renderFrame(world, dt);
      frameCount += 1;
      if (frameCount > 5) shotReady = true;
    } else if (screen === SCREEN_TITLE) {
      world.hour = 18.6;
      renderer.camera.position.set(320, 55, 420);
      renderer.camera.lookAt(320, 0, 240);
      renderer.renderFrame(world, dt);
      frameCount += 1;
      if (frameCount > 5) shotReady = true;
    } else if (screen === SCREEN_PAUSED) {
      if (input.wasPressed('pause')) {
        screen = SCREEN_PLAY;
        hidePause(hud);
      }
      renderer.renderFrame(world, dt);
      frameCount += 1;
      if (frameCount > 5) shotReady = true;
    }
    input.beginFrame();
    if (game._running) requestAnimationFrame(loop);
  }

  function stageForShot(query) {
    const staged = stageShot(query, seed);
    world.hour = staged.def.hour;
    world.player.x = staged.player.x;
    world.player.y = staged.player.y;
    world.player.heading = staged.player.heading;
    world.player.speed = staged.player.speed;
    world.player.onFoot = query === 'onfoot';
    world.wanted = staged.world.wanted;
    world.wantedHeat = staged.world.wantedHeat;
    world.cash = staged.world.cash;
    world.respect = staged.world.respect;
    if (query === 'map') {
      world.hour = 12.0;
      world.player.x = 320;
      world.player.y = 240;
      screen = SCREEN_PAUSED;
      game.screen = screen;
      showPause(hud, 'map', pauseMapHTML({ ...world, respectName: respectTierFor(world.respect).name }, MISSIONS));
      const mapCanvas = document.getElementById('pause-map-canvas');
      if (mapCanvas) drawCityMap(mapCanvas, { city, player: world.player });
      shotReady = true;
      return staged;
    } else if (query === 'onfoot') {
      // Posed ON Gold Street (320,240) heading north — see stageOnFoot
      // in shots.js: the old block-interior pose (300,240) hid the
      // right-hand Vulture behind a facade. Keep in sync with shots.js.
      world.player.x = 320;
      world.player.y = 240;
      world.player.heading = 0;
      for (const v of staged.vultures) {
        npcs.vultures.push(v);
        const marker = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.5),
          new THREE.MeshBasicMaterial({ color: 0xff2e2e }),
        );
        marker.position.set(v.x, 2.8, v.y);
        renderer.scene.add(marker);
        const glow = glowSprite(renderer.glowTex, 0xff2e2e, 1.6);
        glow.position.set(v.x, 0.8, v.y);
        renderer.scene.add(glow);
      }
      startMission(missions, 'vulture-trouble', world);
      missions.progress = 2;
      missions.progressTotal = 6;
      world.mission = { id: 'vulture-trouble', stage: 0, progress: 2, active: true, timer: 0 };
      dialogue.enqueueMission('vulture-trouble', 0);
      weapon = createWeaponState('vk47', 30, 90);
      const fx = Math.sin(world.player.heading);
      const fy = Math.cos(world.player.heading);
      const flash = glowSprite(renderer.glowTex, 0xfff2c0, 2.0);
      flash.position.set(world.player.x + fx * 1.4, 1.3, world.player.y + fy * 1.4);
      renderer.scene.add(flash);
      const flashLight = new THREE.PointLight(0xfff2c0, 5, 30, 1.5);
      flashLight.position.set(world.player.x + fx * 1.4, 2, world.player.y + fy * 1.4);
      renderer.scene.add(flashLight);
      const streetLight = new THREE.PointLight(0xffd27a, 2.5, 40, 1.5);
      streetLight.position.set(world.player.x, 6, world.player.y);
      renderer.scene.add(streetLight);
    } else if (query === 'race') {
      shotCam = { boom: 11, height: 4.5 };
      startRace(race, world.player);
      race.countdown = 0;
      race.phase = 'racing';
      race.elapsed = staged.race.elapsed;
      race.lap = staged.race.lap;
      race.checkpoint = staged.race.checkpoint;
      race.playerPlace = staged.race.playerPlace;
      race.gapToLeader = staged.race.gapToLeader;
      race.standings = staged.race.standings.map((s) => ({ ...s }));
      race.rivals = staged.race.rivals.map((r) => ({ ...r }));
      spawnPlayerVehicle('comet');
      if (playerVehicle) {
        playerVehicle.speed = 8;
        playerVehicle.gear = 1;
        world.player.x = playerVehicle.x;
        world.player.y = playerVehicle.y;
        world.player.heading = playerVehicle.heading;
        world.player.speed = 8;
      }
      world.mission = null;
    } else {
      shotCam = { boom: 10, height: 2.8, lookHeight: 2.4 };
      police.units = staged.police.units;
      police.heli = staged.police.heli;
      police.nextId = 20;
      for (const c of staged.traffic.cars) traffic.cars.push(c);
      for (const p of staged.npcs.peds) npcs.peds.push(p);
      spawnPlayerVehicle('comet');
      if (playerVehicle) {
        playerVehicle.speed = 27;
        playerVehicle.gear = 2;
        world.player.x = playerVehicle.x;
        world.player.y = playerVehicle.y;
        world.player.heading = playerVehicle.heading;
      }
      startMission(missions, 'king-of-solmar', world);
      missions.stage = 2;
      missions.timer = 127;
      world.mission = { id: 'king-of-solmar', stage: 2, progress: 0, active: true, timer: 127 };
      dialogue.enqueueMission('king-of-solmar', 2);
    }
    showNowPlaying(audio);
    const titleEl = document.getElementById('title-screen');
    if (titleEl) titleEl.classList.add('hidden');
    screen = SCREEN_PLAY;
    game.screen = screen;
    return staged;
  }

  function start() {
    game._running = true;
    if (opts.shot) {
      stageForShot(opts.shot);
      requestAnimationFrame(loop);
      return game;
    }
    if (staging) {
      const m = missionById('king-of-solmar');
      if (m) {
        startMission(missions, 'king-of-solmar', world);
        missions.stage = 2;
        missions.timer = 127;
        world.mission = { id: 'king-of-solmar', stage: 2, progress: 0, active: true, timer: 127 };
      }
      spawnPlayerVehicle('comet');
      showNowPlaying(audio);
    }
    const titleEl = document.getElementById('title-screen');
    if (titleEl) {
      titleEl.classList.remove('hidden');
      const portraitsEl = titleEl.querySelector('#title-cast');
      if (portraitsEl) {
        portraitsEl.innerHTML = '';
        for (const c of castRow()) {
          const cv = document.createElement('canvas');
          cv.width = 128;
          cv.height = 128;
          drawPortrait(cv, c.id);
          const wrap = document.createElement('div');
          wrap.className = 'cast-card';
          wrap.appendChild(cv);
          const label = document.createElement('div');
          label.className = 'cast-name';
          label.textContent = c.name + ' — ' + c.role;
          wrap.appendChild(label);
          portraitsEl.appendChild(wrap);
        }
      }
      const continueBtn = titleEl.querySelector('#btn-continue');
      const newBtn = titleEl.querySelector('#btn-new');
      const has = hasSave() || !!staging;
      if (continueBtn) {
        continueBtn.style.display = has ? '' : 'none';
        continueBtn.onclick = () => {
          ensureAudio(audio);
          if (!staging) {
            const saved = loadGame();
            if (saved) Object.assign(world, saved);
          }
          showNowPlaying(audio);
          titleEl.classList.add('hidden');
          screen = SCREEN_PLAY;
          game.screen = screen;
        };
      }
      if (newBtn) {
        newBtn.onclick = () => {
          ensureAudio(audio);
          showNowPlaying(audio);
          titleEl.classList.add('hidden');
          screen = SCREEN_PLAY;
          game.screen = screen;
        };
      }
    } else {
      screen = SCREEN_PLAY;
      game.screen = screen;
    }
    requestAnimationFrame(loop);
    return game;
  }

  function stop() {
    game._running = false;
    input.detach();
    saveGame(world);
    saveStats(world.stats);
  }

  window.__solmar = game;
  return game;
}

export function bootGame(canvasId, hudRootId, opts) {
  const canvas = document.getElementById(canvasId);
  const hudRoot = document.getElementById(hudRootId);
  const game = createGame(canvas, hudRoot, opts);
  return game.start();
}
