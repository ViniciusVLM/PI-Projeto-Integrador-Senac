# SecureDesk — Central Corporativa de Serviços de TI

> Plataforma fullstack de Service Desk, inventário patrimonial e gestão de SLA desenvolvida como **Projeto Integrador — Análise e Desenvolvimento de Sistemas (Senac)**.

![Angular](https://img.shields.io/badge/Angular-21.2-DD0031?style=flat-square&logo=angular&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express_4-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?style=flat-square&logo=mysql&logoColor=white)

---

## Visão geral

O **SecureDesk** centraliza a operação de suporte técnico interno de uma organização, conectando colaboradores solicitantes, analistas de suporte e gestores de TI em um fluxo rastreável do registro até a avaliação pós-atendimento.

### Principais funcionalidades

- **Gestão completa de chamados**: abertura com múltiplos anexos, filas rápidas (`Minha fila`, `Sem técnico`, `SLA em atenção`), linha do tempo auditável, visualização inline de imagens anexadas e reabertura justificada.
- **Monitoramento automático de SLA**: cálculo dinâmico de prazos por criticidade (`Crítica`, `Alta`, `Média`, `Baixa`) e categoria, indicando chamados no prazo, próximos do vencimento ou vencidos.
- **Notas técnicas internas e avaliação CSAT**: analistas podem registrar notas internas visíveis apenas para a equipe de TI, e solicitantes avaliam o atendimento de 1 a 5 estrelas após a solução.
- **Diretório de usuários com foto real**: upload de foto de perfil persistido no servidor, identificação visual em todas as tabelas, comentários e barra lateral, além de controle completo de cargos, setores e permissões.
- **Inventário patrimonial integrado**: catálogo visual de notebooks, estações, monitores, impressoras e ativos de rede com número de série, localização física e abertura rápida de chamado vinculada ao patrimônio.
- **Envio real de e-mail via SMTP gratuito**: envio transacional de códigos de 6 dígitos para recuperação de senha e alertas de chamados via **Gmail (Senha de App)**, **Brevo** ou qualquer servidor SMTP, configurável por `.env` ou diretamente pelo painel administrativo com disparo de teste em tempo real.
- **Central de notificações e relatórios exportáveis**: alertas internos de movimentação na barra lateral e exportação de indicadores gerenciais em CSV compatível com Excel.

---

## Arquitetura do projeto

```text
PI-Projeto-Integrador-Senac/
├── database/                  # Scripts SQL (DDL, carga inicial e consultas)
├── docs/                      # Documentação detalhada da API REST
├── public/img/                # Retratos corporativos, fotos de ativos e ambientes
├── server/                    # Back-end modular em Node.js + Express
│   ├── app.js                 # Configuração de middlewares, rotas estáticas e erros
│   ├── index.js               # Inicialização da API e banco de dados
│   ├── config/                # Variáveis de ambiente (.env), constantes e Multer
│   ├── controllers/           # Controladores HTTP por domínio
│   ├── db/                    # Persistência JSON local + sincronização MySQL/Aiven
│   ├── middlewares/           # Autenticação Bearer, RBAC e tratamento global de erros
│   ├── routes/                # Rotas REST organizadas por recurso
│   ├── services/              # Regras de negócio: SMTP/Nodemailer, SLA, notificações e chamados
│   └── utils/                 # Criptografia bcrypt, formatação e cálculo de indicadores
└── src/                       # Front-end SPA em Angular 21
    └── app/
        ├── core/              # Guards, interceptor HTTP, serviços reativos e utilitários
        ├── sidebar/           # Navegação lateral, notificações e perfil logado
        ├── helpdesk/          # Login, auto-cadastro e recuperação de senha com OTP
        ├── dashboard/         # Painel operacional e indicadores de SLA
        ├── chamados/          # Fila paginada com abas inteligentes e ação rápida
        ├── novochamado/       # Registro de ocorrência com preview de SLA e anexos
        ├── detalheschamados/  # Workspace de atendimento, notas internas e CSAT
        ├── usuarioslista/     # Gestão de equipe e upload de fotos de usuários
        ├── equipamentoslista/ # Controle patrimonial de hardware e estoque de TI
        ├── categorialista/    # Catálogo de serviços e metas de SLA
        ├── relatorios/        # Produtividade técnica e exportação CSV
        └── configuracoes/     # Perfil, regras globais de SLA e configuração/teste SMTP
```

---

## Como executar localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Iniciar a API (porta 3000)

```bash
npm run server
```

### 3. Iniciar o front-end Angular (porta 4200)

Em outro terminal:

```bash
npm start
```

Acesse `http://localhost:4200`. Para restaurar a base de demonstração a qualquer momento:

```bash
npm run db:reset
```

---

## Configurar envio real de e-mail (SMTP gratuito)

Você pode ativar o envio real de e-mails de duas maneiras:

### Opção 1 — Pelo próprio sistema (sem reiniciar o servidor)
1. Faça login como Administrador (`carlos.lima@empresa.com` / `123456`).
2. Acesse **Configurações > E-mail (SMTP)**.
3. Selecione o preset **Gmail Gratuito (Senha de App)** ou **Brevo**, preencha seu e-mail e a **Senha de App de 16 caracteres** gerada na Conta Google (`myaccount.google.com/apppasswords`), clique em **Enviar e-mail de teste** e depois em **Salvar SMTP**.

### Opção 2 — Pelo arquivo `.env`
Copie `.env.example` para `.env` na raiz do projeto e preencha:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seuemail@gmail.com
SMTP_PASS=suasenhadeapp16digitos
SMTP_FROM_NAME=SecureDesk Central de TI
```

---

## Contas de teste

| Nome | E-mail | Perfil | Senha |
|------|--------|--------|-------|
| Carlos Lima | `carlos.lima@empresa.com` | Administrador | `123456` |
| Fernanda Souza | `fernanda.souza@empresa.com` | Técnico de TI | `123456` |
| Paulo Nunes | `paulo.nunes@empresa.com` | Técnico de TI | `123456` |
| João Silva | `joao.silvia@empresa.com` | Solicitante | `123456` |

---

## Validação e Build

```bash
# Executa a suíte automatizada de testes da API (120 verificações em banco isolado)
npm run test:api

# Gera o bundle otimizado de produção do Angular
npm run build
```

---

## Licença

Projeto acadêmico desenvolvido para o curso de **Análise e Desenvolvimento de Sistemas — Senac**.
