// SOLMAR 3D — mission dialogue and NPC barks. Lines are data; the queue
// is the only logic. Portrait keys match portraits.js cast ids.
import { MISSIONS } from './data.js';

export const STORY_HOOK =
  'Milo came to Solmar with empty pockets and a fast car. The city gave him a crew, a war, and a crown to steal.';

export const BARKS = [
  { speaker: 'Pedestrian', line: 'Nice car. Shame about the driver.' },
  { speaker: 'Pedestrian', line: 'Did you see that? The cops are everywhere tonight.' },
  { speaker: 'Pedestrian', line: 'I love this city. It loves me back, mostly.' },
  { speaker: 'Pedestrian', line: 'Taxi! No, wait — not that one. That one is stolen.' },
  { speaker: 'Pedestrian', line: 'Golden hour on the Marina. Best free show in Solmar.' },
  { speaker: 'Cop', line: 'Pull over! Now! Do not make this worse.' },
  { speaker: 'Cop', line: 'All units, suspect is moving fast through the Marina.' },
  { speaker: 'Cop', line: 'He is getting away! Somebody cut him off!' },
];

export function dialogueFor(missionId, stageIndex) {
  const mission = MISSIONS.find((m) => m.id === missionId);
  if (!mission) return null;
  const stage = mission.stages[Math.min(stageIndex, mission.stages.length - 1)];
  if (!stage || !stage.dialogue) return null;
  return {
    mission: mission.name,
    stage: stage.name,
    speaker: stage.dialogue.speaker,
    portrait: stage.dialogue.portrait,
    line: stage.dialogue.line,
  };
}

export function addDialogue(queue, speaker, line, portrait) {
  queue.push({ speaker, line, portrait: portrait || 'kane', t: 0 });
  return queue.length;
}

export function queueMissionDialogue(engine, def) {
  const line = dialogueFor(def.id, 0);
  if (line) {
    addDialogue(engine.dialogue, line.speaker, line.line, line.portrait);
  }
  addDialogue(engine.dialogue, def.giver || 'Kane', def.intro || '', def.giverPortrait || 'kane');
  return engine.dialogue.length;
}

export function missionIntro(missionId) {
  const mission = MISSIONS.find((m) => m.id === missionId);
  if (!mission) return '';
  return mission.intro;
}

export function createDialogue() {
  const queue = [];
  let current = null;
  return {
    enqueue(entry) {
      if (!entry) return;
      queue.push(entry);
      if (!current) current = queue.shift();
    },
    enqueueMission(missionId, stageIndex) {
      const line = dialogueFor(missionId, stageIndex);
      if (line) this.enqueue(line);
    },
    current() {
      return current;
    },
    advance() {
      current = queue.length > 0 ? queue.shift() : null;
      return current;
    },
    clear() {
      queue.length = 0;
      current = null;
    },
    get pending() {
      return queue.length;
    },
    get active() {
      return current != null;
    },
  };
}
