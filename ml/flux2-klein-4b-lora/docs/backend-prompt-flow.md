# Fluxo futuro do backend

Exemplo de pedido:

```text
3 gatinhos pretos fofos
```

Prompt preparado:

```text
naildecalstyle, flat 2D illustration of three cute black cats, isolated on a solid white background.
```

## Regras

1. Normalize espaços e pontuação do pedido, mas preserve tema, quantidade, cor e composição solicitados.
2. Remova ocorrências existentes de `naildecalstyle` antes de acrescentar a forma canônica no início. O prompt enviado deve conter a trigger exatamente uma vez.
3. Acrescente apenas atributos de apresentação necessários, como “flat 2D illustration” e o fundo que será usado no pós-processamento.
4. Carregue `black-forest-labs/FLUX.2-klein-4B` e a LoRA treinada no Base 4B compatível.
5. Não trate a trigger como comando ou garantia. Ela é uma pista aprendida e só terá efeito se o treinamento for eficaz.
6. Não prometa que o modelo nunca gerará mãos, unhas, sombras, perspectiva ou texto. Use avaliação, filtros e regeneração quando necessário.
7. A geração é RGB. Remova o fundo depois com segmentação e valide bordas/detalhes claros antes de entregar PNG RGBA.

## Pseudocódigo

```text
intent = parse_user_request(user_text)
description = preserve_subject_count_color_layout(intent)
prompt_without_trigger = remove_case_insensitive(description, "naildecalstyle")
prompt = "naildecalstyle, flat 2D illustration of " + prompt_without_trigger
prompt += ", isolated on a solid white background."
assert count_case_insensitive(prompt, "naildecalstyle") == 1
rgb = generate(base_model, lora, prompt, seed, settings)
rgba = remove_background(rgb)
return validate_alpha_and_edges(rgba)
```
