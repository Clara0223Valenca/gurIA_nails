# Relatório de revisão — GurIA Nails

Data da execução: 7 de novembro de 2026.

## Conclusão

O conjunto principal foi reduzido de 140 para 50 exemplos após inspeção técnica e visual. Os 140 arquivos continuam preservados; nenhuma arte foi apagada ou reconstruída automaticamente.

| Resultado | Quantidade |
|---|---:|
| Arquivos analisados | 140 |
| Aprovados para o treino principal | 50 |
| Precisam de correção manual | 24 |
| Separados do treino principal | 66 |
| Correções automáticas de conteúdo | 0 |
| Duplicatas exatas | 0 |

Status correto: **dataset revisado e tecnicamente validado localmente**. Status ainda não permitido: **LoRA validada** ou **pipeline RunPod validado de ponta a ponta**.

## Evidências geradas

- `technical-audit.json`: resultado automatizado `PASS`.
- `technical-inventory.csv`: formato real, dimensões, proporção, pixel format, alpha, SHA-256 e dHash dos 140 PNGs.
- `near-duplicate-candidates.csv`: 15 pares candidatos por hash perceptual.
- `reviewed-main-contact-sheet.jpg`: prancha do conjunto efetivo de 50 imagens.
- `doubtful-contact-sheet.jpg`: abertura ampliada dos principais casos duvidosos.
- `contact-sheet.jpg`: prancha dos 140 PNGs sobre quadriculado de visualização.
- `dataset/review_manifest.csv`: decisão, motivo e ação por arquivo.

## Validação técnica executada

O script `scripts/audit_reviewed_dataset.ps1` abriu novamente a pasta original e as cópias preparadas. Resultado:

- 140/140 fontes presentes, não vazias, abrindo sem erro;
- 139 assinaturas PNG e 1 assinatura JPEG coerentes com as extensões originais;
- 140/140 PNGs canônicos abrem como `Format32bppArgb`;
- 140/140 têm pixels com alpha menor que 255, confirmando transparência real;
- 50/50 cópias RGBA aprovadas têm o mesmo SHA-256 da cópia canônica;
- 50/50 imagens efetivas são PNG RGB opacas e mantêm as dimensões originais;
- 50/50 imagens têm TXT homônimo, sem legenda vazia ou órfã;
- 50/50 legendas são UTF-8 válido;
- `naildecalstyle` aparece exatamente uma vez e no início das 50 legendas;
- 0 conflitos de nome ignorando maiúsculas/minúsculas;
- 0 grupos de duplicata exata por SHA-256.

As dimensões canônicas mais frequentes são 1080×1350 (57), 1254×1254 (17) e 1024×1536 (11). No conjunto aprovado há 37 retratos, 9 quadradas e 4 paisagens; larguras de 391 a 1330 px e alturas de 418 a 1672 px. Três aprovadas estão abaixo de 1024 no lado longo: IDs 039, 097 e 106. Elas foram preservadas, sem upscale.

## Duplicatas e variantes

O dHash de 64 bits, composto sobre branco, marcou 15 pares com distância até 5 e proporção semelhante. A inspeção visual confirmou como variantes próximas:

- 078/079: carro em duas cores — ambos separados;
- 121/122: sardinhas em duas paletas — mantidas juntas no conjunto principal;
- 128/129, 128/130 e 129/130: logo GurIA em três cores — separados.

Os demais candidatos do algoritmo são falsos positivos causados por objetos pequenos e fundos transparentes semelhantes. O manifesto acrescenta grupos manuais que o dHash não captura bem: laços 090–093, cerejas com laço 040–041, lavandas 094/113, folhagens 063/064, sardinhas 121–123, frutas 067–077, retratos BTS 024–030, Monster High 098–103, Moranguinha 104/110, discos 034/054 e templates 003/004/140.

Não há holdout de imagens nesta revisão. Com 50 aprovadas e 17 categorias, separar uma validação reduziria demais a cobertura. Caso uma divisão seja criada após ampliar o conjunto, cada `near_variant_group` deve permanecer inteiro em um único split para evitar vazamento.

## Inspeção visual

Foram examinadas a prancha dos 140 itens, a prancha final e pranchas ampliadas. Casos duvidosos foram abertos sobre quadriculado para distinguir transparência de fundo desenhado.

### Aprovadas — 50

IDs: 001, 002, 007, 009, 011, 016, 023, 036, 038, 039, 040, 041, 042, 043, 046, 048, 052, 053, 055, 056, 057, 058, 062, 063, 064, 086, 090, 091, 092, 093, 094, 095, 097, 105, 106, 111, 112, 113, 117, 120, 121, 122, 123, 133, 134, 135, 136, 137, 138 e 139.

Elas são elementos isolados em ilustração 2D. Variações de tonalidade de aquarela ou desenho foram aceitas quando não formavam sombra projetada ou reflexo fotográfico. A distribuição temática é: floral 6, marinho 6, laços 4, celestial 4, frutas 4, sazonal 4, Halloween 4, tribal 3, animais 3, gótico 3, botânico 2, símbolos 2 e sete categorias com um exemplo.

### Precisam de correção manual — 24

| IDs | Problema dominante | Ação |
|---|---|---|
| 010 | folhagem, enfeites e iluminação volumétrica | redesenhar/limpar manualmente em 2D |
| 017 | brilho e textura reflexiva de batom | remover reflexos manualmente |
| 031 | globo espelhado e volume 3D | criar versão gráfica plana |
| 034, 054 | sulcos e reflexos realistas em discos | criar versão plana sem brilho |
| 037 | perspectiva e sobreposição de cartas | recompor sem foreshortening |
| 050, 051 | metal com reflexos e volume | redesenhar como line art/flat color |
| 059 | brilho e relevo de contas | achatar volume manualmente |
| 061 | halo/sombra cinza no contorno | limpar borda manualmente |
| 065 | fones com volume e perspectiva | redesenhar em vista plana |
| 067–077 | série de frutas brilhantes/volumétricas | criar série flat consistente |
| 080 | gatinho fotográfico/fotorrealista | substituir por ilustração autorizada e plana |
| 083 | guitarra com perspectiva, reflexos e detalhe realista | criar versão gráfica plana |

Nenhuma dessas imagens entrou em `reviewed/main_train_rgb`.

### Separadas — 66

- 003, 004 e 140: moldes completos de unha, mantidos como referência separada;
- 005, 066, 125 e 127–130: logos, branding ou marca de evento;
- 082: padrão retangular denso, não um elemento isolado;
- as outras 55: personagens, celebridades, marcas ou desenhos reconhecíveis de terceiros.

A razão exata por arquivo está em `review_manifest.csv`.

## Fundos e transparência

O quadriculado aparece apenas nas pranchas; não foi encontrado quadriculado desenhado nos PNGs. O canal alfa real foi verificado nos 140 canônicos. Para o treinador, as 50 aprovadas foram compostas sem redimensionamento:

- 43 sobre `#FFFFFF`;
- 7 sobre `#E6E6E6`: 001, 036, 039, 090, 097, 106 e 120.

O cinza-claro evita perder asas translúcidas, cartas, ossos, xadrez branco, neve, anéis brancos e barba. O fundo efetivo aparece na legenda correspondente.

O AI Toolkit converte a imagem principal para RGB, portanto apontar diretamente para RGBA não preservaria transparência no tensor do modelo. O FLUX gera imagem RGB; alfa verdadeiro continuará sendo produzido depois da inferência por segmentação/remoção de fundo. Isso precisa ser testado em branco, transparências parciais e linhas finas.

## Legendas e trigger

Antes, as legendas usavam um trigger antigo e não descreviam o fundo efetivo:

```text
GUR1A_NAILS. A human skeleton embracing a small black-and-white cat.
```

Depois:

```text
naildecalstyle, flat 2D illustration of a human skeleton embracing a small black-and-white cat, isolated on a solid light gray background.
```

Outro exemplo:

```text
Antes: GUR1A_NAILS. Two simple bright red cherries joined by green stems and a single leaf.
Depois: naildecalstyle, flat 2D illustration of two simple bright red cherries joined by green stems and a single leaf, isolated on a solid white background.
```

As 50 descrições preservam quantidade, cor e composição do exemplo. Não foram usadas listas de ausências em captions. O `trigger_word` também está configurado como `naildecalstyle`; o código do AI Toolkit injeta o trigger somente se ausente, evitando duplicar a palavra já presente. O smoke test deve confirmar o comportamento da versão instalada.

## Compatibilidade com o treinamento

Configuração pretendida:

- modelo de treino: `black-forest-labs/FLUX.2-klein-base-4B`;
- modelo de inferência: `black-forest-labs/FLUX.2-klein-4B`;
- treinador: `ostris/ai-toolkit`, commit fixado `0473387`;
- arquitetura: `flux2_klein_4b`;
- pasta: `/workspace/guria-nails-flux2-klein/dataset/reviewed/main_train_rgb`;
- captions: `caption_ext: "txt"`;
- GPU alvo: 24 GB, BF16, qfloat8, batch 1, gradient checkpointing;
- treino principal proposto: 1.600 passos; smoke test: 100 passos.

A leitura dos TXT homônimos foi confirmada no código-fonte do loader. A configuração e a estrutura foram verificadas estaticamente. Não foi possível executar o AI Toolkit localmente porque Python e o ambiente CUDA não estão instalados nesta máquina. Portanto, a compatibilidade de runtime permanece pendente do smoke test gratuito dentro do Pod já escolhido; nenhum treino ou recurso pago foi iniciado nesta revisão.

## Diversidade e riscos de associação

O conjunto aprovado é mais coerente que os 140 originais, mas ainda mistura vetor, line art e aquarela. O traço compartilhado é objeto 2D isolado. Isso pode produzir uma LoRA flexível, porém menos rígida que um dataset de uma única técnica.

Possíveis associações indevidas:

- 86% dos exemplos têm fundo branco;
- floral + marinho somam 24% do conjunto;
- laços e sardinhas têm variantes próximas;
- rosa, vermelho, azul e preto aparecem com frequência;
- as composições são majoritariamente verticais (37/50).

Esses riscos devem ser medidos com temas inéditos, quantidades variadas e fundo solicitado explicitamente.

## Limitações e pendências

1. Executar o validador Python dentro do RunPod.
2. Confirmar no log que o loader encontrou exatamente 50 imagens e leu os TXTs.
3. Executar o smoke test de 100 passos e registrar GPU, commit, versões e pico de VRAM.
4. Só depois executar o treino completo e o protocolo pós-treino.
5. Documentar proveniência/licença por arquivo antes de publicação ou comercialização.
6. Corrigir manualmente os 24 itens somente se houver interesse em ampliar o dataset; depois repetir a inspeção.

## Dataset validado versus LoRA validada

**Dataset validado:** arquivos, pares, UTF-8, alpha, hashes, fundo efetivo, trigger, classificação visual e caminho do loader foram verificados. O conjunto efetivo está materializado.

**LoRA não validada:** nenhum peso foi treinado; não há evidência ainda de que `naildecalstyle` altere o estilo, mantenha a intenção, evite mãos/unhas, produza fundo limpo ou generalize. Isso só pode ser medido após treino com as comparações definidas no protocolo.
