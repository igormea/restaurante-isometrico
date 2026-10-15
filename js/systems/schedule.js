// Horário de funcionamento, feriados e folgas: decide se o restaurante está aberto agora.
import { local, holidayOn, hhmm, WEEKDAYS } from '../core/clock.js';

export function statusAt(state, ms) {
  const l = local(ms, state.uf);
  let holiday = holidayOn(ms, state.uf, state.city);
  if (state.previewHoliday) holiday = { name: 'Feriado (pré-visualização)', kind: 'teste' };
  const isHoliday = !!holiday && holiday.kind !== 'facultativo';
  const shifts = state.schedule.shifts;
  const inShift = shifts.some(([a, b]) => l.minutes >= a && l.minutes < b);
  const closedDay = state.schedule.closedDays.includes(l.weekday);
  const holidayOpen = isHoliday && !!state.holidayOpen[l.dateKey];
  const open = inShift && (isHoliday ? holidayOpen : !closedDay);
  return { l, holiday, isHoliday, inShift, closedDay, open, holidayOpen, manualDay: isHoliday };
}

// funcionários que trabalham neste momento
export function staffOnDuty(state, st) {
  if (!st.open || st.isHoliday) return [];
  return state.staff.filter((e) => e.folga !== st.l.weekday);
}

export function statusLabel(state, st) {
  if (st.isHoliday && !st.holidayOpen) return { tag: 'feriado', text: `Feriado: ${st.holiday.name}` };
  if (st.open && st.isHoliday) return { tag: 'manual', text: 'Aberto · modo manual' };
  if (st.open) {
    const sh = state.schedule.shifts.find(([a, b]) => st.l.minutes >= a && st.l.minutes < b);
    return { tag: 'aberto', text: `Aberto até ${hhmm(sh[1])}` };
  }
  if (st.closedDay) return { tag: 'fechado', text: `Fechado (${WEEKDAYS[st.l.weekday].toLowerCase()} é dia de folga)` };
  const next = state.schedule.shifts.find(([a]) => a > st.l.minutes);
  return { tag: 'fechado', text: next ? `Fechado · abre às ${hhmm(next[0])}` : 'Fechado · abre amanhã' };
}
