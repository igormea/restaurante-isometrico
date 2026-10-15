// Catálogo de receitas. Para adicionar um prato novo, basta incluir um objeto aqui.
// Tempos em segundos (curtos no protótipo para facilitar os testes).
// cost = custo para cozinhar | servings = porções | price = moedas por porção
// spoil = segundos até estragar depois de pronto | level = nível para desbloquear
export const RECIPES = [
  { id: 'sanduiche', name: 'Sanduíche Natural', icon: '🥪', cost: 10, time: 8,   servings: 6,  price: 4,  xp: 2,  spoil: 120, level: 1 },
  { id: 'salada',    name: 'Salada Fresca',     icon: '🥗', cost: 20, time: 20,  servings: 8,  price: 5,  xp: 4,  spoil: 180, level: 1 },
  { id: 'macarrao',  name: 'Macarrão ao Sugo',  icon: '🍝', cost: 45, time: 45,  servings: 10, price: 8,  xp: 8,  spoil: 300, level: 2 },
  { id: 'tacos',     name: 'Tacos',             icon: '🌮', cost: 60, time: 60,  servings: 10, price: 10, xp: 10, spoil: 300, level: 3 },
  { id: 'sushi',     name: 'Sushi',             icon: '🍣', cost: 90, time: 90,  servings: 12, price: 13, xp: 14, spoil: 400, level: 4 },
  { id: 'pizza',     name: 'Pizza',             icon: '🍕', cost: 120, time: 120, servings: 14, price: 15, xp: 18, spoil: 500, level: 5 },
  { id: 'ramen',     name: 'Lámen',             icon: '🍜', cost: 160, time: 150, servings: 14, price: 19, xp: 22, spoil: 500, level: 6 },
  { id: 'moqueca',   name: 'Moqueca',           icon: '🍲', cost: 220, time: 180, servings: 16, price: 23, xp: 28, spoil: 600, level: 7 },
  { id: 'bolo',      name: 'Bolo de Chocolate', icon: '🍰', cost: 300, time: 240, servings: 18, price: 27, xp: 35, spoil: 900, level: 8 },
];

export const recipeById = (id) => RECIPES.find((r) => r.id === id);
