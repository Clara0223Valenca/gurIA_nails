# GurIA Nails — dataset revisado para FLUX.2 [klein] 4B

Pacote privado para treinar uma LoRA de ilustrações isoladas para adesivos de unha. A revisão visual retirou do caminho principal fotografias, personagens, logos, moldes de unha, perspectiva acentuada, reflexos e aparência 3D.

## Estado atual

- 140 imagens originais analisadas e preservadas em `dataset/train/`.
- 50 imagens aprovadas no conjunto principal.
- 24 imagens mantidas para correção manual.
- 66 imagens separadas do conjunto principal.
- 50 pares efetivos PNG RGB + TXT em `dataset/reviewed/main_train_rgb/`.
- 50 cópias PNG RGBA byte a byte em `dataset/reviewed/main_rgba/`.
- Trigger efetivo: `naildecalstyle`, exatamente uma vez no início de cada legenda de treino.
- Auditoria local: `PASS`, sem arquivo corrompido, par órfão ou duplicata exata.

O relatório completo está em `reports/review-report.md`. A decisão de cada um dos 140 arquivos está em `dataset/review_manifest.csv`.

## Estrutura usada pelo treinador

```text
dataset/
├── train/                         # arquivo canônico dos 140 PNGs RGBA; não apontar o treinador aqui
├── reviewed/
│   ├── main_rgba/                 # 50 cópias transparentes preservadas
│   └── main_train_rgb/            # 50 PNG RGB + 50 TXT; entrada efetiva do AI Toolkit
├── splits/
│   ├── reviewed-main.txt
│   ├── needs-correction.txt
│   └── separated.txt
├── review_manifest.csv
└── review_manifest.jsonl
```

Os diretórios antigos `train_rgb_white/`, `full.txt`, `curated.txt` e `ip-review.txt` ficam apenas como rastreabilidade da preparação anterior. Nenhuma configuração revisada aponta para eles.

## Fundo e transparência

Os 140 PNGs canônicos têm canal alfa real. A prancha `reports/contact-sheet.jpg` usa quadriculado desenhado apenas na visualização; o quadriculado não faz parte dos arquivos.

O AI Toolkit atualmente abre a imagem principal como RGB, portanto alfa não é uma entrada confiável do modelo. O conjunto efetivo contém:

- 43 imagens compostas sobre branco `#FFFFFF`;
- 7 imagens com detalhes brancos compostas sobre cinza-claro `#E6E6E6`.

As legendas descrevem o fundo que o modelo realmente recebe. A resolução original foi mantida. Transparência na saída continua sendo pós-processamento com `rembg`; a LoRA não passa a gerar um quarto canal alfa.

## Modelo e ferramenta definidos

Treino:

```text
black-forest-labs/FLUX.2-klein-base-4B
```

Inferência rápida após o treino:

```text
black-forest-labs/FLUX.2-klein-4B
```

Treinador: `ostris/ai-toolkit`, fixado pelo instalador no commit curto `0473387`. As configurações usam `arch: flux2_klein_4b`, BF16, quantização `qfloat8`, batch 1 e gradient checkpointing para uma GPU de 24 GB.

O código-fonte do carregador foi conferido: `caption_ext: "txt"` lê o TXT homônimo em UTF-8, e o trigger configurado é adicionado somente quando ausente. Como as legendas já começam por `naildecalstyle`, não deve haver duplicação. A confirmação de runtime depende do smoke test no ambiente RunPod; o AI Toolkit não está instalado nesta máquina.

## Recriar e validar no Windows

```powershell
& .\scripts\build_reviewed_dataset.ps1

& .\scripts\validate_dataset.ps1 `
  -SourceRoot 'F:\Downloads\ads iffar\Quarto Semestre\gurIA nails - organização\imagens dataset'

& .\scripts\make_contact_sheet.ps1 `
  -InputSubdirectory 'reviewed\main_train_rgb' `
  -OutputPath '.\reports\reviewed-main-contact-sheet.jpg'
```

## Treinar no RunPod

1. Use uma GPU NVIDIA com 24 GB, no mínimo 32 GB de RAM e armazenamento persistente em `/workspace`.
2. Envie o conteúdo deste diretório para `/workspace/guria-nails-flux2-klein`.
3. Instale ou use o template do AI Toolkit.
4. Execute primeiro:

```bash
cd /workspace/guria-nails-flux2-klein
bash runpod/train.sh smoke
```

5. Confirme no log: 50 imagens encontradas, captions carregadas e nenhuma falha/OOM.
6. Só então execute:

```bash
bash runpod/train.sh quality
```

Se houver OOM, use `bash runpod/train.sh safe`.

Os perfis `quality` e `safe` usam 1.600 passos. Compare checkpoints com os mesmos prompts e seeds; não escolha apenas pelo menor loss.

## Inferência

```bash
python -m pip install -r runpod/requirements-inference.txt

python runpod/infer.py \
  --lora /workspace/guria-nails-flux2-klein/output/guria_nails_flux2_klein_4b_reviewed_v2/SEU_CHECKPOINT.safetensors \
  --prompt "naildecalstyle, flat 2D illustration of three cute black cats, isolated on a solid white background." \
  --output /workspace/guria-nails-flux2-klein/demo.png
```

`infer.py` gera com o modelo distilled e, por padrão, usa `rembg` para salvar PNG RGBA. Isso é pós-processamento e deve ser validado em elementos brancos e bordas finas.

## Limites

- Dataset validado não significa LoRA validada.
- O smoke test, o treino, a comparação dos checkpoints e o protocolo pós-treino ainda não foram executados.
- Três imagens aprovadas têm lado longo inferior a 1024 px; foram mantidas sem upscale artificial.
- A estética aprovada ainda mistura vetor, aquarela e line art. O conceito comum é “elemento 2D isolado”, não uma única técnica de desenho rígida.
- 86% dos exemplos efetivos usam fundo branco; o modelo pode associar o trigger a fundo claro.
- A licença/proveniência dos arquivos originais não foi fornecida. Mantenha o dataset privado até documentar os direitos por item.

## Referências técnicas

- [Guia oficial de treino FLUX.2 Klein](https://docs.bfl.ai/flux_2/flux2_klein_training)
- [Guia BFL/Hugging Face de LoRA em 24 GB](https://huggingface.co/blog/black-forest-labs/flux-2-klein-lora)
- [Model card do FLUX.2 Klein Base 4B](https://huggingface.co/black-forest-labs/FLUX.2-klein-base-4B)
- [AI Toolkit: FLUX.2 Klein 4B](https://ostris.com/docs/ai-toolkit/models/flux2-klein-4b)
- [AI Toolkit: carregamento de captions](https://github.com/ostris/ai-toolkit/blob/main/toolkit/dataloader_mixins.py)
- [Rembg: uso oficial](https://github.com/danielgatis/rembg/blob/main/USAGE.md)
