# SOLMAR 3D — Streets of Gold

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Skyzee2704/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Skyzee2704/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

A 3D open-world crime game for make.fun's "Make GTA 6" bounty ($1,666 USDC, top 100 paid). You are Milo Cruz, a getaway driver in a yellow jacket. The Vultures took the gold; Rosa Delgado's crew wants it back. Six story jobs across a round island city at golden hour — steal cars, lose the cops, rob a vault truck, and become King of Solmar. Built with Three.js (UMD), vanilla JavaScript, and synth audio. No network requests, no build step.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

Click **START GAME** (or press Enter). The title screen shows the cast; the game opens at the safehouse at 18:12, golden hour.

## The city

Solmar is a round island (GTA San Andreas style), 640 × 480 units, ringed by a living sea. The city is generated from a seed — the default seed builds **37 buildings** (35–37 across seeds 1–5), 86 palms, 77 lamps, 24 containers, 28 parked cars, 20 tapes, and a road graph of 48 intersections and 82 edges. Six districts: Solmar Marina, Old Solmar, Neon Mile, Harbor Docks, Palm Heights, Downtown. The sun starts at 18.2 (golden hour) and the sky, fog, and sea follow it through the day.

## Story — six jobs

| # | Job | Payout |
|---|---|---|
| 1 | First Wheels — pick up Rosa's car at the pier | $450 |
| 2 | Getaway Driver — drive a friend out of the cordon, lose the cops | $650 |
| 3 | The Collector — pick up three packages across the island | $850 |
| 4 | Vulture Trouble — hold the workshop, chase the fleeing Vulture car | $1,050 |
| 5 | The Big Score — steal a sports car, deliver it to the docks | $1,450 |
| 6 | King of Solmar — hold the vault for 12 seconds, escape to the safehouse | $1,750 |

Start a job at Rosa's Diner. The pause menu shows % COMPLETE and lifetime stats (distance, cars stolen, shots, kills, deaths, money earned, tapes found).

## What is in the game

- **Driving & on-foot** — 11 vehicle models (sedan, coupe, SUV, pickup, sports, taxi, van, cruiser, scooter, bike, bus) with brake lights and damage smoke, 2 boats, a helicopter at the helipad. Traffic brakes for pedestrians; car–ped collisions work.
- **Weapons** — a 5-slot bar: 1 Pistol, 2 SMG, 3 Rifle, 4 Shotgun, 5 Sniper (no Fists slot). The weapon is always visible in a carry pose. Drive-by SMG, reload, muzzle flash. A dock hook and molotovs are also in the world.
- **Police** — wanted 0–5 stars, heat only rises when a crime is witnessed. Cops arrive in cruisers, get out and go on foot when close, and shoot in bursts at wanted 2+ (never during a mission). A cruiser stays parked while its cop is on foot. Roadblocks at 3+, a heli searchlight at 4+. The HUD police panel lists each unit with distance and state (ON FOOT / PURSUIT).
- **Races** — 3 routes (Marina Sprint, Neon Loop, Harbor Run) with a 3-2-1-GO countdown, input blocked on the grid, lit checkpoint gates, a live race board, rival name tags, and three original rivals: Neri Flint, Zella Coil, Ivo Switch.
- **Side content** — 20 Solmar Postcard tapes, Solmar Cab taxi fares, Pay n Spray respray, a safehouse and a $20,000 penthouse ($500/day), 2 walk-in interiors (Rosa's Diner: eat to heal; Harbor Arms gun shop: buy guns and ammo).
- **Radio** — 4 synth stations (GOLD FM, VICE CITY, BASSLINE, COAST FM) with a now-playing line. `]` next station, `[` previous — edge-triggered, one change per key press.
- **World** — procedural sky dome with a per-frame sun, fog that follows the horizon, a living sea (swell, sun glitter, pulsing beach foam), dynamic weather (clear / cloudy / rain, grip ×0.85 in rain), a day/night cycle, and a round rotating radar minimap plus a full city map (M).
- **Save** — progress, money, respect, and lifetime stats persist in localStorage (`solmar3d.save.v1`); loading is defensive (a corrupt save falls back to a fresh game).

## Controls

| Key | Action |
|---|---|
| WASD / arrows | Walk / drive (A/D strafe on foot, not mirrored) |
| Mouse | Look — turning right decreases yaw |
| E | Enter car / boat / heli, step into an interior |
| F | Exit vehicle |
| Space | Jump (on foot) / handbrake (in car) |
| Shift | Sprint / run |
| Click | Fire weapon |
| Q (hold) | Aim |
| R | Reload |
| 1–5 | Pistol / SMG / Rifle / Shotgun / Sniper |
| ] / [ | Next / previous radio station |
| G | Start a street race at the start line |
| M | City map |
| P / Esc | Pause (shows % COMPLETE + stats) |

## Checks (all measured, not estimated)

- `node tools/playtest.mjs` — 12/12 PASS (drive, steal + wanted, police chase, mission 1, diner + gun shop + buy SMG, race vs rival AI, boat, heli, rain, 2D fallback, save/load, HUD cop distances + 5-slot weapon bar)
- `node tools/cityCheck.mjs` — PASS (seeds 1–3, road graph connected, no landmark in the sea, 37 buildings on seed 1, spawn keepClear)
- `node tools/simCheck.mjs` — PASS (7200 steps, 63 µs/step, no NaN, cops included)
- `node tools/missionCheck.mjs` — 6/6 PASS (all six jobs + unlock progression + heat clears after hiding)
- `node tools/perf3d.mjs` — PASS (night chase, JS mean 0.045 ms, p95 0.091 ms, p99 0.312 ms, budget 8 ms)
- `bash tools/check3d.sh` — PASS (headless Chromium renders cover + title, no Uncaught, no renderer failure)
- `bash tools/shots.sh` — PASS (4 screenshots, luma: cover 0.42, title 0.38, onfoot 0.45, map 0.40)
- `node tools/record-video.mjs` — PASS (6 s gameplay, 1280×720, 0 page errors)
- `MAKEFUN_OUTPUT_DIR=out node main.ts` — hand-in gate (refuses a bad entry, exit 1)

The game source is ~5,700 lines across 33 modules in `game/src/` (sim, renderer, HUD, audio, and tools are separate modules). The sim is deterministic (seed 1, fixed step 1/60) so the headless checks reproduce.

<sub>Entered on [make.fun](https://make.fun/?ref=8mpyaw0z&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
