# TECH CHALLENGE - FASE 02

## Descrição do Projeto

O **Tech Challenge - Fase 02** tem como objetivo a criação de uma plataforma de blogging dinâmico para a comunidade educacional. A aplicação foi projetada para permitir que professores da rede pública compartilhem conteúdo de forma prática, centralizada e tecnológica. O projeto original foi implementado na plataforma OutSystems, mas com o sucesso da aplicação, decidimos escalar a solução utilizando Node.js para o back-end e persistência de dados em banco de dados NoSQL.

### Tecnologias Utilizadas

- **Back-end**: Node.js com Express.js
- **Banco de Dados**: MongoDB
- **Containerização**: Docker
- **Automação**: GitHub Actions para CI/CD
- **Testes**: Cobertura de testes unitários de 75.8% com Jest

## Índice

- [Descrição do Projeto](#descrição-do-projeto)
- [Requisitos Funcionais](#requisitos-funcionais)
- [Requisitos Técnicos](#requisitos-técnicos)
- [Instalação](#instalação)
- [Uso](#uso)
- [Testes](#testes)
- [Documentação Técnica](#documentação-técnica)
- [Contribuições](#contribuições)
- [Desafios](#desafios)

## Requisitos Funcionais

Os seguintes **endpoints REST** foram implementados para a aplicação de blogging:

### 1. `GET /posts` - Lista de Posts
Este endpoint permite que os(as) estudantes visualizem uma lista de todos os posts disponíveis na página principal.

### 2. `GET /posts/:id` - Leitura de Posts
Permite que os(as) estudantes acessem o conteúdo completo de um post específico, fornecendo o ID do post.

### 3. `POST /posts` - Criação de Postagens
Permite que docentes criem novas postagens, enviando dados como título, conteúdo e autor no corpo da requisição.

### 4. `PUT /posts/:id` - Edição de Postagens
Este endpoint permite que docentes editem um post existente, fornecendo o ID e os novos dados da postagem.

### 5. `GET /posts` - Listagem de Todas as Postagens
Este endpoint permite que docentes vejam todas as postagens criadas, facilitando a gestão do conteúdo.

### 6. `DELETE /posts/:id` - Exclusão de Postagens
Permite que docentes excluam um post específico, utilizando o ID do post.

### 7. `GET /posts/search` - Busca de Posts
Permite a busca de postagens por palavras-chave. O usuário envia uma query string e o sistema retorna uma lista de posts que contém o termo de busca no título ou conteúdo.

## Requisitos Técnicos

### Back-end em Node.js
A aplicação foi desenvolvida utilizando **Node.js** com o framework **Express.js** para gerenciamento de rotas e middlewares. 

### Persistência de Dados
Optamos por usar o **MongoDB** como banco de dados NoSQL para garantir flexibilidade e escalabilidade. 

### Containerização com Docker
O projeto foi containerizado utilizando **Docker** para garantir consistência entre os ambientes de desenvolvimento e produção. Dockerfiles e scripts de build estão incluídos no repositório.

### Automação com GitHub Actions
Foi configurado um pipeline de CI/CD no **GitHub Actions** para automação de testes, linting e deploy da aplicação.

### Cobertura de Testes
O código do projeto possui cobertura de testes unitários em funções críticas (como criação, edição e exclusão de postagens), garantindo qualidade e estabilidade.

1. Instale as Dependências
Adicione o Jest e o supertest:

npm install supertest --save-dev

2. Configure o Jest
Adicione o seguinte script no package.json:

"scripts": {
  "test": "jest --coverage"
}

3. Testes
Para rodar os testes unitários, utilize o comando:

npm test
## Instalação

### Pré-requisitos

- Node.js (versão >= 14.0)
- MongoDB
- Docker (para execução em contêineres)

### Passos para Instalar

1. Clone o repositório:
   ```bash
   git clone https://github.com/marianadesouzaaguiar/tech-challenge.git

   cd tech-challenge

2. Instale as dependências:
npm install

3. Se desejar rodar o projeto com Docker, execute:

docker-compose up --build

4. A aplicação estará rodando na URL http://localhost:5000.

## Desafios 

1- Identificar por onde comecar e como organizar a arquitetura de pastas do projeto;
2- Qual ferramenta seria utilizada para documentacao da API (Swagger ou README.md)?;
3-Qual banco de dados utilizar (SQL ou NoSQL)?
4- Como utilizar o Postman para o teste de endpoints;
5- Implementacao da logica do metodo posts/search considerando os query params de titulo e conteudo;
6- Como rodar o projeto com o Docker?
7- Implementar automacao e testes;
8- A realizacao individual do projeto pareceu apresentar desafios, porem, durante o seu desenvolvimento este se tornou mais simples do que o esperado.