// Missions: a small state machine over objective lists, plus the six
// chapters of Milo's story. Each mission is data — a title, a briefing, a
// reward, and objectives of a few kinds: go somewhere, pick something up,
// deliver a car, survive a shootout, chase a target down, lose the cops.
// The engine walks the list, watches the world, and advances or fails it.
import { LANDMARKS, MISSION_REWARDS, COLLECTOR_TIME_LIMIT } from './config.js';

export const MISSION_TITLES = [
  'First Wheels',
  'Getaway Driver',
  'The Collector',
  'Vulture Trouble',
  'The Big Score',
  'King of Solmar',
];

export function missionDefinitions() {
  return [
    {
      id: 0,
      title: 'First Wheels',
      reward: MISSION_REWARDS[0],
      briefing: 'Rosa needs wheels. Walk to the Marina Dock, take the coupe parked there, and bring it back to her garage in Old Solmar.',
      objectives: [
        { kind: 'goto', label: 'Walk to the Marina Dock', x: LANDMARKS.dock.x, y: LANDMARKS.dock.y, radius: 70, onFoot: true },
        { kind: 'enterCar', label: 'Get in the coupe at the dock', carTag: 'missionCar' },
        { kind: 'goto', label: "Drive the coupe to Rosa's Garage", x: LANDMARKS.garage.x, y: LANDMARKS.garage.y, radius: 90, inCar: true },
      ],
    },
    {
      id: 1,
      title: 'Getaway Driver',
      reward: MISSION_REWARDS[1],
      briefing: 'A friend of Rosa is boxed in by the police near Neon Plaza. Get there, pick him up, and lose the cruisers before you reach the safehouse.',
      objectives: [
        { kind: 'goto', label: 'Reach Neon Plaza', x: LANDMARKS.neonPlaza.x, y: LANDMARKS.neonPlaza.y, radius: 90 },
        { kind: 'pickup', label: 'Pick up Rosa\'s friend', x: LANDMARKS.neonPlaza.x, y: LANDMARKS.neonPlaza.y, radius: 60 },
        { kind: 'escape', label: 'Lose the police, then reach the Safehouse', x: LANDMARKS.safehouse.x, y: LANDMARKS.safehouse.y, radius: 90 },
      ],
    },
    {
      id: 2,
      title: 'The Collector',
      reward: MISSION_REWARDS[2],
      briefing: 'Three packages are stashed around Solmar — the docks, Palm Court, and the Marina. Grab all three before the clock runs out.',
      objectives: [
        { kind: 'collect', label: 'Collect the 3 packages', seconds: COLLECTOR_TIME_LIMIT, spots: [
          { x: LANDMARKS.vaultTruckYard.x, y: LANDMARKS.vaultTruckYard.y, label: 'Harbor package' },
          { x: LANDMARKS.palmCourt.x, y: LANDMARKS.palmCourt.y, label: 'Palm Court package' },
          { x: LANDMARKS.dock.x + 120, y: LANDMARKS.dock.y, label: 'Marina package' },
        ] },
      ],
    },
    {
      id: 3,
      title: 'Vulture Trouble',
      reward: MISSION_REWARDS[3],
      briefing: 'Kane\'s Vultures are hitting Rosa\'s garage. Get back there on foot, drive them off, then chase down the Vulture car that flees.',
      objectives: [
        { kind: 'goto', label: "Get back to Rosa's Garage", x: LANDMARKS.garage.x, y: LANDMARKS.garage.y, radius: 100 },
        { kind: 'defeat', label: 'Drive off the Vultures (4)', count: 4, spawnAt: LANDMARKS.garage },
        { kind: 'chase', label: 'Chase down the fleeing Vulture car', carTag: 'vultureCar' },
      ],
    },
    {
      id: 4,
      title: 'The Big Score',
      reward: MISSION_REWARDS[4],
      briefing: 'A sports car sits in the buyer lot at Harbor Docks, lightly guarded. Take it quiet — if the heat rises before you grab it, the deal sours — then deliver it to the buyer.',
      objectives: [
        { kind: 'steal', label: 'Take the sports car from the Buyer Lot', carTag: 'scoreCar' },
        { kind: 'goto', label: 'Deliver the sports car to Palm Court', x: LANDMARKS.palmCourt.x, y: LANDMARKS.palmCourt.y, radius: 90, inCar: true },
      ],
    },
    {
      id: 5,
      title: 'King of Solmar',
      reward: MISSION_REWARDS[5],
      briefing: 'The finale. Grab the vault truck in the Harbor yard, then outrun a four-star chase all the way to the safehouse. Do this and Solmar is yours.',
      objectives: [
        { kind: 'enterCar', label: 'Get in the vault truck', carTag: 'vaultTruck' },
        { kind: 'goto', label: 'Escape to the Safehouse — lose the police', x: LANDMARKS.safehouse.x, y: LANDMARKS.safehouse.y, radius: 100, inCar: true, requireWanted: 0 },
      ],
    },
  ];
}

export function createMissionState() {
  return {
    index: -1, // -1 means free roam, no mission running
    mission: null,
    objectiveIndex: 0,
    objective: null,
    timer: 0,
    collected: 0,
    defeated: 0,
    failed: false,
    failedReason: '',
    completed: [],
    justCompleted: null,
    banner: 0,
    bannerText: '',
  };
}

export function startMission(state, index) {
  const defs = missionDefinitions();
  const def = defs[index];
  if (!def) return false;
  state.index = index;
  state.mission = def;
  state.objectiveIndex = 0;
  state.objective = def.objectives[0];
  state.timer = def.objectives[0].seconds || 0;
  state.collected = 0;
  state.defeated = 0;
  state.failed = false;
  state.failedReason = '';
  state.justCompleted = null;
  state.banner = 3;
  state.bannerText = def.title;
  return true;
}

export function currentObjectiveLabel(state) {
  if (!state.mission || !state.objective) return '';
  const obj = state.objective;
  if (obj.kind === 'collect') {
    return `${obj.label} (${state.collected}/${obj.spots.length})`;
  }
  if (obj.kind === 'defeat') {
    return `${obj.label} — down ${state.defeated}/${obj.count}`;
  }
  return obj.label;
}

// Where the minimap arrow and the world marker should point right now.
export function currentObjectivePoint(state) {
  if (!state.mission || !state.objective) return null;
  const obj = state.objective;
  if (obj.kind === 'collect') {
    const next = obj.spots[state.collected];
    return next ? { x: next.x, y: next.y, label: next.label } : null;
  }
  if (obj.x !== undefined) return { x: obj.x, y: obj.y, label: obj.label };
  return null;
}

function advanceObjective(state, world) {
  state.objectiveIndex += 1;
  const def = state.mission;
  if (state.objectiveIndex >= def.objectives.length) {
    completeMission(state, world);
    return;
  }
  state.objective = def.objectives[state.objectiveIndex];
  state.timer = state.objective.seconds || 0;
  state.banner = 2;
  state.bannerText = state.objective.label;
  if (world && world.onObjectiveAdvanced) world.onObjectiveAdvanced(state.objective);
}

function completeMission(state, world) {
  const def = state.mission;
  state.completed.push(def.id);
  state.justCompleted = def;
  if (world) {
    world.player.money += def.reward;
    world.player.respect = Math.min(100, (world.player.respect || 0) + 16);
  }
  state.banner = 4;
  state.bannerText = `Mission Complete — ${def.title}  +$${def.reward}`;
  state.mission = null;
  state.objective = null;
  state.index = -1;
  if (world && world.onMissionComplete) world.onMissionComplete(def);
}

export function failMission(state, reason) {
  if (!state.mission) return;
  state.failed = true;
  state.failedReason = reason;
  state.banner = 3;
  state.bannerText = `Mission Failed — ${reason}`;
}

// One tick of the mission engine. It reads the world (player position,
// car, enemies left, wanted level) and moves the objective list along.
// Returns 'completed', 'failed', or null.
export function updateMission(state, world, dt) {
  if (!state.mission || !state.objective) return null;
  const obj = state.objective;
  const player = world.player;

  if (obj.seconds) {
    state.timer -= dt;
    if (state.timer <= 0) {
      failMission(state, 'Time ran out');
      return 'failed';
    }
  }

  const distTo = (x, y) => Math.hypot(player.x - x, player.y - y);

  switch (obj.kind) {
    case 'goto': {
      const inCarOk = !obj.inCar || !player.onFoot;
      const onFootOk = !obj.onFoot || player.onFoot;
      const wantedOk = obj.requireWanted === undefined || world.wanted.level <= obj.requireWanted;
      if (distTo(obj.x, obj.y) < obj.radius && inCarOk && onFootOk && wantedOk) {
        advanceObjective(state, world);
      }
      break;
    }
    case 'enterCar': {
      if (!player.onFoot && player.car && player.car.tag === obj.carTag) {
        advanceObjective(state, world);
      }
      break;
    }
    case 'pickup': {
      if (distTo(obj.x, obj.y) < obj.radius) {
        advanceObjective(state, world);
      }
      break;
    }
    case 'collect': {
      const next = obj.spots[state.collected];
      if (next && distTo(next.x, next.y) < 64) {
        state.collected += 1;
        world.events.push({ type: 'pickup', x: next.x, y: next.y, label: next.label });
        if (state.collected >= obj.spots.length) advanceObjective(state, world);
      }
      break;
    }
    case 'defeat': {
      if (state.defeated >= obj.count) {
        advanceObjective(state, world);
      }
      break;
    }
    case 'chase': {
      const target = world.vehicles.find((v) => v.tag === obj.carTag);
      if (!target) {
        advanceObjective(state, world);
      } else if (target.hp <= 0) {
        advanceObjective(state, world);
      }
      break;
    }
    case 'steal': {
      if (!player.onFoot && player.car && player.car.tag === obj.carTag) {
        advanceObjective(state, world);
      }
      break;
    }
    case 'escape': {
      if (world.wanted.level === 0 && distTo(obj.x, obj.y) < obj.radius) {
        advanceObjective(state, world);
      }
      break;
    }
    default:
      break;
  }

  return null;
}
