# 🍳 Restaurante Isométrico (nome provisório)

Jogo de restaurante com câmera isométrica, inspirado no estilo dos clássicos jogos de café.
Roda direto no navegador (computador ou celular), sem instalar nada.

**▶️ Jogar:** https://igormea.github.io/restaurante-isometrico/

## Como jogar

1. **Toque num fogão** e escolha um prato para cozinhar.
2. Quando o prato ficar pronto (balão verde), **toque de novo**: o cozinheiro leva a comida até o balcão.
3. O **garçom** serve os clientes sozinho. Cada porção vendida dá moedas 🪙.
4. Se demorar demais para recolher, o prato **estraga** 🤢 — toque para limpar.
5. Ganhe XP, **suba de nível** e libere novos pratos, mais fogões, decorações e expansões.
6. Use a **Loja** para decorar no estilo que quiser (japonês, mexicano, praiano, clássico...).
   Decoração aumenta a **beleza 💖**, que atrai mais clientes e deixa eles mais pacientes.
7. **Editar** permite mover ou vender móveis. **Ampliar** aumenta o salão.

O jogo salva sozinho no navegador. A comida continua cozinhando mesmo com o jogo fechado.

## Versões

- **v0.1 — Protótipo**: cozinha, clientes, garçom, moedas, níveis, loja com 5 estilos,
  pintura de piso, troca de parede, modo editar e expansões. Arte feita 100% em código.

## Próximos passos (ideias)

- Arte definitiva (sprites desenhados) no lugar dos desenhos em código
- Mais pratos, decorações e itens de parede (quadros, prateleiras)
- Sons e música
- Missões / objetivos diários
- **Online**: login, amigos, visitar e ajudar o restaurante de amigos

## Organização do código (para quem for mexer no futuro)

```
index.html            página do jogo
css/style.css         visual da interface
js/main.js            liga tudo
js/config/            catálogos (receitas, itens da loja, níveis) — editar aqui para balancear
js/core/              estado do jogo, regras gerais, salvamento, eventos
js/engine/            câmera isométrica, desenhos, caminhos, toque/mouse
js/systems/           cozinha, funcionários, clientes
js/ui/                loja, menus, barra superior
js/net/social.js      ponto de entrada do futuro modo online (ainda desligado)
```

Para preparar o online, o salvamento passa por `js/core/save.js` — basta criar uma versão
que salve num servidor, sem mudar o resto do jogo.
