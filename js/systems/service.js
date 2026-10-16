// O atendimento ao vivo: clientes em grupo, equipe trabalhando sozinha, conversas,
// louça e limpeza. Quando falta alguém para uma função (ou no feriado), quem faz é você, clicando.
import { Character, randomLook, staffLook } from './characters.js';
import { outsideOf, exitOf, accessTiles, walkable } from '../engine/pathfinding.js';
import { objectsOfKind, objectAt, kindOf, isSeat, charm, hygiene, inRoom, roomSize, doorOf } from '../core/state.js';
import { itemById } from '../config/items.js';
import { RECIPES, CUISINES, DRINKS, DIETS, fitsDiet } from '../config/recipes.js';
import { CUSTOMER_TYPES, pickType, CRITIC_CHANCE, CRITIC_WEIGHT, DIET_CHANCE, REGULAR, regularName } from '../config/customers.js';
import { LEVELS } from '../config/staff.js';
import { PATIENCE, EAT_MIN, COSTS, HAND_WASH_SECS, BREAK_CHANCE } from '../config/economy.js';
import { LINES, pickLine, TYPE_LINES, REGULAR_LINES, DIET_LINES, DRINK_LINES } from '../config/dialogue.js';
import { staffOnDuty } from './schedule.js';

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const brl = (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const lower1 = (s) => s.charAt(0).toLowerCase() + s.slice(1);

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
    this.drinkOrders = [];
    this.agents = new Map(); // id do funcionário -> agente
    this.spawnT = 6;
    this.dirtT = 30;
    this.fx = [];
    this.timeline = [];   // falas agendadas
    this.platesOut = 0;   // pratos fora da pilha limpa/suja (em uso, na máquina, sendo levados)
    this.lastSaid = {};
  }
  get state() { return this.game.state; }
  get t() { return this.game.t; }

  // ======================================================== falas
  say(ch, text, delay = 0) {
    if (!ch || !text) return;
    if (delay <= 0) ch.say(text, this.t);
    else this.timeline.push({ at: this.t + delay, ch, text });
  }
  line(ch, key, ...args) {
    const L = LINES[key];
    this.say(ch, pickLine(typeof L === 'function' ? L(...args) : L));
  }
  // evita repetir a mesma fala toda hora
  throttled(key, secs) {
    if (this.lastSaid[key] && this.t - this.lastSaid[key] < secs) return false;
    this.lastSaid[key] = this.t;
    return true;
  }
  tableNo(t) { return objectsOfKind(this.state, 'table').indexOf(t) + 1; }

  // ======================================================== louça
  get dishes() { return this.state.dishes; }
  takePlate() {
    if (this.dishes.clean <= 0) return false;
    this.dishes.clean--; this.platesOut++;
    return true;
  }
  toDirty(n) { this.dishes.dirty += n; this.platesOut = Math.max(0, this.platesOut - n); }
  sink() { return objectsOfKind(this.state, 'sink')[0] || null; }
  machines() { return objectsOfKind(this.state, 'dishwasher'); }

  // ======================================================== ciclo
  update(dt, st) {
    this.st = st;
    this.syncStaff(st);
    if (st.open) this.spawn(dt, st);
    if (st.open) this.spawnDirt(dt);
    for (const g of [...this.groups]) this.updateGroup(g, dt);
    for (const a of this.agents.values()) this.think(a, dt);
    for (const a of [...this.agents.values()]) a.ch.update(dt);
    for (const g of this.groups) for (const m of g.members) m.ch.update(dt);
    this.updateStoves(dt);
    this.updateMachines();
    if (this.timeline.length) {
      const due = this.timeline.filter((x) => x.at <= this.t);
      this.timeline = this.timeline.filter((x) => x.at > this.t);
      for (const x of due) x.ch.say(x.text, this.t);
    }
    this.fx = this.fx.filter((f) => (f.life -= dt) > 0);
    const tables = objectsOfKind(this.state, 'table');
    this.state._dirtyTables = tables.filter((t) => t.data._dirty).length;
    this.state._stains = tables.filter((t) => t.data._stain).length;
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
    ch.speed = 3 * emp.speed;
    const a = { emp, ch, busy: false, wait: 0, after: null, L, idleT: 0 };
    this.agents.set(emp.id, a);
    const out = outsideOf(this.state);
    ch.walkStraight([{ x: out.x, y: out.y }], () => this.goPost(a));
  }
  removeAgent(a) {
    a.leaving = true;
    this.release(a);
    a.busy = true; a.wait = 0; a.after = null; a.ch.carry = null; a.ch.tool = null;
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
    } else if (role === 'lavador') {
      const k = this.sink() || this.machines()[0];
      if (k) target = accessTiles(s, k.x, k.y)[0];
    } else if (role === 'zelador') {
      const n = roomSize(s);
      target = { x: n - 1, y: n - 2 };
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
      if (o.status === 'delivering' || o.status === 'carrying') {
        o.status = 'ready';
        const p = objectsOfKind(this.state, 'counter')[0];
        if (p) (p.data._plates = p.data._plates || []).push(o);
      }
      o.by = null;
    }
    for (const t of objectsOfKind(this.state, 'table')) { if (t.data._clearBy === a) t.data._clearBy = null; if (t.data._wipeBy === a) t.data._wipeBy = null; }
    for (const d of this.state.dirt) if (d._by === a) d._by = null;
    if (a.carryDirty) { this.toDirty(a.carryDirty); a.carryDirty = 0; }
    for (const d of this.drinkOrders) if (d.by === a && d.status === 'making') { d.status = 'queued'; d.by = null; }
    const br = this.bar(); if (br && br.data._by === a) { br.data._by = null; br.data._busy = false; }
    const sk = this.sink(); if (sk && sk.data._by === a) { sk.data._by = null; sk.data._washing = false; }
    for (const m of this.machines()) if (m.data._by === a) m.data._by = null;
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
      || (r === 'caixa' && this.cashierWork(a))
      || (r === 'lavador' && this.washerWork(a))
      || (r === 'zelador' && this.janitorWork(a));
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
      if (this.dishes.clean <= 0) {
        if (this.throttled('noPlates', 12)) this.line(a.ch, 'cookNoPlates');
        a.busy = true; this.doFor(a, 2, () => { a.busy = false; });
        return true;
      }
      a.busy = true;
      const plate = () => this.doFor(a, 1, () => {
        const order = done.data._order;
        a.active.delete(done);
        this.clearStove(done);
        if (!order) { a.busy = false; return; }
        if (!this.takePlate()) { // a louça acabou no caminho: devolve ao fogão
          done.data._order = order; done.data._done = true; done.data._start = this.t; a.active.add(done); a.busy = false; return;
        }
        order.stove = null; order.plated = true;
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
    const go = () => this.doFor(a, 0.8, () => {
      this.startCook(stove, order, a);
      if (Math.random() < 0.35) this.line(a.ch, 'cookStart', lower1(order.recipe.name));
      a.busy = false;
    });
    if (!a.ch.goToObject(this.state, stove, go)) go();
    return true;
  }
  startCook(stove, order, cook) {
    const it = itemById(stove.item);
    const speed = (cook === 'player' ? 1 : cook.emp.speed) * (it.speed || 1);
    stove.data._start = this.t;
    stove.data._dur = order.recipe.secs / speed;
    stove.data._by = cook;
    stove.data._juggling = cook !== 'player' && cook.active && cook.active.size > 1;
  }
  updateStoves() {
    for (const s of objectsOfKind(this.state, 'stove')) {
      const d = s.data;
      if (!d._order || d._start == null || d._done) continue;
      if (this.t - d._start >= d._dur) this.finishCook(s);
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
      if (cook !== 'player') this.line(cook.ch, 'cookBurn');
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
    if (!passe) { this.doFor(cook, 2, () => this.carryToPasse(cook, order)); return; }
    cook.ch.carry = order.recipe.icon;
    order.status = 'carrying'; order.by = cook;
    const put = () => this.doFor(cook, 0.6, () => {
      const pl = (passe.data._plates = passe.data._plates || []);
      if (pl.length >= 4) { this.carryToPasse(cook, order); return; }
      pl.push(order); order.status = 'ready'; order.by = null;
      cook.ch.carry = null; cook.busy = false;
      if (this.groups.includes(order.group) && this.throttled('ready' + order.group.id, 6)) this.line(cook.ch, 'cookReady', this.tableNo(order.group.table));
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
    // 2b. preparar e levar bebidas
    const dq = this.drinkOrders.find((d) => d.status === 'queued');
    if (dq && this.bar() && !this.bar().data._by) { this.makeDrinks(a, dq.group); return true; }
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
    // 5. recolher a louça das mesas
    const t = objectsOfKind(this.state, 'table').find((x) => x.data._dirty && !x.data._clearBy && !x.data._group);
    if (t) { this.clearTable(a, t); return true; }
    // 6. passar nas mesas perguntando se está tudo bem
    const gc = this.groups.find((g) => g.state === 'waitFood' && !g.checked && g.members.every((m) => m.plate || m.failed) && g.members.some((m) => m.plate && !m.done));
    if (gc && Math.random() < 0.5) { this.checkTable(a, gc); return true; }
    // 7. sem lavador e quase sem prato limpo: lava um pouco (devagar)
    if (!this.onDuty('lavador').length && this.dishes.dirty > 0 && this.dishes.clean < 6 && this.sink()) { this.handWash(a, 2, 1.6); return true; }
    return false;
  }
  deliver(a, passe, order) {
    order.status = 'delivering'; order.by = a; a.busy = true;
    const pickUp = () => this.doFor(a, 0.8, () => {
      a.ch.carry = order.recipe.icon;
      const g = order.group;
      const mem = g.members[order.mi];
      const give = () => this.doFor(a, 1.2, () => {
        a.ch.carry = null; a.busy = false;
        this.line(a.ch, 'waiterServe', order.recipe.name);
        this.say(mem.ch, pickLine(LINES.custThanks), 1.2);
        this.serveMember(order);
      });
      if (!this.groups.includes(g) || !mem.seat || g.state === 'leaving') {
        // o cliente foi embora: o prato volta sujo
        a.ch.carry = null; a.busy = false; order.status = 'done'; this.toDirty(1); return;
      }
      if (!a.ch.goToObject(this.state, mem.seat, give)) give();
    });
    if (!a.ch.goToObject(this.state, passe, pickUp)) pickUp();
  }
  serveMember(order) {
    order.status = 'done';
    const g = order.group;
    if (!this.groups.includes(g) || g.state === 'leaving') { this.toDirty(1); return; }
    const mem = g.members[order.mi];
    mem.plate = { recipe: order.recipe, q: order.q };
    mem.eatLeft = rand(EAT_MIN[0], EAT_MIN[1]) * 60;
    mem.commentAt = this.t + rand(8, 20);
    this.state.month.water += COSTS.waterPerDish;
    this.state.month.dishes++;
  }
  takeOrder(a, g) {
    g.claim = a; a.busy = true;
    const write = () => {
      this.line(a.ch, 'waiterTake');
      // cada um escolhe o seu prato (e a bebida) e fala
      const choices = g.members.map((m) => this.chooseDish(g, m));
      const drinks = g.members.map((m) => this.chooseDrink(g, m));
      let delay = 1.5;
      g.members.forEach((m, i) => {
        const r = choices[i];
        if (m.diet) { this.say(m.ch, DIET_LINES.ask[m.diet], delay); delay += 1.3; }
        let text;
        if (!r) text = m.diet ? DIET_LINES.none[m.diet] : pickLine(LINES.custOrderNone);
        else if (m.regular && r.id === m.regular.fav) text = pickLine(REGULAR_LINES.order);
        else if (m.kid) text = `Eu quero ${lower1(r.name)}!`;
        else text = pickLine(LINES.custOrder(lower1(r.name)));
        this.say(m.ch, text, delay); delay += 1.3;
        if (m.regular && r && r.id === m.regular.fav) { this.say(a.ch, pickLine(REGULAR_LINES.waiterKnows(lower1(r.name))), delay); delay += 1.3; }
        if (drinks[i]) { this.say(m.ch, m.kid ? pickLine(DRINK_LINES.kid) : pickLine(DRINK_LINES.order(lower1(drinks[i].name))), delay); delay += 1.1; }
      });
      this.say(a.ch, pickLine(LINES.waiterOk), delay);
      this.doFor(a, (delay + 0.8) / a.emp.speed, () => { this.placeOrders(g, choices, drinks); g.claim = null; a.busy = false; });
    };
    if (!a.ch.goToObject(this.state, g.table, write)) write();
  }
  checkTable(a, g) {
    g.checked = true; a.busy = true;
    const ask = () => {
      this.line(a.ch, 'waiterCheck');
      const plates = g.members.filter((m) => m.plate);
      const q = plates.reduce((s, m) => s + m.plate.q, 0) / Math.max(1, plates.length);
      this.say(pick(plates).ch, pickLine(q >= 3 ? LINES.custCheckOk : LINES.custCheckBad), 1.6);
      this.doFor(a, 3, () => { a.busy = false; });
    };
    if (!a.ch.goToObject(this.state, g.table, ask)) ask();
  }
  clearTable(a, t) {
    t.data._clearBy = a; a.busy = true;
    const n = t.data._dirtyN || 0;
    const collect = () => this.doFor(a, 3 / a.emp.speed, () => {
      t.data._dirty = false; t.data._dirtyN = 0; t.data._clearBy = null;
      if (!n) { a.busy = false; return; }
      a.ch.carry = '🍽️'; a.carryDirty = n;
      const drop = () => this.doFor(a, 1, () => {
        a.ch.carry = null; this.toDirty(a.carryDirty); a.carryDirty = 0; a.busy = false;
      });
      const sk = this.sink() || this.machines()[0];
      if (!sk || !a.ch.goToObject(this.state, sk, drop)) drop();
    });
    if (!a.ch.goToObject(this.state, t, collect)) collect();
  }

  // ---------- recepcionista ----------
  hostWork(a) {
    const g = this.groups.find((x) => x.state === 'waitSeat' && !x.claim && this.findTable(x.size));
    if (g) { this.seatGroup(a, g); return true; }
    // restaurante lotado: avisa quem está esperando
    const full = this.groups.find((x) => x.state === 'waitSeat' && !x.toldFull && !x.claim);
    if (full) {
      full.toldFull = true;
      this.line(a.ch, 'hostFull');
      this.say(full.members[0].ch, pickLine(LINES.custWaitOk), 2.2);
      full.wait = Math.max(0, full.wait - 40); // ser bem atendido dá mais paciência
    }
    return false;
  }
  seatGroup(a, g) {
    g.claim = a; a.busy = true;
    const greet = () => {
      const lead = g.members[0];
      if (lead.regular) {
        this.say(a.ch, pickLine(REGULAR_LINES.hostHello(lead.regular.name)));
        this.say(lead.ch, pickLine(REGULAR_LINES.custHello), 1.5);
      } else {
        this.line(a.ch, 'hostWelcome', this.st.l.hour);
        const tl = TYPE_LINES[g.type];
        this.say(lead.ch, tl && Math.random() < 0.5 ? pickLine(tl.arrive) : pickLine(LINES.custParty(g.size)), 1.5);
      }
      this.say(a.ch, pickLine(LINES.hostFollow), 3);
      this.doFor(a, 3.4 / a.emp.speed, () => {
        a.busy = false; g.claim = null;
        if (!this.sendToTable(g)) return;
        if (a.emp.role === 'recepcionista') this.goPost(a);
      });
    };
    const d = doorOf(this.state);
    if (!a.ch.goTo(this.state, d.x, d.y - 1, greet)) greet();
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
    const target = this.register() && g.atRegister ? this.register() : g.table;
    const work = () => {
      const secs = this.billTalk(a.ch, g) + (isCashier ? 0.5 : 2.5) / a.emp.speed;
      this.doFor(a, secs, () => { a.busy = false; g.claim = null; this.pay(g, a); if (!isCashier) this.goPost(a); });
    };
    if (isCashier && this.register()) { work(); return; }
    if (!a.ch.goToObject(this.state, target, work)) work();
  }
  // conversa na hora de pagar; devolve quanto tempo ela dura
  billTalk(staffCh, g) {
    const total = this.billTotal(g);
    const sat = this.satisfaction(g);
    g._sat = sat;
    const payer = g.members.find((m) => m.paying) || g.members[0];
    if (staffCh) this.say(staffCh, pickLine(LINES.cashierTotal(brl(total))));
    this.say(payer.ch, pickLine(sat.score >= 4.3 ? LINES.custTip : LINES.custPay), 1.8);
    if (staffCh) this.say(staffCh, pickLine(LINES.cashierBye), 3.6);
    return 4.4;
  }

  // ---------- lavador ----------
  washerWork(a) {
    const d = this.dishes;
    // 1. descarregar máquina que terminou
    const doneM = this.machines().find((m) => m.data._load && m.data._end <= this.t && !m.data._by);
    if (doneM) {
      doneM.data._by = a; a.busy = true;
      const unload = () => this.doFor(a, 2.5, () => {
        const n = doneM.data._load || 0;
        d.clean += n; this.platesOut = Math.max(0, this.platesOut - n);
        doneM.data._load = 0; doneM.data._end = 0; doneM.data._by = null;
        a.busy = false;
        if (n && this.throttled('washDone', 20)) this.line(a.ch, 'washerDone');
      });
      if (!a.ch.goToObject(this.state, doneM, unload)) unload();
      return true;
    }
    if (d.dirty <= 0) return false;
    // 2. carregar máquina livre
    const freeM = this.machines().find((m) => !m.data._load && !m.data._by);
    // com máquina, o lavador junta louça para uma leva (ou liga logo se os limpos estão acabando)
    if (freeM && d.dirty < 6 && d.clean >= 8) return false;
    if (freeM) {
      freeM.data._by = a; a.busy = true;
      const load = () => {
        const cap = itemById(freeM.item).capacity;
        const n = Math.min(cap, d.dirty);
        this.doFor(a, (1.5 + n * 0.12) / a.emp.speed, () => {
          const k = Math.min(n, d.dirty);
          d.dirty -= k; this.platesOut += k;
          freeM.data._load = k; freeM.data._end = this.t + itemById(freeM.item).cycle; freeM.data._by = null;
          const m = this.state.month;
          m.energy += COSTS.dishwasherKwh * COSTS.energyPrice; m.kwh += COSTS.dishwasherKwh; m.water += COSTS.dishwasherWater;
          a.busy = false;
          if (this.throttled('machine', 30)) this.line(a.ch, 'washerMachine');
        });
      };
      if (!a.ch.goToObject(this.state, freeM, load)) load();
      return true;
    }
    // 3. lavar à mão na pia
    if (this.sink()) { this.handWash(a, 4, 1); return true; }
    return false;
  }
  handWash(a, batch, slow) {
    const sk = this.sink();
    if (!sk || sk.data._by) return;
    sk.data._by = a; a.busy = true;
    const wash = () => {
      const n = Math.min(batch, this.dishes.dirty);
      if (n <= 0) { sk.data._by = null; a.busy = false; return; }
      this.dishes.dirty -= n; this.platesOut += n;
      sk.data._washing = true;
      if (this.dishes.dirty > 15 && a.emp.role === 'lavador' && this.throttled('pile', 40)) this.line(a.ch, 'washerPile');
      this.doFor(a, (n * HAND_WASH_SECS * slow) / a.emp.speed, () => {
        let ok = n;
        const br = (BREAK_CHANCE[a.emp.level] || 0.02) * (slow > 1 ? 2 : 1);
        for (let i = 0; i < n; i++) if (Math.random() < br) { ok--; this.dishes.broken = (this.dishes.broken || 0) + 1; this.line(a.ch, 'washerBreak'); }
        this.dishes.clean += ok; this.platesOut = Math.max(0, this.platesOut - n);
        this.state.month.water += n * 0.05;
        sk.data._washing = false; sk.data._by = null; a.busy = false;
      });
    };
    if (!a.ch.goToObject(this.state, sk, wash)) wash();
  }
  updateMachines() {
    for (const m of this.machines()) if (m.data._load && m.data._end && m.data._end <= this.t && !m.data._doneFx) {
      m.data._doneFx = true;
      this.game.floatText('✨ Louça limpa', m, '#bfe3f2');
    } else if (!m.data._load) m.data._doneFx = false;
  }

  // ---------- zelador ----------
  janitorWork(a) {
    const s = this.state;
    // 1. sujeira no chão (a mais perto primeiro)
    const free = s.dirt.filter((d) => !d._by);
    if (free.length) {
      free.sort((p, q) => Math.hypot(p.x - a.ch.x, p.y - a.ch.y) - Math.hypot(q.x - a.ch.x, q.y - a.ch.y));
      const d = free[0];
      d._by = a; a.busy = true;
      const clean = () => {
        a.ch.tool = '🧹';
        if (Math.random() < 0.35 && this.throttled('janitor', 15)) this.line(a.ch, 'janitorClean');
        this.doFor(a, 4.5 / a.emp.speed, () => { this.removeDirt(d); a.ch.tool = null; a.busy = false; });
      };
      const ok = walkable(s, d.x, d.y) ? a.ch.goTo(s, d.x, d.y, clean) : a.ch.goToObject(s, d, clean);
      if (!ok) clean();
      return true;
    }
    // 2. mancha nas mesas vazias
    const t = objectsOfKind(s, 'table').find((x) => x.data._stain && !x.data._group && !x.data._wipeBy);
    if (t) {
      t.data._wipeBy = a; a.busy = true;
      const wipe = () => {
        a.ch.tool = '🧽';
        this.doFor(a, 3.5 / a.emp.speed, () => { t.data._stain = false; t.data._wipeBy = null; a.ch.tool = null; a.busy = false; s.month.water += COSTS.waterPerClean; });
      };
      if (!a.ch.goToObject(s, t, wipe)) wipe();
      return true;
    }
    return false;
  }
  removeDirt(d) {
    this.state.dirt = this.state.dirt.filter((x) => x !== d);
    this.state.month.water += COSTS.waterPerClean;
  }
  // sujeira aleatória: bebida derramada, migalhas, mancha na mesa, sujeira de sapato na entrada
  spawnDirt(dt) {
    this.dirtT -= dt;
    if (this.dirtT > 0) return;
    const eating = this.groups.filter((g) => g.state === 'waitFood' || g.state === 'waitOrder');
    const busy = this.groups.length;
    this.dirtT = rand(60, 150) / (1 + busy * 0.1);
    if (this.state.dirt.length >= 14) return;
    const roll = Math.random();
    if (eating.length && roll < 0.75) {
      const g = pick(eating);
      const m = pick(g.members.filter((x) => x.sitting) || g.members);
      if (!m || !m.seat) return;
      if (roll < 0.3 && g.table) { g.table.data._stain = true; this.line(m.ch, 'crumbs'); }
      else if (roll < 0.55) { if (this.addDirt(m.seat.x, m.seat.y, 1)) this.line(m.ch, 'spill'); }
      else this.addDirt(m.seat.x, m.seat.y, 2);
    } else {
      const d = doorOf(this.state);
      this.addDirt(d.x + Math.floor(rand(-1, 2)), d.y - Math.floor(rand(0, 3)), 0);
    }
  }
  addDirt(x, y, k = 0) {
    const s = this.state;
    for (const [dx, dy] of [[0, 0], ...DIRS, [1, 1], [-1, -1]]) {
      const tx = x + dx, ty = y + dy;
      if (inRoom(s, tx, ty) && walkable(s, tx, ty) && !s.dirt.some((d) => d.x === tx && d.y === ty)) {
        s.dirt.push({ x: tx, y: ty, k });
        return true;
      }
    }
    return false;
  }

  // ======================================================== clientes
  arrivalRate(st) {
    // grupos por hora
    const h = st.l.minutes / 60;
    let f = 0.45;
    if (h >= 12 && h < 14) f = 1; else if (h >= 11 && h < 15) f = 0.65;
    if (h >= 19 && h < 21.5) f = 1; else if (h >= 18 && h < 23) f = 0.7;
    const wd = st.l.weekday;
    const day = wd === 5 || wd === 6 ? 1.3 : wd === 0 ? 1.15 : 1;
    const rep = Math.pow(this.state.rep / 3, 1.5);
    const beauty = 1 + Math.min(1, charm(this.state) / 50);
    const menuN = this.availableRecipes().length;
    const menu = Math.min(1, menuN / 5);
    return 24 * f * day * rep * beauty * menu;
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
    // quem chegou: um cliente fiel voltando, o crítico disfarçado ou um tipo sorteado
    const s = this.state;
    const present = new Set(this.groups.flatMap((g) => g.members.map((m) => m.regular?.id)).filter(Boolean));
    const regs = (s.regulars || []).filter((r) => !present.has(r.id) && Date.now() - (r.last || 0) > 20 * 60000);
    let regular = null, critic = false, type;
    if (regs.length && Math.random() < REGULAR.returnChance) { regular = pick(regs); type = regular.type || 'comum'; }
    else if (Math.random() < CRITIC_CHANCE) { critic = true; type = 'comum'; }
    else type = pickType();
    const T = CUSTOMER_TYPES[type];
    const size = critic ? 1 : pick(T.sizes);
    // restaurante lotado: a maioria passa reto e procura outro lugar
    if (!this.findTable(size) && Math.random() < 0.6) return;
    const free = this.freeSlots();
    if (free.length < size || this.groups.filter((g) => g.state === 'waitSeat' || g.state === 'arriving').length >= 3) return;
    const prefs = Object.keys(CUISINES);
    const g = {
      id: ++gid, size, pref: T.loves || pick(prefs), type, critic, state: 'arriving', wait: 0, waits: { door: 0, order: 0, food: 0, bill: 0 },
      members: [], table: null, claim: null, atRegister: false, nagged: {}, pm: T.patience + (regular ? 0.2 : 0), arrivedAt: this.t,
    };
    for (let i = 0; i < size; i++) {
      const d0 = doorOf(this.state);
      const kid = !!T.kids && i >= 2;
      let look = randomLook();
      if (i === 0 && regular) look = { ...regular.look };
      else if (T.look && !kid) look = { ...look, ...T.look };
      const ch = new Character(d0.x + (i % 2 ? 0.4 : -0.4), d0.y + 8 + i * 0.5, look);
      ch.alpha = 0; ch.speed = kid ? 2.9 : 2.6;
      const slot = free[i];
      let diet = null;
      if (!kid && !(i === 0 && regular)) for (const [k, c] of Object.entries(DIET_CHANCE)) if (!diet && Math.random() < c) diet = k;
      const m = { ch, slot, seat: null, plate: null, eatLeft: 0, done: false, failed: false, kid, diet, regular: i === 0 ? regular : null };
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
        if (++arrived === g.size) {
          g.state = 'waitOrder'; g.wait = 0;
          if (Math.random() < 0.5) this.line(g.members[0].ch, 'custSeated');
        }
      };
      if (!m.ch.goTo(this.state, m.seat.x, m.seat.y, sit)) sit();
    });
    return true;
  }
  // reclamação quando passa da metade da paciência (uma vez por etapa)
  nag(g, stage, key, ratio) {
    if (g.nagged[stage] || ratio < 0.55) return;
    g.nagged[stage] = true;
    const who = pick(g.members).ch;
    if (key) this.line(who, key);
    else this.say(who, pickLine(TYPE_LINES[g.type].late));
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
      this.nag(g, 'door', 'custDoorImpatient', g.wait / (PATIENCE.door * 60 * g.pm));
      if (g.wait > PATIENCE.door * 60 * g.pm && !g.claim) this.walkOut(g, 'Cansaram de esperar na porta', 'custGiveUpDoor');
    } else if (g.state === 'waitOrder') {
      g.waits.order = g.wait;
      if (g.wait > 12 && !g.called) { g.called = true; this.line(g.members[0].ch, 'custCallWaiter'); }
      if (g.wait > PATIENCE.order * 60 * g.pm && !g.claim) this.walkOut(g, 'Ninguém veio anotar o pedido', 'custGiveUpOrder');
    } else if (g.state === 'waitFood') {
      g.waits.food = g.wait;
      let all = true;
      const anyServed = g.members.some((m) => m.plate);
      if (!anyServed) this.nag(g, 'food', TYPE_LINES[g.type] && Math.random() < 0.5 ? null : 'custFoodLate', g.wait / (PATIENCE.food * 60 * g.pm));
      for (const m of g.members) {
        if (m.plate && !m.done) {
          m.eatLeft -= dt;
          if (m.commentAt && this.t >= m.commentAt) { m.commentAt = 0; this.eatComment(g, m); }
          if (m.eatLeft <= 0) m.done = true;
        }
        if (!m.done && !m.failed) all = false;
      }
      if (all) {
        if (g.members.some((m) => m.done)) this.askBill(g);
        else this.walkOut(g, 'Não conseguiram pedir nada', 'custGiveUpOrder');
      } else if (!anyServed && g.wait > PATIENCE.food * 60 * g.pm) this.walkOut(g, 'A comida demorou demais', 'custGiveUpFood');
    } else if (g.state === 'waitBill') {
      g.waits.bill = g.wait;
      this.nag(g, 'bill', 'custBillLate', g.wait / (PATIENCE.bill * 60 * g.pm));
    }
  }
  eatComment(g, m) {
    const s = this.state;
    const tl = TYPE_LINES[g.type];
    if (m.kid && Math.random() < 0.5) { this.say(m.ch, pick(['Hmm, gostoso!', 'Não quero mais!', 'Posso sobremesa?', 'Tô cheio!'])); return; }
    if (tl && Math.random() < 0.3) { this.say(m.ch, pickLine(tl.eat)); return; }
    if (m.regular && Math.random() < 0.4) { this.say(m.ch, 'Como sempre, perfeito!'); return; }
    const roll = Math.random();
    if (roll < 0.6) {
      const q = m.plate.q;
      this.line(m.ch, q >= 4 ? 'eatGreat' : q >= 2.8 ? 'eatOk' : 'eatBad');
    } else if (roll < 0.75 && charm(s) >= 12) this.line(m.ch, 'chatPretty');
    else if (roll < 0.85 && hygiene(s) < 75) this.line(m.ch, 'chatDirty');
    else if (g.size > 1) this.line(m.ch, 'chatSmall');
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
  chooseDish(g, m) {
    const avail = this.availableRecipes().filter((r) => fitsDiet(r, m?.diet));
    if (!avail.length) return null;
    if (m?.regular) { const fav = avail.find((r) => r.id === m.regular.fav); if (fav) return fav; }
    const T = CUSTOMER_TYPES[g.type] || CUSTOMER_TYPES.comum;
    const w = avail.map((r) => {
      const price = this.state.menu[r.id].price;
      let x = Math.pow(r.price / price, 2 * T.priceSens);
      if (T.priceSens > 1) x *= Math.pow(40 / price, T.priceSens - 1); // quem tem pouco dinheiro prefere o barato
      if (r.cuisine === g.pref) x *= 3;
      if (m?.kid && (r.cuisine === 'lanches' || r.id === 'macarrao' || r.id === 'pizza')) x *= 4;
      return x;
    });
    let s = w.reduce((a, b) => a + b, 0) * Math.random();
    for (let i = 0; i < avail.length; i++) { s -= w[i]; if (s <= 0) return avail[i]; }
    return avail[avail.length - 1];
  }
  // bebidas disponíveis (precisa do bar)
  bar() { return objectsOfKind(this.state, 'bar')[0] || null; }
  availableDrinks() {
    if (!this.bar()) return [];
    return DRINKS.filter((d) => this.state.drinks[d.id]?.on && this.hasStock(d));
  }
  chooseDrink(g, m) {
    const T = CUSTOMER_TYPES[g.type] || CUSTOMER_TYPES.comum;
    if (Math.random() > T.drink) return null;
    let list = this.availableDrinks();
    if (m.kid) list = list.filter((d) => !d.alcohol);
    if (!list.length) return null;
    const w = list.map((d) => {
      let x = Math.pow(d.price / this.state.drinks[d.id].price, 2 * T.priceSens);
      if (T.drinks.includes(d.id)) x *= 3;
      if (m.kid && (d.id === 'suco' || d.id === 'refri')) x *= 4;
      return x;
    });
    let r = w.reduce((a, b) => a + b, 0) * Math.random();
    for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i]; }
    return list[list.length - 1];
  }
  makeDrinks(a, g) {
    const bar = this.bar();
    const batch = this.drinkOrders.filter((d) => d.group === g && d.status === 'queued').slice(0, 4);
    if (!batch.length) return;
    for (const d of batch) { d.status = 'making'; d.by = a; }
    bar.data._by = a; a.busy = true;
    const prep = () => {
      bar.data._busy = true;
      const secs = batch.reduce((x, d) => x + d.drink.secs, 0) * 0.8 / a.emp.speed + 1;
      this.doFor(a, secs, () => {
        bar.data._busy = false; bar.data._by = null;
        a.ch.carry = batch[0].drink.icon;
        const give = () => this.doFor(a, 1, () => {
          a.ch.carry = null; a.busy = false;
          if (!this.groups.includes(g) || g.state === 'leaving') { for (const d of batch) d.status = 'done'; return; }
          for (const d of batch) { d.status = 'done'; const mm = g.members[d.mi]; if (mm) mm.drink = d.drink; }
          this.say(a.ch, pickLine(DRINK_LINES.serve));
          this.say(g.members[batch[0].mi].ch, pickLine(DRINK_LINES.thanks), 1.2);
        });
        if (!this.groups.includes(g) || !g.table || !a.ch.goToObject(this.state, g.table, give)) give();
      });
    };
    if (!a.ch.goToObject(this.state, bar, prep)) prep();
  }

  placeOrders(g, choices, drinks) {
    if (!this.groups.includes(g) || g.state === 'leaving') return;
    g.members.forEach((m, i) => {
      const dk = drinks && drinks[i];
      if (dk && this.consume(dk)) {
        m.drinkWanted = dk; m.drinkPrice = this.state.drinks[dk.id].price;
        this.drinkOrders.push({ group: g, mi: i, drink: dk, status: 'queued', by: null });
      }
    });
    g.members.forEach((m, i) => {
      let r = choices ? choices[i] : this.chooseDish(g, m);
      if (r && !this.hasStock(r)) r = this.chooseDish(g, m);
      if (!r || !this.consume(r)) { m.failed = true; return; }
      m.recipe = r;
      m.price = this.state.menu[r.id].price;
      this.orders.push({ id: g.id + '-' + i, group: g, mi: i, recipe: r, status: 'queued', by: null, stove: null, q: null });
    });
    g.state = 'waitFood'; g.wait = 0;
    if (g.members.every((m) => m.failed)) this.walkOut(g, 'O cardápio estava sem nada disponível', 'custGiveUpOrder');
  }
  failMember(order) {
    order.status = 'done';
    const m = order.group.members[order.mi];
    if (m) m.failed = true;
  }
  askBill(g) {
    g.state = 'waitBill'; g.wait = 0;
    const payer = g.members.find((m) => m.done) || g.members[0];
    this.line(payer.ch, 'custBill');
    const reg = this.register();
    if (!reg) return;
    const caixaPost = this.onDuty('caixa')[0] ? this.postOf(this.onDuty('caixa')[0]) : null;
    const spot = accessTiles(this.state, reg.x, reg.y).find((t) => !caixaPost || t.x !== caixaPost.x || t.y !== caixaPost.y);
    if (!spot) return;
    payer.sitting = false; payer.paying = true;
    if (!payer.ch.goTo(this.state, spot.x, spot.y, () => { g.atRegister = true; })) g.atRegister = true;
  }
  satisfaction(g) {
    const s = this.state;
    let score = 5;
    const reasons = [];
    const r = (w, p) => Math.min(1.5, w / (p * 60));
    const door = r(g.waits.door, PATIENCE.door), order = r(g.waits.order, PATIENCE.order), food = r(g.waits.food, PATIENCE.food), bill = r(g.waits.bill, PATIENCE.bill);
    const T = CUSTOMER_TYPES[g.type] || CUSTOMER_TYPES.comum;
    score -= (door * 1.0 + order * 1.0 + food * 1.6 + bill * 0.8) * (T.waitMult || 1);
    if (T.waitMult && door + order + food < 0.8) { score += 0.4; reasons.push('Atendimento rápido'); }
    if (T.grumpy) score -= T.grumpy;
    if (door > 0.6) reasons.push('Esperamos muito na porta');
    if (order > 0.6) reasons.push('Demoraram para anotar o pedido');
    if (food > 0.65) reasons.push('A comida demorou');
    if (bill > 0.6) reasons.push('Demoraram para cobrar');
    const plates = g.members.filter((m) => m.plate);
    const q = plates.reduce((a, m) => a + m.plate.q, 0) / Math.max(1, plates.length);
    score += (q - 3) * 0.7;
    if (q >= 4.3 && plates.length) reasons.push(`${pick(plates).plate.recipe.name} estava perfeito`);
    else if (q < 2.5) reasons.push('A comida estava sem graça');
    const failed = g.members.filter((m) => m.failed).length;
    if (failed) {
      score -= failed * 1.2;
      const dietFail = g.members.find((m) => m.failed && m.diet);
      reasons.push(dietFail ? `Não tinha opção ${DIETS[dietFail.diet].name.toLowerCase()}` : 'Faltou prato do cardápio');
    }
    if (T.loves && plates.some((m) => m.plate.recipe.cuisine === T.loves)) { score += 0.5; reasons.push('Comida típica deliciosa'); }
    const wantedDrink = g.members.filter((m) => m.drinkWanted);
    if (wantedDrink.some((m) => !m.drink)) { score -= 0.4; reasons.push('A bebida não chegou'); }
    else if (wantedDrink.length) score += 0.15;
    if (g.members.some((m) => m.regular && m.plate && m.plate.recipe.id === m.regular.fav)) score += 0.3;
    const h = hygiene(s);
    if (h < 70) { score -= (70 - h) / 30; reasons.push('O lugar estava sujo'); }
    const c = charm(s);
    score += Math.min(0.6, c / 50) * T.charmMult;
    if (c >= 15) reasons.push('Ambiente lindo');
    const ratio = plates.reduce((a, m) => a + m.price / m.plate.recipe.price, 0) / Math.max(1, plates.length);
    if (ratio > 1.1) { score -= (ratio - 1.1) * 3 * T.priceSens; reasons.push('Achamos caro'); }
    else if (ratio < 0.9) { score += 0.3 * T.priceSens; reasons.push('Preço justo'); }
    return { score: Math.max(1, Math.min(5, score)), reasons, q };
  }
  pay(g, by) {
    if (!this.groups.includes(g) || g.state === 'leaving') return;
    const s = this.state;
    const total = this.billTotal(g);
    const sat = g._sat || this.satisfaction(g);
    const tip = sat.score >= 4.3 ? Math.round(total * 0.1 * 100) / 100 : 0;
    s.cash += total + tip;
    s.month.revenue += total; s.month.tips += tip;
    s.month.customers += g.size; s.month.groups++;
    s.stats.served += g.size; s.stats.earned += total + tip;
    this.dayStat('revenue', total + tip); this.dayStat('customers', g.size);
    const where = (this.register() && g.atRegister) ? this.register() : (g.table || g.members[0].ch);
    this.game.floatText(`+R$ ${Math.round(total + tip)}`, where, '#ffd166');
    const payer = g.members.find((m) => m.paying) || g.members[0];
    this.say(payer.ch, pickLine(sat.score >= 4 ? LINES.custByeHappy : sat.score >= 2.8 ? LINES.custByeMeh : LINES.custByeBad), by === 'player' ? 0 : 0.6);
    this.review(g, sat);
    this.updateRegulars(g, sat);
    this.leave(g);
  }
  billTotal(g) {
    return g.members.reduce((a, m) => a + (m.plate ? m.price : 0) + (m.drink ? (m.drinkPrice || 0) : 0), 0);
  }
  review(g, sat) {
    const s = this.state;
    const text = sat.reasons.length ? sat.reasons.slice(0, 2).join('. ') + '.' : pick(['Tudo certo, voltaremos!', 'Bom atendimento.', 'Gostamos bastante.']);
    const score = Math.round(sat.score * 10) / 10;
    const reg = g.members.find((m) => m.regular)?.regular;
    s.reviews.unshift({ t: Date.now(), score, text, size: g.size, type: g.type, critic: !!g.critic, regular: reg ? reg.name : null });
    s.reviews = s.reviews.slice(0, 60);
    const weight = g.critic ? CRITIC_WEIGHT : 1;
    s.rep += (sat.score - s.rep) * Math.min(0.5, 0.08 * weight);
    s.rep = Math.max(1, Math.min(5, s.rep));
    if (g.critic) this.game.toast(`📰 Um crítico gastronômico disfarçado comeu aqui e deu nota ${score.toFixed(1)}! ${score >= 4 ? 'Ótima notícia!' : score >= 3 ? 'Nada mal.' : 'Isso vai pesar na reputação...'}`);
  }
  updateRegulars(g, sat) {
    const s = this.state;
    s.regulars = s.regulars || [];
    const back = g.members.find((m) => m.regular);
    if (back) {
      const r = back.regular;
      r.visits = (r.visits || 1) + 1; r.last = Date.now();
      if (sat.score < 3) {
        r.mood = (r.mood || 0) - 1;
        if (r.mood <= -1) { s.regulars = s.regulars.filter((x) => x !== r); this.game.toast(`💔 ${r.name} saiu chateado e não deve voltar mais.`); }
      } else r.mood = Math.min(2, (r.mood || 0) + 1);
      return;
    }
    if (g.critic || sat.score < REGULAR.joinScore || Math.random() > REGULAR.joinChance || s.regulars.length >= REGULAR.max) return;
    const m = g.members.find((x) => !x.kid && x.plate);
    if (!m) return;
    const name = regularName();
    s.regulars.push({ id: 'r' + Date.now().toString(36) + Math.floor(Math.random() * 1000), name, look: { ...m.ch.look }, type: g.type, fav: m.plate.recipe.id, visits: 1, last: Date.now(), mood: 1 });
    this.game.toast(`⭐ ${name} adorou e virou cliente fiel! Vai voltar pedindo ${lower1(m.plate.recipe.name)}.`);
  }
  walkOut(g, why, lineKey) {
    const s = this.state;
    s.month.lost += g.size;
    this.dayStat('lost', g.size);
    if (lineKey) this.line(g.members[0].ch, lineKey);
    this.game.floatText('😠', g.members[0].ch, '#ffffff');
    if (g.state !== 'waitSeat') this.review(g, { score: 1.5, reasons: [why] });
    else if (Math.random() < 0.3) this.review(g, { score: 2.2, reasons: [why] });
    this.leave(g);
  }
  leave(g) {
    g.state = 'leaving';
    if (g.table) {
      const n = g.members.filter((m) => m.plate).length;
      if (n) { g.table.data._dirty = true; g.table.data._dirtyN = (g.table.data._dirtyN || 0) + n; }
      g.table.data._group = null;
    }
    for (const o of this.orders) if (o.group === g && o.status === 'queued') o.status = 'done';
    this.orders = this.orders.filter((o) => o.group !== g || o.status === 'cooking' || o.status === 'carrying' || o.status === 'delivering');
    this.drinkOrders = this.drinkOrders.filter((d) => d.group !== g || d.status === 'making');
    for (const p of objectsOfKind(this.state, 'counter')) if (p.data._plates) {
      const gone = p.data._plates.filter((o) => o.group === g);
      if (gone.length) this.toDirty(gone.length); // comida que ninguém comeu: prato volta sujo
      p.data._plates = p.data._plates.filter((o) => o.group !== g);
    }
    let out = 0;
    g.members.forEach((m) => {
      m.sitting = false; m.slot = null;
      if (Math.random() < 0.15 * ((CUSTOMER_TYPES[g.type] || {}).messy || 1) && m.seat) this.addDirt(m.seat.x, m.seat.y, 2);
      const gone = () => { if (++out === g.size) this.groups = this.groups.filter((x) => x !== g); };
      const ex = exitOf(this.state);
      if (!m.ch.goTo(this.state, ex.x, ex.y, gone)) gone();
    });
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
        else this.say(g.members[0].ch, pickLine(LINES.custParty(g.size)));
        return true;
      }
      if (g.state === 'waitOrder' && !g.claim) {
        const choices = g.members.map((m) => this.chooseDish(g, m));
        const drinks = g.members.map((m) => this.chooseDrink(g, m));
        g.members.forEach((m, i) => this.say(m.ch, choices[i] ? pickLine(LINES.custOrder(lower1(choices[i].name))) : (m.diet ? DIET_LINES.none[m.diet] : pickLine(LINES.custOrderNone)), i * 1.3));
        this.placeOrders(g, choices, drinks);
        this.game.toast('📝 Pedido anotado!');
        return true;
      }
      if (g.state === 'waitBill' && !g.claim) { this.billTalk(null, g); this.pay(g, 'player'); return true; }
      this.game.toast(this.groupInfo(g));
      return true;
    }
    if (!obj) return false;
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
      if (gb) { this.billTalk(null, gb); this.pay(gb, 'player'); return true; }
      this.game.toast('Ninguém esperando para pagar.');
      return true;
    }
    if (kind === 'bar') {
      const dq = this.drinkOrders.find((d) => d.status === 'queued');
      if (!dq) { this.game.toast('Nenhuma bebida pedida no momento.'); return true; }
      const g2 = dq.group;
      const batch = this.drinkOrders.filter((d) => d.group === g2 && d.status === 'queued');
      for (const d of batch) { d.status = 'done'; const mm = g2.members[d.mi]; if (mm) mm.drink = d.drink; }
      this.game.toast(`🥤 ${batch.length} bebida(s) servida(s) na mesa ${this.tableNo(g2.table)}.`);
      return true;
    }
    if (kind === 'sink') {
      if (obj.data._by) { this.game.toast('Já tem alguém lavando aqui.'); return true; }
      const n = Math.min(5, this.dishes.dirty);
      if (!n) { this.game.toast(`Pia limpa. Pratos limpos: ${this.dishes.clean}.`); return true; }
      this.dishes.dirty -= n; this.dishes.clean += n; s.month.water += n * 0.05;
      this.game.toast(`🧽 Você lavou ${n} prato(s).`);
      return true;
    }
    if (kind === 'dishwasher') {
      const d = obj.data, it = itemById(obj.item);
      if (d._by) { this.game.toast('O lavador está mexendo na máquina.'); return true; }
      if (d._load && d._end <= this.t) { this.dishes.clean += d._load; this.platesOut = Math.max(0, this.platesOut - d._load); this.game.toast(`✨ ${d._load} pratos limpos!`); d._load = 0; d._end = 0; return true; }
      if (d._load) { this.game.toast(`Lavando ${d._load} pratos: falta ${Math.ceil(d._end - this.t)}s.`); return true; }
      const n = Math.min(it.capacity, this.dishes.dirty);
      if (!n) { this.game.toast('Não tem louça suja para lavar.'); return true; }
      this.dishes.dirty -= n; this.platesOut += n; d._load = n; d._end = this.t + it.cycle;
      s.month.energy += COSTS.dishwasherKwh * COSTS.energyPrice; s.month.kwh += COSTS.dishwasherKwh; s.month.water += COSTS.dishwasherWater;
      this.game.toast(`Lava-louças ligada com ${n} pratos.`);
      return true;
    }
    if (kind === 'table') {
      if (obj.data._dirty && !obj.data._clearBy && !obj.data._group) {
        this.toDirty(obj.data._dirtyN || 0);
        obj.data._dirty = false; obj.data._dirtyN = 0;
        this.game.toast('🍽️ Louça recolhida para a pia.');
        return true;
      }
      if (obj.data._stain && !obj.data._wipeBy && !obj.data._group) { obj.data._stain = false; s.month.water += COSTS.waterPerClean; this.game.toast('🧽 Mesa limpa!'); return true; }
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
      if (!this.takePlate()) { this.game.toast('Sem pratos limpos! Lave a louça na pia.'); return true; }
      const o = d._order;
      this.clearStove(stove);
      this.serveMember(o);
      this.game.toast(`${o.recipe.icon} ${o.recipe.name} servido!`);
      return true;
    }
    if (d._order) {
      const left = Math.max(0, d._dur - (this.t - (d._start || this.t)));
      this.game.toast(`${d._order.recipe.icon} ${d._order.recipe.name}: falta ${Math.ceil(left)}s`);
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

  // ficha rápida do grupo (aparece ao tocar num cliente)
  groupInfo(g) {
    const T = CUSTOMER_TYPES[g.type] || CUSTOMER_TYPES.comum;
    const parts = [`${T.icon} ${T.name}`, `${g.size} pessoa(s)`];
    const reg = g.members.find((m) => m.regular);
    if (reg) parts.push(`⭐ ${reg.regular.name} (cliente fiel)`);
    const kids = g.members.filter((m) => m.kid).length;
    if (kids) parts.push(`${kids} criança(s)`);
    for (const m of g.members) if (m.diet) parts.push(`${DIETS[m.diet].icon} ${DIETS[m.diet].name.toLowerCase()}`);
    const st = { waitSeat: 'esperando mesa', walkingIn: 'indo para a mesa', waitOrder: 'esperando pedir', waitFood: 'comendo / esperando comida', waitBill: 'esperando a conta', leaving: 'indo embora' }[g.state];
    if (st) parts.push(st);
    return parts.join(' · ');
  }

  // dono limpando sujeira no chão
  cleanDirtByOwner(d) {
    if (d._by) return false;
    this.removeDirt(d);
    return true;
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
