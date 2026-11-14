# API do SecureDesk

Base: `http://localhost:3000/api`

Todas as rotas, menos as marcadas como **pública**, exigem o cabeçalho:

```
Authorization: Bearer <token>
```

O token vem do login e vale por 8 horas. Se ele expirar, a API responde `401` e o front deve mandar o usuário para o login.

Erros sempre voltam no formato `{ "erro": "mensagem para mostrar ao usuário" }`.

| Código | Quando acontece |
|--------|-----------------|
| 400 | Campo faltando ou inválido |
| 401 | Sem token, token inválido ou sessão expirada |
| 403 | O perfil do usuário não pode fazer essa ação |
| 404 | Registro não encontrado |
| 409 | Registro duplicado (e-mail, patrimônio, nome de categoria) |
| 422 | Ação não permitida no status atual do chamado |

## Perfis

| Perfil | Valor na API |
|--------|--------------|
| Cliente / Funcionário | `cliente` |
| Técnico | `tecnico` |
| Administrador | `admin` |

---

## Autenticação — `/api/auth`

### `POST /auth/login` (pública)

```json
{ "email": "joao.silvia@empresa.com", "senha": "123456" }
```

Resposta `200`:

```json
{
  "token": "…",
  "usuario": { "id": 1, "nome": "João Silva", "email": "…", "telefone": "…", "perfil": "cliente" }
}
```

### `POST /auth/logout`

Invalida o token atual.

### `POST /auth/registro` (pública) — tela de Cadastro

```json
{
  "nome": "Beatriz Souza",
  "email": "beatriz@empresa.com",
  "telefone": "(11) 90000-0000",
  "senha": "segredo1",
  "confirmarSenha": "segredo1"
}
```

- `telefone` e `confirmarSenha` são opcionais. Se `confirmarSenha` for enviado, precisa ser igual a `senha`.
- Senha com no mínimo 6 caracteres.
- Toda conta criada por aqui é `cliente`.
- Resposta `201` com o usuário criado (sem a senha). E-mail repetido: `409`.

### Recuperação de senha — tela "Esqueci minha senha"

O fluxo tem dois passos. O sistema **não envia e-mail de verdade**: o código aparece no terminal onde a API está rodando, na linha `[E-MAIL SIMULADO]`.

1. `POST /auth/esqueci-senha` (pública)

   ```json
   { "email": "joao.silvia@empresa.com" }
   ```

   Sempre responde `200` (mesmo se o e-mail não existir, para não revelar quem tem conta). O código vale 15 minutos.

2. `POST /auth/redefinir-senha` (pública)

   ```json
   { "email": "joao.silvia@empresa.com", "codigo": "482913", "novaSenha": "nova123", "confirmarSenha": "nova123" }
   ```

   Código errado ou expirado: `400`. Depois de 5 tentativas erradas, é preciso pedir outro código. Ao redefinir, todas as sessões do usuário são encerradas.

**O que a tela precisa:** um campo de e-mail com botão "Enviar código" (passo 1) e, depois, os campos código, nova senha e confirmar senha (passo 2).

### `GET /auth/me`

Devolve o usuário logado.

### `PUT /auth/me` — tela de Configurações (Meu perfil)

```json
{ "nome": "João da Silva", "telefone": "(11) 95555-0000" }
```

E-mail e perfil não mudam por aqui.

### `PUT /auth/me/senha` — tela de Configurações (Alterar senha)

```json
{ "senhaAtual": "123456", "novaSenha": "nova123", "confirmarSenha": "nova123" }
```

---

## Chamados — `/api/chamados`

Status possíveis: `ABERTO`, `EM ANÁLISE`, `EM ATENDIMENTO`, `AGUARDANDO USUÁRIO`, `RESOLVIDO`, `ENCERRADO`, `CANCELADO`.

Prioridades: `Baixa`, `Média`, `Alta`, `Crítica`.

### Quem pode mudar o status

| De | Para | Quem |
|----|------|------|
| ABERTO | EM ANÁLISE | técnico, admin (ou pela rota `/assumir`) |
| ABERTO | CANCELADO | cliente dono, técnico, admin |
| EM ANÁLISE | EM ATENDIMENTO | técnico, admin |
| EM ANÁLISE | AGUARDANDO USUÁRIO | técnico, admin |
| EM ANÁLISE | CANCELADO | cliente dono, técnico, admin |
| EM ATENDIMENTO | AGUARDANDO USUÁRIO | técnico, admin |
| EM ATENDIMENTO | RESOLVIDO | técnico, admin |
| EM ATENDIMENTO | CANCELADO | técnico, admin |
| AGUARDANDO USUÁRIO | EM ATENDIMENTO | cliente dono (respondeu), técnico, admin |
| AGUARDANDO USUÁRIO | CANCELADO | cliente dono, técnico, admin |
| RESOLVIDO | ENCERRADO | cliente dono (confirma a solução), técnico, admin |
| RESOLVIDO ou ENCERRADO | reabrir | cliente dono, técnico, admin (rota `/reabrir`) |

O front não precisa repetir essa tabela: o `GET /chamados/:id` devolve `transicoesPermitidas` com os status para os quais **o usuário logado** pode mover aquele chamado. Basta mostrar um botão para cada item.

### `GET /chamados` — lista

- Cliente recebe só os próprios chamados; técnico e admin recebem todos.
- Filtros opcionais na URL: `status`, `prioridade`, `categoriaId`, `tecnicoId`, `solicitanteId`, `busca` (título, número ou nome do solicitante) e `atribuidosAMim=true`.
- Vem ordenada pela última atualização (mais recente primeiro).

Cada item:

```json
{
  "id": 41,
  "titulo": "Mouse sem fio parou de funcionar",
  "descricao": "…",
  "status": "ABERTO",
  "prioridade": "Média",
  "solicitanteId": 1,
  "solicitanteNome": "João Silva",
  "tecnicoId": null,
  "tecnicoNome": null,
  "categoriaId": 1,
  "categoriaNome": "Hardware",
  "equipamentoId": 1,
  "equipamentoNome": "Acer Nitro 5",
  "equipamentoPatrimonio": "PAT-00125",
  "dataAbertura": "2026-11-08T14:00:00.000Z",
  "dataAtualizacao": "2026-11-08T14:00:00.000Z",
  "dataEncerramento": null,
  "totalAnexos": 1
}
```

### `GET /chamados/:id` — detalhes

Os mesmos campos da lista e mais:

```json
{
  "historico": [
    { "id": 1, "statusAnterior": null, "statusNovo": "ABERTO", "observacao": "Chamado aberto.", "usuarioNome": "João Silva", "dataEvento": "…" }
  ],
  "comentarios": [
    { "id": 1, "usuarioNome": "Fernanda Souza", "comentario": "…", "dataCriacao": "…" }
  ],
  "anexos": [
    { "id": 1, "nomeOriginal": "log.txt", "tipo": "text/plain", "tamanho": 2048, "url": "/api/chamados/41/anexos/1", "dataUpload": "…" }
  ],
  "transicoesPermitidas": ["CANCELADO"]
}
```

Cliente que tenta abrir chamado de outra pessoa recebe `403`.

### `POST /chamados` — abrir chamado

Aceita JSON ou `multipart/form-data` (o formulário de Novo Chamado usa multipart por causa dos anexos).

| Campo | Obrigatório | Regra |
|-------|-------------|-------|
| `titulo` | sim | 5 a 150 caracteres |
| `descricao` | sim | mínimo de 10 caracteres |
| `categoriaId` | sim | categoria ativa |
| `prioridade` | não | padrão `Média` |
| `equipamentoId` | não | |
| `anexos` | não | até 5 arquivos de 10MB; imagens, PDF, TXT, LOG, Office, CSV ou ZIP |

Resposta `201` com o chamado criado, em status `ABERTO`.

### `PUT /chamados/:id` — editar

| Perfil | Campos que pode alterar |
|--------|-------------------------|
| cliente | `titulo`, `descricao`, `categoriaId`, `equipamentoId`, `prioridade` (só do próprio chamado e só enquanto estiver ABERTO) |
| técnico | `categoriaId`, `equipamentoId`, `prioridade` |
| admin | todos os anteriores e `tecnicoId` |

Chamados ENCERRADOS ou CANCELADOS não podem ser editados (`422`). Mudanças de prioridade, categoria e técnico entram no histórico.

### `DELETE /chamados/:id` — excluir (admin)

Apaga o chamado, o histórico, os comentários e os anexos.

### `PATCH /chamados/:id/assumir` — técnico assume

- Técnico: assume para si. O chamado vai para `EM ANÁLISE`. Se já estiver com outro técnico: `409`.
- Admin: envia `{ "tecnicoId": 4 }` para atribuir a um técnico.

### `PATCH /chamados/:id/status`

```json
{ "novoStatus": "AGUARDANDO USUÁRIO", "observacao": "O mouse funciona em outro computador?" }
```

- `observacao` é obrigatória ao mudar para `AGUARDANDO USUÁRIO`.
- Ao ir para `EM ATENDIMENTO`, o técnico logado é atribuído automaticamente se o chamado ainda não tiver técnico (o admin pode enviar `tecnicoId`).
- Transição que não existe no fluxo: `422`. Transição que o perfil não pode fazer: `403`.

### `PATCH /chamados/:id/reabrir`

```json
{ "motivo": "O problema voltou." }
```

Volta para `EM ATENDIMENTO` (ou `ABERTO`, se não tiver técnico).

### `POST /chamados/:id/comentarios`

```json
{ "comentario": "Testei e continua acontecendo." }
```

A rota antiga `POST /chamados/:id/observacoes` continua funcionando.

### `GET /chamados/:id/anexos/:anexoId` — baixar anexo

Exige o token, então um link `<a href>` comum não funciona. No Angular, baixe com o `HttpClient` usando `responseType: 'blob'` e depois crie a URL do arquivo com `URL.createObjectURL`.

---

## Dashboard — `GET /api/dashboard/metricas`

Filtro opcional `?periodo=7|30|90|365` (em dias). Sem período, considera todos os chamados.

- Cliente: números só dos próprios chamados (`escopo: "meus-chamados"`).
- Técnico e admin: todos os chamados (`escopo: "todos"`). O técnico recebe também `atribuidosAMim`.

```json
{
  "totalChamados": 40,
  "chamadosAbertos": 5,
  "chamadosEmAndamento": 13,
  "chamadosEmAtendimento": 10,
  "chamadosAguardando": 3,
  "chamadosResolvidos": 20,
  "chamadosCancelados": 2,
  "prioridadeAltaCritica": 16,
  "porStatus": [{ "status": "ABERTO", "total": 5 }],
  "porPrioridade": [{ "prioridade": "Baixa", "total": 9 }],
  "porCategoria": [{ "categoriaId": 1, "categoriaNome": "Hardware", "total": 11 }],
  "recentes": [{ "id": 40, "titulo": "…", "status": "…", "prioridade": "…", "categoriaNome": "…", "solicitanteNome": "…", "tecnicoNome": "…", "dataAbertura": "…", "dataAtualizacao": "…" }]
}
```

`chamadosEmAndamento` soma EM ANÁLISE, EM ATENDIMENTO e AGUARDANDO USUÁRIO. Para os cards do protótipo (Abertos, Em andamento, Resolvidos, Aguardando usuário), use `chamadosAbertos`, `chamadosEmAtendimento`, `chamadosResolvidos` e `chamadosAguardando`.

## Relatórios — `/api/relatorios` (técnico e admin)

### `GET /relatorios`

Filtros: `meses=1|3|6|12` (padrão 6), `categoriaId`, `tecnicoId` (ou `nenhum` para os sem técnico) e `status`.

```json
{
  "totalChamados": 34,
  "chamadosResolvidos": 18,
  "taxaResolucao": 53,
  "tempoMedioResolucaoHoras": 21.4,
  "porMes": [{ "mes": "2026-06", "rotulo": "Jun/26", "total": 3 }],
  "porCategoria": [{ "categoriaId": 1, "categoriaNome": "Hardware", "total": 11 }],
  "porPrioridade": [],
  "porStatus": [],
  "porTecnico": [{ "tecnicoId": 2, "tecnicoNome": "Fernanda Souza", "atendidos": 20, "resolvidos": 12, "taxaResolucao": 60, "tempoMedioResolucaoHoras": 18.2 }]
}
```

### `GET /relatorios/exportar`

Mesmos filtros. Devolve um arquivo CSV (separado por `;`, abre no Excel). Baixe com `responseType: 'blob'`, como nos anexos.

---

## Usuários — `/api/usuarios`

| Rota | Quem | O que faz |
|------|------|-----------|
| `GET /usuarios` | todos | Admin recebe todos (filtros `perfil`, `status`, `busca`); os outros recebem só a si mesmos |
| `GET /usuarios/tecnicos` | todos | Técnicos ativos (para escolher responsável) |
| `GET /usuarios/:id` | admin ou o próprio usuário | |
| `POST /usuarios` | admin | `{ nome, email, senha, perfil, telefone? }` |
| `PUT /usuarios/:id` | admin | Qualquer campo: `nome`, `email`, `telefone`, `perfil`, `status` (`Ativo`/`Inativo`), `senha` |
| `DELETE /usuarios/:id` | admin | Inativa (não apaga, para manter o histórico) |

O admin não pode inativar a própria conta nem tirar o próprio perfil de admin.

## Categorias — `/api/categorias`

| Rota | Quem | O que faz |
|------|------|-----------|
| `GET /categorias` | todos | Filtro `status=Ativa`. Cada item traz `totalChamados` |
| `GET /categorias/:id` | todos | |
| `POST /categorias` | admin | `{ nome, descricao? }` |
| `PUT /categorias/:id` | admin | `nome`, `descricao`, `status` (`Ativa`/`Inativa`) |
| `DELETE /categorias/:id` | admin | Remove; se já foi usada em chamados, apenas inativa |

No formulário de Novo Chamado, use `GET /categorias?status=Ativa`.

## Equipamentos — `/api/equipamentos`

| Rota | Quem | O que faz |
|------|------|-----------|
| `GET /equipamentos` | todos | Cliente recebe só os equipamentos dele. Filtros: `usuarioId`, `status`, `tipo`, `busca` |
| `GET /equipamentos/:id` | todos | Cliente só os dele |
| `POST /equipamentos` | admin | `{ tipo, marca, modelo, patrimonio, usuarioId? }` |
| `PUT /equipamentos/:id` | admin | Qualquer campo, inclusive `status` |
| `DELETE /equipamentos/:id` | admin | Inativa |

- Tipos: `Desktop`, `Notebook`, `Monitor`, `Impressora`, `Roteador`, `Switch`, `Smartphone`, `Outro`.
- Status: `Ativo`, `Em manutenção`, `Inativo`.
- O campo `nome` é montado automaticamente com marca e modelo (ex.: "Dell Latitude 5440").
- Cada item traz `usuarioNome` (responsável).

---

## Dados de teste

`npm run db:reset` volta o `server/db.json` para os dados iniciais (`server/db.seed.json`): 9 usuários, 9 categorias, 12 equipamentos e 40 chamados distribuídos nos últimos seis meses.

| E-mail | Perfil | Senha |
|--------|--------|-------|
| joao.silvia@empresa.com | cliente | 123456 |
| fernanda.souza@empresa.com | técnico | 123456 |
| paulo.nunes@empresa.com | técnico | 123456 |
| carlos.lima@empresa.com | admin | 123456 |

Outros clientes: clara.mendes, matheus.ramos, sofia.alencar, ana.duarte e rafael.costa (todos `@empresa.com`, senha `123456`).

## Testes

```bash
npm run test:api
```

Sobe a API em outra porta usando uma cópia do banco, então o `server/db.json` não é alterado.
