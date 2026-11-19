# SOLMAR 3D — Streets of Gold
An open-world crime game in a beach city: explore six districts, complete six jobs, wield seven weapons, drive, steal, and escape.

## Run it
Run `node serve.ts`.
Open http://localhost:8080 in desktop Chrome; no install, no build, no dependencies.

## Checks
- `node tools/simCheck.mjs`: checks simulated driving, finite state, wanted escalation, and police spawning.
- `node tools/missionCheck.mjs`: checks all story jobs and garage storage, retrieval, and driving.
- `node tools/cityCheck.mjs`: checks road connectivity, dry landmarks and footprints, districts, and roof diversity.
- `node tools/perf3d.mjs`: checks simulation timing and actual browser draw-call and triangle budgets.
- `node tools/playtest.mjs`: checks a story job, theft, driving, pursuit, weapon purchase, interiors, and save/load.
- `bash tools/check3d.sh`: checks the game in a browser and captures a render.
- `bash tools/shots.sh`: captures the screenshot views and checks image size and brightness.

## Features
- 6 districts and 6 story jobs.
- 7 weapons and 11 vehicle types.
- 20 collectible postcards and 4 radio stations.
- 2 interiors and police pursuit up to 5 wanted stars.
- 3D presentation with a top-down 2D fallback.

## Controls
| Input | Action |
| --- | --- |
| W / A / S / D or arrow keys | Move; accelerate, brake, and steer while driving |
| Shift | Run |
| Space | Jump on foot; handbrake while driving |
| E | Enter or exit a vehicle; interact |
| Left mouse button or F | Shoot |
| Mouse movement | Camera and aiming input |
| R | Reload |
| Q | Weapon wheel |
| [ / ] | Previous / next weapon |
| C | Crouch |
| H | Horn |
| M | Map |
| V | Toggle top-down 2D view |
| Escape | Pause |

## Attribution
three.js r160 (MIT), vendored as a UMD build.
Procedural art and synth audio were made for this game; no third-party assets.
