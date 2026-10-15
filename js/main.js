// Ponto de partida: monta o jogo, a tela e a interface.
import { Game } from './core/game.js';
import { LocalSaveService } from './core/save.js';
import { Renderer } from './engine/renderer.js';
import { setupInput } from './engine/input.js';
import { screenToIso, camera, isoToWorld } from './engine/iso.js';
import { UI } from './ui/ui.js';
import { itemById } from './config/items.js';

async function boot() {
  const game = new Game(new LocalSaveService());
  await game.init();
  const canvas = document.getElementById('game');
  const renderer = new Renderer(canvas, game);
  renderer.fitCamera();
  const ui = new UI(game, renderer);

  const toTile = (sx, sy) => {
    const { gx, gy } = screenToIso(sx, sy, renderer.view);
    return { x: Math.floor(gx), y: Math.floor(gy) };
  };
  const toWorld = (sx, sy) => ({
    x: (sx - renderer.view.w / 2) / camera.zoom + camera.x,
    y: (sy - renderer.view.h / 2) / camera.zoom + camera.y,
  });

  setupInput(canvas, {
    onHover(sx, sy) { renderer.hover = toTile(sx, sy); },
    onDrag(sx, sy, phase) {
      if (game.mode !== 'paint') return false;
      const t = toTile(sx, sy);
      game.paintAt(t.x, t.y);
      return true;
    },
    onTap(sx, sy) {
      const t = toTile(sx, sy);
      renderer.hover = t;
      if (game.mode === 'place') { game.placeAt(t.x, t.y); return; }
      if (game.mode === 'paint') { return; }
      const w = toWorld(sx, sy);
      const obj = renderer.objectAtWorld(w.x, w.y);
      if (game.mode === 'edit') { if (obj) game.pickUp(obj); return; }
      if (!obj) return;
      const kind = itemById(obj.item).kind;
      if (kind === 'stove') game.clickStove(obj);
      else if (kind === 'counter') {
        if (obj.data.recipe && obj.data.servings > 0) game.toast(`Balcão: ${obj.data.servings} porções prontas para servir`);
        else game.toast('Balcão vazio — toque num prato pronto no fogão para trazer até aqui.');
      }
    },
  });

  // salva quando a pessoa sai da aba
  document.addEventListener('visibilitychange', () => { if (document.hidden) game.save(); });
  addEventListener('pagehide', () => game.save());

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    game.update(dt);
    renderer.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  document.getElementById('loading').remove();

  // dica inicial
  let vista = false;
  try { vista = !!localStorage.getItem('dica_vista'); localStorage.setItem('dica_vista', '1'); } catch (e) { /* ignora */ }
  if (!vista) setTimeout(() => ui.toast('👋 Toque num fogão para começar a cozinhar!'), 600);
  window.__game = game; // ajuda nos testes
  void isoToWorld;
}

boot().catch((e) => {
  console.error(e);
  const l = document.getElementById('loading');
  if (l) l.textContent = 'Ops! Algo deu errado ao abrir o jogo: ' + e.message;
});
