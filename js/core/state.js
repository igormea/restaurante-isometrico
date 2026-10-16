// Estado do jogo: tudo que precisa ser salvo fica aqui, em formato simples (JSON).
// Por ser JSON puro, o mesmo formato poderá ir para um servidor no futuro (modo online).
import { itemById } from '../config/items.js';
import { EXPANSIONS } from '../config/levels.js';
import { RECIPES, INGREDIENTS } from '../config/recipes.js';
import { START_CASH, DEFAULT_SCHEDULE, STOCK_BASE, STOCK_PER_FRIDGE, START_PLATES } from '../config/economy.js';

export const SAVE_VERSION = 2;
// A entrada fica na frente do salão (lado aberto, de frente para quem joga),
// para a fila de clientes na calçada ficar visível.
export const doorOf = (s) => ({ x: 1, y: EXPANSIONS[s.expansion].size - 1 });

function uid() { return Math.random().toString(36).slice(2, 10); }
export const newUid = uid;

export function emptyMonth(key) {
  return { key, revenue: 0, tips: 0, ingredients: 0, salaries: 0, rent: 0, energy: 0, gas: 0, water: 0, equipment: 0, customers: 0, groups: 0, lost: 0, burned: 0, dishes: 0, kwh: 0 };
}

export function createNewState(now, monthKey) {
  const s = {
    version: SAVE_VERSION,
    playerId: 'local-' + uid(),
    restaurantName: 'Meu Restaurante',
    uf: 'CE', city: 'fortaleza',
    cash: START_CASH,
    expansion: 0,
    wall: 'parede_creme',
    floor: {},
    objects: [],
    staff: [],
    hiredIds: [],
    menu: {},
    stock: {},
    deliveries: [],
    schedule: JSON.parse(JSON.stringify(DEFAULT_SCHEDULE)),
    holidayOpen: {},
    previewHoliday: false,
    rep: 3.2,
    reviews: [],
    month: emptyMonth(monthKey),
    history: [],
    days: {},
    dirt: [],
    dishes: { clean: START_PLATES, dirty: 0, broken: 0 },
    v3: true,
    lastTick: now,
    createdAt: now,
    stats: { served: 0, earned: 0, cooked: 0 },
  };
  const add = (item, x, y) => s.objects.push({ uid: uid(), item, x, y, data: {} });
  // cozinha
  add('fogao_basico', 2, 0);
  add('fogao_basico', 3, 0);
  add('balcao_madeira', 5, 0);
  add('vaso_planta', 7, 0);
  add('caixa_reg', 0, 2);
  add('pia', 0, 0);
  // mesa de 4 lugares
  add('mesa_simples', 3, 4);
  add('cadeira_simples', 2, 4); add('cadeira_simples', 4, 4); add('cadeira_simples', 3, 3); add('cadeira_simples', 3, 5);
  // mesa de 4 lugares
  add('mesa_simples', 6, 4);
  add('cadeira_simples', 5, 4); add('cadeira_simples', 7, 4); add('cadeira_simples', 6, 3); add('cadeira_simples', 6, 5);
  // mesa de 2 lugares
  add('mesa_simples', 4, 7);
  add('cadeira_simples', 3, 7); add('cadeira_simples', 5, 7);
  add('luminaria', 7, 7);

  // equipe inicial
  s.staff.push({ id: 'ini-1', name: 'Francisca Lima', role: 'cozinheiro', level: 'novato', specialty: 'brasileira', salary: 1900, speed: 0.85, charisma: 70, look: { skin: '#c98d62', hair: '#2b1d14', hairStyle: 'bun' }, folga: 1, hiredAt: now });
  for (const e of STARTER_V3(now)) s.staff.push(e);
  s.staff.push({ id: 'ini-2', name: 'Pedro Henrique', role: 'garcom', level: 'novato', specialty: null, salary: 1650, speed: 0.9, charisma: 62, look: { skin: '#e8b48f', hair: '#5a3a22', hairStyle: 'short' }, folga: 1, hiredAt: now });

  // cardápio inicial
  const on = new Set(['baiao', 'picanha', 'macarrao', 'burger', 'salada', 'bolo']);
  for (const r of RECIPES) s.menu[r.id] = { on: on.has(r.id), price: r.price };
  // estoque inicial
  for (const k of Object.keys(INGREDIENTS)) s.stock[k] = { qty: 0, q: 1 };
  for (const k of ['arroz', 'feijao', 'carne', 'queijo', 'legumes', 'tomate', 'massa', 'pao', 'farinha', 'ovo', 'chocolate']) s.stock[k] = { qty: 14, q: 1 };
  return s;
}

// funcionários que entraram na v0.3 (lavador e zelador)
const STARTER_V3 = (now) => [
  { id: 'ini-3', name: 'Antônia Sousa', role: 'lavador', level: 'novato', specialty: null, salary: 1520, speed: 0.9, charisma: 58, look: { skin: '#9c6644', hair: '#1a1a1a', hairStyle: 'bun' }, folga: 1, hiredAt: now },
  { id: 'ini-4', name: 'Raimundo Nonato', role: 'zelador', level: 'novato', specialty: null, salary: 1560, speed: 0.95, charisma: 66, look: { skin: '#c98d62', hair: '#cfcfcf', hairStyle: 'short' }, folga: 1, hiredAt: now },
];

export function migrate(data) {
  if (!data || typeof data !== 'object' || data.version !== SAVE_VERSION) return null; // saves antigos (v0.1) recomeçam
  data.objects = (data.objects || []).filter((o) => itemById(o.item));
  for (const r of RECIPES) if (!data.menu[r.id]) data.menu[r.id] = { on: false, price: r.price };
  for (const k of Object.keys(INGREDIENTS)) if (!data.stock[k]) data.stock[k] = { qty: 0, q: 1 };
  data.dirt = data.dirt || [];
  data.dishes = data.dishes || { clean: START_PLATES, dirty: 0, broken: 0 };
  // chegada da v0.3: pia, lavador e zelador para quem já jogava
  if (!data.v3) {
    data.v3 = true;
    const n = EXPANSIONS[data.expansion].size;
    if (!data.objects.some((o) => itemById(o.item).kind === 'sink')) {
      const free = [];
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!data.objects.some((o) => o.x === x && o.y === y) && !(x === 1 && y >= n - 2)) free.push({ x, y });
      const spot = free[0];
      if (spot) data.objects.push({ uid: uid(), item: 'pia', x: spot.x, y: spot.y, data: {} });
    }
    for (const e of STARTER_V3(Date.now())) if (!data.staff.some((x) => x.role === e.role)) data.staff.push(e);
    data._v3News = true;
  }
  return data;
}

// ---------- consultas úteis ----------
export const roomSize = (s) => EXPANSIONS[s.expansion].size;
export const objectAt = (s, x, y) => s.objects.find((o) => o.x === x && o.y === y);
export const inRoom = (s, x, y) => x >= 0 && y >= 0 && x < roomSize(s) && y < roomSize(s);
export const kindOf = (o) => itemById(o.item).kind;
export const countKind = (s, kind) => s.objects.filter((o) => kindOf(o) === kind).length;
export const objectsOfKind = (s, kind) => s.objects.filter((o) => kindOf(o) === kind);

export const SEAT_KINDS = new Set(['chair', 'cushion']);
export const isSeat = (o) => SEAT_KINDS.has(kindOf(o));

export function charm(s) {
  let c = 0;
  for (const o of s.objects) c += itemById(o.item).charm || 0;
  for (const k in s.floor) c += itemById(s.floor[k])?.charm || 0;
  c += itemById(s.wall)?.charm || 0;
  return Math.round(c);
}

export const stockCapacity = (s) => STOCK_BASE + countKind(s, 'fridge') * STOCK_PER_FRIDGE;
export const stockUsed = (s) => Object.values(s.stock).reduce((a, b) => a + b.qty, 0);
export const hygiene = (s) => Math.max(0, Math.round(100 - s.dirt.length * 5 - (s._dirtyTables || 0) * 2 - (s._stains || 0) * 3 - Math.max(0, (s.dishes?.dirty || 0) - 20) * 0.5));
