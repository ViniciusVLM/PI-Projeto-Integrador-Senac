INSERT INTO Perfis (Nome, Descrição)
VALUES
('Usuário', 'Pode abrir e acompanhar chamados'),
('Técnico', 'Pode atender e resolver chamados'),
('Administrador', 'Gerencia usuários e configurações');
SELECT * FROM Perfis;


INSERT INTO Categorias (Nome, Descricao, Status)
VALUES
('Hardware', 'Problemas relacionados a equipamentos físicos', 'Ativa'),
('Software', 'Problemas relacionados a programas e sistemas', 'Ativa'),
('Rede', 'Problemas de conectividade e internet', 'Ativa'),
('E-mail', 'Problemas com e-mail e contas', 'Ativa'),
('Acesso', 'Acesso a sistemas e permissões', 'Ativa');
SELECT * FROM Categorias;


INSERT INTO Prioridades (Nome)
VALUES
('Baixa'),
('Média'),
('Alta');
SELECT * FROM Prioridades; 


INSERT INTO Status_Chamados (Nome)
VALUES
('Aberto'),
('Em análise'),
('Em atendimento'),
('Aguardando usuário'),
('Resolvido'),
('Reaberto');
SELECT * FROM Status_Chamados;


INSERT INTO Usuarios (Nome, Email, Senha, Perfil_Id, Status)
VALUES
('João Silva', 'joao.silvia@empresa.com', '123456', 1, 'Ativo'),
('Fernanda Souza', 'fernanda.souza@empresa.com', '123456', 2, 'Ativo'),
('Administrador', 'carlos.lima@empresa.com', '123456', 3, 'Ativo');

SELECT * FROM Usuarios;


INSERT INTO Equipamentos (Tipo, Nome, Patrimonio, Usuario_Id, Status)
VALUES
('Notebook', 'Acer Nitro 5', 'PAT-00125', 1, 'Ativo'),
('Desktop', 'Dell OptiPlex 3090', 'PAT-00112', 1, 'Ativo'),
('Monitor', 'LG 24', 'PAT-00098', 3, 'Ativo');

SELECT * FROM Equipamentos;

INSERT INTO Chamados (
    Titulo,
    Descricao,
    Solicitante_Id,
    Tecnico_Id,
    Categoria_Id,
    Equipamento_Id,
    Prioridade_Id,
    Status_Id
)
VALUES
(
    'Notebook não inicia',
    'O notebook não está iniciando corretamente.',
    1,
    2,
    1,
    1,
    3,
    3
),
(
    'Problema de acesso ao sistema',
    'Usuário não consegue acessar o sistema interno da empresa.',
    1,
    2,
    5,
    NULL,
    2,
    2
),
(
    'Computador sem conexão com a internet',
    'O computador está conectado à rede, mas não possui acesso à internet.',
    3,
    2,
    3,
    3,
    2,
    1
);

SELECT * FROM Chamados;

UPDATE Chamados
SET Equipamento_Id = NULL
WHERE Id = 3;

INSERT INTO Historico_Chamados (
    Chamado_Id,
    Usuario_Id,
    Status_Anterior_Id,
    Status_Novo_Id,
    Observacao
)
VALUES
(
    1,
    1,
    NULL,
    1,
    'Chamado aberto pelo usuário.'
),
(
    1,
    2,
    1,
    2,
    'Chamado recebido para análise.'
),
(
    1,
    2,
    2,
    3,
    'Atendimento iniciado pelo técnico.'
),
(
    2,
    1,
    NULL,
    1,
    'Chamado aberto pelo usuário.'
),
(
    2,
    2,
    1,
    2,
    'Chamado em análise pelo técnico.'
),
(
    3,
    3,
    NULL,
    1,
    'Chamado aberto pelo administrador.'
);

SELECT * FROM Historico_Chamados;

INSERT INTO Comentarios_Chamados (
    Chamado_Id,
    Usuario_Id,
    Comentario
)
VALUES
(
    1,
    1,
    'O problema começou após uma atualização do sistema.'
),
(
    1,
    2,
    'Estou verificando o equipamento e o processo de inicialização.'
),
(
    2,
    1,
    'Já tentei redefinir minha senha, mas continuo sem acesso.'
),
(
    2,
    2,
    'Vou verificar as permissões de acesso do usuário.'
),
(
    3,
    3,
    'A conexão parou de funcionar durante o expediente.'
);

SELECT * FROM Comentarios_Chamados;

INSERT INTO Anexos (
    Chamado_Id,
    Usuario_Id,
    Nome_Arquivo,
    Caminho_Arquivo
)
VALUES
(
    1,
    1,
    'erro_notebook.png',
    '/uploads/erro_notebook.png'
),
(
    2,
    1,
    'erro_acesso.png',
    '/uploads/erro_acesso.png'
);

SELECT * FROM Anexos;