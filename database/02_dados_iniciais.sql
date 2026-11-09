-- =============================================================
-- SecureDesk - dados iniciais para a demonstração
-- Execute depois do 01_criacao_banco.sql.
-- Os mesmos dados estão em server/db.json, usado pela API.
-- Senha de todos os usuários: 123456 (salva com hash bcrypt, igual à API)
-- Datas no horário de Brasília.
-- =============================================================

-- Garante que os acentos sejam gravados corretamente
SET NAMES utf8mb4;

USE SecureDesk;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE Anexos;
TRUNCATE TABLE Comentarios_Chamados;
TRUNCATE TABLE Historico_Chamados;
TRUNCATE TABLE Chamados;
TRUNCATE TABLE Equipamentos;
TRUNCATE TABLE Usuarios;
TRUNCATE TABLE Status_Chamados;
TRUNCATE TABLE Prioridades;
TRUNCATE TABLE Categorias;
TRUNCATE TABLE Perfis;
SET FOREIGN_KEY_CHECKS = 1;

-- Perfis de acesso
INSERT INTO Perfis (Id, Nome, Descricao) VALUES
    (1, 'Cliente', 'Abre e acompanha os próprios chamados'),
    (2, 'Técnico', 'Assume, atende e resolve chamados'),
    (3, 'Administrador', 'Gerencia usuários, equipamentos, categorias e indicadores');

-- Prioridades
INSERT INTO Prioridades (Id, Nome) VALUES
    (1, 'Baixa'),
    (2, 'Média'),
    (3, 'Alta'),
    (4, 'Crítica');

-- Status do chamado (a reabertura fica registrada no histórico, voltando para Em atendimento)
INSERT INTO Status_Chamados (Id, Nome) VALUES
    (1, 'Aberto'),
    (2, 'Em análise'),
    (3, 'Em atendimento'),
    (4, 'Aguardando usuário'),
    (5, 'Resolvido'),
    (6, 'Encerrado'),
    (7, 'Cancelado');

-- Usuários
INSERT INTO Usuarios (Id, Nome, Email, Telefone, Senha, Perfil_Id, Status) VALUES
    (1, 'João Silva', 'joao.silvia@empresa.com', '(11) 91234-0001', '$2b$10$p6Kbwxe43fddZqUKzQEs5ufyOkiZStR/0tJpzv7Ys2YH/kn0BR8CS', 1, 'Ativo'),
    (2, 'Fernanda Souza', 'fernanda.souza@empresa.com', '(11) 91234-0002', '$2b$10$p6Kbwxe43fddZqUKzQEs5ufyOkiZStR/0tJpzv7Ys2YH/kn0BR8CS', 2, 'Ativo'),
    (3, 'Carlos Lima', 'carlos.lima@empresa.com', '(11) 91234-0003', '$2b$10$p6Kbwxe43fddZqUKzQEs5ufyOkiZStR/0tJpzv7Ys2YH/kn0BR8CS', 3, 'Ativo'),
    (4, 'Paulo Nunes', 'paulo.nunes@empresa.com', '(11) 91234-0004', '$2b$10$p6Kbwxe43fddZqUKzQEs5ufyOkiZStR/0tJpzv7Ys2YH/kn0BR8CS', 2, 'Ativo'),
    (5, 'Clara Mendes', 'clara.mendes@empresa.com', '(11) 91234-0005', '$2b$10$p6Kbwxe43fddZqUKzQEs5ufyOkiZStR/0tJpzv7Ys2YH/kn0BR8CS', 1, 'Ativo'),
    (6, 'Matheus Ramos', 'matheus.ramos@empresa.com', '(11) 91234-0006', '$2b$10$p6Kbwxe43fddZqUKzQEs5ufyOkiZStR/0tJpzv7Ys2YH/kn0BR8CS', 1, 'Ativo'),
    (7, 'Sofia Alencar', 'sofia.alencar@empresa.com', '(11) 91234-0007', '$2b$10$p6Kbwxe43fddZqUKzQEs5ufyOkiZStR/0tJpzv7Ys2YH/kn0BR8CS', 1, 'Ativo'),
    (8, 'Ana Duarte', 'ana.duarte@empresa.com', '(11) 91234-0008', '$2b$10$p6Kbwxe43fddZqUKzQEs5ufyOkiZStR/0tJpzv7Ys2YH/kn0BR8CS', 1, 'Ativo'),
    (9, 'Rafael Costa', 'rafael.costa@empresa.com', '(11) 91234-0009', '$2b$10$p6Kbwxe43fddZqUKzQEs5ufyOkiZStR/0tJpzv7Ys2YH/kn0BR8CS', 1, 'Ativo');

-- Categorias
INSERT INTO Categorias (Id, Nome, Descricao, Status) VALUES
    (1, 'Hardware', 'Problemas relacionados a equipamentos físicos', 'Ativa'),
    (2, 'Software', 'Instalação e erros de programas', 'Ativa'),
    (3, 'Rede', 'Internet, VPN e conectividade', 'Ativa'),
    (4, 'E-mail', 'Contas, caixa de entrada e sincronização', 'Ativa'),
    (5, 'Acesso', 'Acesso a sistemas e permissões', 'Ativa'),
    (6, 'Impressora', 'Impressão, toner e scanners', 'Ativa'),
    (7, 'Sistema', 'Sistemas internos da empresa', 'Ativa'),
    (8, 'Segurança', 'Incidentes e boas práticas de segurança', 'Ativa'),
    (9, 'Outros', 'Demais solicitações', 'Ativa');

-- Equipamentos
INSERT INTO Equipamentos (Id, Tipo, Nome, Marca, Modelo, Patrimonio, Usuario_Id, Status) VALUES
    (1, 'Notebook', 'Acer Nitro 5', 'Acer', 'Nitro 5', 'PAT-00125', 1, 'Ativo'),
    (2, 'Desktop', 'Dell OptiPlex 3090', 'Dell', 'OptiPlex 3090', 'PAT-00112', 1, 'Ativo'),
    (3, 'Monitor', 'LG 24MK430H', 'LG', '24MK430H', 'PAT-00098', 3, 'Ativo'),
    (4, 'Notebook', 'Dell Latitude 5440', 'Dell', 'Latitude 5440', 'PAT-00131', 5, 'Ativo'),
    (5, 'Desktop', 'HP ProDesk 400', 'HP', 'ProDesk 400', 'PAT-00140', 6, 'Ativo'),
    (6, 'Monitor', 'Samsung S24C310', 'Samsung', 'S24C310', 'PAT-00141', 6, 'Ativo'),
    (7, 'Impressora', 'Epson EcoTank L3250', 'Epson', 'EcoTank L3250', 'PAT-00150', 7, 'Em manutenção'),
    (8, 'Notebook', 'Lenovo ThinkPad E14', 'Lenovo', 'ThinkPad E14', 'PAT-00152', 8, 'Ativo'),
    (9, 'Smartphone', 'Samsung Galaxy A54', 'Samsung', 'Galaxy A54', 'PAT-00160', 9, 'Ativo'),
    (10, 'Roteador', 'TP-Link Archer C6', 'TP-Link', 'Archer C6', 'PAT-00170', NULL, 'Ativo'),
    (11, 'Switch', 'Intelbras SG 2404', 'Intelbras', 'SG 2404', 'PAT-00171', NULL, 'Ativo'),
    (12, 'Notebook', 'Asus Vivobook 15', 'Asus', 'Vivobook 15', 'PAT-00118', 9, 'Inativo');

-- Chamados
INSERT INTO Chamados (Id, Titulo, Descricao, Solicitante_Id, Tecnico_Id, Categoria_Id, Equipamento_Id, Prioridade_Id, Status_Id, Data_Abertura, Data_Atualizacao, Data_Encerramento) VALUES
    (1, 'Monitor com a tela piscando', 'O monitor fica piscando e às vezes apaga sozinho por alguns segundos.', 9, 2, 1, 9, 3, 6, '2026-05-13 12:25:00', '2026-05-14 14:59:51', '2026-05-14 14:59:51'),
    (2, 'E-mail suspeito recebido', 'Recebi um e-mail pedindo para confirmar minha senha em um link estranho.', 8, 2, 8, NULL, 1, 6, '2026-05-21 11:07:00', '2026-05-23 12:00:21', '2026-05-23 12:00:21'),
    (3, 'Scanner não digitaliza para a rede', 'O scanner da impressora não salva os arquivos na pasta compartilhada.', 7, 2, 6, NULL, 4, 6, '2026-06-09 08:40:00', '2026-06-10 09:30:46', '2026-06-10 09:30:46'),
    (4, 'Notebook esquentando muito', 'O notebook esquenta bastante e a ventoinha faz barulho alto o tempo todo.', 6, 4, 1, 5, 1, 6, '2026-06-20 10:32:00', '2026-06-21 11:09:13', '2026-06-21 11:09:13'),
    (5, 'Instalação do Adobe Creative Cloud', 'Preciso do Adobe Creative Cloud instalado para editar materiais da área de marketing.', 5, 2, 2, 4, 3, 6, '2026-06-26 12:12:00', '2026-06-27 21:42:28', '2026-06-27 21:42:28'),
    (6, 'Wi-Fi da sala de reunião instável', 'O Wi-Fi da sala de reunião 2 cai durante as videochamadas.', 1, NULL, 3, NULL, 3, 7, '2026-07-04 05:45:00', '2026-07-04 14:38:46', '2026-07-04 14:38:46'),
    (7, 'Celular corporativo não liga', 'O celular corporativo não liga nem carregando na tomada.', 9, 2, 1, 9, 3, 6, '2026-07-13 09:12:00', '2026-07-14 10:26:38', '2026-07-14 10:26:38'),
    (8, 'Troca de mouse com defeito', 'O mouse está com o clique duplo falhando e o scroll não funciona.', 8, 4, 1, 8, 4, 6, '2026-07-24 10:32:00', '2026-07-25 14:30:05', '2026-07-25 14:30:05'),
    (9, 'Impressora travada', 'A impressora do setor parou no meio da impressão e mostra erro de papel atolado.', 3, 2, 6, NULL, 2, 6, '2026-08-02 07:12:00', '2026-08-03 21:11:48', '2026-08-03 21:11:48'),
    (10, 'Teclado com teclas falhando', 'Algumas teclas do notebook não funcionam, principalmente a letra A e o espaço.', 6, 2, 1, 5, 2, 6, '2026-08-15 13:40:00', '2026-08-17 19:06:38', '2026-08-17 19:06:38'),
    (11, 'Excel fechando sozinho', 'O Excel fecha sozinho ao abrir planilhas grandes com tabelas dinâmicas.', 5, 4, 2, 4, 3, 6, '2026-08-26 14:00:00', '2026-08-27 04:00:05', '2026-08-27 04:00:05'),
    (12, 'Cabo de rede danificado', 'O cabo de rede da minha mesa está com o conector quebrado.', 1, 2, 3, NULL, 2, 6, '2026-09-09 14:07:00', '2026-09-11 08:14:58', '2026-09-11 08:14:58'),
    (13, 'Problema de acesso ao sistema', 'Não consigo acessar o sistema interno da empresa, aparece a mensagem de usuário bloqueado.', 9, 4, 5, NULL, 1, 6, '2026-09-22 11:51:00', '2026-09-24 02:23:45', '2026-09-24 02:23:45'),
    (14, 'Solicitação de acesso ao sistema de RH', 'Fui transferido para o RH e preciso de acesso ao sistema de folha de pagamento.', 8, NULL, 5, NULL, 2, 7, '2026-09-22 07:51:00', '2026-09-22 10:54:40', '2026-09-22 10:54:40'),
    (15, 'Toner acabando na impressora do financeiro', 'A impressora do financeiro está imprimindo falhado e avisando toner baixo.', 7, 2, 6, NULL, 2, 5, '2026-10-01 10:07:00', '2026-10-03 11:27:21', NULL),
    (16, 'Antivírus desatualizado', 'O antivírus mostra aviso de definições desatualizadas há uma semana.', 6, 4, 8, 6, 1, 6, '2026-10-03 12:40:00', '2026-10-04 12:07:13', '2026-10-04 12:07:13'),
    (17, 'Configurar assinatura de e-mail', 'Preciso configurar a assinatura padrão da empresa no meu e-mail.', 5, 2, 4, NULL, 2, 5, '2026-10-10 14:25:00', '2026-10-12 15:20:54', NULL),
    (18, 'E-mail não sincroniza no celular', 'Os e-mails corporativos pararam de chegar no aplicativo do celular desde ontem.', 3, 2, 4, 3, 4, 5, '2026-10-16 12:51:00', '2026-10-16 21:00:32', NULL),
    (19, 'Atualização do Windows travada', 'A atualização do Windows está parada em 35% há mais de uma hora.', 9, 2, 2, 9, 4, 6, '2026-10-18 13:12:00', '2026-10-19 09:22:50', '2026-10-19 09:22:50'),
    (20, 'Erro ao emitir nota fiscal', 'O sistema de faturamento mostra erro de certificado ao emitir nota fiscal.', 8, 2, 7, NULL, 2, 5, '2026-10-20 13:18:00', '2026-10-21 14:03:15', NULL),
    (21, 'Relatório do ERP com valores errados', 'O relatório mensal do ERP está somando valores duplicados.', 7, 2, 7, NULL, 3, 5, '2026-10-26 05:18:00', '2026-10-26 22:45:58', NULL),
    (22, 'Erro de VPN ao trabalhar de casa', 'A VPN desconecta a cada poucos minutos e dá timeout nas credenciais do AD.', 6, 2, 3, NULL, 1, 3, '2026-10-28 11:07:00', '2026-10-28 14:56:00', NULL),
    (23, 'Caixa de e-mail cheia', 'Recebo aviso de caixa de entrada cheia e não consigo mais enviar mensagens.', 5, 4, 4, NULL, 1, 3, '2026-10-30 11:32:00', '2026-10-30 14:39:00', NULL),
    (24, 'Novo colaborador precisa de equipamento', 'Um novo colaborador começa segunda-feira e precisa de notebook configurado.', 1, 2, 9, NULL, 4, 4, '2026-10-30 13:07:00', '2026-10-30 20:30:53', NULL),
    (25, 'Teams sem áudio nas reuniões', 'Nas reuniões do Teams ninguém consegue me ouvir, mesmo com o microfone ligado.', 9, 2, 2, 9, 2, 3, '2026-10-31 09:18:00', '2026-10-31 13:06:00', NULL),
    (26, 'Computador sem conexão com a internet', 'O computador está conectado ao cabo de rede, mas não navega em nenhum site.', 8, 4, 3, 8, 2, 4, '2026-11-02 06:51:00', '2026-11-02 14:37:13', NULL),
    (27, 'Lentidão ao abrir o ERP', 'O ERP demora mais de dois minutos para abrir e trava ao gerar relatórios.', 3, 2, 7, NULL, 2, 3, '2026-11-03 09:07:00', '2026-11-03 11:43:00', NULL),
    (28, 'Senha expirada no sistema de vendas', 'Minha senha do sistema de vendas expirou e o link de troca não funciona.', 6, 4, 5, NULL, 2, 2, '2026-11-04 09:12:00', '2026-11-04 09:51:00', NULL),
    (29, 'Pasta compartilhada sem permissão', 'Não consigo abrir a pasta compartilhada do projeto, aparece acesso negado.', 5, 2, 5, NULL, 3, 5, '2026-11-04 13:25:00', '2026-11-04 22:49:24', NULL),
    (30, 'Notebook não inicia', 'O notebook não está iniciando corretamente. A luz de energia acende e apaga logo em seguida.', 1, 4, 1, 2, 1, 3, '2026-11-04 12:00:00', '2026-11-04 13:56:00', NULL),
    (31, 'Monitor com a tela piscando', 'O monitor fica piscando e às vezes apaga sozinho por alguns segundos.', 9, 2, 1, 9, 2, 2, '2026-11-05 09:18:00', '2026-11-05 11:01:00', NULL),
    (32, 'E-mail suspeito recebido', 'Recebi um e-mail pedindo para confirmar minha senha em um link estranho.', 8, 2, 8, NULL, 3, 4, '2026-11-05 07:12:00', '2026-11-05 13:52:21', NULL),
    (33, 'Scanner não digitaliza para a rede', 'O scanner da impressora não salva os arquivos na pasta compartilhada.', 7, NULL, 6, NULL, 1, 1, '2026-11-06 08:07:00', '2026-11-06 08:07:00', NULL),
    (34, 'Notebook esquentando muito', 'O notebook esquenta bastante e a ventoinha faz barulho alto o tempo todo.', 6, 2, 1, 6, 3, 2, '2026-11-06 06:45:00', '2026-11-06 06:59:00', NULL),
    (35, 'Instalação do Adobe Creative Cloud', 'Preciso do Adobe Creative Cloud instalado para editar materiais da área de marketing.', 5, 2, 2, 4, 1, 3, '2026-11-06 06:07:00', '2026-11-06 07:55:00', NULL),
    (36, 'Wi-Fi da sala de reunião instável', 'O Wi-Fi da sala de reunião 2 cai durante as videochamadas.', 3, NULL, 3, NULL, 3, 1, '2026-11-06 05:07:00', '2026-11-06 05:07:00', NULL),
    (37, 'Celular corporativo não liga', 'O celular corporativo não liga nem carregando na tomada.', 9, NULL, 1, 9, 2, 1, '2026-11-07 11:00:00', '2026-11-07 11:05:00', NULL),
    (38, 'Troca de mouse com defeito', 'O mouse está com o clique duplo falhando e o scroll não funciona.', 8, NULL, 1, 8, 2, 1, '2026-11-07 07:12:00', '2026-11-07 07:12:00', NULL),
    (39, 'Impressora travada', 'A impressora do setor parou no meio da impressão e mostra erro de papel atolado.', 7, 2, 6, NULL, 3, 2, '2026-11-07 05:07:00', '2026-11-07 06:25:00', NULL),
    (40, 'Teclado com teclas falhando', 'Algumas teclas do notebook não funcionam, principalmente a letra A e o espaço.', 6, NULL, 1, 6, 2, 1, '2026-11-08 06:18:00', '2026-11-08 06:18:00', NULL);

-- Histórico de mudanças de status
INSERT INTO Historico_Chamados (Id, Chamado_Id, Usuario_Id, Status_Anterior_Id, Status_Novo_Id, Observacao, Data_Evento) VALUES
    (1, 1, 9, NULL, 1, 'Chamado aberto.', '2026-05-13 12:25:00'),
    (2, 1, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-05-13 13:44:00'),
    (3, 1, 2, 2, 3, 'Atendimento iniciado.', '2026-05-13 14:56:00'),
    (4, 1, 2, 3, 5, 'Problema resolvido. Por favor, confirme se está tudo funcionando.', '2026-05-14 06:35:53'),
    (5, 1, 9, 5, 6, 'Usuário confirmou a solução.', '2026-05-14 14:59:51'),
    (6, 2, 8, NULL, 1, 'Chamado aberto.', '2026-05-21 11:07:00'),
    (7, 2, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-05-21 12:35:00'),
    (8, 2, 2, 2, 3, 'Atendimento iniciado.', '2026-05-21 12:56:00'),
    (9, 2, 2, 3, 5, 'Problema resolvido. Por favor, confirme se está tudo funcionando.', '2026-05-23 04:17:12'),
    (10, 2, 8, 5, 6, 'Usuário confirmou a solução.', '2026-05-23 12:00:21'),
    (11, 3, 7, NULL, 1, 'Chamado aberto.', '2026-06-09 08:40:00'),
    (12, 3, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-06-09 10:14:00'),
    (13, 3, 2, 2, 3, 'Atendimento iniciado.', '2026-06-09 13:09:00'),
    (14, 3, 2, 3, 5, 'Problema resolvido. Por favor, confirme se está tudo funcionando.', '2026-06-09 14:29:08'),
    (15, 3, 7, 5, 6, 'Usuário confirmou a solução.', '2026-06-10 09:30:46'),
    (16, 4, 6, NULL, 1, 'Chamado aberto.', '2026-06-20 10:32:00'),
    (17, 4, 4, 1, 2, 'Chamado assumido por Paulo Nunes.', '2026-06-20 10:57:00'),
    (18, 4, 4, 2, 3, 'Atendimento iniciado.', '2026-06-20 11:30:00'),
    (19, 4, 4, 3, 5, 'Problema resolvido. Por favor, confirme se está tudo funcionando.', '2026-06-21 01:05:09'),
    (20, 4, 6, 5, 6, 'Usuário confirmou a solução.', '2026-06-21 11:09:13'),
    (21, 5, 5, NULL, 1, 'Chamado aberto.', '2026-06-26 12:12:00'),
    (22, 5, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-06-26 13:28:00'),
    (23, 5, 2, 2, 3, 'Atendimento iniciado.', '2026-06-26 13:50:00'),
    (24, 5, 2, 3, 5, 'Problema resolvido. Por favor, confirme se está tudo funcionando.', '2026-06-27 04:52:58'),
    (25, 5, 5, 5, 6, 'Usuário confirmou a solução.', '2026-06-27 21:42:28'),
    (26, 6, 1, NULL, 1, 'Chamado aberto.', '2026-07-04 05:45:00'),
    (27, 6, 1, 1, 7, 'Chamado cancelado pelo solicitante: o problema foi resolvido sozinho.', '2026-07-04 14:38:46'),
    (28, 7, 9, NULL, 1, 'Chamado aberto.', '2026-07-13 09:12:00'),
    (29, 7, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-07-13 10:52:00'),
    (30, 7, 2, 2, 3, 'Atendimento iniciado.', '2026-07-13 12:10:00'),
    (31, 7, 2, 3, 5, 'Problema resolvido. Por favor, confirme se está tudo funcionando.', '2026-07-14 05:35:51'),
    (32, 7, 9, 5, 6, 'Usuário confirmou a solução.', '2026-07-14 10:26:38'),
    (33, 8, 8, NULL, 1, 'Chamado aberto.', '2026-07-24 10:32:00'),
    (34, 8, 4, 1, 2, 'Chamado assumido por Paulo Nunes.', '2026-07-24 12:25:00'),
    (35, 8, 4, 2, 3, 'Atendimento iniciado.', '2026-07-24 14:37:00'),
    (36, 8, 4, 3, 5, 'Problema resolvido. Por favor, confirme se está tudo funcionando.', '2026-07-24 18:33:15'),
    (37, 8, 8, 5, 6, 'Usuário confirmou a solução.', '2026-07-25 14:30:05'),
    (38, 9, 3, NULL, 1, 'Chamado aberto.', '2026-08-02 07:12:00'),
    (39, 9, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-08-02 08:36:00'),
    (40, 9, 2, 2, 3, 'Atendimento iniciado.', '2026-08-02 09:38:00'),
    (41, 9, 2, 3, 5, 'Problema resolvido. Por favor, confirme se está tudo funcionando.', '2026-08-02 19:19:30'),
    (42, 9, 3, 5, 6, 'Usuário confirmou a solução.', '2026-08-03 21:11:48'),
    (43, 10, 6, NULL, 1, 'Chamado aberto.', '2026-08-15 13:40:00'),
    (44, 10, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-08-15 14:38:00'),
    (45, 10, 2, 2, 3, 'Atendimento iniciado.', '2026-08-15 14:53:00'),
    (46, 10, 2, 3, 5, 'Problema resolvido. Por favor, confirme se está tudo funcionando.', '2026-08-17 13:49:42'),
    (47, 10, 6, 5, 6, 'Usuário confirmou a solução.', '2026-08-17 19:06:38'),
    (48, 11, 5, NULL, 1, 'Chamado aberto.', '2026-08-26 14:00:00'),
    (49, 11, 4, 1, 2, 'Chamado assumido por Paulo Nunes.', '2026-08-26 14:38:00'),
    (50, 11, 4, 2, 3, 'Atendimento iniciado.', '2026-08-26 16:55:00'),
    (51, 11, 4, 3, 5, 'Problema resolvido. Por favor, confirme se está tudo funcionando.', '2026-08-26 21:22:42'),
    (52, 11, 5, 5, 6, 'Usuário confirmou a solução.', '2026-08-27 04:00:05'),
    (53, 12, 1, NULL, 1, 'Chamado aberto.', '2026-09-09 14:07:00'),
    (54, 12, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-09-09 14:28:00'),
    (55, 12, 2, 2, 3, 'Atendimento iniciado.', '2026-09-09 14:58:00'),
    (56, 12, 2, 3, 5, 'Problema resolvido. Por favor, confirme se está tudo funcionando.', '2026-09-10 09:58:10'),
    (57, 12, 1, 5, 6, 'Usuário confirmou a solução.', '2026-09-11 08:14:58'),
    (58, 14, 8, NULL, 1, 'Chamado aberto.', '2026-09-22 07:51:00'),
    (59, 14, 8, 1, 7, 'Chamado cancelado pelo solicitante: o problema foi resolvido sozinho.', '2026-09-22 10:54:40'),
    (60, 13, 9, NULL, 1, 'Chamado aberto.', '2026-09-22 11:51:00'),
    (61, 13, 4, 1, 2, 'Chamado assumido por Paulo Nunes.', '2026-09-22 13:38:00'),
    (62, 13, 4, 2, 3, 'Atendimento iniciado.', '2026-09-22 15:31:00'),
    (63, 13, 4, 3, 5, 'Problema resolvido. Por favor, confirme se está tudo funcionando.', '2026-09-23 17:30:44'),
    (64, 13, 9, 5, 6, 'Usuário confirmou a solução.', '2026-09-24 02:23:45'),
    (65, 15, 7, NULL, 1, 'Chamado aberto.', '2026-10-01 10:07:00'),
    (66, 15, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-10-01 10:18:00'),
    (67, 15, 2, 2, 3, 'Atendimento iniciado.', '2026-10-01 12:45:00'),
    (68, 15, 2, 3, 5, 'Problema resolvido. Por favor, confirme se está tudo funcionando.', '2026-10-03 11:27:21'),
    (69, 16, 6, NULL, 1, 'Chamado aberto.', '2026-10-03 12:40:00'),
    (70, 16, 4, 1, 2, 'Chamado assumido por Paulo Nunes.', '2026-10-03 13:28:00'),
    (71, 16, 4, 2, 3, 'Atendimento iniciado.', '2026-10-03 13:53:00'),
    (72, 16, 4, 3, 5, 'Problema resolvido. Por favor, confirme se está tudo funcionando.', '2026-10-04 01:54:37'),
    (73, 16, 6, 5, 6, 'Usuário confirmou a solução.', '2026-10-04 12:07:13'),
    (74, 17, 5, NULL, 1, 'Chamado aberto.', '2026-10-10 14:25:00'),
    (75, 17, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-10-10 15:41:00'),
    (76, 17, 2, 2, 3, 'Atendimento iniciado.', '2026-10-10 17:43:00'),
    (77, 17, 2, 3, 5, 'Problema resolvido. Por favor, confirme se está tudo funcionando.', '2026-10-12 15:20:54'),
    (78, 18, 3, NULL, 1, 'Chamado aberto.', '2026-10-16 12:51:00'),
    (79, 18, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-10-16 13:47:00'),
    (80, 18, 2, 2, 3, 'Atendimento iniciado.', '2026-10-16 15:11:00'),
    (81, 18, 2, 3, 5, 'Problema resolvido. Por favor, confirme se está tudo funcionando.', '2026-10-16 21:00:32'),
    (82, 19, 9, NULL, 1, 'Chamado aberto.', '2026-10-18 13:12:00'),
    (83, 19, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-10-18 13:27:00'),
    (84, 19, 2, 2, 3, 'Atendimento iniciado.', '2026-10-18 13:46:00'),
    (85, 19, 2, 3, 5, 'Problema resolvido. Por favor, confirme se está tudo funcionando.', '2026-10-18 18:09:14'),
    (86, 19, 9, 5, 6, 'Usuário confirmou a solução.', '2026-10-19 09:22:50'),
    (87, 20, 8, NULL, 1, 'Chamado aberto.', '2026-10-20 13:18:00'),
    (88, 20, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-10-20 14:59:00'),
    (89, 20, 2, 2, 3, 'Atendimento iniciado.', '2026-10-20 17:14:00'),
    (90, 20, 2, 3, 5, 'Problema resolvido. Por favor, confirme se está tudo funcionando.', '2026-10-21 14:03:15'),
    (91, 21, 7, NULL, 1, 'Chamado aberto.', '2026-10-26 05:18:00'),
    (92, 21, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-10-26 07:00:00'),
    (93, 21, 2, 2, 3, 'Atendimento iniciado.', '2026-10-26 08:24:00'),
    (94, 21, 2, 3, 5, 'Problema resolvido. Por favor, confirme se está tudo funcionando.', '2026-10-26 22:45:58'),
    (95, 22, 6, NULL, 1, 'Chamado aberto.', '2026-10-28 11:07:00'),
    (96, 22, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-10-28 11:45:00'),
    (97, 22, 2, 2, 3, 'Atendimento iniciado.', '2026-10-28 14:38:00'),
    (98, 23, 5, NULL, 1, 'Chamado aberto.', '2026-10-30 11:32:00'),
    (99, 24, 1, NULL, 1, 'Chamado aberto.', '2026-10-30 13:07:00'),
    (100, 23, 4, 1, 2, 'Chamado assumido por Paulo Nunes.', '2026-10-30 13:14:00'),
    (101, 23, 4, 2, 3, 'Atendimento iniciado.', '2026-10-30 13:42:00'),
    (102, 24, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-10-30 14:10:00'),
    (103, 24, 2, 2, 3, 'Atendimento iniciado.', '2026-10-30 16:35:00'),
    (104, 24, 2, 3, 4, 'Preciso que você confirme se o problema acontece também em outro computador.', '2026-10-30 20:30:53'),
    (105, 25, 9, NULL, 1, 'Chamado aberto.', '2026-10-31 09:18:00'),
    (106, 25, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-10-31 10:32:00'),
    (107, 25, 2, 2, 3, 'Atendimento iniciado.', '2026-10-31 13:06:00'),
    (108, 26, 8, NULL, 1, 'Chamado aberto.', '2026-11-02 06:51:00'),
    (109, 26, 4, 1, 2, 'Chamado assumido por Paulo Nunes.', '2026-11-02 07:04:00'),
    (110, 26, 4, 2, 3, 'Atendimento iniciado.', '2026-11-02 09:09:00'),
    (111, 26, 4, 3, 4, 'Preciso que você confirme se o problema acontece também em outro computador.', '2026-11-02 14:37:13'),
    (112, 27, 3, NULL, 1, 'Chamado aberto.', '2026-11-03 09:07:00'),
    (113, 27, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-11-03 10:14:00'),
    (114, 27, 2, 2, 3, 'Atendimento iniciado.', '2026-11-03 11:43:00'),
    (115, 28, 6, NULL, 1, 'Chamado aberto.', '2026-11-04 09:12:00'),
    (116, 28, 4, 1, 2, 'Chamado assumido por Paulo Nunes.', '2026-11-04 09:51:00'),
    (117, 30, 1, NULL, 1, 'Chamado aberto.', '2026-11-04 12:00:00'),
    (118, 30, 4, 1, 2, 'Chamado assumido por Paulo Nunes.', '2026-11-04 12:35:00'),
    (119, 29, 5, NULL, 1, 'Chamado aberto.', '2026-11-04 13:25:00'),
    (120, 30, 4, 2, 3, 'Atendimento iniciado.', '2026-11-04 13:56:00'),
    (121, 29, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-11-04 14:52:00'),
    (122, 29, 2, 2, 3, 'Atendimento iniciado.', '2026-11-04 17:34:00'),
    (123, 29, 2, 3, 5, 'Problema resolvido. Por favor, confirme se está tudo funcionando.', '2026-11-04 22:49:24'),
    (124, 32, 8, NULL, 1, 'Chamado aberto.', '2026-11-05 07:12:00'),
    (125, 32, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-11-05 08:44:00'),
    (126, 31, 9, NULL, 1, 'Chamado aberto.', '2026-11-05 09:18:00'),
    (127, 32, 2, 2, 3, 'Atendimento iniciado.', '2026-11-05 10:39:00'),
    (128, 31, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-11-05 11:01:00'),
    (129, 32, 2, 3, 4, 'Preciso que você confirme se o problema acontece também em outro computador.', '2026-11-05 13:52:21'),
    (130, 36, 3, NULL, 1, 'Chamado aberto.', '2026-11-06 05:07:00'),
    (131, 35, 5, NULL, 1, 'Chamado aberto.', '2026-11-06 06:07:00'),
    (132, 35, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-11-06 06:19:00'),
    (133, 34, 6, NULL, 1, 'Chamado aberto.', '2026-11-06 06:45:00'),
    (134, 34, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-11-06 06:59:00'),
    (135, 35, 2, 2, 3, 'Atendimento iniciado.', '2026-11-06 07:55:00'),
    (136, 33, 7, NULL, 1, 'Chamado aberto.', '2026-11-06 08:07:00'),
    (137, 39, 7, NULL, 1, 'Chamado aberto.', '2026-11-07 05:07:00'),
    (138, 39, 2, 1, 2, 'Chamado assumido por Fernanda Souza.', '2026-11-07 06:25:00'),
    (139, 38, 8, NULL, 1, 'Chamado aberto.', '2026-11-07 07:12:00'),
    (140, 37, 9, NULL, 1, 'Chamado aberto.', '2026-11-07 11:00:00'),
    (141, 40, 6, NULL, 1, 'Chamado aberto.', '2026-11-08 06:18:00');

-- Comentários
INSERT INTO Comentarios_Chamados (Id, Chamado_Id, Usuario_Id, Comentario, Data_Criacao) VALUES
    (1, 2, 2, 'Fiz a troca da peça e vou acompanhar por mais um dia.', '2026-05-21 13:42:00'),
    (2, 3, 2, 'Estou verificando o equipamento e os logs do sistema.', '2026-06-09 13:48:00'),
    (3, 4, 4, 'Atualizei as permissões no servidor de arquivos.', '2026-06-20 12:19:00'),
    (4, 5, 5, 'Obrigado, agora está funcionando normalmente.', '2026-06-26 12:48:00'),
    (5, 5, 2, 'Atualizei as permissões no servidor de arquivos.', '2026-06-26 15:12:00'),
    (6, 7, 2, 'Reinstalei o programa e limpei o cache. Pode testar?', '2026-07-13 13:11:00'),
    (7, 8, 4, 'Atualizei as permissões no servidor de arquivos.', '2026-07-24 16:05:00'),
    (8, 9, 3, 'O problema começou depois da última atualização.', '2026-08-02 07:22:00'),
    (9, 9, 2, 'Fiz a troca da peça e vou acompanhar por mais um dia.', '2026-08-02 09:56:00'),
    (10, 11, 4, 'Atualizei as permissões no servidor de arquivos.', '2026-08-26 17:40:00'),
    (11, 12, 2, 'Reinstalei o programa e limpei o cache. Pode testar?', '2026-09-09 15:55:00'),
    (12, 13, 4, 'Encaminhei o caso para o fornecedor e aguardo retorno.', '2026-09-22 16:14:00'),
    (13, 15, 2, 'Reinstalei o programa e limpei o cache. Pode testar?', '2026-10-01 13:45:00'),
    (14, 16, 6, 'O problema começou depois da última atualização.', '2026-10-03 12:54:00'),
    (15, 17, 2, 'Encaminhei o caso para o fornecedor e aguardo retorno.', '2026-10-10 18:00:00'),
    (16, 18, 2, 'Fiz a troca da peça e vou acompanhar por mais um dia.', '2026-10-16 15:52:00'),
    (17, 19, 2, 'Reinstalei o programa e limpei o cache. Pode testar?', '2026-10-18 15:03:00'),
    (18, 20, 8, 'Testei agora e continua acontecendo.', '2026-10-20 13:27:00'),
    (19, 20, 2, 'Encaminhei o caso para o fornecedor e aguardo retorno.', '2026-10-20 18:29:00'),
    (20, 21, 7, 'O problema começou depois da última atualização.', '2026-10-26 05:27:00'),
    (21, 22, 2, 'Fiz a troca da peça e vou acompanhar por mais um dia.', '2026-10-28 14:56:00'),
    (22, 23, 5, 'Consigo trazer o equipamento até a TI amanhã cedo.', '2026-10-30 11:52:00'),
    (23, 23, 4, 'Fiz a troca da peça e vou acompanhar por mais um dia.', '2026-10-30 14:39:00'),
    (24, 24, 2, 'Estou verificando o equipamento e os logs do sistema.', '2026-10-30 17:56:00'),
    (25, 26, 8, 'O problema começou depois da última atualização.', '2026-11-02 06:57:00'),
    (26, 26, 4, 'Estou verificando o equipamento e os logs do sistema.', '2026-11-02 10:20:00'),
    (27, 28, 6, 'O problema começou depois da última atualização.', '2026-11-04 09:28:00'),
    (28, 30, 1, 'Testei agora e continua acontecendo.', '2026-11-04 12:15:00'),
    (29, 32, 2, 'Fiz a troca da peça e vou acompanhar por mais um dia.', '2026-11-05 11:41:00'),
    (30, 34, 6, 'Consigo trazer o equipamento até a TI amanhã cedo.', '2026-11-06 06:52:00'),
    (31, 39, 7, 'Consigo trazer o equipamento até a TI amanhã cedo.', '2026-11-07 05:22:00'),
    (32, 37, 9, 'O problema começou depois da última atualização.', '2026-11-07 11:05:00');
