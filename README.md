# SOLMAR 3D — Streets of Gold

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Skyzee2704/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Skyzee2704/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

SOLMAR 3D is a 3D open-world crime game for make.fun's "Make GTA 6" bounty ($1,666 USDC, top 100 paid). Milo Cruz, a small-time getaway driver, works six story missions for Rosa Delgado across the sun-soaked coastal city of Solmar — steal cars, outrun the Solmar Police Department, rob a vault truck, and become King of Solmar. Three.js 3D, vanilla JavaScript, synth audio, no network requests. Keyboard + mouse.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

## Checks

- `node tools/cityCheck.mjs` — city builds for seeds 1–3, road graph connected, no landmark in the sea
- `node tools/simCheck.mjs` — 120 s headless sim at wanted 4, no NaN, no crash (100.9 µs/step)
- `node tools/missionCheck.mjs` — autopilot finishes all 6 missions + heat clears when hiding
- `node tools/perf3d.mjs` — night police chase, JS frame mean 0.196 ms (budget 8 ms)
- `bash tools/check3d.sh` — headless Chromium renders cover + title, no Uncaught, no renderer failure
- `bash tools/shots.sh` — renders the 4 screenshots + ffmpeg quality loop (200–240 KiB each)
- `MAKEFUN_OUTPUT_DIR=out node main.ts` — hand-in gate refuses a bad entry (exit 1); run twice, dossier byte-identical

## Features

- 6 districts with taglines + banners (Marina, Old Solmar, Neon Mile, Harbor Docks, Palm Heights, Downtown), ~53 buildings, palms, neon, lighthouse, cranes
- 11 vehicles (sedan, coupe, SUV, pickup, sports, taxi, van, cruiser, scooter, bike, bus) + 2 boats + player helicopter
- 7 weapons (pistol, SMG, rifle, shotgun, sniper, melee hook, molotov) with a weapon wheel, drive-by SMG, muzzle flash
- Wanted 0–5 stars, witnessed-only heat, search zone + escape meter, roadblocks at 3+, NPC heli searchlight at 4+, foot arrest at 1 star
- 6 story missions, 3 street-race routes with rival AI, 20 Solmar Postcards, Solmar Cab taxi fares, Pay n Spray, safehouse + penthouse ($20,000, $500/day)
- 2 walk-in interiors: Rosas Diner (eat = heal) and Harbor Arms gun shop (buy guns + ammo)
- 4 synth radio stations, dynamic weather (clear/cloudy/rain, grip ×0.85 in rain), day/night cycle from 18:15 golden hour, custom bloom
- HUD + live minimap + full city map (M), save/load (localStorage), deterministic sim (seed 1, fixed step 1/60)

## Controls

| Key | Action |
|---|---|
| WASD / arrows | Walk / drive |
| Mouse | Look / aim |
| E | Enter car, boat, helicopter, interior |
| Shift | Run / heli boost |
| Space | Jump / heli up, handbrake in car |
| Click | Fire weapon |
| R | Reload |
| Q (hold) | Weapon wheel · 1–7 select weapon |
| N / T / G | Next mission / taxi fare / street race |
| M | City map · V top-down view · Esc pause |

<sub>Entered on [make.fun](https://make.fun/?ref=8mpyaw0z&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
