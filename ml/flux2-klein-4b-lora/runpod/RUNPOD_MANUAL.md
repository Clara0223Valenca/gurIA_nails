# Manual direto: treino e Serverless do GurIA Nails

Este manual separa três marcos que não devem ser confundidos:

1. **integração temporária:** worker gera com o FLUX.2 [klein] sem LoRA;
2. **treinamento:** o Pod produz um checkpoint `.safetensors`;
3. **personalização concluída:** o mesmo worker carrega o LoRA e a comparação controlada comprova o efeito.

Nenhum script deste projeto cria Pod, endpoint ou outro recurso pago. A cobrança só começa quando você confirma a criação na interface da Runpod ou envia uma geração a um endpoint já criado.

## O que cabe em 30 minutos

Em 30 minutos é razoável configurar a conta, criar o armazenamento/Pod, enviar o pacote, validar o dataset e iniciar o smoke test. Download do modelo, smoke test, treino completo, build da imagem e publicação podem ultrapassar esse tempo. Não tente compensar o prazo pulando o smoke test ou ignorando o orçamento.

## Resultado da auditoria local

- 140 imagens canônicas preservadas;
- 50 imagens e 50 legendas no conjunto efetivo `dataset/reviewed/main_train_rgb`;
- 50 pares com nomes correspondentes;
- `naildecalstyle` aparece exatamente uma vez em cada uma das 50 legendas efetivas;
- nenhum duplicado exato;
- 15 candidatos a quase duplicata para conferência visual em `reports/near-duplicate-candidates.csv`;
- validação final: `PASS`, sem erros e sem alertas bloqueadores.

Os originais não foram alterados. Antes de gastar, abra `reports/reviewed-main-contact-sheet.jpg` e confira visualmente os 15 candidatos. Semelhança não significa duplicata; remova algo apenas por uma decisão humana e sempre em uma cópia.

## Compatibilidade escolhida

- treino: `black-forest-labs/FLUX.2-klein-base-4B`;
- geração: `black-forest-labs/FLUX.2-klein-4B` destilado;
- arquitetura do AI Toolkit: `flux2_klein_4b`;
- trigger: `naildecalstyle`;
- precisão/checkpoint: BF16 + Safetensors.

O modelo Base é o alvo próprio para LoRA. A documentação técnica da Hugging Face/Black Forest Labs informa que o adaptador treinado no Base pode ser carregado no modelo destilado. Mesmo assim, a aceitação final depende da comparação com prompts e sementes iguais.

Fontes: [modelo Base](https://huggingface.co/black-forest-labs/FLUX.2-klein-base-4B), [guia de LoRA do FLUX.2 klein](https://huggingface.co/blog/black-forest-labs/flux-2-klein-lora).

## Etapa A — preparar as contas sem gastar

1. Entre em [Runpod Console](https://console.runpod.io/).
2. Em Billing, confirme o saldo e ative os avisos de gasto disponíveis na conta.
3. Crie uma conta na [Hugging Face](https://huggingface.co/) e gere um token **Read**. Guarde-o como segredo; não cole no ZIP, Git ou capturas de tela.
4. Na Runpod, não crie API key ainda se você só vai trabalhar pelo Console. A API key será necessária para ligar o backend ao Serverless, não para treinar pelo terminal do Pod.
5. No Windows, gere novamente o pacote após qualquer alteração:

```powershell
& '.\ml\flux2-klein-4b-lora\scripts\build_runpod_package.ps1'
Get-FileHash '.\ml\guria-nails-flux2-klein-runpod.zip' -Algorithm SHA256
```

## Etapa B — criar o Pod de treinamento

Esta é a primeira etapa paga. Pare antes do clique final se ainda não quiser cobrança.

1. Abra **Pods → Deploy**.
2. Escolha uma **RTX 4090 de 24 GB**, On-Demand, uma GPU. Uma L4/A5000/3090 de 24 GB pode funcionar com o perfil `safe`, mas será mais lenta.
3. Use o [template oficial do AI Toolkit](https://console.runpod.io/deploy?template=0fqzfjy6f3), ou uma imagem PyTorch com CUDA compatível e depois execute `install_ai_toolkit.sh`.
4. Requisitos: pelo menos 32 GB de RAM, 20 GB de container disk e aproximadamente 70 GB em `/workspace`.
5. Para uma execução única e barata, use **volume disk** e faça download do backup antes de **Terminate**. Se precisar manter dados depois de apagar o Pod, use Network Volume e aceite a cobrança contínua.
6. Confira o preço por hora mostrado no botão de deploy; anote como `PRECO_HORA`. Só então confirme **Deploy On-Demand**.

O container disk é apagado quando o Pod para. O volume disk sobrevive a Stop/Start, mas é apagado ao terminar o Pod e custa mais enquanto está parado. Network Volume sobrevive à exclusão do Pod e continua cobrando até ser apagado. Valores publicados pela Runpod: container/volume em execução por volta de US$ 0,10/GB/mês; volume disk parado por volta de US$ 0,20/GB/mês; Network Volume abaixo de 1 TB, US$ 0,07/GB/mês. Confirme sempre o total exibido no Console. Fonte: [tipos de armazenamento](https://docs.runpod.io/pods/storage/types).

## Etapa C — enviar e validar o dataset

No Pod, abra **Connect → Jupyter Lab**, envie `ml/guria-nails-flux2-klein-runpod.zip` para `/workspace` e abra um Terminal:

```bash
mkdir -p /workspace/guria-nails-flux2-klein
cd /workspace/guria-nails-flux2-klein
unzip -q /workspace/guria-nails-flux2-klein-runpod.zip

python scripts/validate_dataset.py dataset \
  --expected-canonical-count 140 \
  --expected-reviewed-count 50 \
  --report reports/validation-report-runpod.json
```

Pare se o resultado não for `PASS`.

Se o template não trouxer `/app/ai-toolkit/run.py`:

```bash
cd /workspace/guria-nails-flux2-klein
bash runpod/install_ai_toolkit.sh
```

Autentique a Hugging Face sem gravar o token no projeto:

```bash
export HF_TOKEN='COLE_SEU_TOKEN_READ_APENAS_NESTE_TERMINAL'
```

Ao fechar o terminal, a variável desaparece. Não execute `echo $HF_TOKEN` durante gravações ou compartilhamento de tela.

## Etapa D — smoke test e orçamento de US$ 5

O teto de US$ 5 é planejamento, não garantia. Reserve pelo menos US$ 0,50 para armazenamento, downloads, amostras e alguma repetição; use US$ 4,50 como teto operacional de compute.

```bash
cd /workspace/guria-nails-flux2-klein
bash runpod/train.sh smoke
cat environment/last-smoke-run.env
```

Copie `elapsed_seconds` e use o preço/hora real do Console:

```bash
python runpod/estimate_training_cost.py \
  --hourly-rate PRECO_HORA \
  --smoke-seconds SEGUNDOS_DO_SMOKE \
  --budget 4.50
```

O guia de referência relata aproximadamente uma hora numa RTX 4090 para um LoRA 4B, mas o seu rank, 50 imagens, geração de amostras, velocidade do disco e disponibilidade da GPU podem mudar muito esse número. A extrapolação do seu próprio smoke test é a decisão mais segura.

Não inicie o treino completo se:

- o smoke falhar ou gerar CUDA OOM;
- a projeção ultrapassar US$ 4,50;
- o saldo já gasto + projeção + armazenamento ultrapassar US$ 5;
- as amostras do smoke estiverem claramente corrompidas.

Se houver OOM, use `bash runpod/train.sh safe`. Se a estimativa couber:

```bash
bash runpod/train.sh quality
```

## Monitorar, interromper e retomar

Abra um segundo terminal:

```bash
watch -n 2 nvidia-smi
tail -f /workspace/guria-nails-flux2-klein/logs/train-quality.log
```

Confira também **Billing/Pods** no Console. O treino salva a cada 250 steps. Para interromper, use `Ctrl+C`, mas nunca durante a mensagem de salvamento de checkpoint. Executar novamente o mesmo comando e a mesma configuração faz o AI Toolkit procurar o último checkpoint da sessão e continuar; confirme no log o step retomado antes de confiar nisso.

Para um limite conservador, calcule a hora de parada antes de começar e coloque um alarme externo. Não use `kill -9`: ele pode corromper o checkpoint que está sendo gravado.

## Backup e desligamento correto

Ao terminar ou interromper:

```bash
cd /workspace/guria-nails-flux2-klein
find output -type f -name '*.safetensors' -print
tar -czf /workspace/guria-nails-backup.tgz output logs environment reports configs
sha256sum /workspace/guria-nails-backup.tgz | tee /workspace/guria-nails-backup.tgz.sha256
```

Baixe os dois arquivos pelo Jupyter e valide no Windows:

```powershell
Get-FileHash '.\guria-nails-backup.tgz' -Algorithm SHA256
```

Depois:

1. clique **Stop** para encerrar imediatamente o compute da GPU;
2. confirme que o backup abre e contém o `.safetensors`;
3. clique **Terminate** se não precisar mais do volume disk;
4. em **Storage**, apague Network Volumes que não serão usados no Serverless.

Stop não elimina toda cobrança de armazenamento. Terminate apaga o volume disk; Network Volume só para de cobrar quando você o apaga explicitamente.

## Etapa E — construir o worker Serverless temporário

Os arquivos estão em `runpod/serverless`. O worker:

- carrega o pipeline apenas uma vez por processo;
- aceita apenas `prompt`, `seed`, `width` e `height`;
- começa em 768 × 768, uma imagem por job;
- não aceita URL, modelo, código, LoRA ou negative prompt do cliente;
- devolve WebP real em Base64, seed, dimensões e tempos;
- informa `hasAlpha: false`; não promete transparência.

Com Docker Desktop e uma conta de registry:

```powershell
docker build `
  -t SEU_USUARIO/guria-nails-worker:sem-lora-v1 `
  '.\ml\flux2-klein-4b-lora\runpod\serverless'
docker login
docker push SEU_USUARIO/guria-nails-worker:sem-lora-v1
```

## Etapa F — criar o endpoint sem LoRA

Esta etapa passa a cobrar quando um worker é iniciado por uma requisição.

1. Abra **Serverless → New Endpoint → Custom/Container image**.
2. Informe `SEU_USUARIO/guria-nails-worker:sem-lora-v1`.
3. Escolha endpoint **Queue-based**.
4. GPU: uma de 24 GB. Para custo menor, priorize L4/A5000/3090; para menor tempo, 4090 PRO.
5. Configure: **Active workers 0**, **Max workers 1**, **GPUs/worker 1**, **Idle timeout 5 s**, **Execution timeout 600 s**, **FlashBoot ligado**.
6. Segredos/variáveis:

```text
HF_TOKEN=<token Read da Hugging Face>
GURIA_MODEL_ID=black-forest-labs/FLUX.2-klein-4B
GURIA_LORA_ENABLED=false
GURIA_CPU_OFFLOAD=true
```

7. Se a tela oferecer **Cached models**, adicione `black-forest-labs/FLUX.2-klein-4B` para reduzir cold starts.
8. Na aba **Requests**, cole o conteúdo de `serverless/test-input.json` e execute uma única vez.

O Serverless cobra por segundo do início ao desligamento do worker, incluindo carregamento do modelo, execução e os segundos de idle. Um worker escalado a zero não cobra compute; armazenamento continua cobrando. Fonte: [preços Serverless](https://docs.runpod.io/serverless/pricing), [configuração do endpoint](https://docs.runpod.io/serverless/endpoints/endpoint-configurations).

## Etapa G — carregar o LoRA depois do treino

1. Escolha o checkpoint por comparação visual, não apenas pelo menor loss.
2. Copie-o para `runpod/serverless/models/guria-nails.safetensors`. O Git ignora esse arquivo.
3. Reconstrua e publique uma tag imutável:

```powershell
docker build `
  -t SEU_USUARIO/guria-nails-worker:lora-v1 `
  '.\ml\flux2-klein-4b-lora\runpod\serverless'
docker push SEU_USUARIO/guria-nails-worker:lora-v1
```

4. Troque a imagem do endpoint e configure:

```text
GURIA_LORA_ENABLED=true
GURIA_LORA_ROOT=/app/models
GURIA_LORA_PATH=/app/models/guria-nails.safetensors
GURIA_LORA_SCALE=1.0
```

O caminho vem de configuração confiável do endpoint, nunca do navegador.

## Etapa H — validação controlada com e sem adaptador

Use o mesmo JSON de entrada em duas versões do endpoint, primeiro sem LoRA e depois com LoRA. O cliente envia o mesmo prompt sem trigger e a mesma seed; o worker acrescenta `naildecalstyle` internamente somente quando o LoRA está habilitado.

Teste pelo menos estas combinações em 768 × 768:

```text
seed 42: flat 2D illustration of three cute black cats, isolated on a solid white background
seed 42: flat 2D illustration of a blue butterfly with tiny floral details, isolated on a solid white background
seed 1337: flat 2D illustration of two purple mushrooms with white spots, isolated on a solid white background
seed 2026: flat 2D illustration of a red strawberry with simple green leaves, isolated on a solid white background
```

Registre lado a lado:

- aderência ao estilo do dataset;
- contorno legível em tamanho de unha;
- ausência de mãos, textos, marca-d'água e cenário;
- diversidade entre sementes;
- tempo de cold start e de geração;
- falhas e custo apenas como estimativa.

A personalização só está concluída quando o endpoint com LoRA inicia, responde com `loraEnabled: true` e supera consistentemente a versão sem adaptador nos critérios visuais. Depois disso vem a etapa separada de ligar o backend Render ao `/run`, `/status` e `/cancel` do Runpod; nunca exponha a API key no frontend.
