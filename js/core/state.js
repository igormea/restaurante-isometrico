// Estado do jogo: tudo que precisa ser salvo fica aqui, em formato simples (JSON).
// Por ser JSON puro, o mesmo formato poderá ser enviado a um servidor no futuro
// (ex.: para um amigo visitar o seu restaurante).
import { itemById } from '../config/items.js';
import { EXPANSIONS, START_COINS, levelFromXp } from '../config/levels.js';

export const SAVE_VERSION = 1;
export const DOOR = { x: 0, y: 5 }; // porta fica na parede da esquerda

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function createNewState() {
  const s = {
    version: SAVE_VERSION,
    playerId: 'local-' + uid(), // identificador do jogador (servirá para amigos no futuro)
    restaurantName: 'Meu Restaurante',
    coins: START_COINS,
    xp: 0,
    expansion: 0,
    wall: 'parede_creme',
    floor: {},       // "x,y" -> id do piso
    objects: [],     // itens colocados no salão
    stats: { served: 0, earned: 0, cooked: 0 },
    createdAt: Date.now(),
  };
  const add = (item, x, y) => s.objects.push({ uid: uid(), item, x, y, data: {} });
  add('fogao_basico', 2, 0);
  add('fogao_basico', 3, 0);
  add('balcao_madeira', 5, 0);
  add('vaso_planta', 6, 0);
  add('mesa_simples', 2, 4);
  add('cadeira_simples', 1, 4);
  add('cadeira_simples', 2, 5);
  add('mesa_simples', 4, 4);
  add('cadeira_simples', 5, 4);
  add('cadeira_simples', 4, 5);
  add('luminaria', 0, 1);
  return s;
}

export function migrate(data) {
  if (!data || typeof data !== 'object') return null;
  // Futuras versões do save serão convertidas aqui.
  if (!data.version) return null;
  data.stats = data.stats || { served: 0, earned: 0, cooked: 0 };
  data.floor = data.floor || {};
  data.objects = (data.objects || []).filter((o) => itemById(o.item));
  return data;
}

export const newUid = uid;

// ---------- Consultas úteis ----------
export const level = (s) => levelFromXp(s.xp);
export const roomSize = (s) => EXPANSIONS[s.expansion].size;
export const objectAt = (s, x, y) => s.objects.find((o) => o.x === x && o.y === y);
export const inRoom = (s, x, y) => x >= 0 && y >= 0 && x < roomSize(s) && y < roomSize(s);
export const countKind = (s, kind) => s.objects.filter((o) => itemById(o.item).kind === kind).length;

export const SEAT_KINDS = new Set(['chair', 'cushion']);
export const isSeat = (o) => SEAT_KINDS.has(itemById(o.item).kind);

// Beleza do restaurante: soma do charme dos itens, piso e parede.
export function charm(s) {
  let c = 0;
  for (const o of s.objects) c += itemById(o.item).charm || 0;
  for (const k in s.floor) c += itemById(s.floor[k])?.charm || 0;
  c += itemById(s.wall)?.charm || 0;
  return Math.round(c);
}
