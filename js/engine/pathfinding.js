// Busca de caminho no piso (para clientes, cozinheiro e garçom andarem desviando dos móveis).
import { DOOR, objectAt, inRoom } from '../core/state.js';

export const OUTSIDE = { x: -1, y: DOOR.y }; // calçada do lado de fora da porta

export function walkable(state, x, y) {
  if (x === OUTSIDE.x && y === OUTSIDE.y) return true;
  if (x === -2 && y === OUTSIDE.y) return true;
  return inRoom(state, x, y) && !objectAt(state, x, y);
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// BFS: retorna lista de quadrados do início até o destino (sem incluir o início)
// goal pode ser um quadrado ocupado (ex.: uma cadeira) — ele é permitido só como destino.
export function findPath(state, sx, sy, gx, gy) {
  if (sx === gx && sy === gy) return [];
  const key = (x, y) => x + ',' + y;
  const prev = new Map([[key(sx, sy), null]]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      const k = key(nx, ny);
      if (prev.has(k)) continue;
      const isGoal = nx === gx && ny === gy;
      if (!isGoal && !walkable(state, nx, ny)) continue;
      prev.set(k, [x, y]);
      if (isGoal) {
        const path = [];
        let cur = [nx, ny];
        while (cur && !(cur[0] === sx && cur[1] === sy)) {
          path.unshift({ x: cur[0], y: cur[1] });
          cur = prev.get(key(cur[0], cur[1]));
        }
        return path;
      }
      q.push([nx, ny]);
    }
  }
  return null;
}

// quadrados livres ao lado de um objeto, de onde um personagem pode usá-lo
export function accessTiles(state, ox, oy) {
  return DIRS.map(([dx, dy]) => ({ x: ox + dx, y: oy + dy }))
    .filter((t) => inRoom(state, t.x, t.y) && walkable(state, t.x, t.y));
}

// caminho até o quadrado de acesso mais próximo de um objeto
export function pathToObject(state, sx, sy, ox, oy) {
  let best = null;
  for (const t of accessTiles(state, ox, oy)) {
    const p = t.x === sx && t.y === sy ? [] : findPath(state, sx, sy, t.x, t.y);
    if (p && (!best || p.length < best.length)) best = p;
  }
  return best;
}
