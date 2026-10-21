# Acompanhamento da especificação do MVP

## Implementado

- Identidade Guria Nails a partir da referência fornecida, navegação responsiva e quatro áreas: Criar, GurIA, Meus projetos e Perfil.
- Editor 2D com elementos SVG locais, seleção e movimento por toque, redimensionamento proporcional de imagens, opção para preencher ou encaixar a unha, rotação, duplicação, exclusão, ordem de camadas, pincel, borracha, upload e desfazer/refazer.
- Onze categorias locais com ativos vetoriais incluídos no projeto. Não depende de links instáveis de imagens de terceiros.
- Presets P/M/G ajustáveis, seis formatos, medidas manuais e medidor aproximado por foto/câmera com calibração por régua milimetrada. As medidas devem ser conferidas antes da impressão.
- Persistência local e backup JSON; endpoints Java para sincronizar projetos com MySQL quando o backend estiver disponível.
- Cartela A4 com dimensões, quantidade, margens horizontal e vertical, espaçamento e DPI configuráveis. Exportação PNG com chunk `pHYs` e impressão do navegador para PDF.
- API Java/Spring Boot com Flyway, esquema inicial compatível com MySQL 8 e MariaDB 10.4 do XAMPP, validação de projeto, CORS local e provider de IA configurável. Sem provider, a interface informa a limitação e não cria imagens fictícias.
- `.env.example`, Compose restrito ao loopback, scripts PowerShell, testes JS e documentação de IA/licenças.

## Parcial

- O adapter de IA HTTP está pronto; ainda não existe um endpoint/model server instalado nem credencial. O padrão é `flux.2-klein-4b`, mas é necessário um adapter para o protocolo e o polling do serviço escolhido.
- O banco e os endpoints de projeto estão definidos, mas login, registro, sessão e isolamento por usuário ainda não. A API é local e não deve ser exposta publicamente.
- O esquema contém tabelas para categorias, ativos, favoritos, tamanhos, formatos, planos e gerações; no MVP, o catálogo mostrado pelo frontend vem de JSON/arquivos SVG locais e esses cadastros ainda não têm endpoints de administração.
- As dez verificações automatizadas do frontend passaram. Nesta etapa, a API compilou e seus dois testes passaram usando JDK 25, Maven 3.9.16 e Spring Boot 4.1.0 já disponível no cache local. O `pom.xml` do projeto continua em Spring Boot 4.1.1; essa versão não está em cache, então o build exato declarado ainda não pôde ser validado sem acesso ao Maven Central. O teste foi simplificado para não depender do attach dinâmico do Mockito, bloqueado neste ambiente. MySQL não foi iniciado porque Docker não está instalado.

## Pendente para evolução

- Autenticação e autorização por conta, sincronização na nuvem e proteção contra chamadas em excesso.
- Conexão de câmera com consentimento, calibragem e fluxo de confirmação das medidas.
- Serviço real FLUX.2 Klein 4B ou outro provider, com testes de qualidade, latência, transparência e custo antes de ativar.
- Busca externa de referências e fine-tuning/LoRA, fora do fluxo mínimo.
- Conferência visual final em navegador conectado ao servidor local e teste impresso em 100% para validar a impressora específica. O acesso do navegador ao servidor local ficou bloqueado pelo sandbox nesta sessão.
