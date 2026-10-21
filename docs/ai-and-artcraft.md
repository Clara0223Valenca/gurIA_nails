# Pesquisa de compatibilidade: IA, Kaggle e ArtCraft

Pesquisa verificada em 18/10/2026 para orientar o MVP Guria Nails. Nenhum código do ArtCraft foi copiado para este projeto e nenhuma conta, chave paga ou requisição de geração externa foi criada.

## FLUX.2 Klein 4B via Pollinations

O backend agora tem um adapter para a API oficial Pollinations, usando `black-forest-labs/flux.2-klein-4b` como modelo padrão. Ele implementa geração e edição de imagens, transforma as respostas base64 em data URLs validadas e envia a chave somente do servidor. O uso exige chave e saldo/créditos suficientes na conta Pollinations; o custo varia pelo modelo e deve ser conferido no catálogo antes de gerar. O adapter HTTP próprio permanece disponível com `GURIA_AI_PROVIDER=http`.

O app envia restrições de 2D no prompt de sistema e no negative prompt definidos no backend. Esses textos orientam o modelo, mas não são uma garantia matemática de que toda geração evitará fotografia, perspectiva ou conteúdo inadequado. A usuária deve conferir cada resultado no editor antes de imprimir. Para decalque transparente, o adapter/modelo também precisa realmente retornar alfa; pedir fundo transparente não converte um PNG opaco em transparente.

Referências: [modelo FLUX.2 Klein 4B](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B), [documentação Pollinations](https://gen.pollinations.ai/docs), [preços e saldo Pollinations](https://enter.pollinations.ai/).

## Kaggle

Os notebooks Kaggle são úteis para experimentos e validação temporária de modelos, mas as regras publicadas limitam sessões GPU/TPU e encerram sessões interativas ociosas. Isso não dá uma URL estável para um produto nem substitui um servidor que permaneça disponível. Se for usado experimentalmente, o túnel deve ser temporário e o backend deve voltar a informar o provider como indisponível quando a sessão terminar. Não há configuração automática de Kaggle neste MVP.

Referência: [documentação oficial de notebooks Kaggle](https://www.kaggle.com/docs/notebooks).

## ArtCraft

O repositório público ArtCraft descreve um editor de composição 2D com camadas, ferramentas de desenho, remoção de fundo e integrações de modelos. A licença principal do repositório oferece MIT ou Apache-2.0, enquanto o aviso do projeto ressalva marcas e recursos de terceiros. A base também é um monorepo Nx/TypeScript/React significativamente maior que as necessidades imediatas deste MVP.

Conclusão de produto: reproduzir apenas a interação necessária do canvas 2D em SVG/JavaScript deixa o editor pequeno e adaptável à arte de unha. Antes de reaproveitar qualquer arquivo ou ativo do ArtCraft em uma versão futura, revisar o arquivo, os avisos de terceiros, a licença do ativo específico e os termos da marca. Nenhum desses ativos foi importado para o Guria Nails.

Referências: [repositório ArtCraft](https://github.com/storytold/artcraft), [README](https://github.com/storytold/artcraft/blob/main/README.md), [NOTICE](https://github.com/storytold/artcraft/blob/main/NOTICE).
