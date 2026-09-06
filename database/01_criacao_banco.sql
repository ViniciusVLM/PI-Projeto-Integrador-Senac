CREATE TABLE Perfis (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL UNIQUE,
    Descrição VARCHAR(255)
);


CREATE TABLE Usuarios (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL,
    Email VARCHAR(150) NOT NULL UNIQUE,
    Senha VARCHAR(255) NOT NULL,
    Perfil_Id INT NOT NULL,
    Status VARCHAR(20) DEFAULT 'Ativo',

    FOREIGN KEY (Perfil_Id) REFERENCES Perfis(Id)
);


CREATE TABLE Categorias (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Nome VARCHAR(50) NOT NULL UNIQUE,
    Descricao VARCHAR(255),
    Status VARCHAR(20) DEFAULT 'Ativa'
);


CREATE TABLE Prioridades (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Nome VARCHAR(20) NOT NULL UNIQUE
);


CREATE TABLE Status_Chamados (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Nome VARCHAR(50) NOT NULL UNIQUE
);


CREATE TABLE Equipamentos (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Tipo VARCHAR(50) NOT NULL,
    Nome VARCHAR(100) NOT NULL,
    Patrimonio VARCHAR(50) NOT NULL UNIQUE,
    Usuario_Id INT,
    Status VARCHAR(20) DEFAULT 'Ativo',

    FOREIGN KEY (Usuario_Id) REFERENCES Usuarios(Id)
);


CREATE TABLE Chamados (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Titulo VARCHAR(150) NOT NULL,
    Descricao TEXT NOT NULL,
    Solicitante_Id INT NOT NULL,
    Tecnico_Id INT,
    Categoria_Id INT NOT NULL,
    Equipamento_Id INT,
    Prioridade_Id INT NOT NULL,
    Status_Id INT NOT NULL,
    Data_Abertura DATETIME DEFAULT CURRENT_TIMESTAMP,
    Data_Atualizacao DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (Solicitante_Id) REFERENCES Usuarios(Id),
    FOREIGN KEY (Tecnico_Id) REFERENCES Usuarios(Id),
    FOREIGN KEY (Categoria_Id) REFERENCES Categorias(Id),
    FOREIGN KEY (Equipamento_Id) REFERENCES Equipamentos(Id),
    FOREIGN KEY (Prioridade_Id) REFERENCES Prioridades(Id),
    FOREIGN KEY (Status_Id) REFERENCES Status_Chamados(Id)
);


CREATE TABLE Historico_Chamados (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Chamado_Id INT NOT NULL,
    Usuario_Id INT NOT NULL,
    Status_Anterior_Id INT,
    Status_Novo_Id INT NOT NULL,
    Observacao VARCHAR(255),
    Data_Evento DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (Chamado_Id) REFERENCES Chamados(Id),
    FOREIGN KEY (Usuario_Id) REFERENCES Usuarios(Id),
    FOREIGN KEY (Status_Anterior_Id) REFERENCES Status_Chamados(Id),
    FOREIGN KEY (Status_Novo_Id) REFERENCES Status_Chamados(Id)
);


CREATE TABLE Comentarios_Chamados (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Chamado_Id INT NOT NULL,
    Usuario_Id INT NOT NULL,
    Comentario TEXT NOT NULL,
    Data_Criacao DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (Chamado_Id) REFERENCES Chamados(Id),
    FOREIGN KEY (Usuario_Id) REFERENCES Usuarios(Id)
);


CREATE TABLE Anexos (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Chamado_Id INT NOT NULL,
    Usuario_Id INT NOT NULL,
    Nome_Arquivo VARCHAR(255) NOT NULL,
    Caminho_Arquivo VARCHAR(500) NOT NULL,
    Data_Upload DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (Chamado_Id) REFERENCES Chamados(Id),
    FOREIGN KEY (Usuario_Id) REFERENCES Usuarios(Id)
);


CREATE TABLE Perfis (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL UNIQUE,
    Descrição VARCHAR(255)
);


CREATE TABLE Usuarios (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Nome VARCHAR(100) NOT NULL,
    Email VARCHAR(150) NOT NULL UNIQUE,
    Senha VARCHAR(255) NOT NULL,
    Perfil_Id INT NOT NULL,
    Status VARCHAR(20) DEFAULT 'Ativo',

    FOREIGN KEY (Perfil_Id) REFERENCES Perfis(Id)
);