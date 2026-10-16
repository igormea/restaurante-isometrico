// Desenhos do jogo, feitos 100% em código (sem imagens).
// No futuro, cada "kind" pode ser trocado por uma imagem (sprite) desenhada por um artista
// sem mexer no resto do jogo: basta trocar a função correspondente aqui.
import { TW, TH, WALL_H } from './iso.js';
import { furnitureImg, foodImg } from './assets.js';
import { FURNITURE } from '../config/sprites.js';

// ---------- utilidades de cor ----------
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function shade(hex, amt) {
  const [r, g, b] = hexToRgb(hex);
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

// ponto relativo ao centro (cx, cy) de um quadrado: dx/dy em frações de quadrado, z em pixels
const P = (cx, cy, dx, dy, z = 0) => [cx + (dx - dy) * (TW / 2), cy + (dx + dy) * (TH / 2) - z];

function poly(ctx, pts, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

// caixa isométrica com sombreamento automático
export function box(ctx, cx, cy, w, d, h, z0, color, opt = {}) {
  const hw = w / 2, hd = d / 2, z1 = z0 + h;
  const ox = opt.ox || 0, oy = opt.oy || 0;
  const p = (dx, dy, z) => P(cx, cy, dx + ox, dy + oy, z);
  const top = opt.top || shade(color, 0.12);
  const left = opt.left || shade(color, -0.08);
  const right = opt.right || shade(color, -0.26);
  const edge = opt.edge === false ? null : shade(color, -0.45);
  // face da frente-esquerda (dy = +hd)
  poly(ctx, [p(-hw, hd, z0), p(hw, hd, z0), p(hw, hd, z1), p(-hw, hd, z1)], left);
  // face da frente-direita (dx = +hw)
  poly(ctx, [p(hw, hd, z0), p(hw, -hd, z0), p(hw, -hd, z1), p(hw, hd, z1)], right);
  // topo
  poly(ctx, [p(-hw, -hd, z1), p(hw, -hd, z1), p(hw, hd, z1), p(-hw, hd, z1)], top);
  if (edge) {
    ctx.strokeStyle = edge; ctx.globalAlpha *= 0.35; ctx.lineWidth = 1;
    ctx.beginPath();
    const a = p(-hw, hd, z1), b = p(hw, hd, z1), c = p(hw, -hd, z1);
    ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c);
    ctx.moveTo(...b); ctx.lineTo(...p(hw, hd, z0));
    ctx.stroke(); ctx.globalAlpha /= 0.35;
  }
}

// cilindro isométrico (raio em frações de quadrado)
export function cylinder(ctx, cx, cy, r, h, z0, color, opt = {}) {
  const rx = r * TW * 0.7, ry = rx / 2;
  const ox = opt.ox || 0, oy = opt.oy || 0;
  const [x, y0] = P(cx, cy, ox, oy, z0);
  const y1 = y0 - h;
  const g = ctx.createLinearGradient(x - rx, 0, x + rx, 0);
  g.addColorStop(0, shade(color, -0.05));
  g.addColorStop(0.55, shade(color, -0.2));
  g.addColorStop(1, shade(color, -0.4));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y0, rx, ry, 0, 0, Math.PI);
  ctx.lineTo(x - rx, y1);
  ctx.ellipse(x, y1, rx, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = opt.top || shade(color, 0.15);
  ctx.beginPath(); ctx.ellipse(x, y1, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

export function shadow(ctx, cx, cy, r = 0.4, alpha = 0.22) {
  ctx.fillStyle = `rgba(40,25,10,${alpha})`;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * TW * 0.7, r * TW * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
}

function blob(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

function glow(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,220,140,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}

// ---------- piso ----------
export function drawFloorTile(ctx, x, y, cx, cy, floor) {
  const pts = [P(cx, cy, -0.5, -0.5), P(cx, cy, 0.5, -0.5), P(cx, cy, 0.5, 0.5), P(cx, cy, -0.5, 0.5)];
  const { pattern, a, b } = floor;
  if (pattern === 'checker') {
    poly(ctx, pts, (x + y) % 2 ? b : a);
  } else if (pattern === 'wood') {
    poly(ctx, pts, a);
    ctx.strokeStyle = b; ctx.lineWidth = 1.5;
    for (let i = 1; i < 4; i++) {
      const t = -0.5 + i / 4;
      ctx.beginPath(); ctx.moveTo(...P(cx, cy, -0.5, t)); ctx.lineTo(...P(cx, cy, 0.5, t)); ctx.stroke();
    }
    const off = ((x * 7 + y * 3) % 4) / 4 - 0.5;
    ctx.beginPath(); ctx.moveTo(...P(cx, cy, off + 0.3, -0.5)); ctx.lineTo(...P(cx, cy, off + 0.3, -0.25)); ctx.stroke();
  } else if (pattern === 'tatami') {
    poly(ctx, pts, a);
    ctx.strokeStyle = b; ctx.lineWidth = 2.5;
    const horiz = (x + y) % 2 === 0;
    ctx.beginPath();
    if (horiz) { ctx.moveTo(...P(cx, cy, -0.5, 0)); ctx.lineTo(...P(cx, cy, 0.5, 0)); }
    else { ctx.moveTo(...P(cx, cy, 0, -0.5)); ctx.lineTo(...P(cx, cy, 0, 0.5)); }
    ctx.stroke();
    ctx.lineWidth = 2;
    poly(ctx, [P(cx, cy, -0.47, -0.47), P(cx, cy, 0.47, -0.47), P(cx, cy, 0.47, 0.47), P(cx, cy, -0.47, 0.47)], null, b);
  } else if (pattern === 'talavera') {
    poly(ctx, pts, a);
    poly(ctx, [P(cx, cy, 0, -0.32), P(cx, cy, 0.32, 0), P(cx, cy, 0, 0.32), P(cx, cy, -0.32, 0)], b);
    poly(ctx, [P(cx, cy, 0, -0.16), P(cx, cy, 0.16, 0), P(cx, cy, 0, 0.16), P(cx, cy, -0.16, 0)], '#f2b134');
    for (const [dx, dy] of [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) {
      poly(ctx, [P(cx, cy, dx, dy), P(cx, cy, dx * 0.7, dy), P(cx, cy, dx * 0.7, dy * 0.7), P(cx, cy, dx, dy * 0.7)], b);
    }
  } else {
    poly(ctx, pts, a);
  }
  // rejunte sutil
  ctx.strokeStyle = 'rgba(80,55,30,0.12)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.lineTo(...pts[2]); ctx.stroke();
}

// ---------- paredes ----------
// side 'left' = parede ao longo de x=0 ; 'right' = parede ao longo de y=0
export function drawWallSegment(ctx, side, i, wall, opts = {}) {
  const { pattern, a, b } = wall;
  let p0, p1;
  if (side === 'left') { p0 = [(0 - i) * TW / 2, (0 + i) * TH / 2]; p1 = [(0 - (i + 1)) * TW / 2, (i + 1) * TH / 2]; }
  else { p0 = [i * TW / 2, i * TH / 2]; p1 = [(i + 1) * TW / 2, (i + 1) * TH / 2]; }
  const H = WALL_H;
  const base = side === 'left' ? a : a;
  const faceShade = side === 'left' ? -0.04 : -0.16;
  const face = [[p0[0], p0[1]], [p1[0], p1[1]], [p1[0], p1[1] - H], [p0[0], p0[1] - H]];
  const lerp = (t, h) => [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t - h];

  if (opts.door) {
    // moldura da porta
    poly(ctx, face, shade(base, faceShade));
    poly(ctx, [lerp(0.15, 0), lerp(0.85, 0), lerp(0.85, H * 0.78), lerp(0.15, H * 0.78)], '#3a2a20');
    poly(ctx, [lerp(0.2, 0), lerp(0.8, 0), lerp(0.8, H * 0.73), lerp(0.2, H * 0.73)], opts.sky || '#8fd0e8');
    ctx.globalAlpha = 0.35;
    poly(ctx, [lerp(0.2, H * 0.4), lerp(0.8, H * 0.55), lerp(0.8, H * 0.73), lerp(0.2, H * 0.58)], '#ffffff');
    ctx.globalAlpha = 1;
  } else {
    poly(ctx, face, shade(base, faceShade));
    if (pattern === 'stripes') {
      for (let k = 0; k < 6; k += 2) {
        poly(ctx, [lerp(k / 6, 0), lerp((k + 1) / 6, 0), lerp((k + 1) / 6, H), lerp(k / 6, H)], shade(b, faceShade));
      }
    } else if (pattern === 'shoji') {
      ctx.strokeStyle = b; ctx.lineWidth = 3;
      for (let k = 0; k <= 3; k++) {
        ctx.beginPath(); ctx.moveTo(...lerp(k / 3, 14)); ctx.lineTo(...lerp(k / 3, H)); ctx.stroke();
      }
      for (const hh of [14, 45, 75, 105, H]) {
        ctx.beginPath(); ctx.moveTo(...lerp(0, hh)); ctx.lineTo(...lerp(1, hh)); ctx.stroke();
      }
    }
    if (opts.window) {
      poly(ctx, [lerp(0.22, 50), lerp(0.78, 50), lerp(0.78, 100), lerp(0.22, 100)], '#fff8ec');
      poly(ctx, [lerp(0.26, 54), lerp(0.74, 54), lerp(0.74, 96), lerp(0.26, 96)], opts.sky || '#a6dcf0');
      ctx.globalAlpha = 0.5;
      poly(ctx, [lerp(0.3, 60), lerp(0.45, 60), lerp(0.38, 92), lerp(0.3, 92)], '#ffffff');
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#fff8ec'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(...lerp(0.5, 54)); ctx.lineTo(...lerp(0.5, 96)); ctx.stroke();
    }
    // rodapé
    poly(ctx, [lerp(0, 0), lerp(1, 0), lerp(1, 12), lerp(0, 12)], shade(b, faceShade - 0.15));
  }
  // acabamento no topo da parede
  const t = 6;
  const off = side === 'left' ? [-TW / 2 * 0.12, -TH / 2 * 0.12] : [TW / 2 * 0.12, -TH / 2 * 0.12];
  poly(ctx, [[p0[0], p0[1] - H], [p1[0], p1[1] - H], [p1[0] + off[0], p1[1] - H + off[1] - t], [p0[0] + off[0], p0[1] - H + off[1] - t]],
    '#fbf6ee');
}

// ---------- personagens ----------
export function drawCharacter(ctx, x, y, look, t, opt = {}) {
  const walking = opt.walking;
  const sitting = opt.sitting;
  const bob = walking ? Math.abs(Math.sin(t * 10)) * 3 : Math.sin(t * 2) * 0.6;
  const lift = sitting ? 18 : 0;
  const s = 1;
  if (!sitting) shadow(ctx, x, y, 0.2, 0.25);
  const by = y - lift - bob;
  ctx.save();
  if (opt.flip) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
  if (opt.scale && opt.scale !== 1) { ctx.translate(x, y - lift); ctx.scale(opt.scale, opt.scale); ctx.translate(-x, -(y - lift)); }
  // pernas
  if (!sitting) {
    const step = walking ? Math.sin(t * 10) * 4 : 0;
    ctx.fillStyle = look.pants;
    roundRect(ctx, x - 7 + step * 0.3, by - 18, 6, 18, 3);
    roundRect(ctx, x + 1 - step * 0.3, by - 18, 6, 18, 3);
    ctx.fillStyle = '#3a2a20';
    roundRect(ctx, x - 8 + step * 0.3, by - 4, 8, 5, 2);
    roundRect(ctx, x + 0 - step * 0.3, by - 4, 8, 5, 2);
  } else {
    ctx.fillStyle = look.pants;
    roundRect(ctx, x - 8, by - 14, 16, 10, 4);
  }
  // corpo
  ctx.fillStyle = look.shirt;
  roundRect(ctx, x - 10 * s, by - 40, 20, 26, 8);
  if (look.apron) {
    ctx.fillStyle = look.apron;
    roundRect(ctx, x - 7, by - 32, 14, 20, 4);
  }
  if (look.bow) {
    ctx.fillStyle = look.bow;
    ctx.beginPath(); ctx.moveTo(x, by - 38); ctx.lineTo(x - 5, by - 41); ctx.lineTo(x - 5, by - 35); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x, by - 38); ctx.lineTo(x + 5, by - 41); ctx.lineTo(x + 5, by - 35); ctx.closePath(); ctx.fill();
  }
  // braços
  ctx.fillStyle = look.shirt;
  const arm = walking ? Math.sin(t * 10) * 3 : 0;
  roundRect(ctx, x - 14, by - 38 + arm, 5, 16, 3);
  roundRect(ctx, x + 9, by - 38 - arm, 5, 16, 3);
  ctx.fillStyle = look.skin;
  blob(ctx, x - 11.5, by - 21 + arm, 3, look.skin);
  blob(ctx, x + 11.5, by - 21 - arm, 3, look.skin);
  if (opt.carry) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(x + 13, by - 26, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    drawFood(ctx, opt.carry, x + 13, by - 30, 18);
  }
  if (opt.tool) {
    ctx.font = '22px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(opt.tool, x + 16, by - 22 + Math.sin(t * 9) * 2);
  }
  if (look.gloves) { blob(ctx, x - 11.5, by - 21 + arm, 3.4, look.gloves); blob(ctx, x + 11.5, by - 21 - arm, 3.4, look.gloves); }
  // cabeça
  const hy = by - 52;
  blob(ctx, x, hy, 12, look.skin);
  // cabelo
  ctx.fillStyle = look.hair;
  ctx.beginPath(); ctx.arc(x, hy - 2, 12.5, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  if (look.hairStyle === 'long') { roundRect(ctx, x - 13, hy - 4, 6, 18, 3); roundRect(ctx, x + 7, hy - 4, 6, 18, 3); }
  if (look.hairStyle === 'bun') blob(ctx, x + 3, hy - 14, 5.5, look.hair);
  // rosto
  ctx.fillStyle = '#2b2018';
  const eyeOff = opt.flip ? 0 : 0;
  blob(ctx, x - 4 + eyeOff, hy + 1, 1.6, '#2b2018');
  blob(ctx, x + 4 + eyeOff, hy + 1, 1.6, '#2b2018');
  ctx.fillStyle = 'rgba(230,110,110,0.35)';
  blob(ctx, x - 7, hy + 5, 2.5, 'rgba(230,110,110,0.35)');
  blob(ctx, x + 7, hy + 5, 2.5, 'rgba(230,110,110,0.35)');
  ctx.strokeStyle = '#2b2018'; ctx.lineWidth = 1.2;
  ctx.beginPath();
  if (opt.mood === 'angry') ctx.arc(x, hy + 9, 3, Math.PI * 1.15, Math.PI * 1.85);
  else ctx.arc(x, hy + 4, 3, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  // chapéus
  if (look.hat === 'chef') {
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x - 9, hy - 18, 18, 8, 2);
    blob(ctx, x - 6, hy - 22, 6, '#ffffff'); blob(ctx, x + 6, hy - 22, 6, '#ffffff'); blob(ctx, x, hy - 26, 7, '#ffffff');
    ctx.strokeStyle = '#e2e2e2'; ctx.beginPath(); ctx.moveTo(x - 9, hy - 14); ctx.lineTo(x + 9, hy - 14); ctx.stroke();
  }
  if (look.hat === 'sun') {
    ctx.fillStyle = '#e9d29a';
    ctx.beginPath(); ctx.ellipse(x, hy - 8, 19, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, hy - 9, 10, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#d1495b'; ctx.fillRect(x - 10, hy - 11, 20, 3);
  }
  if (look.hat === 'cap') {
    ctx.fillStyle = look.capColor || '#3d5a80';
    ctx.beginPath(); ctx.arc(x, hy - 4, 12.5, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 8, hy - 4, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// balão de fala com o texto quebrado em linhas
export function drawSpeech(ctx, x, y, text, alpha = 1, opt = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = '700 13px Nunito, sans-serif';
  const maxW = 150;
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  const lh = 16;
  const w = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width))) + 18;
  const h = lines.length * lh + 10;
  const bx = x - w / 2, byy = y - h - 10;
  ctx.fillStyle = 'rgba(60,35,15,0.22)';
  roundRect(ctx, bx + 2, byy + 3, w, h, 10);
  ctx.fillStyle = opt.bg || '#ffffff';
  roundRect(ctx, bx, byy, w, h, 10);
  ctx.beginPath(); ctx.moveTo(x - 6, byy + h - 1); ctx.lineTo(x, y - 2); ctx.lineTo(x + 6, byy + h - 1); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = opt.border || '#d9c7ab'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(bx + 10, byy); ctx.arcTo(bx + w, byy, bx + w, byy + h, 10); ctx.arcTo(bx + w, byy + h, x + 6, byy + h, 10);
  ctx.lineTo(x + 6, byy + h); ctx.lineTo(x, y - 2); ctx.lineTo(x - 6, byy + h);
  ctx.arcTo(bx, byy + h, bx, byy, 10); ctx.arcTo(bx, byy, bx + w, byy, 10); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = opt.color || '#3b2a1e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, x, byy + 5 + lh / 2 + i * lh));
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}
export { roundRect };

// ---------- itens ----------
// opt: { t: tempo, stove: {state, recipe}, dish: {icon, servings}, facing: {dx,dy} }
// comida/bebida: imagem do pacote, ou o emoji se não houver imagem
export function drawFood(ctx, icon, x, y, size) {
  const img = foodImg(icon);
  if (img) {
    const s = size / Math.max(img.width, img.height);
    const w = img.width * s, h = img.height * s;
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
    return;
  }
  ctx.font = `${Math.round(size * 0.85)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(icon, x, y);
}

// direção da imagem: cadeira vira para a mesa; móvel na parede da esquerda olha para a direita
const CHAIR_DIR = { '1,0': 'SE', '0,1': 'SW', '0,-1': 'NE', '-1,0': 'NW' };
function spriteDir(spec, opt) {
  if (spec.chair) { const f = opt.facing || { dx: 1, dy: 0 }; return CHAIR_DIR[`${f.dx},${f.dy}`] || 'SE'; }
  if (opt.gx === 0 && opt.gy > 0) return 'SE';
  return 'SW';
}

// desenha um móvel com imagem; devolve false se não houver imagem (aí usa o desenho em código)
function drawSpriteItem(ctx, item, cx, cy, opt) {
  const spec = FURNITURE[item.id];
  if (!spec) return false;
  const img = furnitureImg(spec.sprite, spriteDir(spec, opt));
  if (!img) return false;
  const sc = (spec.scale || 1) * 0.84; // os renders do pacote são um pouco maiores que o nosso quadrado
  const w = img.width * sc, h = img.height * sc;
  const t = opt.t || 0;
  shadow(ctx, cx, cy + 2, Math.min(0.45, w / TW * 0.42), 0.18);
  ctx.drawImage(img, cx - w / 2, cy + w * 0.27 - h, w, h);
  const z = Math.max(8, h - w * 0.55); // altura do tampo
  const P2 = (dx, dy, zz = z) => P(cx, cy, dx, dy, zz);
  switch (item.kind) {
    case 'stove': {
      if (opt.stove && opt.stove.state === 'cooking') {
        for (const [dx, dy] of [[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]]) {
          const [bx, by] = P2(dx, dy);
          glow(ctx, bx, by, 12, 'rgba(255,120,40,0.75)');
        }
        cylinder(ctx, cx, cy, 0.22, 16, z, '#c0c6cf', { top: '#e7ebf0' });
        const [px, py] = P2(0, 0, z + 16);
        ctx.fillStyle = '#c5582f';
        ctx.beginPath(); ctx.ellipse(px, py, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
        for (let k = 0; k < 3; k++) {
          const ph = (t * 0.6 + k / 3) % 1;
          ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - ph)})`;
          ctx.beginPath(); ctx.arc(px + Math.sin((t + k) * 2) * 6, py - 8 - ph * 30, 5 + ph * 6, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;
    }
    case 'counter': {
      if (opt.plates && opt.plates.length) {
        const offs = [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]];
        opt.plates.slice(0, 4).forEach((icon, i) => {
          const [px, py] = P2(offs[i][0], offs[i][1]);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.ellipse(px, py, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#d6d0c4'; ctx.lineWidth = 1; ctx.stroke();
          drawFood(ctx, icon, px, py - 5, 20);
        });
      }
      break;
    }
    case 'sink': {
      if (opt.washing) {
        const [bx, by] = P2(0, 0);
        for (let k = 0; k < 6; k++) {
          const a = t * 2 + k;
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.beginPath(); ctx.arc(bx + Math.cos(a) * 10, by - 2 + Math.sin(a * 1.3) * 4 - (k % 3) * 3, 3 + (k % 2), 0, Math.PI * 2); ctx.fill();
        }
      }
      const n = Math.min(14, opt.pile || 0);
      if (n) {
        const [px, py] = P2(0.28, 0.3);
        for (let k = 0; k < n; k++) {
          ctx.fillStyle = k % 2 ? '#efe6d6' : '#f7f1e6';
          ctx.beginPath(); ctx.ellipse(px, py - k * 2.6, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(160,100,50,0.5)';
          ctx.beginPath(); ctx.arc(px - 3 + (k % 3) * 2, py - k * 2.6 - 1, 1.8, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;
    }
    case 'dishwasher': {
      if (opt.running) {
        const [lx, ly] = P2(0, 0);
        blob(ctx, lx, ly, 3, '#5fd38a');
        for (let k = 0; k < 4; k++) {
          const ph = (t * 0.7 + k / 4) % 1;
          ctx.fillStyle = `rgba(230,240,255,${0.6 * (1 - ph)})`;
          ctx.beginPath(); ctx.arc(lx + Math.sin((t + k) * 2) * 8, ly - 6 - ph * 30, 4 + ph * 6, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;
    }
    case 'table': {
      if (opt.stain) {
        const [sx2, sy2] = P2(-0.08, 0.1);
        ctx.fillStyle = 'rgba(160,60,40,0.45)';
        ctx.beginPath(); ctx.ellipse(sx2, sy2, 11, 5, 0.3, 0, Math.PI * 2); ctx.fill();
      }
      if (opt.dishes && opt.dishes.length) {
        for (const dsh of opt.dishes) {
          const [px, py] = P2(dsh.dx * 0.2, dsh.dy * 0.2);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.ellipse(px, py, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
          if (dsh.icon) drawFood(ctx, dsh.icon, px, py - 4, 17);
        }
      }
      if (opt.dirty) {
        const spots = [[-0.14, -0.1], [0.14, 0.1], [0.05, -0.18], [-0.18, 0.16], [0.2, -0.16], [0, 0.05]].slice(0, Math.max(1, Math.min(6, opt.dirtyN || 3)));
        for (const [dx, dy] of spots) {
          const [px, py] = P2(dx, dy);
          ctx.fillStyle = '#f4efe6';
          ctx.beginPath(); ctx.ellipse(px, py, 9, 4.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#b5835a';
          ctx.beginPath(); ctx.arc(px - 2, py, 1.8, 0, Math.PI * 2); ctx.arc(px + 3, py - 1, 1.4, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;
    }
    case 'bar': {
      const coffee = furnitureImg('kitchenCoffeeMachine', 'SW');
      const bottles = ['#3f8a4f', '#8a3a2e', '#c9a35b', '#2b5aa8'];
      bottles.forEach((col, i) => {
        const [bx, by] = P2(-0.28 + i * 0.1, -0.22);
        ctx.fillStyle = col; ctx.fillRect(bx - 3, by - 16, 6, 16); ctx.fillRect(bx - 1.3, by - 22, 2.6, 6);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(bx - 2, by - 14, 1.6, 10);
      });
      if (coffee) { const [mx, my] = P2(0.18, 0.12); ctx.drawImage(coffee, mx - coffee.width / 2, my - coffee.height + 8); }
      if (opt.busy) {
        const [sx, sy] = P2(0.18, 0.12, z + 30);
        for (let k = 0; k < 3; k++) { const ph = (t * 0.8 + k / 3) % 1; ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - ph)})`; ctx.beginPath(); ctx.arc(sx + Math.sin(t * 2 + k) * 4, sy - ph * 20, 3 + ph * 4, 0, Math.PI * 2); ctx.fill(); }
      }
      break;
    }
    case 'register': {
      box(ctx, cx, cy, 0.34, 0.28, 12, z, '#3b3f47', { ox: -0.05, oy: -0.05 });
      const [sx, sy] = P2(-0.05, -0.05, z + 12);
      ctx.fillStyle = '#2b2f36';
      ctx.beginPath(); ctx.moveTo(sx - 11, sy); ctx.lineTo(sx + 11, sy - 6); ctx.lineTo(sx + 11, sy - 19); ctx.lineTo(sx - 11, sy - 13); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7fe0a0';
      ctx.beginPath(); ctx.moveTo(sx - 8, sy - 3); ctx.lineTo(sx + 8, sy - 7); ctx.lineTo(sx + 8, sy - 16); ctx.lineTo(sx - 8, sy - 12); ctx.closePath(); ctx.fill();
      break;
    }
    default: break;
  }
  return true;
}

export function drawItem(ctx, item, cx, cy, opt = {}) {
  const c = item.colors || {};
  const t = opt.t || 0;
  if (drawSpriteItem(ctx, item, cx, cy, opt)) return;
  switch (item.kind) {
    case 'stove': {
      shadow(ctx, cx, cy + 2, 0.45, 0.2);
      box(ctx, cx, cy, 0.84, 0.84, 44, 0, c.body);
      // porta do forno (face frente-esquerda)
      const door = [P(cx, cy, -0.3, 0.42, 8), P(cx, cy, 0.3, 0.42, 8), P(cx, cy, 0.3, 0.42, 32), P(cx, cy, -0.3, 0.42, 32)];
      poly(ctx, door, '#3b3f47');
      poly(ctx, [P(cx, cy, -0.24, 0.42, 12), P(cx, cy, 0.24, 0.42, 12), P(cx, cy, 0.24, 0.42, 26), P(cx, cy, -0.24, 0.42, 26)],
        opt.stove && opt.stove.state === 'cooking' ? '#e8913a' : '#5b6370');
      ctx.strokeStyle = c.trim; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(...P(cx, cy, -0.22, 0.42, 35)); ctx.lineTo(...P(cx, cy, 0.22, 0.42, 35)); ctx.stroke();
      // tampo
      box(ctx, cx, cy, 0.88, 0.88, 4, 44, c.top, { edge: false });
      const cooking = opt.stove && opt.stove.state === 'cooking';
      for (const [dx, dy] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) {
        const [bx, by] = P(cx, cy, dx, dy, 48);
        ctx.fillStyle = cooking ? '#ff6a2b' : '#1c1e22';
        ctx.beginPath(); ctx.ellipse(bx, by, 11, 5.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#6b717c'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      if (opt.stove && opt.stove.state !== 'idle') {
        const spoiled = opt.stove.state === 'spoiled';
        cylinder(ctx, cx, cy, 0.26, 18, 48, spoiled ? '#7c8a5a' : '#c0c6cf', { top: spoiled ? '#6a7a3a' : '#e7ebf0' });
        const [px, py] = P(cx, cy, 0, 0, 66);
        ctx.fillStyle = spoiled ? '#5c6b2a' : '#c5582f';
        ctx.beginPath(); ctx.ellipse(px, py, 15, 7, 0, 0, Math.PI * 2); ctx.fill();
        if (!spoiled) {
          // vapor
          for (let k = 0; k < 3; k++) {
            const ph = (t * 0.6 + k / 3) % 1;
            ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - ph)})`;
            ctx.beginPath(); ctx.arc(px + Math.sin((t + k) * 2) * 6, py - 8 - ph * 30, 5 + ph * 6, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      break;
    }
    case 'counter': {
      shadow(ctx, cx, cy + 2, 0.45, 0.2);
      box(ctx, cx, cy, 0.86, 0.86, 38, 0, c.body);
      // painéis decorativos
      ctx.strokeStyle = c.trim; ctx.lineWidth = 2;
      poly(ctx, [P(cx, cy, -0.33, 0.43, 6), P(cx, cy, 0.33, 0.43, 6), P(cx, cy, 0.33, 0.43, 32), P(cx, cy, -0.33, 0.43, 32)], null, c.trim);
      poly(ctx, [P(cx, cy, 0.43, 0.33, 6), P(cx, cy, 0.43, -0.33, 6), P(cx, cy, 0.43, -0.33, 32), P(cx, cy, 0.43, 0.33, 32)], null, c.trim);
      box(ctx, cx, cy, 0.96, 0.96, 6, 38, c.top);
      if (opt.plates && opt.plates.length) {
        const offs = [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]];
        opt.plates.slice(0, 4).forEach((icon, i) => {
          const [px, py] = P(cx, cy, offs[i][0], offs[i][1], 44);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.ellipse(px, py, 13, 6.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#d6d0c4'; ctx.lineWidth = 1; ctx.stroke();
          drawFood(ctx, icon, px, py - 5, 20);
        });
      }
      break;
    }
    case 'table': {
      shadow(ctx, cx, cy, 0.42, 0.18);
      const zt = item.low ? 14 : 30;
      if (item.round) {
        cylinder(ctx, cx, cy, 0.07, zt, 0, c.leg);
        cylinder(ctx, cx, cy, 0.22, 3, 0, c.leg);
        cylinder(ctx, cx, cy, 0.44, 5, zt, c.top);
      } else {
        for (const [dx, dy] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
          box(ctx, cx, cy, 0.07, 0.07, zt, 0, c.leg, { ox: dx, oy: dy, edge: false });
        }
        box(ctx, cx, cy, 0.8, 0.8, 5, zt, c.top);
      }
      const zt2 = zt + 6;
      if (opt.dishes && opt.dishes.length) {
        for (const dsh of opt.dishes) {
          const [px, py] = P(cx, cy, dsh.dx * 0.22, dsh.dy * 0.22, zt2);
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.ellipse(px, py, 11, 5.5, 0, 0, Math.PI * 2); ctx.fill();
          if (dsh.icon) drawFood(ctx, dsh.icon, px, py - 4, 17);
        }
      }
      if (opt.stain) {
        const [sx2, sy2] = P(cx, cy, -0.08, 0.12, zt2 - 1);
        ctx.fillStyle = 'rgba(160,60,40,0.45)';
        ctx.beginPath(); ctx.ellipse(sx2, sy2, 12, 5, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(sx2 + 10, sy2 + 3, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
      }
      if (opt.dirty) {
        const spots = [[-0.15, -0.1], [0.15, 0.1], [0.05, -0.2], [-0.2, 0.18], [0.22, -0.18], [0, 0.05]].slice(0, Math.max(1, Math.min(6, opt.dirtyN || 3)));
        for (const [dx, dy] of spots) {
          const [px, py] = P(cx, cy, dx, dy, zt2);
          ctx.fillStyle = '#f4efe6';
          ctx.beginPath(); ctx.ellipse(px, py, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#b5835a';
          ctx.beginPath(); ctx.arc(px - 2, py, 2, 0, Math.PI * 2); ctx.arc(px + 3, py - 1, 1.5, 0, Math.PI * 2); ctx.fill();
        }
        const [gx, gy] = P(cx, cy, 0.2, -0.15, zt2);
        ctx.fillStyle = 'rgba(200,230,255,0.85)'; ctx.fillRect(gx - 3, gy - 10, 6, 10);
      }
      break;
    }
    case 'chair': {
      shadow(ctx, cx, cy, 0.25, 0.16);
      const f = opt.facing || { dx: 1, dy: 0 };
      const back = { dx: -f.dx * 0.2, dy: -f.dy * 0.2 };
      const bw = f.dx !== 0 ? 0.08 : 0.45, bd = f.dy !== 0 ? 0.08 : 0.45;
      const backBehind = back.dx < 0 || back.dy < 0;
      const drawBack = () => box(ctx, cx, cy, bw, bd, 28, 20, c.back, { ox: back.dx, oy: back.dy });
      if (backBehind) drawBack();
      for (const [dx, dy] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) {
        box(ctx, cx, cy, 0.05, 0.05, 16, 0, c.back, { ox: dx, oy: dy, edge: false });
      }
      box(ctx, cx, cy, 0.46, 0.46, 5, 16, c.seat);
      if (!backBehind) drawBack();
      break;
    }
    case 'cushion': {
      shadow(ctx, cx, cy, 0.28, 0.14);
      box(ctx, cx, cy, 0.55, 0.55, 7, 0, c.seat);
      const [px, py] = P(cx, cy, 0, 0, 7);
      blob(ctx, px, py, 2.5, c.back);
      break;
    }
    case 'plant': {
      shadow(ctx, cx, cy, 0.25);
      cylinder(ctx, cx, cy, 0.2, 26, 0, c.pot);
      const [px, py] = P(cx, cy, 0, 0, 26);
      const sway = Math.sin(t * 1.5) * 1.5;
      for (const [ox, oy, r, s] of [[-10, -12, 11, -0.1], [10, -14, 11, -0.2], [0, -24, 13, 0.05], [-4, -36, 9, 0.12], [7, -30, 9, -0.05]]) {
        blob(ctx, px + ox + sway, py + oy, r, shade(c.leaf, s));
      }
      break;
    }
    case 'lamp': {
      shadow(ctx, cx, cy, 0.18);
      cylinder(ctx, cx, cy, 0.14, 4, 0, c.pole);
      const [bx, by] = P(cx, cy, 0, 0, 4);
      ctx.fillStyle = c.pole; ctx.fillRect(bx - 2, by - 70, 4, 70);
      glow(ctx, bx, by - 78, 46, 'rgba(255,220,140,0.45)');
      ctx.fillStyle = c.shade;
      ctx.beginPath(); ctx.moveTo(bx - 10, by - 92); ctx.lineTo(bx + 10, by - 92); ctx.lineTo(bx + 17, by - 70); ctx.lineTo(bx - 17, by - 70); ctx.closePath(); ctx.fill();
      ctx.fillStyle = shade(c.shade, -0.15);
      ctx.beginPath(); ctx.ellipse(bx, by - 70, 17, 4, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'candle': {
      shadow(ctx, cx, cy, 0.2);
      cylinder(ctx, cx, cy, 0.17, 5, 0, c.metal);
      const [bx, by] = P(cx, cy, 0, 0, 5);
      ctx.fillStyle = c.metal; ctx.fillRect(bx - 2.5, by - 50, 5, 50);
      ctx.strokeStyle = c.metal; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bx - 18, by - 62); ctx.quadraticCurveTo(bx - 16, by - 46, bx, by - 48); ctx.quadraticCurveTo(bx + 16, by - 46, bx + 18, by - 62); ctx.stroke();
      for (const ox of [-18, 0, 18]) {
        const top = ox === 0 ? 72 : 64;
        ctx.fillStyle = '#fbf3df'; ctx.fillRect(bx + ox - 3, by - top, 6, 12);
        glow(ctx, bx + ox, by - top - 5, 16, 'rgba(255,200,90,0.55)');
        ctx.fillStyle = c.flame;
        ctx.beginPath(); ctx.ellipse(bx + ox, by - top - 5 + Math.sin(t * 8 + ox) * 0.8, 2.8, 5, 0, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'statue': {
      shadow(ctx, cx, cy, 0.32);
      box(ctx, cx, cy, 0.5, 0.5, 26, 0, c.base);
      const [bx, by] = P(cx, cy, 0, 0, 26);
      const g = ctx.createLinearGradient(bx - 14, 0, bx + 14, 0);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, shade(c.stone, -0.2));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(bx - 13, by); ctx.quadraticCurveTo(bx - 16, by - 34, bx - 7, by - 50); ctx.lineTo(bx + 7, by - 50); ctx.quadraticCurveTo(bx + 16, by - 34, bx + 13, by); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(bx, by - 58, 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = shade(c.stone, -0.25); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(bx - 4, by - 45); ctx.quadraticCurveTo(bx - 8, by - 25, bx - 5, by - 3); ctx.stroke();
      break;
    }
    case 'lantern': {
      shadow(ctx, cx, cy, 0.2);
      cylinder(ctx, cx, cy, 0.14, 5, 0, c.frame);
      const [bx, by] = P(cx, cy, 0, 0, 5);
      ctx.fillStyle = c.frame; ctx.fillRect(bx - 2, by - 60, 4, 60);
      ctx.fillRect(bx - 2, by - 66, 20, 3);
      glow(ctx, bx + 16, by - 44, 40, 'rgba(255,140,90,0.45)');
      ctx.fillStyle = c.frame; ctx.fillRect(bx + 15, by - 64, 2, 6);
      const lg = ctx.createRadialGradient(bx + 13, by - 46, 2, bx + 16, by - 44, 18);
      lg.addColorStop(0, '#ff9a6a'); lg.addColorStop(1, c.paper);
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.ellipse(bx + 16, by - 44, 13, 15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(40,20,10,0.35)'; ctx.lineWidth = 1;
      for (const k of [-8, -3, 3, 8]) { ctx.beginPath(); ctx.ellipse(bx + 16, by - 44 + k, Math.sqrt(169 - k * k * 0.6), 2, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = c.frame; ctx.fillRect(bx + 10, by - 60, 12, 3); ctx.fillRect(bx + 10, by - 31, 12, 3);
      break;
    }
    case 'bamboo': {
      shadow(ctx, cx, cy, 0.3);
      box(ctx, cx, cy, 0.55, 0.55, 16, 0, c.pot);
      const [bx, by] = P(cx, cy, 0, 0, 16);
      const sway = Math.sin(t * 1.2) * 2;
      for (const [ox, hgt] of [[-12, 80], [-3, 100], [6, 88], [13, 70]]) {
        ctx.strokeStyle = c.stalk; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(bx + ox, by); ctx.lineTo(bx + ox + sway, by - hgt); ctx.stroke();
        ctx.strokeStyle = shade(c.stalk, -0.3); ctx.lineWidth = 1.5;
        for (let k = 18; k < hgt; k += 18) { ctx.beginPath(); ctx.moveTo(bx + ox - 2 + sway * k / hgt, by - k); ctx.lineTo(bx + ox + 2 + sway * k / hgt, by - k); ctx.stroke(); }
        ctx.fillStyle = c.leaf;
        for (let k = 30; k < hgt; k += 22) {
          ctx.beginPath(); ctx.ellipse(bx + ox + 8 + sway * k / hgt, by - k, 9, 2.6, -0.4, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(bx + ox - 8 + sway * k / hgt, by - k - 8, 9, 2.6, 0.4, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;
    }
    case 'bonsai': {
      shadow(ctx, cx, cy, 0.3);
      box(ctx, cx, cy, 0.4, 0.3, 14, 0, '#5a3d2b');
      box(ctx, cx, cy, 0.5, 0.4, 10, 14, c.pot);
      const [bx, by] = P(cx, cy, 0, 0, 24);
      ctx.strokeStyle = c.trunk; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - 14, by - 18, bx + 2, by - 30); ctx.quadraticCurveTo(bx + 14, by - 38, bx + 8, by - 46); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bx - 4, by - 22); ctx.lineTo(bx - 18, by - 30); ctx.stroke();
      ctx.lineCap = 'butt';
      for (const [ox, oy, r, s] of [[-20, -34, 10, -0.1], [-12, -38, 9, 0.05], [10, -50, 13, 0.08], [18, -42, 9, -0.1], [0, -54, 9, 0.15]]) {
        ctx.fillStyle = shade(c.leaf, s);
        ctx.beginPath(); ctx.ellipse(bx + ox, by + oy, r * 1.3, r * 0.75, 0, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case 'cactus': {
      shadow(ctx, cx, cy, 0.25);
      cylinder(ctx, cx, cy, 0.2, 22, 0, c.pot);
      const [bx, by] = P(cx, cy, 0, 0, 22);
      ctx.fillStyle = c.plant;
      roundRect(ctx, bx - 8, by - 60, 16, 62, 8);
      roundRect(ctx, bx - 22, by - 42, 8, 22, 4); roundRect(ctx, bx - 22, by - 26, 18, 8, 4);
      roundRect(ctx, bx + 14, by - 50, 8, 22, 4); roundRect(ctx, bx + 4, by - 34, 18, 8, 4);
      ctx.strokeStyle = shade(c.plant, -0.25); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(bx, by - 56); ctx.lineTo(bx, by); ctx.stroke();
      blob(ctx, bx + 2, by - 62, 4, '#f06292');
      break;
    }
    case 'barrel': {
      shadow(ctx, cx, cy, 0.3);
      cylinder(ctx, cx, cy, 0.28, 40, 0, c.wood);
      for (const z of [8, 30]) {
        const [bx, by] = P(cx, cy, 0, 0, z);
        ctx.strokeStyle = c.band; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(bx, by, 0.28 * TW * 0.7, 0.28 * TW * 0.35, 0, 0, Math.PI); ctx.stroke();
      }
      const [tx, ty] = P(cx, cy, 0, 0, 40);
      ctx.strokeStyle = shade(c.wood, -0.3); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(tx, ty, 0.2 * TW * 0.7, 0.2 * TW * 0.35, 0, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case 'pinata': {
      shadow(ctx, cx, cy, 0.2);
      cylinder(ctx, cx, cy, 0.14, 4, 0, '#5a3d2b');
      const [bx, by] = P(cx, cy, 0, 0, 4);
      ctx.fillStyle = '#5a3d2b'; ctx.fillRect(bx - 2, by - 58, 4, 58);
      const sy = by - 70 + Math.sin(t * 2) * 1.5;
      const cols = [c.a, c.b, c.c, c.a, c.b];
      for (let k = 0; k < 5; k++) {
        const ang = -Math.PI / 2 + k * (Math.PI * 2 / 5);
        ctx.fillStyle = cols[k];
        ctx.beginPath(); ctx.moveTo(bx + Math.cos(ang) * 8, sy + Math.sin(ang) * 8);
        ctx.lineTo(bx + Math.cos(ang) * 26, sy + Math.sin(ang) * 26);
        ctx.lineTo(bx + Math.cos(ang + 0.6) * 8, sy + Math.sin(ang + 0.6) * 8); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = cols[(k + 2) % 5]; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(bx + Math.cos(ang) * 26, sy + Math.sin(ang) * 26); ctx.lineTo(bx + Math.cos(ang) * 26 + 2, sy + Math.sin(ang) * 26 + 10); ctx.stroke();
      }
      blob(ctx, bx, sy, 12, c.b); blob(ctx, bx, sy, 7, c.a);
      break;
    }
    case 'palm': {
      shadow(ctx, cx, cy, 0.35);
      box(ctx, cx, cy, 0.5, 0.5, 18, 0, c.pot);
      const [bx, by] = P(cx, cy, 0, 0, 18);
      const sway = Math.sin(t * 1.1) * 2;
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = shade(c.trunk, k % 2 ? -0.1 : 0.05);
        ctx.beginPath(); ctx.ellipse(bx + k * 1.5 + sway * k / 6, by - 6 - k * 14, 7 - k * 0.4, 8, 0, 0, Math.PI * 2); ctx.fill();
      }
      const tx = bx + 9 + sway, ty = by - 88;
      for (let k = 0; k < 7; k++) {
        const ang = Math.PI + k * (Math.PI / 6) + Math.sin(t * 1.3 + k) * 0.04;
        ctx.strokeStyle = shade(c.leaf, k % 2 ? -0.12 : 0.05); ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(tx + Math.cos(ang) * 26, ty + Math.sin(ang) * 26 - 10, tx + Math.cos(ang) * 44, ty + Math.sin(ang) * 30 + 18);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
      blob(ctx, tx - 4, ty + 6, 5, '#7a5233'); blob(ctx, tx + 5, ty + 7, 5, '#6b4a32');
      break;
    }
    case 'surfboard': {
      shadow(ctx, cx, cy, 0.25);
      const [bx, by] = P(cx, cy, 0, 0, 0);
      ctx.save(); ctx.translate(bx, by - 46); ctx.rotate(-0.18);
      ctx.fillStyle = c.board;
      ctx.beginPath(); ctx.ellipse(0, 0, 13, 48, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c.stripe; ctx.fillRect(-2, -46, 4, 92);
      ctx.fillStyle = '#f2b134'; ctx.fillRect(-13, -6, 26, 5);
      ctx.restore();
      box(ctx, cx, cy, 0.5, 0.18, 6, 0, '#a88b4f', { oy: 0.12 });
      break;
    }
    case 'chest': {
      shadow(ctx, cx, cy, 0.35);
      box(ctx, cx, cy, 0.7, 0.5, 26, 0, c.wood);
      const [lx, ly] = P(cx, cy, 0.0, 0.0, 26);
      ctx.fillStyle = shade(c.wood, 0.05);
      ctx.beginPath(); ctx.ellipse(lx, ly, 0.6 * TW * 0.5, 14, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#ffe58a'; blob(ctx, lx, ly - 4, 9, 'rgba(255,229,138,0.9)');
      ctx.strokeStyle = c.metal; ctx.lineWidth = 3;
      poly(ctx, [P(cx, cy, -0.05, 0.25, 0), P(cx, cy, 0.05, 0.25, 0), P(cx, cy, 0.05, 0.25, 26), P(cx, cy, -0.05, 0.25, 26)], c.metal);
      poly(ctx, [P(cx, cy, 0.35, -0.05, 0), P(cx, cy, 0.35, 0.05, 0), P(cx, cy, 0.35, 0.05, 26), P(cx, cy, 0.35, -0.05, 26)], shade(c.metal, -0.2));
      break;
    }
    case 'sink': {
      shadow(ctx, cx, cy + 2, 0.45, 0.2);
      box(ctx, cx, cy, 0.86, 0.86, 38, 0, c.body);
      box(ctx, cx, cy, 0.94, 0.94, 5, 38, c.top);
      // cuba
      const [bx, by] = P(cx, cy, 0.05, 0.05, 43);
      ctx.fillStyle = '#9aa7b3';
      ctx.beginPath(); ctx.ellipse(bx, by, 26, 13, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = opt.washing ? '#bfe3f2' : '#c8d2da';
      ctx.beginPath(); ctx.ellipse(bx, by + 1, 22, 10, 0, 0, Math.PI * 2); ctx.fill();
      if (opt.washing) {
        for (let k = 0; k < 6; k++) {
          const a = t * 2 + k;
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.beginPath(); ctx.arc(bx + Math.cos(a) * 12, by - 2 + Math.sin(a * 1.3) * 4 - (k % 3) * 3, 3 + (k % 2), 0, Math.PI * 2); ctx.fill();
        }
      }
      // torneira
      const [fx, fy] = P(cx, cy, -0.3, -0.3, 43);
      ctx.strokeStyle = c.trim; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 22); ctx.quadraticCurveTo(fx, fy - 30, fx + 14, fy - 24); ctx.stroke();
      ctx.lineCap = 'butt';
      // pilha de pratos sujos
      const n = Math.min(14, opt.pile || 0);
      if (n) {
        const [px, py] = P(cx, cy, 0.3, -0.25, 43);
        for (let k = 0; k < n; k++) {
          ctx.fillStyle = k % 2 ? '#efe6d6' : '#f7f1e6';
          ctx.beginPath(); ctx.ellipse(px, py - k * 2.6, 13, 5.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(160,100,50,0.5)';
          ctx.beginPath(); ctx.arc(px - 3 + (k % 3) * 2, py - k * 2.6 - 1, 1.8, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;
    }
    case 'dishwasher': {
      shadow(ctx, cx, cy + 2, 0.45, 0.2);
      box(ctx, cx, cy, 0.8, 0.8, 52, 0, c.body);
      box(ctx, cx, cy, 0.84, 0.84, 4, 52, c.trim, { edge: false });
      // porta e painel
      poly(ctx, [P(cx, cy, -0.32, 0.4, 6), P(cx, cy, 0.32, 0.4, 6), P(cx, cy, 0.32, 0.4, 40), P(cx, cy, -0.32, 0.4, 40)], shade(c.body, -0.12));
      ctx.strokeStyle = c.trim; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(...P(cx, cy, -0.2, 0.4, 36)); ctx.lineTo(...P(cx, cy, 0.2, 0.4, 36)); ctx.stroke();
      const [lx, ly] = P(cx, cy, 0.25, 0.4, 46);
      blob(ctx, lx, ly, 3, opt.running ? '#5fd38a' : '#7a828c');
      if (opt.running) {
        for (let k = 0; k < 4; k++) {
          const ph = (t * 0.7 + k / 4) % 1;
          ctx.fillStyle = `rgba(230,240,255,${0.6 * (1 - ph)})`;
          const [sx, sy] = P(cx, cy, 0, 0, 56);
          ctx.beginPath(); ctx.arc(sx + Math.sin((t + k) * 2) * 8, sy - ph * 34, 4 + ph * 6, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;
    }
    case 'bar': {
      shadow(ctx, cx, cy + 2, 0.45, 0.2);
      box(ctx, cx, cy, 0.86, 0.86, 38, 0, c.body);
      poly(ctx, [P(cx, cy, -0.36, 0.43, 8), P(cx, cy, 0.36, 0.43, 8), P(cx, cy, 0.36, 0.43, 30), P(cx, cy, -0.36, 0.43, 30)], null, c.trim);
      box(ctx, cx, cy, 0.96, 0.96, 6, 38, c.top);
      // garrafas
      const bottles = ['#3f8a4f', '#8a3a2e', '#c9a35b', '#2b5aa8', '#e9e2d0'];
      bottles.forEach((col, i) => {
        const [bx, by] = P(cx, cy, -0.3 + i * 0.12, -0.28, 44);
        ctx.fillStyle = col; ctx.fillRect(bx - 3.5, by - 18, 7, 18);
        ctx.fillRect(bx - 1.5, by - 25, 3, 7);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(bx - 2.5, by - 16, 2, 12);
      });
      // copos e máquina de café
      for (const [dx, dy] of [[0.15, 0.15], [0.28, 0.05]]) {
        const [gx, gy] = P(cx, cy, dx, dy, 44);
        ctx.fillStyle = 'rgba(200,230,255,0.85)'; ctx.fillRect(gx - 4, gy - 10, 8, 10);
        ctx.fillStyle = '#f2b134'; ctx.fillRect(gx - 4, gy - 5, 8, 5);
      }
      box(ctx, cx, cy, 0.22, 0.2, 18, 44, '#3b3f47', { ox: -0.22, oy: 0.18 });
      if (opt.busy) {
        const [sx, sy] = P(cx, cy, -0.22, 0.18, 64);
        for (let k = 0; k < 3; k++) { const ph = (t * 0.8 + k / 3) % 1; ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - ph)})`; ctx.beginPath(); ctx.arc(sx + Math.sin(t * 2 + k) * 4, sy - ph * 20, 3 + ph * 4, 0, Math.PI * 2); ctx.fill(); }
      }
      break;
    }
    case 'fridge': {
      shadow(ctx, cx, cy + 2, 0.42, 0.2);
      box(ctx, cx, cy, 0.8, 0.7, 96, 0, c.body);
      ctx.strokeStyle = c.trim; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(...P(cx, cy, 0, 0.35, 4)); ctx.lineTo(...P(cx, cy, 0, 0.35, 94)); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(...P(cx, cy, -0.06, 0.35, 50)); ctx.lineTo(...P(cx, cy, -0.06, 0.35, 70)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(...P(cx, cy, 0.06, 0.35, 50)); ctx.lineTo(...P(cx, cy, 0.06, 0.35, 70)); ctx.stroke();
      const [lx, ly] = P(cx, cy, -0.25, 0.35, 86);
      blob(ctx, lx, ly, 2.5, '#5fd38a');
      break;
    }
    case 'register': {
      shadow(ctx, cx, cy + 2, 0.45, 0.2);
      box(ctx, cx, cy, 0.86, 0.86, 38, 0, c.body);
      box(ctx, cx, cy, 0.94, 0.94, 6, 38, c.top);
      box(ctx, cx, cy, 0.36, 0.3, 14, 44, c.trim, { ox: -0.05, oy: -0.05 });
      const [sx, sy] = P(cx, cy, -0.05, -0.05, 58);
      ctx.fillStyle = '#2b2f36';
      ctx.beginPath(); ctx.moveTo(sx - 12, sy); ctx.lineTo(sx + 12, sy - 6); ctx.lineTo(sx + 12, sy - 20); ctx.lineTo(sx - 12, sy - 14); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#7fe0a0';
      ctx.beginPath(); ctx.moveTo(sx - 9, sy - 3); ctx.lineTo(sx + 9, sy - 8); ctx.lineTo(sx + 9, sy - 17); ctx.lineTo(sx - 9, sy - 12); ctx.closePath(); ctx.fill();
      const [mx, my] = P(cx, cy, 0.25, 0.2, 44);
      ctx.fillStyle = '#3b3f47'; ctx.fillRect(mx - 5, my - 12, 10, 14);
      ctx.fillStyle = '#9be7ff'; ctx.fillRect(mx - 3, my - 10, 6, 4);
      break;
    }
    case 'floor': {
      drawFloorTile(ctx, 0, 0, cx, cy, item.floor);
      drawFloorTile(ctx, 1, 0, cx + TW / 2, cy + TH / 2, item.floor);
      drawFloorTile(ctx, 1, 0, cx - TW / 2, cy + TH / 2, item.floor);
      drawFloorTile(ctx, 0, 0, cx, cy + TH, item.floor);
      break;
    }
    case 'wall': {
      ctx.save(); ctx.translate(cx + TW / 2, cy - 20);
      drawWallSegment(ctx, 'left', 0, item.wall, { window: true });
      ctx.restore();
      break;
    }
    case 'prop':
    default:
      box(ctx, cx, cy, 0.5, 0.5, 40, 0, c.body || '#c9a77c');
  }
}

// altura aproximada (px) de cada tipo, usada para clicar nos objetos
export const KIND_HEIGHT = {
  stove: 70, counter: 60, table: 40, chair: 50, cushion: 15, plant: 75, lamp: 100, candle: 85,
  statue: 90, lantern: 75, bamboo: 120, bonsai: 85, cactus: 90, barrel: 45, pinata: 100, palm: 120,
  surfboard: 100, chest: 45, fridge: 100, register: 65, sink: 70, dishwasher: 65, bar: 70, prop: 90,
};

// sujeira no chão
export function drawDirt(ctx, cx, cy, k = 0) {
  if (k === 1) { // líquido derramado
    ctx.fillStyle = 'rgba(230,140,40,0.5)';
    ctx.beginPath(); ctx.ellipse(cx - 4, cy, 18, 8, 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 12, cy + 4, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.ellipse(cx - 8, cy - 2, 6, 2, 0.2, 0, Math.PI * 2); ctx.fill();
    return;
  }
  if (k === 2) { // migalhas e guardanapo
    ctx.fillStyle = 'rgba(150,100,50,0.7)';
    for (const [dx, dy] of [[-10, -2], [-4, 4], [3, -4], [9, 2], [-1, 0], [12, -3], [-13, 3]]) { ctx.beginPath(); ctx.arc(cx + dx, cy + dy, 1.8, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#f4efe6';
    ctx.beginPath(); ctx.moveTo(cx + 2, cy + 2); ctx.lineTo(cx + 12, cy - 1); ctx.lineTo(cx + 9, cy + 7); ctx.closePath(); ctx.fill();
    return;
  }
  ctx.fillStyle = 'rgba(120,80,40,0.45)';
  ctx.beginPath(); ctx.ellipse(cx - 6, cy, 16, 7, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(150,100,50,0.55)';
  ctx.beginPath(); ctx.ellipse(cx + 9, cy + 3, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 2, cy - 5, 3, 0, Math.PI * 2); ctx.fill();
}

// fumaça de prato queimado
export function drawSmoke(ctx, cx, cy, life) {
  for (let k = 0; k < 5; k++) {
    const ph = ((4 - life) * 0.5 + k / 5) % 1;
    ctx.fillStyle = `rgba(70,70,70,${0.5 * (1 - ph) * Math.min(1, life)})`;
    ctx.beginPath(); ctx.arc(cx + Math.sin(k * 2 + life * 3) * 10, cy - 60 - ph * 50, 8 + ph * 12, 0, Math.PI * 2); ctx.fill();
  }
}
