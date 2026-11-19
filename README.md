# SOLMAR 3D — Streets of Gold

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Skyzee2704/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Skyzee2704/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

SOLMAR 3D — Streets of Gold. An open-world crime game in the spirit of GTA 6, built for make.fun's [Make GTA 6 bounty](https://make.fun/bounty/gta6-01) ($1,666 in USDC, top 100 paid). Explore the golden-hour coastal city of Solmar in full 3D: steal cars, outrun the Solmar Police Department, race the Neon Mile, and run six story jobs for Kane — from your first wheels to the King of Solmar finale. Three.js (vendored UMD build), vanilla JavaScript ES modules, WebAudio synth radio, no network requests, keyboard + mouse.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step. `game/` is plain static files; `serve.ts` is a tiny Node static server.

## Play

- **WASD** — drive / walk. **Space** — handbrake (drift). **E** — enter car, interact, enter interiors.
- **F** — shoot. **R** — reload. **Q** — switch weapon. **1–5** — weapon slots.
- **]** / **[** — radio station (SOLMAR 88.5 Golden Wave, FUEGO 101.9, WAVE 92.3, HARBOR 76.1).
- **M** — map. **V** — top-down view. **Esc** — pause (map / stats / story / settings).

## The city

Solmar is a 640×480 coastal city with 6 districts (Marina, Neon Mile, Downtown, Old Town, Beachfront, Hillside), about 200 buildings with lit windows and neon signs, 150 trees, a marina with drivable boats, a beachfront ferris wheel, and a police helicopter with a real searchlight. The clock starts at golden hour, 18:36, and the sun, sky, fog and street lights follow it.

## Story — 6 jobs

1. **First Wheels** — steal your first car on Marina Boulevard.
2. **Getaway Driver** — lose a 2-star pursuit across the city.
3. **The Collector** — pick up the package from the Old Town market.
4. **Vulture Trouble** — take down 6 Vultures at the docks.
5. **The Big Score** — hit the Downtown bank and get out clean.
6. **King of Solmar** — the finale: take the gold, escape a 4-star pursuit, reach the marina at night.

Plus side work: taxi fares, the Neon Mile street race against Neri Flint, Zella Coil and Ivo Switch, postcard hunting (20 to find), property buying (safehouse, garage, penthouse), and a shooting range.

## Systems

- **Wanted** — 5 stars, heat that decays, PCPD response list with call signs, distances and states (pursuit, ramming, roadblock, spotlight, searching, on foot).
- **Driving** — lateral + drift model, handbrake slides, tyre smoke and skid marks, damage smoke, transparent greenhouses with visible drivers.
- **Combat** — 7 weapons across 5 HUD slots, muzzle flash, hit markers, enemy chevrons, corpses with blood pools.
- **Radio** — four stations, each with its own drum pattern and four-track playlist, now-playing in the HUD.
- **Save** — autosave + continue, lifetime stats, percent complete in the pause menu.

## Screenshots

Four staged shots, all from real gameplay (staging save loaded through the real load path, autopilot through the real rules, deterministic per seed):

1. `1-cover.jpg` — street-level police chase at golden hour, Marina Boulevard.
2. `2-race.jpg` — Neon Mile race start gate, countdown done, rivals on the grid.
3. `3-onfoot.jpg` — on foot at dusk, Vulture Trouble, 2 of 6 down.
4. `4-map.jpg` — the city map at noon with jobs, legend and postcards.

Regenerate them with `node tools/shots.mjs` (headless Chromium, NDC-check, luma floors, 180–256 KB).

## Gates

```sh
node tools/simCheck.mjs       # sim: driving, wanted escalation, police far spawn
node tools/missionCheck.mjs   # 6/6 story jobs + garage store/retrieve
node tools/cityCheck.mjs      # road connectivity, 200 buildings, 150 trees
node tools/perf3d.mjs         # 8 ms sim budget, <100 draw calls, <200k triangles
node tools/playtest.mjs       # 11/11 playtest steps in headless Chromium
node tools/shots.mjs          # 4/4 shots, NDC-check + luma + size
```

## Tech

- Three.js r160 (vendored UMD, `game/vendor/three.min.js`), ES modules, Node 22 stdlib only.
- Sim and renderer are separate; the sim is deterministic per seed and fully testable in Node without a browser or GPU.
- Procedural everything: sky shader, water shader with sun glitter and foam, building facades, cast portraits, radio synth.

## Bounty

Built for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). Play it on GitHub Pages: https://skyzee2704.github.io/gta6-01/

Referral: `8mpyaw0z`
