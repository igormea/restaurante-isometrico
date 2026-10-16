// Falas do restaurante. Cada chave tem várias opções; o jogo sorteia uma.
// Para adicionar falas novas, basta incluir mais frases nas listas.

export const greet = (hour) => (hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite');

export const LINES = {
  // ---------- chegada ----------
  hostWelcome: (h) => [`${greet(h)}! Sejam bem-vindos!`, `${greet(h)}! Quantas pessoas?`, `${greet(h)}, tudo bem? Mesa para quantos?`],
  custParty: (n) => (n === 1 ? ['Só eu hoje.', 'Mesa pra um, por favor.'] : [`Somos ${n}.`, `Mesa pra ${n}, por favor.`, `${n} pessoas.`]),
  hostFollow: ['Por aqui, por favor.', 'Me acompanhem.', 'Tenho uma mesa ótima pra vocês.'],
  hostFull: ['Estamos lotados agora. Podem aguardar um pouquinho?', 'Já já libera uma mesa, tudo bem esperar?'],
  custWaitOk: ['Tudo bem, a gente espera.', 'Sem problema.', 'Ok, esperamos.'],
  custDoorImpatient: ['Vai demorar muito?', 'Ainda tem mesa?', 'Ninguém vai atender a gente?'],
  custGiveUpDoor: ['Vamos procurar outro lugar.', 'Demorou demais, vamos embora.'],
  custSeated: ['Que lugar aconchegante.', 'Mesa boa!', 'Hmm, deixa eu ver o cardápio.'],

  // ---------- pedido ----------
  custCallWaiter: ['Garçom! Por favor!', 'Moço, pode anotar?', 'Com licença!', 'Já sabemos o que queremos!'],
  waiterTake: ['Já escolheram?', 'O que vão pedir hoje?', 'Posso anotar o pedido?'],
  custOrder: (dish) => [`Eu quero ${dish}.`, `Vou de ${dish}.`, `Pra mim, ${dish}.`, `Me vê ${dish}, por favor.`],
  custOrderNone: ['Hmm... acabou o que eu queria.', 'Não tem nada disponível?'],
  waiterOk: ['Anotado! Já já sai.', 'Perfeito, já passo pra cozinha.', 'Ótima escolha!'],
  custGiveUpOrder: ['Ninguém vem atender... vamos embora.', 'Que descaso! Tchau.'],

  // ---------- cozinha ----------
  cookStart: (dish) => [`Saindo ${dish}!`, `${dish}, deixa comigo.`, 'Mãos à obra!'],
  cookReady: (t) => [`Pedido pronto! Mesa ${t}!`, `Saindo, mesa ${t}!`, `Mesa ${t}, pode levar!`],
  cookBurn: ['Ih, queimou! Vou refazer.', 'Droga, passou do ponto!', 'Esse não dá pra servir...'],
  cookNoPlates: ['Cadê os pratos limpos?!', 'Acabou a louça limpa!', 'Preciso de prato aqui!'],

  // ---------- servindo ----------
  waiterServe: (dish) => [`${dish}, bom apetite!`, `Aqui está: ${dish}.`, 'Bom apetite!'],
  custThanks: ['Obrigado!', 'Valeu!', 'Que cheiro bom!', 'Hmm, chegou!'],
  custFoodLate: ['Garçom, nosso pedido tá demorando...', 'Será que esqueceram da gente?', 'Tô morrendo de fome...', 'Vai demorar ainda?'],
  custGiveUpFood: ['Cansei de esperar a comida!', 'Demorou demais, vamos embora!'],
  waiterCheck: ['Está tudo bem com a comida?', 'Precisam de mais alguma coisa?'],
  custCheckOk: ['Tudo ótimo, obrigado!', 'Tá uma delícia!', 'Tudo certo!'],
  custCheckBad: ['Podia estar melhor...', 'Tá meio frio, viu?'],

  // ---------- comendo ----------
  eatGreat: ['Hmm, que delícia!', 'Isso aqui tá perfeito!', 'Melhor que o da minha mãe!', 'Nossa, que tempero!'],
  eatOk: ['Tá gostoso.', 'Bem servido.', 'Hmm, bom.'],
  eatBad: ['Tá meio sem sal...', 'Já comi melhor.', 'Isso tá frio...'],
  chatPretty: ['Adorei a decoração!', 'Que lugar bonito.'],
  chatDirty: ['Esse chão tá sujo, hein...', 'Podiam limpar melhor aqui.'],
  chatSmall: ['E o trabalho, como tá?', 'Vamos dividir uma sobremesa?', 'Hahaha, sério?', 'Esse lugar é novo, né?', 'Me passa o guardanapo?'],
  spill: ['Ops! Derrubei o suco!', 'Eita, caiu molho no chão!', 'Ai, derrubei o copo!'],
  crumbs: ['Opa, fiz sujeira.', 'Desculpa a bagunça!'],

  // ---------- conta ----------
  custBill: ['A conta, por favor!', 'Pode trazer a conta?', 'Fecha a conta pra gente?'],
  cashierTotal: (v) => [`Deu ${v}. Crédito, débito ou Pix?`, `O total ficou ${v}. Como vai pagar?`, `São ${v}.`],
  custPay: ['No Pix.', 'Débito, por favor.', 'Crédito.', 'Em dinheiro.'],
  custTip: ['Pode colocar os 10%!', 'Fica com o troco, o serviço foi ótimo!', 'Inclui a gorjeta, por favor.'],
  cashierBye: ['Obrigado, voltem sempre!', 'Muito obrigado! Até a próxima!', 'Volte sempre!'],
  custByeHappy: ['Tudo ótimo, voltaremos!', 'Vou indicar pros amigos!', 'Adorei, obrigado!'],
  custByeMeh: ['Até mais.', 'Tchau.', 'Obrigado.'],
  custByeBad: ['Esperava mais...', 'Não sei se volto.'],
  custBillLate: ['E essa conta, sai ou não sai?', 'Quero pagar e ir embora!'],

  // ---------- limpeza e louça ----------
  waiterClear: ['Com licença, vou recolher.', 'Posso retirar os pratos?'],
  janitorClean: ['Com licença, vou limpar aqui.', 'Cuidado, chão molhado!', 'Deixa comigo.', 'Brilhando!'],
  washerPile: ['Louça acumulando aqui!', 'Mais prato sujo...', 'Não para de chegar prato!'],
  washerMachine: ['Máquina carregada!', 'Lava-louças rodando.'],
  washerDone: ['Pratos limpos saindo!', 'Mais uma leva pronta.'],
  washerBreak: ['Ops! Quebrei um prato...', 'Ai, escorregou da mão!'],
};

// ---------- falas por tipo de cliente ----------
export const TYPE_LINES = {
  executivo: { arrive: ['Tô com pressa, pode ser rápido?', 'Tenho reunião daqui a pouco.'], eat: ['Rápido e bom, perfeito.', 'Deixa eu responder esse e-mail...'], late: ['Vou me atrasar pra reunião!', 'Não tenho o dia todo!'] },
  familia:   { arrive: ['Mesa pra família, por favor!', 'Tem cadeirinha?'], eat: ['Come tudo, hein!', 'Não brinca com a comida!', 'Mãe, posso sobremesa?'], late: ['As crianças estão com fome...', 'Mãe, tô com fome!'] },
  casal:     { arrive: ['Uma mesa pra dois, por favor.', 'Algo mais reservado?'], eat: ['Que lugar romântico.', 'Saúde! Ao nosso aniversário.', 'Hmm, prova o meu!'], late: ['Tá demorando, amor...'] },
  turista:   { arrive: ['Hello! Mesa, por favor?', 'Comida típica, sim?'], eat: ['Muito bom! Very good!', 'Isso é bem brasileiro, né?', 'Vou postar foto disso!'], late: ['Is it coming?', 'Demora, sim?'] },
  estudante: { arrive: ['Tem alguma promoção?', 'O que tem de mais em conta?'], eat: ['Valeu cada centavo.', 'Bora dividir a conta no Pix.'], late: ['Tenho aula daqui a pouco...'] },
  chato:     { arrive: ['Espero que a mesa esteja limpa.', 'Ouvi falar desse lugar... vamos ver.'], eat: ['Hmm. Já comi melhor.', 'O sal tá um pouco demais.', 'Esse prato tá frio, não?'], late: ['Que serviço lento!', 'Vou anotar isso.'] },
};

export const REGULAR_LINES = {
  hostHello: (name) => [`${name}! Que bom te ver de novo!`, `Olha só, ${name}! A mesa de sempre?`],
  custHello: ['Saudade daqui!', 'Voltei, como prometido!'],
  order: ['O de sempre, por favor!', 'Vou no meu favorito.'],
  waiterKnows: (dish) => [`Já sei: ${dish}, né?`, `${dish} de sempre, saindo!`],
  noFav: ['Acabou o meu prato favorito? Que pena...'],
};

export const DIET_LINES = {
  ask: { veg: 'Sou vegetariano, o que tem sem carne?', gf: 'Tem algo sem glúten?', lf: 'Algum prato sem lactose?' },
  none: { veg: 'Não tem nada vegetariano? Poxa...', gf: 'Nada sem glúten? Assim fica difícil.', lf: 'Nada sem lactose? Que pena.' },
};

export const DRINK_LINES = {
  order: (d) => [`E ${d} pra beber.`, `Pra beber, ${d}.`, `Me traz ${d}?`],
  serve: ['Suas bebidas!', 'Aqui, bem geladinho.', 'Bebidas na mesa!'],
  thanks: ['Opa, valeu!', 'Bem gelada, ótimo!', 'Obrigado!'],
  kid: ['Suco pra mim!', 'Eu quero refri!'],
};

export const pickLine = (list) => list[Math.floor(Math.random() * list.length)];
