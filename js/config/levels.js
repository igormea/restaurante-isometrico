// Progressão: XP necessária, fogões liberados e expansões do restaurante.

// XP total para alcançar cada nível (índice = nível)
export const LEVEL_XP = [0, 0, 40, 110, 220, 380, 600, 900, 1300, 1800, 2500, 3400, 4500, 6000];
export const MAX_LEVEL = LEVEL_XP.length - 1;

// Quantos fogões o jogador pode ter em cada nível
export function maxStoves(level) {
  if (level >= 10) return 7;
  if (level >= 8) return 6;
  if (level >= 6) return 5;
  if (level >= 4) return 4;
  if (level >= 2) return 3;
  return 2;
}

// Expansões do salão: tamanho do restaurante (quadrados por lado)
export const EXPANSIONS = [
  { size: 7,  price: 0,     level: 1 },
  { size: 8,  price: 800,   level: 2 },
  { size: 9,  price: 2000,  level: 4 },
  { size: 10, price: 4500,  level: 6 },
  { size: 11, price: 8000,  level: 8 },
  { size: 12, price: 14000, level: 10 },
];

export const START_COINS = 600;

export function levelFromXp(xp) {
  let lvl = 1;
  for (let i = 1; i <= MAX_LEVEL; i++) if (xp >= LEVEL_XP[i]) lvl = i;
  return lvl;
}
