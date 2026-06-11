<img width="439" height="569" alt="IdeaHub nobg" src="https://github.com/user-attachments/assets/b0cb84a9-5700-478d-a87e-3a5273c55273" />

# 💡 IdeaHub Interlinked
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15.x-blue.svg)](https://www.postgresql.org/)

### 📋 Sobre o Projeto

O **IdeaHub Interlinked** é uma plataforma colaborativa de inovação que permite aos usuários compartilhar, votar e comentar ideias, além de gerenciar projetos e documentação técnica. Desenvolvido para ambientes educacionais e corporativos, o sistema incentiva a participação ativa através de um sistema de gamificação com conquistas e níveis.

### 🎯 Propósito

- **Compartilhar ideias** de forma estruturada e colaborativa
- **Gerenciar projetos** derivados de ideias aprovadas
- **Incentivar a inovação** através de gamificação
- **Documentar tecnicamente** projetos e planejamentos de rede
- **Moderar conteúdo** garantindo qualidade e conformidade

---

# 🚀 Funcionalidades Principais

### 👥 Usuários
- Cadastro e login com sessão persistente
- Perfis com níveis e conquistas
- Cargos: Aluno, Professor, TI Staff, Gestor
- Sistema de pontuação e gamificação

### 💡 Ideias
- Criar ideias com título, descrição e categoria
- Upload de até 10 imagens por ideia
- Publicação anônima opcional
- Votação e comentários
- Edição com versionamento automático
- Status: Pendente, Aprovada, Convertida, Rejeitada

### 🏆 Gamificação
- Conquistas desbloqueáveis por ações
- Pontuação por criar ideias, votar, comentar
- Níveis de usuário (1 a 10+)
- Ranking de usuários

### 📂 Projetos
- Conversão de ideias aprovadas em projetos
- Planejamento de rede (equipamentos, IPs, custos)
- Documentação técnica (upload de arquivos)
- Lixeira com restauração
- Calendário de períodos

### 👨‍💼 Administração
- Dashboard com métricas e gráficos
- Gestão de usuários (cargos, ativação)
- Moderação de ideias e comentários
- Reports e denúncias
- Logs de atividades
- Gestão de templates de ideias
- Mapa de calor de inovação

### 🔔 Notificações
- Notificações em tempo real
- Resumo diário por e-mail (opcional)
- Notificações de moderação, conquistas e comentários

---

# 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **PostgreSQL** - Banco de dados relacional
- **Multer** - Upload de arquivos
- **Sharp** - Otimização de imagens
- **Nodemailer** - Envio de e-mails
- **Node-cron** - Agendamento de tarefas

### Frontend
- **HTML5 / CSS3** - Estrutura e estilização
- **JavaScript (Vanilla)** - Interatividade
- **Chart.js** - Gráficos e dashboards
- **Leaflet** - Mapas e geolocalização
- **Leaflet.heat** - Mapa de calor
- **html2canvas + jsPDF** - Exportação de relatórios

### Ferramentas
- **Git** - Controle de versão
- **npm** - Gerenciador de pacotes

---

# ⚙️ Instalação e Configuração

**Obs:** Isso se caso se desejar rodar o sistema localmente. Outra opção é visitar o nosso sistema hospedado pelo o seguinte link:

https://ideahub-interlinked.onrender.com

**💡 Pode fazer uma conta e criar uma nova ideia!**

### Pré-requisitos

- [Node.js](https://nodejs.org/) (v20.x ou superior)
- [PostgreSQL](https://www.postgresql.org/) (v15.x ou superior)
- [Git](https://git-scm.com/)

### Passo a Passo

1. **Clone o repositório**
```python
def saudacao():
    print("Olá, GitHub!")
```

2. **Instale as dependências**
```python
npm install
```

3. **Configure o banco de dados PostgreSQL**

Crie um banco de dados:
```python
CREATE DATABASE ideahub;
```
Execute o script SQL:
```python
psql -U postgres -d ideahub -f Database/ideahub_postgres.sql
```

4. **Configure as variáveis de ambiente**
Crie um arquivo .env na raiz do projeto:
```python
# Database
DB_USER=postgres
DB_HOST=localhost
DB_NAME=ideahub
DB_PASSWORD=sua_senha
DB_PORT=5432

# Email (para notificações)
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_app

# Session
SESSION_SECRET=seu_segredo_aqui

# Server
PORT=3000
```

5. **Inicie o servidor**
```python
node server_novo.js
```

6. **Acesse a aplicação**
```python
http://localhost:3000
```
