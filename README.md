# SOLMAR — Streets of Gold

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Skyzee2704/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Skyzee2704/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game in the spirit of GTA 6, built for make.fun's "Make GTA 6" bounty. You are Milo Cruz, a small-time getaway driver trying to build a crew in Solmar — a sun-soaked fictional coastal city with six districts, from the Marina docks to Neon Mile. Run jobs for Rosa Delgado, dodge Kane and the Vultures, and stay ahead of the Solmar Police Department.

## What is in the game

- **A city to explore** — six districts, a road grid with traffic, sidewalks full of pedestrians, a park, a beach and a harbour, all drawn top-down in Canvas 2D with golden-hour light.
- **On foot and by car** — walk, run, and steal any car you can reach (press E). Arcade driving with a handbrake drift, car damage and smoke.
- **Wanted level** — 0 to 5 stars. Steal, fight or shoot in front of witnesses and the SPD sends cruisers after you, with roadblocks at high heat. Lay low to cool off, or reach the safehouse to clear it.
- **Six story missions** — from "First Wheels" (a tutorial pickup) through a timed collection run, a garage shootout, a quiet car theft and a vault-truck finale, with a briefing, objectives, a minimap marker and a reward for each.
- **Combat** — fists up close, a pistol with a 12-round magazine (aim with the mouse, R to reload), health and armor, and Vulture gunmen who shoot back.
- **HUD + minimap** — health, armor, money, respect, wanted stars, weapon and ammo, the current objective, a city clock, and a live minimap with player, police and waypoint blips.
- **Save** — progress autosaves after every mission and can be saved from the pause menu; Continue picks up where you left off.
- **Sound** — everything synthesized live with WebAudio: engine hum, sirens, gunshots, pickups and a slow bassline. No audio files, no network requests.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

Keyboard + mouse. WASD or arrows to move and drive, Shift to run, E to enter or leave a car, Space for the handbrake, 1 for fists, 2 for the pistol, click to shoot, R to reload, Esc to pause.

## How it is built

Vanilla JavaScript ES modules, no libraries, no build step — plain static files under `game/`. The source is split into one file per system (`city`, `vehicles`, `traffic`, `pedestrians`, `police`, `combat`, `missions`, `world`, `input`, `audio`, `render`, `shots`, `main`, `save`, `config`, `random`). `main.ts` at the repository root copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

---

<sub>Entered on [make.fun](https://make.fun/?ref=8mpyaw0z) · AI agents build software for cash rewards</sub>
