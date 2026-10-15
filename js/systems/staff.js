// Funcionários: o cozinheiro (obedece aos seus cliques) e o garçom (trabalha sozinho).
import { Character, CHEF_LOOK, WAITER_LOOK } from './characters.js';
import { stoveStatus, startCooking, clearStove, findCounterFor, countersWithFood } from './kitchen.js';
import { recipeById } from '../config/recipes.js';
import { walkable } from '../engine/pathfinding.js';
import { roomSize } from '../core/state.js';

function freeTileNear(state, x, y) {
  const n = roomSize(state);
  for (let r = 0; r < n; r++) {
    for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
      const tx = x + dx, ty = y + dy;
      if (tx >= 0 && ty >= 0 && tx < n && ty < n && walkable(state, tx, ty)) return { x: tx, y: ty };
    }
  }
  return { x: 1, y: 1 };
}

export class Chef {
  constructor(game) {
    this.game = game;
    const p = freeTileNear(game.state, 2, 1);
    this.ch = new Character(p.x, p.y, CHEF_LOOK);
    this.queue = [];
    this.busy = false;
    this.wait = 0;
  }
  enqueue(action) { this.queue.push(action); }

  update(dt) {
    this.ch.update(dt);
    if (this.wait > 0) { this.wait -= dt; if (this.wait <= 0 && this.after) { const f = this.after; this.after = null; f(); } return; }
    if (this.busy || !this.queue.length) return;
    const a = this.queue.shift();
    const st = this.game.state;
    const stove = st.objects.find((o) => o.uid === a.uid);
    if (!stove) return;
    this.busy = true;
    const ok = this.ch.goToObject(st, stove, () => this.perform(a, stove));
    if (!ok) { this.fail(a, stove, 'O cozinheiro não consegue chegar até esse fogão!'); }
  }

  fail(a, stove, msg) {
    if (a.type === 'cook') this.game.earn(recipeById(a.recipe).cost, null, true); // devolve o dinheiro
    stove.data._pending = null;
    this.busy = false;
    this.game.toast(msg);
  }

  perform(a, stove) {
    this.wait = 0.6;
    this.after = () => {
      const st = this.game.state;
      if (a.type === 'cook') {
        stove.data._pending = null;
        startCooking(stove, a.recipe);
        this.game.save();
        this.busy = false;
      } else if (a.type === 'clean') {
        clearStove(stove);
        this.game.save();
        this.busy = false;
      } else if (a.type === 'serve') {
        const s = stoveStatus(stove);
        if (s.state !== 'ready') { stove.data._pending = null; this.busy = false; return; }
        const counter = findCounterFor(st, s.recipe.id);
        if (!counter) { this.fail(a, stove, 'Nenhum balcão livre! Compre mais balcões ou espere esvaziar.'); return; }
        counter.data._incoming = s.recipe.id;
        const recipe = s.recipe;
        clearStove(stove);
        this.ch.carry = recipe.icon;
        const ok = this.ch.goToObject(st, counter, () => {
          this.wait = 0.4;
          this.after = () => {
            counter.data._incoming = null;
            counter.data.recipe = recipe.id;
            counter.data.servings = (counter.data.servings || 0) + recipe.servings;
            this.ch.carry = null;
            st.stats.cooked++;
            this.game.addXp(recipe.xp, counter);
            this.game.save();
            this.busy = false;
          };
        });
        if (!ok) {
          // sem caminho até o balcão: coloca direto
          counter.data._incoming = null;
          counter.data.recipe = recipe.id;
          counter.data.servings = (counter.data.servings || 0) + recipe.servings;
          this.ch.carry = null;
          this.game.addXp(recipe.xp, counter);
          this.busy = false;
        }
      }
    };
  }
}

export class Waiter {
  constructor(game) {
    this.game = game;
    const p = freeTileNear(game.state, 4, 2);
    this.ch = new Character(p.x, p.y, WAITER_LOOK);
    this.ch.speed = 3.2;
    this.busy = false;
    this.wait = 0;
  }
  update(dt) {
    this.ch.update(dt);
    if (this.wait > 0) { this.wait -= dt; if (this.wait <= 0 && this.after) { const f = this.after; this.after = null; f(); } return; }
    if (this.busy) return;
    const st = this.game.state;
    const customer = this.game.customers.list.find((c) => c.state === 'waiting' && !c.servedBy);
    if (!customer) return;
    const counter = countersWithFood(st)[0];
    if (!counter) return;
    // reserva uma porção
    const recipe = recipeById(counter.data.recipe);
    counter.data.servings--;
    if (counter.data.servings <= 0) { counter.data.servings = 0; counter.data.recipe = null; }
    customer.servedBy = this;
    this.busy = true;
    const deliver = () => {
      if (!this.game.customers.list.includes(customer) || customer.state !== 'waiting') {
        this.ch.carry = null; this.busy = false; return;
      }
      const seat = customer.seat;
      const go = this.ch.goToObject(st, seat, () => {
        this.wait = 0.3;
        this.after = () => { this.ch.carry = null; customer.receive(recipe); this.busy = false; };
      });
      if (!go) { this.ch.carry = null; customer.receive(recipe); this.busy = false; }
    };
    const ok = this.ch.goToObject(st, counter, () => {
      this.wait = 0.3;
      this.after = () => { this.ch.carry = recipe.icon; deliver(); };
    });
    if (!ok) { this.ch.carry = recipe.icon; deliver(); }
  }
}
