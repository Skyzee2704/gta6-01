// SOLMAR 3D — aircraft: drivable helicopter and plane. Rotor spin,
// climb/descent, spotlight beam cone for the police heli, landing
// detection, crash on hard impact.
import { clamp } from './random.js';
import { box, mergeBoxes, vertexMaterial } from './materials.js';

export function createAircraftState(kind, x, y, z = 40) {
  return {
    kind: kind || 'heli',
    x,
    y,
    z,
    heading: 0,
    speed: 0,
    vertical: 0,
    rotor: 0,
    beamOn: kind === 'police-heli',
    beamTarget: null,
    landed: false,
    condition: 100,
  };
}

export function updateAircraft(a, input, dt) {
  const topSpeed = a.kind === 'plane' ? 55 : 26;
  const accel = input.up ? (a.kind === 'plane' ? 14 : 9) : input.down ? -8 : 0;
  a.speed = clamp(a.speed + accel * dt, 0, topSpeed);
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  a.heading += steer * 1.1 * dt * (a.speed > 2 ? 1 : 0.3);
  a.vertical = input.climb ? 8 : input.descend ? -8 : 0;
  a.z = clamp(a.z + a.vertical * dt, 0, 120);
  a.x += Math.sin(a.heading) * a.speed * dt;
  a.y += Math.cos(a.heading) * a.speed * dt;
  a.rotor += dt * (20 + a.speed * 0.4);
  a.landed = a.z <= 0.5 && a.speed < 3;
  if (a.landed) a.z = 0;
  return a;
}

export function buildHeliMesh(materials, police = false) {
  const g = new THREE.Group();
  const paint = police ? 0x1a2a4a : 0xc22e2e;
  const bodyParts = [
    { w: 2.2, h: 1.4, d: 4.2, y: 1.2, color: paint },
    { w: 0.5, h: 0.5, d: 4.5, y: 1.4, z: -3.8, color: paint },
    { w: 0.15, h: 0.15, d: 3.4, x: -0.9, y: 0.2, color: 0x6a7078 },
    { w: 0.15, h: 0.15, d: 3.4, x: 0.9, y: 0.2, color: 0x6a7078 },
  ];
  const body = new THREE.Mesh(mergeBoxes(bodyParts), vertexMaterial());
  g.add(body);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.9, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x9fd8e8, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.5 }),
  );
  glass.position.set(0, 1.4, 1.6);
  g.add(glass);
  const rotor = new THREE.Group();
  rotor.position.y = 2.3;
  const rotorMesh = new THREE.Mesh(
    mergeBoxes([
      { w: 9, h: 0.08, d: 0.35, color: 0x141416 },
      { w: 0.35, h: 0.08, d: 9, color: 0x141416 },
    ]),
    vertexMaterial(),
  );
  rotor.add(rotorMesh);
  rotor.name = 'rotor';
  g.add(rotor);
  if (police) {
    const bar = box(1.2, 0.25, 0.4, materials.neonCyan);
    bar.position.set(0, 2.05, 0.6);
    g.add(bar);
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(6, 40, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
    );
    beam.position.set(0, -19, 0);
    beam.rotation.x = Math.PI;
    beam.name = 'beam';
    g.add(beam);
  }
  g.userData = { rotor };
  return g;
}

export function updateHeliMesh(mesh, state, dt) {
  mesh.position.set(state.x, state.z + 1, state.y);
  mesh.rotation.y = state.heading;
  const rotor = mesh.userData.rotor;
  if (rotor) rotor.rotation.y = state.rotor;
  const beam = mesh.getObjectByName('beam');
  if (beam) beam.visible = state.beamOn;
}
