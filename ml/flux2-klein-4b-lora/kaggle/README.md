# Uso no Kaggle

O Kaggle é adequado para armazenar, inspecionar e testar o dataset. O treino principal está preparado para RunPod, onde a GPU de 24 GB e o volume persistente são controláveis.

## Criar um dataset privado

No Windows, a partir da raiz deste pacote:

```powershell
& .\kaggle\build_kaggle_package.ps1 -KaggleUser 'seu-usuario-real'
```

Depois, com a CLI autenticada:

```powershell
kaggle datasets create -p .\artifacts\kaggle-upload -r zip
```

O Kaggle cria o dataset como privado por padrão; não use `--public`. O `-r zip` faz a CLI preservar as subpastas. A origem não continha licenças e proveniência suficientes por imagem.

## Formatos incluídos

- Entrada efetiva: `train/imagem.png` RGB + `train/imagem.txt`, 50 pares.
- Originais aprovados: `transparent-originals/imagem.png`, 50 PNGs RGBA.
- Decisões e hashes: `review_manifest.csv` e `review_manifest.jsonl`.
- Kaggle: `dataset-metadata.json`, gerado com o seu username.

Abra `validate_dataset.ipynb` em um Notebook Kaggle conectado ao dataset para conferir contagem, pares, dimensões, trigger e uma grade visual antes de usar os arquivos.
