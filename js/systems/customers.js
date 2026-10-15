// Clientes: chegam pela porta, sentam, esperam a comida, comem, pagam e vão embora.
import { Character, randomLook } from './characters.js';
import { OUTSIDE } from '../engine/pathfinding.js';
import { isSeat, objectAt, charm } from '../core/state.js';
import { itemById } from '../config/items.js';

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// mesa vizinha de um assento (a cadeira "olha" para ela)
export function tableFor(state, seat) {
  for (const [dx, dy] of DIRS) {
    const o = objectAt(state, seat.x + dx, seat.y + dy);
    if (o && itemById(o.item).kind === 'table') return { table: o, dx, dy };
  }
  return null;
}

class Customer {
  constructor(manager, seat) {
    this.m = manager;
    this.seat = seat;
    this.ch = new Character(OUTSIDE.x - 1, OUTSIDE.y, randomLook());
    this.ch.alpha = 0;
    this.ch.speed = 2.2;
    this.state = 'entering';
    this.patience = 0;
    this.maxPatience = 45;
    this.timer = 0;
    this.dish = null;
    this.servedBy = null;
    this.mood = 'happy';
  }
  start(state) {
    const ok = this.ch.goTo(state, this.seat.x, this.seat.y, () => this.sit());
    if (!ok) this.leave(false);
  }
  sit() {
    const t = tableFor(this.m.game.state, this.seat);
    if (!t || !this.m.game.state.objects.includes(this.seat)) { this.leave(false); return; }
    this.state = 'waiting';
    this.ch.x = this.seat.x; this.ch.y = this.seat.y;
    this.ch.flip = (t.dx - t.dy) < 0;
    this.table = t.table;
    this.maxPatience = 45 + Math.min(40, charm(this.m.game.state) * 0.5);
    this.patience = this.maxPatience;
  }
  receive(recipe) {
    this.state = 'eating';
    this.dish = recipe;
    this.timer = 6;
  }
  leave(paid) {
    const g = this.m.game;
    if (this.state === 'eating' && paid) {
      g.earn(this.dish.price, this.seat);
      g.addXp(1, null);
      g.state.stats.served++;
    }
    if (this.state === 'waiting' && !paid) {
      this.mood = 'angry';
      g.floatText('😠', this.seat);
    }
    this.state = 'leaving';
    this.dish = null;
    this.m.release(this);
    const ok = this.ch.goTo(g.state, OUTSIDE.x - 1, OUTSIDE.y, () => this.m.remove(this));
    if (!ok) this.m.remove(this);
  }
  update(dt) {
    this.ch.update(dt);
    if (this.state === 'entering') this.ch.alpha = Math.min(1, this.ch.alpha + dt * 2);
    if (this.state === 'leaving' && this.ch.tx < 0) this.ch.alpha = Math.max(0, this.ch.alpha - dt * 2);
    if (this.state === 'waiting') {
      this.patience -= dt;
      if (this.patience <= 0 && !this.servedBy) this.leave(false);
      else if (this.patience <= 0) this.patience = 0;
    } else if (this.state === 'eating') {
      this.timer -= dt;
      if (this.timer <= 0) this.leave(true);
    }
  }
  get sitting() { return this.state === 'waiting' || this.state === 'eating'; }
}

export class CustomerManager {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.reserved = new Set(); // uids de cadeiras ocupadas
    this.spawnTimer = 3;
  }
  freeSeats() {
    const st = this.game.state;
    return st.objects.filter((o) => isSeat(o) && !this.reserved.has(o.uid) && tableFor(st, o));
  }
  seatTaken(uid) { return this.reserved.has(uid); }
  release(c) { this.reserved.delete(c.seat.uid); }
  remove(c) { this.list = this.list.filter((x) => x !== c); this.release(c); }
  interval() {
    return Math.max(2.5, 9 - charm(this.game.state) * 0.12);
  }
  update(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.interval() * (0.7 + Math.random() * 0.6);
      const seats = this.freeSeats();
      if (seats.length) {
        const seat = seats[Math.floor(Math.random() * seats.length)];
        const c = new Customer(this, seat);
        this.reserved.add(seat.uid);
        this.list.push(c);
        c.start(this.game.state);
      }
    }
    for (const c of [...this.list]) c.update(dt);
  }
}
