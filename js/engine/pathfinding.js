// Busca de caminho no piso (para clientes e funcionários andarem desviando dos móveis).
import { doorOf, objectAt, inRoom, roomSize } from '../core/state.js';

// calçada logo na frente da porta e ponto onde as pessoas somem
export const outsideOf = (s) => { const d = doorOf(s); return { x: d.x, y: d.y + 1 }; };
export const exitOf = (s) => { const d = doorOf(s); return { x: d.x, y: d.y + 6 }; };

const isOutside = (s, x, y) => { const n = roomSize(s); return y >= n && y <= n + 5 && x >= -1 && x <= 4; };

export function walkable(state, x, y) {
  if (isOutside(state, x, y)) return true;
  return inRoom(state, x, y) && !objectAt(state, x, y) && !(state._blocked && state._blocked.has(x + ',' + y));
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// só dá para entrar e sair do salão pela porta
function crossOk(state, x, y, nx, ny) {
  const n = roomSize(state);
  if ((y >= n) === (ny >= n)) return true;
  const d = doorOf(state);
  return x === d.x && nx === d.x;
}

// BFS: lista de quadrados do início até o destino (sem incluir o início).
// O destino pode ser um quadrado ocupado (ex.: uma cadeira).
export function findPath(state, sx, sy, gx, gy) {
  sx = Math.round(sx); sy = Math.round(sy);
  if (sx === gx && sy === gy) return [];
  const key = (x, y) => x + ',' + y;
  const prev = new Map([[key(sx, sy), null]]);
  const q = [[sx, sy]];
  let head = 0;
  while (head < q.length) {
    const [x, y] = q[head++];
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy;
      const k = key(nx, ny);
      if (prev.has(k) || !crossOk(state, x, y, nx, ny)) continue;
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

export function accessTiles(state, ox, oy) {
  return DIRS.map(([dx, dy]) => ({ x: ox + dx, y: oy + dy }))
    .filter((t) => inRoom(state, t.x, t.y) && walkable(state, t.x, t.y));
}

export function pathToObject(state, sx, sy, ox, oy) {
  let best = null;
  for (const t of accessTiles(state, ox, oy)) {
    const p = Math.round(sx) === t.x && Math.round(sy) === t.y ? [] : findPath(state, sx, sy, t.x, t.y);
    if (p && (!best || p.length < best.length)) best = p;
  }
  return best;
}
