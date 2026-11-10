# Protocolo de avaliação pós-treino

## Objetivo

Medir o efeito real da LoRA e da trigger, sem confundir variação de seed ou configuração com melhora do modelo.

## Condições comparadas

Para cada prompt e seed, gerar três imagens com tamanho e parâmetros idênticos:

1. modelo base/distilled sem LoRA e sem trigger;
2. modelo + LoRA, mas sem `naildecalstyle`;
3. modelo + LoRA com `naildecalstyle` exatamente uma vez.

Use a mesma versão do modelo, scheduler, número de passos, guidance, resolução e seed. Registre também o peso da LoRA.

## Matriz mínima

- 12 prompts;
- 4 seeds fixos por prompt: 42, 31415, 27182 e 8675309;
- 3 condições;
- total: 144 gerações por checkpoint avaliado.

## Prompts

Inclua temas vistos e inéditos. A versão com trigger recebe apenas o prefixo `naildecalstyle, `.

1. `flat 2D illustration of a single pink hibiscus flower, isolated on a solid white background.`
2. `flat 2D illustration of two blue sardines swimming in opposite directions, isolated on a solid white background.`
3. `flat 2D illustration of three cute black cats arranged side by side, isolated on a solid white background.`
4. `flat 2D illustration of two purple mushrooms with white spots, isolated on a solid white background.`
5. `flat 2D illustration of a yellow crescent moon surrounded by five tiny stars, isolated on a solid white background.`
6. `flat 2D illustration of a red strawberry with simple green leaves, isolated on a solid white background.`
7. `flat 2D illustration of one orange koi fish with delicate fins, isolated on a solid white background.`
8. `flat 2D illustration of four small pastel clouds arranged in a circle, isolated on a solid white background.`
9. `flat 2D illustration of a black gothic moth with symmetrical ornamental wings, isolated on a solid white background.`
10. `flat 2D illustration of a teal cactus in a tiny pink pot, isolated on a solid white background.`
11. `flat 2D illustration of a white rabbit holding one red tulip, isolated on a solid light gray background.`
12. `flat 2D illustration of three geometric seashells in coral, blue, and yellow, isolated on a solid white background.`

Prompts 3, 4, 5, 7, 8, 10, 11 e 12 testam combinações ou temas ausentes do treino.

## Avaliação cega

Embaralhe as 144 imagens sem revelar a condição. Duas pessoas devem pontuar cada item de 0 a 2:

- fidelidade ao tema;
- quantidade correta;
- cores e disposição solicitadas;
- aparência plana 2D;
- ausência de mãos, dedos e unhas realistas;
- ausência de fotografia, volume 3D, reflexos e sombras projetadas;
- fundo simples e coerente;
- contorno adequado a recorte/impressão;
- diversidade em relação às outras seeds;
- ausência de texto, logo, marca d’água ou cópia evidente do dataset.

Pontuação máxima: 20 por imagem. Registre separadamente falhas críticas: mão/unha, marca/personagem, fundo complexo, objeto cortado ou texto inesperado.

## Alpha e impressão

Após escolher o melhor checkpoint:

1. aplique o mesmo removedor de fundo a 24 amostras representativas;
2. confira alpha real, halos e perda de detalhes brancos sobre fundos preto, cinza e magenta;
3. redimensione somente na etapa de layout;
4. imprima uma cartela no tamanho real e examine linhas finas, serrilhado, cores e margem de corte.

## Critério sugerido

Considere a LoRA validada apenas se a condição com LoRA + trigger superar a base e a LoRA sem trigger na mediana de estilo 2D e fidelidade, sem aumentar falhas críticas. O ganho deve aparecer em mais de uma categoria e em seeds diferentes. Registre resultados por checkpoint; a menor loss não é critério suficiente.
