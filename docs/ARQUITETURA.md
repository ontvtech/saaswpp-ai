# 🏗️ Arquitetura SaaSWPP AI - Nível Empresarial

## Visão Geral

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                        │
│                    (Usuários, Webhooks, Stripe)                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SERVIDOR 8GB (192.168.88.252)                             │
│                        "CÉREBRO DO SAAS"                                     │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                          │
│  │   Nginx     │  │   App       │  │ PostgreSQL  │                          │
│  │   + SSL     │  │  Node.js    │  │   (1GB)     │                          │
│  └─────────────┘  └─────────────┘  └─────────────┘                          │
│                                                                              │
│  • Painel do Lojista/Revendedor/Admin                                        │
│  • Processamento de Pagamentos (Stripe)                                      │
│  • Orquestração da IA                                                        │
│  • Banco de Dados (usuários, planos, configurações)                          │
│  • API REST principal                                                        │
│                                                                              │
│  RAM: ~3GB usado │ ~5GB folga                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │   Ordem: "Envie mensagem"    │
                    │   Webhook: "Mensagem recebida" │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SERVIDOR 16GB (192.168.88.254)                            │
│                       "MOTOR DO WHATSAPP"                                    │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                          │
│  │ Evolution   │  │   Redis     │  │  MongoDB    │                          │
│  │    API      │  │   (4GB)     │  │   (2GB)     │                          │
│  │   (8GB)     │  └─────────────┘  └─────────────┘                          │
│  └─────────────┐                                                             │
│                                                                              │
│  • Instâncias WhatsApp (QR Codes)                                            │
│  • Envio/Recebimento de mensagens                                            │
│  • Fila de mensagens (Redis)                                                 │
│  • Cache de sessões                                                          │
│  • Armazenamento de mídia                                                    │
│                                                                              │
│  RAM: ~10-12GB usado │ ~4-6GB folga                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Por que essa separação?

### 1. **O WhatsApp "devora" RAM**
Cada instância conectada consome memória. Com 16GB dedicados:
- ~100-200 instâncias simultâneas
- Sem travamentos, sem desconexões
- Fila de mensagens ultra-rápida (Redis dedicado)

### 2. **Painel à prova de quedas**
Se o servidor de WhatsApp lotar na Black Friday:
- O painel CONTINUA funcionando
- O cliente consegue logar, ver relatórios, fazer upgrade
- Zero impacto na experiência do usuário

### 3. **Segurança Zero Touch**
- Banco de dados ISOLADO do servidor exposto à internet
- Dados financeiros e senhas protegidos
- Servidor de WhatsApp não tem acesso direto ao banco

### 4. **Escalabilidade Infinita**
Quando lotar o servidor de 16GB:
```
Servidor 16GB #1 (cheio) ──┐
                           ├──→ Servidor 8GB (Cérebro)
Servidor 16GB #2 (novo)  ──┘
```
Basta adicionar mais um servidor de WhatsApp, sem mexer no painel!

---

## 📊 Especificações por Servidor

### Servidor 8GB (Cérebro)
| Componente | RAM | Função |
|------------|-----|--------|
| PostgreSQL | 1GB | Usuários, planos, configurações |
| App Node.js | 1GB | API REST, painel, IA |
| Nginx | 100MB | Proxy reverso, SSL |
| Sistema | 500MB | Ubuntu, serviços |
| **Folga** | **~5GB** | Crescimento |

### Servidor 16GB (Motor WhatsApp)
| Componente | RAM | Função |
|------------|-----|--------|
| Evolution API | 8GB | Instâncias WhatsApp |
| Redis | 4GB | Fila de mensagens, cache |
| MongoDB | 2GB | Dados da Evolution |
| Sistema | 500MB | Ubuntu, Docker |
| **Folga** | **~1.5GB** | Picos de uso |

---

## 🚀 Ordem de Deploy

### 1️⃣ Primeiro: Motor WhatsApp (16GB)
```bash
# No servidor 192.168.88.254
chmod +x deploy-motor-whatsapp-16gb.sh
./deploy-motor-whatsapp-16gb.sh
```

### 2️⃣ Depois: Cérebro do SaaS (8GB)
```bash
# No servidor 192.168.88.252
chmod +x deploy-cerebro-saas-8gb.sh
./deploy-cerebro-saas-8gb.sh
```

---

## 📡 Comunicação entre Servidores

```
Cérebro (8GB)              Motor WhatsApp (16GB)
     │                              │
     │  POST /message/send          │
     │  "Envie isso para +55119999" │
     │ ─────────────────────────────▶│
     │                              │
     │                              │ Envia via WhatsApp
     │                              │
     │  WEBHOOK: mensagem recebida  │
     │◀─────────────────────────────│
     │                              │
     │  Processa com IA             │
     │  Salva no PostgreSQL         │
     │                              │
```

---

## 🔐 Credenciais Padrão (MUDE EM PRODUÇÃO!)

| Serviço | Usuário | Senha Padrão |
|---------|---------|--------------|
| PostgreSQL | saaswpp | saaswpp_db_2024_secure |
| Redis | - | saaswpp_redis_2024 |
| Evolution API | - | saaswpp_evolution_2024_key |
| MongoDB | admin | evolution_mongo_2024 |

---

## 📈 Capacidade Estimada

| Métrica | Capacidade |
|---------|------------|
| Instâncias WhatsApp simultâneas | 100-200 |
| Mensagens/minuto por instância | ~1000 |
| Lojistas ativos | 500+ |
| Requisições API/segundo | 1000+ |

---

## ⚠️ Checklist Pós-Deploy

- [ ] Alterar TODAS as senhas padrão
- [ ] Configurar chaves de IA (Gemini, GLM, etc.)
- [ ] Configurar Stripe (chaves de produção)
- [ ] Configurar certificado SSL
- [ ] Configurar backup do PostgreSQL
- [ ] Configurar monitoramento (Uptime Kuma, etc.)
- [ ] Testar webhooks do Stripe
- [ ] Testar webhooks do Meta (se usar API oficial)
