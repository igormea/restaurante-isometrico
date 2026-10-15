// Serviço de salvamento.
// Hoje salva no próprio navegador (localStorage).
// No futuro, para jogar com amigos, basta criar um CloudSaveService com os mesmos
// métodos (load / save) que fale com um servidor — o resto do jogo não muda.

const KEY = 'restaurante_iso_save_v1';

export class LocalSaveService {
  async load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('Não foi possível carregar o jogo salvo', e);
      return null;
    }
  }
  async save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('Não foi possível salvar', e);
      return false;
    }
  }
  async reset() {
    try { localStorage.removeItem(KEY); } catch (e) { /* ignora */ }
  }
}
