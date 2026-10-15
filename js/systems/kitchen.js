// Regras da cozinha: fogões cozinhando, pratos prontos/estragados e balcões.
// Usa horários reais (Date.now) — então a comida continua cozinhando mesmo com o jogo fechado.
import { recipeById } from '../config/recipes.js';
import { itemById } from '../config/items.js';

export function stoveStatus(obj, now = Date.now()) {
  const d = obj.data || {};
  if (!d.recipe) return { state: d._pending === 'cook' ? 'waiting' : 'idle' };
  const recipe = recipeById(d.recipe);
  if (now < d.end) {
    const progress = (now - d.start) / (d.end - d.start);
    return { state: 'cooking', recipe, progress, remaining: (d.end - now) / 1000 };
  }
  if (now < d.spoilAt) return { state: 'ready', recipe, remaining: (d.spoilAt - now) / 1000 };
  return { state: 'spoiled', recipe };
}

export function startCooking(obj, recipeId, now = Date.now()) {
  const r = recipeById(recipeId);
  const speed = itemById(obj.item).speed || 1;
  obj.data.recipe = recipeId;
  obj.data.start = now;
  obj.data.end = now + (r.time * 1000) / speed;
  obj.data.spoilAt = obj.data.end + r.spoil * 1000;
}

export function clearStove(obj) {
  obj.data = {};
}

// encontra um balcão que aceite esse prato (mesmo prato ou vazio)
export function findCounterFor(state, recipeId) {
  const counters = state.objects.filter((o) => itemById(o.item).kind === 'counter');
  return counters.find((c) => (c.data.recipe === recipeId && c.data.servings > 0) || c.data._incoming === recipeId)
    || counters.find((c) => !c.data.recipe && !c.data._incoming);
}

export function countersWithFood(state) {
  return state.objects.filter((o) => itemById(o.item).kind === 'counter' && o.data.recipe && o.data.servings > 0);
}

// formata segundos em "1m 20s"
export function fmtTime(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}
