// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 logical view is scaled to fit the window and centred. The
// city is drawn top-down with fake-height buildings, the HUD and a live
// minimap sit on top, and the menu screens are panels over a living city.
import {
  WORLD_W, WORLD_H, VIEW_W, VIEW_H, ROAD_X, ROAD_Y, ROAD_HALF,
  PALETTE, WANTED_MAX,
} from './config.js';
import { currentObjectiveLabel, currentObjectivePoint, MISSION_TITLES } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_HOWTO = 'howto';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_MISSION_DONE = 'missionDone';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const MINIMAP_W = 208;
const MINIMAP_H = 156;

function clockText(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / VIEW_W, height / VIEW_H);
    view.x = (width - VIEW_W * view.scale) / 2;
    view.y = (height - VIEW_H * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${size}|${weight || ''}`;
    if (!fonts.has(key)) fonts.set(key, `${weight ? `${weight} ` : ''}${size}px ${FONT}`);
    ctx.font = fonts.get(key);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---- city ground ----

  function drawGround(world, left, top, right, bottom) {
    // Grass base with a soft checker so the ground never looks flat.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(left, top, right - left, bottom - top);
    ctx.fillStyle = PALETTE.grassDark;
    const cell = 160;
    for (let gx = Math.floor(left / cell) * cell; gx < right; gx += cell) {
      for (let gy = Math.floor(top / cell) * cell; gy < bottom; gy += cell) {
        if (((gx + gy) / cell) % 2 === 0) ctx.fillRect(gx, gy, cell, cell);
      }
    }
    // Beach and water along the southern edge.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(left, Math.max(top, world.city.beachY), right - left, bottom - Math.max(top, world.city.beachY));
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(left, Math.max(top, world.city.waterY), right - left, bottom - Math.max(top, world.city.waterY));
    ctx.fillStyle = PALETTE.waterDeep;
    for (let wx = Math.floor(left / 90) * 90; wx < right; wx += 90) {
      ctx.fillRect(wx, world.city.waterY + 24, 46, 5);
      ctx.fillRect(wx + 30, world.city.waterY + 66, 40, 5);
    }
    // Parks.
    for (const park of world.city.parks) {
      ctx.fillStyle = PALETTE.park;
      ctx.fillRect(park.x, park.y, park.w, park.h);
      ctx.fillStyle = '#5d9bd4';
      ctx.beginPath();
      ctx.ellipse(park.x + park.w / 2, park.y + park.h / 2, 34, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawRoads(world, left, top, right, bottom) {
    ctx.fillStyle = PALETTE.sidewalk;
    for (const rx of ROAD_X) ctx.fillRect(rx - 48, top, 96, bottom - top);
    for (const ry of ROAD_Y) ctx.fillRect(left, ry - 48, right - left, 96);
    ctx.fillStyle = PALETTE.asphalt;
    for (const rx of ROAD_X) ctx.fillRect(rx - ROAD_HALF, top, ROAD_HALF * 2, bottom - top);
    for (const ry of ROAD_Y) ctx.fillRect(left, ry - ROAD_HALF, right - left, ROAD_HALF * 2);
    // Centre dashes.
    ctx.fillStyle = PALETTE.lane;
    for (const rx of ROAD_X) {
      for (let y = Math.floor(top / 44) * 44; y < bottom; y += 44) {
        if (Math.abs(y - Math.round(y / 320) * 320) < 40) continue;
        ctx.fillRect(rx - 2, y, 4, 22);
      }
    }
    for (const ry of ROAD_Y) {
      for (let x = Math.floor(left / 44) * 44; x < right; x += 44) {
        if (Math.abs(x - Math.round(x / 320) * 320) < 40) continue;
        ctx.fillRect(x, ry - 2, 22, 4);
      }
    }
    // Zebra crossings at every intersection.
    ctx.fillStyle = 'rgba(245, 240, 225, 0.85)';
    for (const rx of ROAD_X) {
      for (const ry of ROAD_Y) {
        for (let i = -2; i <= 2; i += 1) {
          ctx.fillRect(rx - 26 + i * 11, ry - 44, 6, 14);
          ctx.fillRect(rx - 26 + i * 11, ry + 30, 6, 14);
          ctx.fillRect(rx - 44, ry - 26 + i * 11, 14, 6);
          ctx.fillRect(rx + 30, ry - 26 + i * 11, 14, 6);
        }
      }
    }
    // Parking lot markings.
    for (const lot of world.city.parkingLots) {
      ctx.fillStyle = PALETTE.asphaltDark;
      ctx.fillRect(lot.x, lot.y, lot.w, lot.h);
      ctx.strokeStyle = PALETTE.lane;
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i += 1) {
        ctx.strokeRect(lot.x + 8 + i * 44, lot.y + 10, 36, 50);
      }
    }
    // Harbour containers.
    for (const c of world.city.containers) {
      ctx.fillStyle = c.color;
      ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let i = 1; i < 4; i += 1) ctx.fillRect(c.x + (c.w / 4) * i - 1, c.y, 2, c.h);
    }
  }

  function drawBuildings(world, left, top, right, bottom) {
    for (const b of world.city.buildings) {
      if (b.x + b.w < left || b.x > right || b.y + b.h < top || b.y > bottom) continue;
      const lift = b.height;
      // Soft shadow on the ground, then the wall, then the roof lifted
      // up-left: the lift is what makes a flat map read as a city.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(b.x + 4, b.y + b.h - 4, b.w, 10);
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(b.x + lift * 0.45, b.y + lift * 0.45, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.fillRect(b.x, b.y, b.w, 5);
      ctx.fillRect(b.x, b.y, 5, b.h);
      // Roof detail: a darker inset and, in Neon Mile, a glowing sign.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
      if (b.neon) {
        ctx.fillStyle = Math.floor(world.time * 2) % 2 === 0 ? '#ff5ad0' : '#37e0ff';
        ctx.fillRect(b.x + b.w / 2 - 14, b.y - 4, 28, 8);
      }
    }
    for (const tree of world.city.trees) {
      if (tree.x < left || tree.x > right || tree.y < top || tree.y > bottom) continue;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.arc(tree.x + 3, tree.y + 4, tree.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.tree;
      ctx.beginPath();
      ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.treeLight;
      ctx.beginPath();
      ctx.arc(tree.x - 3, tree.y - 3, tree.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- entities ----

  function drawCarShape(car, flashing) {
    const specLen = car.type === 'truck' ? 72 : car.type === 'van' ? 62 : 52;
    const specWid = car.type === 'truck' ? 30 : car.type === 'van' ? 28 : 26;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    roundRect(-specLen / 2 + 3, -specWid / 2 + 4, specLen, specWid, 8);
    ctx.fill();
    // Wheels.
    ctx.fillStyle = '#1c1a18';
    const wl = specLen / 2 - 10;
    const ww = specWid / 2 - 1;
    ctx.fillRect(-wl, -ww - 3, 14, 6);
    ctx.fillRect(wl - 14, -ww - 3, 14, 6);
    ctx.fillRect(-wl, ww - 3, 14, 6);
    ctx.fillRect(wl - 14, ww - 3, 14, 6);
    // Body.
    ctx.fillStyle = car.color;
    roundRect(-specLen / 2, -specWid / 2, specLen, specWid, 8);
    ctx.fill();
    // Cabin + windshield.
    ctx.fillStyle = 'rgba(20, 30, 44, 0.85)';
    roundRect(-specLen / 2 + 12, -specWid / 2 + 5, 16, specWid - 10, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(40, 50, 66, 0.55)';
    roundRect(specLen / 2 - 22, -specWid / 2 + 5, 10, specWid - 10, 3);
    ctx.fill();
    if (car.type === 'taxi') {
      ctx.fillStyle = '#222';
      for (let i = 0; i < 4; i += 1) ctx.fillRect(-specLen / 2 + 6 + i * 10, -3, 5, 6);
    }
    if (car.type === 'cruiser') {
      ctx.fillStyle = '#2f6fd0';
      ctx.fillRect(-specLen / 2 + 2, -specWid / 2, 6, specWid);
      ctx.fillRect(-specLen / 2 + 2, -2, specLen - 4, 4);
      if (flashing) {
        ctx.fillStyle = Math.floor(performance.now() / 280) % 2 === 0 ? '#ff3b30' : '#2f7bff';
        ctx.fillRect(-6, -specWid / 2 - 3, 12, 6);
      }
    }
    // Headlights.
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(specLen / 2 - 2, -specWid / 2 + 3, 3, 5);
    ctx.fillRect(specLen / 2 - 2, specWid / 2 - 8, 3, 5);
    // Damage: a bent hood reads as smoke in the world, but a dark patch
    // on the body shows the beating at a glance.
    if (car.hp < car.maxHp * 0.5) {
      ctx.fillStyle = 'rgba(20, 16, 12, 0.5)';
      ctx.beginPath();
      ctx.arc(specLen / 2 - 8, 0, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPedestrian(ped) {
    const bob = Math.sin(ped.phase) * 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(ped.x, ped.y + 8, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(ped.x, ped.y + bob * 0.4);
    ctx.rotate(ped.angle);
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.skin;
    ctx.beginPath();
    ctx.arc(5, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (ped.scared > 0.4) {
      text('!', ped.x + 10, ped.y - 10, 16, '#ffdf3d', 'center', 'bold');
    }
  }

  function drawPlayer(world) {
    const p = world.player;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 9, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    if (p.onFoot) {
      // Milo: teal jacket, dark jeans, facing where he walks or aims.
      ctx.fillStyle = '#1f8a70';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8b88a';
      ctx.beginPath();
      ctx.arc(6, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      if (p.loadout.weapon === 'pistol') {
        ctx.fillStyle = '#222';
        ctx.fillRect(8, -2, 14, 4);
      }
    }
    ctx.restore();
    // A thin gold ring so the player never gets lost in a crowd.
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawEnemy(enemy) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + 9, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.angle);
    ctx.fillStyle = '#7a2e2e';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d9c9a8';
    ctx.beginPath();
    ctx.arc(6, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(8, -2, 13, 4);
    ctx.restore();
    // Health bar over a wounded Vulture.
    if (enemy.hp < enemy.maxHp) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(enemy.x - 14, enemy.y - 22, 28, 5);
      ctx.fillStyle = '#e5484d';
      ctx.fillRect(enemy.x - 13, enemy.y - 21, 26 * (enemy.hp / enemy.maxHp), 3);
    }
  }

  function drawMarker(world, left, top, right, bottom) {
    const point = currentObjectivePoint(world.mission);
    if (!point) return;
    const pulse = 1 + Math.sin(world.time * 4) * 0.15;
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 26 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    ctx.fill();
    // A floating label so the marker reads even when zoomed out.
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'center';
    const label = point.label || '';
    const w = ctx.measureText(label).width + 18;
    ctx.fillStyle = 'rgba(12, 10, 8, 0.75)';
    roundRect(point.x - w / 2, point.y - 52, w, 24, 6);
    ctx.fill();
    ctx.fillStyle = PALETTE.hudText;
    ctx.fillText(label, point.x, point.y - 35);
    // Mission cars get a gold outline of their own.
    for (const car of world.vehicles) {
      if (!car.tag) continue;
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(car.x, car.y, 34, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawParticles(world) {
    for (const p of world.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = p.kind === 'skid' ? alpha * 0.8 : alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.kind === 'puff' ? 1 + (1 - alpha) : 1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const t of world.tracers) {
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(t.x0, t.y0);
      ctx.lineTo(t.x1, t.y1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // ---- HUD ----

  function drawStars(world) {
    const level = world.wanted.level;
    const x0 = VIEW_W - 24;
    for (let i = 0; i < WANTED_MAX; i += 1) {
      const filled = i < level;
      const blink = filled && level >= 4 && Math.floor(world.time * 3) % 2 === 0;
      text('★', x0 - i * 30, 44, 30, filled ? (blink ? '#ff6b5e' : PALETTE.gold) : 'rgba(245,234,210,0.25)', 'right', 'bold');
    }
    if (level > 0) {
      text('WANTED', x0, 66, 13, '#ff8a7a', 'right', 'bold');
    }
  }

  function drawHud(world, saveState) {
    const p = world.player;
    // Top-left: money, district, clock.
    ctx.fillStyle = PALETTE.hudBg;
    roundRect(16, 14, 250, 64, 10);
    ctx.fill();
    text(`$${p.money.toLocaleString('en-US')}`, 30, 42, 26, PALETTE.gold, 'left', 'bold');
    text(p.district, 30, 64, 14, PALETTE.hudText, 'left');
    text(clockText(world.clockMinutes), 252, 42, 20, PALETTE.hudText, 'right');
    text(`Respect ${p.respect}`, 252, 64, 13, PALETTE.hudText, 'right');
    drawStars(world);
    // Objective banner, top centre.
    const label = currentObjectiveLabel(world.mission);
    if (label) {
      ctx.font = `bold 17px ${FONT}`;
      const w = ctx.measureText(label).width + 36;
      ctx.fillStyle = PALETTE.hudBg;
      roundRect((VIEW_W - w) / 2, 14, w, 36, 10);
      ctx.fill();
      text(label, VIEW_W / 2, 38, 17, PALETTE.hudText, 'center', 'bold');
      const obj = world.mission.objective;
      if (obj && obj.seconds) {
        text(`${Math.ceil(world.mission.timer)}s`, VIEW_W / 2, 66, 15, world.mission.timer < 30 ? '#ff8a7a' : PALETTE.hudText, 'center', 'bold');
      }
    }
    if (world.mission.banner > 0 && world.mission.bannerText) {
      ctx.font = `bold 30px ${FONT}`;
      const w = ctx.measureText(world.mission.bannerText).width + 48;
      ctx.fillStyle = 'rgba(12, 10, 8, 0.8)';
      roundRect((VIEW_W - w) / 2, 120, w, 52, 10);
      ctx.fill();
      text(world.mission.bannerText, VIEW_W / 2, 156, 30, PALETTE.gold, 'center', 'bold');
    }
    // Bottom-left: health, armor, weapon.
    ctx.fillStyle = PALETTE.hudBg;
    roundRect(16, VIEW_H - 84, 300, 68, 10);
    ctx.fill();
    text('HP', 30, VIEW_H - 52, 14, PALETTE.hudText, 'left', 'bold');
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(66, VIEW_H - 64, 180, 12);
    ctx.fillStyle = p.hp > 30 ? '#5ec96a' : '#e5484d';
    ctx.fillRect(66, VIEW_H - 64, 180 * (p.hp / 100), 12);
    text('ARMOR', 30, VIEW_H - 28, 14, PALETTE.hudText, 'left', 'bold');
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(66, VIEW_H - 40, 180, 12);
    ctx.fillStyle = '#7fb2e5';
    ctx.fillRect(66, VIEW_H - 40, 180 * (p.armor / 100), 12);
    const loadout = p.loadout;
    if (p.onFoot) {
      const ammo = loadout.weapon === 'pistol'
        ? `Pistol  ${loadout.pistolMag} / ${loadout.pistolReserve}${loadout.reloading ? '  reloading…' : ''}`
        : 'Fists  —  press 2 for pistol';
      text(ammo, 330, VIEW_H - 38, 16, PALETTE.hudText, 'left');
    } else if (p.car) {
      const pct = Math.max(0, p.car.hp / p.car.maxHp);
      text(`Car  ${p.car.label}`, 330, VIEW_H - 52, 16, PALETTE.hudText, 'left');
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(330, VIEW_H - 40, 130, 10);
      ctx.fillStyle = pct > 0.4 ? '#e8b93c' : '#e5484d';
      ctx.fillRect(330, VIEW_H - 40, 130 * pct, 10);
    }
    // Controls hint, fading after the first half minute.
    if (world.time < 30) {
      text('WASD move · E enter car · Space handbrake · 1/2 weapon · Click shoot · Esc pause', VIEW_W / 2, VIEW_H - 16, 13, 'rgba(245,234,210,0.75)', 'center');
    }
    if (saveState) {
      text(saveState, VIEW_W - 16, VIEW_H - 16, 13, 'rgba(245,234,210,0.75)', 'right');
    }
    // Off-screen objective arrow on the view edge.
    const point = currentObjectivePoint(world.mission);
    if (point) {
      const cam = world.camera;
      const dx = point.x - cam.x;
      const dy = point.y - cam.y;
      const onScreen = Math.abs(dx) < VIEW_W / 2 - 60 && Math.abs(dy) < VIEW_H / 2 - 60;
      if (!onScreen) {
        const angle = Math.atan2(dy, dx);
        const ax = VIEW_W / 2 + Math.cos(angle) * (VIEW_W / 2 - 90);
        const ay = VIEW_H / 2 + Math.sin(angle) * (VIEW_H / 2 - 90);
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(angle);
        ctx.fillStyle = PALETTE.gold;
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-10, -11);
        ctx.lineTo(-10, 11);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawMinimap(world) {
    const mx = VIEW_W - MINIMAP_W - 16;
    const my = VIEW_H - MINIMAP_H - 16;
    const sx = MINIMAP_W / WORLD_W;
    const sy = MINIMAP_H / WORLD_H;
    ctx.fillStyle = 'rgba(10, 12, 10, 0.82)';
    roundRect(mx - 6, my - 6, MINIMAP_W + 12, MINIMAP_H + 12, 10);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.rect(mx, my, MINIMAP_W, MINIMAP_H);
    ctx.clip();
    ctx.fillStyle = '#2c3a26';
    ctx.fillRect(mx, my, MINIMAP_W, MINIMAP_H);
    ctx.fillStyle = '#3fa8b8';
    ctx.fillRect(mx, my + world.city.waterY * sy, MINIMAP_W, MINIMAP_H - world.city.waterY * sy);
    ctx.strokeStyle = '#c9bfa5';
    ctx.lineWidth = 2;
    for (const rx of ROAD_X) {
      ctx.beginPath();
      ctx.moveTo(mx + rx * sx, my);
      ctx.lineTo(mx + rx * sx, my + MINIMAP_H);
      ctx.stroke();
    }
    for (const ry of ROAD_Y) {
      ctx.beginPath();
      ctx.moveTo(mx, my + ry * sy);
      ctx.lineTo(mx + MINIMAP_W, my + ry * sy);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(233, 220, 190, 0.5)';
    for (const b of world.city.buildings) {
      ctx.fillRect(mx + b.x * sx, my + b.y * sy, Math.max(1, b.w * sx), Math.max(1, b.h * sy));
    }
    // View rectangle.
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      mx + (world.camera.x - VIEW_W / 2) * sx,
      my + (world.camera.y - VIEW_H / 2) * sy,
      VIEW_W * sx, VIEW_H * sy,
    );
    const point = currentObjectivePoint(world.mission);
    if (point) {
      ctx.fillStyle = PALETTE.gold;
      ctx.save();
      ctx.translate(mx + point.x * sx, my + point.y * sy);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-5, -5, 10, 10);
      ctx.restore();
    }
    for (const car of world.vehicles) {
      if (car.owner === 'police') {
        ctx.fillStyle = Math.floor(world.time * 3) % 2 === 0 ? '#ff3b30' : '#2f7bff';
        ctx.beginPath();
        ctx.arc(mx + car.x * sx, my + car.y * sy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mx + world.player.x * sx, my + world.player.y * sy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
    text('SOLMAR', mx + MINIMAP_W, my - 10, 12, PALETTE.hudText, 'right', 'bold');
  }

  // ---- screens ----

  function drawPanel(title, lines, prompt, accent) {
    const width = 640;
    const height = 150 + lines.length * 32 + 64;
    const x = (VIEW_W - width) / 2;
    const y = (VIEW_H - height) / 2;
    ctx.fillStyle = 'rgba(10, 9, 7, 0.88)';
    roundRect(x, y, width, height, 14);
    ctx.fill();
    ctx.strokeStyle = accent || PALETTE.gold;
    ctx.lineWidth = 2;
    roundRect(x, y, width, height, 14);
    ctx.stroke();
    text(title, VIEW_W / 2, y + 66, 44, accent || PALETTE.gold, 'center', 'bold');
    lines.forEach((line, i) => {
      text(line, VIEW_W / 2, y + 122 + i * 32, 19, PALETTE.hudText, 'center');
    });
    if (prompt) text(prompt, VIEW_W / 2, y + height - 30, 18, PALETTE.gold, 'center', 'bold');
  }

  function drawTitle(world, ui) {
    drawWorldFrame(world);
    ctx.fillStyle = 'rgba(20, 14, 8, 0.45)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text('SOLMAR', VIEW_W / 2, 190, 96, PALETTE.gold, 'center', 'bold');
    text('— STREETS OF GOLD —', VIEW_W / 2, 232, 26, PALETTE.hudText, 'center', 'bold');
    text('A sun-soaked open-world crime story. Steal cars, outrun the SPD,', VIEW_W / 2, 272, 18, PALETTE.hudText, 'center');
    text('and run six missions for Rosa Delgado — from first wheels to King of Solmar.', VIEW_W / 2, 298, 18, PALETTE.hudText, 'center');
    const items = ['New Game', 'Continue', 'How to Play'];
    if (ui.saveExists === false) items[1] = 'Continue (no save yet)';
    items.forEach((item, i) => {
      const y = 380 + i * 52;
      const selected = ui.menuIndex === i;
      if (selected) {
        ctx.fillStyle = PALETTE.gold;
        roundRect(VIEW_W / 2 - 190, y - 30, 380, 44, 10);
        ctx.fill();
        text(item, VIEW_W / 2, y, 22, '#191410', 'center', 'bold');
      } else {
        text(item, VIEW_W / 2, y, 22, PALETTE.hudText, 'center');
      }
    });
    text('WASD / arrows to move · Enter to choose · E to enter a car', VIEW_W / 2, 560, 15, 'rgba(245,234,210,0.8)', 'center');
    text('Milo Cruz · Rosa Delgado · Kane and the Vultures · Solmar Police Department', VIEW_W / 2, 596, 14, 'rgba(245,234,210,0.6)', 'center');
  }

  function drawHowTo() {
    drawPanel('How to Play', [
      'Move: WASD or arrow keys — hold Shift to run.',
      'Enter a car: walk close and press E. Press E again to get out.',
      'Steal a parked or driven car — but witnesses call the police.',
      'Drive: W accelerate, S brake / reverse, A D steer, Space handbrake.',
      'Fight: press 2 for the pistol, aim with the mouse, click to shoot.',
      'Press R to reload. Fists are key 1. Armor and health pickups help.',
      'Wanted stars bring cruisers. Hide to cool off, or reach the Safehouse.',
      'Missions: follow the gold marker. Finish all six to rule Solmar.',
      'Esc pauses. Progress saves after every mission.',
    ], 'Press Esc to go back');
  }

  function drawPaused(world, ui) {
    drawWorldFrame(world);
    drawHud(world, ui.saveNote);
    drawMinimap(world);
    ctx.fillStyle = 'rgba(10, 9, 7, 0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const items = ['Resume', 'Save Game', 'Restart Mission', 'Quit to Title'];
    drawPanel('Paused', items.map((item, i) => `${ui.menuIndex === i ? '▶ ' : '   '}${item}`), 'Enter to choose · Esc to resume');
  }

  function drawMissionDone(world) {
    drawWorldFrame(world);
    const def = world.mission.lastDone;
    const lines = def ? [
      `${def.title} — complete.`,
      `Reward: $${def.reward}. Respect grows.`,
      `Next: ${MISSION_TITLES[def.id + 1] || 'Free roam — Solmar is yours.'}`,
    ] : ['Mission complete.'];
    drawPanel('Mission Complete', lines, 'Press Enter to keep playing');
  }

  function drawBusted() {
    drawPanel('BUSTED', [
      'The Solmar Police Department caught Milo.',
      'The crew will post bail. The city is still out there.',
    ], 'Press Enter to retry the mission', '#7fb2e5');
  }

  function drawWasted() {
    drawPanel('WASTED', [
      'Milo went down in the streets of Solmar.',
      'Rosa is already lining up the next job.',
    ], 'Press Enter to retry the mission', '#e5484d');
  }

  // ---- frame ----

  function drawWorldFrame(world) {
    const shakeX = world.shake > 0 ? (Math.random() - 0.5) * world.shake : 0;
    const shakeY = world.shake > 0 ? (Math.random() - 0.5) * world.shake : 0;
    const left = world.camera.x - VIEW_W / 2 + shakeX;
    const top = world.camera.y - VIEW_H / 2 + shakeY;
    const right = left + VIEW_W;
    const bottom = top + VIEW_H;
    ctx.save();
    ctx.translate(-left, -top);
    drawGround(world, left, top, right, bottom);
    drawRoads(world, left, top, right, bottom);
    drawBuildings(world, left, top, right, bottom);
    drawMarker(world, left, top, right, bottom);
    for (const car of world.vehicles) {
      if (car.x < left - 80 || car.x > right + 80 || car.y < top - 80 || car.y > bottom + 80) continue;
      drawCarShape(car, car.owner === 'police');
    }
    for (const ped of world.peds) {
      if (ped.x < left - 30 || ped.x > right + 30 || ped.y < top - 30 || ped.y > bottom + 30) continue;
      drawPedestrian(ped);
    }
    for (const enemy of world.enemies) drawEnemy(enemy);
    drawPlayer(world);
    drawParticles(world);
    ctx.restore();
    // Golden-hour wash over everything.
    ctx.fillStyle = 'rgba(255, 176, 92, 0.07)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  /** Paint one frame: the world, then the HUD or the panel for the screen. */
  function draw(world, screen, ui) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#191410';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    if (screen === SCREEN_TITLE) {
      drawTitle(world, ui);
      return;
    }
    if (screen === SCREEN_HOWTO) {
      drawWorldFrame(world);
      drawHowTo();
      return;
    }
    drawWorldFrame(world);
    if (screen === SCREEN_PLAY) {
      drawHud(world, ui.saveNote);
      drawMinimap(world);
    } else if (screen === SCREEN_PAUSED) {
      drawHud(world, ui.saveNote);
      drawMinimap(world);
      ctx.fillStyle = 'rgba(10, 9, 7, 0.55)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      const items = ['Resume', 'Save Game', 'Restart Mission', 'Quit to Title'];
      drawPanel('Paused', items.map((item, i) => `${ui.menuIndex === i ? '▶ ' : '   '}${item}`), 'Enter to choose · Esc to resume');
    } else if (screen === SCREEN_MISSION_DONE) {
      drawHud(world, ui.saveNote);
      drawMinimap(world);
      drawMissionDone(world);
    } else if (screen === SCREEN_BUSTED) {
      drawBusted();
    } else if (screen === SCREEN_WASTED) {
      drawWasted();
    }
  }

  // Convert a screen point (CSS pixels, relative to the canvas) into the
  // logical 1280x720 coordinates the game draws in.
  function logicalFromScreen(sx, sy) {
    const ratio = window.devicePixelRatio || 1;
    return {
      x: (sx * ratio - view.x) / view.scale,
      y: (sy * ratio - view.y) / view.scale,
    };
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, resize, logicalFromScreen };
}
