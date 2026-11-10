# Registro de ambiente

`runpod/train.sh` grava aqui, no início de cada execução:

- commit do AI Toolkit;
- versão do Python;
- `pip freeze`;
- saída de `nvidia-smi`.

Esses arquivos tornam o treino apresentável e repetível. Não inclua tokens do Hugging Face, chaves do Kaggle ou variáveis secretas nesta pasta.
