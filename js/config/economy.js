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
};

export const STOCK_BASE = 200;     // espaço do estoque sem geladeira extra
export const STOCK_PER_FRIDGE = 150;

export const DEFAULT_SCHEDULE = {
  shifts: [[11 * 60, 15 * 60], [18 * 60, 23 * 60]], // minutos do dia: 11h-15h e 18h-23h
  closedDays: [1], // segunda-feira fechado
};

// paciência dos clientes (minutos reais)
export const PATIENCE = { door: 5, order: 6, food: 30, bill: 6 };
export const EAT_MIN = [8, 12];
