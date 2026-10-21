# Guria Nails

Ateliê digital para compor artes 2D de nail art, salvar projetos editáveis e preparar adesivos individuais ou cartelas A4 para impressão. A interface foi construída em JavaScript sem dependências instaladas; a API usa Java, Spring Boot, MariaDB Connector/J e Flyway, com suporte a MySQL 8 e MariaDB (incluindo o banco distribuído pelo XAMPP).

## Rodar a interface

Requer Node.js 20 ou superior.

```powershell
node .\scripts\dev-server.mjs
```

Abra `http://127.0.0.1:4173`. Sem o backend, o editor, a biblioteca, os projetos neste navegador e as exportações continuam disponíveis. A GurIA não gera imagens nesse modo e exibe o motivo.

## Rodar API e banco

Requer JDK 21 e Maven 3.6.3 ou superior. Você pode usar o banco do XAMPP ou Docker/MySQL.

### Usar o banco do XAMPP

O botão **MySQL** do XAMPP inicia MariaDB. Nesta instalação, ele está configurado na porta `3307`. Como esta versão do MariaDB é antiga, o modo XAMPP seleciona o dialeto legado do Hibernate para compatibilidade.

1. No XAMPP Control Panel, inicie **MySQL**. Se aparecer `ibdata1 must be writable`, feche o painel e reabra o XAMPP Control Panel como administrador antes de iniciar MySQL. Não apague arquivos da pasta `mysql/data`. Para abrir o phpMyAdmin, inicie também **Apache** e acesse `http://localhost/phpmyadmin`.
2. No phpMyAdmin, abra a aba **SQL** e execute este script para criar o banco e um usuário local para a aplicação:

```sql
CREATE DATABASE IF NOT EXISTS guria_nails CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'guria'@'127.0.0.1' IDENTIFIED BY 'troque-esta-senha-local';
GRANT ALL PRIVILEGES ON guria_nails.* TO 'guria'@'127.0.0.1';
FLUSH PRIVILEGES;
```

3. No PowerShell, crie a configuração do XAMPP sem alterar seu `.env` atual:

```powershell
if (-not (Test-Path .env.xampp)) { Copy-Item .env.xampp.example .env.xampp }
```

Se você trocou a senha no script SQL, atualize `DB_PASSWORD` em `.env.xampp` com a mesma senha. Se a porta do XAMPP for diferente de `3307`, ajuste também `DB_URL`.

4. Inicie a API usando a configuração do XAMPP:

```powershell
./scripts/start-backend.ps1 -Xampp
```

Na primeira inicialização, Flyway cria as tabelas e carrega os dados iniciais. A API fica em `http://localhost:8080/api`.

### Usar Docker com MySQL 8

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose up -d mysql
./scripts/start-backend.ps1
```

O script carrega `.env` sem imprimir os valores e inicia o Spring Boot. Enquanto a API está disponível, projetos salvos sincronizam com o banco. Se a API ou o banco estiverem indisponíveis, o editor mantém os projetos no armazenamento local e informa que a sincronização não ocorreu.

O backend atual não tem login. Mantenha-o em ambiente local controlado; não publique a API na internet. O perfil é uma preferência local. A tabela de usuários e planos prepara o esquema, mas autenticação, assinatura e sincronização por conta não estão implementadas neste MVP.

## Uso do editor

- Adicione itens da biblioteca local, carregue PNG/JPG/WEBP e aumente imagens mantendo a proporção até o limite da unha. Use **Preencher unha** para cobrir toda a área (com corte central) ou **Mostrar inteira** para encaixar a arte sem cortá-la. Pinte, apague, mova, redimensione, gire, duplique, exclua e reorganize camadas.
- Escolha o fundo transparente ou com cor. A cor escolhida fica disponível e salva mesmo quando a prévia está transparente; ela volta a aparecer ao selecionar **Com cor**.
- Desfaça/refaça ações e ajuste formato e medidas manuais da unha.
- Salve projetos com as camadas preservadas, marque favoritos, duplique, renomeie, importe e exporte backup JSON.
- Exporte um adesivo em PNG com fundo transparente ou a cor escolhida e metadados DPI; monte a quantidade que couber em uma cartela A4 e exporte PNG ou abra a impressão do navegador para salvar como PDF.
- Os tamanhos P/M/G são presets editáveis de demonstração, não medidas universais. Use **Medir unha com câmera** no editor para estimar largura e comprimento com uma foto e uma régua milimetrada.

## IA

O backend já está preparado para usar a API de imagens do Pollinations com o modelo FLUX.2 Klein 4B. Para gerar de verdade, é necessária uma conta/chave Pollinations e saldo de Pollen suficiente; consulte o preço atual do modelo na conta antes de gerar, pois o uso pode ser cobrado.

1. Crie uma chave de servidor em [enter.pollinations.ai](https://enter.pollinations.ai/keys) e verifique o saldo e as permissões dela para imagens/modelo.
2. Abra o arquivo local `.env.xampp` e preencha `GURIA_AI_API_KEY=...` com a chave. Não cole essa chave no chat nem no frontend; o arquivo `.env.xampp` está ignorado pelo Git.
3. Reinicie o backend para carregar a chave e confira `http://127.0.0.1:8080/api/ai/status`. Com chave configurada, `available` deve ficar `true`.
4. Abra o GurIA Nails, use **Gerar arte** e faça primeiro uma geração com quantidade 1. O botão de aperfeiçoamento também usa o endpoint de edição do Pollinations.

O backend mantém a chave no servidor, envia prompts de nail art e valida a imagem retornada antes de mostrá-la. A disponibilidade indica que a chave foi preenchida; saldo, permissões, limites e disponibilidade do modelo ainda dependem da conta Pollinations. Se receber erro 402, confira saldo; 401/403, confira chave/permissões; 429, aguarde o limite.

Para usar outro serviço HTTP compatível com o contrato interno do projeto, defina `GURIA_AI_PROVIDER=http` e configure a URL e os paths. O adapter Pollinations usa a API oficial `POST /v1/images/generations` e `POST /v1/images/edits`.

## Verificações

```powershell
npm --prefix frontend test
mvn -f backend/pom.xml test
```

Os testes do frontend cobrem geometria A4, limites de camada, criação de projeto e os onze grupos de elementos. O teste Maven exige JDK e Maven instalados. O build visual deve ser conferido na interface antes de imprimir; confira também a escala em 100% na caixa de impressão da sua impressora.

## Limites já identificados

- Sem conta, senha ou isolamento de dados entre usuários do backend.
- A IA depende de chave e saldo/créditos no provedor externo; câmera de medição, busca externa de referências e fine-tuning/LoRA não fazem parte do MVP.
- O banco registra projetos e estrutura para gerações, catálogo, tamanhos, formatos, planos e favoritos. Ainda não há CRUD/API dedicado para todos esses cadastros.
- Modelos locais são pontos de partida curados, não resultados da GurIA.
- O backup JSON é a forma portátil de transferir projetos enquanto o login não existe.
