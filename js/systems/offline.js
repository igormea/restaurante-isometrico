// Simulação de quando o jogo estava fechado.
// O navegador não roda o jogo fechado, então ao voltar calculamos o que aconteceu
// no intervalo (clientes, vendas, ingredientes, contas) e mostramos um relatório.
import { statusAt, staffOnDuty } from './schedule.js';
import { accrue } from './economy.js';
import { objectsOfKind } from '../core/state.js';
import { RECIPES } from '../config/recipes.js';
import { LEVELS } from '../config/staff.js';
import { COSTS } from '../config/economy.js';
import { seatsOf } from './service.js';

const STEP = 5 * 60000; // passos de 5 minutos
const MAX_DAYS = 60;

export function simulateOffline(game, from, to) {
  const s = game.state;
  from = Math.max(from, to - MAX_DAYS * 86400000);
  const rep = { from, to, customers: 0, groups: 0, lost: 0, revenue: 0, burned: 0, dishes: {}, ingredients: 0, months: [], noCook: 0, holidayLost: 0, delivered: 0, noStock: 0, noPlates: 0 };
  let acc = 0;
  const tables = objectsOfKind(s, 'table').map((t) => seatsOf(s, t).length).filter((n) => n > 0);
  for (let t = from; t < to; t += STEP) {
    const t2 = Math.min(to, t + STEP);
    accrue(s, t, t2, (m) => rep.months.push(m));
    // entregas de fornecedor
    for (const d of [...s.deliveries]) if (d.at <= t2) { game.receiveDelivery(d); rep.delivered++; }
    const st = statusAt(s, t);
    if (!st.open) continue;
    const hours = (t2 - t) / 3600000;
    const rate = game.service.arrivalRate(st) * hours;
    if (st.isHoliday) { rep.holidayLost += rate; s.rep = Math.max(1, s.rep - rate * 0.01); continue; }
    const duty = staffOnDuty(s, st);
    const cooks = duty.filter((e) => e.role === 'cozinheiro');
    const waiters = duty.filter((e) => e.role === 'garcom');
    if (!cooks.length || !waiters.length) { rep.noCook += rate; s.rep = Math.max(1, s.rep - rate * 0.01); continue; }
    const avail = game.service.availableRecipes();
    if (!avail.length) { rep.noStock += rate; continue; }
    // capacidade por hora (grupos)
    const avgSecs = avail.reduce((a, r) => a + r.secs, 0) / avail.length;
    const stoves = objectsOfKind(s, 'stove').length;
    const busyStoves = Math.min(cooks.length * 2, stoves);
    const cookCap = (busyStoves * 3600 / (avgSecs / avgSpeed(cooks) + 20)) / 2.6;
    const helpers = duty.filter((e) => e.role === 'recepcionista' || e.role === 'caixa').length;
    const waiterCap = waiters.length * 11 + helpers * 4;
    const tableCap = tables.length * (60 / 8);
    const cap = Math.min(cookCap, waiterCap, tableCap) * hours;
    // louça: com lavador (ou lava-louças) tudo que sujou volta limpo
    const washers = duty.filter((e) => e.role === 'lavador').length;
    const machines = objectsOfKind(s, 'dishwasher').length;
    const washCap = (washers ? washers * 500 + machines * 600 : waiters.length * 40) * hours;
    const w = Math.min(s.dishes.dirty, washCap);
    s.dishes.dirty -= w; s.dishes.clean += w;
    if (machines && washers) { const cycles = w / 15; s.month.energy += cycles * COSTS.dishwasherKwh * COSTS.energyPrice; s.month.kwh += cycles * COSTS.dishwasherKwh; s.month.water += cycles * COSTS.dishwasherWater; }
    if (w && !machines) { s.month.water += w * 0.05; for (let i = 0; i < w; i++) if (Math.random() < 0.015) { s.dishes.clean--; s.dishes.broken = (s.dishes.broken || 0) + 1; } }
    // limpeza: o zelador dá conta da sujeira do turno
    const janitors = duty.filter((e) => e.role === 'zelador').length;
    if (janitors) { if (s.dirt.length) s.month.water += s.dirt.length * COSTS.waterPerClean; s.dirt = []; }
    const served = Math.min(rate, cap);
    rep.lost += Math.max(0, rate - cap);
    acc += served;
    while (acc >= 1) {
      acc -= 1;
      const size = [1, 2, 2, 2, 3, 3, 4, 4][Math.floor(Math.random() * 8)];
      let paid = 0, eaten = 0;
      for (let i = 0; i < size; i++) {
        const list = game.service.availableRecipes();
        if (!list.length) break;
        const r = list[Math.floor(Math.random() * list.length)];
        if (s.dishes.clean <= 0) { rep.noPlates++; break; }
        const cook = cooks[Math.floor(Math.random() * cooks.length)];
        const burn = LEVELS[cook.level].burn * ({ 1: 0.6, 2: 1, 3: 1.6 }[r.difficulty]) * (cook.specialty === r.cuisine ? 0.1 : 1);
        game.service.consume(r);
        s.month.gas += (r.secs / 60) * COSTS.gasPerStoveMin;
        if (Math.random() < burn) { rep.burned++; s.month.burned++; if (!game.service.consume(r)) continue; }
        paid += s.menu[r.id].price; eaten++;
        s.dishes.clean--; s.dishes.dirty++;
        rep.dishes[r.id] = (rep.dishes[r.id] || 0) + 1;
        s.month.water += COSTS.waterPerDish; s.month.dishes++;
      }
      if (!eaten) { rep.lost += 1; continue; }
      s.cash += paid; s.month.revenue += paid; s.month.customers += size; s.month.groups++;
      s.stats.served += size; s.stats.earned += paid;
      rep.customers += size; rep.groups++; rep.revenue += paid;
      const k = st.l.dateKey;
      const d = (s.days[k] = s.days[k] || { revenue: 0, customers: 0, lost: 0 });
      d.revenue += paid; d.customers += size;
      // reputação tende à qualidade média da equipe
      const q = cooks.reduce((a, c) => a + LEVELS[c.level].quality, 0) / cooks.length;
      s.rep += (Math.min(5, q + 0.6) - s.rep) * 0.02;
      if (!janitors && Math.random() < 0.3 && s.dirt.length < 14) s.dirt.push({ x: 1 + Math.floor(Math.random() * 5), y: 2 + Math.floor(Math.random() * 4), k: Math.floor(Math.random() * 3) });
    }
  }
  // limpa sujeira impossível (em cima de móveis)
  s.dirt = s.dirt.filter((d) => !s.objects.some((o) => o.x === d.x && o.y === d.y));
  rep.lost = Math.round(rep.lost * 2.5);
  rep.noCook = Math.round(rep.noCook * 2.5);
  rep.holidayLost = Math.round(rep.holidayLost * 2.5);
  rep.noStock = Math.round(rep.noStock * 2.5);
  return rep;
}

const avgSpeed = (list) => list.reduce((a, e) => a + e.speed, 0) / list.length;
export { RECIPES };
