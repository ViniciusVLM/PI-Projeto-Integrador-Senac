-- 1. LISTAR USUARIOS COM SEUS PERFIS
SELECT
    Usuarios.Id,
    Usuarios.Nome,
    Usuarios.Email,
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