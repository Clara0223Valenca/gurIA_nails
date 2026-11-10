# Checklist para o Fronteira Summit

## Antes do evento

- [ ] `scripts/validate_dataset.py` retorna `PASS` no próprio RunPod.
- [ ] O log do carregador informa 50 imagens em `dataset/reviewed/main_train_rgb`.
- [ ] O smoke test de 100 passos terminou sem OOM.
- [ ] O treino completo terminou e os checkpoints estão no Network Volume.
- [ ] O checkpoint foi escolhido por comparação visual com prompts e seeds fixos, não apenas pelo loss.
- [ ] O protocolo `docs/post-training-evaluation-protocol.md` foi executado.
- [ ] O `rembg` já está em cache e foi testado em elementos brancos e bordas finas.
- [ ] O PNG RGBA final abre corretamente no editor GurIA Nails.
- [ ] Há uma cartela impressa em escala real.
- [ ] Há vídeo/capturas locais para contingência de internet ou GPU.
- [ ] A demonstração pública não usa personagens, celebridades ou marcas de terceiros.

## Roteiro técnico curto

1. Mostrar `reports/reviewed-main-contact-sheet.jpg` e explicar a seleção 50/24/66.
2. Mostrar um par de `dataset/reviewed/main_train_rgb/` e o trigger `naildecalstyle` uma única vez.
3. Mostrar `dataset/review_manifest.csv`: decisão, motivo, fundo e hashes.
4. Explicar treino no Base 4B e inferência no distilled 4B.
5. Comparar base, LoRA sem trigger e LoRA com trigger usando o mesmo seed.
6. Remover o fundo, importar o PNG RGBA e posicionar a arte numa unha.

## Prompts públicos

```text
naildecalstyle, flat 2D illustration of three cute black cats arranged side by side, isolated on a solid white background.
naildecalstyle, flat 2D illustration of a blue butterfly with tiny floral details, isolated on a solid white background.
naildecalstyle, flat 2D illustration of a yellow crescent moon surrounded by five small stars, isolated on a solid white background.
naildecalstyle, flat 2D illustration of two purple mushrooms with white spots, isolated on a solid white background.
naildecalstyle, flat 2D illustration of a turquoise sea turtle viewed from above, isolated on a solid white background.
naildecalstyle, flat 2D illustration of a red strawberry with simple green leaves, isolated on a solid white background.
```
