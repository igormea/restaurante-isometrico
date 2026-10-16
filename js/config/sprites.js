// Imagens do jogo (pacotes gratuitos do Kenney, licença CC0 — ver assets/CREDITS.md).
// Cada item da loja pode ter uma imagem; se não tiver (ou não carregar), o jogo usa o desenho em código.
//
// sprite = nome do arquivo em assets/furniture (sem a direção)
// scale  = ajuste de tamanho | chair = cadeira (vira para a mesa)

export const FURNITURE = {
  fogao_basico:    { sprite: 'kitchenStove' },
  fogao_inox:      { sprite: 'kitchenStoveElectric' },
  balcao_madeira:  { sprite: 'kitchenCabinetDrawer' },
  pia:             { sprite: 'kitchenSink' },
  lava_loucas:     { sprite: 'washer' },
  lava_loucas_ind: { sprite: 'washerDryerStacked' },
  geladeira:       { sprite: 'kitchenFridgeLarge' },
  caixa_reg:       { sprite: 'kitchenCabinet' },
  bar_bebidas:     { sprite: 'kitchenCabinet' },
  mesa_simples:    { sprite: 'tableRound', scale: 0.84 },
  mesa_baixa:      { sprite: 'tableCoffeeSquare', scale: 1.1 },
  cadeira_simples: { sprite: 'chair', chair: true },
  cadeira_estofada:{ sprite: 'chairCushion', chair: true },
  cadeira_praia:   { sprite: 'chairRounded', chair: true },
  vaso_planta:     { sprite: 'pottedPlant', scale: 1.2 },
  luminaria:       { sprite: 'lampRoundFloor', scale: 1.05 },
  // itens novos da v0.5
  estante:         { sprite: 'bookcaseOpen' },
  tv:              { sprite: 'televisionModern' },
  caixa_som:       { sprite: 'speaker' },
  lixeira:         { sprite: 'trashcan', scale: 1.1 },
  cabideiro:       { sprite: 'coatRackStanding' },
  poltrona:        { sprite: 'loungeChair', scale: 0.95 },
  banqueta:        { sprite: 'stoolBar', scale: 1.1 },
  radio:           { sprite: 'radio', scale: 1.2 },
};
// peças extras desenhadas por cima de outras
export const EXTRA_SPRITES = ['kitchenCoffeeMachine'];

// comida e bebida: o emoji de cada prato aponta para uma imagem
export const FOOD = {
  '🍛': 'plateDinner', '🥩': 'meatCooked', '🍲': 'panStew', '🍝': 'plateSauerkraut', '🍕': 'pizza',
  '🍣': 'sushiSalmon', '🍜': 'bowlBroth', '🌮': 'taco', '🌯': 'sub', '🍔': 'burgerCheese', '🥗': 'salad',
  '🥘': 'pie', '🍰': 'cake',
  '💧': 'glass', '🥤': 'sodaCan', '🧃': 'sodaGlass', '☕': 'mug', '🍺': 'sodaBottle', '🍹': 'cocktail',
};

export const DIRS = ['NE', 'NW', 'SE', 'SW'];
