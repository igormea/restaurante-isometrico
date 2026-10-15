// Relógio do jogo = relógio da vida real, no fuso horário do estado escolhido.
// (No futuro, com o modo online, a hora virá do servidor para evitar trapaças.)
import { STATES, holidaysOf } from '../config/calendar.js';

const fmts = new Map();
function fmt(tz) {
  if (!fmts.has(tz)) {
    fmts.set(tz, new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short', hourCycle: 'h23',
    }));
  }
  return fmts.get(tz);
}
const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export const tzOf = (uf) => (STATES.find((s) => s.uf === uf) || STATES[5]).tz;

// partes da data/hora local
export function local(ms, uf) {
  const parts = {};
  for (const p of fmt(tzOf(uf)).formatToParts(new Date(ms))) parts[p.type] = p.value;
  const year = +parts.year, month = +parts.month, day = +parts.day;
  const hour = +parts.hour, minute = +parts.minute, second = +parts.second;
  const pad = (n) => String(n).padStart(2, '0');
  return {
    year, month, day, hour, minute, second,
    weekday: WD[parts.weekday],
    minutes: hour * 60 + minute + second / 60, // minuto do dia
    dateKey: `${year}-${pad(month)}-${pad(day)}`,
    monthKey: `${year}-${pad(month)}`,
    md: `${pad(month)}-${pad(day)}`,
    hhmm: `${pad(hour)}:${pad(minute)}`,
  };
}

export function holidayOn(ms, uf, cityId) {
  const l = local(ms, uf);
  return holidaysOf(l.year, uf, cityId).get(l.md) || null;
}

export const hhmm = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(Math.round(min % 60)).padStart(2, '0')}`;

// dias no mês
export const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
