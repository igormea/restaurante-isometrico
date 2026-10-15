// Personagens que andam pelo restaurante (cozinheiro, garçom, clientes).
import { findPath, pathToObject } from '../engine/pathfinding.js';

export class Character {
  constructor(x, y, look) {
    this.x = x; this.y = y;          // posição em quadrados (pode ser fracionada enquanto anda)
    this.tx = x; this.ty = y;        // quadrado atual (inteiro)
    this.look = look;
    this.path = [];
    this.speed = 2.6;                // quadrados por segundo
    this.flip = false;
    this.onArrive = null;
    this.carry = null;               // ícone do prato carregado
    this.alpha = 1;
  }
  get walking() { return this.path.length > 0; }

  goTo(state, gx, gy, onArrive) {
    const p = findPath(state, this.tx, this.ty, gx, gy);
    if (!p) return false;
    this.path = p; this.onArrive = onArrive;
    if (!p.length) this._arrive();
    return true;
  }
  goToObject(state, obj, onArrive) {
    const p = pathToObject(state, this.tx, this.ty, obj.x, obj.y);
    if (!p) return false;
    this.path = p; this.onArrive = onArrive;
    if (!p.length) this._arrive();
    return true;
  }
  _arrive() {
    const cb = this.onArrive; this.onArrive = null;
    if (cb) cb();
  }
  update(dt) {
    if (!this.path.length) return;
    const n = this.path[0];
    const dx = n.x - this.x, dy = n.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * dt;
    // olha para a direção em que está andando (na tela)
    const sx = dx - dy;
    if (Math.abs(sx) > 0.01) this.flip = sx < 0;
    if (dist <= step) {
      this.x = n.x; this.y = n.y; this.tx = n.x; this.ty = n.y;
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

export const CHEF_LOOK = { skin: '#e8b48f', hair: '#2b1d14', shirt: '#ffffff', pants: '#3d405b', apron: '#f0ece4', hat: 'chef', hairStyle: 'short' };
export const WAITER_LOOK = { skin: '#c98d62', hair: '#1a1a1a', shirt: '#2f3e46', pants: '#1f1f24', apron: '#f6f1e3', bow: '#d1495b', hairStyle: 'bun' };
