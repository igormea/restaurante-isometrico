// O "cérebro" do jogo: junta estado, relógio, sistemas e as ações que a interface pede.
import { createNewState, migrate, roomSize, objectAt, inRoom, countKind, doorOf, newUid, stockCapacity, stockUsed, kindOf } from './state.js';
import { Events } from './events.js';
import { local } from './clock.js';
import { itemById } from '../config/items.js';
import { INGREDIENTS, SUPPLIERS, recipeById } from '../config/recipes.js';
import { EXPANSIONS } from '../config/levels.js';
import { statusAt } from '../systems/schedule.js';
import { accrue } from '../systems/economy.js';
import { Service } from '../systems/service.js';
import { simulateOffline } from '../systems/offline.js';

export class Game {
  constructor(saveService) {
    this.saveService = saveService;
    this.state = null;
    this.floats = [];
    this.mode = 'play'; // play | place | edit | paint
    this.placing = null;
    this.t = 0;          // segundos desde que a página abriu (animações)
  }

  async init() {
    const now = Date.now();
    const saved = migrate(await this.saveService.load());
    this.state = saved || createNewState(now, local(now, 'CE').monthKey);
    for (const o of this.state.objects) {
      o.data = o.data || {};
      for (const k of Object.keys(o.data)) if (k.startsWith('_')) delete o.data[k];
    }
    this.service = new Service(this);
    this._accT = 0; this._saveT = 0;
    if (saved) this.catchUp(now);
    this.status = statusAt(this.state, now);
    this.save();
  }

  // simula o tempo em que o jogo ficou fechado
  catchUp(now) {
    const from = this.state.lastTick || now;
    if (now - from < 60000) { accrue(this.state, from, now); this.state.lastTick = now; return; }
    const months = [];
    const rep = simulateOffline(this, from, now);
    months.push(...rep.months);
    this.state.lastTick = now;
    this.pendingReport = rep;
  }

  now() { return Date.now(); }

  save() {
    const clean = JSON.parse(JSON.stringify(this.state, (k, v) => (k.startsWith('_') ? undefined : v)));
    clean.savedAt = Date.now();
    this.saveService.save(clean);
  }
  async resetAll() { await this.saveService.reset(); location.reload(); }

  // ---------- loop ----------
  update(dt) {
    this.t += dt;
    const now = Date.now();
    // se a aba ficou escondida muito tempo, simula como "offline"
    if (now - this.state.lastTick > 90000) { this.catchUp(now); Events.emit('report'); }
    this.status = statusAt(this.state, now);
    this.service.update(dt, this.status);
    // entregas de fornecedores
    for (const d of [...this.state.deliveries]) if (d.at <= now) { this.receiveDelivery(d); this.toast(`🚚 Chegou: ${d.qty}× ${INGREDIENTS[d.ing].name}`); }
    this._accT += dt;
    if (this._accT > 5) {
      this._accT = 0;
      accrue(this.state, this.state.lastTick, now, (m) => Events.emit('monthClosed', m));
      this.state.lastTick = now;
      Events.emit('hud');
    }
    for (const f of this.floats) f.life -= dt;
    this.floats = this.floats.filter((f) => f.life > 0);
    this._saveT += dt;
    if (this._saveT > 15) { this._saveT = 0; this.save(); }
  }

  floatText(text, at, color = '#ffffff') { this.floats.push({ text, x: at.x, y: at.y, color, life: 1.8 }); }
  toast(msg) { Events.emit('toast', msg); }
  spend(n, cat = 'equipment') {
    if (this.state.cash < n) { this.toast('Saldo insuficiente!'); return false; }
    this.state.cash -= n;
    if (cat === 'ingredients') this.state.month.ingredients += n;
    else this.state.month.purchases = (this.state.month.purchases || 0) + n;
    Events.emit('hud');
    return true;
  }

  // ---------- feriado ----------
  openOnHoliday() { this.state.holidayOpen[this.status.l.dateKey] = true; this.save(); Events.emit('hud'); this.toast('Restaurante aberto. Sem funcionários hoje: você atende tudo!'); }
  closeOnHoliday() { delete this.state.holidayOpen[this.status.l.dateKey]; this.save(); Events.emit('hud'); }

  // ---------- equipe ----------
  hire(c) {
    const s = this.state;
    if (s.hiredIds.includes(c.id)) return;
    s.staff.push({ ...c, folga: 1, hiredAt: Date.now() });
    s.hiredIds.push(c.id);
    this.save(); Events.emit('hud');
    this.toast(`✅ ${c.name} foi contratado(a)!`);
  }
  fire(emp) {
    const s = this.state;
    const cost = Math.round(emp.salary * 0.5);
    s.cash -= cost; s.month.salaries += cost;
    s.staff = s.staff.filter((e) => e !== emp);
    this.save(); Events.emit('hud');
    this.toast(`${emp.name} foi desligado(a). Rescisão: R$ ${cost}`);
  }

  // ---------- estoque ----------
  pendingUnits() { return this.state.deliveries.reduce((a, d) => a + d.qty, 0); }
  buyIngredient(ing, qty, supplierId) {
    const sup = SUPPLIERS.find((x) => x.id === supplierId);
    const s = this.state;
    if (stockUsed(s) + this.pendingUnits() + qty > stockCapacity(s)) { this.toast('Sem espaço no estoque. Compre uma geladeira!'); return false; }
    const cost = Math.round(INGREDIENTS[ing].price * sup.priceMult * qty * 100) / 100;
    if (!this.spend(cost, 'ingredients')) return false;
    s.deliveries.push({ ing, qty, q: sup.quality, at: Date.now() + sup.deliveryMin * 60000, sup: sup.id });
    this.save();
    return true;
  }
  receiveDelivery(d) {
    const s = this.state;
    const st = s.stock[d.ing];
    const total = st.qty + d.qty;
    st.q = total ? (st.q * st.qty + d.q * d.qty) / total : d.q;
    st.qty = total;
    s.deliveries = s.deliveries.filter((x) => x !== d);
  }

  // ---------- cardápio ----------
  setMenu(id, on, price) {
    const m = this.state.menu[id];
    if (on != null) m.on = on;
    if (price != null) m.price = Math.max(1, Math.round(price));
    this.save();
  }

  // ---------- loja / construção ----------
  canBuy(item) { return this.state.cash < item.price ? 'Saldo insuficiente' : null; }
  startPlacing(itemId) {
    const item = itemById(itemId);
    const why = this.canBuy(item);
    if (why) { this.toast(why); return; }
    if (item.cat === 'parede') {
      if (this.state.wall === itemId) { this.toast('Essa já é a sua parede.'); return; }
      if (!this.spend(item.price)) return;
      this.state.wall = itemId; this.save(); Events.emit('hud');
      this.toast('Parede nova aplicada!');
      return;
    }
    if (item.cat === 'piso') { this.mode = 'paint'; this.placing = { itemId }; Events.emit('mode'); return; }
    this.mode = 'place';
    this.placing = { itemId };
    Events.emit('mode');
  }
  validTile(x, y) {
    if (!inRoom(this.state, x, y)) return false;
    const d = doorOf(this.state);
    if (x === d.x && (y === d.y || y === d.y - 1)) return false; // entrada livre
    if (objectAt(this.state, x, y)) return false;
    const people = [...this.service.agents.values()].map((a) => a.ch).concat(this.service.groups.flatMap((g) => g.members.map((m) => m.ch)));
    if (people.some((p) => p.tx === x && p.ty === y)) return false;
    return true;
  }
  placeAt(x, y) {
    const p = this.placing;
    if (!p) return;
    if (!this.validTile(x, y)) { this.toast('Não dá para colocar aqui.'); return; }
    if (p.moving) {
      p.moving.x = x; p.moving.y = y;
      this.state.objects.push(p.moving);
      this.placing = null; this.mode = 'edit';
      this.save(); Events.emit('mode');
      return;
    }
    const item = itemById(p.itemId);
    if (!this.spend(item.price)) { this.cancelPlacing(); return; }
    this.state.objects.push({ uid: newUid(), item: item.id, x, y, data: {} });
    this.save();
    const repeatable = ['chair', 'cushion', 'table'].includes(item.kind);
    if (!repeatable || this.canBuy(item)) this.cancelPlacing();
    Events.emit('hud');
  }
  paintAt(x, y) {
    const p = this.placing;
    if (!p || !inRoom(this.state, x, y)) return;
    const key = x + ',' + y;
    if ((this.state.floor[key] || 'piso_bege') === p.itemId) return;
    const item = itemById(p.itemId);
    if (this.state.cash < item.price) { this.toast('Saldo insuficiente!'); return; }
    this.state.cash -= item.price;
    if (p.itemId === 'piso_bege') delete this.state.floor[key]; else this.state.floor[key] = p.itemId;
    Events.emit('hud');
  }
  paintAll() {
    const p = this.placing; if (!p) return;
    const n = roomSize(this.state);
    const item = itemById(p.itemId);
    let tiles = 0;
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) if ((this.state.floor[x + ',' + y] || 'piso_bege') !== p.itemId) tiles++;
    const cost = tiles * item.price;
    if (this.state.cash < cost) { this.toast(`Precisa de R$ ${cost} para pintar tudo.`); return; }
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) this.paintAt(x, y);
    this.save();
  }
  cancelPlacing() {
    const p = this.placing;
    if (p && p.moving) {
      p.moving.x = p.from.x; p.moving.y = p.from.y;
      this.state.objects.push(p.moving);
      this.mode = 'edit';
    } else this.mode = 'play';
    this.placing = null;
    this.save();
    Events.emit('mode');
  }
  isBusy(obj) {
    const d = obj.data;
    if (d._group || d._order || (d._plates && d._plates.length) || d._dirty) return 'Esse item está em uso agora.';
    const sv = this.service;
    if (sv.groups.some((g) => g.members.some((m) => m.seat === obj))) return 'Tem cliente usando isso agora.';
    if (kindOf(obj) === 'register' && sv.groups.some((g) => g.state === 'waitBill')) return 'Tem cliente pagando agora.';
    return null;
  }
  pickUp(obj) {
    const busy = this.isBusy(obj);
    if (busy) { this.toast(busy); return; }
    this.state.objects = this.state.objects.filter((o) => o !== obj);
    this.placing = { itemId: obj.item, moving: obj, from: { x: obj.x, y: obj.y } };
    this.mode = 'place';
    Events.emit('mode');
  }
  sellMoving() {
    const p = this.placing;
    if (!p || !p.moving) return;
    const item = itemById(p.moving.item);
    if (item.kind === 'counter' && countKind(this.state, 'counter') < 1) { this.toast('Você precisa de pelo menos 1 balcão de passe.'); return; }
    const value = Math.floor(item.price / 2);
    this.state.cash += value;
    this.toast(`Vendido por R$ ${value}.`);
    this.placing = null; this.mode = 'edit';
    this.save(); Events.emit('mode'); Events.emit('hud');
  }
  setMode(m) {
    if (this.placing) this.cancelPlacing();
    this.mode = m; Events.emit('mode');
  }

  // ---------- expansão ----------
  nextExpansion() { return EXPANSIONS[this.state.expansion + 1] || null; }
  expand() {
    const e = this.nextExpansion();
    if (!e || !this.spend(e.price)) return;
    this.state.expansion++;
    this.save();
    Events.emit('expanded');
    this.toast(`Restaurante ampliado para ${e.size}×${e.size}! O aluguel aumentou.`);
  }
}
export { recipeById };
