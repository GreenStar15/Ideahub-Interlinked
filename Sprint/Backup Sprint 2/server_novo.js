const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ideahub'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Erro:', err);
        return;
    }
    console.log('✅ Conectado!');
});

// ========== TESTE DIRETO ==========
app.get('/teste-votos', (req, res) => {
    const sql = `
        SELECT i.id, i.titulo, 
               (SELECT COUNT(*) FROM votos v WHERE v.id_ideia = i.id) as votos_count
        FROM ideias i
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(results);
    });
});

// ========== LISTAR IDEIAS ==========
app.get('/ideias', (req, res) => {
    const orderBy = req.query.orderBy || 'votos';
    
    const sql = `
        SELECT i.*, 
               u.nome as autor_nome,
               c.nome as categoria_nome,
               c.icone as categoria_icone,
               (SELECT COUNT(*) FROM votos v WHERE v.id_ideia = i.id) as votos_count
        FROM ideias i
        LEFT JOIN usuarios u ON i.id_usuario = u.id
        LEFT JOIN categorias c ON i.categoria_id = c.id
    ` + (orderBy === 'data' ? 'ORDER BY i.data_publicacao DESC' : 'ORDER BY votos_count DESC, i.data_publicacao DESC');
    
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(results);
    });
});

// ========== BUSCAR IDEIAS ==========
app.get('/ideias/buscar', (req, res) => {
    const { q, categoria_id, autor, orderBy } = req.query;
    
    console.log('🔍 Busca - query:', { q, categoria_id, autor, orderBy });
    
    let sql = `
        SELECT i.*, 
               u.nome as autor_nome,
               c.nome as categoria_nome,
               c.icone as categoria_icone,
               (SELECT COUNT(*) FROM votos v WHERE v.id_ideia = i.id) as votos_count
        FROM ideias i
        LEFT JOIN usuarios u ON i.id_usuario = u.id
        LEFT JOIN categorias c ON i.categoria_id = c.id
        WHERE 1=1
    `;
    let params = [];
    
    // Filtro por texto
    if (q && q.trim()) {
        sql += ` AND (i.titulo LIKE ? OR i.descricao LIKE ?)`;
        const searchTerm = `%${q}%`;
        params.push(searchTerm, searchTerm);
        console.log('🔍 Filtro texto:', q);
    }
    
    // Filtro por categoria - CORRIGIDO
    if (categoria_id && categoria_id !== 'todos' && categoria_id !== 'undefined') {
        sql += ` AND i.categoria_id = ?`;
        params.push(parseInt(categoria_id));
        console.log('📁 Filtro categoria ID:', categoria_id);
    }
    
    // Filtro por autor
    if (autor && autor !== 'todos' && autor !== 'undefined') {
        sql += ` AND u.nome LIKE ?`;
        params.push(`%${autor}%`);
        console.log('👤 Filtro autor:', autor);
    }
    
    // Ordenação
    if (orderBy === 'data') {
        sql += ` ORDER BY i.data_publicacao DESC`;
    } else {
        sql += ` ORDER BY votos_count DESC, i.data_publicacao DESC`;
    }
    
    console.log('📝 SQL:', sql);
    console.log('📦 Params:', params);
    
    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('❌ Erro:', err);
            return res.status(500).json({ erro: err.message });
        }
        console.log(`✅ Busca retornou ${results.length} ideias`);
        res.json(results);
    });
});

// ========== VOTAR ==========
app.post('/ideias/:id/votar', (req, res) => {
    const ideiaId = req.params.id;
    const { usuarioId } = req.body;
    
    db.query('SELECT id FROM votos WHERE id_usuario = ? AND id_ideia = ?', [usuarioId, ideiaId],
        (err, results) => {
            if (results.length > 0) {
                db.query('DELETE FROM votos WHERE id_usuario = ? AND id_ideia = ?', [usuarioId, ideiaId],
                    () => res.json({ sucesso: true, mensagem: 'Voto removido!' }));
            } else {
                db.query('INSERT INTO votos (id_usuario, id_ideia) VALUES (?, ?)', [usuarioId, ideiaId],
                    () => res.json({ sucesso: true, mensagem: 'Voto registrado!' }));
            }
        }
    );
});

// ========== VERIFICAR VOTO ==========
app.get('/ideias/:id/voto-usuario', (req, res) => {
    const { usuarioId } = req.query;
    if (!usuarioId) return res.json({ votou: false });
    db.query('SELECT id FROM votos WHERE id_usuario = ? AND id_ideia = ?', [usuarioId, req.params.id],
        (err, results) => res.json({ votou: results.length > 0 }));
});

// ========== OUTROS ENDPOINTS ==========
app.post('/cadastrar', (req, res) => {
    const { nome, email, senha } = req.body;
    db.query('INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)', [nome, email, senha],
        (err, result) => res.json({ sucesso: true, usuario: { id: result.insertId, nome, email } }));
});

app.post('/login', (req, res) => {
    const { email, senha } = req.body;
    db.query('SELECT id, nome, email FROM usuarios WHERE email = ? AND senha = ?', [email, senha],
        (err, results) => {
            if (results.length === 0) return res.status(401).json({ erro: 'Email ou senha incorretos' });
            res.json({ sucesso: true, usuario: results[0] });
        });
});

app.get('/categorias', (req, res) => {
    db.query('SELECT id, nome, icone FROM categorias ORDER BY ordem', (err, results) => res.json(results));
});

app.post('/ideias', (req, res) => {
    const { titulo, descricao, categoria_id, id_usuario, anonima } = req.body;
    db.query('INSERT INTO ideias (titulo, descricao, categoria_id, id_usuario, anonima) VALUES (?, ?, ?, ?, ?)',
        [titulo, descricao, categoria_id, id_usuario, anonima ? 1 : 0],
        (err, result) => res.json({ sucesso: true, id: result.insertId }));
});

// ========== MINHAS IDEIAS ==========
// ========== MINHAS IDEIAS ==========
app.get('/minhas-ideias/:usuarioId', (req, res) => {
    const usuarioId = req.params.usuarioId;
    
    console.log('📋 Buscando ideias do usuário:', usuarioId);
    
    const sql = `
        SELECT i.*, 
               c.nome as categoria_nome, 
               c.icone as categoria_icone,
               (SELECT COUNT(*) FROM votos v WHERE v.id_ideia = i.id) as votos_count
        FROM ideias i 
        LEFT JOIN categorias c ON i.categoria_id = c.id
        WHERE i.id_usuario = ?
        ORDER BY i.data_publicacao DESC
    `;
    
    db.query(sql, [usuarioId], (err, results) => {
        if (err) {
            console.error('❌ Erro:', err);
            return res.status(500).json({ erro: err.message });
        }
        
        console.log(`✅ ${results.length} ideias encontradas para usuário ${usuarioId}`);
        results.forEach(ideia => {
            console.log(`   - ${ideia.id}: ${ideia.titulo} (${ideia.votos_count} votos)`);
        });
        
        res.json(results);
    });
});

// ========== DELETAR IDEIA ==========
app.delete('/ideias/:id', (req, res) => {
    const ideiaId = req.params.id;
    const { usuarioId } = req.body;
    
    console.log('🗑️ Tentando deletar ideia:', ideiaId, 'Usuário:', usuarioId);
    
    // Primeiro verificar se a ideia pertence ao usuário
    db.query('SELECT id_usuario FROM ideias WHERE id = ?', [ideiaId], (err, results) => {
        if (err) {
            console.error('Erro ao verificar:', err);
            return res.status(500).json({ erro: err.message });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ erro: 'Ideia não encontrada!' });
        }
        
        if (results[0].id_usuario !== usuarioId) {
            return res.status(403).json({ erro: 'Você não tem permissão para deletar esta ideia!' });
        }
        
        // Excluir os votos primeiro (se não tiver CASCADE)
        db.query('DELETE FROM votos WHERE id_ideia = ?', [ideiaId], (err) => {
            if (err) {
                console.error('Erro ao deletar votos:', err);
                return res.status(500).json({ erro: 'Erro ao deletar votos' });
            }
            
            // Depois excluir a ideia
            db.query('DELETE FROM ideias WHERE id = ?', [ideiaId], (err) => {
                if (err) {
                    console.error('Erro ao deletar ideia:', err);
                    return res.status(500).json({ erro: err.message });
                }
                
                console.log('✅ Ideia e seus votos deletados!');
                res.json({ sucesso: true, mensagem: 'Ideia deletada com sucesso!' });
            });
        });
    });
});

app.listen(port, () => {
    console.log(`🚀 Servidor: http://localhost:${port}`);
});