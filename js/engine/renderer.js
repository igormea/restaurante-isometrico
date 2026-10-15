// Monta a cena: fundo, piso, paredes, móveis, pessoas e balões de informação.
import { TW, TH, WALL_H, camera, tileCenter, isoToWorld } from './iso.js';
import { drawItem, drawFloorTile, drawWallSegment, drawCharacter, KIND_HEIGHT, roundRect } from './draw.js';
import { itemById } from '../config/items.js';
import { recipeById } from '../config/recipes.js';
import { roomSize, DOOR } from '../core/state.js';
import { stoveStatus } from '../systems/kitchen.js';
import { tableFor } from '../systems/customers.js';

export class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.view = { w: 0, h: 0 };
    this.hover = null; // quadrado sob o mouse
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    this.view.w = this.canvas.clientWidth;
    this.view.h = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.view.w * dpr);
    this.canvas.height = Math.round(this.view.h * dpr);
  }

  fitCamera() {
    const n = roomSize(this.game.state);
    const c = isoToWorld(n / 2, n / 2);
    camera.x = c.x;
    camera.y = c.y - WALL_H * 0.35;
    const zw = (this.view.w * 0.94) / (n * TW);
    const zh = (this.view.h - 150) / (n * TH + WALL_H + 30);
    camera.zoom = Math.max(0.35, Math.min(1.3, zw, zh));
  }

  render() {
    const { ctx, view, game } = this;
    const st = game.state;
    const t = game.t;
    const now = Date.now();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // fundo
    const bg = ctx.createLinearGradient(0, 0, 0, view.h);
    bg.addColorStop(0, '#f7e9d3'); bg.addColorStop(1, '#e9cfae');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, view.w, view.h);

    ctx.setTransform(this.dpr * camera.zoom, 0, 0, this.dpr * camera.zoom,
      this.dpr * (view.w / 2 - camera.x * camera.zoom), this.dpr * (view.h / 2 - camera.y * camera.zoom));

    const n = roomSize(st);

    // base / sombra do restaurante
    ctx.fillStyle = 'rgba(120,80,40,0.18)';
    const b0 = isoToWorld(0, 0), b1 = isoToWorld(n, 0), b2 = isoToWorld(n, n), b3 = isoToWorld(0, n);
    ctx.beginPath(); ctx.moveTo(b0.x, b0.y + 10); ctx.lineTo(b1.x + 10, b1.y + 10); ctx.lineTo(b2.x, b2.y + 16); ctx.lineTo(b3.x - 10, b3.y + 10); ctx.closePath(); ctx.fill();
    // espessura do piso
    ctx.fillStyle = '#b48a62';
    ctx.beginPath(); ctx.moveTo(b3.x, b3.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(b2.x, b2.y + 10); ctx.lineTo(b3.x, b3.y + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9a7350';
    ctx.beginPath(); ctx.moveTo(b2.x, b2.y); ctx.lineTo(b1.x, b1.y); ctx.lineTo(b1.x, b1.y + 10); ctx.lineTo(b2.x, b2.y + 10); ctx.closePath(); ctx.fill();

    // calçada na porta
    const out = tileCenter(-1, DOOR.y);
    drawFloorTile(ctx, 0, 0, out.x, out.y, { pattern: 'checker', a: '#d9c7ab', b: '#d9c7ab' });

    // piso
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) {
      const c = tileCenter(x, y);
      const fid = st.floor[x + ',' + y] || 'piso_bege';
      drawFloorTile(ctx, x, y, c.x, c.y, itemById(fid).floor);
    }

    // destaque dos quadrados no modo editar/colocar/pintar
    if (game.mode !== 'play' && this.hover) {
      const { x, y } = this.hover;
      if (x >= 0 && y >= 0 && x < n && y < n) {
        const ok = game.mode === 'paint' ? true : game.mode === 'edit' ? true : game.validTile(x, y);
        this.tileHighlight(x, y, ok ? 'rgba(80,200,120,0.45)' : 'rgba(230,80,80,0.45)');
      }
    }

    // paredes
    const wall = itemById(st.wall).wall;
    for (let i = 0; i < n; i++) {
      drawWallSegment(ctx, 'left', i, wall, { door: i === DOOR.y, window: i % 3 === 1 && i !== DOOR.y });
      drawWallSegment(ctx, 'right', i, wall, { window: i % 3 === 1 });
    }
    // placa com o nome do restaurante
    this.drawSign(st.restaurantName, n);

    // itens e pessoas ordenados por profundidade
    const list = [];
    const eatingAt = new Map();
    for (const c of game.customers.list) if (c.state === 'eating' && c.table) eatingAt.set(c.table.uid, c.dish.icon);

    for (const o of st.objects) {
      list.push({ d: o.x + o.y + 1, draw: () => this.drawObject(o, t, now, eatingAt) });
    }
    const people = [
      { ch: game.chef.ch }, { ch: game.waiter.ch },
      ...game.customers.list.map((c) => ({ ch: c.ch, c })),
    ];
    for (const p of people) {
      const ch = p.ch;
      const sit = p.c && p.c.sitting;
      list.push({
        d: ch.x + ch.y + 1 + (sit ? 0.05 : 0.02),
        draw: () => {
          const w = tileCenter(ch.x, ch.y);
          ctx.globalAlpha = ch.alpha;
          drawCharacter(ctx, w.x, w.y, ch.look, t + (ch.x * 3), {
            walking: ch.walking, sitting: sit, flip: ch.flip, carry: ch.carry, mood: p.c && p.c.mood,
          });
          ctx.globalAlpha = 1;
        },
      });
    }
    // fantasma do item sendo colocado
    if (game.mode === 'place' && game.placing && this.hover) {
      const { x, y } = this.hover;
      const item = itemById(game.placing.itemId);
      list.push({
        d: x + y + 1.5,
        draw: () => {
          const c = tileCenter(x, y);
          ctx.globalAlpha = 0.7;
          drawItem(ctx, item, c.x, c.y, { t, facing: { dx: 1, dy: 0 } });
          ctx.globalAlpha = 1;
        },
      });
    }
    list.sort((a, b) => a.d - b.d);
    for (const e of list) e.draw();

    // balões de informação (sempre por cima)
    if (game.mode === 'play') {
      for (const o of st.objects) this.drawObjectOverlay(o, now, t);
      for (const c of game.customers.list) this.drawCustomerOverlay(c, t);
    }

    // textos flutuantes
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const f of game.floats) {
      if (f.life > 1.6) continue;
      const w = tileCenter(f.x, f.y);
      const rise = (1.6 - f.life) * 40;
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.font = 'bold 20px Nunito, sans-serif';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(60,35,15,0.8)';
      ctx.strokeText(f.text, w.x, w.y - 90 - rise);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, w.x, w.y - 90 - rise);
      ctx.globalAlpha = 1;
    }
  }

  drawSign(name, n) {
    const { ctx } = this;
    const mid = isoToWorld(n / 2, 0);
    const x = mid.x, y = mid.y - WALL_H - 26;
    ctx.save();
    ctx.translate(x, y);
    ctx.transform(1, 0.5, 0, 1, 0, 0);
    ctx.font = 'bold 22px Fredoka, Nunito, sans-serif';
    const w = Math.max(140, ctx.measureText(name).width + 36);
    ctx.fillStyle = '#5a3d2b';
    roundRect(ctx, -w / 2, -20, w, 38, 10);
    ctx.fillStyle = '#7a5233';
    roundRect(ctx, -w / 2 + 4, -16, w - 8, 30, 8);
    ctx.fillStyle = '#ffe9c2'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(name, 0, -1);
    ctx.restore();
  }

  tileHighlight(x, y, color) {
    const { ctx } = this;
    const c = tileCenter(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(c.x, c.y - TH / 2); ctx.lineTo(c.x + TW / 2, c.y); ctx.lineTo(c.x, c.y + TH / 2); ctx.lineTo(c.x - TW / 2, c.y);
    ctx.closePath(); ctx.fill();
  }

  drawObject(o, t, now, eatingAt) {
    const item = itemById(o.item);
    const c = tileCenter(o.x, o.y);
    const opt = { t };
    if (item.kind === 'stove') opt.stove = stoveStatus(o, now);
    if (item.kind === 'counter' && o.data.recipe && o.data.servings > 0) {
      const r = recipeById(o.data.recipe);
      opt.dish = { icon: r ? r.icon : '🍽️' };
    }
    if (item.kind === 'table') opt.dish = eatingAt.get(o.uid);
    if (item.kind === 'chair') {
      const tf = tableFor(this.game.state, o);
      opt.facing = tf ? { dx: tf.dx, dy: tf.dy } : { dx: 1, dy: 0 };
    }
    if (this.game.mode === 'edit') this.tileHighlight(o.x, o.y, 'rgba(255,209,102,0.35)');
    drawItem(this.ctx, item, c.x, c.y, opt);
  }

  bubble(x, y, icon, opt = {}) {
    const { ctx } = this;
    const r = opt.r || 20;
    const pulse = opt.pulse ? 1 + Math.sin(this.game.t * 5) * 0.06 : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgba(60,35,15,0.25)';
    ctx.beginPath(); ctx.arc(0, 3, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = opt.bg || '#fffaf0';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-6, r - 3); ctx.lineTo(0, r + 8); ctx.lineTo(6, r - 3); ctx.fill();
    if (opt.ring != null) {
      ctx.strokeStyle = opt.ringColor; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, r - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * opt.ring); ctx.stroke();
    }
    ctx.font = `${Math.round(r * 1.05)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(icon, 0, 1);
    ctx.restore();
  }

  drawObjectOverlay(o, now, t) {
    const item = itemById(o.item);
    const c = tileCenter(o.x, o.y);
    const ctx = this.ctx;
    if (item.kind === 'stove') {
      const s = stoveStatus(o, now);
      const top = c.y - 95;
      if (o.data._pending) { this.bubble(c.x, top, '👨‍🍳', { r: 16 }); return; }
      if (s.state === 'idle') { this.bubble(c.x, top + 6, '🍳', { r: 15, bg: 'rgba(255,250,240,0.85)' }); }
      else if (s.state === 'cooking') {
        const w = 64, h = 12;
        ctx.fillStyle = 'rgba(60,35,15,0.55)'; roundRect(ctx, c.x - w / 2 - 2, top - 2, w + 4, h + 4, 7);
        ctx.fillStyle = '#fff1d6'; roundRect(ctx, c.x - w / 2, top, w, h, 6);
        ctx.fillStyle = '#f4a261'; roundRect(ctx, c.x - w / 2, top, Math.max(8, w * s.progress), h, 6);
        ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(s.recipe.icon, c.x - w / 2 - 14, top + 6);
      } else if (s.state === 'ready') {
        this.bubble(c.x, top, s.recipe.icon, { pulse: true, bg: '#e9fbe5', r: 22 });
      } else if (s.state === 'spoiled') {
        this.bubble(c.x, top, '🤢', { bg: '#efe3c8' });
      }
    }
    if (item.kind === 'counter' && o.data.recipe && o.data.servings > 0) {
      const x = c.x + 22, y = c.y - 70;
      ctx.fillStyle = '#d1495b'; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(o.data.servings, x, y + 1);
    }
  }

  drawCustomerOverlay(c, t) {
    if (c.state !== 'waiting') return;
    const w = tileCenter(c.ch.x, c.ch.y);
    const ratio = c.patience / c.maxPatience;
    const color = ratio > 0.5 ? '#2a9d8f' : ratio > 0.25 ? '#f4a261' : '#e63946';
    this.bubble(w.x, w.y - 105, c.servedBy ? '😋' : '🍽️', { r: 17, ring: ratio, ringColor: color });
  }

  // ---------- clique em objetos ----------
  objectAtWorld(wx, wy) {
    const objs = [...this.game.state.objects].sort((a, b) => (b.x + b.y) - (a.x + a.y));
    for (const o of objs) {
      const item = itemById(o.item);
      const c = tileCenter(o.x, o.y);
      const h = KIND_HEIGHT[item.kind] || 50;
      // losango do piso
      const dx = Math.abs(wx - c.x) / (TW / 2), dy = Math.abs(wy - c.y) / (TH / 2);
      if (dx + dy <= 1) return o;
      // corpo do objeto
      if (Math.abs(wx - c.x) < TW * 0.38 && wy < c.y && wy > c.y - h) return o;
      // balão acima do fogão
      if (item.kind === 'stove' && Math.abs(wx - c.x) < 26 && wy < c.y - h && wy > c.y - 125) return o;
    }
    return null;
  }
}
