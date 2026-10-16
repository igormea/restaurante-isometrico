// Carrega as imagens do jogo antes de começar.
// Se alguma imagem não carregar, o jogo continua com o desenho em código.
import { FURNITURE, EXTRA_SPRITES, FOOD, DIRS } from '../config/sprites.js';

const images = new Map(); // caminho -> HTMLImageElement carregada

function load(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { images.set(path, img); resolve(); };
    img.onerror = () => resolve();
    // na versão empacotada (um arquivo só) as imagens vêm embutidas
    img.src = (window.__ASSETS && window.__ASSETS[path]) || path;
  });
}

export async function loadAssets(onProgress) {
  const paths = [];
  const names = new Set([...Object.values(FURNITURE).map((f) => f.sprite), ...EXTRA_SPRITES]);
  for (const n of names) for (const d of DIRS) paths.push(`assets/furniture/${n}_${d}.png`);
  for (const n of new Set(Object.values(FOOD))) paths.push(`assets/food/${n}.png`);
  let done = 0;
  await Promise.all(paths.map((p) => load(p).then(() => onProgress && onProgress(++done, paths.length))));
}

export const furnitureImg = (name, dir) => images.get(`assets/furniture/${name}_${dir}.png`) || null;
export const foodImg = (icon) => { const n = FOOD[icon]; return n ? images.get(`assets/food/${n}.png`) || null : null; };
