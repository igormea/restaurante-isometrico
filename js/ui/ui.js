// Interface (painéis de administração, loja, avisos). Tudo em HTML por cima do jogo.
import { Events } from '../core/events.js';
import { ITEMS, CATEGORIES, THEMES, itemById } from '../config/items.js';
import { RECIPES, CUISINES, INGREDIENTS, SUPPLIERS, recipeCost, DRINKS, DIETS } from '../config/recipes.js';
import { CUSTOMER_TYPES } from '../config/customers.js';
import { FOOD } from '../config/sprites.js';

// ícone de comida como imagem (cai no emoji se não houver)
const foodIcon = (icon) => {
  const n = FOOD[icon];
  if (!n) return icon;
  const p = `assets/food/${n}.png`;
  return `<img class="food-img" src="${(window.__ASSETS && window.__ASSETS[p]) || p}" alt="${icon}">`;
};
import { ROLES, LEVELS, candidatesFor } from '../config/staff.js';
import { STATES, CITIES, holidaysOf } from '../config/calendar.js';
import { EXPANSIONS } from '../config/levels.js';
import { COSTS, PLATE_PRICE } from '../config/economy.js';
import { charm, hygiene, stockCapacity, stockUsed, objectsOfKind } from '../core/state.js';
import { local, WEEKDAYS, WEEKDAYS_SHORT, MONTHS, hhmm } from '../core/clock.js';
import { statusLabel } from '../systems/schedule.js';
import { payables, taxOf, rentOf, payroll, fmtBRL, fmtBRL0 } from '../systems/economy.js';
import { drawItem } from '../engine/draw.js';
import { camera } from '../engine/iso.js';
import { clampZoom } from '../engine/input.js';
import { Social } from '../net/social.js';

const $ = (s) => document.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const pct = (v) => Math.round(v * 100) + '%';
const stars = (v) => '★'.repeat(Math.round(v)) + '☆'.repeat(5 - Math.round(v));

export class UI {
  constructor(game, renderer) {
    this.game = game;
    this.renderer = renderer;
    this.shopCat = 'cozinha';
    this.shopTheme = 'todos';
    this.staffTab = 'equipe';
    this.supplier = 'atacado';
    this.panel = null;
    this.bind();
    this.updateHud();
    this.updateMode();
    Events.on('hud', () => this.updateHud());
    Events.on('mode', () => { this.updateMode(); this.updateHud(); });
    Events.on('toast', (m) => this.toast(m));
    Events.on('expanded', () => { this.renderer.fitCamera(); this.updateHud(); });
    Events.on('monthClosed', (m) => this.monthReport(m));
    Events.on('report', () => this.showPendingReport());
    setInterval(() => this.updateHud(), 1000);
  }

  bind() {
    $('#btn-staff').onclick = () => this.openStaff();
    $('#btn-menu').onclick = () => this.openMenu();
    $('#btn-stock').onclick = () => this.openStock();
    $('#btn-finance').onclick = () => this.openFinance();
    $('#btn-shop').onclick = () => this.openShop();
    $('#btn-more').onclick = () => this.openMore();
    $('#btn-zoom-in').onclick = () => { camera.zoom = clampZoom(camera.zoom * 1.15); };
    $('#btn-zoom-out').onclick = () => { camera.zoom = clampZoom(camera.zoom * 0.87); };
    $('#btn-center').onclick = () => this.renderer.fitCamera();
    $('#hud-time').onclick = () => this.openCalendar();
    $('#modal-bg').onclick = (e) => { if (e.target.id === 'modal-bg') this.closeModal(); };
  }

  // ---------- HUD ----------
  updateHud() {
    const g = this.game, s = g.state, st = g.status;
    if (!st) return;
    const l = st.l;
    $('#hud-clock').textContent = l.hhmm;
    $('#hud-date').textContent = `${WEEKDAYS_SHORT[l.weekday]}, ${l.day} de ${MONTHS[l.month - 1]}`;
    const lab = statusLabel(s, st);
    const pill = $('#hud-status');
    pill.textContent = lab.text; pill.className = 'status ' + lab.tag;
    const cash = $('#hud-cash');
    cash.textContent = fmtBRL0(s.cash);
    cash.parentElement.classList.toggle('neg', s.cash < 0);
    $('#hud-rep').textContent = s.rep.toFixed(1);
    $('#hud-hyg').textContent = Math.round(hygiene(s)) + '%';
    $('#hud-charm').textContent = charm(s);
    $('#hud-plates').textContent = `${s.dishes.clean}` + (s.dishes.dirty ? ` · ${s.dishes.dirty} sujos` : '');
    $('#hud-plates-pill').classList.toggle('neg', s.dishes.clean < 5);
    this.updateBanner(st, lab);
  }
  updateBanner(st, lab) {
    const b = $('#banner');
    const key = lab.tag + (st.holiday ? st.holiday.name : '') + this.game.mode;
    if (this._bannerKey === key) return;
    this._bannerKey = key;
    b.innerHTML = '';
    b.className = '';
    if (this.game.mode !== 'play') return;
    if (lab.tag === 'feriado') {
      b.className = 'show holiday';
      b.appendChild(el('span', '', `🎉 Hoje é feriado: <b>${st.holiday.name}</b>. A equipe está de folga e o restaurante amanheceu fechado.`));
      const btn = el('button', 'mb-btn warn', 'Abrir mesmo assim');
      btn.onclick = () => this.game.openOnHoliday();
      b.appendChild(btn);
    } else if (lab.tag === 'manual') {
      b.className = 'show manual';
      b.appendChild(el('span', '', '🧑‍🍳 <b>Modo manual:</b> sem funcionários hoje. Toque nos clientes 👋, pedidos 📝, fogões 🍳, passe 🛎️, caixa 💳 e mesas sujas 🧽.'));
      const btn = el('button', 'mb-btn', 'Fechar'); btn.onclick = () => this.game.closeOnHoliday();
      b.appendChild(btn);
    } else if (lab.tag === 'fechado') {
      b.className = 'show closed';
      b.appendChild(el('span', '', `🌙 ${lab.text}. Dá para administrar: equipe, cardápio, estoque, loja e decoração.`));
    }
  }

  updateMode() {
    const g = this.game;
    const bar = $('#modebar');
    bar.innerHTML = '';
    this._bannerKey = null;
    if (g.mode === 'play') { bar.classList.remove('show'); return; }
    bar.classList.add('show');
    const add = (html, cls, fn) => { const b = el('button', 'mb-btn ' + (cls || ''), html); b.onclick = fn; bar.appendChild(b); };
    if (g.mode === 'edit') {
      bar.appendChild(el('span', 'mb-text', '✏️ Toque num item para mover ou vender'));
      add('Concluir', 'ok', () => g.setMode('play'));
    } else if (g.mode === 'place') {
      const item = itemById(g.placing.itemId);
      const moving = !!g.placing.moving;
      bar.appendChild(el('span', 'mb-text', moving ? `Movendo: <b>${item.name}</b>. Toque no novo lugar` : `Colocar: <b>${item.name}</b> (${fmtBRL0(item.price)}). Toque no piso`));
      if (moving) add(`Vender (+${fmtBRL0(Math.floor(item.price / 2))})`, 'warn', () => g.sellMoving());
      add('Cancelar', '', () => g.cancelPlacing());
    } else if (g.mode === 'paint') {
      const item = itemById(g.placing.itemId);
      bar.appendChild(el('span', 'mb-text', `🖌️ <b>${item.name}</b> (${fmtBRL0(item.price)}/quadrado). Toque ou arraste no piso`));
      add('Pintar tudo', '', () => g.paintAll());
      add('Concluir', 'ok', () => g.cancelPlacing());
    }
  }

  toast(msg) {
    const t = el('div', 'toast', msg);
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
  }

  // ---------- janelas ----------
  openModal(title, body, cls = '') {
    const m = $('#modal');
    const prev = m.querySelector('.modal-body');
    const keep = prev && m.dataset.title === title ? prev.scrollTop : 0;
    m.className = 'modal ' + cls;
    m.dataset.title = title;
    m.innerHTML = '';
    const head = el('div', 'modal-head');
    head.appendChild(el('h2', '', title));
    const x = el('button', 'modal-x', '✕'); x.setAttribute('aria-label', 'Fechar'); x.onclick = () => this.closeModal();
    head.appendChild(x);
    m.appendChild(head);
    const wrap = el('div', 'modal-body'); wrap.appendChild(body);
    m.appendChild(wrap);
    wrap.scrollTop = keep;
    $('#modal-bg').classList.add('show');
  }
  closeModal() { $('#modal-bg').classList.remove('show'); $('#modal').dataset.title = ''; }

  // ================= EQUIPE =================
  openStaff() {
    const g = this.game, s = g.state;
    const body = el('div', 'staff');
    const tabs = el('div', 'tabs');
    for (const [id, name] of [['equipe', `👥 Minha equipe (${s.staff.length})`], ['contratar', '📄 Contratar']]) {
      const b = el('button', 'tab' + (this.staffTab === id ? ' active' : ''), name);
      b.onclick = () => { this.staffTab = id; this.openStaff(); };
      tabs.appendChild(b);
    }
    body.appendChild(tabs);

    if (this.staffTab === 'equipe') {
      const stoves = objectsOfKind(s, 'stove').length;
      const count = (r) => s.staff.filter((e) => e.role === r).length;
      const sum = el('div', 'summary');
      sum.innerHTML = `
        <div><b>${count('cozinheiro')}</b> cozinheiro(s) para <b>${stoves}</b> fogão(ões)</div>
        <div><b>${count('garcom')}</b> garçom/garçonete · <b>${count('recepcionista')}</b> recepcionista · <b>${count('caixa')}</b> caixa</div>
        <div><b>${count('lavador')}</b> lavador(a) · <b>${count('zelador')}</b> zelador(a)</div>
        <div>Folha de pagamento: <b>${fmtBRL0(payroll(s))}/mês</b></div>`;
      body.appendChild(sum);
      const tips = [];
      if (!count('cozinheiro')) tips.push('Sem cozinheiro: você mesmo cozinha tocando nos fogões.');
      if (!count('garcom')) tips.push('Sem garçom: você precisa anotar pedidos, servir e cobrar.');
      if (count('cozinheiro') > stoves) tips.push('Tem mais cozinheiros do que fogões: alguém vai ficar parado.');
      if (!count('recepcionista')) tips.push('Sem recepcionista: o garçom também recebe os clientes na porta, e tudo fica mais lento.');
      if (!count('caixa')) tips.push('Sem caixa: o garçom também cobra a conta.');
      if (!count('lavador')) tips.push('Sem lavador: a louça suja acumula e os pratos limpos acabam. O garçom só lava um pouco quando falta prato.');
      if (!count('zelador')) tips.push('Sem zelador: a sujeira fica no chão e nas mesas, a higiene cai e os clientes reclamam.');
      if (tips.length) body.appendChild(el('ul', 'tips', tips.map((t) => `<li>${t}</li>`).join('')));
      const list = el('div', 'cards');
      for (const e of s.staff) list.appendChild(this.employeeCard(e));
      if (!s.staff.length) list.appendChild(el('p', 'empty', 'Ninguém contratado. Vá em "Contratar".'));
      body.appendChild(list);
    } else {
      const today = g.status.l.dateKey;
      body.appendChild(el('p', 'muted', 'Novos currículos chegam todo dia. Um cozinheiro especialista quase não queima pratos da culinária dele.'));
      const list = el('div', 'cards');
      const cands = candidatesFor(today).filter((c) => !s.hiredIds.includes(c.id));
      for (const c of cands) list.appendChild(this.employeeCard(c, true));
      if (!cands.length) list.appendChild(el('p', 'empty', 'Você contratou todos de hoje. Amanhã chegam novos currículos.'));
      body.appendChild(list);
    }
    this.openModal('👥 Equipe', body, 'wide');
  }
  employeeCard(e, candidate = false) {
    const L = LEVELS[e.level];
    const card = el('div', 'emp');
    const role = ROLES[e.role];
    const head = el('div', 'emp-head');
    head.appendChild(el('div', 'emp-avatar', role.icon));
    const info = el('div', 'emp-info');
    info.appendChild(el('div', 'emp-name', e.name));
    info.appendChild(el('div', 'emp-role', `${role.name} · <span class="lvl ${e.level}">${L.name}</span>`));
    head.appendChild(info);
    card.appendChild(head);
    const attrs = el('div', 'attrs');
    const row = (k, v) => attrs.appendChild(el('div', 'attr', `<span>${k}</span><b>${v}</b>`));
    if (e.role === 'cozinheiro') {
      const sp = CUISINES[e.specialty];
      row('Especialidade', `${sp.icon} ${sp.name}`);
      row('Chance de queimar', `${pct(L.burn)} <small>(${pct(L.burn * 0.1)} na especialidade)</small>`);
      row('Qualidade média', stars(Math.min(5, L.quality)));
    }
    row('Velocidade', `${Math.round(e.speed * 100)}%`);
    row('Simpatia', `${e.charisma}/100`);
    row('Salário', `${fmtBRL0(e.salary)}/mês`);
    card.appendChild(attrs);
    const actions = el('div', 'emp-actions');
    if (candidate) {
      const b = el('button', 'buy', 'Contratar');
      b.onclick = () => { this.game.hire(e); this.openStaff(); };
      actions.appendChild(b);
    } else {
      const lab = el('label', 'folga', 'Folga:');
      const sel = el('select');
      sel.id = 'folga-' + e.id;
      WEEKDAYS.forEach((d, i) => { const o = el('option', '', d); o.value = i; if (i === e.folga) o.selected = true; sel.appendChild(o); });
      sel.onchange = () => { e.folga = +sel.value; this.game.save(); };
      lab.appendChild(sel);
      actions.appendChild(lab);
      const st = this.game.status;
      const working = this.game.service.agents.has(e.id);
      actions.appendChild(el('span', 'emp-status ' + (working ? 'on' : 'off'), working ? 'Trabalhando' : st.l.weekday === e.folga ? 'De folga hoje' : 'Fora do expediente'));
      const fire = el('button', 'buy danger small', 'Demitir');
      let armed = false;
      fire.onclick = () => {
        if (!armed) { armed = true; fire.textContent = `Confirmar (rescisão ${fmtBRL0(e.salary * 0.5)})`; setTimeout(() => { armed = false; fire.textContent = 'Demitir'; }, 4000); return; }
        this.game.fire(e); this.openStaff();
      };
      actions.appendChild(fire);
    }
    card.appendChild(actions);
    return card;
  }

  // ================= CARDÁPIO =================
  openMenu() {
    const g = this.game, s = g.state;
    const body = el('div', 'menu-panel');
    body.appendChild(el('p', 'muted', 'Escolha os pratos e os preços. Preço acima do sugerido vende menos e gera reclamação; abaixo dá menos lucro.'));
    const list = el('div', 'rows');
    for (const r of RECIPES) {
      const m = s.menu[r.id];
      const cost = recipeCost(r);
      const row = el('div', 'mrow' + (m.on ? '' : ' off'));
      const tog = el('button', 'toggle' + (m.on ? ' on' : ''), m.on ? 'No cardápio' : 'Fora');
      tog.onclick = () => { g.setMenu(r.id, !m.on); this.openMenu(); };
      row.appendChild(el('div', 'r-icon', foodIcon(r.icon)));
      const info = el('div', 'r-info');
      const diets = Object.entries(DIETS).filter(([k]) => r[k]).map(([, d]) => `<span class="diet" title="${d.name}">${d.icon} ${d.name}</span>`).join('');
      info.appendChild(el('div', 'r-name', `${r.name} <small>${CUISINES[r.cuisine].icon} ${CUISINES[r.cuisine].name}</small>`));
      if (diets) info.appendChild(el('div', 'diets', diets));
      const possible = Math.min(...Object.entries(r.ing).map(([k, q]) => Math.floor((s.stock[k]?.qty || 0) / q)));
      info.appendChild(el('div', 'r-meta', `Dificuldade ${'🔥'.repeat(r.difficulty)} · ⏱️ ${r.secs}s · estoque dá para <b>${possible}</b>`));
      info.appendChild(el('div', 'r-meta', `${Object.entries(r.ing).map(([k, q]) => `${INGREDIENTS[k].icon}${q}`).join(' ')} · custo ${fmtBRL(cost)}`));
      const margin = (m.price - cost) / m.price;
      info.appendChild(el('div', 'r-meta strong', `Margem ${pct(margin)} · sugerido ${fmtBRL0(r.price)}`));
      row.appendChild(info);
      const price = el('div', 'price');
      const minus = el('button', 'pm', '−'), plus = el('button', 'pm', '+');
      minus.setAttribute('aria-label', 'Baixar preço'); plus.setAttribute('aria-label', 'Subir preço');
      const val = el('span', 'pval' + (m.price > r.price * 1.1 ? ' hi' : m.price < r.price * 0.9 ? ' lo' : ''), fmtBRL0(m.price));
      minus.onclick = () => { g.setMenu(r.id, null, m.price - 1); this.openMenu(); };
      plus.onclick = () => { g.setMenu(r.id, null, m.price + 1); this.openMenu(); };
      price.append(minus, val, plus);
      const side = el('div', 'mside'); side.append(tog, price);
      row.appendChild(side);
      list.appendChild(row);
    }
    body.appendChild(list);
    // bebidas
    body.appendChild(el('h3', '', '🥤 Bebidas'));
    const hasBar = g.service.bar();
    if (!hasBar) body.appendChild(el('p', 'muted', 'Você precisa de um <b>Bar de Bebidas</b> (Loja → Cozinha e caixa) para vender bebidas.'));
    const dlist = el('div', 'rows');
    for (const d of DRINKS) {
      const m = s.drinks[d.id];
      const cost = recipeCost(d);
      const row = el('div', 'mrow' + (m.on ? '' : ' off'));
      const tog = el('button', 'toggle' + (m.on ? ' on' : ''), m.on ? 'No cardápio' : 'Fora');
      tog.onclick = () => { g.setDrink(d.id, !m.on); this.openMenu(); };
      row.appendChild(el('div', 'r-icon small', foodIcon(d.icon)));
      const info = el('div', 'r-info');
      info.appendChild(el('div', 'r-name', `${d.name}${d.alcohol ? ' <small>🔞 alcoólica</small>' : ''}`));
      const possible = Math.min(...Object.entries(d.ing).map(([k, q]) => Math.floor((s.stock[k]?.qty || 0) / q)));
      info.appendChild(el('div', 'r-meta', `⏱️ ${d.secs}s no bar · custo ${fmtBRL(cost)} · estoque dá para <b>${possible}</b>`));
      info.appendChild(el('div', 'r-meta strong', `Margem ${pct((m.price - cost) / m.price)} · sugerido ${fmtBRL0(d.price)}`));
      row.appendChild(info);
      const price = el('div', 'price');
      const minus = el('button', 'pm', '−'), plus = el('button', 'pm', '+');
      minus.setAttribute('aria-label', 'Baixar preço'); plus.setAttribute('aria-label', 'Subir preço');
      const val = el('span', 'pval' + (m.price > d.price * 1.1 ? ' hi' : m.price < d.price * 0.9 ? ' lo' : ''), fmtBRL0(m.price));
      minus.onclick = () => { g.setDrink(d.id, null, m.price - 1); this.openMenu(); };
      plus.onclick = () => { g.setDrink(d.id, null, m.price + 1); this.openMenu(); };
      price.append(minus, val, plus);
      const side = el('div', 'mside'); side.append(tog, price);
      row.appendChild(side);
      dlist.appendChild(row);
    }
    body.appendChild(dlist);
    this.openModal('📋 Cardápio', body, 'wide');
  }

  // ================= ESTOQUE =================
  openStock() {
    const g = this.game, s = g.state;
    const body = el('div', 'stock');
    const cap = stockCapacity(s), used = stockUsed(s), pend = g.pendingUnits();
    const bar = el('div', 'capbar');
    bar.innerHTML = `<div class="cap-txt">Estoque: <b>${used}</b> em uso + <b>${pend}</b> a caminho, de <b>${cap}</b> espaços</div><div class="cap-track"><div class="used" style="width:${Math.min(100, (used / cap) * 100)}%"></div><div class="pend" style="width:${Math.min(100, (pend / cap) * 100)}%"></div></div>`;
    body.appendChild(bar);
    const sups = el('div', 'chips');
    for (const sp of SUPPLIERS) {
      const b = el('button', 'chip big' + (this.supplier === sp.id ? ' active' : ''), `<b>${sp.name}</b><small>${sp.desc}</small>`);
      b.onclick = () => { this.supplier = sp.id; this.openStock(); };
      sups.appendChild(b);
    }
    body.appendChild(sups);
    const sup = SUPPLIERS.find((x) => x.id === this.supplier);
    const usedBy = new Set([...RECIPES.filter((r) => s.menu[r.id].on), ...DRINKS.filter((d) => s.drinks[d.id]?.on)].flatMap((r) => Object.keys(r.ing)));
    const list = el('div', 'rows');
    const entries = Object.entries(INGREDIENTS).sort((a, b) => usedBy.has(b[0]) - usedBy.has(a[0]));
    for (const [k, ing] of entries) {
      const st = s.stock[k];
      const row = el('div', 'srow' + (usedBy.has(k) ? '' : ' off'));
      row.appendChild(el('div', 'r-icon small', ing.icon));
      const info = el('div', 'r-info');
      const low = usedBy.has(k) && st.qty < 6;
      info.appendChild(el('div', 'r-name', `${ing.name} ${low ? '<span class="warn-tag">acabando</span>' : ''}`));
      info.appendChild(el('div', 'r-meta', `Em estoque: <b>${st.qty}</b> porções${st.qty ? ` · qualidade ${pct(st.q)}` : ''}${usedBy.has(k) ? '' : ' · nenhum prato do cardápio usa'}`));
      row.appendChild(info);
      const acts = el('div', 'buys');
      for (const q of [10, 30]) {
        const cost = ing.price * sup.priceMult * q;
        const b = el('button', 'buy small', `+${q}<small>${fmtBRL(cost)}</small>`);
        b.onclick = () => { if (g.buyIngredient(k, q, sup.id)) { this.toast(`🛒 Pedido feito: ${q}× ${ing.name}. Chega em ${sup.deliveryMin} min.`); this.openStock(); } };
        acts.appendChild(b);
      }
      row.appendChild(acts);
      list.appendChild(row);
    }
    const dsh = s.dishes;
    const plates = el('div', 'srow');
    plates.appendChild(el('div', 'r-icon small', '🍽️'));
    const pinfo = el('div', 'r-info');
    pinfo.appendChild(el('div', 'r-name', `Louça ${dsh.clean < 5 ? '<span class="warn-tag">faltando</span>' : ''}`));
    pinfo.appendChild(el('div', 'r-meta', `<b>${dsh.clean}</b> limpos · <b>${dsh.dirty}</b> sujos na pia · <b>${g.service.platesOut}</b> em uso${dsh.broken ? ` · ${dsh.broken} quebrados até hoje` : ''}`));
    plates.appendChild(pinfo);
    const pb = el('div', 'buys');
    for (const q of [10, 30]) {
      const b = el('button', 'buy small', `+${q}<small>${fmtBRL(q * PLATE_PRICE)}</small>`);
      b.onclick = () => { if (g.buyPlates(q)) this.openStock(); };
      pb.appendChild(b);
    }
    plates.appendChild(pb);
    body.appendChild(plates);
    if (s.deliveries.length) {
      body.appendChild(el('h3', '', '🚚 Entregas a caminho'));
      const ul = el('ul', 'tips');
      for (const d of s.deliveries) {
        const mins = Math.max(0, Math.ceil((d.at - Date.now()) / 60000));
        ul.appendChild(el('li', '', `${INGREDIENTS[d.ing].icon} ${d.qty}× ${INGREDIENTS[d.ing].name}: chega em ${mins} min`));
      }
      body.appendChild(ul);
    }
    body.appendChild(list);
    this.openModal('📦 Estoque e fornecedores', body, 'wide');
  }

  // ================= FINANÇAS =================
  openFinance() {
    const s = this.game.state, m = s.month;
    const body = el('div', 'finance');
    const [y, mo] = m.key.split('-').map(Number);
    const nextMonth = MONTHS[mo % 12];
    const pay = payables(m), tax = taxOf(m);
    const result = m.revenue + m.tips - m.ingredients - (m.purchases || 0) - pay - tax;
    const top = el('div', 'fin-top');
    top.innerHTML = `
      <div class="fin-card"><span>Saldo em caixa</span><b class="${s.cash < 0 ? 'neg' : ''}">${fmtBRL(s.cash)}</b></div>
      <div class="fin-card"><span>A pagar em 1º de ${nextMonth}</span><b class="neg">${fmtBRL(pay + tax)}</b></div>
      <div class="fin-card"><span>Resultado do mês até agora</span><b class="${result < 0 ? 'neg' : 'pos'}">${fmtBRL(result)}</b></div>`;
    body.appendChild(top);
    const tbl = el('table', 'fin');
    const r = (label, v, cls = '', note = '') => `<tr class="${cls}"><td>${label}${note ? ` <small>${note}</small>` : ''}</td><td>${fmtBRL(v)}</td></tr>`;
    tbl.innerHTML = `
      <tr class="head"><td colspan="2">${MONTHS[mo - 1][0].toUpperCase() + MONTHS[mo - 1].slice(1)} de ${y}</td></tr>
      ${r('Vendas', m.revenue, 'pos', `${m.customers} clientes`)}
      ${r('Gorjetas', m.tips, 'pos')}
      <tr class="head"><td colspan="2">Já pago</td></tr>
      ${r('Ingredientes', -m.ingredients)}
      ${r('Equipamentos e decoração', -(m.purchases || 0))}
      <tr class="head"><td colspan="2">Vence no dia 1º (acumulando)</td></tr>
      ${r('Salários', -m.salaries, '', `${fmtBRL0(payroll(s))}/mês`)}
      ${r('Aluguel', -m.rent, '', `${fmtBRL0(rentOf(s))}/mês`)}
      ${r('Energia', -m.energy, '', `${m.kwh.toFixed(1)} kWh`)}
      ${r('Gás', -m.gas)}
      ${r('Água', -m.water, '', `${m.dishes} pratos servidos`)}
      ${r('Impostos (estimado)', -tax, '', `${pct(COSTS.taxRate)} das vendas`)}
      <tr class="total"><td>Resultado</td><td>${fmtBRL(result)}</td></tr>`;
    const wrapT = el('div', 'tbl-wrap'); wrapT.appendChild(tbl);
    body.appendChild(wrapT);
    body.appendChild(el('p', 'muted', `Pratos queimados no mês: <b>${m.burned}</b> · Clientes que foram embora: <b>${m.lost}</b>`));
    if (s.history.length) {
      body.appendChild(el('h3', '', 'Meses anteriores'));
      const h = el('table', 'fin');
      h.innerHTML = s.history.slice(0, 6).map((x) => {
        const [yy, mm] = x.key.split('-').map(Number);
        const res = x.revenue + x.tips - x.ingredients - (x.purchases || 0) - x.paid;
        return `<tr><td>${MONTHS[mm - 1]}/${yy}</td><td>${fmtBRL(res)}</td></tr>`;
      }).join('');
      body.appendChild(h);
    }
    this.openModal('💰 Finanças', body);
  }

  // ================= LOJA =================
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
    if (this.shopCat !== 'cozinha') {
      const themes = el('div', 'chips');
      for (const [id, th] of [['todos', { name: 'Todos', icon: '✨' }], ...Object.entries(THEMES)]) {
        const b = el('button', 'chip' + (id === this.shopTheme ? ' active' : ''), `${th.icon} ${th.name}`);
        b.onclick = () => { this.shopTheme = id; this.openShop(); };
        themes.appendChild(b);
      }
      body.appendChild(themes);
    }
    const grid = el('div', 'grid');
    const items = ITEMS.filter((i) => i.cat === this.shopCat && (this.shopCat === 'cozinha' || this.shopTheme === 'todos' || i.theme === this.shopTheme));
    if (!items.length) grid.appendChild(el('p', 'empty', 'Nenhum item desse estilo nesta categoria ainda.'));
    for (const item of items) {
      const card = el('div', 'card');
      const cv = document.createElement('canvas');
      cv.width = 220; cv.height = 200; cv.className = 'preview';
      this.drawPreview(cv, item);
      card.appendChild(cv);
      card.appendChild(el('div', 'card-name', item.name));
      if (item.desc) card.appendChild(el('div', 'card-desc', item.desc));
      const meta = [];
      if (item.charm) meta.push(`💖 +${item.charm}`);
      meta.push(THEMES[item.theme].icon + ' ' + THEMES[item.theme].name);
      card.appendChild(el('div', 'card-meta', meta.join(' · ')));
      let label = item.price ? fmtBRL0(item.price) : 'Grátis';
      if (item.cat === 'piso') label = item.price ? `${fmtBRL0(item.price)} / quadrado` : 'Grátis';
      if (item.cat === 'parede' && this.game.state.wall === item.id) label = 'Em uso';
      const btn = el('button', 'buy', label);
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
    const tall = ['palm', 'bamboo', 'lamp', 'surfboard', 'pinata', 'statue', 'candle', 'fridge'].includes(item.kind)
      || ['lava_loucas_ind', 'estante', 'cabideiro', 'luminaria', 'caixa_som'].includes(item.id);
    const s = item.kind === 'floor' ? 1.0 : item.kind === 'wall' ? 1.1 : tall ? 1.45 : 1.9;
    ctx.translate(item.kind === 'wall' ? 140 : 110, item.kind === 'floor' ? 70 : item.kind === 'wall' ? 190 : tall ? 190 : 165);
    ctx.scale(s, s);
    drawItem(ctx, item, 0, 0, { t: 0, facing: { dx: 1, dy: 0 } });
    ctx.restore();
  }

  // ================= MAIS =================
  openMore() {
    const body = el('div', 'more');
    const items = [
      ['✏️', 'Editar salão', 'Mover ou vender móveis', () => { this.closeModal(); this.game.setMode('edit'); }],
      ['📐', 'Ampliar', 'Aumentar o tamanho do restaurante', () => this.openExpand()],
      ['⭐', 'Avaliações', 'O que os clientes estão dizendo', () => this.openReviews()],
      ['📅', 'Calendário', 'Próximos feriados e horários', () => this.openCalendar()],
      ['🤝', 'Amigos', 'Em breve', () => this.openFriends()],
      ['⚙️', 'Ajustes', 'Estado, cidade, horários, nome', () => this.openSettings()],
    ];
    for (const [icon, name, desc, fn] of items) {
      const b = el('button', 'more-item', `<span class="mi-icon">${icon}</span><span class="mi-txt"><b>${name}</b><small>${desc}</small></span>`);
      b.onclick = fn;
      body.appendChild(b);
    }
    this.openModal('☰ Mais opções', body, 'center');
  }

  openExpand() {
    const g = this.game;
    const e = g.nextExpansion();
    const body = el('div', 'expand');
    const cur = EXPANSIONS[g.state.expansion];
    body.appendChild(el('p', '', `Tamanho atual: <b>${cur.size}×${cur.size}</b> · aluguel ${fmtBRL0(rentOf(g.state))}/mês`));
    if (!e) body.appendChild(el('p', '', 'O restaurante já está no tamanho máximo deste protótipo. 🏆'));
    else {
      const newRent = Math.round(COSTS.rentBase + COSTS.rentPerTile * (e.size * e.size - 64));
      body.appendChild(el('p', '', `Próxima expansão: <b>${e.size}×${e.size}</b> · obra ${fmtBRL0(e.price)} · novo aluguel ${fmtBRL0(newRent)}/mês`));
      const b = el('button', 'buy big', `Ampliar por ${fmtBRL0(e.price)}`);
      b.disabled = g.state.cash < e.price;
      b.onclick = () => { this.closeModal(); g.expand(); };
      body.appendChild(b);
    }
    this.openModal('📐 Ampliar restaurante', body, 'center');
  }

  openReviews() {
    const s = this.game.state;
    const body = el('div', 'reviews');
    body.appendChild(el('div', 'rep-big', `<b>${s.rep.toFixed(1)}</b><span>${stars(s.rep)}</span><small>Reputação: quanto maior, mais clientes aparecem.</small>`));
    const regs = s.regulars || [];
    body.appendChild(el('h3', '', `⭐ Clientes fiéis (${regs.length})`));
    if (!regs.length) body.appendChild(el('p', 'muted', 'Quem sai muito satisfeito pode virar cliente fiel e voltar sempre, pedindo o prato favorito.'));
    else {
      const rl = el('div', 'regulars');
      for (const r of regs) {
        const fav = RECIPES.find((x) => x.id === r.fav);
        const mood = (r.mood || 0) >= 2 ? '😍' : (r.mood || 0) >= 1 ? '🙂' : '😐';
        rl.appendChild(el('div', 'reg', `<b>${mood} ${r.name}</b><small>${CUSTOMER_TYPES[r.type]?.icon || ''} ${CUSTOMER_TYPES[r.type]?.name || ''} · favorito: ${fav ? fav.icon + ' ' + fav.name : '—'} · ${r.visits || 1} visita(s)</small>`));
      }
      body.appendChild(rl);
    }
    body.appendChild(el('h3', '', '💬 Últimas avaliações'));
    if (!s.reviews.length) body.appendChild(el('p', 'empty', 'Ainda sem avaliações. Elas aparecem quando os clientes vão embora.'));
    for (const r of s.reviews.slice(0, 30)) {
      const d = new Date(r.t);
      const T = CUSTOMER_TYPES[r.type];
      const who = r.critic ? '📰 <b>Crítico gastronômico</b>' : r.regular ? `⭐ ${r.regular}` : T ? `${T.icon} ${T.name}` : '';
      body.appendChild(el('div', 'review' + (r.critic ? ' critic' : ''), `<div class="rv-stars">${stars(r.score)} <small>${r.score.toFixed(1)}</small></div><div>${r.text}</div><small class="muted">${who ? who + ' · ' : ''}Mesa de ${r.size} · ${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small>`));
    }
    this.openModal('⭐ Avaliações', body);
  }

  openCalendar() {
    const s = this.game.state;
    const body = el('div', 'calendar');
    const now = Date.now();
    const uf = STATES.find((x) => x.uf === s.uf);
    const city = (CITIES[s.uf] || []).find((c) => c.id === s.city);
    body.appendChild(el('p', '', `📍 ${city ? city.name + ', ' : ''}${uf.name} · fuso ${uf.tz.replace('America/', '').replace('_', ' ')}`));
    body.appendChild(el('p', '', `Horário: ${s.schedule.shifts.map(([a, b]) => `${hhmm(a)}–${hhmm(b)}`).join(' e ')} · fecha: ${s.schedule.closedDays.map((d) => WEEKDAYS[d].toLowerCase()).join(', ') || 'nenhum dia'}`));
    body.appendChild(el('h3', '', 'Próximos feriados'));
    const ul = el('ul', 'hol');
    let found = 0;
    for (let i = 0; i < 400 && found < 10; i++) {
      const l = local(now + i * 86400000, s.uf);
      const h = holidaysOf(l.year, s.uf, s.city).get(l.md);
      if (!h) continue;
      found++;
      const kind = { nacional: 'Nacional', estadual: 'Estadual', municipal: 'Municipal', facultativo: 'Ponto facultativo · abre normal' }[h.kind];
      ul.appendChild(el('li', h.kind, `<b>${String(l.day).padStart(2, '0')}/${String(l.month).padStart(2, '0')}</b> ${WEEKDAYS_SHORT[l.weekday]} · ${h.name.replace(' (ponto facultativo)', '')} <small>${kind}</small>${i === 0 ? ' <span class="warn-tag">hoje</span>' : ''}`));
    }
    body.appendChild(ul);
    this.openModal('📅 Calendário', body);
  }

  openFriends() {
    const body = el('div', 'friends');
    body.appendChild(el('p', '', 'Em breve você vai poder:'));
    body.appendChild(el('ul', 'lv-list', ['👥 Adicionar amigos', '🚪 Visitar o restaurante deles', '🤝 Ajudar na cozinha e no salão', '🎁 Trocar ingredientes e presentes'].map((t) => `<li>${t}</li>`).join('')));
    body.appendChild(el('p', 'muted', `Seu código de jogador: <code>${this.game.state.playerId}</code>`));
    body.appendChild(el('p', 'muted', 'Imagens de móveis e comidas: Kenney (kenney.nl), licença CC0.'));
    body.appendChild(el('p', 'muted', Social.status()));
    this.openModal('🤝 Amigos', body, 'center');
  }

  openSettings() {
    const g = this.game, s = g.state;
    const body = el('div', 'settings');
    const field = (label, input) => { const f = el('div', 'field'); const l = el('label', '', label); l.htmlFor = input.id; f.append(l, input); body.appendChild(f); };
    const name = el('input'); name.id = 'set-name'; name.value = s.restaurantName; name.maxLength = 24;
    name.onchange = () => { s.restaurantName = name.value.trim() || 'Meu Restaurante'; g.save(); };
    field('Nome do restaurante', name);
    const uf = el('select'); uf.id = 'set-uf';
    for (const x of STATES) { const o = el('option', '', x.name); o.value = x.uf; if (x.uf === s.uf) o.selected = true; uf.appendChild(o); }
    uf.onchange = () => { s.uf = uf.value; s.city = (CITIES[s.uf] || [])[0]?.id || ''; g.save(); this.openSettings(); this.updateHud(); };
    field('Estado (define o fuso horário e os feriados)', uf);
    const city = el('select'); city.id = 'set-city';
    const none = el('option', '', 'Outra cidade (só feriados nacionais e estaduais)'); none.value = ''; city.appendChild(none);
    for (const c of CITIES[s.uf] || []) { const o = el('option', '', c.name); o.value = c.id; if (c.id === s.city) o.selected = true; city.appendChild(o); }
    city.onchange = () => { s.city = city.value; g.save(); this.updateHud(); };
    field('Cidade', city);

    body.appendChild(el('h3', '', 'Horário de funcionamento'));
    s.schedule.shifts.forEach((sh, i) => {
      const row = el('div', 'shift');
      row.appendChild(el('span', '', `${i + 1}º turno`));
      const a = el('input'); a.type = 'time'; a.id = `shift-${i}-a`; a.value = hhmm(sh[0]);
      const b = el('input'); b.type = 'time'; b.id = `shift-${i}-b`; b.value = hhmm(sh[1]);
      const upd = () => {
        const p = (v) => { const [h, m] = v.split(':').map(Number); return h * 60 + m; };
        if (a.value && b.value && p(b.value) > p(a.value)) { sh[0] = p(a.value); sh[1] = p(b.value); g.save(); this.updateHud(); }
      };
      a.onchange = upd; b.onchange = upd;
      row.append(a, el('span', '', 'até'), b);
      body.appendChild(row);
    });
    body.appendChild(el('div', 'lbl', 'Dias em que o restaurante fecha'));
    const days = el('div', 'chips');
    WEEKDAYS_SHORT.forEach((d, i) => {
      const on = s.schedule.closedDays.includes(i);
      const b = el('button', 'chip' + (on ? ' active' : ''), d);
      b.onclick = () => {
        s.schedule.closedDays = on ? s.schedule.closedDays.filter((x) => x !== i) : [...s.schedule.closedDays, i];
        g.save(); this.openSettings(); this.updateHud();
      };
      days.appendChild(b);
    });
    body.appendChild(days);

    body.appendChild(el('h3', '', 'Teste'));
    const prev = el('button', 'buy ' + (s.previewHoliday ? 'warn' : 'ghost'), s.previewHoliday ? 'Desligar pré-visualização de feriado' : 'Pré-visualizar como fica um feriado');
    prev.onclick = () => { s.previewHoliday = !s.previewHoliday; g.save(); this.closeModal(); this.updateHud(); };
    body.appendChild(prev);
    body.appendChild(el('p', 'muted', 'Faz o jogo agir como se hoje fosse feriado, para você testar o modo manual.'));

    body.appendChild(el('p', 'muted', `Clientes atendidos: ${s.stats.served} · Pratos feitos: ${s.stats.cooked}`));
    const reset = el('button', 'buy danger', 'Recomeçar do zero');
    let armed = false;
    reset.onclick = () => {
      if (armed) { g.resetAll(); return; }
      armed = true; reset.textContent = 'Toque de novo para apagar tudo';
      setTimeout(() => { armed = false; reset.textContent = 'Recomeçar do zero'; }, 4000);
    };
    body.appendChild(reset);
    body.appendChild(el('p', 'muted', 'Protótipo v0.5 · o progresso fica salvo neste navegador.'));
    this.openModal('⚙️ Ajustes', body);
  }

  // ================= RELATÓRIOS =================
  showPendingReport() {
    const r = this.game.pendingReport;
    if (!r) return;
    this.game.pendingReport = null;
    const mins = Math.round((r.to - r.from) / 60000);
    const dur = mins >= 1440 ? `${Math.floor(mins / 1440)} dia(s) e ${Math.floor((mins % 1440) / 60)} h` : mins >= 60 ? `${Math.floor(mins / 60)} h ${mins % 60} min` : `${mins} min`;
    const body = el('div', 'report');
    body.appendChild(el('p', '', `Você ficou fora por <b>${dur}</b>. Enquanto isso:`));
    const top = Object.entries(r.dishes).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([id, n]) => `${RECIPES.find((x) => x.id === id).icon} ${n}`).join(' · ');
    const lines = [
      `👥 <b>${r.customers}</b> clientes atendidos (${r.groups} mesas)`,
      `💵 <b>${fmtBRL(r.revenue)}</b> em vendas`,
      top ? `🍽️ Mais pedidos: ${top}` : null,
      r.burned ? `🔥 <b>${r.burned}</b> pratos queimados` : null,
      r.lost ? `😠 Cerca de ${r.lost} clientes foram embora (faltou mesa, equipe ou comida)` : null,
      r.noCook ? `⚠️ Cerca de ${r.noCook} clientes sem atendimento: faltou cozinheiro ou garçom no turno` : null,
      r.noStock ? `📦 Cerca de ${r.noStock} clientes não comeram porque os ingredientes acabaram. Compre no Estoque!` : null,
      r.drinks ? `🥤 ${r.drinks} bebidas vendidas` : null,
      r.noPlates ? `🍽️ ${r.noPlates} pratos não saíram porque faltou louça limpa` : null,
      r.holidayLost ? `🎉 Cerca de ${r.holidayLost} clientes vieram no feriado e não havia ninguém para atender` : null,
      r.delivered ? `🚚 ${r.delivered} entrega(s) de fornecedor recebida(s)` : null,
      r.months.length ? `🧾 ${r.months.length} fechamento(s) de mês: contas pagas` : null,
    ].filter(Boolean);
    if (!r.customers && !r.lost && !r.noCook && !r.noStock) lines.push('🌙 O restaurante estava fechado nesse período.');
    body.appendChild(el('ul', 'lv-list', lines.map((x) => `<li>${x}</li>`).join('')));
    const ok = el('button', 'buy big', 'Entendi'); ok.onclick = () => this.closeModal();
    body.appendChild(ok);
    this.openModal('📰 Enquanto você estava fora', body, 'center');
  }
  monthReport(m) {
    const [y, mo] = m.key.split('-').map(Number);
    const res = m.revenue + m.tips - m.ingredients - (m.purchases || 0) - m.paid;
    const body = el('div', 'report');
    body.appendChild(el('p', '', `Fechamento de <b>${MONTHS[mo - 1]} de ${y}</b>: as contas do mês foram pagas.`));
    body.appendChild(el('ul', 'lv-list', [
      `Vendas: <b>${fmtBRL(m.revenue + m.tips)}</b>`,
      `Salários: ${fmtBRL(m.salaries)} · Aluguel: ${fmtBRL(m.rent)}`,
      `Energia: ${fmtBRL(m.energy)} · Gás: ${fmtBRL(m.gas)} · Água: ${fmtBRL(m.water)}`,
      `Impostos: ${fmtBRL(m.taxes)}`,
      `Resultado: <b class="${res < 0 ? 'neg' : 'pos'}">${fmtBRL(res)}</b>`,
    ].map((x) => `<li>${x}</li>`).join('')));
    const ok = el('button', 'buy big', 'Ok'); ok.onclick = () => this.closeModal();
    body.appendChild(ok);
    this.openModal('🧾 Mês fechado', body, 'center');
  }
}
