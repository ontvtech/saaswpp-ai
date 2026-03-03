#!/bin/bash

# =============================================================================
# DEPLOY - Servidor 16GB (Motor do WhatsApp)
# IP: 192.168.88.254
# Serviços: Evolution API + Redis + MongoDB
# Objetivo: Dedicação total à mensageria e instâncias WhatsApp
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
echo "║     🚀 MOTOR DO WHATSAPP - Servidor 16GB                     ║"
echo "║     IP: 192.168.88.254                                       ║"
echo "║     Evolution API + Redis + MongoDB                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# =============================================================================
# CONFIGURAÇÕES
# =============================================================================
SERVER_IP="192.168.88.254"
APP_SERVER_IP="192.168.88.252"  # IP do servidor da aplicação

# Senhas (Mude em produção!)
EVOLUTION_API_KEY="saaswpp_evolution_2024_key"
REDIS_PASSWORD="saaswpp_redis_2024"
MONGO_PASSWORD="evolution_mongo_2024"

# =============================================================================
# 1. PREPARAÇÃO DO SISTEMA
# =============================================================================
echo -e "${YELLOW}[1/4] Preparando sistema...${NC}"

sudo apt update && sudo apt upgrade -y

sudo apt install -y \
    curl \
    wget \
    git \
    ufw \
    htop \
    fail2ban

# Firewall - permitir acesso do servidor da aplicação
sudo ufw allow 22/tcp
sudo ufw allow from ${APP_SERVER_IP} to any port 6379   # Redis
sudo ufw allow from ${APP_SERVER_IP} to any port 27017  # MongoDB
sudo ufw allow from ${APP_SERVER_IP} to any port 8080   # Evolution API
# Para webhook público (Stripe, Meta, etc)
sudo ufw allow 8080/tcp
sudo ufw --force enable

echo -e "${GREEN}✓ Sistema preparado${NC}"

# =============================================================================
# 2. INSTALAR DOCKER
# =============================================================================
echo -e "${YELLOW}[2/4] Instalando Docker...${NC}"

if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
fi

sudo systemctl enable docker
sudo systemctl start docker

echo -e "${GREEN}✓ Docker instalado${NC}"

# =============================================================================
# 3. INSTALAR REDIS (Nativo para melhor performance)
# =============================================================================
echo -e "${YELLOW}[3/4] Instalando Redis...${NC}"

sudo apt install -y redis-server

# Configurar Redis para Evolution API (alta performance)
sudo sed -i "s/# requirepass foobared/requirepass ${REDIS_PASSWORD}/" /etc/redis/redis.conf
sudo sed -i "s/bind 127.0.0.1 -::1/bind 0.0.0.0/" /etc/redis/redis.conf
sudo sed -i "s/# protected-mode yes/protected-mode no/" /etc/redis/redis.conf

# Otimizações para mensageria
sudo sed -i "s/# maxmemory-policy.*/maxmemory-policy allkeys-lru/" /etc/redis/redis.conf
echo "maxmemory 4gb" | sudo tee -a /etc/redis/redis.conf
echo "save \"\"" | sudo tee -a /etc/redis/redis.conf  # Desabilita persistência para mais velocidade

sudo systemctl restart redis-server
sudo systemctl enable redis-server

echo -e "${GREEN}✓ Redis instalado (4GB dedicados)${NC}"

# =============================================================================
# 4. DEPLOY EVOLUTION API + MONGODB (Docker)
# =============================================================================
echo -e "${YELLOW}[4/4] Deploy Evolution API + MongoDB via Docker...${NC}"

sudo mkdir -p /opt/evolution
sudo chown $USER:$USER /opt/evolution

cat << 'EOF' | sudo tee /opt/evolution/docker-compose.yml
version: '3.8'

services:
  mongodb:
    image: mongo:7
    container_name: evolution_mongodb
    restart: always
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: MONGO_PASSWORD
    volumes:
      - mongodb_data:/data/db
    networks:
      - evolution_network
    deploy:
      resources:
        limits:
          memory: 2G

  evolution_api:
    image: atendai/evolution-api:v2.1.0
    container_name: evolution_api
    restart: always
    ports:
      - "8080:8080"
    environment:
      # Servidor
      - SERVER_TYPE=http
      - SERVER_PORT=8080
      - SERVER_URL=http://SERVER_IP:8080
      
      # Banco de dados (MongoDB)
      - DATABASE_ENABLED=true
      - DATABASE_PROVIDER=mongodb
      - DATABASE_CONNECTION_URI=mongodb://admin:MONGO_PASSWORD@mongodb:27017/?authSource=admin
      - DATABASE_CONNECTION_DB_NAME=evolution
      
      # Cache (Redis externo)
      - CACHE_REDIS_ENABLED=true
      - CACHE_REDIS_URI=redis://:${REDIS_PASSWORD}@host.docker.internal:6379
      - CACHE_REDIS_PREFIX_KEY=evolution
      
      # Autenticação
      - AUTHENTICATION_API_KEY=EVOLUTION_API_KEY
      - AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true
      
      # Idioma e identidade
      - LANGUAGE=pt-BR
      - CONFIG_SESSION_PHONE_CLIENT=SaaSWPP
      - CONFIG_SESSION_PHONE_NAME=AI
      
      # Limites e performance
      - QRCODE_LIMIT=30
      - DELAY_MESSAGE=1200
      
      # Webhooks globais (para o servidor da aplicação)
      - WEBHOOK_GLOBAL_ENABLED=true
      - WEBHOOK_GLOBAL_URL=http://APP_SERVER_IP:3001/api/webhooks/evolution
      - WEBHOOK_EVENTS_APPLICATION_STARTUP=true
      - WEBHOOK_EVENTS_QRCODE_UPDATED=true
      - WEBHOOK_EVENTS_MESSAGES_SET=true
      - WEBHOOK_EVENTS_MESSAGES_UPSERT=true
      - WEBHOOK_EVENTS_MESSAGES_DELETE=true
      - WEBHOOK_EVENTS_SEND_MESSAGE=true
      - WEBHOOK_EVENTS_CONNECTION_UPDATE=true
      
    volumes:
      - evolution_instances:/evolution/instances
    depends_on:
      - mongodb
    extra_hosts:
      - "host.docker.internal:host-gateway"
    networks:
      - evolution_network
    deploy:
      resources:
        limits:
          memory: 8G

volumes:
  mongodb_data:
  evolution_instances:

networks:
  evolution_network:
    driver: bridge
EOF

# Substituir variáveis
sudo sed -i "s/SERVER_IP/${SERVER_IP}/g" /opt/evolution/docker-compose.yml
sudo sed -i "s/APP_SERVER_IP/${APP_SERVER_IP}/g" /opt/evolution/docker-compose.yml
sudo sed -i "s/MONGO_PASSWORD/${MONGO_PASSWORD}/g" /opt/evolution/docker-compose.yml
sudo sed -i "s/REDIS_PASSWORD/${REDIS_PASSWORD}/g" /opt/evolution/docker-compose.yml
sudo sed -i "s/EVOLUTION_API_KEY/${EVOLUTION_API_KEY}/g" /opt/evolution/docker-compose.yml

cd /opt/evolution
sudo docker compose up -d

echo -e "${GREEN}✓ Evolution API + MongoDB iniciados${NC}"

# =============================================================================
# OTIMIZAÇÕES DO SISTEMA PARA WHATSAPP
# =============================================================================
echo -e "${YELLOW}Aplicando otimizações de sistema...${NC}"

# Aumentar limites de arquivo para muitas conexões
echo "* soft nofile 65535" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65535" | sudo tee -a /etc/security/limits.conf

# Swappiness baixo (usar RAM preferencialmente)
echo "vm.swappiness=5" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

echo -e "${GREEN}✓ Otimizações aplicadas${NC}"

# =============================================================================
# RESUMO
# =============================================================================
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}     🚀 MOTOR DO WHATSAPP CONFIGURADO!                          ${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📊 Serviços rodando:${NC}"
echo "   • Evolution API: http://${SERVER_IP}:8080"
echo "   • Redis: ${SERVER_IP}:6379 (4GB dedicados)"
echo "   • MongoDB: ${SERVER_IP}:27017"
echo ""
echo -e "${BLUE}🔐 Credenciais:${NC}"
echo "   • Evolution API Key: ${EVOLUTION_API_KEY}"
echo "   • Redis senha: ${REDIS_PASSWORD}"
echo "   • MongoDB: admin / ${MONGO_PASSWORD}"
echo ""
echo -e "${BLUE}💾 Uso de RAM planejado:${NC}"
echo "   • Redis: 4GB (dedicado)"
echo "   • Evolution API: até 8GB (Docker limit)"
echo "   • MongoDB: até 2GB (Docker limit)"
echo "   • Sistema: ~500MB"
echo "   • Total: ~10-12GB (sobram 4-6GB de folga)"
echo ""
echo -e "${BLUE}📡 Configure o servidor da aplicação para conectar aqui:${NC}"
echo "   EVOLUTION_API_URL=http://${SERVER_IP}:8080"
echo "   EVOLUTION_API_KEY=${EVOLUTION_API_KEY}"
echo "   REDIS_URL=redis://:${REDIS_PASSWORD}@${SERVER_IP}:6379"
echo ""
echo -e "${BLUE}📈 Capacidade estimada:${NC}"
echo "   • ~100-200 instâncias WhatsApp simultâneas"
echo "   • ~1000 mensagens/minuto por instância"
echo ""
