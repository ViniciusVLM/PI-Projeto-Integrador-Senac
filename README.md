#  SecureDesk

> Sistema de chamados de TI desenvolvido como Projeto Integrador do curso de **Análise e Desenvolvimento de Sistemas — Senac**.

![Angular](https://img.shields.io/badge/Angular-21.2-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![SQL](https://img.shields.io/badge/SQL-Database-4479A1?style=for-the-badge&logo=postgresql&logoColor=white)

---

## Sobre o projeto

O **SecureDesk** é uma aplicação web fullstack para gerenciamento de chamados de suporte técnico de TI. Permite que usuários registrem ocorrências, acompanhem o status dos chamados e que técnicos gerenciem e resolvam as demandas de forma organizada.

O projeto foi construído com arquitetura desacoplada: um frontend em **Angular** consumindo uma API REST em **Node.js/Express**, com persistência em banco de dados **SQL**.

---

## Funcionalidades

-  Abertura e registro de chamados de suporte
-  Acompanhamento do status dos chamados em tempo real
-  Painel para técnicos gerenciarem e atualizarem chamados
-  Autenticação de usuários por perfil (usuário / técnico)
-  Histórico e rastreabilidade de atendimentos
-  Interface responsiva e acessível

---

## Tecnologias

| Camada      | Tecnologia                            |
|-------------|---------------------------------------|
| Frontend    | Angular 21.2, TypeScript 5.9, RxJS    |
| Backend     | Node.js, Express 4, CORS              |
| Banco       | SQL (arquivo de schema em `/database`)|
| Utilitários | UUID, Prettier, Angular CLI           |

---

## Estrutura do projeto

```
PI-Projeto-Integrador-Senac/
├── database/          # Scripts SQL (DDL, seed)
├── icons/             # Ícones e assets do sistema
├── public/            # Arquivos estáticos públicos
├── server/
│   └── index.js       # API REST (Express)
├── src/               # Código-fonte Angular
│   ├── app/
│   │   ├── components/
│   │   ├── pages/
│   │   └── services/
│   └── ...
├── angular.json
├── package.json
└── tsconfig.json
```

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20.19 ou superior (exigência do Angular 21)
- npm v10+

---

## Como rodar o projeto

### 1. Clone o repositório

```bash
git clone https://github.com/ViniciusVLM/PI-Projeto-Integrador-Senac.git
cd PI-Projeto-Integrador-Senac
```

### 2. Instale as dependências

Só na pasta raiz (a API usa as mesmas dependências):

```bash
npm install
```

### 3. Inicie o servidor backend (API)

```bash
npm run server
# Servidor rodando em http://localhost:3000
```

A API grava os dados em `server/db.json`. Para voltar aos dados iniciais da demonstração:

```bash
npm run db:reset
```

### 4. Inicie o frontend Angular

Em outro terminal:

```bash
npm start
# Aplicação disponível em http://localhost:4200
```

### Usuários de teste

| E-mail | Perfil | Senha |
|--------|--------|-------|
| joao.silvia@empresa.com | Cliente | 123456 |
| fernanda.souza@empresa.com | Técnico | 123456 |
| paulo.nunes@empresa.com | Técnico | 123456 |
| carlos.lima@empresa.com | Administrador | 123456 |

### Banco de dados SQL

Os scripts da pasta `/database` descrevem o mesmo modelo de dados em MySQL/MariaDB (criação das tabelas, dados iniciais e consultas). Rode-os na ordem `01`, `02` e `03`.

---

## API

A documentação de todas as rotas, campos e permissões por perfil está em [`docs/api.md`](docs/api.md).

## Testes

```bash
# Testes automatizados da API (não alteram o server/db.json)
npm run test:api

# Build de produção do front-end
npm run build
```


---

## Licença

Este projeto foi desenvolvido para fins educacionais como Projeto Integrador do **Senac — Análise e Desenvolvimento de Sistemas**.
