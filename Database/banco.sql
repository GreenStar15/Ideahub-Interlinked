-- ==========================================
-- RECRIAR BANCO DE DADOS IDEAHUB COMPLETO
-- ==========================================

-- Desconectar usuários e dropar banco
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'ideahub_postgres'
  AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS ideahub_postgres;
CREATE DATABASE ideahub_postgres;

-- ==========================================
-- CONECTE-SE MANUALMENTE AO BANCO
-- No pgAdmin: clique com botão direito em "ideahub_postgres" → Connect
-- Depois execute o restante do código
-- ==========================================

-- ==========================================
-- 1. TABELA DE USUÁRIOS
-- ==========================================
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    cargo VARCHAR(50) DEFAULT 'aluno',
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ultimo_acesso TIMESTAMPTZ,
    total_advertencias INTEGER DEFAULT 0
);

-- ==========================================
-- 2. TABELA DE CATEGORIAS
-- ==========================================
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    icone VARCHAR(10),
    ativo BOOLEAN DEFAULT TRUE,
    ordem INTEGER DEFAULT 0
);

INSERT INTO categorias (nome, icone, ordem) VALUES
('Infraestrutura', '🏛️', 1),
('Tecnologia e Inovação', '💻', 2),
('Ensino e Metodologia', '📚', 3),
('Bem-estar e Saúde', '❤️', 4),
('Cultura e Eventos', '🎭', 5),
('Sustentabilidade', '🌱', 6),
('Esportes e Lazer', '⚽', 7),
('Gestão e Administração', '📊', 8),
('Biblioteca e Acervo', '📖', 9),
('Laboratórios e Pesquisa', '🔬', 10),
('Acessibilidade e Inclusão', '♿', 11),
('Alimentação e RU', '🍽️', 12),
('Transporte e Mobilidade', '🚌', 13),
('Segurança', '🛡️', 14),
('Comunicação e Marketing', '📢', 15);

-- ==========================================
-- 3. TABELA DE IDEIAS
-- ==========================================
CREATE TABLE ideias (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_publicacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    anonima BOOLEAN DEFAULT FALSE,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'pendente',
    aprovada_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    data_aprovacao TIMESTAMPTZ,
    visualizacoes INTEGER DEFAULT 0,
    votos_count INTEGER DEFAULT 0
);

-- ==========================================
-- 4. TABELA DE VOTOS
-- ==========================================
CREATE TABLE votos (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    id_ideia INTEGER NOT NULL REFERENCES ideias(id) ON DELETE CASCADE,
    data_voto TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_usuario, id_ideia)
);

-- ==========================================
-- 5. TABELA DE COMENTÁRIOS
-- ==========================================
CREATE TABLE comentarios (
    id SERIAL PRIMARY KEY,
    texto TEXT NOT NULL,
    data_comentario TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    id_ideia INTEGER NOT NULL REFERENCES ideias(id) ON DELETE CASCADE
);

-- ==========================================
-- 6. TABELA DE PROJETOS
-- ==========================================
CREATE TABLE projetos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    responsavel VARCHAR(100),
    data_inicio DATE,
    prioridade VARCHAR(20) DEFAULT 'media',
    status VARCHAR(30) DEFAULT 'planejamento',
    data_criacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_ideia INTEGER REFERENCES ideias(id) ON DELETE SET NULL,
    id_responsavel INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    deletado BOOLEAN DEFAULT FALSE,
    data_delecao TIMESTAMPTZ,
    deletado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL
);

-- ==========================================
-- 7. TABELA DE DOCUMENTAÇÃO
-- ==========================================
CREATE TABLE documentacao_projeto (
    id SERIAL PRIMARY KEY,
    id_projeto INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    versao VARCHAR(20) DEFAULT '1.0',
    arquivo_url TEXT,
    data_criacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    criado_por INTEGER REFERENCES usuarios(id),
    data_atualizacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    atualizado_por INTEGER REFERENCES usuarios(id)
);

-- ==========================================
-- 8. TABELA DE EQUIPAMENTOS DE REDE
-- ==========================================
CREATE TABLE equipamentos_rede (
    id SERIAL PRIMARY KEY,
    id_projeto INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    fabricante VARCHAR(100),
    modelo VARCHAR(100),
    ip_address VARCHAR(15),
    custo DECIMAL(10,2) DEFAULT 0,
    observacoes TEXT,
    data_criacao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 9. TABELA DE REPORTS (DENÚNCIAS)
-- ==========================================
CREATE TABLE reports (
    id SERIAL PRIMARY KEY,
    motivo VARCHAR(100) NOT NULL,
    descricao TEXT,
    data_report TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pendente',
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    id_ideia INTEGER NOT NULL REFERENCES ideias(id) ON DELETE CASCADE,
    resolvido_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    data_resolucao TIMESTAMPTZ,
    justificativa TEXT
);

-- ==========================================
-- 10. TABELA DE NOTIFICAÇÕES
-- ==========================================
CREATE TABLE notificacoes (
    id SERIAL PRIMARY KEY,
    mensagem TEXT NOT NULL,
    lida BOOLEAN DEFAULT FALSE,
    data_envio TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    id_ideia INTEGER REFERENCES ideias(id) ON DELETE SET NULL
);

-- ==========================================
-- 11. TABELA DE IMAGENS DAS IDEIAS
-- ==========================================
CREATE TABLE ideias_imagens (
    id SERIAL PRIMARY KEY,
    id_ideia INTEGER NOT NULL REFERENCES ideias(id) ON DELETE CASCADE,
    imagem_url TEXT NOT NULL,
    ordem INTEGER DEFAULT 0,
    is_capa BOOLEAN DEFAULT FALSE,
    data_upload TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 12. TABELA DE LOGS
-- ==========================================
CREATE TABLE logs_detalhados (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    acao VARCHAR(100) NOT NULL,
    descricao TEXT,
    ip_address VARCHAR(45),
    data_acao TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 13. TRIGGER PARA VOTOS
-- ==========================================
CREATE OR REPLACE FUNCTION atualizar_votos_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE ideias SET votos_count = (
            SELECT COUNT(*) FROM votos WHERE id_ideia = NEW.id_ideia
        ) WHERE id = NEW.id_ideia;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE ideias SET votos_count = (
            SELECT COUNT(*) FROM votos WHERE id_ideia = OLD.id_ideia
        ) WHERE id = OLD.id_ideia;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_votos
AFTER INSERT OR DELETE ON votos
FOR EACH ROW
EXECUTE FUNCTION atualizar_votos_count();

-- ==========================================
-- 14. USUÁRIOS PADRÃO
-- ==========================================
INSERT INTO usuarios (nome, email, senha, cargo, ativo) VALUES 
('Administrador', 'admin@ideahub.com', 'admin123', 'gestor', TRUE),
('Equipe TI', 'ti@ideahub.com', 'ti123', 'ti_staff', TRUE),
('Professor Demo', 'professor@escola.com', 'prof123', 'professor', TRUE),
('Aluno Teste', 'aluno@teste.com', 'aluno123', 'aluno', TRUE);

-- ==========================================
-- 15. IDEIAS DE TESTE
-- ==========================================
INSERT INTO ideias (titulo, descricao, categoria_id, id_usuario, anonima, status, data_publicacao) VALUES
('App de Estudos com IA', 'Desenvolver um aplicativo que utiliza inteligência artificial para personalizar o aprendizado dos alunos.', 2, 1, FALSE, 'aprovada', NOW()),
('Biblioteca 24h', 'Ampliar o horário de funcionamento da biblioteca central para 24 horas durante o período de provas.', 9, 1, FALSE, 'aprovada', NOW()),
('Melhoria do RU', 'Reformular o cardápio do Restaurante Universitário com opções mais saudáveis e diversificadas.', 12, 2, TRUE, 'pendente', NOW()),
('Laboratório Maker', 'Implementar um laboratório maker com impressoras 3D e equipamentos de eletrônica.', 10, 3, FALSE, 'aprovada', NOW());

-- ==========================================
-- 16. PROJETOS DE TESTE
-- ==========================================
INSERT INTO projetos (nome, descricao, responsavel, prioridade, status, id_ideia) VALUES
('Implementação App de Estudos', 'Projeto para desenvolver o aplicativo de estudos com IA', 'João Silva', 'alta', 'em_andamento', 1),
('Expansão Biblioteca', 'Projeto de ampliação do horário da biblioteca', 'Maria Santos', 'media', 'planejamento', 2);

-- ==========================================
-- 17. VERIFICAÇÃO FINAL
-- ==========================================
SELECT '✅ Banco de dados criado com sucesso!' as Status;
SELECT 'Usuários:' as Info, COUNT(*) as Total FROM usuarios;
SELECT 'Categorias:' as Info, COUNT(*) as Total FROM categorias;
SELECT 'Ideias:' as Info, COUNT(*) as Total FROM ideias;
SELECT 'Projetos:' as Info, COUNT(*) as Total FROM projetos;