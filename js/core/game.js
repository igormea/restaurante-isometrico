// O "cérebro" do jogo: junta estado, sistemas e as ações que a interface pode pedir.
import { createNewState, migrate, level, roomSize, objectAt, inRoom, countKind, DOOR, newUid } from './state.js';
import { Events } from './events.js';
import { itemById } from '../config/items.js';
import { recipeById } from '../config/recipes.js';
import { EXPANSIONS, maxStoves, levelFromXp } from '../config/levels.js';
import { stoveStatus } from '../systems/kitchen.js';
import { Chef, Waiter } from '../systems/staff.js';
import { CustomerManager } from '../systems/customers.js';

export class Game {
  constructor(saveService) {
    this.saveService = saveService;
    this.state = null;
    this.floats = []; // textos flutuantes (+moedas, +xp)
    this.mode = 'play'; // play | place | edit | paint
    this.placing = null; // { itemId, moving?: obj, from? }
    this.t = 0;
  }

  async init() {
    const saved = migrate(await this.saveService.load());
    this.state = saved || createNewState();
    // limpa dados temporários que não deveriam ter sido salvos
    for (const o of this.state.objects) {
      o.data = o.data || {};
      if (o.data._pending === 'cook' && !o.data.recipe) delete o.data._pending;
      delete o.data._pending; delete o.data._incoming;
    }
    this.chef = new Chef(this);
    this.waiter = new Waiter(this);
    this.customers = new CustomerManager(this);
    this._lastSave = 0;
    if (!saved) this.save();
  }

  // ---------- salvar ----------
  save() {
    const clean = JSON.parse(JSON.stringify(this.state, (k, v) => (k.startsWith('_') ? undefined : v)));
    clean.savedAt = Date.now();
    this.saveService.save(clean);
  }
  async resetAll() {
    await this.saveService.reset();
    location.reload();
  }

  // ---------- loop ----------
  update(dt) {
    this.t += dt;
    this.chef.update(dt);
    this.waiter.update(dt);
    this.customers.update(dt);
    for (const f of this.floats) { f.life -= dt; f.y -= dt * 30; }
    this.floats = this.floats.filter((f) => f.life > 0);
    this._lastSave += dt;
    if (this._lastSave > 10) { this._lastSave = 0; this.save(); }
  }

  // ---------- economia ----------
  get level() { return level(this.state); }
  spend(n) {
    if (this.state.coins < n) { this.toast('Moedas insuficientes!'); return false; }
    this.state.coins -= n;
    Events.emit('hud');
    return true;
  }
  earn(n, at, silent) {
    this.state.coins += n;
    if (!silent) this.state.stats.earned += n;
    if (at) this.floatText(`+${n} 🪙`, at, '#ffd166');
    Events.emit('hud');
  }
  addXp(n, at) {
    const before = levelFromXp(this.state.xp);
    this.state.xp += n;
    if (at) this.floatText(`+${n} XP`, at, '#9be7ff', 0.4);
    const after = levelFromXp(this.state.xp);
    if (after > before) { Events.emit('levelup', after); this.save(); }
    Events.emit('hud');
  }
  floatText(text, at, color = '#ffffff', delay = 0) {
    this.floats.push({ text, x: at.x, y: at.y, color, life: 1.6 + delay, off: 0 });
  }
  toast(msg) { Events.emit('toast', msg); }

  // ---------- cozinha ----------
  clickStove(obj) {
    const s = stoveStatus(obj);
    if (obj.data._pending) { this.toast('O cozinheiro já está a caminho!'); return; }
    if (s.state === 'idle') Events.emit('openRecipes', obj);
    else if (s.state === 'cooking') this.toast(`${s.recipe.icon} ${s.recipe.name}: falta ${Math.ceil(s.remaining)}s`);
    else if (s.state === 'ready') { obj.data._pending = 'serve'; this.chef.enqueue({ type: 'serve', uid: obj.uid }); }
    else if (s.state === 'spoiled') { obj.data._pending = 'clean'; this.chef.enqueue({ type: 'clean', uid: obj.uid }); }
  }
  cook(obj, recipeId) {
    const r = recipeById(recipeId);
    if (r.level > this.level) return;
    if (!this.spend(r.cost)) return;
    obj.data._pending = 'cook';
    this.chef.enqueue({ type: 'cook', uid: obj.uid, recipe: recipeId });
  }

  // ---------- loja / construção ----------
  canBuy(item) {
    if (item.level > this.level) return `Disponível no nível ${item.level}`;
    if (item.kind === 'stove' && countKind(this.state, 'stove') >= maxStoves(this.level)) {
      return `Limite de fogões no seu nível (${maxStoves(this.level)}). Suba de nível para ter mais!`;
    }
    if (this.state.coins < item.price) return 'Moedas insuficientes';
    return null;
  }
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
    this.placing = { itemId, gx: null, gy: null };
    Events.emit('mode');
  }
  validTile(x, y) {
    if (!inRoom(this.state, x, y)) return false;
    if (x === DOOR.x && y === DOOR.y) return false;
    if (x === DOOR.x + 1 && y === DOOR.y) return false; // espaço livre na entrada
    if (objectAt(this.state, x, y)) return false;
    const people = [this.chef.ch, this.waiter.ch, ...this.customers.list.map((c) => c.ch)];
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
    const why = this.canBuy(item);
    if (why) { this.toast(why); this.cancelPlacing(); return; }
    this.spend(item.price);
    this.state.objects.push({ uid: newUid(), item: item.id, x, y, data: {} });
    this.save();
    // continua colocando se ainda puder comprar outro igual (prático para cadeiras)
    const repeatable = ['chair', 'cushion', 'table'].includes(item.kind);
    if (!repeatable || this.canBuy(item)) { this.cancelPlacing(); }
    Events.emit('hud');
  }
  paintAt(x, y) {
    const p = this.placing;
    if (!p || !inRoom(this.state, x, y)) return;
    const key = x + ',' + y;
    const cur = this.state.floor[key] || 'piso_bege';
    if (cur === p.itemId) return;
    const item = itemById(p.itemId);
    if (this.state.coins < item.price) { this.toast('Moedas insuficientes!'); return; }
    this.state.coins -= item.price;
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
    if (this.state.coins < cost) { this.toast(`Precisa de ${cost} moedas para pintar tudo.`); return; }
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) this.paintAt(x, y);
    this.save();
  }
  cancelPlacing() {
    const p = this.placing;
    if (p && p.moving) {
      p.moving.x = p.from.x; p.moving.y = p.from.y;
      this.state.objects.push(p.moving);
      this.mode = 'edit';
    } else {
      this.mode = 'play';
    }
    this.placing = null;
    this.save();
    Events.emit('mode');
  }

  // ---------- modo editar ----------
  isBusy(obj) {
    if (this.customers.seatTaken(obj.uid)) return 'Tem um cliente usando isso agora.';
    const kind = itemById(obj.item).kind;
    if (kind === 'table') {
      const st = this.state;
      for (const c of this.customers.list) if (c.table === obj && c.sitting) return 'Tem cliente nessa mesa.';
      void st;
    }
    if (obj.data._pending || obj.data._incoming) return 'O cozinheiro está usando isso.';
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
    if (item.kind === 'stove' && countKind(this.state, 'stove') < 1) { this.toast('Você precisa de pelo menos 1 fogão.'); return; }
    if (item.kind === 'counter' && countKind(this.state, 'counter') < 1) { this.toast('Você precisa de pelo menos 1 balcão.'); return; }
    const value = Math.floor(item.price / 2);
    this.earn(value, null, true);
    this.toast(`Vendido por ${value} moedas.`);
    this.placing = null; this.mode = 'edit';
    this.save(); Events.emit('mode');
  }
  setMode(m) {
    if (this.placing) this.cancelPlacing();
    this.mode = m; Events.emit('mode');
  }

  // ---------- expansão ----------
  nextExpansion() { return EXPANSIONS[this.state.expansion + 1] || null; }
  expand() {
    const e = this.nextExpansion();
    if (!e) return;
    if (this.level < e.level) { this.toast(`Expansão disponível no nível ${e.level}.`); return; }
    if (!this.spend(e.price)) return;
    this.state.expansion++;
    this.save();
    Events.emit('expanded');
    this.toast(`Restaurante ampliado para ${e.size}×${e.size}! 🎉`);
  }
}
