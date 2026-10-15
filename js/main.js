// Ponto de partida: monta o jogo, a tela e a interface.
import { Game } from './core/game.js';
import { LocalSaveService } from './core/save.js';
import { Renderer } from './engine/renderer.js';
import { setupInput } from './engine/input.js';
import { screenToIso, camera } from './engine/iso.js';
import { UI } from './ui/ui.js';
import { ROLES, LEVELS } from './config/staff.js';
import { CUISINES } from './config/recipes.js';
import { COSTS } from './config/economy.js';

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
    onDrag(sx, sy) {
      if (game.mode !== 'paint') return false;
      const t = toTile(sx, sy);
      game.paintAt(t.x, t.y);
      return true;
    },
    onTap(sx, sy) {
      const t = toTile(sx, sy);
      renderer.hover = t;
      if (game.mode === 'place') { game.placeAt(t.x, t.y); return; }
      if (game.mode === 'paint') return;
      const w = toWorld(sx, sy);
      const obj = renderer.objectAtWorld(w.x, w.y);
      if (game.mode === 'edit') { if (obj) game.pickUp(obj); return; }
      const sv = game.service;
      const person = renderer.personAtWorld(w.x, w.y);
      if (person && person.member && sv.click(null, person.member)) return;
      if (person && person.agent) {
        const e = person.agent.emp;
        const extra = e.role === 'cozinheiro' ? ` · ${CUISINES[e.specialty].icon} ${CUISINES[e.specialty].name}` : '';
        game.toast(`${ROLES[e.role].icon} ${e.name} · ${ROLES[e.role].name} ${LEVELS[e.level].name.toLowerCase()}${extra}`);
        return;
      }
      const dirt = renderer.dirtAtWorld(w.x, w.y);
      if (dirt && !dirt._by && !obj) {
        game.state.dirt = game.state.dirt.filter((d) => d !== dirt);
        game.state.month.water += COSTS.waterPerClean;
        game.toast('🧽 Chão limpo!');
        return;
      }
      if (obj) sv.click(obj, null);
    },
  });

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

  if (game.pendingReport) setTimeout(() => ui.showPendingReport(), 400);
  let vista = false;
  try { vista = !!localStorage.getItem('dica_v2'); localStorage.setItem('dica_v2', '1'); } catch (e) { /* ignora */ }
  if (!vista) setTimeout(() => ui.toast('👋 Você é o dono. Contrate, monte o cardápio, compre ingredientes e acompanhe as finanças.'), 800);
  window.__game = game;
}

boot().catch((e) => {
  console.error(e);
  const l = document.getElementById('loading');
  if (l) l.textContent = 'Ops! Algo deu errado ao abrir o jogo: ' + e.message;
});
