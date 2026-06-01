-- Limpar tudo
DROP DATABASE IF EXISTS ideahub;
CREATE DATABASE ideahub;
USE ideahub;

-- Tabela usuarios
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) DEFAULT 'aluno',
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela categorias
CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    icone VARCHAR(10),
    ordem INT DEFAULT 0
);

-- Inserir categorias
INSERT INTO categorias (nome, icone, ordem) VALUES
('Infraestrutura', '🏛️', 1),
('Tecnologia', '💻', 2),
('Educação', '📚', 3),
('Saúde', '❤️', 4),
('Cultura', '🎭', 5);

-- Tabela ideias
CREATE TABLE ideias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_publicacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT NOT NULL,
    anonima TINYINT DEFAULT 0,
    categoria_id INT,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    FOREIGN KEY (categoria_id) REFERENCES categorias(id)
);

-- Tabela votos
CREATE TABLE votos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_ideia INT NOT NULL,
    data_voto TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id),
    FOREIGN KEY (id_ideia) REFERENCES ideias(id),
    UNIQUE KEY unique_voto (id_usuario, id_ideia)
);

-- Usuário teste
INSERT INTO usuarios (nome, email, senha) VALUES 
('Usuário Teste', 'teste@teste.com', '123456');

-- Inserir ideias de teste
INSERT INTO ideias (titulo, descricao, categoria_id, id_usuario, anonima, data_publicacao) VALUES
('Ideia Antiga - Janeiro', 'Esta é uma ideia antiga de janeiro. Visualização da pagina da ideia na próxima Sprint!', 1, 1, 0, '2026-01-15 10:00:00'),
('Ideia Antiga - Fevereiro', 'Esta é uma ideia de fevereiro. Visualização da pagina da ideia na próxima Sprint!', 2, 1, 0, '2026-02-20 14:30:00'),
('Ideia Recente - Março', 'Esta é uma ideia recente de março. Visualização da pagina da ideia na próxima Sprint!', 3, 1, 0, '2026-03-25 09:15:00'),
('Ideia Muito Recente - Abril', 'Esta é a ideia mais recente. Visualização da pagina da ideia na próxima Sprint!', 1, 1, 0, NOW());

-- Inserir alguns votos de teste
INSERT INTO votos (id_usuario, id_ideia) VALUES (1, 4);
INSERT INTO votos (id_usuario, id_ideia) VALUES (1, 3);

-- Verificar
SELECT '=== USUÁRIOS ===' as '';
SELECT * FROM usuarios;
SELECT '=== CATEGORIAS ===' as '';
SELECT * FROM categorias;
SELECT '=== IDEIAS COM VOTOS ===' as '';
SELECT i.id, i.titulo, COUNT(v.id) as votos_count 
FROM ideias i 
LEFT JOIN votos v ON i.id = v.id_ideia 
GROUP BY i.id;