// Ponto de entrada para o futuro modo social (amigos, visitas, ajuda).
// Hoje é só um "esqueleto": nada é enviado para a internet.
//
// Plano para quando formos ligar o online:
//  1. Criar um servidor (ex.: Firebase ou Supabase) com login.
//  2. Trocar o LocalSaveService por um CloudSaveService (mesmo formato de dados).
//  3. Implementar as funções abaixo falando com esse servidor.
//  4. Visitar um amigo = carregar o estado dele (JSON) e desenhar com o mesmo Renderer,
//     em modo "somente visita".

export const Social = {
  online: false,
  status() { return 'Modo offline: o jogo roda só para você por enquanto.'; },
  async listFriends() { return []; },
  async addFriend(/* playerId */) { throw new Error('Ainda não disponível'); },
  async loadRestaurant(/* playerId */) { throw new Error('Ainda não disponível'); },
  async sendHelp(/* playerId, stoveUid */) { throw new Error('Ainda não disponível'); },
};
