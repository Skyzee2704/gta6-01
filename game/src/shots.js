// shots.js — the screenshot stager. The make.fun screenshot tool
// loads the game with ?shot=<name>&seed=<n> and captures the canvas.
// Each shot stages a scene (golden hour, a good camera, a live moment)
// and then renders it. The shots must be bright (luma floors) and show
// the game, not a menu.

// Shot definitions: where the player stands, what they are doing, and
// the hour (golden hour, 18.7–18.8).
export const SHOTS = {
  cover: { hour: 18.8, x: -160, z: 120, heading: 2.4, onFoot: false, vehicle: 'sports', wanted: 2, label: 'cover' },
  title: { hour: 18.8, x: -200, z: 80, heading: 0.8, onFoot: true, wanted: 0, label: 'title' },
  onfoot: { hour: 18.7, x: -180, z: 60, heading: 1.2, onFoot: true, wanted: 2, label: 'onfoot' },
  map: { hour: 18.8, x: -260, z: 190, heading: 0, onFoot: true, wanted: 0, label: 'map' },
};

// Stage a shot: put the player, a car, cops, and the time where the
// shot wants them. Returns the shot def.
export function stageShot(state, world, name) {
  const def = SHOTS[name];
  if (!def) return null;
  const p = state.player;
  state.hour = def.hour;
  state.time = def.hour * 3600;
  p.x = def.x;
  p.z = def.z;
  p.heading = def.heading;
  p.onFoot = def.onFoot;
  p.health = 100;
  // Wanted level for the shot.
  state.wanted.level = def.wanted;
  state.wanted.heat = def.wanted;
  state.wanted.spotted = def.wanted > 0;
  if (def.vehicle) {
    // Find or spawn a sports car near the player.
    let car = state.vehicles.find(v => v.model === def.vehicle && v.parked);
    if (!car) {
      car = {
        id: state.nextVehicleId++,
        model: def.vehicle,
        x: def.x + 4,
        z: def.z + 2,
        heading: def.heading,
        speed: 0,
        parked: false,
        driver: null,
        health: 100,
        smoke: 0,
        color: '#f5c518',
      };
      state.vehicles.push(car);
    }
    p.vehicleId = car.id;
    car.driver = 'player';
    car.parked = false;
    car.x = def.x + 4;
    car.z = def.z + 2;
  }
  // A few cops nearby for the chase shots. Every field the sim reads
  // must be set (a missing speed makes the cop's position NaN).
  if (def.wanted > 0) {
    state.cops.length = 0;
    for (let i = 0; i < 3; i++) {
      state.cops.push({
        id: i,
        x: def.x + 12 + i * 8,
        z: def.z - 10 - i * 4,
        heading: def.heading,
        onFoot: i === 0,
        vehicleId: null,
        state: 'pursuit',
        down: false,
        downT: 0,
        speed: 6,
        shootT: 0,
        burst: 0,
        burstTimer: 0,
        shootCooldown: 1,
      });
    }
  }
  // A few peds walking for life.
  state.peds.length = 0;
  for (let i = 0; i < 6; i++) {
    state.peds.push({
      id: i,
      x: def.x + (i - 3) * 8,
      z: def.z + 20 + i * 3,
      heading: i,
      speed: 2,
      state: 'walk',
      color: ['#c0392b', '#2e86c1', '#27ae60', '#8e44ad', '#e67e22', '#16a085'][i],
    });
  }
  return def;
}

// Parse ?shot= and ?seed= from the URL.
export function parseShotParams() {
  const params = new URLSearchParams(window.location.search);
  return { shot: params.get('shot') || null, seed: parseInt(params.get('seed') || '1', 10) || 1 };
}
