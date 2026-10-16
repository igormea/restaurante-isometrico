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
  cozinha: { name: 'Cozinha e caixa',  icon: '🍳' },
  salao:   { name: 'Mesas',    icon: '🪑' },
  decor:   { name: 'Decoração', icon: '🪴' },
  piso:    { name: 'Pisos',    icon: '🟫' },
  parede:  { name: 'Paredes',  icon: '🧱' },
};

export const ITEMS = [
  // ---------- Cozinha ----------
  { id: 'fogao_basico', name: 'Fogão Industrial 4 bocas', cat: 'cozinha', kind: 'stove', price: 1800, theme: 'neutro', charm: 0,
    colors: { body: '#d9dde3', top: '#3b3f47', trim: '#9aa3ad' }, speed: 1, burnMult: 1, desc: 'Um cozinheiro por fogão.' },
  { id: 'fogao_inox', name: 'Fogão Inox Profissional', cat: 'cozinha', kind: 'stove', price: 4800, theme: 'neutro', charm: 1,
    colors: { body: '#b8c4cf', top: '#2b2f36', trim: '#e8eef3' }, speed: 1.15, burnMult: 0.7, desc: '15% mais rápido e queima 30% menos.' },
  { id: 'balcao_madeira', name: 'Balcão de Passe', cat: 'cozinha', kind: 'counter', price: 900, theme: 'neutro', charm: 0,
    colors: { body: '#a8754a', top: '#e9dcc6', trim: '#7a5233' }, desc: 'Onde os pratos prontos esperam o garçom (até 4).' },
  { id: 'balcao_marmore', name: 'Passe de Mármore', cat: 'cozinha', kind: 'counter', price: 2600, theme: 'classico', charm: 2,
    colors: { body: '#6d6a75', top: '#f4f2ee', trim: '#c9a35b' }, desc: 'Passe elegante (até 4 pratos).' },
  { id: 'geladeira', name: 'Geladeira Industrial', cat: 'cozinha', kind: 'fridge', price: 3200, theme: 'neutro', charm: 0,
    colors: { body: '#e6ebf0', trim: '#9aa3ad' }, desc: '+150 de espaço no estoque. Consome energia 24h.' },
  { id: 'pia', name: 'Pia de Louça', cat: 'cozinha', kind: 'sink', price: 1500, theme: 'neutro', charm: 0,
    colors: { body: '#c9d1d9', top: '#eef2f5', trim: '#8a96a3' }, desc: 'Onde o lavador lava a louça à mão. Os pratos sujos se acumulam aqui.' },
  { id: 'lava_loucas', name: 'Lava-louças Compacta', cat: 'cozinha', kind: 'dishwasher', price: 6500, theme: 'neutro', charm: 0,
    colors: { body: '#d5dbe1', trim: '#5b6370' }, capacity: 15, cycle: 90, desc: 'Lava 15 pratos a cada 1min30. O lavador só carrega e descarrega. Gasta energia e água.' },
  { id: 'lava_loucas_ind', name: 'Lava-louças Industrial', cat: 'cozinha', kind: 'dishwasher', price: 14000, theme: 'neutro', charm: 0,
    colors: { body: '#aeb9c4', trim: '#2b2f36' }, capacity: 30, cycle: 75, desc: 'Lava 30 pratos a cada 1min15. Para restaurantes cheios.' },
  { id: 'bar_bebidas', name: 'Bar de Bebidas', cat: 'cozinha', kind: 'bar', price: 2400, theme: 'neutro', charm: 1,
    colors: { body: '#6b4a32', top: '#d9c3a0', trim: '#c9a35b' }, desc: 'Onde o garçom prepara sucos, cafés, cervejas e caipirinhas. Sem ele, o restaurante não vende bebidas.' },
  { id: 'caixa_reg', name: 'Caixa Registradora', cat: 'cozinha', kind: 'register', price: 1200, theme: 'neutro', charm: 0,
    colors: { body: '#7a5233', top: '#e9dcc6', trim: '#3b3f47' }, desc: 'Onde os clientes pagam a conta.' },

  // ---------- Mesas e cadeiras ----------
  { id: 'mesa_simples', name: 'Mesa Simples', cat: 'salao', kind: 'table', price: 480, theme: 'neutro', charm: 0,
    colors: { top: '#c89b6d', leg: '#8a6343' } },
  { id: 'cadeira_simples', name: 'Cadeira Simples', cat: 'salao', kind: 'chair', price: 360, theme: 'neutro', charm: 0,
    colors: { seat: '#c89b6d', back: '#a57a51' } },
  { id: 'mesa_redonda', name: 'Mesa Redonda Clássica', cat: 'salao', kind: 'table', price: 1500, theme: 'classico', charm: 1,
    colors: { top: '#f3ede2', leg: '#5a3d2b' }, round: true },
  { id: 'cadeira_estofada', name: 'Cadeira Estofada', cat: 'salao', kind: 'chair', price: 1200, theme: 'classico', charm: 1,
    colors: { seat: '#9c2f3a', back: '#5a3d2b' } },
  { id: 'mesa_baixa', name: 'Mesa Baixa de Laca', cat: 'salao', kind: 'table', price: 1800, theme: 'japones', charm: 2,
    colors: { top: '#2a1d1a', leg: '#b3262e' }, low: true },
  { id: 'almofada_zabuton', name: 'Almofada Zabuton', cat: 'salao', kind: 'cushion', price: 1080, theme: 'japones', charm: 1,
    colors: { seat: '#3f5f8c', back: '#2d4466' } },
  { id: 'mesa_colorida', name: 'Mesa Colorida', cat: 'salao', kind: 'table', price: 1680, theme: 'mexicano', charm: 2,
    colors: { top: '#f2b134', leg: '#d1495b' } },
  { id: 'cadeira_colorida', name: 'Cadeira Pintada', cat: 'salao', kind: 'chair', price: 1140, theme: 'mexicano', charm: 1,
    colors: { seat: '#2fa39a', back: '#d1495b' } },
  { id: 'mesa_bambu', name: 'Mesa de Bambu', cat: 'salao', kind: 'table', price: 1680, theme: 'praiano', charm: 2,
    colors: { top: '#e3c98f', leg: '#a88b4f' } },
  { id: 'cadeira_praia', name: 'Cadeira de Palha', cat: 'salao', kind: 'chair', price: 1140, theme: 'praiano', charm: 1,
    colors: { seat: '#e8d9a8', back: '#c2a565' } },

  // ---------- Decoração ----------
  { id: 'vaso_planta', name: 'Vaso com Planta', cat: 'decor', kind: 'plant', price: 540, theme: 'neutro', charm: 2,
    colors: { pot: '#c96f4a', leaf: '#4f9d5d' } },
  { id: 'luminaria', name: 'Luminária de Chão', cat: 'decor', kind: 'lamp', price: 900, theme: 'neutro', charm: 2,
    colors: { pole: '#3d3d45', shade: '#f6e3b4' } },
  { id: 'candelabro', name: 'Candelabro', cat: 'decor', kind: 'candle', price: 2400, theme: 'classico', charm: 4,
    colors: { metal: '#c9a35b', flame: '#ffcf5a' } },
  { id: 'estatua', name: 'Estátua de Mármore', cat: 'decor', kind: 'statue', price: 5400, theme: 'classico', charm: 7,
    colors: { stone: '#ebe8e1', base: '#9b968c' } },
  { id: 'lanterna', name: 'Lanterna de Papel', cat: 'decor', kind: 'lantern', price: 2100, theme: 'japones', charm: 4,
    colors: { paper: '#d7312f', frame: '#2a1d1a' } },
  { id: 'bambu', name: 'Bambuzal', cat: 'decor', kind: 'bamboo', price: 2400, theme: 'japones', charm: 4,
    colors: { stalk: '#7fae4c', leaf: '#4f8a3a', pot: '#2a1d1a' } },
  { id: 'bonsai', name: 'Bonsai', cat: 'decor', kind: 'bonsai', price: 4800, theme: 'japones', charm: 7,
    colors: { pot: '#3f5f8c', trunk: '#6b4a32', leaf: '#3f8a4f' } },
  { id: 'cacto', name: 'Cacto', cat: 'decor', kind: 'cactus', price: 1800, theme: 'mexicano', charm: 4,
    colors: { plant: '#4f9d5d', pot: '#d1495b' } },
  { id: 'barril', name: 'Barril Pintado', cat: 'decor', kind: 'barrel', price: 2100, theme: 'mexicano', charm: 4,
    colors: { wood: '#a8754a', band: '#2fa39a' } },
  { id: 'pinata', name: 'Piñata', cat: 'decor', kind: 'pinata', price: 4500, theme: 'mexicano', charm: 7,
    colors: { a: '#f2b134', b: '#d1495b', c: '#2fa39a' } },
  { id: 'coqueiro', name: 'Coqueiro', cat: 'decor', kind: 'palm', price: 2700, theme: 'praiano', charm: 5,
    colors: { trunk: '#a88b4f', leaf: '#3f9a5a', pot: '#e3c98f' } },
  { id: 'prancha', name: 'Prancha de Surfe', cat: 'decor', kind: 'surfboard', price: 2280, theme: 'praiano', charm: 4,
    colors: { board: '#3fb6c9', stripe: '#f6f1e3' } },
  { id: 'boia', name: 'Baú do Tesouro', cat: 'decor', kind: 'chest', price: 5100, theme: 'praiano', charm: 8,
    colors: { wood: '#8a5a33', metal: '#e0b84a' } },

  // ---------- Decoração moderna (imagens do Kenney) ----------
  { id: 'poltrona', name: 'Poltrona', cat: 'decor', kind: 'prop', price: 1600, theme: 'neutro', charm: 3, colors: { body: '#e05a4a' } },
  { id: 'estante', name: 'Estante de Livros', cat: 'decor', kind: 'prop', price: 1900, theme: 'classico', charm: 4, colors: { body: '#c9935f' } },
  { id: 'tv', name: 'TV de Tela Plana', cat: 'decor', kind: 'prop', price: 2800, theme: 'neutro', charm: 3, colors: { body: '#3b3f47' } },
  { id: 'caixa_som', name: 'Caixa de Som', cat: 'decor', kind: 'prop', price: 1200, theme: 'neutro', charm: 2, colors: { body: '#c9935f' } },
  { id: 'radio', name: 'Rádio Antigo', cat: 'decor', kind: 'prop', price: 700, theme: 'classico', charm: 2, colors: { body: '#6b4a32' } },
  { id: 'cabideiro', name: 'Cabideiro', cat: 'decor', kind: 'prop', price: 650, theme: 'classico', charm: 1, colors: { body: '#c9935f' } },
  { id: 'banqueta', name: 'Banqueta Alta', cat: 'decor', kind: 'prop', price: 500, theme: 'neutro', charm: 1, colors: { body: '#e05a4a' } },
  { id: 'lixeira', name: 'Lixeira', cat: 'decor', kind: 'prop', price: 300, theme: 'neutro', charm: 0, colors: { body: '#9aa3ad' } },

  // ---------- Pisos (pintados por quadrado) ----------
  { id: 'piso_bege', name: 'Piso Bege', cat: 'piso', kind: 'floor', price: 0, theme: 'neutro', charm: 0,
    floor: { pattern: 'checker', a: '#efe6d6', b: '#e4d8c3' } },
  { id: 'piso_madeira', name: 'Taco de Madeira', cat: 'piso', kind: 'floor', price: 45, theme: 'neutro', charm: 0.1,
    floor: { pattern: 'wood', a: '#c9935f', b: '#b98250' } },
  { id: 'piso_xadrez', name: 'Xadrez Clássico', cat: 'piso', kind: 'floor', price: 60, theme: 'classico', charm: 0.15,
    floor: { pattern: 'checker', a: '#f4f2ee', b: '#2f2f36' } },
  { id: 'piso_tatame', name: 'Tatame', cat: 'piso', kind: 'floor', price: 70, theme: 'japones', charm: 0.2,
    floor: { pattern: 'tatami', a: '#d8cf98', b: '#5a6b3a' } },
  { id: 'piso_azulejo', name: 'Azulejo Talavera', cat: 'piso', kind: 'floor', price: 70, theme: 'mexicano', charm: 0.2,
    floor: { pattern: 'talavera', a: '#f3ede2', b: '#2b5aa8' } },
  { id: 'piso_areia', name: 'Deck de Praia', cat: 'piso', kind: 'floor', price: 70, theme: 'praiano', charm: 0.2,
    floor: { pattern: 'wood', a: '#e3c98f', b: '#d4b878' } },

  // ---------- Paredes (todas as paredes de uma vez) ----------
  { id: 'parede_creme', name: 'Parede Creme', cat: 'parede', kind: 'wall', price: 0, theme: 'neutro', charm: 0,
    wall: { pattern: 'plain', a: '#f2e8d8', b: '#d9cbb3' } },
  { id: 'parede_listrada', name: 'Papel Listrado', cat: 'parede', kind: 'wall', price: 1600, theme: 'classico', charm: 2,
    wall: { pattern: 'stripes', a: '#7a2f3a', b: '#8d3a46' } },
  { id: 'parede_shoji', name: 'Painel Shoji', cat: 'parede', kind: 'wall', price: 2400, theme: 'japones', charm: 3,
    wall: { pattern: 'shoji', a: '#f6f1e3', b: '#5a3d2b' } },
  { id: 'parede_terracota', name: 'Terracota', cat: 'parede', kind: 'wall', price: 2400, theme: 'mexicano', charm: 3,
    wall: { pattern: 'plain', a: '#d97b4f', b: '#b85f38' } },
  { id: 'parede_mar', name: 'Azul Mar', cat: 'parede', kind: 'wall', price: 2400, theme: 'praiano', charm: 3,
    wall: { pattern: 'stripes', a: '#bfe6ec', b: '#a6dbe3' } },
];

export const itemById = (id) => ITEMS.find((i) => i.id === id);
