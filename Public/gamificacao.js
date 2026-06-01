const pool = require('../db');

// Mapeamento de ações e seus pontos
const PONTOS_POR_ACAO = {
    criar_ideia: 10,
    votar: 2,
    comentar: 2,
    ideia_convertida: 50,
    receber_voto: 1   // ponto por voto recebido (limitado por dia/ideia)
};

// Registrar pontos e verificar conquistas
async function registrarPontos(usuarioId, acao, entidadeId = null) {
    const pontos = PONTOS_POR_ACAO[acao];
    if (!pontos) return;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Inserir no histórico
        await client.query(
            `INSERT INTO historico_pontos (id_usuario, acao, pontos_ganhos, entidade_id)
             VALUES ($1, $2, $3, $4)`,
            [usuarioId, acao, pontos, entidadeId]
        );

        // 2. Atualizar pontos totais na tabela pontuacao_usuario (e na coluna da usuarios)
        const updateResult = await client.query(
            `UPDATE pontuacao_usuario 
             SET pontos_totais = pontos_totais + $1, 
                 data_atualizacao = NOW()
             WHERE id_usuario = $2
             RETURNING pontos_totais`,
            [pontos, usuarioId]
        );

        let novosPontos;
        if (updateResult.rows.length === 0) {
            // Se não existe registro, criar
            const insertResult = await client.query(
                `INSERT INTO pontuacao_usuario (id_usuario, pontos_totais, nivel)
                 VALUES ($1, $2, 1) RETURNING pontos_totais`,
                [usuarioId, pontos]
            );
            novosPontos = insertResult.rows[0].pontos_totais;
        } else {
            novosPontos = updateResult.rows[0].pontos_totais;
        }

        // Atualizar também na tabela usuarios (para consultas rápidas)
        await client.query(
            `UPDATE usuarios SET pontos_totais = $1, nivel_atual = floor($1 / 100) + 1
             WHERE id = $2`,
            [novosPontos, usuarioId]
        );

        // 3. Verificar subida de nível
        const nivelAnterior = await client.query(
            `SELECT nivel FROM pontuacao_usuario WHERE id_usuario = $1`,
            [usuarioId]
        );
        const novoNivel = Math.floor(novosPontos / 100) + 1;
        if (nivelAnterior.rows[0] && novoNivel > nivelAnterior.rows[0].nivel) {
            await client.query(
                `UPDATE pontuacao_usuario SET nivel = $1 WHERE id_usuario = $2`,
                [novoNivel, usuarioId]
            );
            // Notificar usuário sobre novo nível
            await client.query(
                `INSERT INTO notificacoes (mensagem, id_usuario, categoria, data_envio)
                 VALUES ($1, $2, 'conquista', NOW())`,
                [`🎉 Parabéns! Você subiu para o nível ${novoNivel}! Continue participando para ganhar mais pontos.`, usuarioId]
            );
        }

        // 4. Verificar conquistas baseadas na ação (condicao_acao)
        await verificarConquistasPorAcao(client, usuarioId, acao);

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao registrar pontos:', err);
    } finally {
        client.release();
    }
}

// Verificar conquistas baseadas em contagem de ações (ex: criar 5 ideias)
async function verificarConquistasPorAcao(client, usuarioId, acao) {
    // Buscar conquistas que dependem dessa ação
    const conquistas = await client.query(
        `SELECT * FROM conquistas 
         WHERE condicao_acao = $1 AND ativo = true`,
        [acao]
    );

    for (const conquista of conquistas.rows) {
        // Verificar se o usuário já tem essa conquista
        const jaTem = await client.query(
            `SELECT id FROM usuario_conquistas WHERE id_usuario = $1 AND id_conquista = $2`,
            [usuarioId, conquista.id]
        );
        if (jaTem.rows.length > 0) continue;

        // Contar quantas vezes o usuário realizou a ação
        const countResult = await client.query(
            `SELECT COUNT(*) as total FROM historico_pontos 
             WHERE id_usuario = $1 AND acao = $2`,
            [usuarioId, acao]
        );
        const totalAcoes = parseInt(countResult.rows[0].total);

        if (totalAcoes >= conquista.condicao_valor) {
            // Desbloquear conquista
            await client.query(
                `INSERT INTO usuario_conquistas (id_usuario, id_conquista) VALUES ($1, $2)`,
                [usuarioId, conquista.id]
            );
            // Notificar
            await client.query(
                `INSERT INTO notificacoes (mensagem, id_usuario, categoria, data_envio)
                 VALUES ($1, $2, 'conquista', NOW())`,
                [`🏅 Nova conquista desbloqueada: ${conquista.nome} - ${conquista.descricao}`, usuarioId]
            );
        }
    }
}

// Conquista especial: receber votos (não é acionada por ação do próprio usuário)
async function verificarConquistaReceberVotos(usuarioId, totalVotosRecebidos) {
    const client = await pool.connect();
    try {
        const conquista = await client.query(
            `SELECT * FROM conquistas 
             WHERE condicao_acao = 'receber_voto' AND condicao_valor = $1`,
            [totalVotosRecebidos]
        );
        if (conquista.rows.length === 0) return;

        const jaTem = await client.query(
            `SELECT id FROM usuario_conquistas WHERE id_usuario = $1 AND id_conquista = $2`,
            [usuarioId, conquista.rows[0].id]
        );
        if (jaTem.rows.length > 0) return;

        await client.query(
            `INSERT INTO usuario_conquistas (id_usuario, id_conquista) VALUES ($1, $2)`,
            [usuarioId, conquista.rows[0].id]
        );
        await client.query(
            `INSERT INTO notificacoes (mensagem, id_usuario, categoria, data_envio)
             VALUES ($1, $2, 'conquista', NOW())`,
            [`🏅 Nova conquista: ${conquista.rows[0].nome} - ${conquista.rows[0].descricao}`, usuarioId]
        );
    } catch (err) {
        console.error('Erro ao verificar conquista de votos recebidos:', err);
    } finally {
        client.release();
    }
}

module.exports = { registrarPontos, verificarConquistaReceberVotos };