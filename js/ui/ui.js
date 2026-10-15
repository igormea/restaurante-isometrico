// Interface (botões, loja, menus). Tudo em HTML por cima do jogo.
import { Events } from '../core/events.js';
import { ITEMS, CATEGORIES, THEMES, itemById } from '../config/items.js';
import { RECIPES } from '../config/recipes.js';
import { LEVEL_XP, MAX_LEVEL, maxStoves, EXPANSIONS } from '../config/levels.js';
import { charm, countKind } from '../core/state.js';
import { drawItem } from '../engine/draw.js';
import { fmtTime } from '../systems/kitchen.js';
import { Social } from '../net/social.js';
import { camera } from '../engine/iso.js';
import { clampZoom } from '../engine/input.js';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const fmt = (n) => n.toLocaleString('pt-BR');

export class UI {
  constructor(game, renderer) {
    this.game = game;
    this.renderer = renderer;
    this.shopCat = 'cozinha';
    this.shopTheme = 'todos';
    this.bind();
    this.updateHud();
    this.updateMode();
    Events.on('hud', () => this.updateHud());
    Events.on('mode', () => { this.updateMode(); this.updateHud(); });
    Events.on('toast', (m) => this.toast(m));
    Events.on('openRecipes', (obj) => this.openRecipes(obj));
    Events.on('levelup', (lvl) => this.levelUp(lvl));
    Events.on('expanded', () => { this.renderer.fitCamera(); this.updateHud(); });
  }

  bind() {
    $('#btn-shop').onclick = () => this.openShop();
    $('#btn-edit').onclick = () => this.game.setMode(this.game.mode === 'edit' ? 'play' : 'edit');
    $('#btn-expand').onclick = () => this.openExpand();
    $('#btn-friends').onclick = () => this.openFriends();
    $('#btn-settings').onclick = () => this.openSettings();
    $('#btn-zoom-in').onclick = () => { this.zoom(1.15); };
    $('#btn-zoom-out').onclick = () => { this.zoom(0.87); };
    $('#btn-center').onclick = () => this.renderer.fitCamera();
    $('#modal-bg').onclick = (e) => { if (e.target.id === 'modal-bg') this.closeModal(); };
  }
  zoom(f) {
    camera.zoom = clampZoom(camera.zoom * f);
  }

  // ---------- HUD ----------
  updateHud() {
    const s = this.game.state;
    const lvl = this.game.level;
    $('#hud-coins').textContent = fmt(s.coins);
    $('#hud-level').textContent = lvl;
    const cur = LEVEL_XP[lvl], next = LEVEL_XP[Math.min(MAX_LEVEL, lvl + 1)];
    const pct = lvl >= MAX_LEVEL ? 100 : ((s.xp - cur) / (next - cur)) * 100;
    $('#hud-xpbar').style.width = Math.max(3, pct) + '%';
    $('#hud-xptext').textContent = lvl >= MAX_LEVEL ? 'Nível máximo' : `${s.xp - cur} / ${next - cur} XP`;
    $('#hud-charm').textContent = charm(s);
    $('#btn-edit').classList.toggle('active', this.game.mode === 'edit');
    const e = this.game.nextExpansion();
    $('#btn-expand').classList.toggle('dim', !e);
  }

  updateMode() {
    const g = this.game;
    const bar = $('#modebar');
    bar.innerHTML = '';
    if (g.mode === 'play') { bar.classList.remove('show'); document.body.dataset.mode = 'play'; return; }
    document.body.dataset.mode = g.mode;
    bar.classList.add('show');
    const add = (html, cls, fn) => { const b = el('button', 'mb-btn ' + (cls || ''), html); b.onclick = fn; bar.appendChild(b); };
    if (g.mode === 'edit') {
      bar.appendChild(el('span', 'mb-text', '✏️ Toque num item para mover ou vender'));
      add('Concluir', 'ok', () => g.setMode('play'));
    } else if (g.mode === 'place') {
      const item = itemById(g.placing.itemId);
      const moving = !!g.placing.moving;
      bar.appendChild(el('span', 'mb-text', moving ? `Movendo: <b>${item.name}</b> — toque no novo lugar` : `Colocar: <b>${item.name}</b> (🪙 ${fmt(item.price)}) — toque no piso`));
      if (moving) add(`Vender (+${fmt(Math.floor(item.price / 2))})`, 'warn', () => g.sellMoving());
      add('Cancelar', '', () => g.cancelPlacing());
    } else if (g.mode === 'paint') {
      const item = itemById(g.placing.itemId);
      bar.appendChild(el('span', 'mb-text', `🖌️ <b>${item.name}</b> (🪙 ${item.price}/quadrado) — toque ou arraste no piso`));
      add('Pintar tudo', '', () => g.paintAll());
      add('Concluir', 'ok', () => g.cancelPlacing());
    }
  }

  toast(msg) {
    const t = el('div', 'toast', msg);
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 2200);
    setTimeout(() => t.remove(), 2700);
  }

  // ---------- janelas ----------
  openModal(title, body, cls = '') {
    const m = $('#modal');
    m.className = 'modal ' + cls;
    m.innerHTML = '';
    const head = el('div', 'modal-head');
    head.appendChild(el('h2', '', title));
    const x = el('button', 'modal-x', '✕'); x.onclick = () => this.closeModal();
    head.appendChild(x);
    m.appendChild(head);
    m.appendChild(body);
    $('#modal-bg').classList.add('show');
  }
  closeModal() { $('#modal-bg').classList.remove('show'); }

  // ---------- loja ----------
  openShop() {
    if (this.game.placing) this.game.cancelPlacing();
    const body = el('div', 'shop');
    const tabs = el('div', 'tabs');
    for (const [id, c] of Object.entries(CATEGORIES)) {
      const b = el('button', 'tab' + (id === this.shopCat ? ' active' : ''), `<span>${c.icon}</span>${c.name}`);
      b.onclick = () => { this.shopCat = id; this.openShop(); };
      tabs.appendChild(b);
    }
    body.appendChild(tabs);
    const themes = el('div', 'chips');
    const tlist = [['todos', { name: 'Todos', icon: '✨' }], ...Object.entries(THEMES)];
    for (const [id, th] of tlist) {
      const b = el('button', 'chip' + (id === this.shopTheme ? ' active' : ''), `${th.icon} ${th.name}`);
      b.onclick = () => { this.shopTheme = id; this.openShop(); };
      themes.appendChild(b);
    }
    body.appendChild(themes);
    const grid = el('div', 'grid');
    const items = ITEMS.filter((i) => i.cat === this.shopCat && (this.shopTheme === 'todos' || i.theme === this.shopTheme));
    if (!items.length) grid.appendChild(el('p', 'empty', 'Nenhum item desse estilo nesta categoria ainda.'));
    const lvl = this.game.level;
    for (const item of items) {
      const locked = item.level > lvl;
      const card = el('div', 'card' + (locked ? ' locked' : ''));
      const cv = document.createElement('canvas');
      cv.width = 220; cv.height = 200; cv.className = 'preview';
      this.drawPreview(cv, item);
      card.appendChild(cv);
      card.appendChild(el('div', 'card-name', item.name));
      const meta = [];
      if (item.charm) meta.push(`⭐ +${item.charm}`);
      if (item.speed && item.speed > 1) meta.push(`⚡ ${Math.round((item.speed - 1) * 100)}% mais rápido`);
      meta.push(THEMES[item.theme].icon + ' ' + THEMES[item.theme].name);
      card.appendChild(el('div', 'card-meta', meta.join(' · ')));
      let label = item.price ? `🪙 ${fmt(item.price)}` : 'Grátis';
      if (item.cat === 'piso') label = item.price ? `🪙 ${item.price} / quadrado` : 'Grátis';
      if (item.cat === 'parede' && this.game.state.wall === item.id) label = 'Em uso';
      const btn = el('button', 'buy', locked ? `🔒 Nível ${item.level}` : label);
      if (item.kind === 'stove' && !locked) {
        const n = countKind(this.game.state, 'stove'), max = maxStoves(lvl);
        card.appendChild(el('div', 'card-meta', `Fogões: ${n}/${max}`));
      }
      btn.disabled = locked;
      btn.onclick = () => { this.closeModal(); this.game.startPlacing(item.id); };
      card.appendChild(btn);
      grid.appendChild(card);
    }
    body.appendChild(grid);
    this.openModal('🛒 Loja', body, 'wide');
  }

  drawPreview(cv, item) {
    const ctx = cv.getContext('2d');
    ctx.save();
    const tall = ['palm', 'bamboo', 'lamp', 'surfboard', 'pinata', 'statue', 'candle'].includes(item.kind);
    const s = item.kind === 'floor' ? 1.0 : item.kind === 'wall' ? 1.1 : tall ? 1.45 : 1.9;
    ctx.translate(item.kind === 'wall' ? 140 : 110, item.kind === 'floor' ? 70 : item.kind === 'wall' ? 190 : tall ? 190 : 165);
    ctx.scale(s, s);
    drawItem(ctx, item, 0, 0, { t: 0, facing: { dx: 1, dy: 0 } });
    ctx.restore();
  }

  // ---------- receitas ----------
  openRecipes(stove) {
    const body = el('div', 'recipes');
    const lvl = this.game.level;
    for (const r of RECIPES) {
      const locked = r.level > lvl;
      const row = el('div', 'recipe' + (locked ? ' locked' : ''));
      row.appendChild(el('div', 'r-icon', r.icon));
      const info = el('div', 'r-info');
      info.appendChild(el('div', 'r-name', r.name));
      const profit = r.servings * r.price - r.cost;
      info.appendChild(el('div', 'r-meta', `⏱️ ${fmtTime(r.time)} · 🍽️ ${r.servings} porções · vende 🪙${r.price} cada`));
      info.appendChild(el('div', 'r-meta strong', `Lucro: 🪙 ${fmt(profit)} · +${r.xp} XP · estraga em ${fmtTime(r.spoil)}`));
      row.appendChild(info);
      const b = el('button', 'buy', locked ? `🔒 Nível ${r.level}` : `Cozinhar<br><small>🪙 ${r.cost}</small>`);
      b.disabled = locked || this.game.state.coins < r.cost;
      b.onclick = () => { this.closeModal(); this.game.cook(stove, r.id); };
      row.appendChild(b);
      body.appendChild(row);
    }
    this.openModal('🍳 O que vamos cozinhar?', body);
  }

  // ---------- nível ----------
  levelUp(lvl) {
    const body = el('div', 'levelup');
    body.appendChild(el('div', 'lv-big', `${lvl}`));
    const unlocked = [
      ...RECIPES.filter((r) => r.level === lvl).map((r) => `${r.icon} Receita: <b>${r.name}</b>`),
      ...ITEMS.filter((i) => i.level === lvl).map((i) => `${THEMES[i.theme].icon} ${i.name}`),
    ];
    if (maxStoves(lvl) > maxStoves(lvl - 1)) unlocked.unshift(`🔥 Agora você pode ter <b>${maxStoves(lvl)} fogões</b>!`);
    const ex = EXPANSIONS.find((e) => e.level === lvl && e.price > 0);
    if (ex) unlocked.unshift(`📐 Expansão para <b>${ex.size}×${ex.size}</b> liberada!`);
    const ul = el('ul', 'lv-list');
    for (const u of unlocked) ul.appendChild(el('li', '', u));
    if (unlocked.length) { body.appendChild(el('p', '', 'Novidades liberadas:')); body.appendChild(ul); }
    const ok = el('button', 'buy big', 'Oba! 🎉'); ok.onclick = () => this.closeModal();
    body.appendChild(ok);
    this.openModal('⭐ Subiu de nível!', body, 'center');
  }

  openExpand() {
    const g = this.game;
    const e = g.nextExpansion();
    const body = el('div', 'expand');
    const cur = EXPANSIONS[g.state.expansion];
    body.appendChild(el('p', '', `Tamanho atual: <b>${cur.size}×${cur.size}</b>`));
    if (!e) { body.appendChild(el('p', '', 'Seu restaurante já está no tamanho máximo deste protótipo! 🏆')); }
    else {
      body.appendChild(el('p', '', `Próxima expansão: <b>${e.size}×${e.size}</b>`));
      body.appendChild(el('p', '', `Requer nível <b>${e.level}</b> · Custa <b>🪙 ${fmt(e.price)}</b>`));
      const b = el('button', 'buy big', g.level < e.level ? `🔒 Nível ${e.level}` : `Ampliar por 🪙 ${fmt(e.price)}`);
      b.disabled = g.level < e.level || g.state.coins < e.price;
      b.onclick = () => { this.closeModal(); g.expand(); };
      body.appendChild(b);
    }
    this.openModal('📐 Ampliar restaurante', body, 'center');
  }

  openFriends() {
    const body = el('div', 'friends');
    body.appendChild(el('p', '', 'Em breve você vai poder:'));
    const ul = el('ul', 'lv-list');
    for (const t of ['👥 Adicionar amigos', '🚪 Visitar o restaurante deles', '🤝 Ajudar no fogão e ganhar recompensas', '🎁 Trocar presentes']) ul.appendChild(el('li', '', t));
    body.appendChild(ul);
    body.appendChild(el('p', 'muted', `Seu código de jogador: <code>${this.game.state.playerId}</code>`));
    body.appendChild(el('p', 'muted', Social.status()));
    this.openModal('👥 Amigos', body, 'center');
  }

  openSettings() {
    const g = this.game;
    const body = el('div', 'settings');
    body.appendChild(el('label', '', 'Nome do restaurante'));
    const inp = el('input'); inp.value = g.state.restaurantName; inp.maxLength = 24;
    body.appendChild(inp);
    const save = el('button', 'buy', 'Salvar nome');
    save.onclick = () => { g.state.restaurantName = inp.value.trim() || 'Meu Restaurante'; g.save(); this.updateHud(); this.closeModal(); };
    body.appendChild(save);
    const s = g.state.stats;
    body.appendChild(el('p', 'muted', `Clientes atendidos: ${fmt(s.served)} · Pratos feitos: ${fmt(s.cooked)} · Moedas ganhas: ${fmt(s.earned)}`));
    const reset = el('button', 'buy danger', 'Recomeçar do zero');
    let armed = false;
    reset.onclick = () => {
      if (armed) { g.resetAll(); return; }
      armed = true; reset.textContent = 'Toque de novo para apagar tudo';
      setTimeout(() => { armed = false; reset.textContent = 'Recomeçar do zero'; }, 4000);
    };
    body.appendChild(reset);
    body.appendChild(el('p', 'muted', 'Protótipo v0.1 · o progresso fica salvo neste navegador.'));
    this.openModal('⚙️ Configurações', body, 'center');
  }
}
