// ==================== VARIÁVEIS GLOBAIS ====================
let usuarioLogado = null;
let paginaAtual = 1;
let totalPaginas = 1;
let categoriasList = [];
let filtrosAtuais = {
    q: '',
    categoria_id: 'todos',
    autor: 'todos',
    orderBy: 'votos'
};

// ==================== UTILITÁRIOS ====================
function showMessage(message, type = 'success') {
    const alert = document.getElementById('alert');
    if (!alert) return;
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.display = 'block';
    setTimeout(() => {
        alert.style.display = 'none';
    }, 3000);
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'flex' : 'none';
    }
}

function formatarData(data) {
    if (!data) return 'Data inválida';
    try {
        const date = new Date(data);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return data;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== AUTENTICAÇÃO ====================
function showLogin() {
    const loginForm = document.getElementById('loginForm');
    const cadastroForm = document.getElementById('cadastroForm');
    const btnLogin = document.getElementById('btnLoginTab');
    const btnCadastro = document.getElementById('btnCadastroTab');
    
    if (loginForm) loginForm.style.display = 'block';
    if (cadastroForm) cadastroForm.style.display = 'none';
    if (btnLogin) btnLogin.classList.add('active');
    if (btnCadastro) btnCadastro.classList.remove('active');
}

function showCadastro() {
    const loginForm = document.getElementById('loginForm');
    const cadastroForm = document.getElementById('cadastroForm');
    const btnLogin = document.getElementById('btnLoginTab');
    const btnCadastro = document.getElementById('btnCadastroTab');
    
    if (loginForm) loginForm.style.display = 'none';
    if (cadastroForm) cadastroForm.style.display = 'block';
    if (btnCadastro) btnCadastro.classList.add('active');
    if (btnLogin) btnLogin.classList.remove('active');
}

async function fazerCadastro() {
    const nome = document.getElementById('cadastroNome')?.value.trim();
    const email = document.getElementById('cadastroEmail')?.value.trim();
    const senha = document.getElementById('cadastroSenha')?.value;
    const cargo = document.getElementById('cadastroCargo')?.value || 'aluno';
    
    if (!nome || !email || !senha) {
        showMessage('Preencha todos os campos!', 'error');
        return;
    }
    
    if (senha.length < 6) {
        showMessage('A senha deve ter pelo menos 6 caracteres!', 'error');
        return;
    }
    
    showLoading(true);
    try {
        const response = await fetch('/cadastrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, email, senha, cargo })
        });
        const data = await response.json();
        
        if (response.ok && data.sucesso) {
            showMessage('✅ Cadastro realizado! Faça login.', 'success');
            document.getElementById('cadastroNome').value = '';
            document.getElementById('cadastroEmail').value = '';
            document.getElementById('cadastroSenha').value = '';
            showLogin();
        } else {
            showMessage(data.erro || 'Erro ao cadastrar', 'error');
        }
    } catch (error) {
        showMessage('Erro de conexão', 'error');
    } finally {
        showLoading(false);
    }
}

async function fazerLogin() {
    const email = document.getElementById('loginEmail')?.value.trim();
    const senha = document.getElementById('loginSenha')?.value;
    
    if (!email || !senha) {
        showMessage('Preencha email e senha!', 'error');
        return;
    }
    
    showLoading(true);
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });
        const data = await response.json();
        
        if (response.ok && data.sucesso) {
            usuarioLogado = data.usuario;
            
            // Salvar token
            localStorage.setItem('ideaHubToken', JSON.stringify({
                id: usuarioLogado.id,
                nome: usuarioLogado.nome,
                cargo: usuarioLogado.cargo
            }));
            
            // Atualizar UI
            document.getElementById('userName').textContent = usuarioLogado.nome;
            
            // Badge de cargo
            const cargoBadge = document.getElementById('userCargoBadge');
            if (cargoBadge) {
                cargoBadge.className = `cargo-badge ${usuarioLogado.cargo}`;
                cargoBadge.textContent = getCargoText(usuarioLogado.cargo);
            }
            
            // Mostrar links de admin se for gestor ou ti_staff
            const isAdmin = usuarioLogado.cargo === 'gestor' || usuarioLogado.cargo === 'ti_staff';
            const adminLink = document.getElementById('adminLink');
            const projetosLink = document.getElementById('projetosLink');
            
            if (adminLink) adminLink.style.display = isAdmin ? 'inline-block' : 'none';
            if (projetosLink) projetosLink.style.display = isAdmin ? 'inline-block' : 'none';
            
            // Mostrar áreas logadas
            document.getElementById('authArea').style.display = 'none';
            document.getElementById('ideiaArea').style.display = 'block';
            document.getElementById('minhasIdeiasArea').style.display = 'block';
            document.getElementById('buscaArea').style.display = 'block';
            document.getElementById('notificacaoArea').style.display = 'block';
            
            showMessage(`✅ Bem-vindo, ${usuarioLogado.nome}!`, 'success');
            
            // Resetar e carregar dados
            paginaAtual = 1;
            filtrosAtuais = { q: '', categoria_id: 'todos', autor: 'todos', orderBy: 'votos' };
            
            await carregarCategorias();
            await carregarIdeias();
            await carregarMinhasIdeias();
            await carregarNotificacoes();
            
        } else {
            showMessage(data.erro || 'Email ou senha incorretos!', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showMessage('Erro de conexão', 'error');
    } finally {
        showLoading(false);
    }
}

function fazerLogout() {
    usuarioLogado = null;
    localStorage.removeItem('ideaHubToken');
    
    document.getElementById('authArea').style.display = 'block';
    document.getElementById('ideiaArea').style.display = 'none';
    document.getElementById('minhasIdeiasArea').style.display = 'none';
    document.getElementById('buscaArea').style.display = 'none';
    document.getElementById('notificacaoArea').style.display = 'none';
    
    showMessage('✅ Logout realizado!', 'success');
    carregarIdeias();
}

function getCargoText(cargo) {
    const cargos = {
        'aluno': '👨‍🎓 Aluno',
        'professor': '👨‍🏫 Professor',
        'ti_staff': '🖥️ Equipe TI',
        'gestor': '📊 Gestor'
    };
    return cargos[cargo] || cargo;
}

// ==================== CATEGORIAS ====================
async function carregarCategorias() {
    try {
        const response = await fetch('/categorias');
        const categorias = await response.json();
        categoriasList = categorias;
        
        const selectCadastro = document.getElementById('categoriaCadastro');
        if (selectCadastro) {
            selectCadastro.innerHTML = '<option value="">🔽 Selecione uma categoria</option>';
            categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = `${cat.icone || '📁'} ${cat.nome}`;
                selectCadastro.appendChild(option);
            });
        }
        
        const selectFiltro = document.getElementById('categoriaFilter');
        if (selectFiltro) {
            selectFiltro.innerHTML = '<option value="todos">📌 Todas as categorias</option>';
            categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = `${cat.icone || '📁'} ${cat.nome}`;
                selectFiltro.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar categorias:', error);
    }
}

// ==================== IDEIAS ====================
async function enviarIdeia() {
    if (!usuarioLogado) {
        showMessage('Faça login primeiro!', 'error');
        return;
    }
    
    const titulo = document.getElementById('titulo')?.value.trim();
    const descricao = document.getElementById('descricao')?.value.trim();
    const categoria_id = document.getElementById('categoriaCadastro')?.value;
    const anonima = document.getElementById('anonima')?.checked || false;
    
    if (!titulo) {
        showMessage('❌ Digite um título!', 'error');
        return;
    }
    if (!descricao) {
        showMessage('❌ Digite uma descrição!', 'error');
        return;
    }
    if (!categoria_id) {
        showMessage('❌ Selecione uma categoria!', 'error');
        return;
    }
    
    showLoading(true);
    try {
        const response = await fetch('/ideias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                titulo, descricao, categoria_id: parseInt(categoria_id),
                id_usuario: usuarioLogado.id, anonima
            })
        });
        const data = await response.json();
        
        if (data.sucesso) {
            showMessage('✅ Ideia publicada!', 'success');
            document.getElementById('titulo').value = '';
            document.getElementById('descricao').value = '';
            document.getElementById('categoriaCadastro').value = '';
            document.getElementById('anonima').checked = false;
            paginaAtual = 1;
            carregarIdeias();
            carregarMinhasIdeias();
        } else {
            showMessage(data.erro || 'Erro ao publicar', 'error');
        }
    } catch (error) {
        showMessage('Erro de conexão', 'error');
    } finally {
        showLoading(false);
    }
}

async function carregarIdeias() {
    showLoading(true);
    try {
        const isAdmin = usuarioLogado && (usuarioLogado.cargo === 'gestor' || usuarioLogado.cargo === 'ti_staff');
        let url = `/ideias?orderBy=${filtrosAtuais.orderBy}&isAdmin=${isAdmin}`;
        
        const temFiltro = filtrosAtuais.q || (filtrosAtuais.categoria_id !== 'todos');
        
        if (temFiltro) {
            url = `/ideias/buscar?orderBy=${filtrosAtuais.orderBy}&isAdmin=${isAdmin}`;
            if (filtrosAtuais.q) url += `&q=${encodeURIComponent(filtrosAtuais.q)}`;
            if (filtrosAtuais.categoria_id && filtrosAtuais.categoria_id !== 'todos') {
                url += `&categoria_id=${filtrosAtuais.categoria_id}`;
            }
        }
        
        const response = await fetch(url);
        let ideias = await response.json();
        
        // Se for array direto, usar assim; se tiver propriedade ideias, extrair
        if (!Array.isArray(ideias) && ideias.ideias) {
            ideias = ideias.ideias;
        }
        
        const container = document.getElementById('todasIdeias');
        
        if (!ideias || ideias.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 48px; margin-bottom: 15px;">🔍</div>
                    <h3>Nenhuma ideia encontrada</h3>
                    <p>${filtrosAtuais.q ? `Não encontramos nada para "${filtrosAtuais.q}"` : 'Seja o primeiro a compartilhar uma ideia!'}</p>
                </div>
            `;
            document.getElementById('paginacao').innerHTML = '';
            showLoading(false);
            return;
        }
        
        container.innerHTML = ideias.map(ideia => {
            const votos = ideia.votos_count || 0;
            const isAdminView = usuarioLogado && (usuarioLogado.cargo === 'gestor' || usuarioLogado.cargo === 'ti_staff');
            const autorNome = isAdminView ? ideia.autor_nome : (ideia.anonima ? 'Anônimo' : ideia.autor_nome);
            
            return `
                <div class="ideia-card" data-id="${ideia.id}">
                    <h3 onclick="verIdeia(${ideia.id})">${escapeHtml(ideia.titulo)}</h3>
                    <p>${escapeHtml(ideia.descricao.substring(0, 150))}${ideia.descricao.length > 150 ? '...' : ''}</p>
                    <div class="ideia-meta">
                        <span class="categoria">${ideia.categoria_icone || '📁'} ${escapeHtml(ideia.categoria_nome || 'Sem categoria')}</span>
                        <span>👤 ${escapeHtml(autorNome)}</span>
                        <span>📅 ${formatarData(ideia.data_publicacao)}</span>
                        <span class="votos-count">👍 ${votos} ${votos === 1 ? 'voto' : 'votos'}</span>
                    </div>
                    <div>
                        <button onclick="votar(${ideia.id})" class="btn-votar" id="votar-${ideia.id}">👍 Votar</button>
                        <button onclick="verIdeia(${ideia.id})" class="btn-detalhes">📖 Ver detalhes</button>
                    </div>
                </div>
            `;
        }).join('');
        
        if (usuarioLogado) {
            ideias.forEach(ideia => verificarVoto(ideia.id));
        }
        
        atualizarPaginacao();
        
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('todasIdeias').innerHTML = `
            <div class="empty-state">
                <div style="font-size: 48px;">⚠️</div>
                <h3>Erro ao carregar ideias</h3>
                <button onclick="carregarIdeias()" class="btn-primary">Tentar novamente</button>
            </div>
        `;
    } finally {
        showLoading(false);
    }
}

function verIdeia(ideiaId) {
    window.location.href = `pages/ideia.html?id=${ideiaId}`;
}

async function carregarMinhasIdeias() {
    if (!usuarioLogado) return;
    
    try {
        const isAdmin = usuarioLogado.cargo === 'gestor' || usuarioLogado.cargo === 'ti_staff';
        const response = await fetch(`/minhas-ideias/${usuarioLogado.id}?isAdmin=${isAdmin}`);
        const ideias = await response.json();
        
        const container = document.getElementById('minhasIdeias');
        
        if (!ideias || ideias.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 48px;">📭</div>
                    <h3>Você ainda não tem ideias</h3>
                    <button onclick="document.getElementById('titulo').focus()" class="btn-primary">Criar primeira ideia</button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = ideias.map(ideia => {
            const votos = ideia.votos_count || 0;
            return `
                <div class="ideia-card" data-id="${ideia.id}">
                    <h3 onclick="verIdeia(${ideia.id})">${escapeHtml(ideia.titulo)}</h3>
                    <p>${escapeHtml(ideia.descricao.substring(0, 100))}...</p>
                    <div class="ideia-meta">
                        <span class="categoria">${ideia.categoria_icone || '📁'} ${escapeHtml(ideia.categoria_nome)}</span>
                        <span>📅 ${formatarData(ideia.data_publicacao)}</span>
                        <span class="votos-count">👍 ${votos} ${votos === 1 ? 'voto' : 'votos'}</span>
                        <span class="status-badge status-${ideia.status}">${getStatusText(ideia.status)}</span>
                    </div>
                    <button onclick="deletarIdeia(${ideia.id})" class="btn-delete">🗑️ Deletar</button>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function deletarIdeia(id) {
    if (!confirm('Tem certeza que deseja deletar esta ideia?')) return;
    
    showLoading(true);
    try {
        const isAdmin = usuarioLogado.cargo === 'gestor' || usuarioLogado.cargo === 'ti_staff';
        const response = await fetch(`/ideias/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId: usuarioLogado.id, isAdmin })
        });
        const data = await response.json();
        if (data.sucesso) {
            showMessage('Ideia deletada!');
            carregarMinhasIdeias();
            carregarIdeias();
        } else {
            showMessage(data.erro, 'error');
        }
    } catch (error) {
        showMessage('Erro ao deletar', 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== VOTOS ====================
async function votar(ideiaId) {
    if (!usuarioLogado) {
        showMessage('Faça login para votar!', 'error');
        return;
    }
    
    const btn = document.getElementById(`votar-${ideiaId}`);
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    }
    
    try {
        const response = await fetch(`/ideias/${ideiaId}/votar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId: usuarioLogado.id })
        });
        const data = await response.json();
        
        if (data.sucesso) {
            showMessage(data.mensagem);
            carregarIdeias();
            carregarMinhasIdeias();
        } else {
            showMessage(data.erro || 'Erro ao votar', 'error');
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        }
    } catch (error) {
        showMessage('Erro de conexão', 'error');
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    }
}

async function verificarVoto(ideiaId) {
    if (!usuarioLogado) return;
    
    try {
        const response = await fetch(`/ideias/${ideiaId}/voto-usuario?usuarioId=${usuarioLogado.id}`);
        const data = await response.json();
        const btn = document.getElementById(`votar-${ideiaId}`);
        if (btn && data.votou) {
            btn.innerHTML = '❤️ Votado';
            btn.classList.add('votado');
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

// ==================== BUSCA E FILTROS ====================
function buscarIdeias() {
    filtrosAtuais.q = document.getElementById('searchInput')?.value.trim() || '';
    filtrosAtuais.categoria_id = document.getElementById('categoriaFilter')?.value || 'todos';
    filtrosAtuais.orderBy = document.getElementById('orderBy')?.value || 'votos';
    paginaAtual = 1;
    carregarIdeias();
}

function limparFiltros() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoriaFilter').value = 'todos';
    document.getElementById('orderBy').value = 'votos';
    filtrosAtuais = { q: '', categoria_id: 'todos', autor: 'todos', orderBy: 'votos' };
    paginaAtual = 1;
    carregarIdeias();
    showMessage('✅ Filtros limpos!', 'success');
}

function mudarOrdenacao() {
    filtrosAtuais.orderBy = document.getElementById('orderBy').value;
    paginaAtual = 1;
    carregarIdeias();
}

// ==================== PAGINAÇÃO ====================
function atualizarPaginacao() {
    const container = document.getElementById('paginacao');
    if (totalPaginas <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div class="pagination">';
    if (paginaAtual > 1) {
        html += `<button onclick="irPagina(${paginaAtual - 1})" class="page-btn">◀ Anterior</button>`;
    }
    
    html += `<span class="page-info">Página ${paginaAtual} de ${totalPaginas}</span>`;
    
    if (paginaAtual < totalPaginas) {
        html += `<button onclick="irPagina(${paginaAtual + 1})" class="page-btn">Próxima ▶</button>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

function irPagina(pagina) {
    paginaAtual = pagina;
    carregarIdeias();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==================== NOTIFICAÇÕES ====================
async function carregarNotificacoes() {
    if (!usuarioLogado) return;
    
    try {
        const response = await fetch(`/notificacoes/${usuarioLogado.id}`);
        const notificacoes = await response.json();
        
        const naoLidas = notificacoes.filter(n => !n.lida).length;
        const badge = document.getElementById('notificacaoBadge');
        if (badge) badge.textContent = naoLidas;
        
        const container = document.getElementById('listaNotificacoes');
        if (notificacoes.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhuma notificação</div>';
            return;
        }
        
        container.innerHTML = notificacoes.map(notif => `
            <div class="notificacao-item ${!notif.lida ? 'nao-lida' : ''}" onclick="marcarNotificacaoLida(${notif.id})">
                <p>${escapeHtml(notif.mensagem)}</p>
                <small>${formatarData(notif.data_envio)}</small>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function marcarNotificacaoLida(id) {
    try {
        await fetch(`/notificacoes/${id}/marcar-lida`, { method: 'PUT' });
        carregarNotificacoes();
    } catch (error) {
        console.error('Erro:', error);
    }
}

// ==================== UTILITÁRIOS GERAIS ====================
function getStatusText(status) {
    const statusMap = {
        'pendente': '⏳ Pendente',
        'aprovada': '✅ Aprovada',
        'convertida': '🚀 Convertida',
        'rejeitada': '❌ Rejeitada'
    };
    return statusMap[status] || status;
}

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM carregado');
    
    // Tentar recuperar sessão
    const tokenSalvo = localStorage.getItem('ideaHubToken');
    if (tokenSalvo) {
        try {
            const user = JSON.parse(tokenSalvo);
            usuarioLogado = user;
            // Verificar se o token ainda é válido (opcional)
            document.getElementById('userName').textContent = usuarioLogado.nome;
            
            const cargoBadge = document.getElementById('userCargoBadge');
            if (cargoBadge) {
                cargoBadge.className = `cargo-badge ${usuarioLogado.cargo}`;
                cargoBadge.textContent = getCargoText(usuarioLogado.cargo);
            }
            
            const isAdmin = usuarioLogado.cargo === 'gestor' || usuarioLogado.cargo === 'ti_staff';
            const adminLink = document.getElementById('adminLink');
            const projetosLink = document.getElementById('projetosLink');
            
            if (adminLink) adminLink.style.display = isAdmin ? 'inline-block' : 'none';
            if (projetosLink) projetosLink.style.display = isAdmin ? 'inline-block' : 'none';
            
            document.getElementById('authArea').style.display = 'none';
            document.getElementById('ideiaArea').style.display = 'block';
            document.getElementById('minhasIdeiasArea').style.display = 'block';
            document.getElementById('buscaArea').style.display = 'block';
            document.getElementById('notificacaoArea').style.display = 'block';
            
            carregarCategorias();
            carregarIdeias();
            carregarMinhasIdeias();
            carregarNotificacoes();
        } catch (e) {
            console.error('Erro ao restaurar sessão:', e);
        }
    } else {
        carregarIdeias();
        carregarCategorias();
        document.getElementById('buscaArea').style.display = 'none';
        document.getElementById('filtroAutor').style.display = 'none';
        document.getElementById('notificacaoArea').style.display = 'none';
    }
});