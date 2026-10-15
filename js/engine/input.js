// Toque e mouse: arrastar move a câmera, pinça/roda do mouse dá zoom, toque rápido = clique.
import { camera } from './iso.js';

export function setupInput(canvas, { onTap, onHover, onDrag }) {
  const pointers = new Map();
  let moved = false;
  let start = null;
  let pinch = null;
  let dragPaint = false;

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const p = pos(e);
    pointers.set(e.pointerId, p);
    if (pointers.size === 1) {
      moved = false; start = { ...p, cx: camera.x, cy: camera.y };
      dragPaint = onDrag && onDrag(p.x, p.y, 'start');
      onHover(p.x, p.y);
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: camera.zoom };
      moved = true;
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = pos(e);
    if (!pointers.has(e.pointerId)) { onHover(p.x, p.y); return; }
    pointers.set(e.pointerId, p);
    if (pointers.size === 2 && pinch) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      camera.zoom = clampZoom(pinch.zoom * (d / pinch.d));
      return;
    }
    if (!start) return;
    const dx = p.x - start.x, dy = p.y - start.y;
    if (dragPaint) { onHover(p.x, p.y); onDrag(p.x, p.y, 'move'); return; }
    if (!moved && Math.hypot(dx, dy) > 8) moved = true;
    if (moved) {
      camera.x = start.cx - dx / camera.zoom;
      camera.y = start.cy - dy / camera.zoom;
    } else onHover(p.x, p.y);
  });

  const end = (e) => {
    const p = pos(e);
    const wasSingle = pointers.size === 1;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (wasSingle && !moved && start && !dragPaint) onTap(p.x, p.y);
    if (pointers.size === 0) { start = null; dragPaint = false; }
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', (e) => { pointers.delete(e.pointerId); start = null; pinch = null; });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    camera.zoom = clampZoom(camera.zoom * (e.deltaY < 0 ? 1.1 : 0.9));
  }, { passive: false });
}

export function clampZoom(z) { return Math.max(0.3, Math.min(2.2, z)); }
