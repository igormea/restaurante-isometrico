// Cargos, níveis de experiência e geração de candidatos.

export const ROLES = {
  cozinheiro:    { name: 'Cozinheiro(a)',   icon: '👨‍🍳', desc: 'Prepara os pratos. Precisa de um fogão livre para trabalhar.' },
  garcom:        { name: 'Garçom/Garçonete', icon: '🤵', desc: 'Anota pedidos, leva os pratos e limpa as mesas. Na falta de recepcionista ou caixa, cobre essas funções (mais devagar).' },
  recepcionista: { name: 'Recepcionista',   icon: '🙋', desc: 'Recebe os clientes na porta e escolhe a mesa certa para o tamanho do grupo.' },
  caixa:         { name: 'Caixa',           icon: '💵', desc: 'Fica na caixa registradora recebendo os pagamentos.' },
  lavador:       { name: 'Lavador(a) de louça', icon: '🧽', desc: 'Lava os pratos sujos na pia. Com lava-louças, lava muito mais de uma vez.' },
  zelador:       { name: 'Zelador(a)',      icon: '🧹', desc: 'Mantém o chão e as mesas limpos. Sem ele a higiene cai e os clientes reclamam.' },
};

export const LEVELS = {
  novato:     { name: 'Novato',     burn: 0.20, quality: 2.6, speed: 0.85, salaryMult: 1.0 },
  experiente: { name: 'Experiente', burn: 0.08, quality: 3.6, speed: 1.0,  salaryMult: 1.6 },
  chef:       { name: 'Sênior',     burn: 0.03, quality: 4.3, speed: 1.15, salaryMult: 2.6 },
};

export const BASE_SALARY = { cozinheiro: 1900, garcom: 1650, recepcionista: 1600, caixa: 1700, lavador: 1520, zelador: 1560 };

const NAMES = {
  brasileira: ['Francisca Lima', 'Raimundo Nonato', 'Antônia Sousa', 'José Wellington', 'Maria Clara', 'Cícero Alves', 'Jéssica Rocha', 'Luiz Gonzaga'],
  italiana: ['Giulia Rossi', 'Marco Bianchi', 'Lucia Ferraro', 'Paolo Romano'],
  japonesa: ['Hiroshi Tanaka', 'Yuki Sato', 'Kenji Yamamoto', 'Aiko Nakamura'],
  mexicana: ['Carlos Hernández', 'Lupita García', 'Diego Ramírez', 'Sofía López'],
  lanches: ['Bruno Costa', 'Larissa Melo', 'Thiago Martins', 'Camila Ribeiro'],
  geral: ['Ana Beatriz', 'Pedro Henrique', 'Letícia Moura', 'Rafael Gomes', 'Fernanda Dias', 'Gabriel Nunes', 'Juliana Freitas', 'Mateus Barros', 'Bianca Teixeira', 'Igor Fernandes', 'Natália Pires', 'Vinícius Araújo'],
};

// gerador pseudo-aleatório com semente (a lista de candidatos muda uma vez por dia)
function rng(seed) {
  let s = 0;
  for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const LOOKS = {
  skin: ['#f6d3b3', '#e8b48f', '#c98d62', '#9c6644', '#6f4a33', '#f1c8a0'],
  hair: ['#2b1d14', '#5a3a22', '#a8642e', '#e2b65a', '#1a1a1a', '#7a3b2e'],
};

export function candidatesFor(dateKey) {
  const r = rng(dateKey);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const out = [];
  const plan = ['cozinheiro', 'cozinheiro', 'cozinheiro', 'cozinheiro', 'garcom', 'garcom', 'recepcionista', 'caixa', 'lavador', 'zelador'];
  plan.forEach((role, i) => {
    const lvl = pick(['novato', 'novato', 'experiente', 'experiente', 'chef']);
    const specialty = role === 'cozinheiro' ? pick(['brasileira', 'brasileira', 'italiana', 'japonesa', 'mexicana', 'lanches']) : null;
    const name = pick(specialty ? NAMES[specialty] : NAMES.geral);
    const L = LEVELS[lvl];
    const salary = Math.round((BASE_SALARY[role] * L.salaryMult * (0.92 + r() * 0.16)) / 10) * 10;
    out.push({
      id: `${dateKey}-${i}`,
      name, role, level: lvl, specialty, salary,
      speed: +(L.speed * (0.92 + r() * 0.16)).toFixed(2),
      charisma: Math.round(40 + r() * 60),
      look: { skin: pick(LOOKS.skin), hair: pick(LOOKS.hair), hairStyle: pick(['short', 'long', 'bun']) },
    });
  });
  return out;
}
