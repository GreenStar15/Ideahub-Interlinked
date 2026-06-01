// backend/services/emailService.js
const nodemailer = require('nodemailer');
const pool = require('../db');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true para 465, false para 587
    auth: {
        user: 'seu-email@gmail.com',
        pass: 'abcd efgh ijkl mnop'
    }
});

// Função para enviar e-mail de resumo diário
async function enviarResumoDiario(usuarioId) {
    try {
        // Buscar preferências do usuário
        const pref = await pool.query(
            'SELECT email_ativado FROM preferencias_notificacoes WHERE id_usuario = $1',
            [usuarioId]
        );
        
        if (!pref.rows.length || !pref.rows[0].email_ativado) return null;
        
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
                    ${notif.ideia_id ? `<a href="${process.env.APP_URL || 'http://localhost:3000'}/pages/ideia.html?id=${notif.ideia_id}" style="color: #667eea; text-decoration: none;">🔗 Ver ideia →</a>` : ''}
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
                            <a href="${process.env.APP_URL || 'http://localhost:3000'}" class="btn">Acessar IdeaHub</a>
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
        
        // Enviar e-mail
        await transporter.sendMail({
            from: `"IdeaHub" <${process.env.SMTP_USER || 'noreply@ideahub.com'}>`,
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
        
    } catch (error) {
        console.error('❌ Erro ao enviar e-mail de resumo:', error);
        return false;
    }
}

module.exports = { enviarResumoDiario };