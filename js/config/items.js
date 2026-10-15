// Catálogo de itens da loja. Tudo que aparece na loja vem daqui.
// kind = como o item é desenhado (ver js/engine/draw.js)
// charm = quanto o item deixa o restaurante mais bonito (atrai mais clientes)
// theme = estilo cultural (o restaurante base é neutro; o tema vem da decoração)

export const THEMES = {
  neutro:   { name: 'Neutro',   icon: '⚪' },
  classico: { name: 'Clássico', icon: '🕯️' },
  japones:  { name: 'Japonês',  icon: '🏮' },
  mexicano: { name: 'Mexicano', icon: '🌵' },
  praiano:  { name: 'Praiano',  icon: '🏖️' },
};

export const CATEGORIES = {
  cozinha: { name: 'Cozinha',  icon: '🍳' },
  salao:   { name: 'Mesas',    icon: '🪑' },
  decor:   { name: 'Decoração', icon: '🪴' },
  piso:    { name: 'Pisos',    icon: '🟫' },
  parede:  { name: 'Paredes',  icon: '🧱' },
};

export const ITEMS = [
  // ---------- Cozinha ----------
  { id: 'fogao_basico', name: 'Fogão Simples', cat: 'cozinha', kind: 'stove', price: 300, level: 1, theme: 'neutro', charm: 0,
    colors: { body: '#d9dde3', top: '#3b3f47', trim: '#9aa3ad' }, speed: 1 },
  { id: 'fogao_inox', name: 'Fogão Inox', cat: 'cozinha', kind: 'stove', price: 1200, level: 4, theme: 'neutro', charm: 1,
    colors: { body: '#b8c4cf', top: '#2b2f36', trim: '#e8eef3' }, speed: 1.25 },
  { id: 'balcao_madeira', name: 'Balcão de Madeira', cat: 'cozinha', kind: 'counter', price: 150, level: 1, theme: 'neutro', charm: 0,
    colors: { body: '#a8754a', top: '#e9dcc6', trim: '#7a5233' } },
  { id: 'balcao_marmore', name: 'Balcão de Mármore', cat: 'cozinha', kind: 'counter', price: 600, level: 3, theme: 'classico', charm: 2,
    colors: { body: '#6d6a75', top: '#f4f2ee', trim: '#c9a35b' } },

  // ---------- Mesas e cadeiras ----------
  { id: 'mesa_simples', name: 'Mesa Simples', cat: 'salao', kind: 'table', price: 80, level: 1, theme: 'neutro', charm: 0,
    colors: { top: '#c89b6d', leg: '#8a6343' } },
  { id: 'cadeira_simples', name: 'Cadeira Simples', cat: 'salao', kind: 'chair', price: 60, level: 1, theme: 'neutro', charm: 0,
    colors: { seat: '#c89b6d', back: '#a57a51' } },
  { id: 'mesa_redonda', name: 'Mesa Redonda Clássica', cat: 'salao', kind: 'table', price: 250, level: 2, theme: 'classico', charm: 1,
    colors: { top: '#f3ede2', leg: '#5a3d2b' }, round: true },
  { id: 'cadeira_estofada', name: 'Cadeira Estofada', cat: 'salao', kind: 'chair', price: 200, level: 2, theme: 'classico', charm: 1,
    colors: { seat: '#9c2f3a', back: '#5a3d2b' } },
  { id: 'mesa_baixa', name: 'Mesa Baixa de Laca', cat: 'salao', kind: 'table', price: 300, level: 3, theme: 'japones', charm: 2,
    colors: { top: '#2a1d1a', leg: '#b3262e' }, low: true },
  { id: 'almofada_zabuton', name: 'Almofada Zabuton', cat: 'salao', kind: 'cushion', price: 180, level: 3, theme: 'japones', charm: 1,
    colors: { seat: '#3f5f8c', back: '#2d4466' } },
  { id: 'mesa_colorida', name: 'Mesa Colorida', cat: 'salao', kind: 'table', price: 280, level: 3, theme: 'mexicano', charm: 2,
    colors: { top: '#f2b134', leg: '#d1495b' } },
  { id: 'cadeira_colorida', name: 'Cadeira Pintada', cat: 'salao', kind: 'chair', price: 190, level: 3, theme: 'mexicano', charm: 1,
    colors: { seat: '#2fa39a', back: '#d1495b' } },
  { id: 'mesa_bambu', name: 'Mesa de Bambu', cat: 'salao', kind: 'table', price: 280, level: 4, theme: 'praiano', charm: 2,
    colors: { top: '#e3c98f', leg: '#a88b4f' } },
  { id: 'cadeira_praia', name: 'Cadeira de Palha', cat: 'salao', kind: 'chair', price: 190, level: 4, theme: 'praiano', charm: 1,
    colors: { seat: '#e8d9a8', back: '#c2a565' } },

  // ---------- Decoração ----------
  { id: 'vaso_planta', name: 'Vaso com Planta', cat: 'decor', kind: 'plant', price: 90, level: 1, theme: 'neutro', charm: 2,
    colors: { pot: '#c96f4a', leaf: '#4f9d5d' } },
  { id: 'luminaria', name: 'Luminária de Chão', cat: 'decor', kind: 'lamp', price: 150, level: 1, theme: 'neutro', charm: 2,
    colors: { pole: '#3d3d45', shade: '#f6e3b4' } },
  { id: 'candelabro', name: 'Candelabro', cat: 'decor', kind: 'candle', price: 400, level: 2, theme: 'classico', charm: 4,
    colors: { metal: '#c9a35b', flame: '#ffcf5a' } },
  { id: 'estatua', name: 'Estátua de Mármore', cat: 'decor', kind: 'statue', price: 900, level: 5, theme: 'classico', charm: 7,
    colors: { stone: '#ebe8e1', base: '#9b968c' } },
  { id: 'lanterna', name: 'Lanterna de Papel', cat: 'decor', kind: 'lantern', price: 350, level: 3, theme: 'japones', charm: 4,
    colors: { paper: '#d7312f', frame: '#2a1d1a' } },
  { id: 'bambu', name: 'Bambuzal', cat: 'decor', kind: 'bamboo', price: 400, level: 3, theme: 'japones', charm: 4,
    colors: { stalk: '#7fae4c', leaf: '#4f8a3a', pot: '#2a1d1a' } },
  { id: 'bonsai', name: 'Bonsai', cat: 'decor', kind: 'bonsai', price: 800, level: 5, theme: 'japones', charm: 7,
    colors: { pot: '#3f5f8c', trunk: '#6b4a32', leaf: '#3f8a4f' } },
  { id: 'cacto', name: 'Cacto', cat: 'decor', kind: 'cactus', price: 300, level: 3, theme: 'mexicano', charm: 4,
    colors: { plant: '#4f9d5d', pot: '#d1495b' } },
  { id: 'barril', name: 'Barril Pintado', cat: 'decor', kind: 'barrel', price: 350, level: 3, theme: 'mexicano', charm: 4,
    colors: { wood: '#a8754a', band: '#2fa39a' } },
  { id: 'pinata', name: 'Piñata', cat: 'decor', kind: 'pinata', price: 750, level: 5, theme: 'mexicano', charm: 7,
    colors: { a: '#f2b134', b: '#d1495b', c: '#2fa39a' } },
  { id: 'coqueiro', name: 'Coqueiro', cat: 'decor', kind: 'palm', price: 450, level: 4, theme: 'praiano', charm: 5,
    colors: { trunk: '#a88b4f', leaf: '#3f9a5a', pot: '#e3c98f' } },
  { id: 'prancha', name: 'Prancha de Surfe', cat: 'decor', kind: 'surfboard', price: 380, level: 4, theme: 'praiano', charm: 4,
    colors: { board: '#3fb6c9', stripe: '#f6f1e3' } },
  { id: 'boia', name: 'Baú do Tesouro', cat: 'decor', kind: 'chest', price: 850, level: 6, theme: 'praiano', charm: 8,
    colors: { wood: '#8a5a33', metal: '#e0b84a' } },

  // ---------- Pisos (pintados por quadrado) ----------
  { id: 'piso_bege', name: 'Piso Bege', cat: 'piso', kind: 'floor', price: 0, level: 1, theme: 'neutro', charm: 0,
    floor: { pattern: 'checker', a: '#efe6d6', b: '#e4d8c3' } },
  { id: 'piso_madeira', name: 'Taco de Madeira', cat: 'piso', kind: 'floor', price: 8, level: 1, theme: 'neutro', charm: 0.1,
    floor: { pattern: 'wood', a: '#c9935f', b: '#b98250' } },
  { id: 'piso_xadrez', name: 'Xadrez Clássico', cat: 'piso', kind: 'floor', price: 12, level: 2, theme: 'classico', charm: 0.15,
    floor: { pattern: 'checker', a: '#f4f2ee', b: '#2f2f36' } },
  { id: 'piso_tatame', name: 'Tatame', cat: 'piso', kind: 'floor', price: 15, level: 3, theme: 'japones', charm: 0.2,
    floor: { pattern: 'tatami', a: '#d8cf98', b: '#5a6b3a' } },
  { id: 'piso_azulejo', name: 'Azulejo Talavera', cat: 'piso', kind: 'floor', price: 15, level: 3, theme: 'mexicano', charm: 0.2,
    floor: { pattern: 'talavera', a: '#f3ede2', b: '#2b5aa8' } },
  { id: 'piso_areia', name: 'Deck de Praia', cat: 'piso', kind: 'floor', price: 15, level: 4, theme: 'praiano', charm: 0.2,
    floor: { pattern: 'wood', a: '#e3c98f', b: '#d4b878' } },

  // ---------- Paredes (todas as paredes de uma vez) ----------
  { id: 'parede_creme', name: 'Parede Creme', cat: 'parede', kind: 'wall', price: 0, level: 1, theme: 'neutro', charm: 0,
    wall: { pattern: 'plain', a: '#f2e8d8', b: '#d9cbb3' } },
  { id: 'parede_listrada', name: 'Papel Listrado', cat: 'parede', kind: 'wall', price: 200, level: 2, theme: 'classico', charm: 2,
    wall: { pattern: 'stripes', a: '#7a2f3a', b: '#8d3a46' } },
  { id: 'parede_shoji', name: 'Painel Shoji', cat: 'parede', kind: 'wall', price: 300, level: 3, theme: 'japones', charm: 3,
    wall: { pattern: 'shoji', a: '#f6f1e3', b: '#5a3d2b' } },
  { id: 'parede_terracota', name: 'Terracota', cat: 'parede', kind: 'wall', price: 300, level: 3, theme: 'mexicano', charm: 3,
    wall: { pattern: 'plain', a: '#d97b4f', b: '#b85f38' } },
  { id: 'parede_mar', name: 'Azul Mar', cat: 'parede', kind: 'wall', price: 300, level: 4, theme: 'praiano', charm: 3,
    wall: { pattern: 'stripes', a: '#bfe6ec', b: '#a6dbe3' } },
];

export const itemById = (id) => ITEMS.find((i) => i.id === id);
