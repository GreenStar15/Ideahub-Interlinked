// Variável global para armazenar o usuário logado
let usuarioLogado = null;

console.log('🚀 Script carregado!');

// ==================== UTILITÁRIOS ====================

function showMessage(message, type = 'success') {
    console.log('Mensagem:', type, message);
    const alert = document.getElementById('alert');
    if (alert) {
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alert.style.display = 'block';
        setTimeout(() => {
            alert.style.display = 'none';
        }, 3000);
    } else {
        alert(message);
    }
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
    console.log('Mostrando login');
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
    console.log('Mostrando cadastro');
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
    console.log('🔵 FUNÇÃO fazerCadastro chamada');
    
    const nome = document.getElementById('cadastroNome').value.trim();
    const email = document.getElementById('cadastroEmail').value.trim();
    const senha = document.getElementById('cadastroSenha').value;
    
    console.log('Dados do cadastro:', { nome, email, senha: '***' });
    
    if (!nome || !email || !senha) {
        showMessage('Preencha todos os campos!', 'error');
        return;
    }
    
    if (senha.length < 6) {
        showMessage('A senha deve ter pelo menos 6 caracteres!', 'error');
        return;
    }
    
    if (!email.includes('@')) {
        showMessage('Digite um email válido!', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        console.log('Enviando requisição para /cadastrar');
        const response = await fetch('/cadastrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nome, 
                email, 
                senha, 
                tipo: 'aluno' 
            })
        });
        
        console.log('Resposta recebida. Status:', response.status);
        const data = await response.json();
        console.log('Dados da resposta:', data);
        
        if (response.ok && data.sucesso) {
            showMessage('✅ Cadastro realizado com sucesso! Faça login.');
            
            document.getElementById('cadastroNome').value = '';
            document.getElementById('cadastroEmail').value = '';
            document.getElementById('cadastroSenha').value = '';
            
            showLogin();
        } else {
            showMessage(data.erro || 'Erro ao cadastrar', 'error');
        }
    } catch (error) {
        console.error('❌ Erro no cadastro:', error);
        showMessage('Erro de conexão: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function fazerLogin() {
    console.log('🔵 FUNÇÃO fazerLogin chamada');
    
    const email = document.getElementById('loginEmail').value.trim();
    const senha = document.getElementById('loginSenha').value;
    
    console.log('Tentando login com:', { email });
    
    if (!email || !senha) {
        showMessage('Preencha email e senha!', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        console.log('Enviando requisição para /login');
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });
        
        console.log('Resposta recebida. Status:', response.status);
        const data = await response.json();
        console.log('Dados da resposta:', data);
        
        if (response.ok && data.sucesso) {
            usuarioLogado = data.usuario;
            console.log('Usuário logado:', usuarioLogado);
            
            document.getElementById('userName').textContent = usuarioLogado.nome;
            
            const authArea = document.getElementById('authArea');
            const ideiaArea = document.getElementById('ideiaArea');
            const minhasIdeiasArea = document.getElementById('minhasIdeiasArea');
            
            if (authArea) authArea.style.display = 'none';
            if (ideiaArea) ideiaArea.style.display = 'block';
            if (minhasIdeiasArea) minhasIdeiasArea.style.display = 'block';
            
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginSenha').value = '';
            
            showMessage(`✅ Bem-vindo, ${usuarioLogado.nome}!`);
            
            carregarTodasIdeias();
            carregarMinhasIdeias();
        } else {
            showMessage(data.erro || 'Email ou senha incorretos!', 'error');
        }
    } catch (error) {
        console.error('❌ Erro no login:', error);
        showMessage('Erro de conexão: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

function fazerLogout() {
    console.log('Fazendo logout');
    usuarioLogado = null;
    
    const authArea = document.getElementById('authArea');
    const ideiaArea = document.getElementById('ideiaArea');
    const minhasIdeiasArea = document.getElementById('minhasIdeiasArea');
    
    if (authArea) authArea.style.display = 'block';
    if (ideiaArea) ideiaArea.style.display = 'none';
    if (minhasIdeiasArea) minhasIdeiasArea.style.display = 'none';
    
    showMessage('✅ Logout realizado com sucesso!');
    carregarTodasIdeias();
}

// ==================== IDEIAS ====================

async function enviarIdeia() {
    console.log('Enviando ideia');
    
    if (!usuarioLogado) {
        showMessage('Você precisa estar logado!', 'error');
        return;
    }
    
    const titulo = document.getElementById('titulo').value.trim();
    const descricao = document.getElementById('descricao').value.trim();
    const categoria = document.getElementById('categoria').value.trim();
    const anonima = document.getElementById('anonima').checked;
    
    if (!titulo || !descricao || !categoria) {
        showMessage('Preencha todos os campos da ideia!', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/ideias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                titulo,
                descricao,
                categoria,
                id_usuario: usuarioLogado.id,
                anonima
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.sucesso) {
            showMessage('✅ Ideia publicada com sucesso!');
            
            document.getElementById('titulo').value = '';
            document.getElementById('descricao').value = '';
            document.getElementById('categoria').value = '';
            document.getElementById('anonima').checked = false;
            
            carregarTodasIdeias();
            carregarMinhasIdeias();
        } else {
            showMessage(data.erro || 'Erro ao publicar ideia', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showMessage('Erro de conexão', 'error');
    } finally {
        showLoading(false);
    }
}

async function carregarTodasIdeias() {
    console.log('Carregando todas as ideias');
    try {
        const response = await fetch('/ideias');
        const ideias = await response.json();
        console.log(`${ideias.length} ideias carregadas`);
        
        const container = document.getElementById('todasIdeias');
        if (!container) return;
        
        if (!ideias || ideias.length === 0) {
            container.innerHTML = '<div class="empty-state">📭 Nenhuma ideia cadastrada ainda.</div>';
            return;
        }
        
        container.innerHTML = ideias.map(ideia => `
            <div class="ideia-card">
                <h3>${escapeHtml(ideia.titulo)}</h3>
                <p>${escapeHtml(ideia.descricao)}</p>
                <div class="ideia-meta">
                    <span class="categoria">📁 ${escapeHtml(ideia.categoria)}</span>
                    <span>👤 ${ideia.anonima ? 'Anônimo' : escapeHtml(ideia.autor_nome)}</span>
                    <span>📅 ${formatarData(ideia.data_publicacao)}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar ideias:', error);
        const container = document.getElementById('todasIdeias');
        if (container) {
            container.innerHTML = '<div class="empty-state">❌ Erro ao carregar ideias</div>';
        }
    }
}

async function carregarMinhasIdeias() {
    if (!usuarioLogado) return;
    
    console.log('Carregando minhas ideias');
    try {
        const response = await fetch(`/minhas-ideias/${usuarioLogado.id}`);
        const ideias = await response.json();
        
        const container = document.getElementById('minhasIdeias');
        if (!container) return;
        
        if (!ideias || ideias.length === 0) {
            container.innerHTML = '<div class="empty-state">📭 Você ainda não tem ideias.</div>';
            return;
        }
        
        container.innerHTML = ideias.map(ideia => `
            <div class="ideia-card">
                <h3>${escapeHtml(ideia.titulo)}</h3>
                <p>${escapeHtml(ideia.descricao)}</p>
                <div class="ideia-meta">
                    <span class="categoria">📁 ${escapeHtml(ideia.categoria)}</span>
                    <span>📅 ${formatarData(ideia.data_publicacao)}</span>
                </div>
                <button onclick="deletarIdeia(${ideia.id})" class="btn-delete">🗑️ Deletar</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function deletarIdeia(id) {
    if (!confirm('Tem certeza?')) return;
    
    showLoading(true);
    
    try {
        const response = await fetch(`/ideias/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId: usuarioLogado.id })
        });
        
        const data = await response.json();
        
        if (response.ok && data.sucesso) {
            showMessage('✅ Ideia deletada!');
            carregarMinhasIdeias();
            carregarTodasIdeias();
        } else {
            showMessage(data.erro || 'Erro ao deletar', 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showMessage('Erro de conexão', 'error');
    } finally {
        showLoading(false);
    }
}

// ==================== INICIALIZAÇÃO ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM carregado, inicializando...');
    carregarTodasIdeias();
    
    // Verificar se os elementos existem
    console.log('Elementos encontrados:');
    console.log('- authArea:', document.getElementById('authArea'));
    console.log('- loginForm:', document.getElementById('loginForm'));
    console.log('- cadastroForm:', document.getElementById('cadastroForm'));
    console.log('- todasIdeias:', document.getElementById('todasIdeias'));
});