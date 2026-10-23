
Design prototype for nail stickers and decals, developed in an accelerated manner with the aid of Artificial Intelligence (AI)

Protótipo de design para adesivos e decalques de unhas, desenvolvido de forma acelerada com o auxílio de Inteligência Artificial (IA).

# GurIA Nails

O GurIA Nails é um ateliê digital para criar artes personalizadas de nail art, organizar adesivos em cartelas e preparar arquivos para impressão.

> Projeto acadêmico desenvolvido pela equipe Ctrl Elas, formada por três alunas de Análise e Desenvolvimento de Sistemas (ADS), para o Bye Bye Boss 2026 do Instituto Federal Farroupilha (IFFar).

## O problema

Pesquisas citadas pela equipe apontam que 86% das mulheres brasileiras cuidam das unhas e indicam uma procura crescente por adesivos decorados em salões. Apesar desse interesse, a oferta costuma se concentrar em modelos prontos, o que dificulta encontrar decorações personalizadas para expressar estilos e temas específicos.

Manicures podem recorrer a ferramentas de design genéricas, mas acertar as medidas da unha e preparar uma cartela para impressão exige trabalho. Geradores de IA também podem produzir resultados inconsistentes quando a descrição não é bem elaborada.

## A solução

O GurIA Nails reúne editor visual, biblioteca de elementos, geração assistida por IA, estimativa das medidas da unha e preparação de cartelas para impressão. A proposta é tornar a criação de adesivos personalizados mais acessível para profissionais que não têm experiência avançada em design.

## Funcionalidades do protótipo

- **Editor de nail art:** combina camadas e elementos vetoriais de uma biblioteca local com 11 categorias.
- **Upload de imagens:** adiciona arquivos PNG, JPG e WEBP ao design. É possível mover, redimensionar, girar, duplicar, excluir e reorganizar camadas, além de usar pincel e borracha.
- **Ajuste da arte na unha:** permite preencher a área da unha ou encaixar a imagem inteira, escolher fundo transparente ou colorido e ajustar formato e medidas.
- **Medidor aproximado:** estima largura e comprimento usando uma foto ou câmera compatível e uma referência de régua. Confira as medidas antes de imprimir.
- **GurIA:** envia descrições para gerar imagens e permite solicitar o aperfeiçoamento de uma arte pelo serviço de IA configurado.
- **Projetos:** salva rascunhos neste navegador, organiza favoritos e permite renomear, duplicar, excluir, importar e exportar projetos em backup JSON.
- **Cartela para impressão:** organiza adesivos em uma página A4 com opções de quantidade, tamanho, espaçamento, margens e resolução. Exporta PNG ou abre a impressão do navegador, que também pode salvar em PDF.
- **Sincronização local:** quando o backend e o banco estão disponíveis, os projetos podem ser sincronizados pela API.

## Clientes e modelo de negócio proposto

O público inicial são salões de beleza que oferecem serviços de manicure. A equipe propõe uma assinatura mensal com planos Básico e Premium: o plano Básico teria um limite menor de gerações de IA, enquanto o Premium permitiria maior volume.

Como projeção preliminar para o pitch, a equipe considerou 15 clientes e capacidade de até 4 mil gerações mensais, estimando lucro líquido aproximado de R$ 460 por mês. Trata-se de uma estimativa inicial, não de receita realizada; o custo do serviço de IA pode afetar o resultado.

Para atrair clientes, a proposta inclui divulgação em redes sociais, visitas a salões e uma semana de teste gratuito. A equipe também considera parcerias com lojas de aluguel de impressoras, em busca de descontos ou empréstimos de equipamentos em troca de divulgação.

Entre as soluções consideradas na análise estão a Huizi, voltada a adesivos de unhas, e ferramentas de criação como Fotor e Dreamina AI. O diferencial proposto pelo GurIA Nails é combinar IA, personalização e preparação para impressão no mesmo fluxo.

## Tecnologias

- **Interface:** HTML, CSS e JavaScript.
- **API:** Java 21, Spring Boot, Spring Data JPA e Maven.
- **Banco de dados:** MySQL 8 ou MariaDB, com migrações gerenciadas pelo Flyway. O MariaDB do XAMPP é uma opção para desenvolvimento local.
- **Geração de imagens:** integração do backend com o serviço Pollinations; é possível adaptar a configuração para outro serviço compatível.
- **Servidor local da interface:** Node.js.

## Projeção inicial de lucro 
15 clientes ( 10 no plano básico e 5 no premium)
Com capacidade de até 4.000 gerações mensais. 
Plano Básico oferece 100 gerações e Premium até 600 gerações por cliente.

<img width="346" height="255" alt="projecao" src="https://github.com/user-attachments/assets/a95ddb3d-9c04-4a7f-8759-c4f5e01744c7" />

## Como executar localmente

### Pré-requisitos

Para abrir o editor, instale o **Node.js 20 ou superior**. O editor funciona sem banco de dados.

Para executar também a API, instale o **JDK 21**, o **Maven 3.6.3 ou superior** e tenha um banco MySQL ou MariaDB local. Os passos abaixo usam o XAMPP como exemplo.

### 1. Obter o projeto

Clone o repositório e entre na pasta do projeto:

~~~powershell
git clone https://github.com/Clara0223Valenca/gurIA_nails.git
Set-Location gurIA_nails
~~~

### 2. Iniciar a interface

Na pasta do projeto, inicie o servidor local:

~~~powershell
node .\scripts\dev-server.mjs
~~~

Abra [http://127.0.0.1:4173](http://127.0.0.1:4173). Para apenas conhecer o editor, este passo é suficiente. Sem API, banco e chave de IA, os recursos de edição, projetos locais e exportação continuam disponíveis; geração de imagens e sincronização com o banco ficam indisponíveis.

### 3. Iniciar a API com XAMPP e MariaDB (opcional)

1. Abra o XAMPP Control Panel e inicie **MySQL**. No XAMPP, esse serviço usa MariaDB. Confira a porta indicada no painel; o arquivo de exemplo deste projeto usa a porta `3307`.
2. No phpMyAdmin, abra a aba **SQL** e crie um banco e um usuário local para o aplicativo:

~~~sql
CREATE DATABASE IF NOT EXISTS guria_nails CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'guria'@'127.0.0.1' IDENTIFIED BY 'troque-esta-senha-local';
GRANT ALL PRIVILEGES ON guria_nails.* TO 'guria'@'127.0.0.1';
FLUSH PRIVILEGES;
~~~

3. Em outro terminal PowerShell, na pasta do projeto, crie sua configuração local a partir do modelo:

~~~powershell
if (-not (Test-Path .env.xampp)) { Copy-Item .env.xampp.example .env.xampp }
~~~

Edite `.env.xampp` e ajuste `DB_PASSWORD` para a mesma senha criada no SQL. Se o XAMPP usar outra porta, ajuste também a porta em `DB_URL`. Este arquivo contém configurações locais e não deve ser enviado ao GitHub.

4. Inicie a API:

~~~powershell
./scripts/start-backend.ps1 -Xampp
~~~

Na primeira execução, o Flyway cria as tabelas. A API local fica em [http://localhost:8080/api](http://localhost:8080/api). Mantenha o servidor da interface aberto em outro terminal.

### 4. Ativar a geração de imagens com IA (opcional)

A geração real requer uma conta, uma chave de API do serviço e saldo ou créditos disponíveis. O projeto vem configurado para Pollinations:

1. Crie uma chave de servidor na [página de chaves do Pollinations](https://enter.pollinations.ai/keys).
2. Salve a chave somente no arquivo local `.env.xampp`, na variável `GURIA_AI_API_KEY`.
3. Reinicie a API e confira o estado da integração em [http://localhost:8080/api/ai/status](http://localhost:8080/api/ai/status).

Não coloque chaves reais em arquivos versionados, no frontend ou em commits. Os arquivos `.env` e `.env.xampp` são ignorados pelo Git; os arquivos `.env.example` e `.env.xampp.example` são modelos sem a chave real.

## Limites do protótipo

- O projeto não implementa cadastro, login, contas de usuário, assinaturas, pagamentos ou os planos comerciais descritos acima.
- Os projetos ficam no armazenamento deste navegador. A API local permite sincronização com banco, mas ainda não há isolamento de dados entre usuários; não exponha o backend publicamente.
- A IA depende de um serviço externo, de uma chave válida e dos limites/créditos da conta configurada.
- As medidas são estimativas e os tamanhos P, M e G são referências editáveis, não padrões universais. Faça uma impressão de conferência em escala de 100% antes de produzir uma cartela.

## Equipe

**Ctrl Elas** — três alunas do curso de Análise e Desenvolvimento de Sistemas (ADS), Instituto Federal Farroupilha (IFFar).

Projeto apresentado no **Bye Bye Boss 2026**.

Protótipo de design para adesivos e decalques de unhas, desenvolvido de forma acelerada com o auxílio de Inteligência Artificial (IA).

# GurIA Nails

O GurIA Nails é um ateliê digital para criar artes personalizadas de nail art, organizar adesivos em cartelas e preparar arquivos para impressão.

> Projeto acadêmico desenvolvido pela equipe Ctrl Elas, formada por três alunas de Análise e Desenvolvimento de Sistemas (ADS), para o Bye Bye Boss 2026 do Instituto Federal Farroupilha (IFFar).

## O problema

Pesquisas citadas pela equipe apontam que 86% das mulheres brasileiras cuidam das unhas e indicam uma procura crescente por adesivos decorados em salões. Apesar desse interesse, a oferta costuma se concentrar em modelos prontos, o que dificulta encontrar decorações personalizadas para expressar estilos e temas específicos.

Manicures podem recorrer a ferramentas de design genéricas, mas acertar as medidas da unha e preparar uma cartela para impressão exige trabalho. Geradores de IA também podem produzir resultados inconsistentes quando a descrição não é bem elaborada.

## A solução

O GurIA Nails reúne editor visual, biblioteca de elementos, geração assistida por IA, estimativa das medidas da unha e preparação de cartelas para impressão. A proposta é tornar a criação de adesivos personalizados mais acessível para profissionais que não têm experiência avançada em design.

## Funcionalidades do protótipo

- **Editor de nail art:** combina camadas e elementos vetoriais de uma biblioteca local com 11 categorias.
- **Upload de imagens:** adiciona arquivos PNG, JPG e WEBP ao design. É possível mover, redimensionar, girar, duplicar, excluir e reorganizar camadas, além de usar pincel e borracha.
- **Ajuste da arte na unha:** permite preencher a área da unha ou encaixar a imagem inteira, escolher fundo transparente ou colorido e ajustar formato e medidas.
- **Medidor aproximado:** estima largura e comprimento usando uma foto ou câmera compatível e uma referência de régua. Confira as medidas antes de imprimir.
- **GurIA:** envia descrições para gerar imagens e permite solicitar o aperfeiçoamento de uma arte pelo serviço de IA configurado.
- **Projetos:** salva rascunhos neste navegador, organiza favoritos e permite renomear, duplicar, excluir, importar e exportar projetos em backup JSON.
- **Cartela para impressão:** organiza adesivos em uma página A4 com opções de quantidade, tamanho, espaçamento, margens e resolução. Exporta PNG ou abre a impressão do navegador, que também pode salvar em PDF.
- **Sincronização local:** quando o backend e o banco estão disponíveis, os projetos podem ser sincronizados pela API.

## Clientes e modelo de negócio proposto

O público inicial são salões de beleza que oferecem serviços de manicure. A equipe propõe uma assinatura mensal com planos Básico e Premium: o plano Básico teria um limite menor de gerações de IA, enquanto o Premium permitiria maior volume.

Como projeção preliminar para o pitch, a equipe considerou 15 clientes e capacidade de até 4 mil gerações mensais, estimando lucro líquido aproximado de R$ 460 por mês. Trata-se de uma estimativa inicial, não de receita realizada; o custo do serviço de IA pode afetar o resultado.

Para atrair clientes, a proposta inclui divulgação em redes sociais, visitas a salões e uma semana de teste gratuito. A equipe também considera parcerias com lojas de aluguel de impressoras, em busca de descontos ou empréstimos de equipamentos em troca de divulgação.

Entre as soluções consideradas na análise estão a Huizi, voltada a adesivos de unhas, e ferramentas de criação como Fotor e Dreamina AI. O diferencial proposto pelo GurIA Nails é combinar IA, personalização e preparação para impressão no mesmo fluxo.

## Tecnologias

- **Interface:** HTML, CSS e JavaScript.
- **API:** Java 21, Spring Boot, Spring Data JPA e Maven.
- **Banco de dados:** MySQL 8 ou MariaDB, com migrações gerenciadas pelo Flyway. O MariaDB do XAMPP é uma opção para desenvolvimento local.
- **Geração de imagens:** integração do backend com o serviço Pollinations; é possível adaptar a configuração para outro serviço compatível.
- **Servidor local da interface:** Node.js.

## Como executar localmente

### Pré-requisitos

Para abrir o editor, instale o **Node.js 20 ou superior**. O editor funciona sem banco de dados.

Para executar também a API, instale o **JDK 21**, o **Maven 3.6.3 ou superior** e tenha um banco MySQL ou MariaDB local. Os passos abaixo usam o XAMPP como exemplo.

### 1. Obter o projeto

Clone o repositório e entre na pasta do projeto:

~~~powershell
git clone https://github.com/Clara0223Valenca/gurIA_nails.git
Set-Location gurIA_nails
~~~

### 2. Iniciar a interface

Na pasta do projeto, inicie o servidor local:

~~~powershell
node .\scripts\dev-server.mjs
~~~

Abra [http://127.0.0.1:4173](http://127.0.0.1:4173). Para apenas conhecer o editor, este passo é suficiente. Sem API, banco e chave de IA, os recursos de edição, projetos locais e exportação continuam disponíveis; geração de imagens e sincronização com o banco ficam indisponíveis.

### 3. Iniciar a API com XAMPP e MariaDB (opcional)

1. Abra o XAMPP Control Panel e inicie **MySQL**. No XAMPP, esse serviço usa MariaDB. Confira a porta indicada no painel; o arquivo de exemplo deste projeto usa a porta `3307`.
2. No phpMyAdmin, abra a aba **SQL** e crie um banco e um usuário local para o aplicativo:

~~~sql
CREATE DATABASE IF NOT EXISTS guria_nails CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'guria'@'127.0.0.1' IDENTIFIED BY 'troque-esta-senha-local';
GRANT ALL PRIVILEGES ON guria_nails.* TO 'guria'@'127.0.0.1';
FLUSH PRIVILEGES;
~~~

3. Em outro terminal PowerShell, na pasta do projeto, crie sua configuração local a partir do modelo:

~~~powershell
if (-not (Test-Path .env.xampp)) { Copy-Item .env.xampp.example .env.xampp }
~~~

Edite `.env.xampp` e ajuste `DB_PASSWORD` para a mesma senha criada no SQL. Se o XAMPP usar outra porta, ajuste também a porta em `DB_URL`. Este arquivo contém configurações locais e não deve ser enviado ao GitHub.

4. Inicie a API:

~~~powershell
./scripts/start-backend.ps1 -Xampp
~~~

Na primeira execução, o Flyway cria as tabelas. A API local fica em [http://localhost:8080/api](http://localhost:8080/api). Mantenha o servidor da interface aberto em outro terminal.

### 4. Ativar a geração de imagens com IA (opcional)

A geração real requer uma conta, uma chave de API do serviço e saldo ou créditos disponíveis. O projeto vem configurado para Pollinations:

1. Crie uma chave de servidor na [página de chaves do Pollinations](https://enter.pollinations.ai/keys).
2. Salve a chave somente no arquivo local `.env.xampp`, na variável `GURIA_AI_API_KEY`.
3. Reinicie a API e confira o estado da integração em [http://localhost:8080/api/ai/status](http://localhost:8080/api/ai/status).

Não coloque chaves reais em arquivos versionados, no frontend ou em commits. Os arquivos `.env` e `.env.xampp` são ignorados pelo Git; os arquivos `.env.example` e `.env.xampp.example` são modelos sem a chave real.

## Limites do protótipo

- O projeto não implementa cadastro, login, contas de usuário, assinaturas, pagamentos ou os planos comerciais descritos acima.
- Os projetos ficam no armazenamento deste navegador. A API local permite sincronização com banco, mas ainda não há isolamento de dados entre usuários; não exponha o backend publicamente.
- A IA depende de um serviço externo, de uma chave válida e dos limites/créditos da conta configurada.
- As medidas são estimativas e os tamanhos P, M e G são referências editáveis, não padrões universais. Faça uma impressão de conferência em escala de 100% antes de produzir uma cartela.

## Equipe

**Ctrl Elas** — três alunas do curso de Análise e Desenvolvimento de Sistemas (ADS), Instituto Federal Farroupilha (IFFar).

Projeto apresentado no **Bye Bye Boss 2026**.
Protótipo de design para adesivos e decalques de unhas, desenvolvido de forma acelerada com o auxílio de Inteligência Artificial (IA).

# GurIA Nails

O GurIA Nails é um ateliê digital para criar artes personalizadas de nail art, organizar adesivos em cartelas e preparar arquivos para impressão.

> Projeto acadêmico desenvolvido pela equipe Ctrl Elas, formada por três alunas de Análise e Desenvolvimento de Sistemas (ADS), para o Bye Bye Boss 2026 do Instituto Federal Farroupilha (IFFar).

## O problema

Pesquisas citadas pela equipe apontam que 86% das mulheres brasileiras cuidam das unhas e indicam uma procura crescente por adesivos decorados em salões. Apesar desse interesse, a oferta costuma se concentrar em modelos prontos, o que dificulta encontrar decorações personalizadas para expressar estilos e temas específicos.

Manicures podem recorrer a ferramentas de design genéricas, mas acertar as medidas da unha e preparar uma cartela para impressão exige trabalho. Geradores de IA também podem produzir resultados inconsistentes quando a descrição não é bem elaborada.

## A solução

O GurIA Nails reúne editor visual, biblioteca de elementos, geração assistida por IA, estimativa das medidas da unha e preparação de cartelas para impressão. A proposta é tornar a criação de adesivos personalizados mais acessível para profissionais que não têm experiência avançada em design.

## Funcionalidades do protótipo

- **Editor de nail art:** combina camadas e elementos vetoriais de uma biblioteca local com 11 categorias.
- **Upload de imagens:** adiciona arquivos PNG, JPG e WEBP ao design. É possível mover, redimensionar, girar, duplicar, excluir e reorganizar camadas, além de usar pincel e borracha.
- **Ajuste da arte na unha:** permite preencher a área da unha ou encaixar a imagem inteira, escolher fundo transparente ou colorido e ajustar formato e medidas.
- **Medidor aproximado:** estima largura e comprimento usando uma foto ou câmera compatível e uma referência de régua. Confira as medidas antes de imprimir.
- **GurIA:** envia descrições para gerar imagens e permite solicitar o aperfeiçoamento de uma arte pelo serviço de IA configurado.
- **Projetos:** salva rascunhos neste navegador, organiza favoritos e permite renomear, duplicar, excluir, importar e exportar projetos em backup JSON.
- **Cartela para impressão:** organiza adesivos em uma página A4 com opções de quantidade, tamanho, espaçamento, margens e resolução. Exporta PNG ou abre a impressão do navegador, que também pode salvar em PDF.
- **Sincronização local:** quando o backend e o banco estão disponíveis, os projetos podem ser sincronizados pela API.

## Clientes e modelo de negócio proposto

O público inicial são salões de beleza que oferecem serviços de manicure. A equipe propõe uma assinatura mensal com planos Básico e Premium: o plano Básico teria um limite menor de gerações de IA, enquanto o Premium permitiria maior volume.

Como projeção preliminar para o pitch, a equipe considerou 15 clientes e capacidade de até 4 mil gerações mensais, estimando lucro líquido aproximado de R$ 460 por mês. Trata-se de uma estimativa inicial, não de receita realizada; o custo do serviço de IA pode afetar o resultado.

Para atrair clientes, a proposta inclui divulgação em redes sociais, visitas a salões e uma semana de teste gratuito. A equipe também considera parcerias com lojas de aluguel de impressoras, em busca de descontos ou empréstimos de equipamentos em troca de divulgação.

Entre as soluções consideradas na análise estão a Huizi, voltada a adesivos de unhas, e ferramentas de criação como Fotor e Dreamina AI. O diferencial proposto pelo GurIA Nails é combinar IA, personalização e preparação para impressão no mesmo fluxo.

## Tecnologias

- **Interface:** HTML, CSS e JavaScript.
- **API:** Java 21, Spring Boot, Spring Data JPA e Maven.
- **Banco de dados:** MySQL 8 ou MariaDB, com migrações gerenciadas pelo Flyway. O MariaDB do XAMPP é uma opção para desenvolvimento local.
- **Geração de imagens:** integração do backend com o serviço Pollinations; é possível adaptar a configuração para outro serviço compatível.
- **Servidor local da interface:** Node.js.

## Como executar localmente

### Pré-requisitos

Para abrir o editor, instale o **Node.js 20 ou superior**. O editor funciona sem banco de dados.

Para executar também a API, instale o **JDK 21**, o **Maven 3.6.3 ou superior** e tenha um banco MySQL ou MariaDB local. Os passos abaixo usam o XAMPP como exemplo.

### 1. Obter o projeto

Clone o repositório e entre na pasta do projeto:

~~~powershell
git clone https://github.com/Clara0223Valenca/gurIA_nails.git
Set-Location gurIA_nails
~~~

### 2. Iniciar a interface

Na pasta do projeto, inicie o servidor local:

~~~powershell
node .\scripts\dev-server.mjs
~~~

Abra [http://127.0.0.1:4173](http://127.0.0.1:4173). Para apenas conhecer o editor, este passo é suficiente. Sem API, banco e chave de IA, os recursos de edição, projetos locais e exportação continuam disponíveis; geração de imagens e sincronização com o banco ficam indisponíveis.

### 3. Iniciar a API com XAMPP e MariaDB (opcional)

1. Abra o XAMPP Control Panel e inicie **MySQL**. No XAMPP, esse serviço usa MariaDB. Confira a porta indicada no painel; o arquivo de exemplo deste projeto usa a porta `3307`.
2. No phpMyAdmin, abra a aba **SQL** e crie um banco e um usuário local para o aplicativo:

~~~sql
CREATE DATABASE IF NOT EXISTS guria_nails CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'guria'@'127.0.0.1' IDENTIFIED BY 'troque-esta-senha-local';
GRANT ALL PRIVILEGES ON guria_nails.* TO 'guria'@'127.0.0.1';
FLUSH PRIVILEGES;
~~~

3. Em outro terminal PowerShell, na pasta do projeto, crie sua configuração local a partir do modelo:

~~~powershell
if (-not (Test-Path .env.xampp)) { Copy-Item .env.xampp.example .env.xampp }
~~~

Edite `.env.xampp` e ajuste `DB_PASSWORD` para a mesma senha criada no SQL. Se o XAMPP usar outra porta, ajuste também a porta em `DB_URL`. Este arquivo contém configurações locais e não deve ser enviado ao GitHub.

4. Inicie a API:

~~~powershell
./scripts/start-backend.ps1 -Xampp
~~~

Na primeira execução, o Flyway cria as tabelas. A API local fica em [http://localhost:8080/api](http://localhost:8080/api). Mantenha o servidor da interface aberto em outro terminal.

### 4. Ativar a geração de imagens com IA (opcional)

A geração real requer uma conta, uma chave de API do serviço e saldo ou créditos disponíveis. O projeto vem configurado para Pollinations:

1. Crie uma chave de servidor na [página de chaves do Pollinations](https://enter.pollinations.ai/keys).
2. Salve a chave somente no arquivo local `.env.xampp`, na variável `GURIA_AI_API_KEY`.
3. Reinicie a API e confira o estado da integração em [http://localhost:8080/api/ai/status](http://localhost:8080/api/ai/status).

Não coloque chaves reais em arquivos versionados, no frontend ou em commits. Os arquivos `.env` e `.env.xampp` são ignorados pelo Git; os arquivos `.env.example` e `.env.xampp.example` são modelos sem a chave real.

## Limites do protótipo

- O projeto não implementa cadastro, login, contas de usuário, assinaturas, pagamentos ou os planos comerciais descritos acima.
- Os projetos ficam no armazenamento deste navegador. A API local permite sincronização com banco, mas ainda não há isolamento de dados entre usuários; não exponha o backend publicamente.
- A IA depende de um serviço externo, de uma chave válida e dos limites/créditos da conta configurada.
- As medidas são estimativas e os tamanhos P, M e G são referências editáveis, não padrões universais. Faça uma impressão de conferência em escala de 100% antes de produzir uma cartela.
- A biblioteca de elementos precisa ser aprimorada.

## Equipe

**Ctrl Elas** — Alda, Clara e Márcia. 
Alunas do curso de Análise e Desenvolvimento de Sistemas (ADS), Instituto Federal Farroupilha (IFFar).

Projeto apresentado no **Bye Bye Boss 2026**.
<img width="1254" height="1254" alt="Identidade visual GURIA nails" src="https://github.com/user-attachments/assets/8f7789ad-ad09-4c2c-9b17-22adf948b66c" /><img width="446" height="355" alt="projecao" src="https://github.com/user-attachments/assets/cd89622d-c926-4abb-a920-76e8bfbc7166" />

