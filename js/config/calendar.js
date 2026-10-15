// Calendário real do Brasil: estados, fusos horários e feriados.
// Fontes: lei federal de feriados (inclui 20/11 desde a Lei 14.759/2023) e calendários estaduais 2026.

export const STATES = [
  { uf: 'AC', name: 'Acre', tz: 'America/Rio_Branco' },
  { uf: 'AL', name: 'Alagoas', tz: 'America/Maceio' },
  { uf: 'AP', name: 'Amapá', tz: 'America/Belem' },
  { uf: 'AM', name: 'Amazonas', tz: 'America/Manaus' },
  { uf: 'BA', name: 'Bahia', tz: 'America/Bahia' },
  { uf: 'CE', name: 'Ceará', tz: 'America/Fortaleza' },
  { uf: 'DF', name: 'Distrito Federal', tz: 'America/Sao_Paulo' },
  { uf: 'ES', name: 'Espírito Santo', tz: 'America/Sao_Paulo' },
  { uf: 'GO', name: 'Goiás', tz: 'America/Sao_Paulo' },
  { uf: 'MA', name: 'Maranhão', tz: 'America/Fortaleza' },
  { uf: 'MT', name: 'Mato Grosso', tz: 'America/Cuiaba' },
  { uf: 'MS', name: 'Mato Grosso do Sul', tz: 'America/Campo_Grande' },
  { uf: 'MG', name: 'Minas Gerais', tz: 'America/Sao_Paulo' },
  { uf: 'PA', name: 'Pará', tz: 'America/Belem' },
  { uf: 'PB', name: 'Paraíba', tz: 'America/Fortaleza' },
  { uf: 'PR', name: 'Paraná', tz: 'America/Sao_Paulo' },
  { uf: 'PE', name: 'Pernambuco', tz: 'America/Recife' },
  { uf: 'PI', name: 'Piauí', tz: 'America/Fortaleza' },
  { uf: 'RJ', name: 'Rio de Janeiro', tz: 'America/Sao_Paulo' },
  { uf: 'RN', name: 'Rio Grande do Norte', tz: 'America/Fortaleza' },
  { uf: 'RS', name: 'Rio Grande do Sul', tz: 'America/Sao_Paulo' },
  { uf: 'RO', name: 'Rondônia', tz: 'America/Porto_Velho' },
  { uf: 'RR', name: 'Roraima', tz: 'America/Boa_Vista' },
  { uf: 'SC', name: 'Santa Catarina', tz: 'America/Sao_Paulo' },
  { uf: 'SP', name: 'São Paulo', tz: 'America/Sao_Paulo' },
  { uf: 'SE', name: 'Sergipe', tz: 'America/Maceio' },
  { uf: 'TO', name: 'Tocantins', tz: 'America/Araguaina' },
];

// feriados nacionais de data fixa (MM-DD)
const NATIONAL_FIXED = {
  '01-01': 'Confraternização Universal',
  '04-21': 'Tiradentes',
  '05-01': 'Dia do Trabalho',
  '09-07': 'Independência do Brasil',
  '10-12': 'Nossa Senhora Aparecida',
  '11-02': 'Finados',
  '11-15': 'Proclamação da República',
  '11-20': 'Dia da Consciência Negra',
  '12-25': 'Natal',
};

// feriados estaduais de data fixa
const STATE_FIXED = {
  AC: { '01-23': 'Dia do Evangélico', '06-15': 'Aniversário do Acre', '08-06': 'Revolução Acreana', '09-05': 'Dia da Amazônia', '11-17': 'Tratado de Petrópolis' },
  AL: { '06-24': 'São João', '06-29': 'São Pedro', '09-16': 'Emancipação de Alagoas', '11-30': 'Dia do Evangélico' },
  AP: { '03-19': 'São José', '09-13': 'Criação do Amapá' },
  AM: { '09-05': 'Elevação do Amazonas', '12-08': 'Nossa Senhora da Conceição' },
  BA: { '07-02': 'Independência da Bahia' },
  CE: { '03-25': 'Data Magna do Ceará' },
  DF: { '11-30': 'Dia do Evangélico' },
  ES: {},
  GO: {},
  MA: { '07-28': 'Adesão do Maranhão' },
  MT: {},
  MS: { '10-11': 'Criação de Mato Grosso do Sul' },
  MG: {},
  PA: { '08-15': 'Adesão do Pará' },
  PB: { '08-05': 'Fundação da Paraíba' },
  PR: { '12-19': 'Emancipação do Paraná' },
  PE: { '03-06': 'Revolução Pernambucana' },
  PI: { '10-19': 'Dia do Piauí' },
  RJ: { '04-23': 'São Jorge' },
  RN: { '10-03': 'Mártires de Cunhaú e Uruaçu' },
  RS: { '09-20': 'Revolução Farroupilha' },
  RO: { '01-04': 'Criação de Rondônia' },
  RR: { '10-05': 'Criação de Roraima' },
  SC: { '08-11': 'Data Magna de Santa Catarina' },
  SP: { '07-09': 'Revolução Constitucionalista' },
  SE: { '07-08': 'Emancipação de Sergipe' },
  TO: { '09-08': 'Nossa Senhora da Natividade', '10-05': 'Criação do Tocantins' },
};

// feriados estaduais móveis (dias contados a partir da Páscoa)
const STATE_EASTER = {
  ES: { 8: 'Nossa Senhora da Penha' },
  RJ: { [-47]: 'Carnaval' },
};

// cidades com calendário municipal (por enquanto só Fortaleza)
export const CITIES = {
  CE: [{ id: 'fortaleza', name: 'Fortaleza', fixed: { '03-19': 'São José', '08-15': 'Nossa Senhora da Assunção' }, easter: { 60: 'Corpus Christi' } }],
};

// pontos facultativos: mostrados no calendário, mas o restaurante funciona normalmente
const OPTIONAL_EASTER = { [-48]: 'Carnaval (ponto facultativo)', [-47]: 'Carnaval (ponto facultativo)', [-46]: 'Quarta-feira de Cinzas (ponto facultativo)', 60: 'Corpus Christi (ponto facultativo)' };

// Páscoa (algoritmo de Meeus/Jones/Butcher)
export function easter(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const pad = (n) => String(n).padStart(2, '0');
function easterOffset(year, days) {
  const e = easter(year);
  const d = new Date(e.getTime() + days * 86400000);
  return `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

const cache = new Map();
// mapa "MM-DD" -> { name, kind: 'nacional'|'estadual'|'municipal'|'facultativo' }
export function holidaysOf(year, uf, cityId) {
  const key = `${year}|${uf}|${cityId || ''}`;
  if (cache.has(key)) return cache.get(key);
  const map = new Map();
  for (const [off, name] of Object.entries(OPTIONAL_EASTER)) map.set(easterOffset(year, +off), { name, kind: 'facultativo' });
  for (const [md, name] of Object.entries(NATIONAL_FIXED)) map.set(md, { name, kind: 'nacional' });
  map.set(easterOffset(year, -2), { name: 'Sexta-feira Santa', kind: 'nacional' });
  for (const [md, name] of Object.entries(STATE_FIXED[uf] || {})) if (!map.has(md) || map.get(md).kind === 'facultativo') map.set(md, { name, kind: 'estadual' });
  for (const [off, name] of Object.entries(STATE_EASTER[uf] || {})) map.set(easterOffset(year, +off), { name, kind: 'estadual' });
  const city = (CITIES[uf] || []).find((c) => c.id === cityId);
  if (city) {
    for (const [md, name] of Object.entries(city.fixed)) if (!map.has(md) || map.get(md).kind === 'facultativo') map.set(md, { name, kind: 'municipal' });
    for (const [off, name] of Object.entries(city.easter)) map.set(easterOffset(year, +off), { name, kind: 'municipal' });
  }
  cache.set(key, map);
  return map;
}
