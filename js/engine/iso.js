// Matemática da câmera isométrica (visão em diagonal).
export const TW = 96; // largura do losango de um quadrado do piso
export const TH = 48; // altura do losango
export const WALL_H = 120;

export const camera = { x: 0, y: 0, zoom: 1 };

// coordenada do mundo (quadrados) -> pixels "do mundo" (antes da câmera)
export function isoToWorld(gx, gy, z = 0) {
  return { x: (gx - gy) * (TW / 2), y: (gx + gy) * (TH / 2) - z };
}

// pixels da tela -> coordenada do mundo (quadrados, com fração)
export function screenToIso(sx, sy, view) {
  const wx = (sx - view.w / 2) / camera.zoom + camera.x;
  const wy = (sy - view.h / 2) / camera.zoom + camera.y;
  const gx = (wx / (TW / 2) + wy / (TH / 2)) / 2;
  const gy = (wy / (TH / 2) - wx / (TW / 2)) / 2;
  return { gx, gy };
}

export function worldToScreen(wx, wy, view) {
  return {
    x: (wx - camera.x) * camera.zoom + view.w / 2,
    y: (wy - camera.y) * camera.zoom + view.h / 2,
  };
}

// centro do quadrado (x, y) em pixels do mundo
export const tileCenter = (x, y, z = 0) => isoToWorld(x + 0.5, y + 0.5, z);
