-- =============================================================
-- SecureDesk - consultas usadas pelo sistema
-- As consultas 8 a 16 reproduzem os números do dashboard e da
-- tela de relatórios.
-- =============================================================

-- Garante que os acentos sejam gravados corretamente
SET NAMES utf8mb4;

USE SecureDesk;


-- 1. LISTAR USUARIOS COM SEUS PERFIS
SELECT
    Usuarios.Id,
    Usuarios.Nome,
    Usuarios.Email,
    Usuarios.Telefone,
    Perfis.Nome AS Perfil,
    Usuarios.Status
FROM Usuarios
INNER JOIN Perfis
    ON Usuarios.Perfil_Id = Perfis.Id;


-- 2. LISTAR EQUIPAMENTOS COM O USUARIO RESPONSAVEL
SELECT
    Equipamentos.Id,
    Equipamentos.Tipo,
    Equipamentos.Nome,
    Equipamentos.Marca,
    Equipamentos.Modelo,
    Equipamentos.Patrimonio,
    Usuarios.Nome AS Usuario,
    Equipamentos.Status
FROM Equipamentos
LEFT JOIN Usuarios
    ON Equipamentos.Usuario_Id = Usuarios.Id;


-- 3. LISTAR CHAMADOS COM CATEGORIA, PRIORIDADE E STATUS
SELECT
    Chamados.Id,
    Chamados.Titulo,
    Categorias.Nome AS Categoria,
    Prioridades.Nome AS Prioridade,
    Status_Chamados.Nome AS Status,
    Chamados.Data_Abertura
FROM Chamados
INNER JOIN Categorias
    ON Chamados.Categoria_Id = Categorias.Id
INNER JOIN Prioridades
    ON Chamados.Prioridade_Id = Prioridades.Id
INNER JOIN Status_Chamados
    ON Chamados.Status_Id = Status_Chamados.Id;


-- 4. LISTAR CHAMADOS DE ALTA OU CRITICA PRIORIDADE
SELECT
    Chamados.Id,
    Chamados.Titulo,
    Prioridades.Nome AS Prioridade
FROM Chamados
INNER JOIN Prioridades
    ON Chamados.Prioridade_Id = Prioridades.Id
WHERE Prioridades.Nome IN ('Alta', 'Crítica');


-- 5. LISTAR CHAMADOS EM ABERTO
SELECT
    Chamados.Id,
    Chamados.Titulo,
    Status_Chamados.Nome AS Status
FROM Chamados
INNER JOIN Status_Chamados
    ON Chamados.Status_Id = Status_Chamados.Id
WHERE Status_Chamados.Nome = 'Aberto';


-- 6. CONTAR QUANTOS CHAMADOS EXISTEM
SELECT COUNT(*) AS Total_Chamados
FROM Chamados;


-- 7. CONTAR CHAMADOS POR STATUS
SELECT
    Status_Chamados.Nome AS Status,
    COUNT(Chamados.Id) AS Quantidade
FROM Status_Chamados
LEFT JOIN Chamados
    ON Status_Chamados.Id = Chamados.Status_Id
GROUP BY
    Status_Chamados.Id,
    Status_Chamados.Nome
ORDER BY Quantidade DESC;


-- 8. CONTAR CHAMADOS POR PRIORIDADE (gráfico de prioridade do dashboard)
SELECT
    Prioridades.Nome AS Prioridade,
    COUNT(Chamados.Id) AS Quantidade
FROM Prioridades
LEFT JOIN Chamados
    ON Prioridades.Id = Chamados.Prioridade_Id
GROUP BY
    Prioridades.Id,
    Prioridades.Nome
ORDER BY Prioridades.Id;


-- 9. CONTAR CHAMADOS POR CATEGORIA (do mais usado para o menos usado)
SELECT
    Categorias.Nome AS Categoria,
    COUNT(Chamados.Id) AS Quantidade
FROM Categorias
LEFT JOIN Chamados
    ON Categorias.Id = Chamados.Categoria_Id
GROUP BY
    Categorias.Id,
    Categorias.Nome
ORDER BY Quantidade DESC;


-- 10. CHAMADOS ABERTOS POR MÊS NOS ÚLTIMOS 6 MESES (relatórios)
SELECT
    DATE_FORMAT(Chamados.Data_Abertura, '%Y-%m') AS Mes,
    COUNT(*) AS Quantidade
FROM Chamados
WHERE Chamados.Data_Abertura >= DATE_SUB(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), INTERVAL 5 MONTH)
GROUP BY Mes
ORDER BY Mes;


-- 11. CARDS DO DASHBOARD (abertos, em atendimento, aguardando e resolvidos)
SELECT
    COUNT(*) AS Total_Chamados,
    SUM(Status_Chamados.Nome = 'Aberto') AS Abertos,
    SUM(Status_Chamados.Nome IN ('Em análise', 'Em atendimento')) AS Em_Atendimento,
    SUM(Status_Chamados.Nome = 'Aguardando usuário') AS Aguardando_Usuario,
    SUM(Status_Chamados.Nome IN ('Resolvido', 'Encerrado')) AS Resolvidos,
    SUM(Status_Chamados.Nome = 'Cancelado') AS Cancelados
FROM Chamados
INNER JOIN Status_Chamados
    ON Chamados.Status_Id = Status_Chamados.Id;


-- 12. TEMPO MÉDIO DE RESOLUÇÃO EM HORAS
-- Considera o momento em que cada chamado chegou pela primeira vez em "Resolvido"
SELECT
    ROUND(AVG(TIMESTAMPDIFF(MINUTE, Chamados.Data_Abertura, Resolucao.Data_Resolvido)) / 60, 1) AS Tempo_Medio_Horas
FROM Chamados
INNER JOIN (
    SELECT
        Historico_Chamados.Chamado_Id,
        MIN(Historico_Chamados.Data_Evento) AS Data_Resolvido
    FROM Historico_Chamados
    INNER JOIN Status_Chamados
        ON Historico_Chamados.Status_Novo_Id = Status_Chamados.Id
    WHERE Status_Chamados.Nome = 'Resolvido'
    GROUP BY Historico_Chamados.Chamado_Id
) AS Resolucao
    ON Chamados.Id = Resolucao.Chamado_Id;


-- 13. DESEMPENHO POR TÉCNICO (relatórios)
SELECT
    Usuarios.Nome AS Tecnico,
    COUNT(Chamados.Id) AS Atendidos,
    SUM(Status_Chamados.Nome IN ('Resolvido', 'Encerrado')) AS Resolvidos,
    ROUND(SUM(Status_Chamados.Nome IN ('Resolvido', 'Encerrado')) * 100 / COUNT(Chamados.Id)) AS Taxa_Resolucao_Percentual
FROM Chamados
INNER JOIN Usuarios
    ON Chamados.Tecnico_Id = Usuarios.Id
INNER JOIN Status_Chamados
    ON Chamados.Status_Id = Status_Chamados.Id
GROUP BY
    Usuarios.Id,
    Usuarios.Nome
ORDER BY Atendidos DESC;


-- 14. CINCO CHAMADOS ATUALIZADOS MAIS RECENTEMENTE (lista do dashboard)
SELECT
    Chamados.Id,
    Chamados.Titulo,
    Solicitante.Nome AS Solicitante,
    Prioridades.Nome AS Prioridade,
    Status_Chamados.Nome AS Status,
    Chamados.Data_Atualizacao
FROM Chamados
INNER JOIN Usuarios AS Solicitante
    ON Chamados.Solicitante_Id = Solicitante.Id
INNER JOIN Prioridades
    ON Chamados.Prioridade_Id = Prioridades.Id
INNER JOIN Status_Chamados
    ON Chamados.Status_Id = Status_Chamados.Id
ORDER BY Chamados.Data_Atualizacao DESC
LIMIT 5;


-- 15. HISTÓRICO COMPLETO DE UM CHAMADO (troque o número em @chamado)
SET @chamado = 1;

SELECT
    Historico_Chamados.Data_Evento,
    Usuarios.Nome AS Responsavel,
    Status_Anterior.Nome AS Status_Anterior,
    Status_Novo.Nome AS Status_Novo,
    Historico_Chamados.Observacao
FROM Historico_Chamados
INNER JOIN Usuarios
    ON Historico_Chamados.Usuario_Id = Usuarios.Id
LEFT JOIN Status_Chamados AS Status_Anterior
    ON Historico_Chamados.Status_Anterior_Id = Status_Anterior.Id
INNER JOIN Status_Chamados AS Status_Novo
    ON Historico_Chamados.Status_Novo_Id = Status_Novo.Id
WHERE Historico_Chamados.Chamado_Id = @chamado
ORDER BY Historico_Chamados.Data_Evento;


-- 16. EQUIPAMENTOS COM MAIS CHAMADOS
SELECT
    Equipamentos.Patrimonio,
    Equipamentos.Nome AS Equipamento,
    Usuarios.Nome AS Responsavel,
    COUNT(Chamados.Id) AS Quantidade_Chamados
FROM Equipamentos
LEFT JOIN Usuarios
    ON Equipamentos.Usuario_Id = Usuarios.Id
LEFT JOIN Chamados
    ON Equipamentos.Id = Chamados.Equipamento_Id
GROUP BY
    Equipamentos.Id,
    Equipamentos.Patrimonio,
    Equipamentos.Nome,
    Usuarios.Nome
HAVING Quantidade_Chamados > 0
ORDER BY Quantidade_Chamados DESC;
