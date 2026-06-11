// session.js - Gerenciamento de sessão compartilhado entre todas as páginas

const SessionManager = {
    // Obter usuário logado
    getUsuario() {
        const user = sessionStorage.getItem('ideaHubUser');
        if (user) {
            try {
                return JSON.parse(user);
            } catch(e) {
                return null;
            }
        }
        return null;
    },
    
    // Salvar usuário
    setUsuario(usuario) {
        if (usuario) {
            sessionStorage.setItem('ideaHubUser', JSON.stringify(usuario));
        } else {
            sessionStorage.removeItem('ideaHubUser');
        }
    },
    
    // Verificar se está logado
    isLogado() {
        return this.getUsuario() !== null;
    },
    
    // Fazer logout
    logout() {
        sessionStorage.removeItem('ideaHubUser');
        localStorage.removeItem('ideaHubToken');
        
        // Limpar sessão no servidor
        fetch('/logout', { method: 'POST', credentials: 'include' })
            .catch(console.error);
        
        window.location.href = '/index.html';
    },
    
    // Verificar permissão de admin
    isAdmin() {
        const user = this.getUsuario();
        return user && (user.cargo === 'gestor' || user.cargo === 'ti_staff');
    },
    
    // Redirecionar se não estiver logado
    requireAuth(redirectTo = '/index.html') {
        if (!this.isLogado()) {
            window.location.href = redirectTo;
            return false;
        }
        return true;
    },
    
    // Redirecionar se não for admin
    requireAdmin(redirectTo = '/index.html') {
        if (!this.isAdmin()) {
            alert('Acesso negado. Você não tem permissão de administrador.');
            window.location.href = redirectTo;
            return false;
        }
        return true;
    }
};