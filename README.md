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

- [Node.js](https://nodejs.org/) v18 ou superior
- [Angular CLI](https://angular.dev/tools/cli) v21
- Banco de dados SQL configurado (ver `/database`)
- npm v10.9.2+

---

## Como rodar o projeto

### 1. Clone o repositório

```bash
git clone https://github.com/ViniciusVLM/PI-Projeto-Integrador-Senac.git
cd PI-Projeto-Integrador-Senac
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o banco de dados

Execute os scripts SQL disponíveis na pasta `/database` no seu gerenciador de banco de dados.

### 4. Inicie o servidor backend (API)

```bash
npm run server
# Servidor rodando em http://localhost:3000 (ou porta configurada)
```

### 5. Inicie o frontend Angular

```bash
npm start
# Aplicação disponível em http://localhost:4200
```

---

## Testes

```bash
# Testes unitários
npm test

# Build de produção
npm run build
```


---

## Licença

Este projeto foi desenvolvido para fins educacionais como Projeto Integrador do **Senac — Análise e Desenvolvimento de Sistemas**.
