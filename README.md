# SOLMAR 3D — Streets of Gold

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Skyzee2704/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Skyzee2704/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

SOLMAR 3D is an open-world crime game in the spirit of GTA 6, built for make.fun's "Make GTA 6" bounty ($1,666 in USDC, top 100 paid). You are Milo Vane, a driver who came to the coastal city of Solmar with empty pockets and a fast car. Steal cars, outrun the Solmar Police Department, and run six story missions for the crew — from your first getaway to the King of Solmar finale.

## The city

Solmar is a round island, 640 by 480 units, ringed by the sea: a ring road, eight radial avenues, a street grid, and Marina Boulevard along the east coast. 99 buildings, 130 palms, a ferris wheel, a lighthouse, a harbor market, and the Downtown Bank Tower. The game opens at golden hour, 18:30, low warm sun over dark asphalt — and the clock keeps moving through night, rain, and dawn.

## What is in it

- **Six story missions** — steal the Vortex GT, drive a getaway, collect for Dario, clear the Vultures out of Rosa's garage, rob the Downtown Bank Tower, and escape the whole PCPD in the finale.
- **Driving** — 11 vehicles (8 cars, 2 bikes, a bus) plus a flyable helicopter and two boats, with grip, drift, damage, and tyre smoke. Traffic drives the real road graph and brakes for what is ahead.
- **Combat** — 7 weapons including the VK-47 rifle, always visible in hand, with a five-slot HUD, ammo, reloads, hit markers, and a red chevron over the target.
- **Wanted** — 5 stars. Foot officers arrest at one star and shoot in bursts from two stars up; cruisers ram; the helicopter circles with a searchlight from four stars; roadblocks at five.
- **World life** — pedestrians on the sidewalks who flee gunfire, taxi fares, street races against Neri Flint, Zella Coil and Ivo Switch, the Neon Nights arcade, 20 postcards, enterable diner, market, garage and penthouse, and four radio stations with their own drum patterns and fictional tracks.
- **Presentation** — three.js r160 (vendored, no network), WebAudio synth radio, a round rotating minimap with collision-resolved labels, mission banners, dialog with painted portraits, and a full pause menu with map, stats, story and settings.

## Controls

WASD move / drive · mouse look (click to lock) · E enter car, board, interact · left mouse fire · R reload · 1 / 2 switch weapon · ] / [ radio station · Space handbrake · M map · P pause · Enter respawn after being wasted.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

No build step, no network requests: `game/` is plain static files, three.js is vendored under `game/vendor/`.

## Shots

`shots.json` lists the four staged screenshots: the mission-6 escape on Marina Boulevard (cover), the Neon Mile race, the mission-4 shootout on foot, and the drawn city map. Each is deterministic from `?shot=<name>&seed=1`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=8mpyaw0z&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
