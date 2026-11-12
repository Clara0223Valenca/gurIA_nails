# Runpod: execução do início ao fim

Comece pelo guia operacional de 30 minutos em [`RUNPOD_MANUAL.md`](RUNPOD_MANUAL.md). Ele separa treinamento, backup, worker temporário sem LoRA e ativação/validação do adaptador.

## Pod recomendado

- RTX 4090 24 GB para o perfil `quality`.
- GPU 24 GB genérica para `safe`.
- 32 GB ou mais de RAM.
- Network Volume de 75–100 GB montado em `/workspace`.
- Template oficial do AI Toolkit: <https://console.runpod.io/deploy?template=0fqzfjy6f3>.

Evite guardar checkpoints somente no volume local do Pod. O Network Volume permite trocar de máquina sem perder dataset, cache e saídas.

## Envio do pacote

Envie `guria-nails-flux2-klein-runpod.zip` e extraia assim:

```bash
mkdir -p /workspace/guria-nails-flux2-klein
cd /workspace/guria-nails-flux2-klein
unzip /workspace/guria-nails-flux2-klein-runpod.zip
```

Confirme:

```bash
python scripts/validate_dataset.py dataset \
  --expected-canonical-count 140 \
  --expected-reviewed-count 50
```

O resultado precisa ser `PASS` antes de gastar GPU com treino.

## Hugging Face

Se o download do modelo solicitar autenticação, aceite os termos do modelo na sua conta e faça login sem salvar o token no projeto:

```bash
huggingface-cli login
```

Nunca coloque o token em `metadata.csv`, configs, notebook ou ZIP.

## Smoke test e treino

```bash
cd /workspace/guria-nails-flux2-klein
bash runpod/train.sh smoke
bash runpod/train.sh quality
```

Se houver CUDA OOM no smoke ou numa GPU 24 GB diferente da 4090:

```bash
bash runpod/train.sh safe
```

O script detecta `/app/ai-toolkit` e `/workspace/ai-toolkit`. Para uma imagem sem AI Toolkit:

```bash
bash runpod/install_ai_toolkit.sh
source /workspace/ai-toolkit/venv/bin/activate
bash runpod/train.sh smoke
```

## Saídas que devem ser preservadas

```text
/workspace/guria-nails-flux2-klein/
├── environment/   # GPU, Python, commit e pacotes
├── logs/          # log integral do treino
├── output/        # checkpoints e amostras
└── reports/       # validação local e no Pod
```

Interrompa com `Ctrl+C` somente quando o AI Toolkit não estiver salvando um checkpoint. Ao repetir o mesmo perfil e nome, o toolkit pode retomar a sessão existente.

## Inferência final

```bash
python -m pip install -r runpod/requirements-inference.txt

python runpod/infer.py \
  --lora /workspace/guria-nails-flux2-klein/output/guria_nails_flux2_klein_4b_reviewed_v2/SEU_CHECKPOINT.safetensors \
  --prompt "naildecalstyle, flat 2D illustration of three cute black cats, isolated on a solid white background." \
  --output /workspace/guria-nails-flux2-klein/demo.png
```

`demo.png` é salvo em RGBA transparente por padrão. O método padrão usa `rembg`, que segmenta o objeto e preserva detalhes brancos. Na primeira execução ele baixa o modelo de recorte para `cache/rembg`; faça isso antes do evento. Para um fallback rápido sem download adicional, use `--background-removal white-key`. Use `--background-removal none` somente para depuração.

Para a apresentação, gere as amostras antes e guarde-as no volume. Uma demonstração ao vivo pode falhar por download, fila de GPU ou rede mesmo quando a LoRA está correta.
