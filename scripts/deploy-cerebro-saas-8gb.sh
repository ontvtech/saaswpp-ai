#!/bin/bash

# =============================================================================
# DEPLOY - Servidor 8GB (Cérebro do SaaS)
# IP: 192.168.88.252
# Serviços: App SaaSWPP + PostgreSQL + Nginx + SSL
# Objetivo: Painel, pagamentos, banco de dados, IA
# =============================================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     🧠 CÉREBRO DO SAAS - Servidor 8GB                        ║"
echo "║     IP: 192.168.88.252                                       ║"
echo "║     App + PostgreSQL + Nginx                                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# =============================================================================
# CONFIGURAÇÕES
# =============================================================================
DOMAIN="saaswpp.work"
SERVER_IP="192.168.88.252"
WHATSAPP_SERVER_IP="192.168.88.254"  # IP do servidor Evolution
ADMIN_EMAIL="admin@saaswpp.work"

# Senhas (Mude em produção!)
DB_PASSWORD="saaswpp_db_2024_secure"
REDIS_PASSWORD="saaswpp_redis_2024"
EVOLUTION_API_KEY="saaswpp_evolution_2024_key"

# =============================================================================
# 1. PREPARAÇÃO DO SISTEMA
# =============================================================================
echo -e "${YELLOW}[1/6] Preparando sistema...${NC}"

sudo apt update && sudo apt upgrade -y

sudo apt install -y \
    curl \
    wget \
    git \
    build-essential \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw \
    htop \
    fail2ban \
    postgresql \
    postgresql-contrib

# Firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo -e "${GREEN}✓ Sistema preparado${NC}"

# =============================================================================
# 2. CONFIGURAR POSTGRESQL
# =============================================================================
echo -e "${YELLOW}[2/6] Configurando PostgreSQL...${NC}"

# Criar banco e usuário
sudo -u postgres psql <<EOF
CREATE USER saaswpp WITH PASSWORD '${DB_PASSWORD}' SUPERUSER;
CREATE DATABASE saaswpp OWNER saaswpp;
GRANT ALL PRIVILEGES ON DATABASE saaswpp TO saaswpp;
EOF

# Otimizar PostgreSQL para 8GB RAM
sudo tee -a /etc/postgresql/16/main/postgresql.conf > /dev/null << 'PGCONF'
# Otimizações para 8GB RAM
shared_buffers = 1GB
effective_cache_size = 3GB
maintenance_work_mem = 256MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 16MB
min_wal_size = 1GB
max_wal_size = 4GB
max_connections = 100
PGCONF

sudo systemctl restart postgresql
sudo systemctl enable postgresql

echo -e "${GREEN}✓ PostgreSQL configurado e otimizado${NC}"

# =============================================================================
# 3. INSTALAR NODE.JS 20 + BUN
# =============================================================================
echo -e "${YELLOW}[3/6] Instalando Node.js 20 e Bun...${NC}"

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

sudo npm install -g pm2

echo -e "${GREEN}✓ Node.js 20 e Bun instalados${NC}"

# =============================================================================
# 4. TESTAR CONEXÃO COM SERVIDOR WHATSAPP
# =============================================================================
echo -e "${YELLOW}[4/6] Testando conexão com servidor Evolution...${NC}"

# Testar Evolution API
if nc -z ${WHATSAPP_SERVER_IP} 8080 2>/dev/null; then
    echo -e "${GREEN}✓ Evolution API acessível em ${WHATSAPP_SERVER_IP}:8080${NC}"
else
    echo -e "${YELLOW}⚠ Evolution API não acessível. Configure o servidor 16GB primeiro!${NC}"
fi

# Testar Redis
if nc -z ${WHATSAPP_SERVER_IP} 6379 2>/dev/null; then
    echo -e "${GREEN}✓ Redis acessível em ${WHATSAPP_SERVER_IP}:6379${NC}"
else
    echo -e "${YELLOW}⚠ Redis não acessível.${NC}"
fi

# =============================================================================
# 5. DEPLOY APLICAÇÃO SaaSWPP
# =============================================================================
echo -e "${YELLOW}[5/6] Deploy aplicação SaaSWPP...${NC}"

sudo mkdir -p /opt/saaswpp
sudo chown $USER:$USER /opt/saaswpp

# Criar .env de produção
cat << EOF | sudo tee /opt/saaswpp/.env
# =============================================================================
# SaaSWPP AI - Cérebro do SaaS (Servidor 8GB)
# Conecta no servidor 16GB para Evolution/Redis
# =============================================================================

# App
NODE_ENV=production
PORT=3001
APP_URL=https://${DOMAIN}

# Database (PostgreSQL local)
DATABASE_URL=postgresql://saaswpp:${DB_PASSWORD}@localhost:5432/saaswpp

# Redis (servidor WhatsApp 16GB)
REDIS_URL=redis://:${REDIS_PASSWORD}@${WHATSAPP_SERVER_IP}:6379

# Evolution API (servidor WhatsApp 16GB)
EVOLUTION_API_URL=http://${WHATSAPP_SERVER_IP}:8080
EVOLUTION_API_KEY=${EVOLUTION_API_KEY}

# Meta WhatsApp (Opcional - alternativo à Evolution)
META_APP_SECRET=
META_VERIFY_TOKEN=saaswpp_verify_token_2024

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLIC_KEY=

# JWT
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRES_IN=7d

# AI Keys Pool (configure suas chaves)
GEMINI_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GLM_API_KEY=
DEEPSEEK_API_KEY=

# Trial
TRIAL_ENABLED=true
TRIAL_DEFAULT_DAYS=7

# Domínio
DOMAIN=${DOMAIN}
EOF

# Configurar PM2 (2 instâncias para 8GB)
cat << 'EOF' | sudo tee /opt/saaswpp/ecosystem.config.js
module.exports = {
  apps: [{
    name: 'saaswpp-api',
    script: 'server.ts',
    interpreter: 'bun',
    instances: 2,
    exec_mode: 'cluster',
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
}
EOF

echo -e "${GREEN}✓ Aplicação configurada${NC}"
echo -e "${YELLOW}⚠ Coloque o código em /opt/saaswpp e execute:${NC}"
echo "   cd /opt/saaswpp && bun install && bun run build && pm2 start ecosystem.config.js --env production"

# =============================================================================
# 6. CONFIGURAR NGINX + SSL
# =============================================================================
echo -e "${YELLOW}[6/6] Configurando Nginx e SSL...${NC}"

cat << 'EOF' | sudo tee /etc/nginx/sites-available/saaswpp
# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=webhook:10m rate=100r/s;

# Upstream
upstream saaswpp_app {
    server 127.0.0.1:3001;
    keepalive 32;
}

# HTTP -> HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name DOMAIN www.DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name DOMAIN www.DOMAIN;

    ssl_certificate /etc/letsencrypt/live/DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_protocols TLSv1.2 TLSv1.3;
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    client_max_body_size 50M;

    # Static files
    location /assets/ {
        alias /opt/saaswpp/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Webhooks (alta prioridade - sem rate limit agressivo)
    location /api/webhooks/ {
        limit_req zone=webhook burst=100 nodelay;
        proxy_pass http://saaswpp_app;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # API
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://saaswpp_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Main app
    location / {
        proxy_pass http://saaswpp_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Substituir DOMAIN
sudo sed -i "s/DOMAIN/${DOMAIN}/g" /etc/nginx/sites-available/saaswpp

sudo ln -sf /etc/nginx/sites-available/saaswpp /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
sudo systemctl start nginx

# SSL Certificate
sudo certbot certonly --nginx --non-interactive --agree-tos --email ${ADMIN_EMAIL} -d ${DOMAIN} -d www.${DOMAIN} || echo "Configure DNS primeiro"

sudo systemctl restart nginx
sudo systemctl enable nginx

echo -e "${GREEN}✓ Nginx e SSL configurados${NC}"

# =============================================================================
# RESUMO
# =============================================================================
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}     🧠 CÉREBRO DO SAAS CONFIGURADO!                            ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}🌐 Este servidor (8GB):${NC}"
echo "   • Painel: https://${DOMAIN}"
echo "   • PostgreSQL: localhost:5432"
echo "   • Nginx + SSL"
echo ""
echo -e "${BLUE}📡 Conectado ao Motor WhatsApp (${WHATSAPP_SERVER_IP}):${NC}"
echo "   • Evolution API: ${WHATSAPP_SERVER_IP}:8080"
echo "   • Redis: ${WHATSAPP_SERVER_IP}:6379"
echo ""
echo -e "${BLUE}💾 Uso de RAM estimado:${NC}"
echo "   • PostgreSQL: ~1GB (otimizado)"
echo "   • App (2 instâncias): ~1GB"
echo "   • Nginx: ~100MB"
echo "   • Sistema: ~500MB"
echo "   • Total: ~2.5-3GB (sobram ~5GB de folga!)"
echo ""
echo -e "${BLUE}📝 Próximos passos:${NC}"
echo "   1. Copie o código para /opt/saaswpp"
echo "   2. cd /opt/saaswpp && bun install"
echo "   3. bun run prisma migrate deploy"
echo "   4. bun run build"
echo "   5. pm2 start ecosystem.config.js --env production"
echo "   6. Configure as chaves de IA no .env"
echo "   7. Configure o Stripe"
echo ""
