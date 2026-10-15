// O atendimento ao vivo: clientes em grupo, equipe trabalhando sozinha e o modo manual
// (quando falta alguém para uma função, ou no feriado, quem faz é você, clicando).
import { Character, randomLook, staffLook } from './characters.js';
import { outsideOf, exitOf, accessTiles, walkable } from '../engine/pathfinding.js';
import { objectsOfKind, objectAt, kindOf, isSeat, charm, hygiene, inRoom, roomSize, doorOf } from '../core/state.js';
import { itemById } from '../config/items.js';
import { RECIPES, recipeById, CUISINES } from '../config/recipes.js';
import { LEVELS } from '../config/staff.js';
import { PATIENCE, EAT_MIN, COSTS } from '../config/economy.js';
import { staffOnDuty } from './schedule.js';

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// vagas na calçada para a fila da porta (relativas à porta)
const SLOT_OFFS = [[0, 1], [-1, 1], [1, 1], [0, 2], [-1, 2], [1, 2], [2, 1], [2, 2], [0, 3], [1, 3], [-1, 3], [2, 3]];
const slotsOf = (s) => { const d = doorOf(s); return SLOT_OFFS.map(([dx, dy]) => ({ x: d.x + dx, y: d.y + dy, k: dx + ',' + dy })); };

// ---------- mesas ----------
export function tableFor(state, seat) {
  for (const [dx, dy] of DIRS) {
    const o = objectAt(state, seat.x + dx, seat.y + dy);
    if (o && kindOf(o) === 'table') return { table: o, dx, dy };
  }
  return null;
}
export function seatsOf(state, table) {
  return state.objects.filter((o) => isSeat(o) && tableFor(state, o)?.table === table);
}

let gid = 0;

export class Service {
  constructor(game) {
    this.game = game;
    this.groups = [];
    this.orders = [];
    this.agents = new Map(); // id do funcionário -> agente
    this.spawnT = 15;
    this.fx = [];
  }
  get state() { return this.game.state; }

  // ======================================================== ciclo
  update(dt, st) {
    this.st = st;
    this.syncStaff(st);
    if (st.open) this.spawn(dt, st);
    for (const g of [...this.groups]) this.updateGroup(g, dt);
    for (const a of this.agents.values()) this.think(a, dt);
    for (const a of [...this.agents.values()]) a.ch.update(dt);
    for (const g of this.groups) for (const m of g.members) m.ch.update(dt);
    this.updateStoves(dt);
    this.fx = this.fx.filter((f) => (f.life -= dt) > 0);
    this.state._dirtyTables = objectsOfKind(this.state, 'table').filter((t) => t.data._dirty).length;
  }

  // ======================================================== equipe
  syncStaff(st) {
    const s = this.state;
    let want;
    if (st.isHoliday) want = [];
    else if (st.open) want = staffOnDuty(s, st);
    else if (this.groups.length) want = [...this.agents.values()].map((a) => a.emp).filter((e) => s.staff.includes(e));
    else want = [];
    const ids = new Set(want.map((e) => e.id));
    for (const e of want) if (!this.agents.has(e.id)) this.addAgent(e);
    for (const [id, a] of this.agents) if (!ids.has(id) && !a.leaving) this.removeAgent(a);
  }
  addAgent(emp) {
    const ex = exitOf(this.state);
    const ch = new Character(ex.x, ex.y, staffLook(emp));
    ch.alpha = 0;
    const L = LEVELS[emp.level];
    ch.speed = 2.4 * emp.speed;
    const a = { emp, ch, busy: false, wait: 0, after: null, L, idleT: 0 };
    this.agents.set(emp.id, a);
    const out = outsideOf(this.state);
    ch.walkStraight([{ x: out.x, y: out.y }], () => this.goPost(a));
  }
  removeAgent(a) {
    a.leaving = true;
    this.release(a);
    a.busy = true; a.wait = 0; a.after = null; a.ch.carry = null;
    const done = () => this.agents.delete(a.emp.id);
    const ex = exitOf(this.state);
    if (!a.ch.goTo(this.state, ex.x, ex.y, done)) done();
  }
  postOf(a) {
    const s = this.state;
    const role = a.emp.role;
    let target = null;
    if (role === 'cozinheiro') {
      const cooks = [...this.agents.values()].filter((x) => x.emp.role === 'cozinheiro');
      const stoves = objectsOfKind(s, 'stove');
      const st = stoves[cooks.indexOf(a) % Math.max(1, stoves.length)];
      if (st) target = { x: st.x, y: st.y + 1 };
    } else if (role === 'garcom') {
      const p = objectsOfKind(s, 'counter')[0];
      if (p) target = { x: p.x, y: p.y + 1 };
    } else if (role === 'recepcionista') { const d = doorOf(s); target = { x: d.x + 1, y: d.y - 1 }; }
    else if (role === 'caixa') {
      const r = objectsOfKind(s, 'register')[0];
      if (r) target = accessTiles(s, r.x, r.y)[0];
    }
    if (!target || !walkable(s, target.x, target.y)) target = nearestFree(s, target || { x: 2, y: 2 });
    return target;
  }
  goPost(a) {
    const p = this.postOf(a);
    a.ch.alpha = 1;
    if (p) a.ch.goTo(this.state, p.x, p.y, null);
  }
  release(a) {
    for (const g of this.groups) if (g.claim === a) g.claim = null;
    for (const o of this.orders) {
      if (o.by !== a) continue;
      if (o.status === 'cooking' && o.stove) { this.clearStove(o.stove); o.stove = null; o.status = 'queued'; }
      if (o.status === 'delivering') { o.status = 'ready'; const p = objectsOfKind(this.state, 'counter')[0]; if (p) (p.data._plates = p.data._plates || []).push(o); }
      o.by = null;
    }
    for (const t of objectsOfKind(this.state, 'table')) if (t.data._clearBy === a) t.data._clearBy = null;
    for (const d of this.state.dirt) if (d._by === a) d._by = null;
  }
  onDuty(role) { return [...this.agents.values()].filter((a) => a.emp.role === role && !a.leaving); }

  // tarefas com espera (o funcionário fica parado fazendo a ação)
  doFor(a, secs, fn) { a.wait = secs; a.after = fn; }

  think(a, dt) {
    if (a.leaving) return;
    if (a.wait > 0) {
      a.wait -= dt;
      if (a.wait <= 0 && a.after) { const f = a.after; a.after = null; f(); }
      return;
    }
    if (a.busy || a.ch.walking) return;
    const r = a.emp.role;
    const did = (r === 'cozinheiro' && this.cookWork(a))
      || (r === 'garcom' && this.waiterWork(a))
      || (r === 'recepcionista' && this.hostWork(a))
      || (r === 'caixa' && this.cashierWork(a));
    if (!did) {
      a.idleT += dt;
      if (a.idleT > 3) { a.idleT = 0; const p = this.postOf(a); if (p && (a.ch.tx !== p.x || a.ch.ty !== p.y)) a.ch.goTo(this.state, p.x, p.y, null); }
    } else a.idleT = 0;
  }

  // ---------- cozinheiro ----------
  // um cozinheiro cuida de até 2 fogões ao mesmo tempo (com mais risco de queimar)
  cookWork(a) {
    a.active = a.active || new Set();
    // 1. empratar o que ficou pronto nos meus fogões
    const done = [...a.active].find((st) => st.data._done);
    if (done) {
      a.busy = true;
      const plate = () => this.doFor(a, 1.2, () => {
        const order = done.data._order;
        a.active.delete(done);
        this.clearStove(done);
        if (!order) { a.busy = false; return; }
        order.stove = null;
        this.carryToPasse(a, order);
      });
      if (!a.ch.goToObject(this.state, done, plate)) plate();
      return true;
    }
    if (a.active.size >= 2) return false;
    const order = this.orders.find((o) => o.status === 'queued');
    if (!order) return false;
    const stove = objectsOfKind(this.state, 'stove').find((s) => !s.data._order);
    if (!stove) return false;
    order.status = 'cooking'; order.by = a; order.stove = stove;
    stove.data._order = order; stove.data._by = a; stove.data._start = null;
    a.active.add(stove);
    a.busy = true;
    const go = () => this.doFor(a, 1, () => { this.startCook(stove, order, a); a.busy = false; });
    if (!a.ch.goToObject(this.state, stove, go)) go();
    return true;
  }
  startCook(stove, order, cook) {
    const it = itemById(stove.item);
    const speed = (cook === 'player' ? 1 : cook.emp.speed) * (it.speed || 1);
    stove.data._start = this.game.t;
    stove.data._dur = (order.recipe.minutes * 60) / speed;
    stove.data._by = cook;
    stove.data._juggling = cook !== 'player' && cook.active && cook.active.size > 1;
  }
  updateStoves() {
    for (const s of objectsOfKind(this.state, 'stove')) {
      const d = s.data;
      if (!d._order || d._start == null || d._done) continue;
      if (this.game.t - d._start >= d._dur) this.finishCook(s);
    }
  }
  burnChance(cook, recipe, stove) {
    const diff = { 1: 0.6, 2: 1, 3: 1.6 }[recipe.difficulty];
    const stoveMult = itemById(stove.item).burnMult || 1;
    if (cook === 'player') return 0.05 * diff * stoveMult;
    const spec = cook.emp.specialty === recipe.cuisine ? 0.1 : 1;
    const juggle = stove.data._juggling ? 1.3 : 1;
    return cook.L.burn * diff * spec * stoveMult * juggle;
  }
  finishCook(stove) {
    const d = stove.data, order = d._order, cook = d._by;
    const m = this.state.month;
    m.gas += (d._dur / 60) * COSTS.gasPerStoveMin;
    const burnt = Math.random() < this.burnChance(cook, order.recipe, stove);
    if (burnt) {
      m.burned++;
      this.fx.push({ type: 'smoke', x: stove.x, y: stove.y, life: 4 });
      this.game.floatText('🔥 Queimou!', stove, '#ff8a5b');
      this.clearStove(stove);
      if (cook !== 'player' && cook.active) cook.active.delete(stove);
      order.by = null; order.stove = null;
      if (this.consume(order.recipe)) { order.status = 'queued'; this.orders.splice(this.orders.indexOf(order), 1); this.orders.unshift(order); }
      else this.failMember(order);
      return;
    }
    let q;
    if (cook === 'player') q = 3.4 + rand(-0.4, 0.4);
    else q = cook.L.quality + (cook.emp.specialty === order.recipe.cuisine ? 0.8 : 0) + rand(-0.5, 0.5);
    q += (this.ingQuality(order.recipe) - 1) * 2;
    order.q = Math.max(1, Math.min(5, q));
    this.state.stats.cooked++;
    d._done = true; // espera alguém empratar (cozinheiro ou você)
  }
  clearStove(s) { s.data._order = null; s.data._by = null; s.data._start = null; s.data._done = false; }
  carryToPasse(cook, order) {
    const passe = objectsOfKind(this.state, 'counter').find((c) => (c.data._plates || []).length < 4);
    if (!passe) { this.doFor(cook, 3, () => this.carryToPasse(cook, order)); return; }
    cook.ch.carry = order.recipe.icon;
    order.status = 'carrying';
    const put = () => this.doFor(cook, 1, () => {
      const pl = (passe.data._plates = passe.data._plates || []);
      if (pl.length >= 4) { this.carryToPasse(cook, order); return; }
      pl.push(order); order.status = 'ready'; order.by = null;
      cook.ch.carry = null; cook.busy = false;
    });
    if (!cook.ch.goToObject(this.state, passe, put)) put();
  }

  // ---------- garçom ----------
  waiterWork(a) {
    // 1. levar pratos prontos
    for (const p of objectsOfKind(this.state, 'counter')) {
      const plate = (p.data._plates || [])[0];
      if (plate) { p.data._plates.shift(); this.deliver(a, p, plate); return true; }
    }
    // 2. anotar pedidos
    const go = this.groups.find((g) => g.state === 'waitOrder' && !g.claim);
    if (go) { this.takeOrder(a, go); return true; }
    // 3. receber clientes se não houver recepcionista
    if (!this.onDuty('recepcionista').length) {
      const gs = this.groups.find((g) => g.state === 'waitSeat' && !g.claim && this.findTable(g.size));
      if (gs) { this.seatGroup(a, gs); return true; }
    }
    // 4. cobrar se não houver caixa
    if (!this.onDuty('caixa').length) {
      const gb = this.groups.find((g) => g.state === 'waitBill' && !g.claim && (g.atRegister || !this.register()));
      if (gb) { this.charge(a, gb); return true; }
    }
    // 5. limpar mesas
    const t = objectsOfKind(this.state, 'table').find((x) => x.data._dirty && !x.data._clearBy);
    if (t) { this.clearTable(a, t); return true; }
    // 6. limpar o chão
    const d = this.state.dirt.find((x) => !x._by);
    if (d) { this.cleanDirt(a, d); return true; }
    return false;
  }
  deliver(a, passe, order) {
    order.status = 'delivering'; order.by = a; a.busy = true;
    const pickUp = () => this.doFor(a, 1.5, () => {
      a.ch.carry = order.recipe.icon;
      const mem = order.group.members[order.mi];
      const give = () => this.doFor(a, 1.5, () => { a.ch.carry = null; a.busy = false; this.serveMember(order); });
      if (!this.groups.includes(order.group) || !mem.seat) { a.ch.carry = null; a.busy = false; order.status = 'done'; return; }
      if (!a.ch.goToObject(this.state, mem.seat, give)) give();
    });
    if (!a.ch.goToObject(this.state, passe, pickUp)) pickUp();
  }
  serveMember(order) {
    order.status = 'done';
    const g = order.group;
    if (!this.groups.includes(g)) return;
    const mem = g.members[order.mi];
    mem.plate = { recipe: order.recipe, q: order.q };
    mem.eatLeft = rand(EAT_MIN[0], EAT_MIN[1]) * 60;
    this.state.month.water += COSTS.waterPerDish;
    this.state.month.dishes++;
  }
  takeOrder(a, g) {
    g.claim = a; a.busy = true;
    const write = () => this.doFor(a, 20 / a.emp.speed, () => { this.placeOrders(g); g.claim = null; a.busy = false; });
    if (!a.ch.goToObject(this.state, g.table, write)) write();
  }
  clearTable(a, t) {
    t.data._clearBy = a; a.busy = true;
    const clean = () => this.doFor(a, 18 / a.emp.speed, () => { t.data._dirty = false; t.data._clearBy = null; a.busy = false; this.state.month.water += COSTS.waterPerClean; });
    if (!a.ch.goToObject(this.state, t, clean)) clean();
  }
  cleanDirt(a, d) {
    d._by = a; a.busy = true;
    const clean = () => this.doFor(a, 10, () => { this.removeDirt(d); a.busy = false; });
    if (!a.ch.goTo(this.state, d.x, d.y, clean)) clean();
  }
  removeDirt(d) {
    this.state.dirt = this.state.dirt.filter((x) => x !== d);
    this.state.month.water += COSTS.waterPerClean;
  }

  // ---------- recepcionista ----------
  hostWork(a) {
    const g = this.groups.find((x) => x.state === 'waitSeat' && !x.claim && this.findTable(x.size));
    if (!g) return false;
    this.seatGroup(a, g);
    return true;
  }
  seatGroup(a, g) {
    g.claim = a; a.busy = true;
    const greet = () => this.doFor(a, 4, () => {
      a.busy = false; g.claim = null;
      if (!this.sendToTable(g)) return;
      if (a.emp.role === 'recepcionista') this.goPost(a);
    });
    const d = doorOf(this.state);
    if (!a.ch.goTo(this.state, d.x, d.y, greet)) greet();
  }

  // ---------- caixa ----------
  register() { return objectsOfKind(this.state, 'register')[0] || null; }
  cashierWork(a) {
    const g = this.groups.find((x) => x.state === 'waitBill' && !x.claim && x.atRegister);
    if (!g) return false;
    this.charge(a, g);
    return true;
  }
  charge(a, g) {
    g.claim = a; a.busy = true;
    const isCashier = a.emp.role === 'caixa';
    const secs = (isCashier ? 30 : 50) / a.emp.speed;
    const target = this.register() && g.atRegister ? this.register() : g.table;
    const work = () => this.doFor(a, secs, () => { a.busy = false; g.claim = null; this.pay(g, a); if (!isCashier) this.goPost(a); });
    if (isCashier && this.register()) { work(); return; }
    if (!a.ch.goToObject(this.state, target, work)) work();
  }

  // ======================================================== clientes
  arrivalRate(st) {
    // grupos por hora
    const h = st.l.minutes / 60;
    let f = 0.4;
    if (h >= 12 && h < 14) f = 1; else if (h >= 11 && h < 15) f = 0.6;
    if (h >= 19 && h < 21.5) f = 1; else if (h >= 18 && h < 23) f = 0.65;
    const wd = st.l.weekday;
    const day = wd === 5 || wd === 6 ? 1.3 : wd === 0 ? 1.15 : 1;
    const rep = Math.pow(this.state.rep / 3, 1.5);
    const beauty = 1 + Math.min(1, charm(this.state) / 50);
    const menuN = this.availableRecipes().length;
    const menu = Math.min(1, menuN / 5);
    return 7 * f * day * rep * beauty * menu;
  }
  freeSlots() {
    const used = new Set();
    for (const g of this.groups) for (const m of g.members) if (m.slot) used.add(m.slot.k);
    return slotsOf(this.state).filter((s) => !used.has(s.k));
  }
  spawn(dt, st) {
    this.spawnT -= dt;
    if (this.spawnT > 0) return;
    const rate = this.arrivalRate(st);
    this.spawnT = rate > 0 ? -Math.log(1 - Math.random()) * 3600 / rate : 60;
    if (!rate) return;
    const size = pick([1, 2, 2, 2, 2, 3, 3, 4, 4]);
    // restaurante lotado: a maioria passa reto e procura outro lugar
    if (!this.findTable(size) && Math.random() < 0.7) return;
    const free = this.freeSlots();
    if (free.length < size || this.groups.filter((g) => g.state === 'waitSeat' || g.state === 'arriving').length >= 3) return;
    const prefs = Object.keys(CUISINES);
    const g = {
      id: ++gid, size, pref: pick(prefs), state: 'arriving', wait: 0, waits: { door: 0, order: 0, food: 0, bill: 0 },
      members: [], table: null, claim: null, atRegister: false,
    };
    for (let i = 0; i < size; i++) {
      const d0 = doorOf(this.state);
      const ch = new Character(d0.x + (i % 2 ? 0.4 : -0.4), d0.y + 8 + i * 0.5, randomLook());
      ch.alpha = 0; ch.speed = 2;
      const slot = free[i];
      const m = { ch, slot, seat: null, plate: null, eatLeft: 0, done: false, failed: false };
      ch.walkStraight([{ x: slot.x, y: slot.y }], () => { m.arrived = true; ch.flip = false; });
      g.members.push(m);
    }
    this.groups.push(g);
  }
  findTable(size) {
    let best = null;
    for (const t of objectsOfKind(this.state, 'table')) {
      if (t.data._group || t.data._dirty) continue;
      const seats = seatsOf(this.state, t);
      if (seats.length < size) continue;
      if (!best || seats.length < best.seats.length) best = { t, seats };
    }
    return best;
  }
  sendToTable(g) {
    const found = this.findTable(g.size);
    if (!found) return false;
    g.table = found.t; found.t.data._group = g;
    g.state = 'walkingIn'; g.wait = 0;
    let arrived = 0;
    g.members.forEach((m, i) => {
      m.slot = null;
      m.seat = found.seats[i];
      const sit = () => {
        m.ch.x = m.seat.x; m.ch.y = m.seat.y; m.ch.tx = m.seat.x; m.ch.ty = m.seat.y;
        const tf = tableFor(this.state, m.seat);
        if (tf) m.ch.flip = (tf.dx - tf.dy) < 0;
        m.sitting = true;
        if (++arrived === g.size) { g.state = 'waitOrder'; g.wait = 0; }
      };
      if (!m.ch.goTo(this.state, m.seat.x, m.seat.y, sit)) sit();
    });
    return true;
  }
  updateGroup(g, dt) {
    for (const m of g.members) {
      if (g.state === 'arriving' || g.state === 'waitSeat') m.ch.alpha = Math.min(1, m.ch.alpha + dt * 1.5);
      if (g.state === 'leaving' && m.ch.y > roomSize(this.state) + 3) m.ch.alpha = Math.max(0, m.ch.alpha - dt * 1.5);
    }
    if (g.state === 'arriving') {
      if (g.members.every((m) => m.arrived)) { g.state = 'waitSeat'; g.wait = 0; }
      return;
    }
    if (g.state === 'leaving') return;
    g.wait += dt;
    if (g.state === 'waitSeat') {
      g.waits.door = g.wait;
      if (g.wait > PATIENCE.door * 60 && !g.claim) this.walkOut(g, 'Cansaram de esperar na porta');
    } else if (g.state === 'waitOrder') {
      g.waits.order = g.wait;
      if (g.wait > PATIENCE.order * 60 && !g.claim) this.walkOut(g, 'Ninguém veio anotar o pedido');
    } else if (g.state === 'waitFood') {
      g.waits.food = g.wait;
      let all = true;
      for (const m of g.members) {
        if (m.plate && !m.done) { m.eatLeft -= dt; if (m.eatLeft <= 0) { m.done = true; } }
        if (!m.done && !m.failed) all = false;
      }
      const anyServed = g.members.some((m) => m.plate);
      if (all) {
        if (g.members.some((m) => m.done)) this.askBill(g);
        else this.walkOut(g, 'Não conseguiram pedir nada');
      } else if (!anyServed && g.wait > PATIENCE.food * 60) this.walkOut(g, 'A comida demorou demais');
    } else if (g.state === 'waitBill') {
      g.waits.bill = g.wait;
    }
  }
  availableRecipes() {
    return RECIPES.filter((r) => this.state.menu[r.id]?.on && this.hasStock(r));
  }
  hasStock(r, times = 1) {
    return Object.entries(r.ing).every(([k, q]) => (this.state.stock[k]?.qty || 0) >= q * times);
  }
  consume(r) {
    if (!this.hasStock(r)) return false;
    for (const [k, q] of Object.entries(r.ing)) this.state.stock[k].qty -= q;
    return true;
  }
  ingQuality(r) {
    const ks = Object.keys(r.ing);
    return ks.reduce((a, k) => a + (this.state.stock[k]?.q || 1), 0) / ks.length;
  }
  chooseDish(g) {
    const avail = this.availableRecipes();
    if (!avail.length) return null;
    const w = avail.map((r) => {
      const price = this.state.menu[r.id].price;
      let x = Math.pow(r.price / price, 2);
      if (r.cuisine === g.pref) x *= 3;
      return x;
    });
    let s = w.reduce((a, b) => a + b, 0) * Math.random();
    for (let i = 0; i < avail.length; i++) { s -= w[i]; if (s <= 0) return avail[i]; }
    return avail[avail.length - 1];
  }
  placeOrders(g) {
    g.members.forEach((m, i) => {
      const r = this.chooseDish(g);
      if (!r || !this.consume(r)) { m.failed = true; return; }
      m.recipe = r;
      m.price = this.state.menu[r.id].price;
      this.orders.push({ id: g.id + '-' + i, group: g, mi: i, recipe: r, status: 'queued', by: null, stove: null, q: null });
    });
    g.state = 'waitFood'; g.wait = 0;
    if (g.members.every((m) => m.failed)) this.walkOut(g, 'O cardápio estava sem nada disponível');
  }
  failMember(order) {
    order.status = 'done';
    const m = order.group.members[order.mi];
    if (m) m.failed = true;
  }
  askBill(g) {
    g.state = 'waitBill'; g.wait = 0;
    const reg = this.register();
    if (!reg) return;
    const payer = g.members.find((m) => m.done) || g.members[0];
    const caixaPost = this.onDuty('caixa')[0] ? this.postOf(this.onDuty('caixa')[0]) : null;
    const spot = accessTiles(this.state, reg.x, reg.y).find((t) => !caixaPost || t.x !== caixaPost.x || t.y !== caixaPost.y);
    if (!spot) { return; }
    payer.sitting = false; payer.paying = true;
    if (!payer.ch.goTo(this.state, spot.x, spot.y, () => { g.atRegister = true; })) g.atRegister = true;
  }
  satisfaction(g) {
    const s = this.state;
    let score = 5;
    const reasons = [];
    const r = (w, p) => Math.min(1.5, w / (p * 60));
    const door = r(g.waits.door, PATIENCE.door), order = r(g.waits.order, PATIENCE.order), food = r(g.waits.food, PATIENCE.food), bill = r(g.waits.bill, PATIENCE.bill);
    score -= door * 1.0 + order * 1.0 + food * 1.6 + bill * 0.8;
    if (door > 0.6) reasons.push('Esperamos muito na porta');
    if (order > 0.6) reasons.push('Demoraram para anotar o pedido');
    if (food > 0.5) reasons.push('A comida demorou');
    if (bill > 0.6) reasons.push('Demoraram para cobrar');
    const plates = g.members.filter((m) => m.plate);
    const q = plates.reduce((a, m) => a + m.plate.q, 0) / Math.max(1, plates.length);
    score += (q - 3) * 0.7;
    if (q >= 4.3) reasons.push(`${pick(plates).plate.recipe.name} estava perfeito`);
    else if (q < 2.5) reasons.push('A comida estava sem graça');
    const failed = g.members.filter((m) => m.failed).length;
    if (failed) { score -= failed * 1.2; reasons.push('Faltou prato do cardápio'); }
    const h = hygiene(s);
    if (h < 70) { score -= (70 - h) / 30; reasons.push('O lugar estava sujo'); }
    const c = charm(s);
    score += Math.min(0.6, c / 50);
    if (c >= 15) reasons.push('Ambiente lindo');
    const ratio = plates.reduce((a, m) => a + m.price / m.plate.recipe.price, 0) / Math.max(1, plates.length);
    if (ratio > 1.1) { score -= (ratio - 1.1) * 3; reasons.push('Achamos caro'); }
    else if (ratio < 0.9) { score += 0.3; reasons.push('Preço justo'); }
    return { score: Math.max(1, Math.min(5, score)), reasons, q };
  }
  pay(g, by) {
    if (!this.groups.includes(g) || g.state === 'leaving') return;
    const s = this.state;
    const total = g.members.filter((m) => m.plate).reduce((a, m) => a + m.price, 0);
    const sat = this.satisfaction(g);
    const tip = sat.score >= 4.3 ? Math.round(total * 0.1 * 100) / 100 : 0;
    s.cash += total + tip;
    s.month.revenue += total; s.month.tips += tip;
    s.month.customers += g.size; s.month.groups++;
    s.stats.served += g.size; s.stats.earned += total + tip;
    this.dayStat('revenue', total + tip); this.dayStat('customers', g.size);
    const where = (this.register() && g.atRegister) ? this.register() : g.table;
    this.game.floatText(`+R$ ${Math.round(total + tip)}`, where, '#ffd166');
    this.review(g, sat);
    this.leave(g);
    void by;
  }
  review(g, sat) {
    const s = this.state;
    const text = sat.reasons.length ? sat.reasons.slice(0, 2).join('. ') + '.' : pick(['Tudo certo, voltaremos!', 'Bom atendimento.', 'Gostamos bastante.']);
    s.reviews.unshift({ t: Date.now(), score: Math.round(sat.score * 10) / 10, text, size: g.size });
    s.reviews = s.reviews.slice(0, 60);
    s.rep += (sat.score - s.rep) * 0.08;
    s.rep = Math.max(1, Math.min(5, s.rep));
  }
  walkOut(g, why) {
    const s = this.state;
    s.month.lost += g.size;
    this.dayStat('lost', g.size);
    this.game.floatText('😠', g.members[0].ch, '#ffffff');
    if (g.state !== 'waitSeat') this.review(g, { score: 1.5, reasons: [why] });
    else if (Math.random() < 0.3) this.review(g, { score: 2.2, reasons: [why] });
    this.leave(g);
  }
  leave(g) {
    g.state = 'leaving';
    if (g.table) {
      if (g.members.some((m) => m.plate)) g.table.data._dirty = true;
      g.table.data._group = null;
    }
    for (const o of this.orders) if (o.group === g && o.status === 'queued') { o.status = 'done'; }
    this.orders = this.orders.filter((o) => o.group !== g || o.status === 'cooking' || o.status === 'carrying' || o.status === 'delivering');
    for (const p of objectsOfKind(this.state, 'counter')) if (p.data._plates) p.data._plates = p.data._plates.filter((o) => o.group !== g);
    let out = 0;
    g.members.forEach((m) => {
      m.sitting = false; m.slot = null;
      if (Math.random() < 0.22 && m.seat) this.addDirt(m.seat.x, m.seat.y);
      const gone = () => { if (++out === g.size) this.groups = this.groups.filter((x) => x !== g); };
      const ex = exitOf(this.state);
      if (!m.ch.goTo(this.state, ex.x, ex.y, gone)) gone();
    });
  }
  addDirt(x, y) {
    const s = this.state;
    for (const [dx, dy] of [[0, 0], ...DIRS]) {
      const tx = x + dx, ty = y + dy;
      if (inRoom(s, tx, ty) && walkable(s, tx, ty) && !s.dirt.some((d) => d.x === tx && d.y === ty)) {
        s.dirt.push({ x: tx, y: ty, k: Math.floor(Math.random() * 3) });
        return;
      }
    }
  }
  dayStat(k, v) {
    const key = this.st?.l.dateKey;
    if (!key) return;
    const d = (this.state.days[key] = this.state.days[key] || { revenue: 0, customers: 0, lost: 0 });
    d[k] = (d[k] || 0) + v;
  }

  // ======================================================== modo manual (cliques do dono)
  // devolve true se o clique fez alguma coisa
  click(obj, member) {
    const s = this.state;
    const g = member ? this.groups.find((x) => x.members.includes(member)) : null;
    if (g) {
      if (g.state === 'waitSeat' && !g.claim) {
        if (!this.sendToTable(g)) this.game.toast('Nenhuma mesa livre e limpa para esse grupo.');
        return true;
      }
      if (g.state === 'waitOrder' && !g.claim) { this.placeOrders(g); this.game.toast('📝 Pedido anotado!'); return true; }
      if (g.state === 'waitBill' && !g.claim) { this.pay(g, 'player'); return true; }
      if (g.state === 'waitFood') { this.game.toast('Esse grupo está esperando a comida.'); return true; }
    }
    if (!obj) {
      return false;
    }
    const kind = kindOf(obj);
    if (kind === 'stove') return this.clickStove(obj);
    if (kind === 'counter') {
      const plate = (obj.data._plates || [])[0];
      if (plate) { obj.data._plates.shift(); this.serveMember(plate); this.game.toast(`${plate.recipe.icon} Prato entregue na mesa!`); return true; }
      this.game.toast('Passe vazio: os pratos prontos aparecem aqui.');
      return true;
    }
    if (kind === 'register') {
      const gb = this.groups.find((x) => x.state === 'waitBill' && !x.claim && (x.atRegister || !this.register()));
      if (gb) { this.pay(gb, 'player'); return true; }
      this.game.toast('Ninguém esperando para pagar.');
      return true;
    }
    if (kind === 'table') {
      if (obj.data._dirty && !obj.data._clearBy) { obj.data._dirty = false; s.month.water += COSTS.waterPerClean; this.game.toast('🧽 Mesa limpa!'); return true; }
      const tg = obj.data._group;
      if (tg) return this.click(null, tg.members[0]);
    }
    if (isSeat(obj)) {
      const sg = this.groups.find((x) => x.members.some((m) => m.seat === obj && m.sitting));
      if (sg) return this.click(null, sg.members.find((m) => m.seat === obj));
    }
    return false;
  }
  clickStove(stove) {
    const d = stove.data;
    if (d._order && d._done && (d._by === 'player' || !this.agents.has(d._by?.emp?.id))) {
      const o = d._order;
      this.clearStove(stove);
      this.serveMember(o);
      this.game.toast(`${o.recipe.icon} ${o.recipe.name} servido!`);
      return true;
    }
    if (d._order) {
      const left = Math.max(0, d._dur - (this.game.t - (d._start || this.game.t)));
      this.game.toast(`${d._order.recipe.icon} ${d._order.recipe.name}: falta ${Math.ceil(left / 60)} min`);
      return true;
    }
    const order = this.orders.find((o) => o.status === 'queued');
    if (!order) { this.game.toast('Nenhum pedido esperando na cozinha.'); return true; }
    order.status = 'cooking'; order.by = 'player'; order.stove = stove;
    d._order = order;
    this.startCook(stove, order, 'player');
    this.game.toast(`🍳 Você começou: ${order.recipe.name}`);
    return true;
  }

  // dicas visuais de onde o dono pode clicar
  manualHints() {
    const hints = [];
    for (const g of this.groups) {
      if (g.claim) continue;
      if (g.state === 'waitSeat') hints.push({ kind: 'seat', g });
      if (g.state === 'waitOrder') hints.push({ kind: 'order', g });
      if (g.state === 'waitBill' && (g.atRegister || !this.register())) hints.push({ kind: 'bill', g });
    }
    return hints;
  }
}

function nearestFree(state, from) {
  const n = roomSize(state);
  for (let r = 0; r < n; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
    const x = from.x + dx, y = from.y + dy;
    if (x >= 0 && y >= 0 && x < n && y < n && walkable(state, x, y)) return { x, y };
  }
  return { x: 1, y: 1 };
}
