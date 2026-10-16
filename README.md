# 🍳 Restaurante Isométrico (nome provisório)

Jogo de restaurante com câmera isométrica, inspirado no estilo dos clássicos jogos de café.
Roda direto no navegador (computador ou celular), sem instalar nada.

Móveis, eletrodomésticos, comidas e bebidas usam as imagens gratuitas do [Kenney](https://kenney.nl) (licença CC0). Veja `assets/CREDITS.md`.

**▶️ Jogar:** https://igormea.github.io/restaurante-isometrico/

## Conceito

Você é o **dono** do restaurante, sem personagem no jogo, como no SimCity. Quem trabalha é a equipe que você contrata.
O tempo do jogo é o **tempo real**, no fuso do seu estado, com feriados nacionais, estaduais e municipais.
No feriado ninguém vem trabalhar: se você abrir mesmo assim, atende tudo sozinho, clicando.

- **Equipe:** cozinheiros (novato, experiente, sênior; com especialidade culinária), garçons, recepcionista, caixa, lavador de louça e zelador.
- **Louça:** pratos limitados; os sujos vão para a pia e o lavador lava à mão ou com lava-louças (compra na loja).
- **Limpeza:** sujeira aparece no chão e nas mesas; o zelador limpa. Higiene baixa espanta clientes.
- **Diálogos:** clientes e equipe conversam em balões (chegada, pedido, comida, conta, despedida).
- **Cardápio:** você escolhe os pratos, as bebidas e os preços. Pratos marcados como vegetariano, sem glúten ou sem lactose.
- **Bebidas:** o garçom prepara no bar (água, refri, suco, café, cerveja, caipirinha).
- **Estoque:** ingredientes de dois fornecedores (preço × qualidade × prazo de entrega).
- **Contas:** aluguel, salários, energia, gás, água e impostos, cobrados no dia 1º de cada mês.
- **Clientes:** chegam em grupos de tipos diferentes (executivo, família com crianças, casal, turista, estudante, exigente), alguns com restrição alimentar. Um crítico gastronômico aparece disfarçado de vez em quando. Quem sai muito feliz vira cliente fiel e volta pedindo o prato favorito.
- **Enquanto você está fora**, o restaurante continua funcionando e você recebe um relatório ao voltar.

## Versões

- **v0.5 — Visual novo**: móveis, cozinha, comidas e bebidas com imagens do Kenney (CC0); 8 decorações novas na loja.
- **v0.4 — Clientes**: tipos de cliente, crítico disfarçado, clientes fiéis, restrições alimentares, bar e bebidas.
- **v0.3 — Ritmo e vida**: pratos em segundos, mais clientes, balões de diálogo, lavador e pia, lava-louças, zelador e sujeira aleatória.
- **v0.2 — Gestão**: tempo real, feriados, equipe com fichas, chance de queimar, cardápio, estoque, contas mensais, finanças, avaliações, modo manual no feriado e simulação offline.
- **v0.1 — Protótipo**: cozinha, clientes, garçom, moedas, níveis, loja com 5 estilos,
  pintura de piso, troca de parede, modo editar e expansões. Arte feita 100% em código.

## Próximos passos (ideias)

- Personagens com arte de pacote (hoje ainda desenhados em código)
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
