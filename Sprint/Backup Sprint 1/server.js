const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3000;

// IMPORTANTE: Use o json() ANTES do static()
app.use(express.json());

// Conexão com o banco
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ideahub'
});

connection.connect((err) => {
    if (err) {
        console.error('❌ Erro ao conectar ao banco:', err);
        return;
    }
    console.log('✅ Conectado ao MySQL!');
});

// ========== ROTAS DA API (DEVEM VIR ANTES DO STATIC) ==========

// Rota de teste
app.get('/teste', (req, res) => {
    res.json({ mensagem: 'Servidor funcionando!', status: 'ok' });
});

// CADASTRO
app.post('/cadastrar', (req, res) => {
    const { nome, email, senha, tipo } = req.body;
    
    console.log('📝 Recebendo cadastro:', { nome, email });
    
    if (!nome || !email || !senha) {
        return res.status(400).json({ erro: 'Todos os campos são obrigatórios!' });
    }
    
    connection.query(
        'SELECT id FROM usuarios WHERE email = ?',
        [email],
        (err, results) => {
            if (err) {
                console.error('❌ Erro na query:', err);
                return res.status(500).json({ erro: 'Erro no servidor' });
            }
            
            if (results.length > 0) {
                return res.status(400).json({ erro: 'Email já cadastrado!' });
            }
            
            connection.query(
                'INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)',
                [nome, email, senha, tipo || 'aluno'],
                (err, result) => {
                    if (err) {
                        console.error('❌ Erro ao inserir:', err);
                        return res.status(500).json({ erro: 'Erro ao cadastrar' });
                    }
                    
                    console.log('✅ Usuário cadastrado! ID:', result.insertId);
                    res.json({ 
                        sucesso: true, 
                        mensagem: 'Cadastro realizado com sucesso!',
                        usuario: {
                            id: result.insertId,
                            nome: nome,
                            email: email
                        }
                    });
                }
            );
        }
    );
});

// LOGIN
app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    
    console.log('🔑 Tentando login:', email);
    
    if (!email || !senha) {
        return res.status(400).json({ erro: 'Email e senha são obrigatórios!' });
    }
    
    connection.query(
        'SELECT id, nome, email, tipo FROM usuarios WHERE email = ? AND senha = ?',
        [email, senha],
        (err, results) => {
            if (err) {
                console.error('❌ Erro na query:', err);
                return res.status(500).json({ erro: 'Erro no servidor' });
            }
            
            if (results.length === 0) {
                return res.status(401).json({ erro: 'Email ou senha incorretos!' });
            }
            
            const usuario = results[0];
            console.log('✅ Login realizado:', usuario.nome);
            
            res.json({
                sucesso: true,
                mensagem: 'Login realizado com sucesso!',
                usuario: usuario
            });
        }
    );
});

// LISTAR TODAS IDEIAS
app.get('/ideias', (req, res) => {
    console.log('📋 Listando todas as ideias');
    
    connection.query(
        `SELECT i.*, u.nome as autor_nome 
         FROM ideias i 
         LEFT JOIN usuarios u ON i.id_usuario = u.id 
         ORDER BY i.data_publicacao DESC`,
        (err, results) => {
            if (err) {
                console.error('❌ Erro:', err);
                return res.status(500).json({ erro: 'Erro ao listar ideias' });
            }
            
            console.log(`✅ ${results.length} ideias encontradas`);
            res.json(results);
        }
    );
});

// CADASTRAR IDEIA
app.post('/ideias', (req, res) => {
    const { titulo, descricao, categoria, id_usuario, anonima } = req.body;
    
    console.log('💡 Nova ideia:', titulo, 'Usuário:', id_usuario);
    
    if (!titulo || !descricao || !categoria || !id_usuario) {
        return res.status(400).json({ erro: 'Todos os campos são obrigatórios!' });
    }
    
    connection.query(
        'INSERT INTO ideias (titulo, descricao, categoria, id_usuario, anonima) VALUES (?, ?, ?, ?, ?)',
        [titulo, descricao, categoria, id_usuario, anonima ? 1 : 0],
        (err, result) => {
            if (err) {
                console.error('❌ Erro:', err);
                return res.status(500).json({ erro: 'Erro ao cadastrar ideia' });
            }
            
            console.log('✅ Ideia cadastrada! ID:', result.insertId);
            res.json({ 
                sucesso: true, 
                mensagem: 'Ideia cadastrada com sucesso!',
                id: result.insertId
            });
        }
    );
});

// LISTAR MINHAS IDEIAS
app.get('/minhas-ideias/:usuarioId', (req, res) => {
    const usuarioId = req.params.usuarioId;
    
    console.log('📋 Listando ideias do usuário:', usuarioId);
    
    connection.query(
        'SELECT * FROM ideias WHERE id_usuario = ? ORDER BY data_publicacao DESC',
        [usuarioId],
        (err, results) => {
            if (err) {
                console.error('❌ Erro:', err);
                return res.status(500).json({ erro: 'Erro ao listar ideias' });
            }
            
            console.log(`✅ ${results.length} ideias encontradas`);
            res.json(results);
        }
    );
});

// DELETAR IDEIA
app.delete('/ideias/:id', (req, res) => {
    const ideiaId = req.params.id;
    const { usuarioId } = req.body;
    
    console.log('🗑️ Deletando ideia:', ideiaId, 'Usuário:', usuarioId);
    
    if (!usuarioId) {
        return res.status(400).json({ erro: 'ID do usuário não fornecido!' });
    }
    
    connection.query(
        'SELECT id_usuario FROM ideias WHERE id = ?',
        [ideiaId],
        (err, results) => {
            if (err) {
                console.error('❌ Erro:', err);
                return res.status(500).json({ erro: 'Erro no servidor' });
            }
            
            if (results.length === 0) {
                return res.status(404).json({ erro: 'Ideia não encontrada!' });
            }
            
            if (results[0].id_usuario !== usuarioId) {
                return res.status(403).json({ erro: 'Você não tem permissão!' });
            }
            
            connection.query(
                'DELETE FROM ideias WHERE id = ?',
                [ideiaId],
                (err) => {
                    if (err) {
                        console.error('❌ Erro:', err);
                        return res.status(500).json({ erro: 'Erro ao deletar' });
                    }
                    
                    console.log('✅ Ideia deletada!');
                    res.json({ sucesso: true, mensagem: 'Ideia deletada!' });
                }
            );
        }
    );
});

// ========== SERVIDOR DE ARQUIVOS ESTÁTICOS (DEVE SER O ÚLTIMO) ==========
app.use(express.static('public'));

// Rota padrão para qualquer outra requisição (404)
app.use((req, res) => {
    res.status(404).json({ erro: 'Rota não encontrada' });
});

// ========== INICIAR SERVIDOR ==========
app.listen(port, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${port}`);
    console.log(`📝 Teste a API: http://localhost:${port}/teste`);
    console.log(`🌐 Acesse o site: http://localhost:${port}`);
});