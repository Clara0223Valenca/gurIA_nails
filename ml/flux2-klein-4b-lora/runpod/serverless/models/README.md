# LoRA local do worker

Esta pasta fica vazia no worker temporário. Depois do treino, copie para cá somente o checkpoint escolhido, com o nome `guria-nails.safetensors`, e reconstrua a imagem Docker.

Arquivos `.safetensors` são ignorados pelo Git para evitar publicar pesos por engano, mas entram no contexto Docker. Nunca coloque tokens ou credenciais aqui.
