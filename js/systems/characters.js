// Personagens que andam pelo restaurante (funcionários e clientes).
import { findPath, pathToObject } from '../engine/pathfinding.js';

export class Character {
  constructor(x, y, look) {
    this.x = x; this.y = y;
    this.tx = x; this.ty = y;
    this.look = look;
    this.path = [];
    this.speed = 2.4;
    this.flip = false;
    this.onArrive = null;
    this.carry = null;
    this.alpha = 1;
    this.label = null;
  }
  get walking() { return this.path.length > 0; }

  _set(p, cb) {
    if (!p) return false;
    this.path = p; this.onArrive = cb;
    if (!p.length) this._arrive();
    return true;
  }
  goTo(state, gx, gy, cb) { return this._set(findPath(state, this.tx, this.ty, gx, gy), cb); }
  goToObject(state, obj, cb) { return this._set(pathToObject(state, this.tx, this.ty, obj.x, obj.y), cb); }
  walkStraight(points, cb) { this.path = points.map((p) => ({ ...p })); this.onArrive = cb; if (!points.length) this._arrive(); }
  stop() { this.path = []; this.onArrive = null; }
  _arrive() { const cb = this.onArrive; this.onArrive = null; if (cb) cb(); }

  update(dt) {
    if (!this.path.length) return;
    const n = this.path[0];
    const dx = n.x - this.x, dy = n.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * dt;
    const sx = dx - dy;
    if (Math.abs(sx) > 0.01) this.flip = sx < 0;
    if (dist <= step) {
      this.x = n.x; this.y = n.y; this.tx = Math.round(n.x); this.ty = Math.round(n.y);
      this.path.shift();
      if (!this.path.length) this._arrive();
    } else {
      this.x += (dx / dist) * step; this.y += (dy / dist) * step;
    }
  }
}

const SKINS = ['#f6d3b3', '#e8b48f', '#c98d62', '#9c6644', '#6f4a33', '#f1c8a0'];
const HAIRS = ['#2b1d14', '#5a3a22', '#a8642e', '#e2b65a', '#1a1a1a', '#7a3b2e', '#cfcfcf'];
const SHIRTS = ['#e76f51', '#2a9d8f', '#457b9d', '#f4a261', '#8e5ea2', '#e9c46a', '#d1495b', '#3d5a80', '#81b29a'];
const PANTS = ['#3d405b', '#264653', '#5c4033', '#2f3e46', '#6d597a'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export const randomLook = () => ({
  skin: pick(SKINS), hair: pick(HAIRS), shirt: pick(SHIRTS), pants: pick(PANTS),
  hairStyle: pick(['short', 'short', 'long', 'bun']),
});

// uniforme de cada cargo
export function staffLook(emp) {
  const base = { skin: emp.look.skin, hair: emp.look.hair, hairStyle: emp.look.hairStyle };
  switch (emp.role) {
    case 'cozinheiro': return { ...base, shirt: '#ffffff', pants: '#3d405b', apron: '#f0ece4', hat: 'chef' };
    case 'garcom': return { ...base, shirt: '#2f3e46', pants: '#1f1f24', apron: '#f6f1e3', bow: '#d1495b' };
    case 'recepcionista': return { ...base, shirt: '#7a2f3a', pants: '#1f1f24', bow: '#e9c46a' };
    case 'caixa': return { ...base, shirt: '#2a9d8f', pants: '#264653', apron: '#e9f5f2' };
    default: return { ...base, shirt: '#888', pants: '#333' };
  }
}
