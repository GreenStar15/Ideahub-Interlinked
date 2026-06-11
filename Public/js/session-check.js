// session-check.js - Versão simplificada e funcional
(function() {
    const userSalvo = sessionStorage.getItem('ideaHubUser');
    
    if (!userSalvo) {
        console.log('🔒 Usuário não logado, redirecionando para login...');
        alert('Faça login primeiro!');
        window.location.href = '/index.html';
        return;
    }
    
    try {
        const usuario = JSON.parse(userSalvo);
        console.log('✅ Usuário logado:', usuario.nome);
        
        // Verificar permissão de admin se necessário
        const isAdminPage = window.location.pathname.includes('admin.html');
        const isAdmin = usuario.cargo === 'gestor' || usuario.cargo === 'ti_staff';
        
        if (isAdminPage && !isAdmin) {
            alert('❌ Acesso negado! Você não tem permissão de administrador.');
            window.location.href = '/index.html';
            return;
        }
        
        // Mostrar nome do usuário na página
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = usuario.nome;
        }
        
        // Salvar globalmente
        window.usuarioLogado = usuario;
        
    } catch(e) {
        console.error('Erro ao verificar sessão:', e);
        sessionStorage.removeItem('ideaHubUser');
        window.location.href = '/index.html';
    }
})();