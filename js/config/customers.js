// Tipos de cliente. Cada tipo tem tamanho de grupo, paciência, gosto e jeito de avaliar.
// weight = frequência | patience = multiplicador da paciência | priceSens = quanto se importa com preço
// drink = chance de pedir bebida | drinks = bebidas preferidas | charmMult = quanto valoriza a decoração
export const CUSTOMER_TYPES = {
  comum:     { name: 'Cliente comum', icon: '🙂', weight: 34, sizes: [1, 2, 2, 3, 4], patience: 1.0, priceSens: 1.0, drink: 0.6, drinks: ['refri', 'agua', 'suco', 'cerveja'], charmMult: 1, eat: 1 },
  executivo: { name: 'Executivo', icon: '💼', weight: 14, sizes: [1, 1, 2], patience: 0.7, priceSens: 0.5, drink: 0.7, drinks: ['cafe', 'agua', 'refri'], charmMult: 0.8, eat: 0.7, waitMult: 1.5, look: { shirt: '#2f3e55', pants: '#1f2430' } },
  familia:   { name: 'Família', icon: '👨‍👩‍👧', weight: 14, sizes: [3, 4, 4], kids: true, patience: 1.1, priceSens: 1.2, drink: 0.8, drinks: ['suco', 'refri', 'agua'], charmMult: 1, eat: 1.2, messy: 2 },
  casal:     { name: 'Casal', icon: '💑', weight: 13, sizes: [2], patience: 1.2, priceSens: 0.8, drink: 0.85, drinks: ['caipirinha', 'cerveja', 'suco'], charmMult: 2, eat: 1.3 },
  turista:   { name: 'Turista', icon: '📷', weight: 9, sizes: [1, 2, 2, 3], patience: 1.2, priceSens: 0.6, drink: 0.8, drinks: ['caipirinha', 'suco', 'cerveja'], charmMult: 1.2, eat: 1.1, loves: 'brasileira', look: { hat: 'sun' } },
  estudante: { name: 'Estudante', icon: '🎒', weight: 11, sizes: [1, 2, 3, 4], patience: 1.0, priceSens: 2.2, drink: 0.5, drinks: ['refri', 'agua', 'cerveja'], charmMult: 0.7, eat: 0.9 },
  chato:     { name: 'Cliente exigente', icon: '😤', weight: 5, sizes: [1, 2], patience: 0.8, priceSens: 1.3, drink: 0.5, drinks: ['agua', 'cafe'], charmMult: 1, eat: 1, grumpy: 0.7 },
};

// o crítico gastronômico chega disfarçado de cliente comum: só descobrimos depois
export const CRITIC_CHANCE = 0.025;
export const CRITIC_WEIGHT = 6; // a avaliação dele pesa como várias avaliações

export const DIET_CHANCE = { veg: 0.1, gf: 0.05, lf: 0.06 };

// clientes fiéis
export const REGULAR = {
  joinScore: 4.2,   // nota mínima para virar cliente fiel
  joinChance: 0.45,
  returnChance: 0.25, // chance de um grupo novo trazer um fiel
  max: 30,
};
const FIRST_M = ['Zé', 'Raimundo', 'Chico', 'Antônio', 'Joaquim', 'Severino', 'Toninho', 'Paulo', 'Márcio', 'Edson'];
const FIRST_F = ['Maria', 'Fátima', 'Socorro', 'Lúcia', 'Rita', 'Cláudia', 'Neide', 'Luíza', 'Vera', 'Graça'];
export function regularName() {
  const f = Math.random() < 0.5;
  const list = f ? FIRST_F : FIRST_M;
  return (f ? 'Dona ' : 'Seu ') + list[Math.floor(Math.random() * list.length)];
}

export function pickType() {
  const entries = Object.entries(CUSTOMER_TYPES);
  let r = Math.random() * entries.reduce((a, [, t]) => a + t.weight, 0);
  for (const [id, t] of entries) { r -= t.weight; if (r <= 0) return id; }
  return 'comum';
}
