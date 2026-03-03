# =============================================================================
# GUIA DE DEPLOY - SaaSWPP AI
# Arquitetura: 2 Servidores Ubuntu (8GB + 16GB)
# Plataforma: Coolify
# =============================================================================

## VISÃO GERAL DA ARQUITETURA

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SERVIDOR 16GB (Principal)                         │
│  Ubuntu Desktop/Server - IP: 192.168.88.6                           │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   Coolify   │  │   App API   │  │   Redis     │                 │
│  │   (Port 80) │  │  (Port 3000)│  │  (Port 6379)│                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐                                   │
│  │  Evolution  │  │   Worker    │                                   │
│  │    API      │  │  (BullMQ)   │                                   │
│  │ (Port 8080) │  │             │                                   │
│  └─────────────┘  └─────────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Rede Interna
                              │
┌─────────────────────────────────────────────────────────────────────┐
│                    SERVIDOR 8GB (Secundário)                         │
│  Ubuntu Server - IP: 192.168.88.5                                   │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐                                   │
│  │ PostgreSQL  │  │   Backup    │                                   │
│  │  (Primary)  │  │   Storage   │                                   │
│  │  (Port 5432)│  │             │                                   │
│  └─────────────┘  └─────────────┘                                   │
│                                                                      │
│  ┌─────────────┐                                                    │
│  │   Redis     │  (Replica opcional)                               │
│  │  (Backup)   │                                                    │
│  └─────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

## PASSO 1: Preparar Servidor 16GB (Principal)

### 1.1 Instalar Docker
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### 1.2 Instalar Coolify
```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

### 1.3 Configurar Firewall
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw allow 8080/tcp
sudo ufw enable
```

## PASSO 2: Preparar Servidor 8GB (Secundário)

### 2.1 Instalar PostgreSQL
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Criar banco de dados
sudo -u postgres psql
CREATE DATABASE saaswpp;
CREATE USER saaswpp WITH ENCRYPTED PASSWORD 'sua-senha-forte';
GRANT ALL PRIVILEGES ON DATABASE saaswpp TO saaswpp;
\q

# Configurar acesso remoto
sudo nano /etc/postgresql/*/main/postgresql.conf
# listen_addresses = '*'

sudo nano /etc/postgresql/*/main/pg_hba.conf
# host all all 192.168.88.0/24 md5

sudo systemctl restart postgresql
```

### 2.2 Configurar Firewall
```bash
sudo ufw allow from 192.168.88.6 to any port 5432
sudo ufw enable
```

## PASSO 3: Configurar Evolution API

### 3.1 Docker Compose para Evolution
```yaml
# evolution/docker-compose.yml
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
      - DATABASE_CONNECTION_URI=postgresql://saaswpp:senha@192.168.88.5:5432/evolution
      - REDIS_ENABLED=true
      - REDIS_URI=redis://192.168.88.6:6379
      - API_KEY=sua-chave-api-evolution
    volumes:
      - evolution_data:/evolution/storage
    networks:
      - evolution-network

volumes:
  evolution_data:

networks:
  evolution-network:
    driver: bridge
```

### 3.2 Iniciar Evolution
```bash
cd evolution
docker-compose up -d
```

## PASSO 4: Deploy no Coolify

### 4.1 Criar Novo Projeto
1. Acesse o painel do Coolify (http://seu-ip)
2. Crie um novo projeto "SaaSWPP"
3. Selecione "Docker Compose" como tipo de deploy

### 4.2 Configurar Variáveis de Ambiente
Adicione todas as variáveis do `.env.example` no Coolify:
- DATABASE_URL
- REDIS_HOST
- GEMINI_API_KEY
- STRIPE_SECRET_KEY
- EVOLUTION_API_URL
- EVOLUTION_API_KEY
- JWT_SECRET

### 4.3 Configurar Domínio
1. Adicione seu domínio no Coolify
2. Configure DNS apontando para o IP do servidor
3. Ative SSL (Let's Encrypt)

### 4.4 Deploy
1. Conecte seu repositório GitHub
2. Selecione a branch (main)
3. Clique em "Deploy"

## PASSO 5: Configurar Webhooks

### 5.1 Stripe Webhook
```
URL: https://seu-dominio.com/api/webhooks/stripe
Eventos: checkout.session.completed, customer.subscription.deleted, invoice.payment_failed
```

### 5.2 Evolution Webhook
```bash
curl -X POST http://localhost:8080/webhook/set/sua-instancia \
  -H "apikey: sua-chave" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "url": "https://seu-dominio.com/api/webhooks/evolution",
      "events": ["messages.upsert", "connection.update"]
    }
  }'
```

### 5.3 Meta Webhook
Configure no Meta Business Suite:
```
URL: https://seu-dominio.com/api/webhooks/meta
Verify Token: seu-verify-token
```

## PASSO 6: Monitoramento

### 6.1 Health Check
```bash
curl http://localhost:3000/api/health
```

### 6.2 Logs
```bash
docker logs saaswpp-app -f
docker logs saaswpp-worker -f
docker logs evolution-api -f
```

### 6.3 Status Page
Acesse: `https://seu-dominio.com/status`

## CHECKLIST DE PRODUÇÃO

- [ ] PostgreSQL configurado e acessível
- [ ] Redis funcionando
- [ ] Evolution API conectada
- [ ] SSL/HTTPS ativo
- [ ] Webhooks configurados (Stripe, Evolution, Meta)
- [ ] Variáveis de ambiente definidas
- [ ] Backups automáticos configurados
- [ ] Monitoramento ativo
- [ ] Domínio configurado
- [ ] Teste de pagamento realizado

## TROUBLESHOOTING

### Erro de conexão com banco
```bash
# Verificar se PostgreSQL aceita conexões
sudo netstat -tlnp | grep 5432
```

### Erro de conexão Redis
```bash
# Verificar Redis
redis-cli ping
```

### Evolution não conecta
```bash
# Verificar logs
docker logs evolution-api --tail 100
```

### App não inicia
```bash
# Verificar logs
docker logs saaswpp-app --tail 100

# Reconstruir
docker-compose down
docker-compose up -d --build
```
