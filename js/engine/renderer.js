// Monta a cena: fundo, piso, paredes, móveis, pessoas e balões de informação.
import { TW, TH, WALL_H, camera, tileCenter, isoToWorld } from './iso.js';
import { drawItem, drawFloorTile, drawWallSegment, drawCharacter, KIND_HEIGHT, roundRect, drawDirt, drawSmoke } from './draw.js';
import { itemById } from '../config/items.js';
import { roomSize, doorOf, kindOf } from '../core/state.js';
import { tableFor } from '../systems/service.js';
import { PATIENCE } from '../config/economy.js';

// cor do céu nas janelas conforme a hora real
function skyColor(min) {
  const h = min / 60;
  if (h < 5 || h >= 19.5) return '#2b3a5c';
  if (h < 6.5) return '#f2a07b';
  if (h < 17.5) return '#a6dcf0';
  if (h < 19.5) return '#f2a07b';
  return '#2b3a5c';
}

export class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.game = game;
    this.view = { w: 0, h: 0 };
    this.hover = null;
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
    const zh = (this.view.h - 190) / (n * TH + WALL_H + 30);
    camera.zoom = Math.max(0.35, Math.min(1.3, zw, zh));
  }

  render() {
    const { ctx, view, game } = this;
    const st = game.state, sv = game.service, status = game.status;
    const t = game.t;
    const night = status.l.hour >= 19 || status.l.hour < 6;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, 0, view.h);
    if (night) { bg.addColorStop(0, '#3d3550'); bg.addColorStop(1, '#5a4a52'); }
    else { bg.addColorStop(0, '#f7e9d3'); bg.addColorStop(1, '#e9cfae'); }
    ctx.fillStyle = bg; ctx.fillRect(0, 0, view.w, view.h);

    ctx.setTransform(this.dpr * camera.zoom, 0, 0, this.dpr * camera.zoom,
      this.dpr * (view.w / 2 - camera.x * camera.zoom), this.dpr * (view.h / 2 - camera.y * camera.zoom));
    const n = roomSize(st);

    // base do piso
    const b0 = isoToWorld(0, 0), b1 = isoToWorld(n, 0), b2 = isoToWorld(n, n), b3 = isoToWorld(0, n);
    ctx.fillStyle = 'rgba(60,40,20,0.2)';
    ctx.beginPath(); ctx.moveTo(b0.x, b0.y + 10); ctx.lineTo(b1.x + 10, b1.y + 10); ctx.lineTo(b2.x, b2.y + 16); ctx.lineTo(b3.x - 10, b3.y + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b48a62';
    ctx.beginPath(); ctx.moveTo(b3.x, b3.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(b2.x, b2.y + 10); ctx.lineTo(b3.x, b3.y + 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9a7350';
    ctx.beginPath(); ctx.moveTo(b2.x, b2.y); ctx.lineTo(b1.x, b1.y); ctx.lineTo(b1.x, b1.y + 10); ctx.lineTo(b2.x, b2.y + 10); ctx.closePath(); ctx.fill();

    // calçada
    const door = doorOf(st);
    for (let x = -1; x <= 4; x++) for (let y = n; y <= n + 2; y++) {
      const c = tileCenter(x, y);
      drawFloorTile(ctx, x, y, c.x, c.y, { pattern: 'checker', a: '#d4c2a6', b: '#cdb99c' });
    }
    // meio-fio
    ctx.fillStyle = '#a89377';
    const k0 = isoToWorld(-1, n + 3), k1 = isoToWorld(5, n + 3);
    ctx.beginPath(); ctx.moveTo(k0.x, k0.y); ctx.lineTo(k1.x, k1.y); ctx.lineTo(k1.x, k1.y + 8); ctx.lineTo(k0.x, k0.y + 8); ctx.closePath(); ctx.fill();
    // piso
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) {
      const c = tileCenter(x, y);
      drawFloorTile(ctx, x, y, c.x, c.y, itemById(st.floor[x + ',' + y] || 'piso_bege').floor);
    }
    for (const d of st.dirt) { const c = tileCenter(d.x, d.y); drawDirt(ctx, c.x, c.y, d.k); }
    { // capacho e batentes da entrada
      const c = tileCenter(door.x, door.y + 0.5);
      ctx.fillStyle = '#7a2f3a';
      ctx.beginPath(); ctx.moveTo(c.x, c.y - TH * 0.32); ctx.lineTo(c.x + TW * 0.32, c.y); ctx.lineTo(c.x, c.y + TH * 0.32); ctx.lineTo(c.x - TW * 0.32, c.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e9c46a'; ctx.font = 'bold 9px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('BEM-VINDO', c.x, c.y);
    }

    if (game.mode !== 'play' && this.hover) {
      const { x, y } = this.hover;
      if (x >= 0 && y >= 0 && x < n && y < n) {
        const ok = game.mode !== 'place' || game.validTile(x, y);
        this.tileHighlight(x, y, ok ? 'rgba(80,200,120,0.45)' : 'rgba(230,80,80,0.45)');
      }
    }

    // paredes
    const wall = itemById(st.wall).wall;
    const sky = skyColor(status.l.minutes);
    for (let i = 0; i < n; i++) {
      drawWallSegment(ctx, 'left', i, wall, { window: i % 3 === 1, sky });
      drawWallSegment(ctx, 'right', i, wall, { window: i % 3 === 1, sky });
    }
    this.drawSign(st.restaurantName, n, status.open);

    // ordem de profundidade
    const list = [];
    const tableDishes = new Map();
    for (const g of sv.groups) for (const m of g.members) {
      if (!m.sitting || !g.table) continue;
      const tf = tableFor(st, m.seat);
      if (!tf) continue;
      const arr = tableDishes.get(g.table.uid) || [];
      arr.push({ dx: -tf.dx, dy: -tf.dy, icon: m.plate && !m.done ? m.plate.recipe.icon : null });
      tableDishes.set(g.table.uid, arr);
    }
    for (const o of st.objects) list.push({ d: o.x + o.y + 1, draw: () => this.drawObject(o, t, tableDishes) });
    for (const a of sv.agents.values()) {
      list.push({ d: a.ch.x + a.ch.y + 1.02, draw: () => this.drawPerson(a.ch, t, {}) });
    }
    for (const g of sv.groups) for (const m of g.members) {
      list.push({ d: m.ch.x + m.ch.y + 1 + (m.sitting ? 0.05 : 0.02), draw: () => this.drawPerson(m.ch, t, { sitting: m.sitting, mood: g.state === 'leaving' && !g.members.some((x) => x.plate) ? 'angry' : null }) });
    }
    if (game.mode === 'place' && game.placing && this.hover) {
      const { x, y } = this.hover;
      const item = itemById(game.placing.itemId);
      list.push({ d: x + y + 1.5, draw: () => { const c = tileCenter(x, y); ctx.globalAlpha = 0.7; drawItem(ctx, item, c.x, c.y, { t, facing: { dx: 1, dy: 0 } }); ctx.globalAlpha = 1; } });
    }
    list.sort((a, b) => a.d - b.d);
    for (const e of list) e.draw();

    for (const f of sv.fx) if (f.type === 'smoke') { const c = tileCenter(f.x, f.y); drawSmoke(ctx, c.x, c.y, f.life); }

    if (game.mode === 'play') {
      for (const o of st.objects) this.drawObjectOverlay(o, t);
      for (const g of sv.groups) this.drawGroupOverlay(g, t);
    }

    // textos flutuantes
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const f of game.floats) {
      const w = tileCenter(f.x, f.y);
      const rise = (1.8 - f.life) * 40;
      ctx.globalAlpha = Math.min(1, f.life);
      ctx.font = 'bold 20px Nunito, sans-serif';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(60,35,15,0.8)';
      ctx.strokeText(f.text, w.x, w.y - 90 - rise);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, w.x, w.y - 90 - rise);
      ctx.globalAlpha = 1;
    }
  }

  drawPerson(ch, t, opt) {
    const w = tileCenter(ch.x, ch.y);
    this.ctx.globalAlpha = ch.alpha;
    drawCharacter(this.ctx, w.x, w.y, ch.look, t + ch.x * 3, { walking: ch.walking, sitting: opt.sitting, flip: ch.flip, carry: ch.carry, mood: opt.mood });
    this.ctx.globalAlpha = 1;
  }

  drawSign(name, n, open) {
    const { ctx } = this;
    const mid = isoToWorld(n / 2, 0);
    ctx.save();
    ctx.translate(mid.x, mid.y - WALL_H - 26);
    ctx.transform(1, 0.5, 0, 1, 0, 0);
    ctx.font = 'bold 22px Fredoka, Nunito, sans-serif';
    const w = Math.max(140, ctx.measureText(name).width + 36);
    ctx.fillStyle = '#5a3d2b'; roundRect(ctx, -w / 2, -20, w, 38, 10);
    ctx.fillStyle = '#7a5233'; roundRect(ctx, -w / 2 + 4, -16, w - 8, 30, 8);
    ctx.fillStyle = open ? '#ffe9c2' : '#bfa98c'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(name, 0, -1);
    // placa aberto/fechado
    ctx.fillStyle = open ? '#4caf6a' : '#d1495b';
    roundRect(ctx, w / 2 - 60, 22, 62, 20, 6);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Nunito, sans-serif';
    ctx.fillText(open ? 'ABERTO' : 'FECHADO', w / 2 - 29, 33);
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

  drawObject(o, t, tableDishes) {
    const item = itemById(o.item);
    const c = tileCenter(o.x, o.y);
    const opt = { t };
    const k = item.kind;
    if (k === 'stove') opt.stove = { state: o.data._order && o.data._start != null ? 'cooking' : 'idle' };
    if (k === 'counter') opt.plates = (o.data._plates || []).map((p) => p.recipe.icon);
    if (k === 'table') { opt.dishes = tableDishes.get(o.uid); opt.dirty = o.data._dirty; }
    if (k === 'chair') {
      const tf = tableFor(this.game.state, o);
      opt.facing = tf ? { dx: tf.dx, dy: tf.dy } : { dx: 1, dy: 0 };
    }
    if (this.game.mode === 'edit') this.tileHighlight(o.x, o.y, 'rgba(255,209,102,0.35)');
    drawItem(this.ctx, item, c.x, c.y, opt);
  }

  bubble(x, y, icon, opt = {}) {
    const { ctx } = this;
    const r = opt.r || 18;
    const pulse = opt.pulse ? 1 + Math.sin(this.game.t * 5) * 0.08 : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgba(60,35,15,0.25)';
    ctx.beginPath(); ctx.arc(0, 3, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = opt.bg || '#fffaf0';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-6, r - 3); ctx.lineTo(0, r + 8); ctx.lineTo(6, r - 3); ctx.fill();
    if (opt.ring != null) {
      ctx.strokeStyle = opt.ringColor; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, r - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, opt.ring)); ctx.stroke();
    }
    if (opt.hand) { ctx.strokeStyle = '#f2b134'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r + 3, 0, Math.PI * 2); ctx.stroke(); }
    ctx.font = `${Math.round(r * 1.0)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(icon, 0, 1);
    if (opt.badge) {
      ctx.fillStyle = '#5a3d2b'; ctx.beginPath(); ctx.arc(r * 0.8, -r * 0.7, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Nunito, sans-serif'; ctx.fillText(opt.badge, r * 0.8, -r * 0.7 + 1);
    }
    ctx.restore();
  }

  drawObjectOverlay(o, t) {
    const item = itemById(o.item);
    const c = tileCenter(o.x, o.y);
    const ctx = this.ctx;
    const g = this.game, sv = g.service;
    if (item.kind === 'stove') {
      const d = o.data;
      const top = c.y - 95;
      if (d._order && d._start != null) {
        if (d._done) { const mine = d._by === 'player'; this.bubble(c.x, top, d._order.recipe.icon, { pulse: mine, bg: '#e9fbe5', r: mine ? 21 : 16, hand: mine }); return; }
        const p = Math.min(1, (g.t - d._start) / d._dur);
        const w = 64, h = 12;
        ctx.fillStyle = 'rgba(60,35,15,0.55)'; roundRect(ctx, c.x - w / 2 - 2, top - 2, w + 4, h + 4, 7);
        ctx.fillStyle = '#fff1d6'; roundRect(ctx, c.x - w / 2, top, w, h, 6);
        ctx.fillStyle = d._by === 'player' ? '#7ad48f' : '#f4a261'; roundRect(ctx, c.x - w / 2, top, Math.max(8, w * p), h, 6);
        ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(d._order.recipe.icon, c.x - w / 2 - 14, top + 6);
      } else if (!sv.onDuty('cozinheiro').length && sv.orders.some((x) => x.status === 'queued')) {
        this.bubble(c.x, top + 4, '🍳', { r: 16, pulse: true, hand: true });
      }
    }
    if (item.kind === 'counter' && (o.data._plates || []).length && !sv.onDuty('garcom').length) {
      this.bubble(c.x, c.y - 90, '🛎️', { r: 16, pulse: true, hand: true, badge: o.data._plates.length });
    }
    if (item.kind === 'table' && o.data._dirty && !o.data._clearBy && !sv.onDuty('garcom').length) {
      this.bubble(c.x, c.y - 70, '🧽', { r: 14, hand: true });
    }
  }

  drawGroupOverlay(g, t) {
    const sv = this.game.service;
    const lead = g.members[0];
    if (!lead) return;
    const w = tileCenter(lead.ch.x, lead.ch.y);
    const ring = (secs, pmin) => 1 - Math.min(1, secs / (pmin * 60));
    const col = (r) => (r > 0.5 ? '#2a9d8f' : r > 0.25 ? '#f4a261' : '#e63946');
    const manual = !g.claim;
    if (g.state === 'waitSeat') {
      const r = ring(g.wait, PATIENCE.door);
      const noHost = !sv.onDuty('recepcionista').length && !sv.onDuty('garcom').length;
      this.bubble(w.x, w.y - 100, '👋', { ring: r, ringColor: col(r), badge: g.size, hand: noHost && manual, pulse: noHost });
    } else if (g.state === 'waitOrder') {
      const r = ring(g.wait, PATIENCE.order);
      const noWaiter = !sv.onDuty('garcom').length;
      this.bubble(w.x, w.y - 95, '📝', { ring: r, ringColor: col(r), hand: noWaiter && manual, pulse: noWaiter });
    } else if (g.state === 'waitFood' && !g.members.some((m) => m.plate)) {
      const r = ring(g.wait, PATIENCE.food);
      this.bubble(w.x, w.y - 95, '⏳', { r: 15, ring: r, ringColor: col(r) });
    } else if (g.state === 'waitBill') {
      const payer = g.members.find((m) => m.paying) || lead;
      const pw = tileCenter(payer.ch.x, payer.ch.y);
      const noCash = !sv.onDuty('caixa').length && !sv.onDuty('garcom').length;
      this.bubble(pw.x, pw.y - (payer.sitting ? 95 : 105), '💳', { r: 16, hand: noCash && manual && (g.atRegister || !sv.register()), pulse: noCash });
    }
  }

  // ---------- cliques ----------
  objectAtWorld(wx, wy) {
    const objs = [...this.game.state.objects].sort((a, b) => (b.x + b.y) - (a.x + a.y));
    for (const o of objs) {
      const c = tileCenter(o.x, o.y);
      const h = KIND_HEIGHT[kindOf(o)] || 50;
      const dx = Math.abs(wx - c.x) / (TW / 2), dy = Math.abs(wy - c.y) / (TH / 2);
      if (dx + dy <= 1) return o;
      if (Math.abs(wx - c.x) < TW * 0.38 && wy < c.y && wy > c.y - h) return o;
      if (kindOf(o) === 'stove' && Math.abs(wx - c.x) < 26 && wy < c.y - h && wy > c.y - 125) return o;
    }
    return null;
  }
  personAtWorld(wx, wy) {
    const sv = this.game.service;
    const cands = [];
    for (const g of sv.groups) for (const m of g.members) cands.push({ ch: m.ch, member: m, sitting: m.sitting });
    for (const a of sv.agents.values()) cands.push({ ch: a.ch, agent: a });
    cands.sort((a, b) => (b.ch.x + b.ch.y) - (a.ch.x + a.ch.y));
    for (const c of cands) {
      const w = tileCenter(c.ch.x, c.ch.y);
      const top = c.sitting ? 125 : 130;
      if (Math.abs(wx - w.x) < 18 && wy < w.y + 4 && wy > w.y - top) return c;
    }
    return null;
  }
  dirtAtWorld(wx, wy) {
    for (const d of this.game.state.dirt) {
      const c = tileCenter(d.x, d.y);
      if (Math.abs(wx - c.x) < 22 && Math.abs(wy - c.y) < 12) return d;
    }
    return null;
  }
}
