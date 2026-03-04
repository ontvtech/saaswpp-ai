#!/bin/bash

# =============================================================================
# SaaSWPP AI - INSTALAÇÃO AUTOMÁTICA COMPLETA
# Execute: chmod +x install-saaswpp.sh && ./install-saaswpp.sh
# =============================================================================

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║             🚀 SaaSWPP AI - INSTALADOR AUTOMÁTICO           ║"
echo "║                                                              ║"
echo "║     Sistema de Automação WhatsApp com Inteligência Artificial ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar se é root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Execute como root ou use sudo${NC}"
    echo "sudo ./install-saaswpp.sh"
    exit 1
fi

# Variáveis de configuração
DOMAIN=""
EMAIL=""
DB_PASSWORD=$(openssl rand -base64 12)
JWT_SECRET=$(openssl rand -base64 32)
ADMIN_PASSWORD=$(openssl rand -base64 12)

# Função para pausar
pause() {
    read -p "Pressione Enter para continuar..."
}

# Função para verificar comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# =============================================================================
# PASSO 1: ATUALIZAR SISTEMA
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📥 PASSO 1/12: Atualizando sistema operacional...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

apt update && apt upgrade -y
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

echo -e "${GREEN}✅ Sistema atualizado!${NC}"
sleep 1

# =============================================================================
# PASSO 2: INSTALAR NODE.JS 20
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📦 PASSO 2/12: Instalando Node.js 20...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if ! command_exists node; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# Instalar Bun (mais rápido que npm)
if ! command_exists bun; then
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi

# Instalar PM2 para gerenciar processos
npm install -g pm2

echo -e "${GREEN}✅ Node.js $(node -v) instalado!${NC}"
echo -e "${GREEN}✅ Bun instalado!${NC}"
echo -e "${GREEN}✅ PM2 instalado!${NC}"
sleep 1

# =============================================================================
# PASSO 3: INSTALAR POSTGRESQL
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🐘 PASSO 3/12: Instalando PostgreSQL 16...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if ! command_exists psql; then
    # Adicionar repositório oficial PostgreSQL
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt update
    apt install -y postgresql-16 postgresql-contrib-16
fi

# Iniciar e habilitar PostgreSQL
systemctl start postgresql
systemctl enable postgresql

# Criar banco de dados e usuário
sudo -u postgres psql -c "CREATE DATABASE saaswpp;"
sudo -u postgres psql -c "CREATE USER saaswpp WITH ENCRYPTED PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE saaswpp TO saaswpp;"
sudo -u postgres psql -c "ALTER USER saaswpp CREATEDB;"

# Configurar acesso local
echo "host all all 127.0.0.1/32 md5" >> /etc/postgresql/16/main/pg_hba.conf
systemctl restart postgresql

echo -e "${GREEN}✅ PostgreSQL instalado e configurado!${NC}"
echo -e "${CYAN}   Senha do banco: $DB_PASSWORD${NC}"
sleep 1

# =============================================================================
# PASSO 4: INSTALAR REDIS
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔴 PASSO 4/12: Instalando Redis...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if ! command_exists redis-server; then
    apt install -y redis-server
fi

# Configurar Redis
sed -i 's/supervised no/supervised systemd/' /etc/redis/redis.conf
systemctl restart redis-server
systemctl enable redis-server

echo -e "${GREEN}✅ Redis instalado e rodando!${NC}"
sleep 1

# =============================================================================
# PASSO 5: INSTALAR DOCKER
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🐳 PASSO 5/12: Instalando Docker...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if ! command_exists docker; then
    curl -fsSL https://get.docker.com | bash
    usermod -aG docker $SUDO_USER
fi

systemctl start docker
systemctl enable docker

echo -e "${GREEN}✅ Docker instalado!${NC}"
sleep 1

# =============================================================================
# PASSO 6: INSTALAR NGINX
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🌐 PASSO 6/12: Instalando Nginx...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if ! command_exists nginx; then
    apt install -y nginx
fi

systemctl start nginx
systemctl enable nginx

echo -e "${GREEN}✅ Nginx instalado!${NC}"
sleep 1

# =============================================================================
# PASSO 7: CONFIGURAR FIREWALL
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🛡️  PASSO 7/12: Configurando Firewall (UFW)...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Reset UFW
ufw --force reset

# Configurar regras
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw allow 3000/tcp    # App
ufw allow 8080/tcp    # Evolution API
ufw allow 5432/tcp    # PostgreSQL (apenas se necessário externo)
ufw allow 6379/tcp    # Redis (apenas se necessário externo)

ufw --force enable

echo -e "${GREEN}✅ Firewall configurado!${NC}"
sleep 1

# =============================================================================
# PASSO 8: CLONAR E CONFIGURAR PROJETO
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📂 PASSO 8/12: Clonando e configurando projeto...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Criar diretório do app
mkdir -p /var/www/saaswpp
cd /var/www/saaswpp

# Clonar repositório
if [ ! -d "/var/www/saaswpp/.git" ]; then
    git clone https://github.com/ontvtech/saaswpp-ai.git .
fi

# Instalar dependências
npm install

echo -e "${GREEN}✅ Projeto clonado e dependências instaladas!${NC}"
sleep 1

# =============================================================================
# PASSO 9: CONFIGURAR VARIÁVEIS DE AMBIENTE
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}⚙️  PASSO 9/12: Configurando variáveis de ambiente...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Solicitar domínio
echo -e "${YELLOW}Digite seu domínio (ex: app.seudominio.com):${NC}"
read -p "Domínio: " DOMAIN

# Solicitar email para SSL
echo -e "${YELLOW}Digite seu email para certificado SSL:${NC}"
read -p "Email: " EMAIL

# Solicitar chaves de API
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}CHAVES DE API NECESSÁRIAS:${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "${CYAN}1. Gemini API Key (obrigatório):${NC}"
echo "   Obtenha em: https://aistudio.google.com/apikey"
read -p "   Gemini API Key: " GEMINI_KEY

echo -e "${CYAN}2. Stripe Secret Key (obrigatório):${NC}"
echo "   Obtenha em: https://dashboard.stripe.com/apikeys"
read -p "   Stripe Secret Key: " STRIPE_KEY

echo -e "${CYAN}3. Stripe Webhook Secret:${NC}"
read -p "   Stripe Webhook Secret (whsec_xxx): " STRIPE_WEBHOOK

echo -e "${CYAN}4. Evolution API URL:${NC}"
read -p "   Evolution API URL (http://localhost:8080): " EVOLUTION_URL

echo -e "${CYAN}5. Evolution API Key:${NC}"
read -p "   Evolution API Key: " EVOLUTION_KEY

# Criar arquivo .env
cat > /var/www/saaswpp/.env << EOF
# =============================================================================
# SaaSWPP AI - CONFIGURAÇÃO DE PRODUÇÃO
# =============================================================================

# Servidor
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Banco de Dados PostgreSQL
DATABASE_URL="postgresql://saaswpp:${DB_PASSWORD}@localhost:5432/saaswpp"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="${JWT_SECRET}"

# Gemini API (GLM-4.7-Flash)
GEMINI_API_KEY="${GEMINI_KEY}"

# Stripe
STRIPE_SECRET_KEY="${STRIPE_KEY}"
STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK}"
STRIPE_PUBLISHABLE_KEY="pk_live_xxx"

# Evolution API (WhatsApp)
EVOLUTION_API_URL="${EVOLUTION_URL:-http://localhost:8080}"
EVOLUTION_API_KEY="${EVOLUTION_KEY}"

# Meta Business (WhatsApp Cloud API - opcional)
META_APP_ID=""
META_APP_SECRET=""
META_VERIFY_TOKEN="saaswpp_verify_token"
META_PHONE_NUMBER_ID=""
META_ACCESS_TOKEN=""

# NFS-e (Nota Fiscal - opcional)
NFSE_PROVIDER="focusnfe"
NFSE_API_KEY=""
NFSE_ENVIRONMENT="production"

# Domínio
APP_URL="https://${DOMAIN}"
APP_DOMAIN="${DOMAIN}"

# Email (SMTP - opcional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@${DOMAIN}"

# Logs
LOG_LEVEL="info"
EOF

echo -e "${GREEN}✅ Arquivo .env criado!${NC}"
sleep 1

# =============================================================================
# PASSO 10: CONFIGURAR BANCO DE DADOS
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🗄️  PASSO 10/12: Configurando banco de dados...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd /var/www/saaswpp

# Gerar Prisma Client
npx prisma generate

# Rodar migrations
npx prisma migrate deploy

# Criar usuário admin padrão
sudo -u postgres psql -d saaswpp -c "
INSERT INTO \"User\" (id, email, name, password, role, \"createdAt\", \"updatedAt\")
VALUES (
    gen_random_uuid(),
    'admin@${DOMAIN}',
    'Administrador',
    '\$2a\$10\$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm',
    'ADMIN',
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;
"

# Seed inicial
npx prisma db seed

echo -e "${GREEN}✅ Banco de dados configurado!${NC}"
sleep 1

# =============================================================================
# PASSO 11: CONFIGURAR EVOLUTION API (DOCKER)
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📱 PASSO 11/12: Instalando Evolution API (WhatsApp)...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

mkdir -p /opt/evolution
cd /opt/evolution

# Criar docker-compose para Evolution
cat > /opt/evolution/docker-compose.yml << EOF
version: '3.8'

services:
  evolution-api:
    image: atendai/evolution-api:latest
    container_name: evolution-api
    restart: always
    ports:
      - "8080:8080"
    environment:
      - SERVER_TYPE=http
      - SERVER_PORT=8080
      - CORS_ORIGIN=*
      - DATABASE_ENABLED=true
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://saaswpp:${DB_PASSWORD}@host.docker.internal:5432/evolution
      - DATABASE_SAVE_DATA_INSTANCE=true
      - DATABASE_SAVE_DATA_NEW_MESSAGE=true
      - DATABASE_SAVE_MESSAGE_UPDATE=true
      - DATABASE_SAVE_DATA_CONTACTS=true
      - DATABASE_SAVE_DATA_CHATS=true
      - REDIS_ENABLED=true
      - REDIS_URI=redis://host.docker.internal:6379
      - REDIS_PREFIX_KEY=evolution
      - API_KEY=${EVOLUTION_KEY:-evolution-key}
      - SESSION_CLIENT_VERSION=2.3000.0
      - STORE_MESSAGE=true
      - STORE_CONTACTS=true
      - STORE_CHATS=true
      - CLEAN_STORE_CLEANING_INTERVAL=7200
      - AUTHENTICATION_API_KEY=${EVOLUTION_KEY:-evolution-key}
      - AUTHENTICATION_EXPOSE_IN_API=true
    volumes:
      - evolution_data:/evolution/storage
    extra_hosts:
      - "host.docker.internal:host-gateway"

volumes:
  evolution_data:
EOF

# Criar banco para Evolution
sudo -u postgres psql -c "CREATE DATABASE evolution;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE evolution TO saaswpp;"

# Iniciar Evolution API
cd /opt/evolution
docker-compose up -d

echo -e "${GREEN}✅ Evolution API instalada!${NC}"
sleep 1

# =============================================================================
# PASSO 12: CONFIGURAR NGINX + SSL
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🔒 PASSO 12/12: Configurando Nginx e SSL...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Instalar Certbot
apt install -y certbot python3-certbot-nginx

# Configurar Nginx
cat > /etc/nginx/sites-available/saaswpp << EOF
# SaaSWPP AI - Nginx Configuration
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};

    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};

    # SSL (será configurado pelo Certbot)
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Proxy para a aplicação
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # Webhooks
    location /api/webhooks/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Evolution API
    location /evolution/ {
        proxy_pass http://localhost:8080/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_read_timeout 86400;
    }

    # Static files
    location /static/ {
        alias /var/www/saaswpp/public/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/saaswpp /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t

# Obter certificado SSL
echo -e "${YELLOW}Obtendo certificado SSL...${NC}"
certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email ${EMAIL}

# Configurar renovação automática
systemctl enable certbot.timer

echo -e "${GREEN}✅ Nginx e SSL configurados!${NC}"
sleep 1

# =============================================================================
# INICIAR APLICAÇÃO COM PM2
# =============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🚀 Iniciando aplicação...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd /var/www/saaswpp

# Build da aplicação
npm run build

# Iniciar com PM2
pm2 start npm --name "saaswpp" -- start
pm2 start npm --name "saaswpp-worker" -- run worker

# Salvar configuração do PM2
pm2 save
pm2 startup

# Reiniciar Nginx
systemctl restart nginx

echo -e "${GREEN}✅ Aplicação iniciada!${NC}"
sleep 1

# =============================================================================
# RESUMO FINAL
# =============================================================================
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║              ✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!            ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📋 INFORMAÇÕES DE ACESSO:${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${CYAN}🌐 URL da aplicação:${NC} https://${DOMAIN}"
echo -e "${CYAN}📧 Email admin:${NC} admin@${DOMAIN}"
echo -e "${CYAN}🔑 Senha admin:${NC} ${ADMIN_PASSWORD}"
echo ""
echo -e "${CYAN}🐘 Banco de dados:${NC} PostgreSQL"
echo -e "${CYAN}   Database: saaswpp"
echo -e "${CYAN}   User: saaswpp"
echo -e "${CYAN}   Password: ${DB_PASSWORD}"
echo ""
echo -e "${CYAN}📱 Evolution API:${NC} http://localhost:8080"
echo -e "${CYAN}   API Key: ${EVOLUTION_KEY:-evolution-key}"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}📚 COMANDOS ÚTEIS:${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Ver logs da aplicação:${NC}"
echo "   pm2 logs saaswpp"
echo ""
echo -e "${YELLOW}Reiniciar aplicação:${NC}"
echo "   pm2 restart saaswpp"
echo ""
echo -e "${YELLOW}Status dos serviços:${NC}"
echo "   pm2 status"
echo "   systemctl status nginx"
echo "   systemctl status postgresql"
echo "   systemctl status redis"
echo ""
echo -e "${YELLOW}Ver logs do Nginx:${NC}"
echo "   tail -f /var/log/nginx/error.log"
echo ""
echo -e "${YELLOW}Conectar no banco:${NC}"
echo "   psql -U saaswpp -d saaswpp -h localhost"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}⚠️  PRÓXIMOS PASSOS:${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "1. Acesse https://${DOMAIN}"
echo "2. Faça login com admin@${DOMAIN} / ${ADMIN_PASSWORD}"
echo "3. Configure seu plano no Admin"
echo "4. Crie um Reseller"
echo "5. Conecte o WhatsApp via Evolution API"
echo "6. Configure webhooks no Stripe: https://${DOMAIN}/api/webhooks/stripe"
echo ""
echo -e "${GREEN}🎉 SaaSWPP AI está pronto para uso!${NC}"
echo ""

# Salvar credenciais em arquivo seguro
cat > /root/saaswpp-credentials.txt << EOF
SaaSWPP AI - Credenciais
========================
Data: $(date)

URL: https://${DOMAIN}
Admin Email: admin@${DOMAIN}
Admin Password: ${ADMIN_PASSWORD}

Database: saaswpp
DB User: saaswpp
DB Password: ${DB_PASSWORD}

JWT Secret: ${JWT_SECRET}

Evolution API Key: ${EVOLUTION_KEY:-evolution-key}
EOF

chmod 600 /root/saaswpp-credentials.txt

echo -e "${YELLOW}📁 Credenciais salvas em: /root/saaswpp-credentials.txt${NC}"
