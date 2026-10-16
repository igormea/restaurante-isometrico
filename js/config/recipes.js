// Pratos que o restaurante pode ter no cardápio.
// cuisine = culinária (casa com a especialidade do cozinheiro)
// difficulty = 1 fácil, 2 médio, 3 difícil (aumenta a chance de queimar)
// secs = tempo de preparo em segundos reais | price = preço sugerido (R$)
// ing = ingredientes gastos por prato

export const CUISINES = {
  brasileira: { name: 'Brasileira', icon: '🇧🇷' },
  italiana:   { name: 'Italiana',   icon: '🇮🇹' },
  japonesa:   { name: 'Japonesa',   icon: '🇯🇵' },
  mexicana:   { name: 'Mexicana',   icon: '🇲🇽' },
  lanches:    { name: 'Lanches e doces', icon: '🍔' },
};

export const RECIPES = [
  { id: 'baiao',     name: 'Baião de Dois',      icon: '🍛', cuisine: 'brasileira', difficulty: 1, secs: 55, price: 42, ing: { arroz: 1, feijao: 1, queijo: 1, carne: 1 }, gf: true },
  { id: 'picanha',   name: 'Picanha na Chapa',   icon: '🥩', cuisine: 'brasileira', difficulty: 2, secs: 80, price: 79, ing: { carne: 2, arroz: 1, legumes: 1 }, gf: true, lf: true },
  { id: 'moqueca',   name: 'Moqueca de Peixe',   icon: '🍲', cuisine: 'brasileira', difficulty: 3, secs: 110, price: 89, ing: { peixe: 2, coco: 1, legumes: 1, arroz: 1 }, gf: true, lf: true },
  { id: 'macarrao',  name: 'Macarrão ao Sugo',   icon: '🍝', cuisine: 'italiana',   difficulty: 1, secs: 50, price: 38, ing: { massa: 1, tomate: 1, queijo: 1 }, veg: true },
  { id: 'pizza',     name: 'Pizza Margherita',   icon: '🍕', cuisine: 'italiana',   difficulty: 2, secs: 75, price: 55, ing: { farinha: 1, tomate: 1, queijo: 2 }, veg: true },
  { id: 'sushi',     name: 'Combinado de Sushi', icon: '🍣', cuisine: 'japonesa',   difficulty: 3, secs: 90, price: 65, ing: { arroz: 1, peixe: 2, alga: 1 }, gf: true, lf: true },
  { id: 'lamen',     name: 'Lámen',              icon: '🍜', cuisine: 'japonesa',   difficulty: 2, secs: 65, price: 45, ing: { massa: 1, carne: 1, legumes: 1, ovo: 1 }, lf: true },
  { id: 'tacos',     name: 'Tacos',              icon: '🌮', cuisine: 'mexicana',   difficulty: 1, secs: 35, price: 34, ing: { tortilha: 1, carne: 1, legumes: 1 }, gf: true, lf: true },
  { id: 'burrito',   name: 'Burrito',            icon: '🌯', cuisine: 'mexicana',   difficulty: 2, secs: 50, price: 39, ing: { tortilha: 1, frango: 1, feijao: 1, queijo: 1 } },
  { id: 'burger',    name: 'Hambúrguer',         icon: '🍔', cuisine: 'lanches',    difficulty: 1, secs: 40, price: 32, ing: { pao: 1, carne: 1, queijo: 1, legumes: 1 } },
  { id: 'salada',    name: 'Salada da Casa',     icon: '🥗', cuisine: 'lanches',    difficulty: 1, secs: 25, price: 26, ing: { legumes: 2, queijo: 1 }, veg: true, gf: true },
  { id: 'escondidinho', name: 'Escondidinho de Legumes', icon: '🥘', cuisine: 'brasileira', difficulty: 2, secs: 70, price: 36, ing: { legumes: 2, queijo: 1, farinha: 1 }, veg: true },
  { id: 'bolo',      name: 'Bolo de Chocolate',  icon: '🍰', cuisine: 'lanches',    difficulty: 2, secs: 35, price: 18, ing: { farinha: 1, ovo: 1, chocolate: 1 }, veg: true },
];
export const recipeById = (id) => RECIPES.find((r) => r.id === id);

// Ingredientes: price = custo por porção no fornecedor padrão
export const INGREDIENTS = {
  arroz:     { name: 'Arroz',          icon: '🍚', price: 1.2 },
  feijao:    { name: 'Feijão',         icon: '🫘', price: 1.0 },
  carne:     { name: 'Carne',          icon: '🥩', price: 7.5 },
  frango:    { name: 'Frango',         icon: '🍗', price: 4.0 },
  peixe:     { name: 'Peixe fresco',   icon: '🐟', price: 8.0 },
  queijo:    { name: 'Queijo',         icon: '🧀', price: 2.5 },
  legumes:   { name: 'Legumes e verduras', icon: '🥬', price: 1.6 },
  tomate:    { name: 'Tomate',         icon: '🍅', price: 1.0 },
  massa:     { name: 'Massa',          icon: '🍝', price: 1.3 },
  farinha:   { name: 'Farinha',        icon: '🌾', price: 0.8 },
  ovo:       { name: 'Ovos',           icon: '🥚', price: 0.8 },
  coco:      { name: 'Leite de coco',  icon: '🥥', price: 2.2 },
  alga:      { name: 'Alga nori',      icon: '🟩', price: 1.5 },
  tortilha:  { name: 'Tortilha',       icon: '🫓', price: 1.1 },
  pao:       { name: 'Pão',            icon: '🍞', price: 0.9 },
  chocolate: { name: 'Chocolate',      icon: '🍫', price: 2.0 },
  // bebidas
  agua:      { name: 'Água mineral',   icon: '💧', price: 1.2, drink: true },
  refri:     { name: 'Refrigerante (lata)', icon: '🥤', price: 2.6, drink: true },
  laranja:   { name: 'Laranja',        icon: '🍊', price: 0.9, drink: true },
  cafe:      { name: 'Café em pó',     icon: '☕', price: 0.5, drink: true },
  cerveja:   { name: 'Cerveja (long neck)', icon: '🍺', price: 4.2, drink: true },
  cachaca:   { name: 'Cachaça',        icon: '🥃', price: 2.5, drink: true },
  limao:     { name: 'Limão',          icon: '🍋', price: 0.4, drink: true },
};

// Bebidas: o garçom prepara no bar e leva até a mesa.
// alcohol = não é servida para crianças
export const DRINKS = [
  { id: 'agua',       name: 'Água mineral',     icon: '💧', secs: 2,  price: 5,  ing: { agua: 1 } },
  { id: 'refri',      name: 'Refrigerante',     icon: '🥤', secs: 2,  price: 7,  ing: { refri: 1 } },
  { id: 'suco',       name: 'Suco de laranja',  icon: '🧃', secs: 7,  price: 10, ing: { laranja: 3 } },
  { id: 'cafe',       name: 'Cafezinho',        icon: '☕', secs: 5,  price: 5,  ing: { cafe: 1 } },
  { id: 'cerveja',    name: 'Cerveja',          icon: '🍺', secs: 2,  price: 12, ing: { cerveja: 1 }, alcohol: true },
  { id: 'caipirinha', name: 'Caipirinha',       icon: '🍹', secs: 9,  price: 18, ing: { cachaca: 1, limao: 2 }, alcohol: true },
];
export const drinkById = (id) => DRINKS.find((d) => d.id === id);

export const DIETS = {
  veg: { name: 'Vegetariano', icon: '🥦' },
  gf:  { name: 'Sem glúten', icon: '🌾' },
  lf:  { name: 'Sem lactose', icon: '🥛' },
};
export const fitsDiet = (r, diet) => !diet || !!r[diet];

export const SUPPLIERS = [
  { id: 'atacado', name: 'Atacado do Bairro', priceMult: 1.0, quality: 0.9, deliveryMin: 30, desc: 'Mais barato, qualidade média, entrega em 30 min' },
  { id: 'premium', name: 'Hortifruti Premium', priceMult: 1.4, quality: 1.15, deliveryMin: 15, desc: 'Mais caro, ingredientes frescos, entrega em 15 min' },
];

// custo de ingredientes de um prato
export const recipeCost = (r) => Object.entries(r.ing).reduce((s, [k, q]) => s + INGREDIENTS[k].price * q, 0);
