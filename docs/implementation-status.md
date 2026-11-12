# Acompanhamento da especificação do MVP

## Implementado

- Identidade Guria Nails a partir da referência fornecida, navegação responsiva e quatro áreas: Criar, GurIA, Meus projetos e Perfil.
- Editor 2D com elementos SVG locais, seleção e movimento por toque, redimensionamento proporcional de imagens, opção para preencher ou encaixar a unha, rotação, duplicação, exclusão, ordem de camadas, pincel, borracha, upload e desfazer/refazer.
- Onze categorias locais com ativos vetoriais incluídos no projeto. Não depende de links instáveis de imagens de terceiros.
- Presets P/M/G ajustáveis, seis formatos, medidas manuais e medidor aproximado por foto/câmera com calibração por régua milimetrada. As medidas devem ser conferidas antes da impressão.
- Persistência local isolada por sessão, backup JSON e endpoints Java que sincronizam somente os projetos pertencentes ao token atual.
- Cartela A4 com dimensões, quantidade, margens horizontal e vertical, espaçamento e DPI configuráveis. Exportação PNG com chunk `pHYs` e impressão do navegador para PDF.
- API Java/Spring Boot com Flyway, esquema compatível com MySQL 8 e MariaDB 10.4 do XAMPP, Modo Evento, tokens opacos armazenados como hash, CORS, limites persistentes e provider de IA configurável.
- Entrada pelo código compartilhado do evento, sessão anônima por dispositivo, access token de 24 horas, recuperação por código individual, cópia/download, integração opcional com o gerenciador de credenciais e botão para nova sessão.
- `.env.example`, Compose restrito ao loopback, scripts PowerShell, testes JS e documentação de IA/licenças.

## Parcial

- O adapter de IA HTTP está pronto; ainda não existe um endpoint/model server instalado nem credencial. O padrão é `flux.2-klein-4b`, mas é necessário um adapter para o protocolo e o polling do serviço escolhido.
- O esquema contém tabelas para categorias, ativos, favoritos, tamanhos, formatos, planos e gerações; no MVP, o catálogo mostrado pelo frontend vem de JSON/arquivos SVG locais e esses cadastros ainda não têm endpoints de administração.
- As 16 verificações automatizadas do frontend e os 9 testes do backend passam. A suíte cobre isolamento do cache, geração e validação de segredos, expiração de token, quota de IA e escopo dos projetos.

## Pendente para evolução

- Painel administrativo com contas individuais para a equipe, auditoria e ativação/desativação do código do evento.
- Redis ou serviço equivalente para compartilhar o rate limit de rajada caso o backend seja executado em mais de uma instância.
- Conexão de câmera com consentimento, calibragem e fluxo de confirmação das medidas.
- Serviço real FLUX.2 Klein 4B ou outro provider, com testes de qualidade, latência, transparência e custo antes de ativar.
- Busca externa de referências e fine-tuning/LoRA, fora do fluxo mínimo.
- Conferência visual final em navegador conectado ao servidor local e teste impresso em 100% para validar a impressora específica. O acesso do navegador ao servidor local ficou bloqueado pelo sandbox nesta sessão.
