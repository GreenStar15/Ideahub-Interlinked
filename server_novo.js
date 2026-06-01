// ==========================================
// 1. CARREGAR VARIÁVEIS DE AMBIENTE
// ==========================================
require('dotenv').config();

console.log('🔧 Verificando variáveis de ambiente:');
console.log('📧 EMAIL_USER:', process.env.EMAIL_USER ? '✅ Carregado' : '❌ NÃO CARREGADO');
console.log('🔐 EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Carregado' : '❌ NÃO CARREGADO');

// ==========================================
// 2. IMPORTAR MÓDULOS
// ==========================================
const express = require('express');
const session = require('express-session');
const { Pool } = require('pg');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const cors = require('cors');

// Permite requisições de qualquer origem (mais simples para teste)
app.use(cors());

// Ou, para mais segurança, permita apenas as origens do seu site:
// app.use(cors({
//     origin: 'https://ideahub-interlinked.onrender.com'
// }));

// ==========================================
// 3. CRIAR APP E CONFIGURAR MIDDLEWARES BÁSICOS
// ==========================================
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

// ==========================================
// 4. CONFIGURAR SESSÃO (IMPORTANTE: DEPOIS DO app)
// ==========================================
app.use(session({
    secret: process.env.SESSION_SECRET || 'ideahub_secret_key_2024',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,  // true apenas se estiver usando HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

console.log('✅ Middleware de sessão configurado!');

// ==========================================
// 5. CONEXÃO COM POSTGRESQL
// ==========================================
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'ideahub_postgres',
    password: '01022006',
    port: 5432,
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Erro ao conectar ao PostgreSQL:', err.message);
        return;
    }
    console.log('✅ Conectado ao PostgreSQL!');
    release();
});

// ==========================================
// 6. CONFIGURAR MULTER PARA UPLOADS
// ==========================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './uploads');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `${uuidv4()}${ext}`;
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de arquivo não suportado'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: fileFilter
});

const uploadMultiple = upload.array('imagens', 10);

const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const documentosDir = './uploads/documentos';
if (!fs.existsSync(documentosDir)) {
    fs.mkdirSync(documentosDir, { recursive: true });
}

// ==========================================
// 7. ROTA DE TESTE
// ==========================================
app.get('/teste', (req, res) => {
    res.json({ mensagem: 'Servidor funcionando!', status: 'ok' });
});

// ==========================================
// ROTA DE DEBUG
// ==========================================
app.get('/debug/advertencias/:usuarioId', async (req, res) => {
    const usuarioId = req.params.usuarioId;
    
    try {
        const result = await pool.query(
            'SELECT id, nome, email, total_advertencias FROM usuarios WHERE id = $1',
            [usuarioId]
        );
        res.json(result.rows[0] || { erro: 'Usuário não encontrado' });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// ========== RESETAR ADVERTÊNCIAS DO USUÁRIO ==========
app.put('/admin/usuarios/:id/resetar-advertencias', async (req, res) => {
    const usuarioId = req.params.id;
    const { adminId } = req.body;
    
    if (!adminId) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }
    
    try {
        // Verificar se o admin tem permissão
        const adminCheck = await pool.query(
            'SELECT cargo FROM usuarios WHERE id = $1',
            [adminId]
        );
        
        if (adminCheck.rows.length === 0 || 
            (adminCheck.rows[0].cargo !== 'gestor' && adminCheck.rows[0].cargo !== 'ti_staff')) {
            return res.status(403).json({ erro: 'Acesso negado' });
        }
        
        // Resetar advertências
        await pool.query('UPDATE usuarios SET total_advertencias = 0 WHERE id = $1', [usuarioId]);
        
        // Registrar no log
        await pool.query(
            `INSERT INTO logs_auditoria (acao, descricao, id_usuario) 
             VALUES ($1, $2, $3)`,
            ['reset_advertencias', `Advertências do usuário ${usuarioId} resetadas`, adminId]
        );
        
        res.json({ sucesso: true, mensagem: 'Advertências resetadas!' });
        
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ==========================================
// MODERAÇÃO DE IDEIAS (ADMIN)
// ==========================================
app.post('/admin/moderar/ideia/:id', async (req, res) => {
    const ideiaId = req.params.id;
    const { adminId, motivo, justificativa, acao } = req.body;
    
    if (!adminId) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }
    
    try {
        // 1. VERIFICAR SE ADMIN TEM PERMISSÃO
        const adminCheck = await pool.query(
            'SELECT cargo FROM usuarios WHERE id = $1 AND ativo = true',
            [adminId]
        );
        
        if (adminCheck.rows.length === 0 || 
            (adminCheck.rows[0].cargo !== 'gestor' && adminCheck.rows[0].cargo !== 'ti_staff')) {
            return res.status(403).json({ erro: 'Acesso negado. Permissão de administrador necessária.' });
        }
        
        // 2. BUSCAR INFORMAÇÕES DA IDEIA (ANTES DE EXCLUIR)
        const ideiaInfo = await pool.query(`
            SELECT i.titulo, i.id_usuario as autor_id, u.nome as autor_nome
            FROM ideias i
            JOIN usuarios u ON i.id_usuario = u.id
            WHERE i.id = $1
        `, [ideiaId]);
        
        if (ideiaInfo.rows.length === 0) {
            return res.status(404).json({ erro: 'Ideia não encontrada' });
        }
        
        const autorId = ideiaInfo.rows[0].autor_id;
        const tituloIdeia = ideiaInfo.rows[0].titulo;
        
        // 3. FORMATAR MOTIVO
        const motivos = {
            'conteudo_improprio': 'Conteúdo Impróprio',
            'discurso_odio': 'Discurso de Ódio',
            'spam': 'Spam',
            'fake_news': 'Fake News',
            'duplicada': 'Ideia Duplicada',
            'fora_tema': 'Fora do Tema'
        };
        const motivoTexto = motivos[motivo] || motivo;
        
        // 4. CRIAR MENSAGEM E INSERIR NOTIFICAÇÃO (ANTES DE EXCLUIR!)
        let mensagem = '';
        
        if (acao === 'excluir') {
            mensagem = `🔴 SUA IDEIA FOI REMOVIDA\n\n📌 Título: "${tituloIdeia.substring(0, 80)}"\n📋 Motivo: ${motivoTexto}\n💬 Justificativa: ${justificativa || 'Não informada pela moderação'}\n\n⚠️ Esta ação foi registrada. Revise as diretrizes da comunidade antes de novas publicações.`;
        } else {
            mensagem = `🟠 ADVERTÊNCIA RECEBIDA\n\n📌 Ideia: "${tituloIdeia.substring(0, 80)}"\n📋 Motivo: ${motivoTexto}\n💬 Justificativa: ${justificativa || 'Não informada pela moderação'}\n\nℹ️ Acumular 3 advertências pode resultar em suspensão da conta.`;
        }
        
        // ✅ INSERIR NOTIFICAÇÃO PRIMEIRO (enquanto a ideia ainda existe)
        await pool.query(
            `INSERT INTO notificacoes (mensagem, id_usuario, id_ideia, categoria, data_envio) 
             VALUES ($1, $2, $3, 'moderacao', NOW())`,
            [mensagem, autorId, ideiaId]
        );
        
        // 5. AGORA SIM, EXCLUIR A IDEIA (se for o caso)
        if (acao === 'excluir') {
    // Excluir a ideia
    await pool.query('DELETE FROM ideias WHERE id = $1', [ideiaId]);
    
    // ✅ INCREMENTAR CONTADOR DE IDEIAS REMOVIDAS PELO ADMIN
    await pool.query(
        'UPDATE usuarios SET ideias_removidas = COALESCE(ideias_removidas, 0) + 1 WHERE id = $1',
        [autorId]
    );
    
}
        
        // 6. INCREMENTAR ADVERTÊNCIAS
        await pool.query(
            'UPDATE usuarios SET total_advertencias = COALESCE(total_advertencias, 0) + 1 WHERE id = $1',
            [autorId]
        );
        
        // 7. REGISTRAR LOG
        await pool.query(
            `INSERT INTO logs_detalhados (id_usuario, acao, descricao, ip_address)
             VALUES ($1, $2, $3, $4)`,
            [adminId, 'moderar', `Moderou ideia ${ideiaId} - Ação: ${acao} - Motivo: ${motivoTexto}`, req.ip || null]
        );
        
        res.json({ 
            sucesso: true, 
            mensagem: acao === 'excluir' ? '✅ Ideia excluída e autor notificado!' : '✅ Autor advertido com sucesso!'
        });
        
    } catch (err) {
        console.error('❌ ERRO NA MODERAÇÃO:', err);
        res.status(500).json({ erro: err.message });
    }
});

app.post('/teste/incrementar-advertencia/:usuarioId', async (req, res) => {
    const usuarioId = req.params.usuarioId;
    
    try {
        const user = await pool.query('SELECT id, nome, total_advertencias FROM usuarios WHERE id = $1', [usuarioId]);
        
        if (user.rows.length === 0) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }
        
        const atual = user.rows[0].total_advertencias || 0;
        const nova = atual + 1;
        
        await pool.query('UPDATE usuarios SET total_advertencias = $1 WHERE id = $2', [nova, usuarioId]);
        
        res.json({ sucesso: true, antes: atual, depois: nova });
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== MIDDLEWARE DE AUTENTICAÇÃO ADMIN ==========
const verificarAdmin = async (req, res, next) => {
    // Garantir que req.body existe (para evitar erro)
    req.body = req.body || {};
    
    let adminId = req.body.adminId || req.query.adminId;
    
    if (!adminId) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }
    
    try {
        const result = await pool.query('SELECT cargo FROM usuarios WHERE id = $1 AND ativo = true', [adminId]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ erro: 'Usuário não encontrado' });
        }
        
        const cargo = result.rows[0].cargo;
        if (cargo !== 'gestor' && cargo !== 'ti_staff') {
            return res.status(403).json({ erro: 'Acesso negado. Permissão de administrador necessária.' });
        }
        
        next();
    } catch (err) {
        console.error('Erro no middleware admin:', err);
        res.status(500).json({ erro: 'Erro ao verificar permissão' });
    }
};

// Rota de teste para verificar permissão (remover depois)
app.post('/debug/verificar-admin', async (req, res) => {
    const { adminId } = req.body;
    
    try {
        const result = await pool.query('SELECT id, nome, cargo FROM usuarios WHERE id = $1', [adminId]);
        res.json({ usuario: result.rows[0] || null });
    } catch (err) {
        res.json({ erro: err.message });
    }
});

// Aprovar ideia
app.post('/admin/ideias/:id/aprovar', async (req, res) => {
    const ideiaId = req.params.id;
    const { adminId } = req.body;
    
    try {
        await pool.query(
            `UPDATE ideias SET status = 'aprovada', aprovada_por = $1, data_aprovacao = NOW() 
             WHERE id = $2`,
            [adminId, ideiaId]
        );
        res.json({ sucesso: true, mensagem: 'Ideia aprovada!' });
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== LISTAR IDEIAS APROVADAS ==========
app.get('/ideias/aprovadas', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT i.id, i.titulo, i.descricao, i.data_publicacao,
                   u.nome as autor_nome,
                   c.nome as categoria_nome,
                   c.icone as categoria_icone,
                   COALESCE(v.votos_count, 0) as votos_count
            FROM ideias i
            LEFT JOIN usuarios u ON i.id_usuario = u.id
            LEFT JOIN categorias c ON i.categoria_id = c.id
            LEFT JOIN (SELECT id_ideia, COUNT(*) as votos_count FROM votos GROUP BY id_ideia) v ON i.id = v.id_ideia
            WHERE i.status = 'aprovada'
            ORDER BY v.votos_count DESC, i.data_publicacao DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Converter ideia em projeto
app.post('/admin/ideias/:id/converter', async (req, res) => {
    const ideiaId = req.params.id;
    const { adminId, nome, descricao, responsavel, data_inicio, prioridade } = req.body;
    
    if (!nome) {
        return res.status(400).json({ erro: 'Nome do projeto é obrigatório' });
    }
    
    try {
        // Buscar a ideia para pegar o autor
        const ideia = await pool.query('SELECT status, id_usuario, titulo FROM ideias WHERE id = $1', [ideiaId]);
        
        if (ideia.rows.length === 0) {
            return res.status(404).json({ erro: 'Ideia não encontrada' });
        }
        
        if (ideia.rows[0].status !== 'aprovada') {
            return res.status(400).json({ erro: 'Ideia precisa estar aprovada' });
        }
        
        const autorId = ideia.rows[0].id_usuario;
        const tituloIdeia = ideia.rows[0].titulo;
        
        // Criar projeto
        const result = await pool.query(
            `INSERT INTO projetos (nome, descricao, responsavel, data_inicio, prioridade, id_ideia, id_responsavel)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [nome, descricao, responsavel, data_inicio, prioridade || 'media', ideiaId, adminId]
        );
        
        // Atualizar status da ideia
        await pool.query('UPDATE ideias SET status = $1 WHERE id = $2', ['convertida', ideiaId]);
        
        // ========== ADICIONAR AQUI - VERIFICAR CONQUISTAS DO AUTOR ==========
        // A ideia do autor foi convertida, verificar conquistas de conversão
        try {
            await registrarPontos(autorId, 'ideia_convertida', ideiaId);
            await verificarConquistas(autorId, 'ideia_convertida');
        } catch (err) {
            console.error('❌ Erro ao verificar conquistas de conversão:', err);
            // Não interrompe o fluxo principal se falhar
        }
        // ====================================================================
        
        // Notificar autor sobre a conversão
        await pool.query(
            `INSERT INTO notificacoes (mensagem, id_usuario, id_ideia) 
             VALUES ($1, $2, $3)`,
            [`🚀 IDEIA CONVERTIDA EM PROJETO!

📌 Ideia: "${tituloIdeia.substring(0, 50)}..."
🏷️ Projeto: "${nome}"
🎉 Parabéns! Sua ideia foi selecionada para se tornar um projeto oficial.

🔗 Acompanhe o progresso na seção de Projetos.`, autorId, ideiaId]
        );
        
        res.json({ sucesso: true, mensagem: 'Projeto criado!', id: result.rows[0].id });
        
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== AUTENTICAÇÃO ==========
app.post('/cadastrar', async (req, res) => {
    const { nome, email, senha, cargo } = req.body;
    
    if (!nome || !email || !senha) {
        return res.status(400).json({ erro: 'Preencha todos os campos!' });
    }
    
    try {
        // Inserir novo usuário
        const result = await pool.query(
            'INSERT INTO usuarios (nome, email, senha, cargo) VALUES ($1, $2, $3, $4) RETURNING id, nome, email, cargo',
            [nome, email, senha, cargo || 'aluno']
        );
        
        const usuarioId = result.rows[0].id;
        
        // ========== INICIALIZAR PONTUAÇÃO ==========
        try {
            await pool.query(
                'INSERT INTO pontuacao_usuario (id_usuario, pontos_totais, nivel) VALUES ($1, 0, 1)',
                [usuarioId]
            );
        } catch (err) {
            console.error('❌ Erro ao inicializar pontuação:', err);
            // Não interrompe o cadastro se falhar, mas registra o erro
        }
        // ==========================================
        
        // ========== INICIALIZAR PREFERÊNCIA DE NOTIFICAÇÕES POR E-MAIL ==========
        try {
            await pool.query(
                `INSERT INTO preferencias_notificacoes (id_usuario, email_ativado) 
                 VALUES ($1, true) 
                 ON CONFLICT (id_usuario) DO NOTHING`,
                [usuarioId]
            );
            console.log(`✅ Preferência de e-mail ativada para usuário ID: ${usuarioId}`);
        } catch (err) {
            console.error('❌ Erro ao inicializar preferência de e-mail:', err);
            // Não interrompe o cadastro se falhar, mas registra o erro
        }
        // ==========================================
        
        res.json({ sucesso: true, mensagem: 'Cadastro realizado!', usuario: result.rows[0] });
        
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ erro: 'Email já cadastrado!' });
        }
        console.error('❌ Erro no cadastro:', err);
        res.status(500).json({ erro: 'Erro ao cadastrar' });
    }
});

app.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    
    try {
        const result = await pool.query(
            'SELECT id, nome, email, cargo, ativo FROM usuarios WHERE email = $1 AND senha = $2',
            [email, senha]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ erro: 'Email ou senha incorretos!' });
        }
        
        if (!result.rows[0].ativo) {
            return res.status(401).json({ erro: 'Usuário desativado. Contate o administrador.' });
        }
        
        // Atualizar último acesso
        await pool.query('UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1', [result.rows[0].id]);
        
        res.json({ sucesso: true, usuario: result.rows[0] });
        
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: 'Erro no servidor' });
    }
});

// ========== CATEGORIAS ==========
app.get('/categorias', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nome, icone FROM categorias WHERE ativo = true ORDER BY ordem, nome'
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: 'Erro ao buscar categorias' });
    }
});

// ========== UPLOAD DE MÚLTIPLAS IMAGENS ==========
app.post('/upload/imagens', (req, res) => {
    
    uploadMultiple(req, res, async (err) => {
        if (err) {
            console.error('❌ Erro no multer:', err);
            return res.status(400).json({ erro: err.message });
        }
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ erro: 'Nenhuma imagem enviada' });
        }
        
        try {
            const imagensUrls = [];
            
            for (const file of req.files) {
                // Otimizar imagem com sharp
                const outputPath = `./uploads/optimized_${file.filename}`;
                
                await sharp(file.path)
                    .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 80 })
                    .toFile(outputPath);
                
                // Substituir pelo arquivo otimizado
                fs.unlinkSync(file.path);
                fs.renameSync(outputPath, file.path);
                
                imagensUrls.push(`/uploads/${file.filename}`);
            }
            
            res.json({ sucesso: true, urls: imagensUrls });
            
        } catch (err) {
            console.error('❌ Erro ao processar imagens:', err);
            res.status(500).json({ erro: 'Erro ao processar imagens: ' + err.message });
        }
    });
});

// ==========================================
// US15 - SISTEMA DE INCENTIVOS
// ==========================================

// ========== FUNÇÃO PARA REGISTRAR PONTOS POR AÇÃO ==========
async function registrarPontos(usuarioId, acao, entidadeId = null) {
    const PONTOS_POR_ACAO = {
        criar_ideia: 10,
        votar: 2,
        comentar: 2,
        ideia_convertida: 50,
        receber_voto: 1
    };
    
    const pontos = PONTOS_POR_ACAO[acao];
    if (!pontos) return;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. BUSCAR PONTOS ATUAIS ANTES DA ATUALIZAÇÃO
        const pontosAtuaisResult = await client.query(
            `SELECT pontos_totais, nivel FROM pontuacao_usuario WHERE id_usuario = $1`,
            [usuarioId]
        );
        
        const pontosAtuais = pontosAtuaisResult.rows[0]?.pontos_totais || 0;
        const nivelAtual = pontosAtuaisResult.rows[0]?.nivel || 1;
        
        // 2. Calcular novos valores
        const novosPontos = pontosAtuais + pontos;
        const novoNivel = Math.floor(novosPontos / 100) + 1;
        
        // 3. Inserir no histórico de pontos
        await client.query(
            `INSERT INTO historico_pontos (id_usuario, acao, pontos_ganhos, entidade_id)
             VALUES ($1, $2, $3, $4)`,
            [usuarioId, acao, pontos, entidadeId]
        );
        
        // 4. Atualizar tabela pontuacao_usuario
        await client.query(
            `INSERT INTO pontuacao_usuario (id_usuario, pontos_totais, nivel)
             VALUES ($1, $2, $3)
             ON CONFLICT (id_usuario) DO UPDATE
             SET pontos_totais = EXCLUDED.pontos_totais,
                 nivel = EXCLUDED.nivel,
                 data_atualizacao = NOW()`,
            [usuarioId, novosPontos, novoNivel]
        );
        
        // 5. Atualizar tabela usuarios (removendo updated_at se não existir)
        await client.query(
            `UPDATE usuarios 
             SET nivel_atual = $1, 
                 pontos_totais = $2
             WHERE id = $3`,
            [novoNivel, novosPontos, usuarioId]
        );
        
        // 6. Verificar se subiu de nível e notificar
        if (novoNivel > nivelAtual) {
            await client.query(
                `INSERT INTO notificacoes (mensagem, id_usuario, categoria, data_envio)
                 VALUES ($1, $2, 'conquista', NOW())`,
                [`🎉 Parabéns! Você subiu para o nível ${novoNivel}! Continue participando.`, usuarioId]
            );
        }
        
        await client.query('COMMIT');
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao registrar pontos:', err);
    } finally {
        client.release();
    }
}

// Adicione esta rota temporária para teste
app.post('/teste/pontos', async (req, res) => {
    const { usuarioId, acao } = req.body;
    
    try {
        await registrarPontos(usuarioId, acao);
        res.json({ sucesso: true, mensagem: `Pontos adicionados para ação: ${acao}` });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// ========== BUSCAR NOVAS NOTIFICAÇÕES (PARA POLLING) ==========
app.get('/notificacoes/novas', async (req, res) => {
    const { usuarioId, ultimoId } = req.query;
    
    if (!usuarioId) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }
    
    try {
        // Converter ultimoId para número (importante!)
        const ultimoIdNumero = ultimoId ? parseInt(ultimoId) : 0;
        
        const query = `
            SELECT n.*, 
                   CASE 
                       WHEN n.categoria = 'moderacao' THEN 'fa-gavel'
                       WHEN n.categoria = 'conquista' THEN 'fa-trophy'
                       WHEN n.categoria = 'comentario' THEN 'fa-comment'
                       WHEN n.categoria = 'voto' THEN 'fa-thumbs-up'
                       WHEN n.categoria = 'report' THEN 'fa-flag'
                       ELSE 'fa-bell'
                   END as icone
            FROM notificacoes n
            WHERE n.id_usuario = $1 
              AND n.id > $2
              AND n.lida = false
            ORDER BY n.id DESC
            LIMIT 20
        `;
        
        const result = await pool.query(query, [usuarioId, ultimoIdNumero]);
        
        res.json({ 
            sucesso: true, 
            notificacoes: result.rows,
            ultimoId: result.rows.length > 0 ? result.rows[0].id : ultimoIdNumero
        });
        
    } catch (err) {
        console.error('❌ Erro ao buscar novas notificações:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== BUSCAR NOTIFICAÇÕES NÃO LIDAS ==========
app.get('/notificacoes/nao-lidas', async (req, res) => {
    const { usuarioId } = req.query;
    
    if (!usuarioId) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }
    
    try {
        const result = await pool.query(`
            SELECT COUNT(*) as total
            FROM notificacoes
            WHERE id_usuario = $1 AND lida = false
        `, [usuarioId]);
        
        res.json({ total: parseInt(result.rows[0].total) });
        
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Função para verificar e conceder conquistas
async function verificarConquistas(usuarioId, acao) {
    
    try {
        // Buscar conquistas do tipo da ação
        const conquistasPending = await pool.query(`
            SELECT c.* 
            FROM conquistas c
            WHERE c.tipo = $1 AND c.ativo = true
        `, [acao]);
        
        for (const conquista of conquistasPending.rows) {
            // Verificar se já tem a conquista
            const temConquista = await pool.query(
                'SELECT id FROM usuario_conquistas WHERE id_usuario = $1 AND id_conquista = $2',
                [usuarioId, conquista.id]
            );
            
            if (temConquista.rows.length > 0) continue;
            
            // Contar quantas vezes o usuário realizou a ação
            let total = 0;
            
            switch(acao) {
                case 'criar_ideia':
                    const resultIdeias = await pool.query(
                        'SELECT COUNT(*) as total FROM ideias WHERE id_usuario = $1',
                        [usuarioId]
                    );
                    total = parseInt(resultIdeias.rows[0].total);
                    break;
                    
                case 'ideia_convertida':
                    const resultConvertidas = await pool.query(`
                        SELECT COUNT(*) as total FROM ideias 
                        WHERE id_usuario = $1 AND status = 'convertida'
                    `, [usuarioId]);
                    total = parseInt(resultConvertidas.rows[0].total);
                    break;
                    
                case 'votar':
                    const resultVotos = await pool.query(
                        'SELECT COUNT(*) as total FROM votos WHERE id_usuario = $1',
                        [usuarioId]
                    );
                    total = parseInt(resultVotos.rows[0].total);
                    break;
                    
                case 'comentar':
                    const resultComentarios = await pool.query(
                        'SELECT COUNT(*) as total FROM comentarios WHERE id_usuario = $1',
                        [usuarioId]
                    );
                    total = parseInt(resultComentarios.rows[0].total);
                    break;
            }
            
            // Se atingiu a condição, conceder conquista
            if (total >= conquista.condicao) {
                await pool.query(
                    `INSERT INTO usuario_conquistas (id_usuario, id_conquista) 
                     VALUES ($1, $2)`,
                    [usuarioId, conquista.id]
                );
                
                // Atualizar pontuação
                await pool.query(
                    `UPDATE pontuacao_usuario 
                     SET pontos_totais = pontos_totais + $1, data_atualizacao = NOW()
                     WHERE id_usuario = $2`,
                    [conquista.pontos, usuarioId]
                );
                
                // Notificar usuário
                await pool.query(
                    `INSERT INTO notificacoes (mensagem, id_usuario, data_envio) 
                     VALUES ($1, $2, NOW())`,
                    [`🏆 NOVA CONQUISTA DESBLOQUEADA!

✨ ${conquista.nome}
📝 ${conquista.descricao || 'Conquista alcançada por sua participação ativa!'}
➕ +${conquista.pontos} pontos adicionados!

🎯 Continue assim para desbloquear ainda mais conquistas!`, usuarioId]
                );
                
            }
        }
        
        /*
        // Atualizar nível do usuário
        const pontuacao = await pool.query(
            'SELECT pontos_totais FROM pontuacao_usuario WHERE id_usuario = $1',
            [usuarioId]
        );
        
        if (pontuacao.rows.length > 0) {
            const pontos = pontuacao.rows[0].pontos_totais;
            const nivel = Math.floor(pontos / 100) + 1;
            
            await pool.query(
                'UPDATE pontuacao_usuario SET nivel = $1 WHERE id_usuario = $2',
                [nivel, usuarioId]
            );
        }
        */
    } catch (err) {
        console.error('Erro ao verificar conquistas:', err);
    }
}

// ========== US22 - DASHBOARD PESSOAL ==========
app.get('/api/dashboard/pessoal', async (req, res) => {
    const { meses = 12, usuarioId } = req.query;
    
    if (!usuarioId) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }
    
    try {
        // 1. Total de ideias por status
        const ideiasStats = await pool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'aprovada' THEN 1 ELSE 0 END) as aprovadas,
                SUM(CASE WHEN status = 'convertida' THEN 1 ELSE 0 END) as convertidas
            FROM ideias WHERE id_usuario = $1
        `, [usuarioId]);
        
        // 2. Total de votos recebidos
        const votosRecebidos = await pool.query(`
            SELECT COUNT(*) as total FROM votos v
            JOIN ideias i ON v.id_ideia = i.id
            WHERE i.id_usuario = $1
        `, [usuarioId]);
        
        // 3. Total de comentários feitos
        const comentariosFeitos = await pool.query(`
            SELECT COUNT(*) as total FROM comentarios WHERE id_usuario = $1
        `, [usuarioId]);
        
        // 4. Pontos do usuário
        const pontos = await pool.query(`
            SELECT pontos_totais FROM pontuacao_usuario WHERE id_usuario = $1
        `, [usuarioId]);
        
        // 5. Evolução mensal de ideias
        const mesesInt = parseInt(meses);
        const evolucao = await pool.query(`
            SELECT 
                TO_CHAR(DATE_TRUNC('month', data_publicacao), 'Mon/YY') as mes,
                COUNT(*) as total
            FROM ideias
            WHERE id_usuario = $1 
              AND data_publicacao >= NOW() - INTERVAL '${mesesInt} months'
            GROUP BY DATE_TRUNC('month', data_publicacao)
            ORDER BY DATE_TRUNC('month', data_publicacao) ASC
        `, [usuarioId]);
        
        // 6. Sugestões personalizadas
        const sugestoes = [];
        
        // Verificar ideias próximas do ranking
        const rankingProximo = await pool.query(`
            SELECT COUNT(*) as acima 
            FROM (SELECT i.id, COUNT(v.id) as votos 
                  FROM ideias i 
                  LEFT JOIN votos v ON i.id = v.id_ideia 
                  GROUP BY i.id 
                  ORDER BY votos DESC LIMIT 10) as top
        `);
        
        const minhasIdeias = await pool.query(`
            SELECT COUNT(*) as total, COALESCE(SUM(votos), 0) as total_votos
            FROM (SELECT i.id, COUNT(v.id) as votos 
                  FROM ideias i 
                  LEFT JOIN votos v ON i.id = v.id_ideia 
                  WHERE i.id_usuario = $1 
                  GROUP BY i.id) as minhas
        `, [usuarioId]);
        
        const totalVotosMinhas = parseInt(minhasIdeias.rows[0].total_votos || 0);
        const votosTop10 = parseInt(rankingProximo.rows[0].acima || 0);
        
        if (totalVotosMinhas > 0 && totalVotosMinhas < votosTop10 + 5) {
            const votosFaltando = (votosTop10 + 5) - totalVotosMinhas;
            sugestoes.push({
                icone: 'fa-chart-line',
                mensagem: `📊 Faltam ${votosFaltando} votos para sua ideia mais votada entrar no ranking da semana! Compartilhe sua ideia com colegas.`
            });
        }
        
        // Verificar nível próximo
        const nivelAtual = parseInt(pontos.rows[0]?.pontos_totais || 0);
        const proximoNivel = Math.floor(nivelAtual / 100) * 100 + 100;
        const pontosFaltando = proximoNivel - nivelAtual;
        
        if (pontosFaltando > 0 && pontosFaltando <= 50) {
            sugestoes.push({
                icone: 'fa-star',
                mensagem: `⭐ Você está a apenas ${pontosFaltando} pontos de subir para o próximo nível! Continue participando.`
            });
        }
        
        // Verificar se tem ideias pendentes
        const ideiasPendentes = await pool.query(`
            SELECT COUNT(*) as total FROM ideias WHERE id_usuario = $1 AND status = 'pendente'
        `, [usuarioId]);
        
        if (parseInt(ideiasPendentes.rows[0].total) > 0) {
            sugestoes.push({
                icone: 'fa-clock',
                mensagem: `⏰ Você tem ${ideiasPendentes.rows[0].total} ideia(s) pendente(s) aguardando aprovação.`
            });
        }
        
        res.json({
            totalIdeias: parseInt(ideiasStats.rows[0].total || 0),
            ideiasAprovadas: parseInt(ideiasStats.rows[0].aprovadas || 0),
            ideiasConvertidas: parseInt(ideiasStats.rows[0].convertidas || 0),
            votosRecebidos: parseInt(votosRecebidos.rows[0].total || 0),
            comentariosFeitos: parseInt(comentariosFeitos.rows[0].total || 0),
            pontosTotais: parseInt(pontos.rows[0]?.pontos_totais || 0),
            evolucao: evolucao.rows,
            sugestoes: sugestoes
        });
        
    } catch (err) {
        console.error('Erro no dashboard pessoal:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== CONQUISTAS DISPONÍVEIS ==========
app.get('/api/conquistas/disponiveis/:usuarioId', async (req, res) => {
    const usuarioId = req.params.usuarioId;
    
    try {
        // Buscar todas as conquistas com status do usuário
        const result = await pool.query(`
            SELECT c.*, 
                   CASE WHEN uc.id IS NOT NULL THEN true ELSE false END as conquistada,
                   uc.data_obtencao
            FROM conquistas c
            LEFT JOIN usuario_conquistas uc ON c.id = uc.id_conquista AND uc.id_usuario = $1
            WHERE c.ativo = true
            ORDER BY c.pontos ASC
        `, [usuarioId]);
        
        res.json(result.rows);
        
    } catch (err) {
        console.error('❌ Erro ao buscar conquistas disponíveis:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Endpoint para obter pontuação do usuário
app.get('/api/pontuacao/:usuarioId', async (req, res) => {
    const usuarioId = req.params.usuarioId;
    
    try {
        const pontuacao = await pool.query(`
            SELECT p.*, u.nome, u.cargo
            FROM pontuacao_usuario p
            JOIN usuarios u ON p.id_usuario = u.id
            WHERE p.id_usuario = $1
        `, [usuarioId]);
        
        const conquistas = await pool.query(`
            SELECT c.*, uc.data_obtencao
            FROM conquistas c
            JOIN usuario_conquistas uc ON c.id = uc.id_conquista
            WHERE uc.id_usuario = $1
            ORDER BY uc.data_obtencao DESC
        `, [usuarioId]);
        
        res.json({
            pontuacao: pontuacao.rows[0] || { pontos_totais: 0, nivel: 1 },
            conquistas: conquistas.rows
        });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Ranking geral de pontuação
app.get('/api/ranking/pontuacao', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.nome, u.cargo, 
                   COALESCE(p.pontos_totais, 0) as pontos,
                   COALESCE(p.nivel, 1) as nivel,
                   (SELECT COUNT(*) FROM usuario_conquistas WHERE id_usuario = u.id) as conquistas
            FROM usuarios u
            LEFT JOIN pontuacao_usuario p ON u.id = p.id_usuario
            WHERE u.ativo = true
            ORDER BY pontos DESC
            LIMIT 20
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// ========== PERFIL DO USUÁRIO COM DADOS DE GAMIFICAÇÃO ==========
app.get('/api/usuario/perfil/:id', async (req, res) => {
    const usuarioId = req.params.id;
    try {
        // ✅ Buscar nível da tabela pontuacao_usuario (fonte da verdade)
        const user = await pool.query(
            `SELECT u.id, u.nome, u.email, u.cargo, u.data_cadastro,
                    COALESCE(p.pontos_totais, 0) as pontos_totais,
                    COALESCE(p.nivel, 1) as nivel
             FROM usuarios u
             LEFT JOIN pontuacao_usuario p ON u.id = p.id_usuario
             WHERE u.id = $1`,
            [usuarioId]
        );
        
        if (user.rows.length === 0) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }

        // Ideias por status
        const ideias = await pool.query(
            `SELECT status, COUNT(*) as total FROM ideias WHERE id_usuario = $1 GROUP BY status`,
            [usuarioId]
        );
        const ideiasPorStatus = { pendente:0, aprovada:0, convertida:0, rejeitada:0 };
        ideias.rows.forEach(row => { ideiasPorStatus[row.status] = parseInt(row.total); });

        // Lista de ideias (com comentários e visualizações)
// Lista de ideias (com comentários e visualizações)
const listaIdeias = await pool.query(`
    SELECT 
        i.id, 
        i.titulo, 
        i.status, 
        i.data_publicacao, 
        i.visualizacoes,
        COALESCE(v.votos_count, 0) as votos,
        COALESCE(c.comentarios_count, 0) as total_comentarios
    FROM ideias i
    LEFT JOIN (
        SELECT id_ideia, COUNT(*) as votos_count 
        FROM votos 
        GROUP BY id_ideia
    ) v ON i.id = v.id_ideia
    LEFT JOIN (
        SELECT id_ideia, COUNT(*) as comentarios_count 
        FROM comentarios 
        GROUP BY id_ideia
    ) c ON i.id = c.id_ideia
    WHERE i.id_usuario = $1
    ORDER BY i.data_publicacao DESC
`, [usuarioId]);

        // Conquistas desbloqueadas
        const conquistas = await pool.query(
            `SELECT c.nome, c.descricao, c.icone, uc.data_obtencao
             FROM usuario_conquistas uc
             JOIN conquistas c ON uc.id_conquista = c.id
             WHERE uc.id_usuario = $1
             ORDER BY uc.data_obtencao DESC`,
            [usuarioId]
        );

        res.json({
            usuario: user.rows[0],
            ideiasPorStatus,
            listaIdeias: listaIdeias.rows,
            conquistas: conquistas.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== US18 - MAPA DE CALOR ==========

// Endpoint para dados do mapa de calor
app.get('/api/mapa/calor', async (req, res) => {
    const { periodo = 'todos', categoria = 'todos' } = req.query;
    
    let dataLimite = null;
    const agora = new Date();
    switch(periodo) {
        case 'semana': dataLimite = new Date(agora.setDate(agora.getDate() - 7)); break;
        case 'mes': dataLimite = new Date(agora.setDate(agora.getDate() - 30)); break;
        case 'trimestre': dataLimite = new Date(agora.setDate(agora.getDate() - 90)); break;
        case 'ano': dataLimite = new Date(agora.setDate(agora.getDate() - 365)); break;
        default: dataLimite = null;
    }
    
    let sql = '';
    let params = [];
    let idx = 1;
    
    // Se a categoria for "todos", retorna todos os locais ativos (inclusive com zero ideias)
    if (categoria === 'todos') {
        sql = `
            SELECT l.id, l.nome, l.latitude, l.longitude, 
                   COUNT(i.id) as total_ideias
            FROM locais l
            LEFT JOIN ideias i ON i.id_local = l.id
            WHERE l.ativo = true
        `;
        if (dataLimite) {
            sql += ` AND (i.data_publicacao >= $${idx} OR i.id IS NULL)`;
            params.push(dataLimite);
            idx++;
        }
        sql += ` GROUP BY l.id, l.nome, l.latitude, l.longitude ORDER BY l.nome`;
    } 
    // Caso contrário, retorna apenas locais que tenham pelo menos uma ideia na categoria e no período
    else {
        sql = `
            SELECT l.id, l.nome, l.latitude, l.longitude, 
                   COUNT(i.id) as total_ideias
            FROM locais l
            INNER JOIN ideias i ON i.id_local = l.id
            WHERE l.ativo = true
              AND i.categoria_id = $${idx}
        `;
        params.push(parseInt(categoria));
        idx++;
        if (dataLimite) {
            sql += ` AND i.data_publicacao >= $${idx}`;
            params.push(dataLimite);
            idx++;
        }
        sql += ` GROUP BY l.id, l.nome, l.latitude, l.longitude ORDER BY l.nome`;
    }
    
    try {
        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro no mapa de calor:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Endpoint para listar ideias de um local específico
app.get('/api/mapa/ideias-por-local', async (req, res) => {
    const { localId, periodo = 'todos', categoria = 'todos' } = req.query;
    
    let dataLimite = null;
    const agora = new Date();
    switch(periodo) {
        case 'semana': dataLimite = new Date(agora.setDate(agora.getDate() - 7)); break;
        case 'mes': dataLimite = new Date(agora.setDate(agora.getDate() - 30)); break;
        case 'trimestre': dataLimite = new Date(agora.setDate(agora.getDate() - 90)); break;
        case 'ano': dataLimite = new Date(agora.setDate(agora.getDate() - 365)); break;
        default: dataLimite = null;
    }
    
    let sql = `
        SELECT i.id, i.titulo, 
               CASE WHEN i.anonima = true THEN 'Anônimo' ELSE u.nome END as autor_nome,
               COALESCE(v.votos, 0) as votos,
               i.status, i.data_publicacao
        FROM ideias i
        JOIN usuarios u ON i.id_usuario = u.id
        LEFT JOIN (SELECT id_ideia, COUNT(*) as votos FROM votos GROUP BY id_ideia) v ON i.id = v.id_ideia
        WHERE i.id_local = $1
    `;
    let params = [localId];
    let idx = 2;
    
    if (dataLimite) {
        sql += ` AND i.data_publicacao >= $${idx}`;
        params.push(dataLimite);
        idx++;
    }
    if (categoria !== 'todos') {
        sql += ` AND i.categoria_id = $${idx}`;
        params.push(parseInt(categoria));
        idx++;
    }
    
    sql += ` ORDER BY i.data_publicacao DESC LIMIT 30`;
    
    try {
        const result = await pool.query(sql, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao listar ideias do local:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Endpoint para listar locais (para admin cadastrar)
app.get('/api/locais', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nome FROM locais WHERE ativo = true ORDER BY nome');
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar locais:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Endpoint para admin cadastrar novo local
app.post('/admin/locais', async (req, res) => {
    const { nome, tipo, latitude, longitude, adminId } = req.body;
    
    if (!adminId) return res.status(401).json({ erro: 'Não autorizado' });
    
    // Verificar permissão
    const admin = await pool.query('SELECT cargo FROM usuarios WHERE id = $1', [adminId]);
    if (!admin.rows.length || (admin.rows[0].cargo !== 'gestor' && admin.rows[0].cargo !== 'ti_staff')) {
        return res.status(403).json({ erro: 'Acesso negado' });
    }
    
    if (!nome || !latitude || !longitude) {
        return res.status(400).json({ erro: 'Nome, latitude e longitude são obrigatórios' });
    }
    
    try {
        await pool.query(
            `INSERT INTO locais (nome, tipo, latitude, longitude) VALUES ($1, $2, $3, $4)`,
            [nome, tipo || 'campus', latitude, longitude]
        );
        res.json({ sucesso: true, mensagem: 'Local cadastrado com sucesso!' });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// ========== US19 - PERÍODOS DE SUBMISSÃO ==========
// Listar períodos
app.get('/api/periodos', async (req, res) => {
    try {
        const result = await pool.query('SELECT DISTINCT * FROM periodos_submissao ORDER BY data_inicio DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Criar período (apenas admin)
app.post('/admin/periodos', async (req, res) => {
    const { nome, data_inicio, data_fim, adminId } = req.body;
    if (!adminId) return res.status(401).json({ erro: 'Não autorizado' });
    const admin = await pool.query('SELECT cargo FROM usuarios WHERE id = $1', [adminId]);
    if (!admin.rows.length || (admin.rows[0].cargo !== 'gestor' && admin.rows[0].cargo !== 'ti_staff')) {
        return res.status(403).json({ erro: 'Acesso negado' });
    }
    try {
        await pool.query(
            'INSERT INTO periodos_submissao (nome, data_inicio, data_fim, criado_por) VALUES ($1, $2, $3, $4)',
            [nome, data_inicio, data_fim, adminId]
        );
        res.json({ sucesso: true });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Editar período
app.put('/admin/periodos/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, data_inicio, data_fim, adminId } = req.body;
    // verificar permissão similar
    try {
        await pool.query(
            'UPDATE periodos_submissao SET nome = $1, data_inicio = $2, data_fim = $3 WHERE id = $4',
            [nome, data_inicio, data_fim, id]
        );
        res.json({ sucesso: true });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Remover período (ou desativar)
app.delete('/admin/periodos/:id', verificarAdmin, async (req, res) => {
    const id = req.params.id;

    try {
        const result = await pool.query('DELETE FROM periodos_submissao WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ erro: 'Período não encontrado' });
        }
        res.json({ sucesso: true });
    } catch (err) {
        console.error('Erro ao excluir período:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Obter resumo do período (ideias mais votadas)
app.get('/api/periodos/:id/resumo', async (req, res) => {
    const { id } = req.params;
    try {
        const periodo = await pool.query('SELECT * FROM periodos_submissao WHERE id = $1', [id]);
        if (!periodo.rows.length) return res.status(404).json({ erro: 'Período não encontrado' });
        const { data_inicio, data_fim, nome } = periodo.rows[0];
        const ideias = await pool.query(`
            SELECT i.id, i.titulo, i.descricao, u.nome as autor_nome, 
                   COALESCE(v.votos, 0) as votos,
                   i.data_publicacao
            FROM ideias i
            LEFT JOIN usuarios u ON i.id_usuario = u.id
            LEFT JOIN (SELECT id_ideia, COUNT(*) as votos FROM votos GROUP BY id_ideia) v ON i.id = v.id_ideia
            WHERE i.data_publicacao BETWEEN $1 AND $2
            ORDER BY votos DESC, i.data_publicacao DESC
            LIMIT 10
        `, [data_inicio, data_fim]);
        res.json({ periodo: nome, ideias: ideias.rows });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// ========== CRIAR IDEIA ==========
app.post('/ideias', async (req, res) => {
    const { titulo, descricao, categoria_id, id_usuario, anonima, imagens_urls, capa_index, id_local } = req.body;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Query corrigida: 6 placeholders ($1 a $6)
        const result = await client.query(
            `INSERT INTO ideias (titulo, descricao, categoria_id, id_usuario, anonima, status, id_local)
             VALUES ($1, $2, $3, $4, $5, 'pendente', $6) RETURNING id`,
            [titulo, descricao, categoria_id, id_usuario, anonima === true, id_local || null]
        );
        
        const ideiaId = result.rows[0].id;
        
        // Inserir imagens (se houver)
        if (imagens_urls && Array.isArray(imagens_urls) && imagens_urls.length > 0) {
            for (let i = 0; i < imagens_urls.length; i++) {
                const isCapa = (capa_index !== undefined && i === capa_index);
                await client.query(
                    `INSERT INTO ideias_imagens (id_ideia, imagem_url, ordem, is_capa) 
                     VALUES ($1, $2, $3, $4)`,
                    [ideiaId, imagens_urls[i], i, isCapa]
                );
            }
        }
        
        await client.query('COMMIT');
        
        // Chamar função de gamificação (pontos por criar ideia)
        try {
            await registrarPontos(id_usuario, 'criar_ideia', ideiaId);
            await verificarConquistas(id_usuario, 'criar_ideia');
        } catch (err) {
            console.error('Erro ao verificar conquistas:', err);
        }
        
        res.json({ sucesso: true, id: ideiaId });
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    } finally {
        client.release();
    }
});

// ========== US20 - TEMPLATES DE IDEIAS ==========
// Listar templates ativos (para usuários)
// ==========================================
// ========== TEMPLATES (PÚBLICOS) ==========
let templateAtualId = null;

app.get('/api/templates', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, titulo, descricao, categoria, campos_json, recomendado 
            FROM templates_ideias 
            WHERE ativo = true 
            ORDER BY recomendado DESC, total_usos DESC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

app.get('/api/templates/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const result = await pool.query(
            'SELECT id, titulo, descricao, categoria, campos_json, recomendado FROM templates_ideias WHERE id = $1 AND ativo = true',
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ erro: 'Template não encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Incrementar uso do template
app.post('/api/templates/:id/usar', async (req, res) => {
    const templateId = req.params.id;
    try {
        await pool.query('UPDATE templates_ideias SET total_usos = total_usos + 1 WHERE id = $1', [templateId]);
        res.json({ sucesso: true });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// ========== TEMPLATES (ADMIN) ==========
app.get('/admin/templates', verificarAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM templates_ideias ORDER BY recomendado DESC, id DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

app.get('/admin/templates/:id', verificarAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        const result = await pool.query('SELECT * FROM templates_ideias WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ erro: 'Template não encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

app.post('/admin/templates', verificarAdmin, async (req, res) => {
    const { titulo, descricao, categoria, campos_json, recomendado, adminId } = req.body;
    if (!titulo || !categoria) return res.status(400).json({ erro: 'Título e categoria são obrigatórios' });
    try {
        const result = await pool.query(
            `INSERT INTO templates_ideias (titulo, descricao, categoria, campos_json, recomendado, criado_por)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [titulo, descricao, categoria, JSON.stringify(campos_json), recomendado || false, adminId]
        );
        res.json({ sucesso: true, id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

app.put('/admin/templates/:id', verificarAdmin, async (req, res) => {
    const id = req.params.id;
    const { titulo, descricao, categoria, campos_json, recomendado } = req.body;
    try {
        await pool.query(
            `UPDATE templates_ideias 
             SET titulo = $1, descricao = $2, categoria = $3, campos_json = $4, recomendado = $5
             WHERE id = $6`,
            [titulo, descricao, categoria, JSON.stringify(campos_json), recomendado || false, id]
        );
        res.json({ sucesso: true });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// DUPLICADA - REMOVA
app.get('/admin/templates', verificarAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM templates_ideias ORDER BY criado_em DESC');
        res.json(result.rows);
    } catch (err) {}
});

app.delete('/admin/templates/:id', verificarAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        // Hard delete (ou soft delete se preferir)
        await pool.query('DELETE FROM templates_ideias WHERE id = $1', [id]);
        // Se quiser soft delete: UPDATE templates_ideias SET ativo = false WHERE id = $1
        res.json({ sucesso: true });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Listar períodos
app.get('/api/periodos', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM periodos_submissao ORDER BY data_inicio DESC'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Buscar um período
app.get('/api/periodos/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const result = await pool.query('SELECT * FROM periodos_submissao WHERE id = $1', [id]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Criar período (admin)
app.post('/admin/periodos', verificarAdmin, async (req, res) => {
    const { nome, data_inicio, data_fim, adminId } = req.body;
    try {
        await pool.query(
            `INSERT INTO periodos_submissao (nome, data_inicio, data_fim, criado_por)
             VALUES ($1, $2, $3, $4)`,
            [nome, data_inicio, data_fim, adminId]
        );
        res.json({ sucesso: true });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Editar período (admin)
app.put('/admin/periodos/:id', verificarAdmin, async (req, res) => {
    const id = req.params.id;
    const { nome, data_inicio, data_fim } = req.body;
    try {
        await pool.query(
            `UPDATE periodos_submissao SET nome = $1, data_inicio = $2, data_fim = $3 WHERE id = $4`,
            [nome, data_inicio, data_fim, id]
        );
        res.json({ sucesso: true });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Excluir período (admin)
app.delete('/admin/periodos/:id', verificarAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        await pool.query('DELETE FROM periodos_submissao WHERE id = $1', [id]);
        res.json({ sucesso: true });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Gerar resumo PDF de um período
app.get('/api/periodos/:id/resumo', async (req, res) => {
    const id = req.params.id;
    try {
        // Buscar período
        const periodo = await pool.query('SELECT * FROM periodos_submissao WHERE id = $1', [id]);
        if (periodo.rows.length === 0) return res.status(404).send('Período não encontrado');
        
        // Buscar ideias mais votadas do período
        const ideias = await pool.query(`
            SELECT i.id, i.titulo, u.nome as autor_nome, COUNT(v.id) as votos
            FROM ideias i
            LEFT JOIN votos v ON i.id = v.id_ideia
            LEFT JOIN usuarios u ON i.id_usuario = u.id
            WHERE i.data_publicacao BETWEEN $1 AND $2
            GROUP BY i.id, u.nome
            ORDER BY votos DESC
            LIMIT 20
        `, [periodo.rows[0].data_inicio, periodo.rows[0].data_fim]);
        
        // Gerar HTML do PDF (usando jsPDF + html2canvas)
        // ... (aqui você pode adaptar seu código de exportação, similar ao exportarDashboardPDF)
        res.json({ ideias: ideias.rows });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Servir arquivos estáticos da pasta uploads
app.use('/uploads', express.static('uploads'));

// ========== BUSCAR IDEIAS ==========
app.get('/ideias/buscar', async (req, res) => {
    const { q, categoria_id, autor, orderBy, local_id } = req.query;
    const isAdmin = req.query.isAdmin === 'true';
    
    try {
        let sql = `
            SELECT 
                i.id,
                i.titulo,
                i.descricao,
                i.data_publicacao,
                i.id_usuario,
                i.anonima,
                i.status,
                i.visualizacoes,
                i.categoria_id,
                u.nome as autor_nome,
                c.nome as categoria_nome,
                c.icone as categoria_icone,
                (SELECT COUNT(*) FROM votos WHERE id_ideia = i.id) as total_votos,
                (SELECT COUNT(*) FROM ideias_imagens WHERE id_ideia = i.id) as total_imagens,
                (SELECT COUNT(*) FROM comentarios WHERE id_ideia = i.id) as total_comentarios,
                (SELECT imagem_url FROM ideias_imagens 
                 WHERE id_ideia = i.id AND is_capa = true 
                 ORDER BY ordem ASC LIMIT 1) as imagem_principal,
                l.nome as local_nome,
                (SELECT COUNT(*) FROM versoes_ideias WHERE id_ideia = i.id) as total_versoes
            FROM ideias i
            LEFT JOIN usuarios u ON i.id_usuario = u.id
            LEFT JOIN categorias c ON i.categoria_id = c.id
            LEFT JOIN locais l ON i.id_local = l.id
            WHERE 1=1
        `;
        
        let params = [];
        let paramCount = 1;
        
        if (q && q.trim()) {
            sql += ` AND (i.titulo ILIKE $${paramCount} OR i.descricao ILIKE $${paramCount})`;
            params.push(`%${q}%`);
            paramCount++;
        }
        
        if (categoria_id && categoria_id !== 'todos') {
            sql += ` AND i.categoria_id = $${paramCount}`;
            params.push(parseInt(categoria_id));
            paramCount++;
        }
        
        if (autor && autor !== 'todos') {
            sql += ` AND u.nome ILIKE $${paramCount}`;
            params.push(`%${autor}%`);
            paramCount++;
        }
        
        if (local_id && local_id !== 'todos') {
            sql += ` AND i.id_local = $${paramCount}`;
            params.push(parseInt(local_id));
            paramCount++;
        }
        
        // APLICAR FILTROS DE STATUS
        if (orderBy === 'aprovadas') {
            sql += ` AND i.status = 'aprovada'`;
            sql += ` ORDER BY i.data_aprovacao DESC, i.data_publicacao DESC`;
        }
        else if (orderBy === 'convertidas') {
            sql += ` AND i.status = 'convertida'`;
            sql += ` ORDER BY i.data_aprovacao DESC, i.data_publicacao DESC`;
        }
        else if (orderBy === 'data') {
            sql += ` ORDER BY i.data_publicacao DESC`;
        }
        else {
            sql += ` ORDER BY total_votos DESC, i.data_publicacao DESC`;
        }
        
        const result = await pool.query(sql, params);
        
        if (!isAdmin) {
            result.rows = result.rows.map(row => {
                if (row.anonima) {
                    row.autor_nome = 'Anônimo';
                }
                return row;
            });
        }
        
        res.json(result.rows);
        
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== LISTAR IDEIAS ==========
app.get('/ideias', async (req, res) => {
    const orderBy = req.query.orderBy || 'votos';
    const isAdmin = req.query.isAdmin === 'true';
    
    try {
        let sql = `
            SELECT 
                i.id,
                i.titulo,
                i.descricao,
                i.data_publicacao,
                i.id_usuario,
                i.anonima,
                i.status,
                i.visualizacoes,
                i.categoria_id,
                u.nome as autor_nome,
                c.nome as categoria_nome,
                c.icone as categoria_icone,
                (SELECT COUNT(*) FROM votos WHERE id_ideia = i.id) as total_votos,
                (SELECT COUNT(*) FROM ideias_imagens WHERE id_ideia = i.id) as total_imagens,
                (SELECT COUNT(*) FROM comentarios WHERE id_ideia = i.id) as total_comentarios,
                (SELECT imagem_url FROM ideias_imagens WHERE id_ideia = i.id AND is_capa = true LIMIT 1) as imagem_principal,
                l.nome as local_nome,
                (SELECT COUNT(*) FROM versoes_ideias WHERE id_ideia = i.id) as total_versoes
            FROM ideias i
            LEFT JOIN usuarios u ON i.id_usuario = u.id
            LEFT JOIN categorias c ON i.categoria_id = c.id
            LEFT JOIN locais l ON i.id_local = l.id
            WHERE 1=1
        `;
        
        // Aplicar ordenação conforme o parâmetro
        if (orderBy === 'aprovadas') {
            sql += ` AND i.status = 'aprovada'`;
            sql += ` ORDER BY i.data_aprovacao DESC, i.data_publicacao DESC`;
        }
        else if (orderBy === 'convertidas') {
            sql += ` AND i.status = 'convertida'`;
            sql += ` ORDER BY i.data_aprovacao DESC, i.data_publicacao DESC`;
        }
        else if (orderBy === 'data') {
            sql += ` ORDER BY i.data_publicacao DESC`;
        }
        else {
            sql += ` ORDER BY total_votos DESC, i.data_publicacao DESC`;
        }
        
        const result = await pool.query(sql);
        
        if (!isAdmin) {
            result.rows = result.rows.map(row => {
                if (row.anonima) {
                    row.autor_nome = 'Anônimo';
                }
                return row;
            });
        }
        
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== BUSCAR IDEIA COM IMAGENS ==========
// ========== BUSCAR IDEIA COM IMAGENS ==========
app.get('/ideias/:id', async (req, res) => {
    const ideiaId = req.params.id;
    const isAdmin = req.query.isAdmin === 'true';
    const usuarioId = req.query.usuarioId; // Passar o ID do usuário logado
    
    try {
        const ideiaResult = await pool.query(`
            SELECT i.*, 
                   CASE WHEN i.anonima = true AND $1 = false THEN 'Anônimo' ELSE u.nome END as autor_nome,
                   u.cargo as autor_cargo,
                   c.nome as categoria_nome,
                   c.icone as categoria_icone,
                   COALESCE(v.votos_count, 0) as votos_count,
                   (SELECT COUNT(*) FROM comentarios WHERE id_ideia = i.id) as total_comentarios,
                   l.nome as local_nome
            FROM ideias i
            LEFT JOIN usuarios u ON i.id_usuario = u.id
            LEFT JOIN categorias c ON i.categoria_id = c.id
            LEFT JOIN locais l ON i.id_local = l.id
            LEFT JOIN (SELECT id_ideia, COUNT(*) as votos_count FROM votos GROUP BY id_ideia) v ON i.id = v.id_ideia
            WHERE i.id = $2
        `, [isAdmin, ideiaId]);
        
        if (ideiaResult.rows.length === 0) {
            return res.status(404).json({ erro: 'Ideia não encontrada' });
        }
        
        // ✅ INCREMENTAR VISUALIZAÇÃO APENAS SE NÃO FOR O AUTOR E APENAS UMA VEZ POR SESSÃO
        // Verificar se já houve visualização nesta sessão
        const sessionKey = `visualizou_${ideiaId}`;
        if (!req.session || !req.session[sessionKey]) {
            // Incrementar visualização
            await pool.query('UPDATE ideias SET visualizacoes = COALESCE(visualizacoes, 0) + 1 WHERE id = $1', [ideiaId]);
            
            // Marcar como visualizado na sessão
            if (req.session) {
                req.session[sessionKey] = true;
            }
        }
        
        const imagensResult = await pool.query(`
            SELECT imagem_url, ordem FROM ideias_imagens 
            WHERE id_ideia = $1 
            ORDER BY ordem ASC
        `, [ideiaId]);
        
        const ideia = ideiaResult.rows[0];
        ideia.imagens = imagensResult.rows;
        ideia.total_imagens = imagensResult.rows.length;
        
        res.json(ideia);
        
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: 'Erro ao buscar ideia' });
    }
});

// ========== DELETAR IDEIA ==========
app.delete('/ideias/:id', async (req, res) => {
    const ideiaId = req.params.id;
    const { usuarioId, isAdmin, isAutor } = req.body;
    
    if (!usuarioId) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }
    
    try {
        // Buscar o autor da ideia
        const ideia = await pool.query('SELECT id_usuario FROM ideias WHERE id = $1', [ideiaId]);
        
        if (ideia.rows.length === 0) {
            return res.status(404).json({ erro: 'Ideia não encontrada' });
        }
        
        const autorId = ideia.rows[0].id_usuario;
        
        // Verificar permissão
        const userCheck = await pool.query('SELECT cargo FROM usuarios WHERE id = $1', [usuarioId]);
        const isUserAdmin = userCheck.rows[0]?.cargo === 'gestor' || userCheck.rows[0]?.cargo === 'ti_staff';
        
        if (!isUserAdmin && usuarioId !== autorId) {
            return res.status(403).json({ erro: 'Você não tem permissão para deletar esta ideia' });
        }
        
        // Deletar a ideia (votos, comentários e imagens serão deletados em cascata)
        await pool.query('DELETE FROM ideias WHERE id = $1', [ideiaId]);
        
        res.json({ sucesso: true, mensagem: 'Ideia deletada!' });
        
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== VOTAR ==========
app.post('/ideias/:id/votar', async (req, res) => {
    const ideiaId = req.params.id;
    const { usuarioId } = req.body;
    
    if (!usuarioId) {
        return res.status(401).json({ erro: 'Login necessário' });
    }
    
    try {
        // Buscar informações da ideia (incluindo o autor)
        const ideiaInfo = await pool.query(
            'SELECT id_usuario FROM ideias WHERE id = $1',
            [ideiaId]
        );
        
        if (ideiaInfo.rows.length === 0) {
            return res.status(404).json({ erro: 'Ideia não encontrada' });
        }
        
        const autorId = ideiaInfo.rows[0].id_usuario;  // ✅ AUTOR ID DEFINIDO AQUI!
        
        // Verificar se o usuário é o autor da ideia
        if (autorId === usuarioId) {
            return res.status(403).json({ erro: 'Você não pode votar na sua própria ideia!' });
        }
        
        // Verificar se já votou
        const checkResult = await pool.query(
            'SELECT id FROM votos WHERE id_usuario = $1 AND id_ideia = $2',
            [usuarioId, ideiaId]
        );
        
        if (checkResult.rows.length > 0) {
            // REMOVER VOTO
            await pool.query('DELETE FROM votos WHERE id_usuario = $1 AND id_ideia = $2', [usuarioId, ideiaId]);
            res.json({ sucesso: true, acao: 'removido', mensagem: 'Voto removido!' });
        } else {
            // ADICIONAR VOTO
            await pool.query('INSERT INTO votos (id_usuario, id_ideia) VALUES ($1, $2)', [usuarioId, ideiaId]);
            
            // Registrar pontos para quem votou
            try {
                await registrarPontos(usuarioId, 'votar', ideiaId);
            } catch (err) {
                console.error('❌ Erro ao registrar pontos do votante:', err);
            }
            
            // Registrar pontos para o autor (receber voto)
            try {
                await registrarPontos(autorId, 'receber_voto', ideiaId);
            } catch (err) {
                console.error('❌ Erro ao registrar pontos do autor:', err);
            }
            
            // Verificar conquistas
            try {
                await verificarConquistas(usuarioId, 'votar');
                await verificarConquistas(autorId, 'receber_voto');
            } catch (err) {
                console.error('❌ Erro ao verificar conquistas:', err);
            }
            
            res.json({ sucesso: true, acao: 'adicionado', mensagem: 'Voto registrado!' });
        }
    } catch (err) {
        console.error('❌ Erro ao votar:', err);
        res.status(500).json({ erro: err.message });
    }
});


app.get('/ideias/:id/voto-usuario', async (req, res) => {
    const { usuarioId } = req.query;
    
    if (!usuarioId) return res.json({ votou: false });
    
    try {
        const result = await pool.query(
            'SELECT id FROM votos WHERE id_usuario = $1 AND id_ideia = $2',
            [usuarioId, req.params.id]
        );
        res.json({ votou: result.rows.length > 0 });
    } catch (err) {
        console.error('Erro:', err);
        res.json({ votou: false });
    }
});

// ========== LISTAR COMENTÁRIOS ==========
app.get('/ideias/:id/comentarios', async (req, res) => {
    const ideiaId = req.params.id;
    
    try {
        const result = await pool.query(`
            SELECT c.*, 
                   u.nome as autor_nome,
                   u.cargo as autor_cargo,
                   u.id as autor_id,
                   COALESCE(p.nivel, 1) as autor_nivel
            FROM comentarios c
            JOIN usuarios u ON c.id_usuario = u.id
            LEFT JOIN pontuacao_usuario p ON u.id = p.id_usuario
            WHERE c.id_ideia = $1
            ORDER BY c.data_comentario ASC
        `, [ideiaId]);
        
        res.json(result.rows);
        
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

app.post('/ideias/:id/comentarios', async (req, res) => {
    const ideiaId = req.params.id;
    const { texto, id_usuario } = req.body;
    
    if (!texto || !texto.trim()) {
        return res.status(400).json({ erro: 'Comentário não pode estar vazio' });
    }
    
    try {
        const result = await pool.query(
            'INSERT INTO comentarios (texto, id_usuario, id_ideia) VALUES ($1, $2, $3) RETURNING id',
            [texto.trim(), id_usuario, ideiaId]
        );
        
        // ========== ADICIONAR AQUI - VERIFICAR CONQUISTAS ==========
        // O usuário comentou, verificar conquistas de comentário
        try {
            await registrarPontos(id_usuario, 'comentar', ideiaId);
            await verificarConquistas(id_usuario, 'comentar');
        } catch (err) {
            console.error('❌ Erro ao verificar conquistas de comentário:', err);
            // Não interrompe o fluxo principal se falhar
        }
        // ============================================================
        
        const ideia = await pool.query('SELECT id_usuario, titulo FROM ideias WHERE id = $1', [ideiaId]);
        if (ideia.rows[0].id_usuario !== id_usuario) {
            await pool.query(
                `INSERT INTO notificacoes (mensagem, id_usuario, id_ideia) 
                 VALUES ('💬 NOVO COMENTÁRIO NA SUA IDEIA!

📌 Ideia: "${tituloIdeia.substring(0, 60)}"
👤 Autor do comentário: ${nomeAutorComentario || 'Um colega'}

🔗 Clique para visualizar e responder ao comentário.', $1, $2)`,
                [ideia.rows[0].id_usuario, ideiaId]
            );
        }
        
        res.json({ sucesso: true, mensagem: 'Comentário adicionado!', id: result.rows[0].id });
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: 'Erro ao adicionar comentário' });
    }
});

// Buscar anexos de um comentário
app.get('/comentarios/:id/anexos', async (req, res) => {
    const comentarioId = req.params.id;
    
    try {
        const result = await pool.query(
            'SELECT * FROM anexos_comentarios WHERE id_comentario = $1 ORDER BY criado_em ASC',
            [comentarioId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// ========== REPORTAR COMENTÁRIO ==========
app.post('/comentarios/:id/reportar', async (req, res) => {
    const comentarioId = req.params.id;
    const { usuarioId, motivo, descricao } = req.body;
    
    if (!usuarioId) {
        return res.status(401).json({ erro: 'Faça login para reportar' });
    }
    
    try {
        // Buscar informações do comentário e da ideia relacionada
        const comentarioInfo = await pool.query(`
            SELECT c.*, i.titulo as ideia_titulo, i.id as ideia_id,
                   u.nome as autor_nome, u.email as autor_email
            FROM comentarios c
            JOIN ideias i ON c.id_ideia = i.id
            JOIN usuarios u ON c.id_usuario = u.id
            WHERE c.id = $1
        `, [comentarioId]);
        
        if (comentarioInfo.rows.length === 0) {
            return res.status(404).json({ erro: 'Comentário não encontrado' });
        }
        
        const comentario = comentarioInfo.rows[0];
        const autorId = comentario.id_usuario;
        const autorNome = comentario.autor_nome;
        const ideiaTitulo = comentario.ideia_titulo;
        const ideiaId = comentario.ideia_id;
        
        // Verificar se está reportando o próprio comentário
        if (autorId === usuarioId) {
            return res.status(403).json({ erro: 'Você não pode reportar seu próprio comentário!' });
        }
        
        // Verificar se já reportou este comentário
        const checkResult = await pool.query(
            'SELECT id FROM reports_comentarios WHERE id_usuario = $1 AND id_comentario = $2',
            [usuarioId, comentarioId]
        );
        
        if (checkResult.rows.length > 0) {
            return res.status(400).json({ erro: 'Você já reportou este comentário' });
        }
        
        // Buscar informações do denunciante
        const denuncianteInfo = await pool.query(
            'SELECT nome FROM usuarios WHERE id = $1',
            [usuarioId]
        );
        const denuncianteNome = denuncianteInfo.rows[0]?.nome || 'Usuário';
        
        // Inserir report
        await pool.query(
            `INSERT INTO reports_comentarios (motivo, descricao, id_usuario, id_comentario, status)
             VALUES ($1, $2, $3, $4, 'pendente')`,
            [motivo, descricao || '', usuarioId, comentarioId]
        );
        
        // Formatar motivo
        const motivoTexto = {
            'conteudo_improprio': 'Conteúdo Impróprio',
            'discurso_odio': 'Discurso de Ódio',
            'spam': 'Spam',
            'ofensivo': 'Linguagem Ofensiva',
            'outro': 'Outro'
        }[motivo] || motivo;
        
        // ========== NOTIFICAÇÃO PARA O AUTOR DO COMENTÁRIO ==========
        const mensagemAutor = mensagem = `⚠️ SEU COMENTÁRIO FOI DENUNCIADO

📌 Ideia: "${ideiaTitulo.substring(0, 60)}"
📝 Seu comentário: "${comentario.texto.substring(0, 100)}${comentario.texto.length > 100 ? '...' : ''}"
👤 Denunciante: ${denuncianteNome}
📋 Motivo: ${motivoTexto}

🕊️ A moderação analisará o caso em até 48h. Recomendamos revisar suas interações na plataforma.`;
        
        await pool.query(
            `INSERT INTO notificacoes (mensagem, id_usuario, id_ideia, categoria, data_envio)
             VALUES ($1, $2, $3, 'report_autor', NOW())`,
            [mensagemAutor, autorId, ideiaId]
        );
        
        // ========== NOTIFICAÇÃO PARA ADMINISTRADORES ==========
        const admins = await pool.query(
            `SELECT id, nome FROM usuarios WHERE cargo IN ('gestor', 'ti_staff') AND ativo = true`
        );
        
        for (const admin of admins.rows) {
            const mensagemAdmin = mensagem = `👮 NOVA DENÚNCIA DE COMENTÁRIO

📌 Ideia: "${ideiaTitulo.substring(0, 50)}"
📝 Comentário: "${comentario.texto.substring(0, 80)}${comentario.texto.length > 80 ? '...' : ''}"
👤 Autor do comentário: ${autorNome}
👮 Denunciante: ${denuncianteNome}
📋 Motivo: ${motivoTexto}

🔗 Acesse o painel de moderação para analisar esta denúncia.`;
            
            await pool.query(
                `INSERT INTO notificacoes (mensagem, id_usuario, id_ideia, categoria, data_envio)
                 VALUES ($1, $2, $3, 'report_admin', NOW())`,
                [mensagemAdmin, admin.id, ideiaId]
            );
        }
        
        res.json({ sucesso: true, mensagem: 'Denúncia enviada com sucesso! A moderação irá analisar.' });
        
    } catch (err) {
        console.error('❌ Erro ao reportar comentário:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== LISTAR REPORTS DE COMENTÁRIOS (ADMIN) ==========
app.get('/admin/reports/comentarios', verificarAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT rc.*, 
                   u.nome as usuario_nome,
                   c.texto as comentario_texto,
                   c.id_usuario as autor_comentario_id,
                   au.nome as autor_comentario_nome,
                   i.titulo as ideia_titulo,
                   i.id as ideia_id
            FROM reports_comentarios rc
            JOIN usuarios u ON rc.id_usuario = u.id
            JOIN comentarios c ON rc.id_comentario = c.id
            JOIN ideias i ON c.id_ideia = i.id
            JOIN usuarios au ON c.id_usuario = au.id
            WHERE rc.status = 'pendente'
            ORDER BY rc.data_report DESC
        `);
        
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao listar reports de comentários:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== RESOLVER REPORT DE COMENTÁRIO (ADMIN) ==========
app.put('/admin/reports/comentarios/:id/resolver', verificarAdmin, async (req, res) => {
    const reportId = req.params.id;
    const { adminId, acao } = req.body;
    
    try {
        // Buscar informações do report
        const reportInfo = await pool.query(`
            SELECT rc.id_comentario, c.id_usuario as autor_id, c.texto as comentario_texto,
                   i.id as ideia_id, i.titulo as ideia_titulo
            FROM reports_comentarios rc
            JOIN comentarios c ON rc.id_comentario = c.id
            JOIN ideias i ON c.id_ideia = i.id
            WHERE rc.id = $1
        `, [reportId]);
        
        if (reportInfo.rows.length === 0) {
            return res.status(404).json({ erro: 'Report não encontrado' });
        }
        
        // Atualizar status do report
        await pool.query(
            `UPDATE reports_comentarios 
             SET status = 'resolvido', resolvido_por = $1, data_resolucao = NOW()
             WHERE id = $2`,
            [adminId, reportId]
        );
        
        // Se a ação for excluir comentário
        if (acao === 'excluir') {
            await pool.query('DELETE FROM comentarios WHERE id = $1', [reportInfo.rows[0].id_comentario]);
            
            // Notificar autor do comentário
            await pool.query(
                `INSERT INTO notificacoes (mensagem, id_usuario, id_ideia, categoria, data_envio)
                 VALUES ('🗑️ SEU COMENTÁRIO FOI REMOVIDO

📌 Ideia: "${ideiaTitulo.substring(0, 60)}"
📋 Motivo: Violação das diretrizes da comunidade

ℹ️ Sua contribuição foi removida por não seguir as regras de conduta. Consulte nossas diretrizes para evitar novas remoções.', $1, $2, 'moderacao', NOW())`,
                [reportInfo.rows[0].autor_id, reportInfo.rows[0].ideia_id]
            );
        } else {
            // Apenas ignorar a denúncia
            await pool.query(
                `INSERT INTO notificacoes (mensagem, id_usuario, id_ideia, categoria, data_envio)
                 VALUES ('✅ DENÚNCIA ANALISADA

📌 Ideia: "${ideiaTitulo.substring(0, 60)}"
📋 Resultado: Nenhuma ação necessária

ℹ️ A denúncia contra seu comentário foi analisada e considerada improcedente. O comentário permanece no ar.', $1, $2, 'moderacao', NOW())`,
                [reportInfo.rows[0].autor_id, reportInfo.rows[0].ideia_id]
            );
        }
        
        res.json({ sucesso: true, mensagem: acao === 'excluir' ? 'Comentário excluído!' : 'Denúncia ignorada' });
        
    } catch (err) {
        console.error('Erro ao resolver report:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== DELETAR COMENTÁRIO ==========
app.delete('/comentarios/:id', async (req, res) => {
    const comentarioId = req.params.id;
    const { usuarioId } = req.body;
    
    if (!usuarioId) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }
    
    try {
        // Buscar o comentário e a ideia relacionada
        const comentarioInfo = await pool.query(`
            SELECT c.id_usuario as autor_comentario, 
                   i.id_usuario as autor_ideia
            FROM comentarios c
            JOIN ideias i ON c.id_ideia = i.id
            WHERE c.id = $1
        `, [comentarioId]);
        
        if (comentarioInfo.rows.length === 0) {
            return res.status(404).json({ erro: 'Comentário não encontrado' });
        }
        
        const autorComentario = comentarioInfo.rows[0].autor_comentario;
        const autorIdeia = comentarioInfo.rows[0].autor_ideia;
        
        // Verificar permissão: admin, autor do comentário ou autor da ideia
        const userCheck = await pool.query(
            'SELECT cargo FROM usuarios WHERE id = $1',
            [usuarioId]
        );
        
        const isAdmin = userCheck.rows[0]?.cargo === 'gestor' || userCheck.rows[0]?.cargo === 'ti_staff';
        const isAutorComentario = usuarioId === autorComentario;
        const isAutorIdeia = usuarioId === autorIdeia;
        
        if (!isAdmin && !isAutorComentario && !isAutorIdeia) {
            return res.status(403).json({ erro: 'Você não tem permissão para excluir este comentário' });
        }
        
        // Deletar o comentário
        await pool.query('DELETE FROM comentarios WHERE id = $1', [comentarioId]);
        
        res.json({ sucesso: true, mensagem: 'Comentário excluído!' });
        
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== MINHAS IDEIAS ==========
app.get('/minhas-ideias/:usuarioId', async (req, res) => {
    const usuarioId = req.params.usuarioId;
    const isAdmin = req.query.isAdmin === 'true';
    try {
        const result = await pool.query(`
            SELECT 
                i.id,
                i.titulo,
                i.descricao,
                i.data_publicacao,
                i.id_usuario,
                i.anonima,
                i.status,
                i.visualizacoes,
                i.categoria_id,
                CASE WHEN i.anonima = true AND $2 = false THEN 'Anônimo' ELSE u.nome END as autor_nome,
                c.nome as categoria_nome, 
                c.icone as categoria_icone,
                COALESCE(v.votos_count, 0) as votos_count,
                COALESCE(img.total_imagens, 0) as total_imagens,
                (SELECT imagem_url FROM ideias_imagens WHERE id_ideia = i.id AND is_capa = true LIMIT 1) as imagem_principal,
                l.nome as local_nome,
                COALESCE(com.total_comentarios, 0) as total_comentarios
            FROM ideias i 
            LEFT JOIN categorias c ON i.categoria_id = c.id
            LEFT JOIN (SELECT id_ideia, COUNT(*) as votos_count FROM votos GROUP BY id_ideia) v ON i.id = v.id_ideia
            LEFT JOIN (SELECT id_ideia, COUNT(*) as total_imagens FROM ideias_imagens GROUP BY id_ideia) img ON i.id = img.id_ideia
            LEFT JOIN usuarios u ON i.id_usuario = u.id
            LEFT JOIN locais l ON i.id_local = l.id
            LEFT JOIN (SELECT id_ideia, COUNT(*) as total_comentarios FROM comentarios GROUP BY id_ideia) com ON i.id = com.id_ideia
            WHERE i.id_usuario = $1
            ORDER BY i.data_publicacao DESC
        `, [usuarioId, isAdmin]);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ==========================================
// US21 - HISTÓRICO DE VERSÕES DAS IDEIAS
// ==========================================

// Editar ideia (com versionamento automático)
app.put('/ideias/:id/editar', async (req, res) => {
    const ideiaId = req.params.id;
    const { titulo, descricao, categoria_id, usuarioId } = req.body;
    
    if (!usuarioId) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }
    
    try {
        // Buscar a ideia original
        const ideiaOriginal = await pool.query(
            `SELECT i.*, u.nome as autor_nome 
             FROM ideias i
             LEFT JOIN usuarios u ON i.id_usuario = u.id
             WHERE i.id = $1`,
            [ideiaId]
        );
        
        if (ideiaOriginal.rows.length === 0) {
            return res.status(404).json({ erro: 'Ideia não encontrada' });
        }
        
        const ideia = ideiaOriginal.rows[0];
        
        // Verificar permissão
        const userCheck = await pool.query('SELECT cargo FROM usuarios WHERE id = $1', [usuarioId]);
        const isAdmin = userCheck.rows[0]?.cargo === 'gestor' || userCheck.rows[0]?.cargo === 'ti_staff';
        const isAutor = ideia.id_usuario === usuarioId;
        
        if (!isAdmin && !isAutor) {
            return res.status(403).json({ erro: 'Você não tem permissão para editar esta ideia' });
        }
        
        // Verificar se a ideia não está convertida
        if (ideia.status === 'convertida') {
            return res.status(400).json({ erro: 'Ideias convertidas em projeto não podem ser editadas' });
        }
        
        // Contar quantas versões já existem
        const versoesCount = await pool.query(
            'SELECT COUNT(*) as total FROM versoes_ideias WHERE id_ideia = $1',
            [ideiaId]
        );
        const novaVersao = parseInt(versoesCount.rows[0].total) + 1;
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            // Salvar versão atual no histórico
            await client.query(
                `INSERT INTO versoes_ideias (id_ideia, titulo, descricao, categoria_id, versao_numero, alterado_por)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [ideiaId, ideia.titulo, ideia.descricao, ideia.categoria_id, novaVersao, usuarioId]
            );
            
            // ATUALIZAR A IDEIA (COM TÍTULO CORRETAMENTE)
            await client.query(
                `UPDATE ideias 
                 SET titulo = $1, descricao = $2, categoria_id = $3, 
                     editada_em = NOW(), editada_por = $4
                 WHERE id = $5`,
                [titulo, descricao, categoria_id, usuarioId, ideiaId]
            );
            
            await client.query('COMMIT');
            
            // Notificar autor (se editado por admin)
            if (!isAutor) {
                await pool.query(
                    `INSERT INTO notificacoes (mensagem, id_usuario, id_ideia, categoria, data_envio)
                     VALUES ($1, $2, $3, 'moderacao', NOW())`,
                    [`✏️ SUA IDEIA FOI EDITADA

📌 Título: "${titulo.substring(0, 50)}..."
👤 Editado por: Administrador

ℹ️ A edição foi feita para adequar sua ideia às diretrizes da plataforma. Verifique as alterações.`, ideia.id_usuario, ideiaId]
                );
            }
            
            res.json({ sucesso: true, mensagem: 'Ideia editada com sucesso!', versao: novaVersao });
            
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('❌ Erro ao editar ideia:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Listar versões de uma ideia
app.get('/ideias/:id/versoes', async (req, res) => {
    const ideiaId = req.params.id;
    
    try {
        const result = await pool.query(`
            SELECT v.*, u.nome as alterado_por_nome, c.nome as categoria_nome
            FROM versoes_ideias v
            LEFT JOIN usuarios u ON v.alterado_por = u.id
            LEFT JOIN categorias c ON v.categoria_id = c.id
            WHERE v.id_ideia = $1
            ORDER BY v.versao_numero DESC
        `, [ideiaId]);
        
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erro ao listar versões:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Buscar uma versão específica
app.get('/versoes/:id', async (req, res) => {
    const versaoId = req.params.id;
    
    try {
        const result = await pool.query(`
            SELECT v.*, u.nome as alterado_por_nome, c.nome as categoria_nome
            FROM versoes_ideias v
            LEFT JOIN usuarios u ON v.alterado_por = u.id
            LEFT JOIN categorias c ON v.categoria_id = c.id
            WHERE v.id = $1
        `, [versaoId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'Versão não encontrada' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('❌ Erro ao buscar versão:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== RANKING DE IDEIAS MAIS VOTADAS ==========
app.get('/admin/ranking/ideias', async (req, res) => {
    const { periodo = 'mes' } = req.query;
    
    try {
        // Determinar intervalo de data
        let dataLimite = null;
        switch(periodo) {
            case 'semana':
                dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() - 7);
                break;
            case 'mes':
                dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() - 30);
                break;
            case 'trimestre':
                dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() - 90);
                break;
            case 'ano':
                dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() - 365);
                break;
            default:
                dataLimite = null;
        }
        
        const condicaoData = dataLimite ? `AND i.data_publicacao >= '${dataLimite.toISOString()}'` : '';
        
        const result = await pool.query(`
            SELECT i.id, i.titulo, u.nome as autor_nome, 
                   COALESCE(v.votos_count, 0) as votos_count,
                   i.status, i.data_publicacao
            FROM ideias i
            LEFT JOIN usuarios u ON i.id_usuario = u.id
            LEFT JOIN (SELECT id_ideia, COUNT(*) as votos_count FROM votos GROUP BY id_ideia) v ON i.id = v.id_ideia
            WHERE 1=1 ${condicaoData}
            ORDER BY votos_count DESC, i.data_publicacao DESC
            LIMIT 10
        `);
        
        res.json(result.rows);
        
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ==========================================
// ROTAS ADMINISTRATIVAS
// ==========================================

// Dashboard
app.post('/admin/dashboard', async (req, res) => {
    const { usuarioId } = req.body;
    
    
    if (!usuarioId) {
        return res.status(401).json({ erro: 'Não autorizado' });
    }
    
    try {
        // Total de ideias
        const totalIdeias = await pool.query('SELECT COUNT(*) as total FROM ideias');
        
        // Total de usuários ativos
        const totalUsuarios = await pool.query('SELECT COUNT(*) as total FROM usuarios WHERE ativo = true');
        
        // Ideias aprovadas
        const ideiasAprovadas = await pool.query('SELECT COUNT(*) as total FROM ideias WHERE status = $1', ['aprovada']);
        
        // Ideias convertidas
        const ideiasConvertidas = await pool.query('SELECT COUNT(*) as total FROM ideias WHERE status = $1', ['convertida']);
        
        // Ideias pendentes
        const ideiasPendentes = await pool.query('SELECT COUNT(*) as total FROM ideias WHERE status = $1', ['pendente']);
        
        // Total de comentários
        const totalComentarios = await pool.query('SELECT COUNT(*) as total FROM comentarios');
        
        // Total de votos
        const totalVotos = await pool.query('SELECT COUNT(*) as total FROM votos');
        
        // Ideias por categoria
        const ideiasPorCategoria = await pool.query(`
            SELECT c.nome, c.icone, COUNT(i.id) as total
            FROM categorias c
            LEFT JOIN ideias i ON i.categoria_id = c.id
            GROUP BY c.id, c.nome, c.icone
            ORDER BY total DESC
        `);
        
        // Ranking das ideias mais votadas
        const rankingIdeias = await pool.query(`
            SELECT i.id, i.titulo, u.nome as autor_nome, 
                   COALESCE(v.votos_count, 0) as votos_count,
                   i.status, i.data_publicacao
            FROM ideias i
            LEFT JOIN usuarios u ON i.id_usuario = u.id
            LEFT JOIN (SELECT id_ideia, COUNT(*) as votos_count FROM votos GROUP BY id_ideia) v ON i.id = v.id_ideia
            ORDER BY votos_count DESC, i.data_publicacao DESC
            LIMIT 10
        `);
        
        // Atividades recentes
        const atividadesRecentes = await pool.query(`
            SELECT 'comentario' as tipo, c.texto as descricao, u.nome, c.data_comentario as data
            FROM comentarios c
            JOIN usuarios u ON c.id_usuario = u.id
            ORDER BY c.data_comentario DESC
            LIMIT 5
        `);
        
        res.json({
            totalIdeias: parseInt(totalIdeias.rows[0].total),
            totalUsuarios: parseInt(totalUsuarios.rows[0].total),
            ideiasAprovadas: parseInt(ideiasAprovadas.rows[0].total),
            ideiasConvertidas: parseInt(ideiasConvertidas.rows[0].total),
            ideiasPendentes: parseInt(ideiasPendentes.rows[0].total),
            totalComentarios: parseInt(totalComentarios.rows[0].total),
            totalVotos: parseInt(totalVotos.rows[0].total),
            ideiasPorCategoria: ideiasPorCategoria.rows,
            rankingIdeias: rankingIdeias.rows,
            atividadesRecentes: atividadesRecentes.rows
        });
        
    } catch (err) {
        console.error('Erro no dashboard:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== DASHBOARD DE INOVAÇÃO COM FILTROS ==========
app.get('/admin/dashboard/inovacao', async (req, res) => {
    const { periodo = 'todos' } = req.query;
    
    try {
        // Determinar intervalo de data baseado no período
        let dataLimite = null;
        
        switch(periodo) {
            case 'semana':
                dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() - 7);
                break;
            case 'mes':
                dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() - 30);
                break;
            case 'trimestre':
                dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() - 90);
                break;
            case 'ano':
                dataLimite = new Date();
                dataLimite.setDate(dataLimite.getDate() - 365);
                break;
            case 'todos':
            default:
                dataLimite = null;
                break;
        }
        
        // Condição de data para as queries
        const condicaoData = dataLimite ? `AND data_publicacao >= '${dataLimite.toISOString()}'` : '';
        
        // 1. Total de Ideias (com filtro de período)
        const totalIdeias = await pool.query(`
            SELECT COUNT(*) as total FROM ideias WHERE 1=1 ${condicaoData}
        `);
        
        // 2. Usuários Ativos (sempre total, não depende de período)
        const totalUsuarios = await pool.query(`
            SELECT COUNT(*) as total FROM usuarios WHERE ativo = true
        `);
        
        // 3. Ideias Aprovadas (com filtro de período)
        const ideiasAprovadas = await pool.query(`
            SELECT COUNT(*) as total FROM ideias WHERE status = 'aprovada' ${condicaoData}
        `);
        
        // 4. Ideias Convertidas (com filtro de período)
        const ideiasConvertidas = await pool.query(`
            SELECT COUNT(*) as total FROM ideias WHERE status = 'convertida' ${condicaoData}
        `);
        
        // 5. Ideias Pendentes (com filtro de período)
        const ideiasPendentes = await pool.query(`
            SELECT COUNT(*) as total FROM ideias WHERE status = 'pendente' ${condicaoData}
        `);
        
        // 6. Taxa de Conversão
        const totalIdeiasNum = parseInt(totalIdeias.rows[0].total);
        const convertidasNum = parseInt(ideiasConvertidas.rows[0].total);
        const taxaConversao = totalIdeiasNum > 0 ? ((convertidasNum / totalIdeiasNum) * 100).toFixed(1) : 0;
        
        // 7. Ideias por Período (detalhado)
        let sqlPeriodo = `
            SELECT DATE(data_publicacao) as data, COUNT(*) as total
            FROM ideias
            WHERE 1=1
        `;
        if (dataLimite) {
            sqlPeriodo += ` AND data_publicacao >= '${dataLimite.toISOString()}'`;
        }
        sqlPeriodo += ` GROUP BY DATE(data_publicacao) ORDER BY data ASC`;
        
        const ideiasPorPeriodo = await pool.query(sqlPeriodo);
        
        // 8. Ideias por Categoria
        const ideiasPorCategoria = await pool.query(`
            SELECT c.nome, c.icone, COUNT(i.id) as total
            FROM categorias c
            LEFT JOIN ideias i ON i.categoria_id = c.id
            GROUP BY c.id, c.nome, c.icone
            ORDER BY total DESC
        `);
        
        // 9. Ideias por Status
        const ideiasPorStatus = await pool.query(`
            SELECT status, COUNT(*) as total
            FROM ideias
            WHERE 1=1 ${condicaoData}
            GROUP BY status
        `);
        
        // 10. Ranking de Usuários (com filtro de período)
        let sqlRanking = `
            SELECT u.id, u.nome, u.cargo, COUNT(i.id) as total_ideias
            FROM usuarios u
            LEFT JOIN ideias i ON u.id = i.id_usuario
            WHERE u.ativo = true
        `;
        if (dataLimite) {
            sqlRanking += ` AND (i.data_publicacao >= '${dataLimite.toISOString()}' OR i.id IS NULL)`;
        }
        sqlRanking += ` GROUP BY u.id, u.nome, u.cargo ORDER BY total_ideias DESC LIMIT 10`;
        
        const rankingUsuarios = await pool.query(sqlRanking);
        
        res.json({
            totalIdeias: parseInt(totalIdeias.rows[0].total),
            totalUsuarios: parseInt(totalUsuarios.rows[0].total),
            ideiasAprovadas: parseInt(ideiasAprovadas.rows[0].total),
            ideiasConvertidas: parseInt(ideiasConvertidas.rows[0].total),
            ideiasPendentes: parseInt(ideiasPendentes.rows[0].total),
            taxaConversao: parseFloat(taxaConversao),
            ideiasPorPeriodo: ideiasPorPeriodo.rows,
            ideiasPorCategoria: ideiasPorCategoria.rows,
            ideiasPorStatus: ideiasPorStatus.rows,
            rankingUsuarios: rankingUsuarios.rows
        });
        
    } catch (err) {
        console.error('❌ Erro no dashboard:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Listar usuários
app.get('/admin/usuarios', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.id, 
                u.nome, 
                u.email, 
                u.cargo, 
                u.ativo, 
                u.data_cadastro, 
                u.ultimo_acesso,
                COALESCE(u.total_advertencias, 0) as total_advertencias,
                COALESCE(u.ideias_removidas, 0) as ideias_removidas
            FROM usuarios u
            ORDER BY u.ideias_removidas DESC, u.total_advertencias DESC, u.data_cadastro DESC
        `);
        
        res.json(result.rows);
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Alterar cargo do usuário
app.put('/admin/usuarios/:id/cargo', async (req, res) => {
    const usuarioId = req.params.id;
    const { cargo, adminId } = req.body;
    
    const cargosPermitidos = ['aluno', 'professor', 'ti_staff', 'gestor'];
    if (!cargosPermitidos.includes(cargo)) {
        return res.status(400).json({ erro: 'Cargo inválido' });
    }
    
    try {
        await pool.query('UPDATE usuarios SET cargo = $1 WHERE id = $2', [cargo, usuarioId]);
        res.json({ sucesso: true, mensagem: 'Permissão atualizada!' });
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Ativar/desativar usuário
app.put('/admin/usuarios/:id/ativar', async (req, res) => {
    const usuarioId = req.params.id;
    const { ativo, adminId } = req.body;
    
    try {
        await pool.query('UPDATE usuarios SET ativo = $1 WHERE id = $2', [ativo, usuarioId]);
        res.json({ sucesso: true, mensagem: `Usuário ${ativo ? 'ativado' : 'desativado'}!` });
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== NOTIFICAÇÕES ==========
app.get('/notificacoes/:usuarioId', async (req, res) => {
    const usuarioId = req.params.usuarioId;
    
    try {
        const result = await pool.query(
            `SELECT n.*, 
                    CASE 
                        WHEN n.categoria = 'moderacao' THEN 'fa-gavel'
                        WHEN n.categoria = 'conquista' THEN 'fa-trophy'
                        WHEN n.categoria = 'comentario' THEN 'fa-comment'
                        WHEN n.categoria = 'voto' THEN 'fa-thumbs-up'
                        WHEN n.categoria = 'report' THEN 'fa-flag'
                        ELSE 'fa-bell'
                    END as icone
             FROM notificacoes n
             WHERE n.id_usuario = $1
             ORDER BY n.data_envio DESC
             LIMIT 50`,
            [usuarioId]
        );
        
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Marcar notificação como lida
app.put('/notificacoes/:id/marcar-lida', async (req, res) => {
    const notifId = req.params.id;
    
    try {
        await pool.query('UPDATE notificacoes SET lida = true WHERE id = $1', [notifId]);
        res.json({ sucesso: true });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Excluir notificação
app.delete('/notificacoes/:id', async (req, res) => {
    const notifId = req.params.id;
    const { usuarioId } = req.body;
    
    try {
        await pool.query('DELETE FROM notificacoes WHERE id = $1 AND id_usuario = $2', [notifId, usuarioId]);
        res.json({ sucesso: true });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// LIMPAR TODAS NOTIFICAÇÕES
app.delete('/notificacoes/limpar/todas', async (req, res) => {
    const { usuarioId } = req.body;
    
    if (!usuarioId) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }
    
    try {
        const result = await pool.query(
            'DELETE FROM notificacoes WHERE id_usuario = $1',
            [usuarioId]
        );
        
        res.json({ sucesso: true, mensagem: 'Todas as notificações foram limpas!' });
    } catch (err) {
        console.error('❌ Erro ao limpar notificações:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Marcar todas como lidas
app.put('/notificacoes/marcar-todas-lidas', async (req, res) => {
    const { usuarioId } = req.body;
    
    try {
        await pool.query('UPDATE notificacoes SET lida = true WHERE id_usuario = $1', [usuarioId]);
        res.json({ sucesso: true });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// ROTA DE TESTE PARA CATEGORIA
app.get('/teste-categoria/:id', async (req, res) => {
    const categoriaId = req.params.id;
    
    try {
        // Teste simples
        const result = await pool.query('SELECT * FROM categorias WHERE id = $1', [categoriaId]);
        
        // Buscar ideias
        const ideias = await pool.query('SELECT * FROM ideias WHERE categoria_id = $1', [categoriaId]);
        
        res.json({
            categoria: result.rows[0],
            totalIdeias: ideias.rows.length,
            ideias: ideias.rows
        });
    } catch (err) {
        console.error('Erro no teste:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Função para formatar o motivo (remover underline e capitalizar)
function formatarMotivo(motivo) {
    const motivos = {
        'conteudo_improprio': 'Conteúdo Impróprio',
        'discurso_odio': 'Discurso de Ódio',
        'spam': 'Spam',
        'fake_news': 'Fake News',
        'duplicada': 'Ideia Duplicada',
        'fora_tema': 'Fora do Tema',
        'outro': 'Outro'
    };
    return motivos[motivo] || motivo.replace(/_/g, ' ');
}

// ========== REPORTAR IDEIA (USUÁRIO COMUM) ==========
app.post('/ideias/:id/reportar', async (req, res) => {
    const ideiaId = req.params.id;
    const { usuarioId, motivo, descricao } = req.body;
    
    if (!usuarioId) {
        return res.status(401).json({ erro: 'Faça login para reportar' });
    }
    
    try {
        // Buscar informações da ideia e do autor
        const ideiaInfo = await pool.query(`
            SELECT i.titulo, i.id_usuario as autor_id, u.nome as autor_nome, u.email as autor_email
            FROM ideias i
            JOIN usuarios u ON i.id_usuario = u.id
            WHERE i.id = $1
        `, [ideiaId]);
        
        if (ideiaInfo.rows.length === 0) {
            return res.status(404).json({ erro: 'Ideia não encontrada' });
        }
        
        const autorId = ideiaInfo.rows[0].autor_id;
        const autorNome = ideiaInfo.rows[0].autor_nome;
        const tituloIdeia = ideiaInfo.rows[0].titulo;
        
        // Buscar informações do denunciante
        const denuncianteInfo = await pool.query(
            'SELECT nome, email FROM usuarios WHERE id = $1',
            [usuarioId]
        );
        
        const denuncianteNome = denuncianteInfo.rows[0]?.nome || 'Usuário';
        
        // Verificar se o usuário está reportando sua própria ideia
        if (autorId === usuarioId) {
            return res.status(403).json({ erro: 'Você não pode reportar sua própria ideia!' });
        }
        
        // Verificar se já reportou
        const checkResult = await pool.query(
            'SELECT id FROM reports WHERE id_usuario = $1 AND id_ideia = $2',
            [usuarioId, ideiaId]
        );
        
        if (checkResult.rows.length > 0) {
            return res.status(400).json({ erro: 'Você já reportou esta ideia' });
        }
        
        // Inserir report
        await pool.query(
            `INSERT INTO reports (motivo, descricao, id_usuario, id_ideia, status) 
             VALUES ($1, $2, $3, $4, 'pendente')`,
            [motivo, descricao || '', usuarioId, ideiaId]
        );
        
        // Formatar motivo para exibição
        const motivoTexto = {
            'conteudo_improprio': 'Conteúdo Impróprio',
            'discurso_odio': 'Discurso de Ódio',
            'spam': 'Spam',
            'fake_news': 'Fake News',
            'outro': 'Outro'
        }[motivo] || motivo;
        
        // ========== NOTIFICAÇÃO PARA O AUTOR DA IDEIA ==========
        const mensagemAutor = mensagem = `📢 SUA IDEIA FOI DENUNCIADA

📌 Título: "${tituloIdeia.substring(0, 80)}"
👤 Denunciante: ${denuncianteNome}
📋 Motivo: ${motivoTexto}
${descricao ? `💬 Detalhes: ${descricao.substring(0, 100)}` : ''}

🕊️ A equipe de moderação analisará sua ideia nos próximos dias. Não se preocupe, você pode acompanhar o status.`;
        
        await pool.query(
            `INSERT INTO notificacoes (mensagem, id_usuario, id_ideia, categoria, data_envio) 
             VALUES ($1, $2, $3, 'report_autor', NOW())`,
            [mensagemAutor, autorId, ideiaId]
        );
        
        // ========== NOTIFICAÇÃO PARA ADMINISTRADORES ==========
        // Buscar administradores
        const admins = await pool.query(
            `SELECT id, nome FROM usuarios WHERE cargo IN ('gestor', 'ti_staff') AND ativo = true`
        );
        
        for (const admin of admins.rows) {
            const mensagemAdmin = `👮 NOVA DENÚNCIA DE IDEIA

📌 Título: "${tituloIdeia.substring(0, 60)}"
👤 Autor: ${autorNome}
👮 Denunciante: ${denuncianteNome}
📋 Motivo: ${motivoTexto}
${descricao ? `💬 Detalhes: ${descricao.substring(0, 100)}` : ''}

🔗 Acesse o painel de moderação para analisar esta denúncia com urgência.`;
            
            await pool.query(
                `INSERT INTO notificacoes (mensagem, id_usuario, id_ideia, categoria, data_envio) 
                 VALUES ($1, $2, $3, 'report_admin', NOW())`,
                [mensagemAdmin, admin.id, ideiaId]
            );
        }
        
        res.json({ 
            sucesso: true, 
            mensagem: 'Report enviado com sucesso! O autor será notificado e os administradores irão analisar.' 
        });
        
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== LISTAR REPORTS (ADMIN) ==========
app.get('/admin/reports', async (req, res) => {
    
    try {
        const result = await pool.query(`
            SELECT r.*, 
                   u.nome as usuario_nome,
                   i.titulo as ideia_titulo,
                   i.id as id_ideia,
                   i.id_usuario as autor_ideia_id,
                   au.nome as autor_ideia_nome
            FROM reports r
            JOIN usuarios u ON r.id_usuario = u.id
            JOIN ideias i ON r.id_ideia = i.id
            JOIN usuarios au ON i.id_usuario = au.id
            WHERE r.status = 'pendente'
            ORDER BY r.data_report DESC
        `);

        res.json(result.rows);
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== RESOLVER REPORT (ADMIN) ==========
app.put('/admin/reports/:id/resolver', async (req, res) => {
    const reportId = req.params.id;
    const { adminId, acao } = req.body;
    
    try {
        // Buscar informações do report
        const reportInfo = await pool.query(`
            SELECT r.id_ideia, i.id_usuario as autor_id, i.titulo
            FROM reports r
            JOIN ideias i ON r.id_ideia = i.id
            WHERE r.id = $1
        `, [reportId]);
        
        // Atualizar status do report
        await pool.query(
            `UPDATE reports SET status = 'resolvido', resolvido_por = $1, data_resolucao = NOW() 
             WHERE id = $2`,
            [adminId, reportId]
        );
        
        // Se a ação for excluir ideia
        if (acao === 'excluir') {
            await pool.query('DELETE FROM ideias WHERE id = $1', [reportInfo.rows[0].id_ideia]);
            
            // Notificar autor da ideia
            await pool.query(
                `INSERT INTO notificacoes (mensagem, id_usuario) 
                 VALUES ('🔴 SUA IDEIA FOI REMOVIDA POR DENÚNCIAS

📌 Título: "${tituloIdeia.substring(0, 80)}"
📋 Motivo: Múltiplas denúncias da comunidade

⚠️ Após análise da moderação, sua ideia foi removida por violar as diretrizes da plataforma.', $1)`,
                [reportInfo.rows[0].autor_id]
            );
        }
        
        res.json({ sucesso: true, mensagem: 'Report resolvido!' });
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: 'Erro ao resolver report' });
    }
});

function getMotivoTexto(motivo) {
    const motivos = {
        'conteudo_improprio': 'Conteúdo impróprio',
        'discurso_odio': 'Discurso de ódio',
        'spam': 'Spam ou publicidade',
        'fake_news': 'Informação falsa',
        'duplicada': 'Ideia duplicada',
        'fora_tema': 'Fora do tema da plataforma'
    };
    return motivos[motivo] || motivo;
}

// ========== PROJETOS ==========
// Listar projetos ativos
app.get('/projetos', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, 
                   i.titulo as ideia_titulo, 
                   i.id as id_ideia,
                   u.nome as autor_nome
            FROM projetos p
            LEFT JOIN ideias i ON p.id_ideia = i.id
            LEFT JOIN usuarios u ON p.id_responsavel = u.id
            WHERE p.deletado = false OR p.deletado IS NULL
            ORDER BY p.data_criacao DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== LISTAR PROJETOS NA LIXEIRA ==========
app.get('/projetos/lixeira', async (req, res) => {
    
    try {
        const result = await pool.query(`
            SELECT p.*, i.titulo as ideia_titulo, u.nome as autor_nome
            FROM projetos p
            LEFT JOIN ideias i ON p.id_ideia = i.id
            LEFT JOIN usuarios u ON p.id_responsavel = u.id
            WHERE p.deletado = true
            ORDER BY p.data_delecao DESC
        `);
           
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Mover projeto para lixeira
app.delete('/projetos/:id', async (req, res) => {
    const projetoId = req.params.id;
    const { usuarioId } = req.body;
    
    if (!usuarioId) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }
    
    try {
        // Verificar se o projeto existe
        const projeto = await pool.query('SELECT * FROM projetos WHERE id = $1', [projetoId]);
        
        if (projeto.rows.length === 0) {
            return res.status(404).json({ erro: 'Projeto não encontrado' });
        }
        
        // Garantir que as colunas existem
        await pool.query(`
            ALTER TABLE projetos ADD COLUMN IF NOT EXISTS deletado BOOLEAN DEFAULT FALSE;
            ALTER TABLE projetos ADD COLUMN IF NOT EXISTS data_delecao TIMESTAMPTZ;
            ALTER TABLE projetos ADD COLUMN IF NOT EXISTS deletado_por INTEGER;
        `);
        
        // Mover para lixeira
        await pool.query(
            `UPDATE projetos 
             SET deletado = true, 
                 data_delecao = NOW(),
                 deletado_por = $1
             WHERE id = $2`,
            [usuarioId, projetoId]
        );

        res.json({ sucesso: true, mensagem: 'Projeto movido para a lixeira!' });
        
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Restaurar projeto
app.post('/projetos/:id/restaurar', async (req, res) => {
    const projetoId = req.params.id;
    
    try {
        await pool.query(
            `UPDATE projetos 
             SET deletado = false, 
                 data_delecao = NULL 
             WHERE id = $1`,
            [projetoId]
        );
        res.json({ sucesso: true, mensagem: 'Projeto restaurado!' });
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Limpar lixeira
app.delete('/projetos/lixeira/limpar', async (req, res) => {
    try {
        await pool.query('DELETE FROM projetos WHERE deletado = true');
        res.json({ sucesso: true, mensagem: 'Lixeira limpa permanentemente!' });
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== US23 - NOTIFICAÇÕES POR E-MAIL ==========

// Buscar preferência de notificações do usuário
app.get('/api/preferencias/notificacoes', async (req, res) => {
    const { usuarioId } = req.query;
    
    if (!usuarioId) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }
    
    try {
        const result = await pool.query(
            `SELECT email_ativado FROM preferencias_notificacoes 
             WHERE id_usuario = $1`,
            [usuarioId]
        );
        
        if (result.rows.length === 0) {
            await pool.query(
                `INSERT INTO preferencias_notificacoes (id_usuario, email_ativado) 
                 VALUES ($1, true)`,
                [usuarioId]
            );
            res.json({ email_ativado: true });
        } else {
            res.json({ email_ativado: result.rows[0].email_ativado });
        }
    } catch (err) {
        console.error('Erro ao buscar preferências:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Atualizar preferência de notificações
app.put('/api/preferencias/notificacoes', async (req, res) => {
    const { usuarioId, email_ativado } = req.body;
    
    if (!usuarioId) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }
    
    try {
        await pool.query(
            `INSERT INTO preferencias_notificacoes (id_usuario, email_ativado, updated_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (id_usuario) DO UPDATE 
             SET email_ativado = EXCLUDED.email_ativado, updated_at = NOW()`,
            [usuarioId, email_ativado]
        );
        
        res.json({ sucesso: true, mensagem: 'Preferência atualizada!' });
    } catch (err) {
        console.error('Erro ao atualizar preferência:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== US24 - ANEXOS EM COMENTÁRIOS ==========

// Configuração do multer para anexos de comentários
const storageAnexos = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads/comentarios';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'comment-' + uniqueSuffix + ext);
    }
});

const fileFilterAnexos = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de arquivo não suportado. Use imagens ou PDF.'), false);
    }
};

const uploadAnexo = multer({
    storage: storageAnexos,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: fileFilterAnexos
});

// Upload de anexo para comentário
app.post('/comentarios/:id/anexo', uploadAnexo.single('anexo'), async (req, res) => {
    const comentarioId = req.params.id;
    const { usuarioId } = req.body;
    
    if (!req.file) {
        return res.status(400).json({ erro: 'Nenhum arquivo enviado' });
    }
    
    if (!usuarioId) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }
    
    try {
        // Verificar se o comentário existe e se o usuário é o autor
        const comentario = await pool.query(
            'SELECT id_usuario FROM comentarios WHERE id = $1',
            [comentarioId]
        );
        
        if (comentario.rows.length === 0) {
            return res.status(404).json({ erro: 'Comentário não encontrado' });
        }
        
        // Verificar permissão (autor ou admin)
        const userCheck = await pool.query('SELECT cargo FROM usuarios WHERE id = $1', [usuarioId]);
        const isAdmin = userCheck.rows[0]?.cargo === 'gestor' || userCheck.rows[0]?.cargo === 'ti_staff';
        const isAutor = comentario.rows[0].id_usuario === usuarioId;
        
        if (!isAdmin && !isAutor) {
            return res.status(403).json({ erro: 'Você não tem permissão para adicionar anexos a este comentário' });
        }
        
        // Salvar anexo
        const result = await pool.query(
            `INSERT INTO anexos_comentarios (id_comentario, nome_original, nome_arquivo, tipo_arquivo, tamanho, caminho)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [comentarioId, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, `/uploads/comentarios/${req.file.filename}`]
        );
        
        res.json({ 
            sucesso: true, 
            anexo: {
                id: result.rows[0].id,
                nome_original: req.file.originalname,
                caminho: `/uploads/comentarios/${req.file.filename}`,
                tipo_arquivo: req.file.mimetype
            }
        });
        
    } catch (err) {
        console.error('❌ Erro no upload do anexo:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Remover anexo
app.delete('/anexos/:id', async (req, res) => {
    const anexoId = req.params.id;
    const { usuarioId } = req.body;
    
    try {
        // Buscar anexo e comentário relacionado
        const anexo = await pool.query(`
            SELECT a.*, c.id_usuario as autor_comentario
            FROM anexos_comentarios a
            JOIN comentarios c ON a.id_comentario = c.id
            WHERE a.id = $1
        `, [anexoId]);
        
        if (anexo.rows.length === 0) {
            return res.status(404).json({ erro: 'Anexo não encontrado' });
        }
        
        // Verificar permissão
        const userCheck = await pool.query('SELECT cargo FROM usuarios WHERE id = $1', [usuarioId]);
        const isAdmin = userCheck.rows[0]?.cargo === 'gestor' || userCheck.rows[0]?.cargo === 'ti_staff';
        const isAutor = anexo.rows[0].autor_comentario === usuarioId;
        
        if (!isAdmin && !isAutor) {
            return res.status(403).json({ erro: 'Permissão negada' });
        }
        
        // Remover arquivo físico
        const filePath = '.' + anexo.rows[0].caminho;
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        // Remover registro do banco
        await pool.query('DELETE FROM anexos_comentarios WHERE id = $1', [anexoId]);
        
        res.json({ sucesso: true });
    } catch (err) {
        console.error('Erro ao remover anexo:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Servir arquivos estáticos da pasta comentarios
app.use('/uploads/comentarios', express.static('uploads/comentarios'));

// ==========================================
// US11 - DOCUMENTAÇÃO DE PROJETOS
// ==========================================

// Listar documentações de um projeto
app.get('/projetos/:id/documentacao', async (req, res) => {
    const projetoId = req.params.id;
    
    try {
        const result = await pool.query(`
            SELECT d.*, u.nome as autor_nome
            FROM documentacao_projeto d
            LEFT JOIN usuarios u ON d.criado_por = u.id
            WHERE d.id_projeto = $1
            ORDER BY d.data_criacao DESC
        `, [projetoId]);
        
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Buscar documento por ID
app.get('/documentacao/:id', async (req, res) => {
    const docId = req.params.id;

    
    try {
        const result = await pool.query(`
            SELECT d.*, u.nome as autor_nome
            FROM documentacao_projeto d
            LEFT JOIN usuarios u ON d.criado_por = u.id
            WHERE d.id = $1
        `, [docId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'Documento não encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Criar documentação
app.post('/projetos/:id/documentacao', async (req, res) => {
    const projetoId = req.params.id;
    const { titulo, descricao, versao, arquivo_url, usuarioId } = req.body;
    
    if (!titulo) {
        return res.status(400).json({ erro: 'Título é obrigatório' });
    }
    
    if (!usuarioId) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }
    
    try {
        const result = await pool.query(`
            INSERT INTO documentacao_projeto (id_projeto, titulo, descricao, versao, arquivo_url, criado_por)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
        `, [projetoId, titulo, descricao, versao || '1.0', arquivo_url || null, usuarioId]);
        
        res.json({ sucesso: true, id: result.rows[0].id });
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Atualizar documentação
app.put('/documentacao/:id', async (req, res) => {
    const docId = req.params.id;
    const { titulo, descricao, versao, arquivo_url, usuarioId } = req.body;
    
    if (!usuarioId) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }
    
    try {
        await pool.query(`
            UPDATE documentacao_projeto 
            SET titulo = $1, descricao = $2, versao = $3, arquivo_url = $4, 
                atualizado_por = $5, data_atualizacao = NOW()
            WHERE id = $6
        `, [titulo, descricao, versao, arquivo_url || null, usuarioId, docId]);

        res.json({ sucesso: true });
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Deletar documentação
app.delete('/documentacao/:id', async (req, res) => {
    const docId = req.params.id;
    
    try {
        await pool.query('DELETE FROM documentacao_projeto WHERE id = $1', [docId]);
        res.json({ sucesso: true });
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== BUSCAR PROJETO POR ID ==========
app.get('/projetos/:id', async (req, res) => {
    const projetoId = req.params.id;
    
    try {
        const result = await pool.query(`
            SELECT p.*, i.titulo as ideia_titulo, u.nome as autor_nome
            FROM projetos p
            LEFT JOIN ideias i ON p.id_ideia = i.id
            LEFT JOIN usuarios u ON p.id_responsavel = u.id
            WHERE p.id = $1
        `, [projetoId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'Projeto não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ==========================================
// US12 - PLANEJAMENTO DE REDE
// ==========================================

// Listar equipamentos de um projeto
app.get('/projetos/:id/equipamentos', async (req, res) => {
    const projetoId = req.params.id;
    
    try {
        const result = await pool.query(`
            SELECT * FROM equipamentos_rede 
            WHERE id_projeto = $1 
            ORDER BY ordem, id
        `, [projetoId]);

        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Criar equipamento
app.post('/projetos/:id/equipamentos', async (req, res) => {
    const projetoId = req.params.id;
    const { nome, tipo, fabricante, modelo, ip_address, mascara, gateway, custo, observacoes } = req.body;
    
    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });
    if (!tipo) return res.status(400).json({ erro: 'Tipo é obrigatório' });
    
    // Converter custo para número
    const custoNumerico = parseFloat(custo) || 0;
    
    try {
        // Verificar IP duplicado
        if (ip_address) {
            const ipExists = await pool.query(
                'SELECT id FROM equipamentos_rede WHERE id_projeto = $1 AND ip_address = $2',
                [projetoId, ip_address]
            );
            if (ipExists.rows.length > 0) {
                return res.status(400).json({ erro: 'IP já está em uso neste projeto' });
            }
        }
        
        const result = await pool.query(`
            INSERT INTO equipamentos_rede (id_projeto, nome, tipo, fabricante, modelo, ip_address, mascara, gateway, custo, observacoes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
        `, [projetoId, nome, tipo, fabricante, modelo, ip_address, mascara, gateway, custoNumerico, observacoes]);
        
        res.json({ sucesso: true, id: result.rows[0].id });
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Atualizar equipamento
app.put('/equipamentos/:id', async (req, res) => {
    const equipId = req.params.id;
    const { nome, tipo, fabricante, modelo, ip_address, mascara, gateway, custo, observacoes, ordem } = req.body;
    
    try {
        await pool.query(`
            UPDATE equipamentos_rede 
            SET nome = $1, tipo = $2, fabricante = $3, modelo = $4, 
                ip_address = $5, mascara = $6, gateway = $7, custo = $8, 
                observacoes = $9, ordem = $10
            WHERE id = $11
        `, [nome, tipo, fabricante, modelo, ip_address, mascara, gateway, custo, observacoes, ordem, equipId]);
        
        res.json({ sucesso: true });
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Deletar equipamento
app.delete('/equipamentos/:id', async (req, res) => {
    const equipId = req.params.id;
    
    try {
        await pool.query('DELETE FROM equipamentos_rede WHERE id = $1', [equipId]);
        res.json({ sucesso: true });
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== BUSCAR EQUIPAMENTO POR ID ==========
app.get('/equipamentos/:id', async (req, res) => {
    const equipId = req.params.id;
    
    try {
        const result = await pool.query(
            'SELECT * FROM equipamentos_rede WHERE id = $1',
            [equipId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ erro: 'Equipamento não encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});
// ==========================================
// US13 - GERENCIAR USUÁRIOS (LOGS E MÉTRICAS)
// ==========================================

// Registrar log (função auxiliar)
async function registrarLog(usuarioId, acao, descricao, ip = null, userAgent = null, dadosAntes = null, dadosDepois = null) {
    try {
        await pool.query(`
            INSERT INTO logs_detalhados (id_usuario, acao, descricao, ip_address, user_agent, dados_antes, dados_depois)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [usuarioId, acao, descricao, ip, userAgent, dadosAntes, dadosDepois]);
    } catch (err) {
        console.error('Erro ao registrar log:', err);
    }
}

// ========== DASHBOARD DE INOVAÇÃO ==========

// Métricas principais
app.get('/dashboard/metricas', async (req, res) => {
    const { periodo = 'mes' } = req.query;
    
    try {
        // Totalizadores
        const [totalIdeias] = await pool.query('SELECT COUNT(*) as total FROM ideias');
        const [totalUsuarios] = await pool.query('SELECT COUNT(*) as total FROM usuarios WHERE ativo = true');
        const [ideiasAprovadas] = await pool.query('SELECT COUNT(*) as total FROM ideias WHERE status = $1', ['aprovada']);
        const [ideiasConvertidas] = await pool.query('SELECT COUNT(*) as total FROM ideias WHERE status = $1', ['convertida']);
        const [taxaConversao] = await pool.query(`
            SELECT ROUND(
                (SELECT COUNT(*) FROM ideias WHERE status = 'convertida')::DECIMAL / 
                NULLIF((SELECT COUNT(*) FROM ideias), 0) * 100, 2
            ) as taxa
        `);
        
        // Ideias por período
        let intervalo = '';
        if (periodo === 'semana') intervalo = "INTERVAL '7 days'";
        else if (periodo === 'trimestre') intervalo = "INTERVAL '90 days'";
        else if (periodo === 'ano') intervalo = "INTERVAL '365 days'";
        else intervalo = "INTERVAL '30 days'";
        
        const ideiasPorPeriodo = await pool.query(`
            SELECT DATE(data_publicacao) as data, COUNT(*) as total
            FROM ideias
            WHERE data_publicacao >= NOW() - ${intervalo}
            GROUP BY DATE(data_publicacao)
            ORDER BY data ASC
        `);
        
        // Ideias por categoria
        const ideiasPorCategoria = await pool.query(`
            SELECT c.nome, c.icone, COUNT(i.id) as total
            FROM categorias c
            LEFT JOIN ideias i ON i.categoria_id = c.id
            GROUP BY c.id, c.nome, c.icone
            ORDER BY total DESC
        `);
        
        // Ideias por status
        const ideiasPorStatus = await pool.query(`
            SELECT status, COUNT(*) as total
            FROM ideias
            GROUP BY status
        `);
        
        // Ranking de usuários
        const rankingUsuarios = await pool.query(`
            SELECT u.id, u.nome, u.cargo, COUNT(i.id) as total_ideias
            FROM usuarios u
            LEFT JOIN ideias i ON u.id = i.id_usuario
            WHERE u.ativo = true
            GROUP BY u.id, u.nome, u.cargo
            ORDER BY total_ideias DESC
            LIMIT 10
        `);
        
        res.json({
            totalIdeias: parseInt(totalIdeias.rows[0].total),
            totalUsuarios: parseInt(totalUsuarios.rows[0].total),
            ideiasAprovadas: parseInt(ideiasAprovadas.rows[0].total),
            ideiasConvertidas: parseInt(ideiasConvertidas.rows[0].total),
            taxaConversao: parseFloat(taxaConversao.rows[0].taxa) || 0,
            ideiasPorPeriodo: ideiasPorPeriodo.rows,
            ideiasPorCategoria: ideiasPorCategoria.rows,
            ideiasPorStatus: ideiasPorStatus.rows,
            rankingUsuarios: rankingUsuarios.rows
        });
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Exportar relatório em PDF
app.get('/dashboard/exportar-pdf', async (req, res) => {
    // Implementação com PDFKit
});

// Teste de configuração do Nodemailer (opcional)
async function testarNodemailer() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️ Nodemailer não configurado: variáveis de ambiente faltando');
        return;
    }
    
    try {
        const testTransporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        
        await testTransporter.verify();
    } catch (err) {
        console.error('❌ Nodemailer com erro:', err.message);
    }
}

// Chamar o teste (apenas para verificar)
testarNodemailer();

// Função para enviar resumo diário
async function enviarResumoDiario(usuarioId) {
    try {
        const pref = await pool.query(
            'SELECT email_ativado FROM preferencias_notificacoes WHERE id_usuario = $1',
            [usuarioId]
        );
        
        if (pref.rows.length === 0 || !pref.rows[0].email_ativado) return false;
        
        const user = await pool.query(
            'SELECT nome, email FROM usuarios WHERE id = $1 AND ativo = true',
            [usuarioId]
        );
        
        if (user.rows.length === 0) return false;
        
        const notificacoes = await pool.query(`
            SELECT n.*, i.titulo as ideia_titulo, i.id as ideia_id
            FROM notificacoes n
            LEFT JOIN ideias i ON n.id_ideia = i.id
            WHERE n.id_usuario = $1 AND n.lida = false 
              AND n.data_envio > NOW() - INTERVAL '1 day'
            ORDER BY n.data_envio DESC
        `, [usuarioId]);
        
        if (notificacoes.rows.length === 0) return false;
        
        let notificacoesHtml = '';
        for (const notif of notificacoes.rows) {
            const icone = notif.categoria === 'voto' ? '👍' :
                         notif.categoria === 'comentario' ? '💬' :
                         notif.categoria === 'incentivo_concedido' ? '🎁' :
                         notif.categoria === 'moderacao' ? '🛡️' : '📢';
            
            notificacoesHtml += `
                <div style="padding: 12px; margin-bottom: 10px; background: #f8fafc; border-left: 4px solid #667eea; border-radius: 8px;">
                    <div style="font-size: 20px; margin-bottom: 5px;">${icone}</div>
                    <p>${notif.mensagem}</p>
                    ${notif.ideia_id ? `<a href="http://localhost:3000/pages/ideia.html?id=${notif.ideia_id}">🔗 Ver ideia</a>` : ''}
                    <small>${new Date(notif.data_envio).toLocaleString('pt-BR')}</small>
                </div>
            `;
        }
        
        const html = `
            <h2>💡 IdeaHub - Resumo Diário</h2>
            <p>Olá, <strong>${user.rows[0].nome}</strong>!</p>
            <p>Você tem <strong>${notificacoes.rows.length}</strong> notificação(ões):</p>
            ${notificacoesHtml}
            <hr>
            <a href="http://localhost:3000">Acessar IdeaHub</a>
        `;
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        
        await transporter.sendMail({
            from: `"IdeaHub" <${process.env.EMAIL_USER}>`,
            to: user.rows[0].email,
            subject: `📬 IdeaHub - ${notificacoes.rows.length} nova(s) notificação(ões)`,
            html: html
        });
        
        await pool.query(
            `UPDATE preferencias_notificacoes SET ultimo_envio = NOW() WHERE id_usuario = $1`,
            [usuarioId]
        );

        return true;
    } catch (err) {
        console.error(`❌ Erro ao enviar e-mail:`, err.message);
        return false;
    }
}

// Iniciar scheduler (se as variáveis de ambiente estiverem configuradas)
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    cron.schedule('0 8 * * *', async () => {
        try {
            const usuarios = await pool.query(`
                SELECT DISTINCT p.id_usuario 
                FROM preferencias_notificacoes p
                JOIN usuarios u ON p.id_usuario = u.id
                WHERE p.email_ativado = true AND u.ativo = true
            `);
            for (const user of usuarios.rows) {
                await enviarResumoDiario(user.id_usuario);
                await new Promise(r => setTimeout(r, 1000));
            }
            
        } catch (err) {
            console.error('❌ Erro no scheduler:', err);
        }
    });
    console.log('⏰ Scheduler de e-mails iniciado (executa às 8h diariamente)');
} else {
    console.log('⚠️ Scheduler não iniciado: variáveis de e-mail não configuradas');
}

app.post('/teste/enviar-email', async (req, res) => {
    const { usuarioId } = req.body;
    
    if (!usuarioId) {
        return res.status(400).json({ erro: 'usuarioId é obrigatório' });
    }
    
    try {
        // Verificar se as variáveis de ambiente estão configuradas
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error('❌ Variáveis de e-mail NÃO configuradas!');
            
            return res.json({ 
                sucesso: true, 
                mensagem: 'TESTE: E-mail não enviado (credenciais não configuradas). Configure o arquivo .env',
                notificacoes: 0
            });
        }
        
        // Buscar usuário
        const user = await pool.query(
            'SELECT nome, email FROM usuarios WHERE id = $1 AND ativo = true',
            [usuarioId]
        );
        
        if (user.rows.length === 0) {
            return res.status(404).json({ erro: 'Usuário não encontrado' });
        }
        
        // Buscar notificações
        const notificacoes = await pool.query(`
            SELECT n.*, i.titulo as ideia_titulo, i.id as ideia_id
            FROM notificacoes n
            LEFT JOIN ideias i ON n.id_ideia = i.id
            WHERE n.id_usuario = $1 AND n.lida = false 
              AND n.data_envio > NOW() - INTERVAL '1 day'
        `, [usuarioId]);
        
        if (notificacoes.rows.length === 0) {
            return res.json({ 
                sucesso: false, 
                mensagem: 'Nenhuma notificação nas últimas 24h' 
            });
        }
        
        // Configurar transporte
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        
        // Verificar conexão
        await transporter.verify();
        
        // Montar HTML simplificado para teste
        const html = `
            <h2>IdeaHub - Resumo de Notificações</h2>
            <p>Olá, ${user.rows[0].nome}!</p>
            <p>Você tem ${notificacoes.rows.length} notificação(ões) não lida(s):</p>
            <ul>
                ${notificacoes.rows.map(n => `<li>${n.mensagem}</li>`).join('')}
            </ul>
            <a href="${process.env.APP_URL || 'http://localhost:3000'}">Acessar IdeaHub</a>
        `;
        
        const info = await transporter.sendMail({
            from: `"IdeaHub" <${process.env.EMAIL_USER}>`,
            to: user.rows[0].email,
            subject: `📬 IdeaHub - ${notificacoes.rows.length} nova(s) notificação(ões)`,
            html: html
        });
        
        res.json({ 
            sucesso: true, 
            mensagem: `E-mail enviado para ${user.rows[0].email}`,
            notificacoes: notificacoes.rows.length
        });
        
    } catch (err) {
        console.error('❌ Erro detalhado:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Endpoint para listar usuários que receberão e-mails (apenas admin)
app.get('/admin/usuarios/email', verificarAdmin, async (req, res) => {
    try {
        const usuarios = await pool.query(`
            SELECT u.id, u.nome, u.email, u.ativo, 
                   COALESCE(p.email_ativado, true) as email_ativado,
                   p.ultimo_envio
            FROM usuarios u
            LEFT JOIN preferencias_notificacoes p ON u.id = p.id_usuario
            WHERE u.ativo = true
            ORDER BY u.id
        `);
        res.json(usuarios.rows);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

app.get('/api/usuario/email-status', async (req, res) => {
    const { usuarioId } = req.query;
    
    if (!usuarioId) {
        return res.status(401).json({ erro: 'Usuário não autenticado' });
    }
    
    try {
        const result = await pool.query(
            `SELECT COALESCE(email_ativado, true) as email_ativado 
             FROM preferencias_notificacoes 
             WHERE id_usuario = $1`,
            [usuarioId]
        );
        
        res.json({ 
            email_ativado: result.rows.length > 0 ? result.rows[0].email_ativado : true 
        });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
});

// Dashboard de métricas
app.get('/admin/metricas', async (req, res) => {
    try {
        // Total de usuários
        const totalUsuarios = await pool.query('SELECT COUNT(*) as total FROM usuarios WHERE ativo = true');
        
        // Total de ideias
        const totalIdeias = await pool.query('SELECT COUNT(*) as total FROM ideias');
        
        // Total de comentários
        const totalComentarios = await pool.query('SELECT COUNT(*) as total FROM comentarios');
        
        // Total de projetos
        const totalProjetos = await pool.query('SELECT COUNT(*) as total FROM projetos WHERE deletado = false');
        
        // Usuários ativos hoje
        const usuariosHoje = await pool.query(`
            SELECT COUNT(DISTINCT id_usuario) as total 
            FROM logs_detalhados 
            WHERE DATE(data_acao) = CURRENT_DATE
        `);
        
        // Atividades por tipo
        const atividadesPorTipo = await pool.query(`
            SELECT acao, COUNT(*) as total 
            FROM logs_detalhados 
            GROUP BY acao 
            ORDER BY total DESC 
            LIMIT 5
        `);
        
        res.json({
            totalUsuarios: parseInt(totalUsuarios.rows[0].total),
            totalIdeias: parseInt(totalIdeias.rows[0].total),
            totalComentarios: parseInt(totalComentarios.rows[0].total),
            totalProjetos: parseInt(totalProjetos.rows[0].total),
            usuariosAtivosHoje: parseInt(usuariosHoje.rows[0].total),
            atividadesPorTipo: atividadesPorTipo.rows
        });
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Listar logs com filtros
app.get('/admin/logs', async (req, res) => {
    const { usuarioId, buscaUsuario, acao, dataInicio, dataFim, limit = 100 } = req.query;
    
    let query = `
        SELECT l.*, u.nome as usuario_nome, u.email as usuario_email
        FROM logs_detalhados l
        LEFT JOIN usuarios u ON l.id_usuario = u.id
        WHERE 1=1
    `;
    let params = [];
    let paramCount = 1;
    
    // Filtro por ID do usuário
    if (usuarioId && usuarioId !== 'todos' && usuarioId !== 'null' && usuarioId !== 'undefined') {
        query += ` AND l.id_usuario = $${paramCount}`;
        params.push(parseInt(usuarioId));
        paramCount++;
    }
    
    // FILTRO POR NOME DO USUÁRIO (busca parcial)
    if (buscaUsuario && buscaUsuario.trim() !== '') {
        query += ` AND u.nome ILIKE $${paramCount}`;
        params.push(`%${buscaUsuario.trim()}%`);
        paramCount++;
    }
    
    // Filtro por ação
    if (acao && acao !== 'todos' && acao !== 'null' && acao !== 'undefined') {
        query += ` AND l.acao = $${paramCount}`;
        params.push(acao);
        paramCount++;
    }
    
    // Filtro por data
    if (dataInicio && dataInicio !== '') {
        query += ` AND DATE(l.data_acao) >= $${paramCount}`;
        params.push(dataInicio);
        paramCount++;
    }
    
    if (dataFim && dataFim !== '') {
        query += ` AND DATE(l.data_acao) <= $${paramCount}`;
        params.push(dataFim);
        paramCount++;
    }
    
    query += ` ORDER BY l.data_acao DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    try {
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('❌ Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// ========== BUSCAR SUGESTÕES DE USUÁRIOS (AUTOCOMPLETE) ==========
app.get('/admin/usuarios/sugestoes', async (req, res) => {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
        return res.json([]);
    }
    
    try {
        const result = await pool.query(`
            SELECT id, nome, email, cargo 
            FROM usuarios 
            WHERE nome ILIKE $1 OR email ILIKE $1
            ORDER BY nome
            LIMIT 10
        `, [`%${q}%`]);
        
        res.json(result.rows);
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Listar usuários inativos (último acesso > 30 dias)
app.get('/admin/usuarios/inativos', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.nome, u.email, u.cargo, u.data_cadastro, u.ultimo_acesso,
                   COUNT(i.id) as total_ideias
            FROM usuarios u
            LEFT JOIN ideias i ON u.id = i.id_usuario
            WHERE u.ativo = true 
              AND (u.ultimo_acesso < NOW() - INTERVAL '30 days' OR u.ultimo_acesso IS NULL)
            GROUP BY u.id
            ORDER BY u.ultimo_acesso DESC NULLS LAST
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Exportar logs em CSV
// ========== EXPORTAR LOGS EM CSV ==========
app.get('/admin/logs/exportar', async (req, res) => {
    const { usuarioId, buscaUsuario, acao, dataInicio, dataFim } = req.query;
    
    let query = `
        SELECT l.data_acao, u.nome as usuario_nome, u.email as usuario_email, 
               l.acao, l.descricao, l.ip_address
        FROM logs_detalhados l
        LEFT JOIN usuarios u ON l.id_usuario = u.id
        WHERE 1=1
    `;
    let params = [];
    let paramCount = 1;
    
    if (usuarioId && usuarioId !== 'todos' && usuarioId !== 'null') {
        query += ` AND l.id_usuario = $${paramCount}`;
        params.push(parseInt(usuarioId));
        paramCount++;
    }
    
    if (buscaUsuario && buscaUsuario.trim() !== '') {
        query += ` AND u.nome ILIKE $${paramCount}`;
        params.push(`%${buscaUsuario}%`);
        paramCount++;
    }
    
    if (acao && acao !== 'todos') {
        query += ` AND l.acao = $${paramCount}`;
        params.push(acao);
        paramCount++;
    }
    
    if (dataInicio) {
        query += ` AND DATE(l.data_acao) >= $${paramCount}`;
        params.push(dataInicio);
        paramCount++;
    }
    
    if (dataFim) {
        query += ` AND DATE(l.data_acao) <= $${paramCount}`;
        params.push(dataFim);
        paramCount++;
    }
    
    query += ` ORDER BY l.data_acao DESC`;
    
    try {
        const result = await pool.query(query, params);
        
        // Criar cabeçalho do CSV
        const csvRows = [];
        csvRows.push('Data/Hora;Usuário;Email;Ação;Descrição;IP');
        
        for (const row of result.rows) {
            const dataFormatada = new Date(row.data_acao).toLocaleString('pt-BR');
            const acaoTexto = getAcaoTextoExport(row.acao);
            
            csvRows.push([
                dataFormatada,
                `"${(row.usuario_nome || 'Sistema').replace(/"/g, '""')}"`,
                `"${(row.usuario_email || '-').replace(/"/g, '""')}"`,
                acaoTexto,
                `"${(row.descricao || '-').replace(/"/g, '""')}"`,
                row.ip_address || '-'
            ].join(';'));
        }
        
        const csvContent = csvRows.join('\n');
        
        // Configurar headers para download
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=logs_${new Date().toISOString().slice(0, 19)}.csv`);
        res.send(csvContent);
        
    } catch (err) {
        console.error('❌ Erro ao exportar logs:', err);
        res.status(500).json({ erro: err.message });
    }
});

// Função auxiliar para traduzir ações na exportação
function getAcaoTextoExport(acao) {
    const textos = {
        'login': 'Login',
        'cadastro': 'Cadastro',
        'criar_ideia': 'Criar Ideia',
        'votar': 'Votar',
        'comentar': 'Comentar',
        'moderar': 'Moderar'
    };
    return textos[acao] || acao;
}

function mostrarAprovadas() {
    
    // Esconder todas as seções
    const aprovadasSection = document.getElementById('aprovadasSection');
    const ativosSection = document.getElementById('ativosSection');
    const lixeiraSection = document.getElementById('lixeiraSection');
    
    if (aprovadasSection) aprovadasSection.style.display = 'block';
    if (ativosSection) ativosSection.style.display = 'none';
    if (lixeiraSection) lixeiraSection.style.display = 'none';
    
    // Atualizar classes dos botões
    const botoes = document.querySelectorAll('.tab-projeto');
    botoes.forEach(btn => btn.classList.remove('active'));
    if (botoes[0]) botoes[0].classList.add('active');
    
    // Carregar conteúdo
    carregarIdeiasAprovadas();
}

function mostrarAtivos() {
    
    // Esconder todas as seções
    const aprovadasSection = document.getElementById('aprovadasSection');
    const ativosSection = document.getElementById('ativosSection');
    const lixeiraSection = document.getElementById('lixeiraSection');
    
    if (aprovadasSection) aprovadasSection.style.display = 'none';
    if (ativosSection) ativosSection.style.display = 'block';
    if (lixeiraSection) lixeiraSection.style.display = 'none';
    
    // Atualizar classes dos botões
    const botoes = document.querySelectorAll('.tab-projeto');
    botoes.forEach(btn => btn.classList.remove('active'));
    if (botoes[1]) botoes[1].classList.add('active');
    
    // Carregar conteúdo
    carregarProjetos();
}

function mostrarLixeira() {
    
    // Esconder todas as seções
    const aprovadasSection = document.getElementById('aprovadasSection');
    const ativosSection = document.getElementById('ativosSection');
    const lixeiraSection = document.getElementById('lixeiraSection');
    
    if (aprovadasSection) aprovadasSection.style.display = 'none';
    if (ativosSection) ativosSection.style.display = 'none';
    if (lixeiraSection) lixeiraSection.style.display = 'block';
    
    // Atualizar classes dos botões
    const botoes = document.querySelectorAll('.tab-projeto');
    botoes.forEach(btn => btn.classList.remove('active'));
    if (botoes[2]) botoes[2].classList.add('active');
    
    // Carregar conteúdo
    carregarLixeira();
    carregarContagemLixeira();
}

const storageDocumentos = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/documentos');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'doc-' + uniqueSuffix + ext);
    }
});

const uploadDocumento = multer({
    storage: storageDocumentos,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: function(req, file, cb) {
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'image/jpg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não suportado. Use PDF, DOC, DOCX, PNG ou JPG.'), false);
        }
    }
});

// ========== UPLOAD DE DOCUMENTO ==========
// Versão simplificada do upload
app.post('/upload/documento', (req, res) => {
    
    uploadDocumento.single('arquivo')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ erro: err.message });
        }
        
        if (!req.file) {
            return res.status(400).json({ erro: 'Nenhum arquivo' });
        }
        
        res.json({ 
            sucesso: true, 
            url: `/uploads/documentos/${req.file.filename}` 
        });
    });
});

// ==========================================
// CONFIGURAÇÃO DE ARQUIVOS ESTÁTICOS
// ==========================================
// Servir arquivos estáticos da pasta public
app.use(express.static('Public'));
app.use(express.static(path.join(__dirname, 'Public')));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

// Rota para páginas
app.get('/pages/:page.html', (req, res) => {
    const page = req.params.page;
    res.sendFile(path.join(__dirname, 'Public', 'pages', `${page}.html`));
});

// ... (suas outras rotas aqui)
app.listen(port, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${port}`);
});

// Para todas as outras rotas HTML
app.get('/pages/:page', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, 'pages', page);
    res.sendFile(filePath);
});

// Rota de teste para verificar usuário (remover depois)
app.get('/debug/usuario', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nome, email, cargo FROM usuarios WHERE email = $1', ['admin@ideahub.com']);
        res.json(result.rows[0]);
    } catch (err) {
        res.json({ erro: err.message });
    }
});