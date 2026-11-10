# GurIA Nails — reviewed nail-decal dataset

Dataset privado para experimentar uma style LoRA de elementos gráficos isolados para adesivos de unha.

| Campo | Valor |
|---|---:|
| Imagens canônicas analisadas | 140 |
| Aprovadas no treino principal | 50 |
| Precisam de correção manual | 24 |
| Separadas do conjunto principal | 66 |
| Pares RGB + TXT efetivos | 50 |
| Cópias transparentes aprovadas | 50 |
| Trigger | `naildecalstyle` |
| Fundos efetivos | 43 brancos; 7 cinza-claro |
| Duplicatas exatas | 0 |

## Entrada efetiva

O AI Toolkit deve receber somente `reviewed/main_train_rgb/`. Cada PNG tem um TXT homônimo em UTF-8. Todas as legendas começam por `naildecalstyle, ` e descrevem a imagem e o fundo apresentado ao modelo.

`reviewed/main_rgba/` preserva as mesmas 50 artes com alfa, mas não é a pasta apontada na configuração. `train/` preserva os 140 PNGs canônicos e não deve ser usado como conjunto principal.

## Revisão

`review_manifest.csv` contém uma linha por arquivo com status, motivo, ação, grupo de variantes, fundo, legenda antiga, legenda revisada e hashes SHA-256. As pranchas estão em `../reports/`.

Não existe divisão treino/validação de imagens nesta versão. Com somente 50 exemplos e grande diversidade temática, reservar imagens reduziria demais a cobertura. A avaliação será feita com prompts e seeds fixos, incluindo combinações inéditas. Se uma divisão for criada no futuro, os valores de `near_variant_group` devem permanecer inteiros em um único lado.

## Alfa e qualidade

Os 140 PNGs canônicos têm transparência real. O fundo efetivo é materializado em RGB porque o carregador do treinador converte a imagem principal para RGB. Sete exemplos com partes brancas usam `#E6E6E6`; os demais usam `#FFFFFF`. Nenhuma imagem foi redimensionada ou reconstruída automaticamente.

Três exemplos aprovados têm lado longo inferior a 1024 px e foram preservados sem upscale: IDs 039, 097 e 106.

## Licença

A pasta fonte não contém documentação suficiente de autoria ou licença. Mantenha este dataset privado. A separação operacional de personagens, marcas e celebridades reduz risco no conjunto principal, mas não substitui análise jurídica ou comprovação de proveniência.
