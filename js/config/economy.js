// Valores da economia (contas, aluguel, impostos). Ajuste aqui para balancear o jogo.
export const START_CASH = 25000;

export const COSTS = {
  rentBase: 3500,          // aluguel mensal do salão inicial (R$)
  rentPerTile: 45,         // + por quadrado de área
  energyPrice: 0.95,       // R$ por kWh
  baseKwOpen: 2.4,         // luzes, ar-condicionado, som (kW) com o restaurante aberto
  fridgeKw: 0.35,          // por geladeira, 24 horas por dia (kW)
  baseFridgeKw: 0.25,      // freezer básico que já vem com o ponto
  gasPerStoveMin: 0.07,    // R$ por minuto de fogão aceso
  waterPerDish: 0.18,      // R$ de água por prato servido (preparo + lavagem)
  waterPerClean: 0.10,     // R$ por limpeza de mesa/chão
  taxRate: 0.06,           // imposto sobre o faturamento (Simples Nacional, faixa inicial)
  dishwasherKwh: 1.1,      // kWh por ciclo da lava-louças
  dishwasherWater: 0.35,   // R$ de água por ciclo
};

export const STOCK_BASE = 320;     // espaço do estoque sem geladeira extra
export const STOCK_PER_FRIDGE = 150;

export const DEFAULT_SCHEDULE = {
  shifts: [[11 * 60, 15 * 60], [18 * 60, 23 * 60]], // minutos do dia: 11h-15h e 18h-23h
  closedDays: [1], // segunda-feira fechado
};

// paciência dos clientes (minutos reais)
export const PATIENCE = { door: 3, order: 3, food: 8, bill: 3 };
export const EAT_MIN = [2, 3.5];

// louça
export const PLATE_PRICE = 9;        // R$ por prato novo
export const START_PLATES = 30;
export const HAND_WASH_SECS = 4;     // segundos por prato lavado à mão (lavador velocidade 100%)
export const BREAK_CHANCE = { novato: 0.03, experiente: 0.01, chef: 0.003 }; // chance de quebrar ao lavar
