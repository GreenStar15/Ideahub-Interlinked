// backend/services/scheduler.js
const cron = require('node-cron');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Função para enviar resumo diário (integrada no scheduler)
async function enviarResumoDiario(usuarioId, pool) {
    try {
        // Verificar preferência
        const pref = await pool.query(
            'SELECT email_ativado FROM preferencias_notificacoes WHERE id_usuario = $1',
            [usuarioId]
        );
        
        if (pref.rows.length === 0 || !pref.rows[0].email_ativado) {
            return null;
        }
        
        // Buscar usuário
        const user = await pool.query(
            'SELECT nome, email FROM usuarios WHERE id = $1 AND ativo = true',
            [usuarioId]
        );
        
        if (user.rows.length === 0) return null;
        
        // Buscar notificações não lidas das últimas 24h
        const notificacoes = await pool.query(`
            SELECT n.*, i.titulo as ideia_titulo, i.id as ideia_id
            FROM notificacoes n
            LEFT JOIN ideias i ON n.id_ideia = i.id
            WHERE n.id_usuario = $1 
              AND n.lida = false 
              AND n.data_envio > NOW() - INTERVAL '1 day'
            ORDER BY n.data_envio DESC
        `, [usuarioId]);
        
        if (notificacoes.rows.length === 0) return null;
        
        // Montar HTML do e-mail
        let notificacoesHtml = '';
        for (const notif of notificacoes.rows) {
            const icone = notif.categoria === 'voto' ? '👍' :
                         notif.categoria === 'comentario' ? '💬' :
                         notif.categoria === 'incentivo_concedido' ? '🎁' :
                         notif.categoria === 'moderacao' ? '🛡️' : '📢';
            
            notificacoesHtml += `
                <div style="padding: 12px; margin-bottom: 10px; background: #f8fafc; border-left: 4px solid #667eea; border-radius: 8px;">
                    <div style="font-size: 20px; margin-bottom: 5px;">${icone}</div>
                    <p style="margin: 5px 0;">${notif.mensagem}</p>
                    ${notif.ideia_id ? `<a href="http://localhost:3000/pages/ideia.html?id=${notif.ideia_id}" style="color: #667eea; text-decoration: none;">🔗 Ver ideia →</a>` : ''}
                    <small style="color: #888;">${new Date(notif.data_envio).toLocaleString('pt-BR')}</small>
                </div>
            `;
        }
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: white; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px; }
                    .footer { text-align: center; font-size: 12px; color: #888; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
                    .btn { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>💡 IdeaHub</h2>
                        <p>Seu resumo diário de inovação</p>
                    </div>
                    <div class="content">
                        <p>Olá, <strong>${user.rows[0].nome}</strong>!</p>
                        <p>Você tem <strong>${notificacoes.rows.length}</strong> notificação(ões) não lida(s) nas últimas 24 horas:</p>
                        <div style="margin: 20px 0;">
                            ${notificacoesHtml}
                        </div>
                        <div style="text-align: center;">
                            <a href="http://localhost:3000/index.html" class="btn">Acessar IdeaHub</a>
                        </div>
                        <p style="font-size: 12px; color: #888; margin-top: 20px;">
                            Você pode desativar esses e-mails nas configurações da sua conta.
                        </p>
                    </div>
                    <div class="footer">
                        <p>© 2026 IdeaHub - Plataforma de Gestão de Inovação</p>
                        <p>Este e-mail foi enviado automaticamente. Por favor, não responda.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        // Configurar transporte de e-mail
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
            subject: `📬 IdeaHub - Você tem ${notificacoes.rows.length} nova(s) notificação(ões)`,
            html: html
        });
        
        // Atualizar último envio
        await pool.query(
            `UPDATE preferencias_notificacoes 
             SET ultimo_envio = NOW(), updated_at = NOW() 
             WHERE id_usuario = $1`,
            [usuarioId]
        );
        
        console.log(`✅ E-mail de resumo enviado para ${user.rows[0].email}`);
        return true;
        
    } catch (err) {
        console.error(`❌ Erro ao enviar e-mail para usuário ${usuarioId}:`, err.message);
        return false;
    }
}

// Função para iniciar o scheduler (recebe a pool como parâmetro)
function iniciarScheduler(pool) {
    console.log('⏰ Iniciando scheduler de e-mails...');
    
    // Agendar envio de e-mails às 8h da manhã
    cron.schedule('0 8 * * *', async () => {
        console.log('📧 Iniciando envio de resumos diários...');
        
        try {
            // Buscar usuários com e-mail ativado
            const usuarios = await pool.query(`
                SELECT DISTINCT p.id_usuario 
                FROM preferencias_notificacoes p
                JOIN usuarios u ON p.id_usuario = u.id
                WHERE p.email_ativado = true 
                  AND u.ativo = true
                  AND (p.ultimo_envio IS NULL OR p.ultimo_envio < NOW() - INTERVAL '1 day')
            `);
            
            console.log(`📬 ${usuarios.rows.length} usuários para notificar`);
            
            for (const user of usuarios.rows) {
                await enviarResumoDiario(user.id_usuario, pool);
                // Pequeno delay para não sobrecarregar o servidor
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            console.log('✅ Envio de resumos diários concluído');
        } catch (error) {
            console.error('❌ Erro no scheduler:', error);
        }
    });
    
    console.log('⏰ Scheduler de e-mails configurado (executa às 8h diariamente)');
}

module.exports = { iniciarScheduler, enviarResumoDiario };