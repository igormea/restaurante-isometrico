// Dinheiro: contas que vão acumulando no mês (aluguel, salários, energia, gás, água)
// e o fechamento do mês, quando tudo é cobrado de uma vez — como na vida real.
import { COSTS } from '../config/economy.js';
import { EXPANSIONS } from '../config/levels.js';
import { local, daysInMonth } from '../core/clock.js';
import { emptyMonth, countKind } from '../core/state.js';
import { statusAt } from './schedule.js';

export const rentOf = (s) => {
  const n = EXPANSIONS[s.expansion].size;
  return Math.round(COSTS.rentBase + COSTS.rentPerTile * (n * n - 64));
};
export const payroll = (s) => s.staff.reduce((a, e) => a + e.salary, 0);

// contas do mês ainda não pagas
export function payables(m) {
  return m.salaries + m.rent + m.energy + m.gas + m.water + m.equipment;
}
export const taxOf = (m) => m.revenue * COSTS.taxRate;

// acumula custos contínuos entre dois instantes (usado ao vivo e na simulação offline)
export function accrue(state, ms0, ms1, onMonthClose) {
  let t = ms0;
  while (t < ms1) {
    const l = local(t, state.uf);
    if (l.monthKey !== state.month.key) { closeMonth(state, l.monthKey, onMonthClose); }
    // fatia até no máximo 10 minutos para respeitar mudanças de aberto/fechado
    const t2 = Math.min(ms1, t + 10 * 60000);
    const dtMs = t2 - t;
    const monthMs = daysInMonth(l.year, l.month) * 86400000;
    const m = state.month;
    m.salaries += payroll(state) * dtMs / monthMs;
    m.rent += rentOf(state) * dtMs / monthMs;
    const st = statusAt(state, t);
    const kw = COSTS.baseFridgeKw + countKind(state, 'fridge') * COSTS.fridgeKw + (st.open ? COSTS.baseKwOpen : 0);
    const kwh = kw * dtMs / 3600000;
    m.kwh += kwh;
    m.energy += kwh * COSTS.energyPrice;
    t = t2;
  }
}

function closeMonth(state, newKey, cb) {
  const m = state.month;
  const tax = taxOf(m);
  const bill = payables(m) + tax;
  state.cash -= bill;
  const closed = { ...m, taxes: tax, paid: bill };
  state.history.unshift(closed);
  state.history = state.history.slice(0, 24);
  state.month = emptyMonth(newKey);
  if (cb) cb(closed);
}

export const fmtBRL = (v) => (v < 0 ? '-' : '') + 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtBRL0 = (v) => (v < 0 ? '-' : '') + 'R$ ' + Math.round(Math.abs(v)).toLocaleString('pt-BR');
