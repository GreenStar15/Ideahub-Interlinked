// ==================== VARIÁVEIS GLOBAIS ====================
let usuarioLogado = null;
let paginaAtual = 1;
let totalPaginas = 1;
let categoriasList = [];
let ultimaNotificacaoId = 0;  // ← VERIFIQUE SE ESTÁ AQUI!
let filtrosAtuais = {
    q: '',
    categoria_id: 'todos',
    autor: 'todos',
    orderBy: 'votos'
};

// ==========================================
// LIMPEZA LEVE - APENAS SESSIONSTORAGE
// ==========================================
(function() {
    // NÃO bloquear localStorage!
    // Apenas limpar sessionStorage na primeira visita
    if (sessionStorage.getItem('paginaInicialVisitada') !== 'true') {
        sessionStorage.clear();
        sessionStorage.setItem('paginaInicialVisitada', 'true');
        console.log('🧹 Limpeza de sessão na página inicial');
    }
})();

console.log('🔍 SessionStorage:', sessionStorage.getItem('ideaHubUser'));

// Verificar se voltou de alguma página
function verificarParametroURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const logado = urlParams.get('logado');
    
    if (logado === 'true') {
        // Limpar o parâmetro da URL sem recarregar
        window.history.replaceState({}, document.title, window.location.pathname);
        // Forçar verificação da sessão
        return true;
    }
    return false;
}

// ==================== UTILITÁRIOS ====================
function showMessage(message, type = 'success') {
    const alert = document.getElementById('alert');
    if (!alert) {
        console.warn('Elemento #alert não encontrado');
        return;
    }
    
    // Definir classes baseadas no tipo
    let alertClass = 'alert';
    switch(type) {
        case 'success':
            alertClass += ' alert-success';
            break;
        case 'error':
            alertClass += ' alert-error';
            break;
        case 'warning':
            alertClass += ' alert-warning';
            break;
        case 'info':
            alertClass += ' alert-info';
            break;
        default:
            alertClass += ' alert-info';
    }
    
    alert.className = alertClass;
    alert.textContent = message;
    alert.style.display = 'block';
    
    // Scroll suave para a mensagem
    alert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Esconder após 5 segundos
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
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

// ========== FILTRO DE VISUALIZAÇÃO ==========
let visualizacaoAtual = 'ambas'; // 'ambas', 'minhas', 'comunidade'

// ========== FUNÇÃO PARA FILTRAR VISUALIZAÇÃO ==========
function filtrarVisualizacao(tipo) {
    if (!usuarioLogado) {
        mostrarMensagemLogin('todasIdeias', 'mensagemTodasIdeias', 'grid');
        return;
    }
    
    visualizacaoAtual = tipo;
    
    const btnAmbas = document.getElementById('btnAmbas');
    const btnMinhas = document.getElementById('btnMinhas');
    const btnComunidade = document.getElementById('btnComunidade');
    
    if (btnAmbas) btnAmbas.classList.remove('ativo');
    if (btnMinhas) btnMinhas.classList.remove('ativo');
    if (btnComunidade) btnComunidade.classList.remove('ativo');
    
    if (tipo === 'ambas') {
        if (btnAmbas) btnAmbas.classList.add('ativo');
        const minhasArea = document.getElementById('minhasIdeiasArea');
        const header = document.querySelector('.todas-ideias-header');
        const todas = document.getElementById('todasIdeias');
        if (minhasArea) minhasArea.style.display = 'block';
        if (header) header.style.display = 'block';
        if (todas) todas.style.display = 'grid';
        carregarMinhasIdeias();
        carregarIdeias();
    } else if (tipo === 'minhas') {
        if (btnMinhas) btnMinhas.classList.add('ativo');
        const minhasArea = document.getElementById('minhasIdeiasArea');
        const header = document.querySelector('.todas-ideias-header');
        const todas = document.getElementById('todasIdeias');
        if (minhasArea) minhasArea.style.display = 'block';
        if (header) header.style.display = 'none';
        if (todas) todas.style.display = 'none';
        carregarMinhasIdeias();
    } else if (tipo === 'comunidade') {
        if (btnComunidade) btnComunidade.classList.add('ativo');
        const minhasArea = document.getElementById('minhasIdeiasArea');
        const header = document.querySelector('.todas-ideias-header');
        const todas = document.getElementById('todasIdeias');
        if (minhasArea) minhasArea.style.display = 'none';
        if (header) header.style.display = 'block';
        if (todas) todas.style.display = 'grid';
        carregarIdeias();
    }
}

let totalImagens = 0;
let imagemCounter = 0;
let capaSelecionada = 0;

function adicionarCampoImagem() {
    if (totalImagens >= 10) {
        showMessage('❌ Máximo de 10 imagens por ideia!', 'error');
        return;
    }
    
    const container = document.getElementById('imagensContainer');
    const newId = imagemCounter++;
    const index = totalImagens;
    
    const newItem = document.createElement('div');
    newItem.className = 'imagem-item';
    newItem.setAttribute('data-id', newId);
    newItem.setAttribute('data-index', index);
    newItem.innerHTML = `
        <div class="imagem-header">
            <span class="imagem-label">Imagem ${totalImagens + 1}</span>
            <div class="imagem-actions-header">
                <label class="capa-label">
                    <input type="radio" name="capa" value="${index}" ${index === capaSelecionada ? 'checked' : ''} onchange="selecionarCapa(${index})">
                    <span class="capa-text">⭐ Capa</span>
                </label>
                <button type="button" class="btn-remover-imagem" onclick="removerCampoImagem(this, ${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        <div class="imagem-inputs">
            <input type="file" class="imagem-arquivo" accept="image/*" onchange="previewImagem(this, ${index})">
            <input type="text" class="imagem-link" placeholder="Ou cole o link da imagem">
        </div>
        <div class="imagem-preview" id="preview-${newId}"></div>
        <div class="aviso-tamanho-item" style="display: none; font-size: 11px; color: #dc3545; margin-top: 5px;"></div>
    `;
    
    container.appendChild(newItem);
    totalImagens++;
    atualizarContador();
    
    // Adicionar evento para o link
    const linkInput = newItem.querySelector('.imagem-link');
    const previewDiv = newItem.querySelector('.imagem-preview');
    linkInput.addEventListener('input', () => previewLink(linkInput, previewDiv));
}

function selecionarCapa(index) {
    capaSelecionada = index;
    
    // Atualizar visual dos radio buttons
    const radios = document.querySelectorAll('input[name="capa"]');
    radios.forEach((radio, i) => {
        if (parseInt(radio.value) === index) {
            radio.checked = true;
        }
    });
}

function previewImagem(fileInput) {
    const item = fileInput.closest('.imagem-item');
    const previewDiv = item.querySelector('.imagem-preview');
    const avisoDiv = item.querySelector('.aviso-tamanho-item');
    const maxSizeMB = 5;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const fileSize = file.size;
        const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
        
        // Validar tamanho
        if (fileSize > maxSizeBytes) {
            avisoDiv.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Imagem muito grande! Tamanho: ${fileSizeMB}MB (máximo: ${maxSizeMB}MB)`;
            avisoDiv.style.display = 'block';
            fileInput.value = '';
            previewDiv.innerHTML = '';
            return;
        }
        
        avisoDiv.style.display = 'none';
        
        // Criar preview
        const reader = new FileReader();
        reader.onload = function(e) {
            previewDiv.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 100px; object-fit: cover; border-radius: 8px;">`;
        };
        reader.onerror = function(e) {
            console.error('Erro ao ler arquivo:', e);
            previewDiv.innerHTML = '<span style="color:#dc3545; font-size:12px;">❌ Erro ao carregar imagem</span>';
        };
        reader.readAsDataURL(file);
    } else {
        previewDiv.innerHTML = '';
    }
}

function validarTamanhoImagem(input) {
    const maxSizeMB = 5;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const avisoDiv = input.closest('.imagem-item').querySelector('.aviso-tamanho');
    
    if (input.files && input.files[0]) {
        const fileSize = input.files[0].size;
        const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
        
        if (fileSize > maxSizeBytes) {
            avisoDiv.textContent = `⚠️ Imagem muito grande! Tamanho: ${fileSizeMB}MB (máximo: ${maxSizeMB}MB)`;
            avisoDiv.style.display = 'block';
            input.value = ''; // Limpar o campo
            const previewDiv = input.closest('.imagem-item').querySelector('.preview-imagem');
            if (previewDiv) previewDiv.innerHTML = '';
            showMessage(`❌ Imagem excede ${maxSizeMB}MB! Por favor, escolha uma imagem menor.`, 'error');
        } else {
            avisoDiv.style.display = 'none';
        }
    }
}

function mostrarAvisoTamanho() {
    const avisoGlobal = document.getElementById('avisoTamanho');
    if (avisoGlobal) {
        avisoGlobal.style.display = 'flex';
        // Manter o aviso visível, apenas adicionar um efeito de fade suave após alguns segundos
        setTimeout(() => {
            avisoGlobal.style.opacity = '0.9';
        }, 5000);
    }
}

function removerCampoImagem(btn, indexRemovido) {
    const item = btn.closest('.imagem-item');
    if (item) {
        item.remove();
        totalImagens--;
        
        // Reordenar os índices
        const items = document.querySelectorAll('.imagem-item');
        items.forEach((item, newIndex) => {
            item.setAttribute('data-index', newIndex);
            const label = item.querySelector('.imagem-label');
            if (label) label.textContent = `Imagem ${newIndex + 1}`;
            
            const radio = item.querySelector('input[name="capa"]');
            if (radio) radio.value = newIndex;
        });
        
        // Ajustar capa selecionada
        if (capaSelecionada === indexRemovido) {
            capaSelecionada = totalImagens > 0 ? 0 : -1;
            if (totalImagens > 0) {
                const firstRadio = document.querySelector('input[name="capa"]');
                if (firstRadio) firstRadio.checked = true;
            }
        } else if (capaSelecionada > indexRemovido) {
            capaSelecionada--;
        }
        
        atualizarContador();
    }
}

function previewImagem(fileInput) {
    const item = fileInput.closest('.imagem-item');
    const previewDiv = item.querySelector('.imagem-preview');
    
    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            previewDiv.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 100px; object-fit: cover; border-radius: 8px;">`;
        };
        
        reader.readAsDataURL(file);
    }
}

function previewLink(linkInput, previewDiv) {
    const url = linkInput.value.trim();
    
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        // Verificar se é uma imagem válida
        const img = new Image();
        img.onload = function() {
            previewDiv.innerHTML = `<img src="${url}" alt="Preview" style="max-width: 100%; max-height: 100px; object-fit: cover; border-radius: 8px;">`;
        };
        img.onerror = function() {
            previewDiv.innerHTML = `<span style="color:#dc3545; font-size:12px;">❌ Link inválido ou imagem não encontrada</span>`;
        };
        img.src = url;
    } else if (url) {
        previewDiv.innerHTML = `<span style="color:#ffc107; font-size:12px;">⚠️ Link inválido (use http:// ou https://)</span>`;
    } else {
        previewDiv.innerHTML = '';
    }
}

function atualizarContador() {
    const contadorSpan = document.getElementById('contadorAtual');
    if (contadorSpan) {
        contadorSpan.textContent = totalImagens;
    }
    
    // Mostrar aviso de tamanho se tiver pelo menos uma imagem
    const avisoTamanho = document.getElementById('avisoTamanho');
    if (avisoTamanho && totalImagens > 0) {
        avisoTamanho.style.display = 'flex';
    }
}

// Inicializar previews existentes
function inicializarPreviews() {
    const items = document.querySelectorAll('.imagem-item');
    items.forEach(item => {
        const fileInput = item.querySelector('.imagem-arquivo');
        const linkInput = item.querySelector('.imagem-link');
        const previewDiv = item.querySelector('.preview-imagem');
        
        if (fileInput) fileInput.addEventListener('change', () => previewImagem(fileInput, previewDiv));
        if (linkInput) linkInput.addEventListener('input', () => previewLink(linkInput, previewDiv));
    });
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
            body: JSON.stringify({ nome, email, senha, tipo: 'aluno' })
        });
        const data = await response.json();
        
        if (response.ok && data.sucesso) {
            showMessage('✅ Cadastro realizado! Faça login.');
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

// ==========================================
// FUNÇÃO PARA ATUALIZAR INTERFACE APÓS LOGIN
// ==========================================
function atualizarInterfaceComLogin(usuario) {
    // Elementos da interface
    const userInfo = document.getElementById('userInfo');
    const userNameSpan = document.getElementById('userName');
    const userCargoSpan = document.getElementById('userCargo');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminLink = document.getElementById('adminLink');
    const criarIdeiaBtn = document.getElementById('criarIdeiaBtn');
    
    if (usuario && usuario.id) {
        // ========== USUÁRIO LOGADO ==========
        if (userInfo) userInfo.style.display = 'flex';
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (userNameSpan) userNameSpan.textContent = usuario.nome;
        if (userCargoSpan) userCargoSpan.textContent = formatarCargo(usuario.cargo);
        
        if (criarIdeiaBtn) criarIdeiaBtn.style.display = 'inline-block';
        
        const isAdmin = usuario.cargo === 'gestor' || usuario.cargo === 'ti_staff';
        if (adminLink) {
            adminLink.style.display = isAdmin ? 'inline-block' : 'none';
        }
        
        // NÃO SALVAR NO LOCALSTORAGE
    } else {
        // ========== USUÁRIO DESLOGADO - FORÇAR ESCONDER TUDO ==========
        if (userInfo) userInfo.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (registerBtn) registerBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (criarIdeiaBtn) criarIdeiaBtn.style.display = 'none';
        if (adminLink) adminLink.style.display = 'none';
        
        // FORÇAR ESCONDER ÁREAS DE IDEIAS
        const authArea = document.getElementById('authArea');
        const ideiaArea = document.getElementById('ideiaArea');
        const minhasIdeiasArea = document.getElementById('minhasIdeiasArea');
        const buscaArea = document.getElementById('buscaArea');
        const notificacaoArea = document.getElementById('notificacaoArea');
        const todasIdeias = document.getElementById('todasIdeias');
        const todasIdeiasHeader = document.querySelector('.todas-ideias-header');
        const dashboardPessoal = document.getElementById('dashboardPessoal');
        
        if (authArea) authArea.style.display = 'block';
        if (ideiaArea) ideiaArea.style.display = 'none';
        if (minhasIdeiasArea) minhasIdeiasArea.style.display = 'none';
        if (buscaArea) buscaArea.style.display = 'none';
        if (notificacaoArea) notificacaoArea.style.display = 'none';
        if (todasIdeias) todasIdeias.style.display = 'none';
        if (todasIdeiasHeader) todasIdeiasHeader.style.display = 'none';
        if (dashboardPessoal) dashboardPessoal.style.display = 'none';
    }
}

// Função auxiliar para formatar cargo
function formatarCargo(cargo) {
    const cargos = {
        'aluno': '👨‍🎓 Aluno',
        'professor': '👨‍🏫 Professor',
        'ti_staff': '🖥️ TI Staff',
        'gestor': '📊 Gestor'
    };
    return cargos[cargo] || cargo;
}

// ========== US23 - NOTIFICAÇÕES POR E-MAIL ==========

async function carregarPreferenciasEmail() {
    if (!usuarioLogado) return;
    
    try {
        const response = await fetch(`/api/preferencias/notificacoes?usuarioId=${usuarioLogado.id}`);
        const data = await response.json();
        
        const btnText = document.getElementById('statusEmailIcon');
        if (btnText) {
            if (data.email_ativado) {
                btnText.innerHTML = '📧 Ativado';
                btnText.parentElement.classList.remove('desativado');
            } else {
                btnText.innerHTML = '📧 Desativado';
                btnText.parentElement.classList.add('desativado');
            }
        }
    } catch (error) {
        console.error('Erro ao carregar preferências:', error);
    }
}

async function toggleNotificacoesEmail() {
    if (!usuarioLogado) {
        alert('Faça login para alterar suas preferências');
        return;
    }
    
    const btnText = document.getElementById('statusEmailIcon');
    const isAtivado = btnText.innerHTML.includes('Ativado');
    const novoEstado = !isAtivado;
    
    try {
        const response = await fetch('/api/preferencias/notificacoes', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuarioId: usuarioLogado.id,
                email_ativado: novoEstado
            })
        });
        
        const data = await response.json();
        
        if (data.sucesso) {
            if (novoEstado) {
                btnText.innerHTML = '📧 Ativado';
                btnText.parentElement.classList.remove('desativado');
                showMessage('✅ Notificações por e-mail ativadas! Você receberá resumos diários.', 'success');
            } else {
                btnText.innerHTML = '📧 Desativado';
                btnText.parentElement.classList.add('desativado');
                showMessage('🔕 Notificações por e-mail desativadas.', 'info');
            }
        } else {
            alert(data.erro);
        }
    } catch (error) {
        console.error('Erro ao alterar preferência:', error);
        alert('Erro ao alterar preferência');
    }
}

async function carregarNotificacoes() {
    if (!usuarioLogado) {
        return;
    }
    
    try {
        const response = await fetch(`/notificacoes/${usuarioLogado.id}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const notificacoes = await response.json();
        
        // Log para debug - ver se há notificações de moderação
        const notifModeracao = notificacoes.filter(n => n.categoria === 'moderacao');
        if (notifModeracao.length > 0) {
            notifModeracao.forEach(n => {
            });
        }
        
        // Atualizar badge
        const naoLidas = notificacoes.filter(n => !n.lida).length;
        const badge = document.getElementById('notificacaoBadge');
        if (badge) {
            badge.textContent = naoLidas;
            badge.style.display = naoLidas > 0 ? 'inline-block' : 'none';
        }
        
        const container = document.getElementById('listaNotificacoes');
        if (!container) {
            console.error('❌ Elemento listaNotificacoes não encontrado');
            return;
        }
        
        if (notificacoes.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>Nenhuma notificação</p></div>';
            return;
        }
        
        container.innerHTML = notificacoes.map(notif => {
            let icone = 'fa-bell';
            let corBorda = '';
            let classeCategoria = '';
            let tituloNotificacao = '';
            
            // Definir ícone, cor e título baseado na categoria
            // Dentro do map das notificações, adicione os novos tipos
if (notif.categoria === 'moderacao') {
    icone = 'fa-gavel';
    corBorda = 'border-left-color: #dc3545;';
    classeCategoria = 'notificacao-moderacao';
    tituloNotificacao = '🛡️ Moderação';
} else if (notif.categoria === 'report_autor') {
    icone = 'fa-flag';
    corBorda = 'border-left-color: #ffc107;';
    classeCategoria = 'notificacao-report-autor';
    tituloNotificacao = '📢 Sua ideia foi denunciada';
} else if (notif.categoria === 'report_admin') {
    icone = 'fa-flag';
    corBorda = 'border-left-color: #dc3545;';
    classeCategoria = 'notificacao-report-admin';
    tituloNotificacao = '🚨 Nova Denúncia';
} else if (notif.categoria === 'conquista') {
    icone = 'fa-trophy';
    corBorda = 'border-left-color: #ffc107;';
    classeCategoria = 'notificacao-conquista';
    tituloNotificacao = '🏆 Nova Conquista!';
} else if (notif.categoria === 'comentario') {
    icone = 'fa-comment';
    corBorda = 'border-left-color: #28a745;';
    classeCategoria = 'notificacao-comentario';
    tituloNotificacao = '💬 Novo Comentário';
} else if (notif.categoria === 'voto') {
    icone = 'fa-thumbs-up';
    corBorda = 'border-left-color: #17a2b8;';
    classeCategoria = 'notificacao-voto';
    tituloNotificacao = '👍 Novo Voto';
}
            
            // Formatar a mensagem (quebrar linhas e dar estilo)
            let mensagemFormatada = notif.mensagem.replace(/\n/g, '<br>');
            
            // Destacar palavras importantes na mensagem de moderação
            if (notif.categoria === 'moderacao') {
                mensagemFormatada = mensagemFormatada
                    .replace(/ADVERTÊNCIA RECEBIDA/g, '<strong style="color: #dc3545;">⚠️ ADVERTÊNCIA RECEBIDA</strong>')
                    .replace(/SUA IDEIA FOI REMOVIDA/g, '<strong style="color: #dc3545;">🚫 SUA IDEIA FOI REMOVIDA</strong>');
            }
            
            return `
                <div class="notificacao-item ${!notif.lida ? 'nao-lida' : ''} ${classeCategoria}" data-id="${notif.id}" style="${corBorda}">
                    <div class="notificacao-conteudo" onclick="marcarNotificacaoLida(${notif.id})">
                        <div class="notificacao-icon">
                            <i class="fas ${icone}"></i>
                        </div>
                        <div class="notificacao-texto">
                            <div class="notificacao-titulo">${tituloNotificacao}</div>
                            <p>${mensagemFormatada}</p>
                            <small><i class="far fa-clock"></i> ${formatarData(notif.data_envio)}</small>
                        </div>
                    </div>
                    <div class="notificacao-acoes">
                        <button onclick="excluirNotificacao(${notif.id})" class="btn-excluir-notificacao" title="Excluir notificação">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Adicionar botão "Marcar todas como lidas" se houver notificações não lidas
        if (naoLidas > 0) {
            const headerRight = document.querySelector('.notificacao-header-right');
            if (headerRight && !document.getElementById('btnMarcarTodas')) {
                const btnTodas = document.createElement('button');
                btnTodas.id = 'btnMarcarTodas';
                btnTodas.className = 'btn-marcar-todas';
                btnTodas.innerHTML = '<i class="fas fa-check-double"></i> Marcar todas';
                btnTodas.onclick = () => marcarTodasNotificacoesLidas();
                headerRight.appendChild(btnTodas);
            }
        } else {
            const btnTodas = document.getElementById('btnMarcarTodas');
            if (btnTodas) btnTodas.remove();
        }
        
        // Mostrar a área de notificações
        const notificacaoArea = document.getElementById('notificacaoArea');
        if (notificacaoArea) {
            notificacaoArea.style.display = 'block';
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar notificações:', error);
        const container = document.getElementById('listaNotificacoes');
        if (container) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar notificações</p><button onclick="carregarNotificacoes()" class="btn-primary" style="margin-top: 10px;">Tentar novamente</button></div>';
        }
    }
}

// Função para marcar todas as notificações como lidas
async function marcarTodasNotificacoesLidas() {
    if (!usuarioLogado) return;
    
    try {
        const response = await fetch(`/notificacoes/marcar-todas-lidas`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId: usuarioLogado.id })
        });
        
        const data = await response.json();
        
        if (data.sucesso) {
            carregarNotificacoes();
            
            // Atualizar badge
            const badge = document.getElementById('notificacaoBadge');
            if (badge) {
                badge.textContent = '0';
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('❌ Erro ao marcar todas:', error);
    }
}

// Função para excluir notificação individual
async function excluirNotificacao(notificacaoId) {
    if (!confirm('Excluir esta notificação?')) return;
    
    try {
        const response = await fetch(`/notificacoes/${notificacaoId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId: usuarioLogado.id })
        });
        
        const data = await response.json();
        
        if (data.sucesso) {
            carregarNotificacoes();
        } else {
            alert(data.erro || 'Erro ao excluir notificação');
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        alert('Erro de conexão');
    }
}

// Função para marcar uma notificação como lida
async function marcarNotificacaoLida(notificacaoId) {
    
    try {
        const response = await fetch(`/notificacoes/${notificacaoId}/marcar-lida`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.sucesso) {
            carregarNotificacoes();
        }
    } catch (error) {
        console.error('❌ Erro:', error);
    }
}

// Função para limpar todas as notificações
async function limparTodasNotificacoes() {
    if (!usuarioLogado) {
        showMessage('Faça login primeiro!', 'error');
        return;
    }
    
    if (!confirm('⚠️ ATENÇÃO: Esta ação irá remover PERMANENTEMENTE todas as suas notificações. Esta operação não pode ser desfeita. Deseja continuar?')) {
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/notificacoes/limpar/todas', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId: usuarioLogado.id })
        });
        
        const data = await response.json();
        
        if (response.ok && data.sucesso) {
            showMessage('✅ Todas as notificações foram limpas!', 'success');
            
            // Limpar a lista visualmente
            const container = document.getElementById('listaNotificacoes');
            if (container) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>Nenhuma notificação</p></div>';
            }
            
            // Resetar badge
            const badge = document.getElementById('notificacaoBadge');
            if (badge) {
                badge.textContent = '0';
                badge.style.display = 'none';
            }
            
            // Recarregar notificações para garantir consistência
            setTimeout(() => {
                carregarNotificacoes();
            }, 500);
            
        } else {
            showMessage(data.erro || 'Erro ao limpar notificações', 'error');
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        showMessage('Erro de conexão ao limpar notificações', 'error');
    } finally {
        showLoading(false);
    }
}

// ========== SISTEMA DE NOTIFICAÇÕES EM TEMPO REAL ==========

let ultimoIdNotificacao = 0;
let intervaloPolling = null;
let somNotificacao = null;

// Inicializar som (opcional)
function initSomNotificacao() {
    somNotificacao = new Audio();
    // Você pode adicionar um arquivo de som real
    // somNotificacao.src = '/sounds/notification.mp3';
}

function tocarSomNotificacao() {
    if (somNotificacao) {
        somNotificacao.play().catch(e => console.log('Som não disponível'));
    }
}

// Mostrar toast de notificação
function mostrarToastNotificacao(notificacao) {
    const toast = document.createElement('div');
    toast.className = `toast-notificacao toast-${notificacao.categoria || 'geral'}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas ${notificacao.icone || 'fa-bell'}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-titulo">${notificacao.categoria === 'conquista' ? '🏆 Nova Conquista!' : '📢 Nova Notificação'}</div>
            <div class="toast-mensagem">${escapeHtml(notificacao.mensagem)}</div>
            <div class="toast-data">${formatarData(notificacao.data_envio)}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(toast);
    
    // Remover após 5 segundos
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 5000);
    
    // Tocar som
    tocarSomNotificacao();
}

// Buscar novas notificações (polling)
async function buscarNovasNotificacoes() {
    if (!usuarioLogado || !usuarioLogado.id) return;
    
    // Usar a variável global
    const ultimoId = ultimaNotificacaoId || 0;
    
    try {
        const idParam = typeof ultimoId === 'number' ? ultimoId : parseInt(ultimoId) || 0;
        
        const response = await fetch(`/notificacoes/novas?usuarioId=${usuarioLogado.id}&ultimoId=${idParam}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.sucesso && data.notificacoes && data.notificacoes.length > 0) {
            // Atualizar o ID mais recente
            ultimaNotificacaoId = data.notificacoes[0].id;
            // ... resto do código
        }
    } catch (error) {
        console.error('❌ Erro ao buscar notificações:', error);
    }
}

// Iniciar polling (buscar a cada 30 segundos)
function iniciarPollingNotificacoes() {
    if (intervaloPolling) clearInterval(intervaloPolling);
    
    // Buscar imediatamente
    buscarNovasNotificacoes();
    
    // Depois a cada 30 segundos
    intervaloPolling = setInterval(() => {
        buscarNovasNotificacoes();
    }, 30000); // 30 segundos
    
}

// Parar polling
function pararPollingNotificacoes() {
    if (intervaloPolling) {
        clearInterval(intervaloPolling);
        intervaloPolling = null;
    }
}

// Atualizar badge das notificações
async function atualizarBadgeNotificacoes() {
    if (!usuarioLogado) return;
    
    try {
        const response = await fetch(`/notificacoes/${usuarioLogado.id}`);
        const notificacoes = await response.json();
        const naoLidas = notificacoes.filter(n => !n.lida).length;
        
        const badge = document.getElementById('notificacaoBadge');
        if (badge) {
            badge.textContent = naoLidas;
            badge.style.display = naoLidas > 0 ? 'inline-block' : 'none';
        }
    } catch (error) {
        console.error('Erro ao atualizar badge:', error);
    }
}

// Marcar todas as notificações como lidas
async function marcarTodasNotificacoesLidas() {
    if (!usuarioLogado) return;
    
    try {
        const response = await fetch('/notificacoes/marcar-todas-lidas', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId: usuarioLogado.id })
        });
        
        const data = await response.json();
        
        if (data.sucesso) {
            carregarNotificacoes();
            atualizarBadgeNotificacoes();
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

// Sobrescrever a função carregarNotificacoes existente
async function carregarNotificacoes() {
    if (!usuarioLogado) return;
    
    try {
        const response = await fetch(`/notificacoes/${usuarioLogado.id}`);
        const notificacoes = await response.json();
        
        const naoLidas = notificacoes.filter(n => !n.lida).length;
        const badge = document.getElementById('notificacaoBadge');
        if (badge) {
            badge.textContent = naoLidas;
            badge.style.display = naoLidas > 0 ? 'inline-block' : 'none';
        }
        
        const container = document.getElementById('listaNotificacoes');
        if (!container) return;
        
        if (notificacoes.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhuma notificação</div>';
            return;
        }
        
        // Atualizar último ID conhecido
        if (notificacoes.length > 0) {
            ultimoIdNotificacao = Math.max(...notificacoes.map(n => n.id));
        }
        
        container.innerHTML = notificacoes.map(notif => {
            const icone = notif.categoria === 'comentario' ? 'fa-comment' :
                         notif.categoria === 'voto' ? 'fa-thumbs-up' :
                         notif.categoria === 'conquista' ? 'fa-trophy' :
                         notif.categoria === 'conversao' ? 'fa-project-diagram' : 'fa-bell';
            
            return `
                <div class="notificacao-item ${!notif.lida ? 'nao-lida' : ''}" data-id="${notif.id}">
                    <div class="notificacao-conteudo" onclick="marcarNotificacaoLida(${notif.id})">
                        <div class="notificacao-icon"><i class="fas ${icone}"></i></div>
                        <div class="notificacao-texto">
                            <p>${escapeHtml(notif.mensagem)}</p>
                            <small>${formatarData(notif.data_envio)}</small>
                        </div>
                    </div>
                    <div class="notificacao-acoes">
                        <button onclick="excluirNotificacao(${notif.id})" class="btn-excluir-notificacao" title="Excluir">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function fazerLogin() {
    const email = document.getElementById('loginEmail')?.value.trim();
    const senha = document.getElementById('loginSenha')?.value;
    
    if (!email && !senha) {
        showMessage('❌ Todos os campos estão vazios!', 'error');
        return;
    }
    
    if (!email) {
        showMessage('📧 Digite seu email para continuar.', 'error');
        return;
    }
    
    if (!senha) {
        showMessage('🔐 Digite sua senha para continuar.', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha }),
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (response.ok && data.sucesso) {
            usuarioLogado = data.usuario;
            
            // Salvar no sessionStorage
            sessionStorage.setItem('ideaHubUser', JSON.stringify({
                id: usuarioLogado.id,
                nome: usuarioLogado.nome,
                cargo: usuarioLogado.cargo
            }));
            
            showMessage(`✅ Bem-vindo, ${usuarioLogado.nome}!`, 'success');
            
            // ========== ATUALIZAR INTERFACE DIRETAMENTE ==========
            // Mostrar nome do usuário
            document.getElementById('userName').textContent = usuarioLogado.nome;
            
            // Mostrar badge do cargo
            const cargoBadge = document.getElementById('userCargoBadge');
            if (cargoBadge) {
                cargoBadge.className = `cargo-badge ${usuarioLogado.cargo}`;
                cargoBadge.textContent = getCargoText(usuarioLogado.cargo);
            }
            
            // Mostrar links de admin e projetos
            const isAdmin = usuarioLogado.cargo === 'gestor' || usuarioLogado.cargo === 'ti_staff';
            const adminLink = document.getElementById('adminLink');
            const projetosLink = document.getElementById('projetosLink');
            
            if (adminLink) adminLink.style.display = isAdmin ? 'inline-block' : 'none';
            if (projetosLink) projetosLink.style.display = isAdmin ? 'inline-block' : 'none';
            
            // Esconder área de login e mostrar áreas logadas
            document.getElementById('authArea').style.display = 'none';
            document.getElementById('ideiaArea').style.display = 'block';
            document.getElementById('buscaArea').style.display = 'block';
            document.getElementById('notificacaoArea').style.display = 'block';
            document.getElementById('minhasIdeiasArea').style.display = 'block';
            document.getElementById('todasIdeias').style.display = 'grid';
            
            // Mostrar header das ideias da comunidade
            const todasIdeiasHeader = document.querySelector('.todas-ideias-header');
            if (todasIdeiasHeader) todasIdeiasHeader.style.display = 'block';
            
            // Mostrar seções de conquistas
            const conquistasSection = document.getElementById('conquistasSection');
            const conquistasDisponiveisSection = document.getElementById('conquistasDisponiveisSection');
            
            if (conquistasSection) conquistasSection.style.display = 'block';
            if (conquistasDisponiveisSection) conquistasDisponiveisSection.style.display = 'block';
            
            // Esconder mensagens de login
            const mensagemMinhasIdeias = document.getElementById('mensagemMinhasIdeias');
            const mensagemTodasIdeias = document.getElementById('mensagemTodasIdeias');
            if (mensagemMinhasIdeias) mensagemMinhasIdeias.style.display = 'none';
            if (mensagemTodasIdeias) mensagemTodasIdeias.style.display = 'none';
            
            // Mostrar paginação
            const paginacaoTodas = document.getElementById('paginacaoTodasIdeias');
            const paginacaoMinhas = document.getElementById('paginacaoMinhasIdeias');
            if (paginacaoTodas) paginacaoTodas.style.display = 'block';
            if (paginacaoMinhas) paginacaoMinhas.style.display = 'block';
            
            // Mostrar filtro de visualização
            const filtroVisualizacao = document.querySelector('.filtro-visualizacao');
            if (filtroVisualizacao) filtroVisualizacao.style.display = 'flex';
            
            // Carregar dados
            await carregarCategorias();
            await carregarLocais();
            await carregarIdeias();
            await carregarMinhasIdeias();
            await carregarNotificacoes();
            iniciarPollingNotificacoes();
            await carregarConquistas();
            await carregarConquistasDisponiveis();
            carregarEstadoConquistas();
            
            if (typeof carregarDashboardPessoal === 'function') {
                await carregarDashboardPessoal();
            }
            
        } else {
            showMessage(data.mensagem || data.erro || '❌ Email ou senha incorretos!', 'error');
            document.getElementById('loginSenha').value = '';
        }
    } catch (error) {
        console.error('❌ Erro no login:', error);
        showMessage('⚠️ Erro de conexão! Tente novamente.', 'error');
    } finally {
        showLoading(false);
    }
}

async function carregarNivelUsuario() {
    const usuario = JSON.parse(localStorage.getItem('ideaHubToken'));
    if (!usuario) return;
    try {
        const response = await fetch(`/api/usuario/perfil/${usuario.id}`);
        const data = await response.json();
        document.getElementById('nivelValor').innerText = data.usuario.nivel;
        document.getElementById('pontosValor').innerText = data.usuario.pontos_totais;
        document.getElementById('badgeNivel').style.display = 'inline-flex'; // ou 'inline-block'
    } catch (err) {
        console.error('Erro ao carregar nível:', err);
    }
}

function fazerLogout() {
    if (typeof pararPollingNotificacoes === 'function') {
        pararPollingNotificacoes();
    }
    
    usuarioLogado = null;
    
    // ✅ Limpar sessionStorage
    sessionStorage.removeItem('ideaHubUser');
    sessionStorage.clear();
    
    console.log('🔒 Logout realizado');
    
    // Recarregar a página para mostrar modo visitante
    window.location.reload();
}

// ==================== CATEGORIAS ====================
async function carregarCategorias() {

    try {
        const response = await fetch('/categorias');
        const categorias = await response.json();
        
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
        console.error('❌ Erro:', error);
    }
}

async function carregarLocais() {
    try {
        const response = await fetch('/api/locais');
        if (!response.ok) throw new Error('Erro ao buscar locais');
        const locais = await response.json();
        const selectCadastro = document.getElementById('localCadastro');
        const selectFiltro = document.getElementById('localFilter');
        
        if (selectCadastro) {
            let opcoes = '<option value="">📍 Selecione um local (opcional)</option>';
            locais.forEach(local => {
                opcoes += `<option value="${local.id}">📍 ${escapeHtml(local.nome)}</option>`;
            });
            selectCadastro.innerHTML = opcoes;
        }
        
        if (selectFiltro) {
            let opcoesFiltro = '<option value="todos">📍 Todos os locais</option>';
            locais.forEach(local => {
                opcoesFiltro += `<option value="${local.id}">📍 ${escapeHtml(local.nome)}</option>`;
            });
            selectFiltro.innerHTML = opcoesFiltro;
        }
    } catch (error) {
        console.error('Erro ao carregar locais:', error);
    }
}

let tipoImagemAtual = 'link'; // 'link' ou 'upload'

function toggleImagemTipo() {
    const btn = document.getElementById('btnTipoImagem');
    const uploadDiv = document.getElementById('uploadImagemDiv');
    const linkDiv = document.getElementById('linkImagemDiv');
    
    if (tipoImagemAtual === 'link') {
        tipoImagemAtual = 'upload';
        btn.innerHTML = '🔗 Usar Link';
        uploadDiv.style.display = 'block';
        linkDiv.style.display = 'none';
    } else {
        tipoImagemAtual = 'link';
        btn.innerHTML = '📷 Fazer Upload';
        uploadDiv.style.display = 'none';
        linkDiv.style.display = 'block';
    }
}

// Carregar templates disponíveis
async function carregarTemplates() {
    try {
        const response = await fetch('/api/templates');
        const templates = await response.json();
        const container = document.getElementById('listaTemplates');
        if (!container) return;
        
        if (!templates || templates.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhum template disponível no momento.</div>';
            return;
        }
        
        container.innerHTML = templates.map(tpl => `
            <div class="template-card" style="background: #f8fafc; border-radius: 12px; padding: 15px; cursor: pointer;" onclick="previsualizarTemplate(${tpl.id})">
                <div style="display: flex; justify-content: space-between;">
                    <strong>${escapeHtml(tpl.titulo)}</strong>
                    ${tpl.recomendado ? '<span style="background: #fbbf24; padding: 2px 8px; border-radius: 20px; font-size: 11px;">⭐ Recomendado</span>' : ''}
                </div>
                <p style="margin: 8px 0; font-size: 13px; color: #666;">${escapeHtml(tpl.descricao.substring(0, 80))}...</p>
                <div style="display: flex; justify-content: space-between; font-size: 12px; color: #888;">
                    <span><i class="fas fa-tag"></i> ${escapeHtml(tpl.categoria_nome || tpl.categoria)}</span>
                    <span><i class="fas fa-chart-line"></i> ${tpl.total_usos || 0} usos</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar templates:', error);
    }
}

let templateSelecionado = null;

async function previsualizarTemplate(templateId) {
    
    try {
        const response = await fetch(`/api/templates/${templateId}`);
        if (!response.ok) throw new Error('Template não encontrado');
        
        const template = await response.json();
        
        const previewDiv = document.getElementById('previewContent');
        if (!previewDiv) {
            console.error('❌ Elemento previewContent não encontrado no DOM');
            alert('Erro ao abrir pré-visualização. Contate o administrador.');
            return;
        }
        
        // Montar HTML da pré-visualização
        let html = `
            <h4 style="color: #2d3748; margin-bottom: 15px;">${escapeHtml(template.titulo)}</h4>
            <p><strong><i class="fas fa-tag"></i> Categoria:</strong> ${escapeHtml(template.categoria)}</p>
            <p><strong><i class="fas fa-align-left"></i> Descrição:</strong> ${escapeHtml(template.descricao)}</p>
        `;
        
        if (template.campos_json && Array.isArray(template.campos_json)) {
            html += `<div style="margin-top: 15px;"><strong><i class="fas fa-list"></i> Estrutura do Template:</strong>
                        <ul style="margin-top: 10px; margin-left: 20px;">`;
            template.campos_json.forEach(campo => {
                html += `<li><strong>${escapeHtml(campo.nome)}:</strong> ${escapeHtml(campo.placeholder || '')}</li>`;
            });
            html += `</ul></div>`;
        }
        
        previewDiv.innerHTML = html;
        
        // Guardar o template atual para usar depois
        window.templateAtual = template;
        
        // Abrir modal
        const modal = document.getElementById('modalPrevisualizacao');
        if (modal) {
            modal.style.display = 'flex';
        } else {
            console.error('❌ Modal de pré-visualização não encontrado');
            alert('Erro ao abrir pré-visualização');
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar preview:', error);
        alert('Erro ao carregar pré-visualização: ' + error.message);
    }
}

// Aplicar template ao formulário
document.getElementById('btnAplicarTemplate')?.addEventListener('click', () => {
    if (!templateSelecionado) return;
    
    // Preencher título
    document.getElementById('titulo').value = templateSelecionado.titulo;
    
    // Construir descrição estruturada
    const campos = templateSelecionado.campos_json || [];
    let descricaoEstruturada = templateSelecionado.descricao + '\n\n--- Template ---\n';
    for (const campo of campos) {
        descricaoEstruturada += `\n**${campo.nome}:** ${campo.placeholder || ''}\n`;
    }
    document.getElementById('descricao').value = descricaoEstruturada;
    
    // Fechar modais
    fecharModal('modalPreviewTemplate');
    fecharModal('modalTemplates');
    
    showMessage('✅ Template aplicado! Complete os campos e publique sua ideia.', 'success');
    
    // Registrar uso do template (chamada assíncrona)
    fetch(`/api/templates/${templateSelecionado.id}/usar`, { method: 'POST' }).catch(console.error);
});

function abrirGaleriaTemplates() {
    carregarTemplates();
    document.getElementById('modalTemplates').style.display = 'flex';
}

async function aplicarTemplate(templateId) {
    if (!templateId) {
        alert('ID do template inválido');
        return;
    }
    
    // Guarda o ID do template para incrementar o contador depois
    templateAtualId = templateId;   // <-- 2.1
    
    showLoading(true);
    try {
        const response = await fetch(`/api/templates/${templateId}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const template = await response.json();
        
        // Verificar se o template tem os campos esperados
        if (!template.titulo) {
            throw new Error('Template sem título');
        }
        
        // Preencher título
        const tituloInput = document.getElementById('titulo');
        if (tituloInput) tituloInput.value = template.titulo;
        
        // Preencher descrição (formato texto)
        let descricaoTexto = '';
        if (template.campos_json && Array.isArray(template.campos_json)) {
            descricaoTexto = template.campos_json.map(campo => 
                `📌 ${campo.nome}: ${campo.placeholder || ''}\n\n`
            ).join('');
        } else {
            descricaoTexto = template.descricao || '';
        }
        
        const descricaoInput = document.getElementById('descricao');
        if (descricaoInput) descricaoInput.value = descricaoTexto;
        
        // Fechar modais (se existirem)
        const modalTemplates = document.getElementById('modalTemplates');
        const modalPrevis = document.getElementById('modalPrevisualizacao');
        if (modalTemplates) modalTemplates.style.display = 'none';
        if (modalPrevis) modalPrevis.style.display = 'none';
        
        showMessage(`✅ Template "${template.titulo}" aplicado! Edite se necessário.`, 'success');
        
    } catch (error) {
        console.error('❌ Erro detalhado:', error);
        alert(`Erro ao carregar template: ${error.message}`);
        // Se houve erro, não deve contar como uso do template
        templateAtualId = null;
    } finally {
        showLoading(false);
    }
}

function aplicarTemplateAtual() {
    if (window.templateAtual) {
        aplicarTemplate(window.templateAtual.id);
        fecharModal('modalPrevisualizacao');
    } else {
        alert('Nenhum template selecionado');
    }
}

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Pré-visualização da imagem selecionada
document.getElementById('imagemArquivo')?.addEventListener('change', function(e) {
    const preview = document.getElementById('previewImagem');
    if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = function(loadEvent) {
            preview.innerHTML = `<img src="${loadEvent.target.result}" style="max-width: 200px; max-height: 150px; border-radius: 8px;">`;
        };
        reader.readAsDataURL(e.target.files[0]);
    } else {
        preview.innerHTML = '';
    }
});

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
    const id_local = document.getElementById('localCadastro')?.value || null;
    
    if (!titulo) return showMessage('❌ Digite um título!', 'error');
    if (!descricao) return showMessage('❌ Digite uma descrição!', 'error');
    if (!categoria_id) return showMessage('❌ Selecione uma categoria!', 'error');
    
    showLoading(true);
    
    try {
        const formData = new FormData();
        const items = document.querySelectorAll('.imagem-item');
        let temUpload = false;
        let errosTamanho = false;
        
        for (const item of items) {
            const fileInput = item.querySelector('.imagem-arquivo');
            if (fileInput.files && fileInput.files[0]) {
                const fileSize = fileInput.files[0].size;
                const maxSizeBytes = 5 * 1024 * 1024;
                if (fileSize > maxSizeBytes) {
                    errosTamanho = true;
                    showMessage(`❌ Uma das imagens excede 5MB! Por favor, escolha imagens menores.`, 'error');
                    break;
                }
                formData.append('imagens', fileInput.files[0]);
                temUpload = true;
            }
        }
        
        if (errosTamanho) {
            showLoading(false);
            return;
        }
        
        let imagensUrls = [];
        
        if (temUpload) {
            const uploadResponse = await fetch('/upload/imagens', {
                method: 'POST',
                body: formData
            });
            const uploadData = await uploadResponse.json();
            if (uploadData.sucesso) {
                imagensUrls = uploadData.urls;
            } else {
                showMessage(uploadData.erro || 'Erro no upload', 'error');
                showLoading(false);
                return;
            }
        }
        
        for (const item of items) {
            const linkInput = item.querySelector('.imagem-link');
            if (linkInput && linkInput.value.trim()) {
                imagensUrls.push(linkInput.value.trim());
            }
        }
        
        let capaIndex = -1;
        const radios = document.querySelectorAll('input[name="capa"]');
        for (let i = 0; i < radios.length; i++) {
            if (radios[i].checked) {
                capaIndex = parseInt(radios[i].value);
                break;
            }
        }
        if (capaIndex === -1 && imagensUrls.length > 0) {
            capaIndex = 0;
        }
        
        const response = await fetch('/ideias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                titulo,
                descricao,
                categoria_id: parseInt(categoria_id),
                id_usuario: usuarioLogado.id,
                anonima,
                imagens_urls: imagensUrls.slice(0, 10),
                capa_index: capaIndex,
                id_local: id_local
            })
        });
        
        const data = await response.json();
        
        if (data.sucesso) {
            showMessage('✅ Ideia publicada com sucesso!', 'success');
            
            // ========== INCREMENTAR USO DO TEMPLATE (2.2) ==========
            if (templateAtualId) {
                try {
                    await fetch(`/api/templates/${templateAtualId}/usar`, { method: 'POST' });
                } catch (err) {
                    console.error('❌ Erro ao incrementar uso do template:', err);
                } finally {
                    templateAtualId = null; // resetar
                }
            }
            // =======================================================
            
            // Limpar formulário
            document.getElementById('titulo').value = '';
            document.getElementById('descricao').value = '';
            document.getElementById('categoriaCadastro').value = '';
            document.getElementById('anonima').checked = false;
            document.getElementById('imagensContainer').innerHTML = '';
            totalImagens = 0;
            capaSelecionada = 0;
            atualizarContador();
            
            paginaAtual = 1;
            carregarIdeias();
            carregarMinhasIdeias();
        } else {
            showMessage(data.erro || 'Erro ao publicar', 'error');
            // Se houve erro, não deve contar uso; reseta o ID mesmo assim
            templateAtualId = null;
        }
    } catch (error) {
        console.error('Erro ao enviar ideia:', error);
        showMessage('Erro de conexão', 'error');
        templateAtualId = null;
    } finally {
        showLoading(false);
    }
}

// ========== US22 - DASHBOARD PESSOAL ==========
let graficoEvolucao = null;

// ========== US22 - DASHBOARD PESSOAL ==========
async function carregarDashboardPessoal() {
    if (!usuarioLogado) {
        console.log('🔒 Bloqueado: Usuário não logado - dashboard não será carregado');
        return;
    }
    
    try {
        const periodoMeses = document.getElementById('dashboardPeriodo')?.value || 12;
        const response = await fetch(`/api/dashboard/pessoal?meses=${periodoMeses}&usuarioId=${usuarioLogado.id}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Atualizar cards
        document.getElementById('totalIdeiasUser').textContent = data.totalIdeias || 0;
        document.getElementById('ideiasAprovadasUser').textContent = data.ideiasAprovadas || 0;
        document.getElementById('ideiasConvertidasUser').textContent = data.ideiasConvertidas || 0;
        document.getElementById('votosRecebidosUser').textContent = data.votosRecebidos || 0;
        document.getElementById('comentariosFeitosUser').textContent = data.comentariosFeitos || 0;
        document.getElementById('pontosUser').textContent = data.pontosTotais || 0;
        
        // Mostrar a seção
        const dashboardDiv = document.getElementById('dashboardPessoal');
        if (dashboardDiv) {
            dashboardDiv.style.display = 'block';
        }
        
        // Gráfico
        if (typeof Chart !== 'undefined') {
            const ctx = document.getElementById('graficoEvolucaoIdeias')?.getContext('2d');
            if (ctx) {
                if (window.graficoEvolucao) window.graficoEvolucao.destroy();
                
                if (data.evolucao && data.evolucao.length > 0) {
                    window.graficoEvolucao = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: data.evolucao.map(function(e) { return e.mes; }),
                            datasets: [{
                                label: 'Ideias Criadas',
                                data: data.evolucao.map(function(e) { return e.total; }),
                                borderColor: '#667eea',
                                backgroundColor: 'rgba(102,126,234,0.1)',
                                borderWidth: 2,
                                fill: true,
                                tension: 0.3,
                                pointBackgroundColor: '#667eea',
                                pointBorderColor: '#fff',
                                pointRadius: 4,
                                pointHoverRadius: 6
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: {
                                legend: {
                                    position: 'top'
                                },
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            return context.raw + ' ideia(s)';
                                        }
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    stepSize: 1,
                                    ticks: {
                                        stepSize: 1,
                                        precision: 0,
                                        callback: function(value) {
                                            if (Number.isInteger(value)) {
                                                return value;
                                            }
                                            return null;
                                        }
                                    },
                                    title: {
                                        display: true,
                                        text: 'Quantidade de Ideias',
                                        font: {
                                            size: 12
                                        }
                                    }
                                },
                                x: {
                                    title: {
                                        display: true,
                                        text: 'Mês',
                                        font: {
                                            size: 12
                                        }
                                    },
                                    ticks: {
                                        maxRotation: 45,
                                        minRotation: 45
                                    }
                                }
                            }
                        }
                    });
                } else {
                    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                    ctx.font = '14px Arial';
                    ctx.fillStyle = '#999';
                    ctx.textAlign = 'center';
                    ctx.fillText('Nenhuma ideia criada no período', ctx.canvas.width / 2, ctx.canvas.height / 2);
                }
            }
        }
        
        // Sugestões
        const sugestoesContainer = document.getElementById('sugestoesPersonalizadas');
        if (sugestoesContainer) {
            if (data.sugestoes && data.sugestoes.length > 0) {
                sugestoesContainer.innerHTML = data.sugestoes.map(sug => `
                    <div class="sugestao-item">
                        <i class="fas ${sug.icone || 'fa-lightbulb'}"></i>
                        <span>${sug.mensagem}</span>
                    </div>
                `).join('');
            } else {
                sugestoesContainer.innerHTML = '<div class="sugestao-item"><i class="fas fa-check-circle"></i> <span>Continue participando! Você está no caminho certo.</span></div>';
            }
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar dashboard pessoal:', error);
    }
}

async function carregarIdeias(pagina = 1, orderByParam = null) {
    if (!usuarioLogado) {
        console.log('🔒 Bloqueado: Usuário não logado não pode ver ideias');
        return;
    }

    showLoading(true);
    
    try {
        const isAdmin = usuarioLogado && (usuarioLogado.cargo === 'gestor' || usuarioLogado.cargo === 'ti_staff');
        const orderBy = orderByParam || filtrosAtuais.orderBy || 'votos';
        
        let url = `/ideias?orderBy=${orderBy}&isAdmin=${isAdmin}`;
        
        const temFiltro = filtrosAtuais.q || (filtrosAtuais.categoria_id !== 'todos') || (filtrosAtuais.local_id && filtrosAtuais.local_id !== 'todos');
        if (temFiltro) {
            url = `/ideias/buscar?orderBy=${orderBy}&isAdmin=${isAdmin}`;
            if (filtrosAtuais.q && filtrosAtuais.q !== '') {
                url += `&q=${encodeURIComponent(filtrosAtuais.q)}`;
            }
            if (filtrosAtuais.categoria_id && filtrosAtuais.categoria_id !== 'todos' && filtrosAtuais.categoria_id !== 'undefined') {
                url += `&categoria_id=${filtrosAtuais.categoria_id}`;
            }
            if (filtrosAtuais.local_id && filtrosAtuais.local_id !== 'todos') {
                url += `&local_id=${filtrosAtuais.local_id}`;
            }
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        let ideias = await response.json();
        
        if (!Array.isArray(ideias)) {
            if (ideias.ideias && Array.isArray(ideias.ideias)) {
                ideias = ideias.ideias;
            } else {
                ideias = [];
            }
        }
        
        // Armazenar em cache
        todasIdeiasCache = ideias;
        paginaAtualTodas = pagina;
        
        const start = (pagina - 1) * ITENS_POR_PAGINA;
        const end = start + ITENS_POR_PAGINA;
        const ideiasPaginadas = ideias.slice(start, end);
        
        const container = document.getElementById('todasIdeias');
        
        if (!ideias || ideias.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 48px; margin-bottom: 15px;">🔍</div>
                    <h3>Nenhuma ideia encontrada</h3>
                    <p>${filtrosAtuais.q ? `Não encontramos nada para "${filtrosAtuais.q}"` : 'Seja o primeiro a compartilhar uma ideia!'}</p>
                </div>
            `;
            renderizarPaginacaoTodasIdeias(0);
            showLoading(false);
            return;
        }
        
        renderizarTodasIdeias(ideiasPaginadas);
        renderizarPaginacaoTodasIdeias(ideias.length);
        
    } catch (error) {
        console.error('❌ Erro ao carregar ideias:', error);
        const container = document.getElementById('todasIdeias');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 48px;">⚠️</div>
                    <h3>Erro ao carregar ideias</h3>
                    <p>${error.message}</p>
                    <button onclick="carregarIdeias()" class="btn-primary" style="margin-top: 15px;">Tentar novamente</button>
                </div>
            `;
        }
    } finally {
        showLoading(false);
    }
}

function renderizarTodasIdeias(ideias) {
    const container = document.getElementById('todasIdeias');
    
    if (!ideias || ideias.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhuma ideia nesta página</div>';
        return;
    }
    
    container.innerHTML = ideias.map(ideia => {
        const votos = ideia.total_votos || 0;
        const totalImagens = ideia.total_imagens || 0;
        const totalComentarios = ideia.total_comentarios || 0;
        const isAdminView = usuarioLogado && (usuarioLogado.cargo === 'gestor' || usuarioLogado.cargo === 'ti_staff');
        const autorNome = isAdminView ? ideia.autor_nome : (ideia.anonima ? 'Anônimo' : ideia.autor_nome);
        
        let badgeEditada = '';
        if (ideia.total_versoes && ideia.total_versoes > 0) {
            badgeEditada = `<span class="badge-editada"><i class="fas fa-pen-fancy"></i> Editada</span>`;
        }
        
        let localHtml = '';
        if (ideia.local_nome && ideia.local_nome !== 'null') {
            localHtml = `<span class="local-tag"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(ideia.local_nome)}</span>`;
        }
        
        let statusBadge = '';
        if (ideia.status === 'aprovada') {
            statusBadge = '<span class="status-badge status-aprovada">✅ Aprovada</span>';
        } else if (ideia.status === 'convertida') {
            statusBadge = '<span class="status-badge status-convertida">🚀 Convertida</span>';
        } else if (ideia.status === 'pendente') {
            statusBadge = '<span class="status-badge status-pendente">⏳ Pendente</span>';
        }
        
        let imagensIcon = totalImagens > 0 ? `<span class="imagens-count">📷 ${totalImagens}</span>` : '';
        let comentariosIcon = `<span class="comentarios-count">💬 ${totalComentarios}</span>`;
        
        let imagemHtml = '';
        if (ideia.imagem_principal && ideia.imagem_principal !== 'null') {
            imagemHtml = `
                <div class="ideia-imagem" onclick="verIdeia(${ideia.id})">
                    <img src="${ideia.imagem_principal}" alt="${escapeHtml(ideia.titulo)}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 10px; cursor: pointer;">
                </div>
            `;
        }
        
        return `
            <div class="ideia-card" data-id="${ideia.id}">
                ${imagemHtml}
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <h3 onclick="verIdeia(${ideia.id})" style="cursor: pointer;">${escapeHtml(ideia.titulo)}</h3>
                    <div style="display: flex; gap: 8px;">
                        ${statusBadge}
                        ${badgeEditada}
                    </div>
                </div>
                <p>${escapeHtml(ideia.descricao ? ideia.descricao.substring(0, 150) : '')}${ideia.descricao && ideia.descricao.length > 150 ? '...' : ''}</p>
                
                <div class="ideia-meta">
                    <div class="meta-linha">
                        <span>📅 ${formatarData(ideia.data_publicacao)}</span>
                        <span>👤 ${escapeHtml(autorNome)}</span>
                    </div>
                    ${localHtml ? `<div class="meta-linha">${localHtml}</div>` : ''}
                    <div class="meta-linha">
                        <span class="votos-count">👍 ${votos} ${votos === 1 ? 'voto' : 'votos'}</span>
                        ${comentariosIcon}
                        <span class="categoria">${ideia.categoria_icone || '📁'} ${escapeHtml(ideia.categoria_nome || 'Sem categoria')}</span>
                        ${imagensIcon}
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button onclick="verIdeia(${ideia.id})" class="btn-detalhes-minhas-ideias">
                        <i class="fas fa-eye"></i> Ver detalhes
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderizarPaginacaoTodasIdeias(totalItens) {
    const totalPaginas = Math.ceil(totalItens / ITENS_POR_PAGINA);
    const container = document.getElementById('paginacaoTodasIdeias');
    
    if (!container) return;
    
    if (totalPaginas <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div class="pagination-controls">';
    
    // Botão Anterior
    html += `<button class="page-btn" onclick="carregarIdeias(${paginaAtualTodas - 1})" ${paginaAtualTodas === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i> Anterior
            </button>`;
    
    // Números das páginas
    for (let i = 1; i <= totalPaginas; i++) {
        if (i === 1 || i === totalPaginas || (i >= paginaAtualTodas - 2 && i <= paginaAtualTodas + 2)) {
            html += `<button class="page-btn ${i === paginaAtualTodas ? 'active' : ''}" onclick="carregarIdeias(${i})">
                        ${i}
                    </button>`;
        } else if (i === paginaAtualTodas - 3 || i === paginaAtualTodas + 3) {
            html += `<span class="page-dots">...</span>`;
        }
    }
    
    // Botão Próximo
    html += `<button class="page-btn" onclick="carregarIdeias(${paginaAtualTodas + 1})" ${paginaAtualTodas === totalPaginas ? 'disabled' : ''}>
                Próximo <i class="fas fa-chevron-right"></i>
            </button>`;
    
    html += '</div>';
    container.innerHTML = html;
}

// ✅ FUNÇÃO CORRETA - USANDO SESSIONSTORAGE
function restaurarSessao() {
    const userSalvo = sessionStorage.getItem('ideaHubUser');
    
    console.log('🔍 Verificando sessão salva:', userSalvo);
    
    if (userSalvo) {
        try {
            usuarioLogado = JSON.parse(userSalvo);
            console.log('✅ Sessão restaurada:', usuarioLogado);
            
            // Atualizar interface
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
            document.getElementById('buscaArea').style.display = 'block';
            document.getElementById('notificacaoArea').style.display = 'block';
            document.getElementById('minhasIdeiasArea').style.display = 'block';
            document.getElementById('todasIdeias').style.display = 'grid';
            
            const todasIdeiasHeader = document.querySelector('.todas-ideias-header');
            if (todasIdeiasHeader) todasIdeiasHeader.style.display = 'block';
            
            const conquistasSection = document.getElementById('conquistasSection');
            const conquistasDisponiveisSection = document.getElementById('conquistasDisponiveisSection');
            
            if (conquistasSection) conquistasSection.style.display = 'block';
            if (conquistasDisponiveisSection) conquistasDisponiveisSection.style.display = 'block';
            
            const mensagemMinhasIdeias = document.getElementById('mensagemMinhasIdeias');
            const mensagemTodasIdeias = document.getElementById('mensagemTodasIdeias');
            if (mensagemMinhasIdeias) mensagemMinhasIdeias.style.display = 'none';
            if (mensagemTodasIdeias) mensagemTodasIdeias.style.display = 'none';
            
            const paginacaoTodas = document.getElementById('paginacaoTodasIdeias');
            const paginacaoMinhas = document.getElementById('paginacaoMinhasIdeias');
            if (paginacaoTodas) paginacaoTodas.style.display = 'block';
            if (paginacaoMinhas) paginacaoMinhas.style.display = 'block';
            
            const filtroVisualizacao = document.querySelector('.filtro-visualizacao');
            if (filtroVisualizacao) filtroVisualizacao.style.display = 'flex';
            
            // Carregar dados
            carregarCategorias();
            carregarLocais();
            carregarIdeias();
            carregarMinhasIdeias();
            carregarNotificacoes();
            iniciarPollingNotificacoes();
            carregarConquistas();
            carregarConquistasDisponiveis();
            carregarEstadoConquistas();
            
            if (typeof carregarDashboardPessoal === 'function') {
                carregarDashboardPessoal();
            }
            
            return true;
        } catch(e) {
            console.error('❌ Erro ao restaurar sessão:', e);
            return false;
        }
    }
    return false;
}

function mudarOrdenacao() {
    if (!usuarioLogado) {
        showMessage('Faça login para ordenar as ideias!', 'warning');
        return;
    }
    const orderBy = document.getElementById('orderBy').value;
    
    filtrosAtuais.orderBy = orderBy;
    paginaAtualTodas = 1; // Resetar para primeira página
    carregarIdeias(1, orderBy);
    
    let mensagem = '';
    switch(orderBy) {
        case 'votos':
            mensagem = '📊 Ordenando por mais votados';
            break;
        case 'data':
            mensagem = '🕒 Ordenando por mais recentes';
            break;
        case 'aprovadas':
            mensagem = '✅ Mostrando apenas ideias aprovadas';
            break;
        case 'convertidas':
            mensagem = '🚀 Mostrando apenas ideias convertidas em projetos';
            break;
        default:
            mensagem = 'Ordenação alterada';
    }
    showMessage(mensagem, 'success');
}

function buscarIdeias() {
    if (!usuarioLogado) {
        showMessage('Faça login para buscar ideias!', 'warning');
        return;
    }
    const searchText = document.getElementById('searchInput')?.value.trim() || '';
    const categoriaId = document.getElementById('categoriaFilter')?.value || 'todos';
    const orderByValue = document.getElementById('orderBy')?.value || 'votos';
    const localId = document.getElementById('localFilter')?.value || 'todos';
    
    filtrosAtuais.q = searchText;
    filtrosAtuais.categoria_id = categoriaId;
    filtrosAtuais.orderBy = orderByValue;
    filtrosAtuais.local_id = localId;
    paginaAtualTodas = 1; // Resetar para primeira página
    
    carregarIdeias(1);
}

function limparFiltros() {
    if (!usuarioLogado) {
        showMessage('Faça login para limpar os filtros!', 'warning');
        return;
    }
    document.getElementById('searchInput').value = '';
    document.getElementById('categoriaFilter').value = 'todos';
    document.getElementById('orderBy').value = 'votos';
    filtrosAtuais = { q: '', categoria_id: 'todos', autor: 'todos', orderBy: 'votos' };
    paginaAtual = 1;
    carregarIdeias();
    showMessage('✅ Filtros limpos!', 'success');
}

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

function getStatusText(status) {
    const statusMap = {
        'pendente': '⏳ Pendente',
        'aprovada': '✅ Aprovada',
        'convertida': '🚀 Convertida',
        'rejeitada': '❌ Rejeitada'
    };
    return statusMap[status] || status;
}

function testarConquistas() {
    
    // Verificar elementos
    const conquistasSection = document.getElementById('conquistasSection');
    const conquistasDisponiveisSection = document.getElementById('conquistasDisponiveisSection');
    const conquistasList = document.getElementById('conquistasList');
    
    // Forçar exibição
    if (conquistasSection) {
        conquistasSection.style.display = 'block';
        conquistasSection.style.background = '#f8fafc';
        conquistasSection.style.padding = '20px';
        conquistasSection.style.borderRadius = '15px';
        conquistasSection.style.margin = '20px 0';
    }
    
    if (conquistasList) {
        conquistasList.innerHTML = `
            <div class="conquista-card">
                <div class="conquista-icone">🏆</div>
                <div class="conquista-info">
                    <div class="conquista-nome">Teste de Conquista</div>
                    <div class="conquista-descricao">Esta é uma conquista de teste</div>
                    <div class="conquista-pontos">+100 pontos</div>
                </div>
            </div>
            <div class="conquista-card">
                <div class="conquista-icone">✨</div>
                <div class="conquista-info">
                    <div class="conquista-nome">Primeira Ideia</div>
                    <div class="conquista-descricao">Criou sua primeira ideia</div>
                    <div class="conquista-pontos">+10 pontos</div>
                </div>
            </div>
        `;
    }
    
    if (conquistasDisponiveisSection) {
        conquistasDisponiveisSection.style.display = 'block';
    }
}

// ========== VERSÃO SIMPLIFICADA DAS CONQUISTAS ==========
// ========== CONQUISTAS ==========
async function carregarConquistas() {
    if (!usuarioLogado) return;
    
    try {
        const response = await fetch(`/api/pontuacao/${usuarioLogado.id}`);
        const data = await response.json();
        
        // Atualizar pontos e nível
        const pontosTotais = document.getElementById('pontosTotais');
        const nivelUsuario = document.getElementById('nivelUsuario');
        
        if (pontosTotais) pontosTotais.textContent = data.pontuacao?.pontos_totais || 0;
        if (nivelUsuario) nivelUsuario.textContent = data.pontuacao?.nivel || 1;
        
        const container = document.getElementById('conquistasList');
        if (!container) return;
        
        // Mostrar a seção
        const section = document.getElementById('conquistasSection');
        if (section) section.style.display = 'block';
        
        if (!data.conquistas || data.conquistas.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhuma conquista desbloqueada ainda. Continue participando!</div>';
            return;
        }
        
        container.innerHTML = data.conquistas.map(conq => `
            <div class="conquista-card">
                <div class="conquista-icone">${conq.icone || '🏆'}</div>
                <div class="conquista-info">
                    <div class="conquista-nome">${escapeHtml(conq.nome)}</div>
                    <div class="conquista-descricao">${escapeHtml(conq.descricao)}</div>
                    <div class="conquista-pontos">+${conq.pontos} pontos</div>
                    <div class="conquista-data">📅 ${formatarData(conq.data_obtencao)}</div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Erro ao carregar conquistas:', error);
    }
}

async function carregarConquistasDisponiveis() {
    if (!usuarioLogado) return;
    
    try {
        const response = await fetch(`/api/conquistas/disponiveis/${usuarioLogado.id}`);
        const conquistas = await response.json();
        
        const container = document.getElementById('conquistasDisponiveisList');
        if (!container) return;
        
        // Mostrar a seção
        const section = document.getElementById('conquistasDisponiveisSection');
        if (section) section.style.display = 'block';
        
        if (!conquistas || conquistas.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhuma conquista disponível</div>';
            return;
        }
        
        container.innerHTML = conquistas.map(conq => {
            const conquistada = conq.conquistada;
            
            return `
                <div class="conquista-card ${conquistada ? '' : 'locked'}">
                    <div class="conquista-icone">${conq.icone || (conquistada ? '🏆' : '🔒')}</div>
                    <div class="conquista-info">
                        <div class="conquista-nome">
                            ${conquistada ? '<span class="conquista-badge">✅ Desbloqueada</span>' : ''}
                            <br>
                            ${escapeHtml(conq.nome)}
                        </div>
                        <div class="conquista-descricao">${escapeHtml(conq.descricao)}</div>
                        <div class="conquista-pontos">+${conq.pontos} pontos</div>
                        ${!conquistada ? `<div class="conquista-progresso">📋 Desafio: ${getDesafioTexto(conq.tipo, conq.condicao)}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Erro ao carregar conquistas disponíveis:', error);
    }
}

// ========== MINIMIZAR/EXPANDIR CONQUISTAS DISPONÍVEIS ==========
let conquistasMinimizadas = false;

function toggleConquistasDisponiveis() {
    const content = document.getElementById('conquistasDisponiveisContent');
    const btn = document.getElementById('btnMinimizarConquistas');
    
    if (!content || !btn) return;
    
    if (conquistasMinimizadas) {
        // Expandir
        content.style.display = 'block';
        btn.innerHTML = '<i class="fas fa-minus-circle"></i>';
        btn.title = 'Minimizar';
        conquistasMinimizadas = false;
    } else {
        // Minimizar
        content.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-plus-circle"></i>';
        btn.title = 'Expandir';
        conquistasMinimizadas = true;
    }
    
}

function carregarEstadoConquistas() {
    const saved = localStorage.getItem('conquistasMinimizadas');
    if (saved === 'true') {
        toggleConquistasDisponiveis();
    }
}

function getDesafioTexto(tipo, condicao) {
    const textos = {
        'criar_ideia': `Criar ${condicao} ideia${condicao > 1 ? 's' : ''}`,
        'ideia_convertida': `Ter ${condicao} ideia${condicao > 1 ? 's' : ''} convertida${condicao > 1 ? 's' : ''} em projeto`,
        'votar': `Votar em ${condicao} ideia${condicao > 1 ? 's' : ''}`,
        'comentar': `Fazer ${condicao} comentário${condicao > 1 ? 's' : ''}`
    };
    return textos[tipo] || `${condicao} ação(ões)`;
}

let paginaAtualMinhas = 1;
let paginaAtualTodas = 1;
const ITENS_POR_PAGINA = 9;
let todasIdeiasCache = [];
let minhasIdeiasCache = [];

async function carregarMinhasIdeias(pagina = 1) {
    if (!usuarioLogado) {
        console.log('🔒 Usuário não logado. Não é possível carregar minhas ideias.');
        return;
    }
    
    try {
        const isAdmin = usuarioLogado.cargo === 'gestor' || usuarioLogado.cargo === 'ti_staff';
        const response = await fetch(`/minhas-ideias/${usuarioLogado.id}?isAdmin=${isAdmin}`);
        const ideias = await response.json();
        
        // Armazenar em cache
        minhasIdeiasCache = ideias;
        paginaAtualMinhas = pagina;
        
        const start = (pagina - 1) * ITENS_POR_PAGINA;
        const end = start + ITENS_POR_PAGINA;
        const ideiasPaginadas = ideias.slice(start, end);
        
        const container = document.getElementById('minhasIdeias');
        
        if (!ideias || ideias.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lightbulb"></i>
                    <p>Você ainda não tem ideias</p>
                    <button onclick="document.getElementById('titulo').focus()" class="btn-primary">Criar primeira ideia</button>
                </div>
            `;
            renderizarPaginacaoMinhasIdeias(0);
            return;
        }
        
        renderizarMinhasIdeias(ideiasPaginadas);
        renderizarPaginacaoMinhasIdeias(ideias.length);
        
    } catch (error) {
        console.error('❌ Erro ao carregar minhas ideias:', error);
        const container = document.getElementById('minhasIdeias');
        if (container) {
            container.innerHTML = `<div class="empty-state">❌ Erro ao carregar suas ideias</div>`;
        }
    }
}

function renderizarMinhasIdeias(ideias) {
    const container = document.getElementById('minhasIdeias');
    
    if (!ideias || ideias.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhuma ideia nesta página</div>';
        return;
    }
    
    container.innerHTML = ideias.map(ideia => {
        const votos = ideia.votos_count || 0;
        const totalImagens = ideia.total_imagens || 0;
        const totalComentarios = ideia.total_comentarios || 0;
        
        let statusBadge = '';
        if (ideia.status === 'aprovada') {
            statusBadge = '<span class="status-badge status-aprovada">✅ Aprovada</span>';
        } else if (ideia.status === 'convertida') {
            statusBadge = '<span class="status-badge status-convertida">🚀 Convertida</span>';
        } else if (ideia.status === 'pendente') {
            statusBadge = '<span class="status-badge status-pendente">⏳ Pendente</span>';
        }
        
        let localHtml = '';
        if (ideia.local_nome && ideia.local_nome !== 'null') {
            localHtml = `<span class="local-tag"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(ideia.local_nome)}</span>`;
        }
        
        let imagensIcon = '';
        if (totalImagens > 0) {
            imagensIcon = `<span class="imagens-count">📷 ${totalImagens}</span>`;
        }
        
        let imagemHtml = '';
        if (ideia.imagem_principal && ideia.imagem_principal !== 'null' && ideia.imagem_principal !== '') {
            imagemHtml = `
                <div class="ideia-imagem" onclick="verIdeia(${ideia.id})">
                    <img src="${ideia.imagem_principal}" alt="${escapeHtml(ideia.titulo)}" style="width: 100%; max-height: 180px; object-fit: cover; border-radius: 10px; cursor: pointer;">
                </div>
            `;
        }
        
        return `
            <div class="ideia-card" data-id="${ideia.id}">
                ${imagemHtml}
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 onclick="verIdeia(${ideia.id})" style="cursor: pointer;">${escapeHtml(ideia.titulo)}</h3>
                    ${statusBadge}
                </div>
                <p>${escapeHtml(ideia.descricao ? ideia.descricao.substring(0, 100) : '')}${ideia.descricao && ideia.descricao.length > 100 ? '...' : ''}</p>
                
                <div class="ideia-meta">
                    <div class="meta-linha">
                        <span>📅 ${formatarData(ideia.data_publicacao)}</span>
                    </div>
                    ${localHtml ? `<div class="meta-linha">${localHtml}</div>` : ''}
                    <div class="meta-linha">
                        <span class="votos-count">👍 ${votos} ${votos === 1 ? 'voto' : 'votos'}</span>
                        <span class="comentarios-count">💬 ${totalComentarios}</span>
                        <span class="categoria">${ideia.categoria_icone || '📁'} ${escapeHtml(ideia.categoria_nome || 'Sem categoria')}</span>
                        ${imagensIcon}
                    </div>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <button onclick="deletarIdeia(${ideia.id})" class="btn-delete-minhas-ideias">
                        <i class="fas fa-trash-alt"></i> Deletar
                    </button>
                    <button onclick="verIdeia(${ideia.id})" class="btn-detalhes-minhas-ideias">
                        <i class="fas fa-eye"></i> Ver detalhes
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function renderizarPaginacaoMinhasIdeias(totalItens) {
    const totalPaginas = Math.ceil(totalItens / ITENS_POR_PAGINA);
    const container = document.getElementById('paginacaoMinhasIdeias');
    
    if (!container) return;
    
    if (totalPaginas <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div class="pagination-controls">';
    
    // Botão Anterior
    html += `<button class="page-btn" onclick="carregarMinhasIdeias(${paginaAtualMinhas - 1})" ${paginaAtualMinhas === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i> Anterior
            </button>`;
    
    // Números das páginas
    for (let i = 1; i <= totalPaginas; i++) {
        if (i === 1 || i === totalPaginas || (i >= paginaAtualMinhas - 2 && i <= paginaAtualMinhas + 2)) {
            html += `<button class="page-btn ${i === paginaAtualMinhas ? 'active' : ''}" onclick="carregarMinhasIdeias(${i})">
                        ${i}
                    </button>`;
        } else if (i === paginaAtualMinhas - 3 || i === paginaAtualMinhas + 3) {
            html += `<span class="page-dots">...</span>`;
        }
    }
    
    // Botão Próximo
    html += `<button class="page-btn" onclick="carregarMinhasIdeias(${paginaAtualMinhas + 1})" ${paginaAtualMinhas === totalPaginas ? 'disabled' : ''}>
                Próximo <i class="fas fa-chevron-right"></i>
            </button>`;
    
    html += '</div>';
    container.innerHTML = html;
}

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
    
    showLoading(true);
    
    try {
        const response = await fetch(`/ideias/${ideiaId}/votar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId: usuarioLogado.id })
        });
        
        const data = await response.json();
        
        if (data.sucesso) {
            showMessage(data.mensagem);
            
            // Animação no contador antes de recarregar
            const contadorComunidade = document.querySelector(`#todasIdeias .ideia-card[data-id="${ideiaId}"] .votos-count`);
            const contadorMinhas = document.querySelector(`#minhasIdeias .ideia-card[data-id="${ideiaId}"] .votos-count`);
            
            if (contadorComunidade) contadorComunidade.classList.add('updated');
            if (contadorMinhas) contadorMinhas.classList.add('updated');
            
            // Recarregar as listas
            await carregarIdeias();
            await carregarMinhasIdeias();
        } else {
            showMessage(data.erro || 'Erro ao votar', 'error');
            if (btn) {
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        }
    } catch (error) {
        console.error('❌ Erro ao votar:', error);
        showMessage('Erro de conexão', 'error');
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
        }
    } finally {
        showLoading(false);
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
    } catch (error) {}
}

function verIdeia(ideiaId) {
    // Redireciona para a página detalhada da ideia
    window.location.href = `/pages/ideia.html?id=${ideiaId}`;
}

async function deletarIdeia(id) {
    // Encontrar o título da ideia para mostrar no alerta
    let titulo = '';
    try {
        const response = await fetch(`/minhas-ideias/${usuarioLogado.id}`);
        const ideias = await response.json();
        const ideia = ideias.find(i => i.id === id);
        if (ideia) titulo = ideia.titulo;
    } catch (e) {}
    
    const mensagem = titulo 
        ? `⚠️ Tem certeza que deseja deletar a ideia "${titulo}"?\n\nATENÇÃO: Se houver votos nela, eles também serão removidos permanentemente!`
        : '⚠️ Tem certeza que deseja deletar esta ideia?\n\nATENÇÃO: Se houver votos nela, eles também serão removidos permanentemente!';
    
    if (!confirm(mensagem)) return;
    
    showLoading(true);
    
    try {
        const response = await fetch(`/ideias/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuarioId: usuarioLogado.id })
        });
        
        const data = await response.json();
        
        if (response.ok && data.sucesso) {
            showMessage('✅ Ideia deletada com sucesso!', 'success');
            // Recarregar as listas
            await carregarMinhasIdeias();
            await carregarIdeias();
        } else {
            showMessage(data.erro || 'Erro ao deletar ideia', 'error');
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        showMessage('Erro de conexão', 'error');
    } finally {
        showLoading(false);
    }
}

function verDetalhes(id) {
    const card = document.querySelector(`.ideia-card[data-id="${id}"]`);
    if (card) {
        const titulo = card.querySelector('h3').innerText;
        const descricao = card.querySelector('p').innerText;
        alert(`📌 ${titulo}\n\n${descricao}`);
    }
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

function limparSessao() {
    if (confirm('⚠️ Tem certeza que deseja limpar a sessão?\n\nVocê será desconectado e todos os dados de login serão removidos.')) {
        // Limpar localStorage
        localStorage.removeItem('ideaHubToken');
        localStorage.removeItem('sessionToken');
        
        // Limpar sessionStorage
        sessionStorage.clear();
        
        // Resetar variável global
        usuarioLogado = null;
        
        // Mostrar mensagem
        showMessage('✅ Sessão limpa! A página será recarregada.', 'success');
        
        // Recarregar a página após 1 segundo
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
}

function mostrarMensagemLogin(containerId, mensagemId, tipo) {
    const container = document.getElementById(containerId);
    const mensagem = document.getElementById(mensagemId);
    
    if (!usuarioLogado) {
        if (container) container.style.display = 'none';
        if (mensagem) mensagem.style.display = 'block';
    } else {
        if (container) container.style.display = tipo === 'grid' ? 'grid' : 'block';
        if (mensagem) mensagem.style.display = 'none';
    }
}

function forcarModoVisitante() {
    usuarioLogado = null;
    
    const authArea = document.getElementById('authArea');
    const ideiaArea = document.getElementById('ideiaArea');
    const minhasIdeiasArea = document.getElementById('minhasIdeiasArea');
    const buscaArea = document.getElementById('buscaArea');
    const notificacaoArea = document.getElementById('notificacaoArea');
    const todasIdeias = document.getElementById('todasIdeias');
    const todasIdeiasHeader = document.querySelector('.todas-ideias-header');
    const conquistasSection = document.getElementById('conquistasSection');
    const conquistasDisponiveisSection = document.getElementById('conquistasDisponiveisSection');
    const dashboardPessoal = document.getElementById('dashboardPessoal');
    const paginacaoTodasIdeias = document.getElementById('paginacaoTodasIdeias');
    const paginacaoMinhasIdeias = document.getElementById('paginacaoMinhasIdeias');
    const filtroVisualizacao = document.querySelector('.filtro-visualizacao');
    
    if (authArea) authArea.style.display = 'block';
    if (ideiaArea) ideiaArea.style.display = 'none';
    if (minhasIdeiasArea) minhasIdeiasArea.style.display = 'none';
    if (buscaArea) buscaArea.style.display = 'none';
    if (notificacaoArea) notificacaoArea.style.display = 'none';
    if (todasIdeias) todasIdeias.style.display = 'none';
    if (todasIdeiasHeader) todasIdeiasHeader.style.display = 'none';
    if (conquistasSection) conquistasSection.style.display = 'none';
    if (conquistasDisponiveisSection) conquistasDisponiveisSection.style.display = 'none';
    if (dashboardPessoal) dashboardPessoal.style.display = 'none';
    if (paginacaoTodasIdeias) paginacaoTodasIdeias.style.display = 'none';
    if (paginacaoMinhasIdeias) paginacaoMinhasIdeias.style.display = 'none';
    if (filtroVisualizacao) filtroVisualizacao.style.display = 'none';
    
    // Mostrar mensagens de login
    const mensagemMinhasIdeias = document.getElementById('mensagemMinhasIdeias');
    const mensagemTodasIdeias = document.getElementById('mensagemTodasIdeias');
    
    if (mensagemMinhasIdeias) mensagemMinhasIdeias.style.display = 'block';
    if (mensagemTodasIdeias) mensagemTodasIdeias.style.display = 'block';
    
    carregarCategorias();
}

function modoVisitante() {
    usuarioLogado = null;
    
    const authArea = document.getElementById('authArea');
    const ideiaArea = document.getElementById('ideiaArea');
    const minhasIdeiasArea = document.getElementById('minhasIdeiasArea');
    const buscaArea = document.getElementById('buscaArea');
    const notificacaoArea = document.getElementById('notificacaoArea');
    const conquistasSection = document.getElementById('conquistasSection');
    const conquistasDisponiveisSection = document.getElementById('conquistasDisponiveisSection');
    const todasIdeias = document.getElementById('todasIdeias');
    const todasIdeiasHeader = document.querySelector('.todas-ideias-header');
    const filtroVisualizacao = document.querySelector('.filtro-visualizacao');
    
    if (authArea) authArea.style.display = 'block';
    if (ideiaArea) ideiaArea.style.display = 'none';
    if (minhasIdeiasArea) minhasIdeiasArea.style.display = 'none';
    if (buscaArea) buscaArea.style.display = 'none';
    if (notificacaoArea) notificacaoArea.style.display = 'none';
    if (conquistasSection) conquistasSection.style.display = 'none';
    if (conquistasDisponiveisSection) conquistasDisponiveisSection.style.display = 'none';
    if (todasIdeias) todasIdeias.style.display = 'none';
    if (todasIdeiasHeader) todasIdeiasHeader.style.display = 'none';
    if (filtroVisualizacao) filtroVisualizacao.style.display = 'none';
    
    carregarCategorias();
}

// ==================== INICIALIZAÇÃO ====================
// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Página carregada, restaurando sessão...');
    
    // Configurar botão de adicionar imagem
    const btnAdicionar = document.getElementById('btnAdicionarImagem');
    if (btnAdicionar) {
        btnAdicionar.addEventListener('click', () => adicionarCampoImagem());
    }
    atualizarContador();
    
    // Tentar restaurar sessão primeiro
    const sessaoRestaurada = restaurarSessao();
    
    // Se não conseguiu restaurar, mostrar modo visitante
    if (!sessaoRestaurada) {
        console.log('🔓 Nenhuma sessão encontrada, modo visitante');
        forcarModoVisitante();
    }
});