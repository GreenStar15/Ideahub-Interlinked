CREATE DATABASE ideahub;
USE ideahub;

-- Tabela de usuários (dados pessoais)
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    tipo VARCHAR(50) DEFAULT 'aluno', -- aluno, professor, admin
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ativo BOOLEAN DEFAULT TRUE
);

-- Tabela de credenciais/autenticação
CREATE TABLE credenciais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    senha VARCHAR(255) NOT NULL, -- Com hash
    ultimo_login TIMESTAMP NULL,
    tentativas_falhas INT DEFAULT 0,
    bloqueado_ate TIMESTAMP NULL,
    reset_token VARCHAR(255) NULL,
    reset_token_expira TIMESTAMP NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY unique_usuario (id_usuario)
);

-- Tabela de sessões (opcional, para controle avançado)
CREATE TABLE sessoes (
    id VARCHAR(255) PRIMARY KEY,
    id_usuario INT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabela de ideias (existente)
CREATE TABLE ideias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100),
    data_publicacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_usuario INT NOT NULL,
    anonima BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'pendente', -- pendente, aprovada, rejeitada
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
);

-- Criar índices para melhor performance
CREATE INDEX idx_credenciais_id_usuario ON credenciais(id_usuario);
CREATE INDEX idx_sessoes_id_usuario ON sessoes(id_usuario);
CREATE INDEX idx_sessoes_expires_at ON sessoes(expires_at);
CREATE INDEX idx_ideias_id_usuario ON ideias(id_usuario);
CREATE INDEX idx_ideias_data ON ideias(data_publicacao);