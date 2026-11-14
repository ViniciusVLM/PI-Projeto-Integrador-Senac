# Banco de dados do SecureDesk

Modelo de dados do sistema em MySQL/MariaDB. A API grava os mesmos dados em `server/db.json`; os scripts desta pasta representam esse modelo em SQL e trazem a mesma massa de dados da demonstração.

## Como executar

Rode os scripts nesta ordem, no MySQL Workbench, no DBeaver ou pelo terminal:

```bash
mysql -u root -p < 01_criacao_banco.sql
mysql -u root -p < 02_dados_iniciais.sql
mysql -u root -p < 03_consultas.sql
```

| Script | O que faz |
|--------|-----------|
| `01_criacao_banco.sql` | Cria o banco `SecureDesk` e as tabelas. Pode ser rodado de novo: apaga as tabelas e recria. |
| `02_dados_iniciais.sql` | Insere 9 usuários, 9 categorias, 12 equipamentos e 40 chamados com histórico e comentários. |
| `03_consultas.sql` | 16 consultas, incluindo as que reproduzem os números do dashboard e dos relatórios. |

Senha de todos os usuários: `123456` (gravada com hash bcrypt, o mesmo formato da API).

## Diagrama entidade-relacionamento

```mermaid
erDiagram
    Perfis ||--o{ Usuarios : "define o perfil de"
    Usuarios ||--o{ Equipamentos : "é responsável por"
    Usuarios ||--o{ Chamados : "abre (solicitante)"
    Usuarios |o--o{ Chamados : "atende (técnico)"
    Categorias ||--o{ Chamados : classifica
    Equipamentos |o--o{ Chamados : "é citado em"
    Prioridades ||--o{ Chamados : define
    Status_Chamados ||--o{ Chamados : "situação atual de"
    Chamados ||--o{ Historico_Chamados : registra
    Chamados ||--o{ Comentarios_Chamados : recebe
    Chamados ||--o{ Anexos : possui
    Usuarios ||--o{ Historico_Chamados : executa
    Usuarios ||--o{ Comentarios_Chamados : escreve

    Perfis {
        int Id PK
        varchar Nome
        varchar Descricao
    }
    Usuarios {
        int Id PK
        varchar Nome
        varchar Email
        varchar Telefone
        varchar Senha
        int Perfil_Id FK
        varchar Status
        datetime Data_Cadastro
    }
    Categorias {
        int Id PK
        varchar Nome
        varchar Descricao
        varchar Status
    }
    Equipamentos {
        int Id PK
        varchar Tipo
        varchar Nome
        varchar Marca
        varchar Modelo
        varchar Patrimonio
        int Usuario_Id FK
        varchar Status
    }
    Chamados {
        int Id PK
        varchar Titulo
        text Descricao
        int Solicitante_Id FK
        int Tecnico_Id FK
        int Categoria_Id FK
        int Equipamento_Id FK
        int Prioridade_Id FK
        int Status_Id FK
        datetime Data_Abertura
        datetime Data_Atualizacao
        datetime Data_Encerramento
    }
    Prioridades {
        int Id PK
        varchar Nome
    }
    Status_Chamados {
        int Id PK
        varchar Nome
    }
    Historico_Chamados {
        int Id PK
        int Chamado_Id FK
        int Usuario_Id FK
        int Status_Anterior_Id FK
        int Status_Novo_Id FK
        varchar Observacao
        datetime Data_Evento
    }
    Comentarios_Chamados {
        int Id PK
        int Chamado_Id FK
        int Usuario_Id FK
        text Comentario
        datetime Data_Criacao
    }
    Anexos {
        int Id PK
        int Chamado_Id FK
        int Usuario_Id FK
        varchar Nome_Arquivo
        varchar Caminho_Arquivo
        varchar Tipo_Arquivo
        int Tamanho_Bytes
        datetime Data_Upload
    }
```

## Tabelas de domínio

| Tabela | Valores |
|--------|---------|
| Perfis | Cliente, Técnico, Administrador |
| Prioridades | Baixa, Média, Alta, Crítica |
| Status_Chamados | Aberto, Em análise, Em atendimento, Aguardando usuário, Resolvido, Encerrado, Cancelado |

A reabertura de um chamado não é um status próprio: ela fica registrada no `Historico_Chamados`, e o chamado volta para "Em atendimento".

## Regras do modelo

- O e-mail do usuário, o número de patrimônio do equipamento e o nome da categoria são únicos.
- Usuários e equipamentos não são apagados, só ficam com status `Inativo`, para não quebrar o histórico dos chamados.
- `Data_Atualizacao` do chamado é atualizada automaticamente a cada alteração (`ON UPDATE CURRENT_TIMESTAMP`).
- Toda mudança de status gera uma linha em `Historico_Chamados` com quem fez, o status anterior, o novo e a observação.
