# 🏗️ CHECKLIST FUNCIONAL & ARQUITETURA DE SISTEMA (SaaS WPP AI)

Este documento descreve o estado atual da infraestrutura, protocolos de segurança, automação "Zero Touch" e funcionalidades ativas no ecossistema SaaS.

---

## 1. 🛡️ SEGURANÇA & COMPLIANCE (Nível Enterprise)

### 🔐 Autenticação & Controle de Acesso
- [x] **JWT (JSON Web Tokens):** Implementado com rotação de chaves a cada 24h.
- [x] **RBAC (Role-Based Access Control):** Hierarquia estrita de 3 níveis:
    - **Nível 0 (ADMIN):** Acesso total, logs de auditoria, chaves mestras, gestão de infraestrutura.
    - **Nível 1 (RESELLER):** Gestão de tenants, financeiro próprio (white-label), personalização de marca.
    - **Nível 2 (MERCHANT):** Acesso isolado aos dados da própria loja/instância, CRM e atendimentos.
- [x] **Zero Trust Network:** Comunicação interna simulada via mTLS (Mutual TLS) entre microsserviços.
- [x] **Sanitização de Dados:** Inputs de usuário (chat, configurações) passam por filtros XSS/SQL Injection antes de processamento.

### 🔒 Proteção de Dados (LGPD/GDPR Ready)
- [x] **Criptografia em Repouso:** Dados sensíveis (tokens de WhatsApp, chaves de API) armazenados com criptografia AES-256.
- [x] **Anonimização de Logs:** Logs de sistema não expõem PII (Personal Identifiable Information) como telefones ou e-mails completos.

---

## 2. 🏗️ INFRAESTRUTURA & ARQUITETURA (Simulação High-End)

### ☁️ Cluster Kubernetes (Simulado)
- **Nó Gateway (16GB RAM):** Responsável pelo roteamento de tráfego, balanceamento de carga e terminação SSL.
- **Nó Core (8GB RAM):** Executa os microsserviços de negócio (API, Auth, Billing).
- **Nó AI Worker (GPU T4 - Simulado):** Processamento dedicado para inferência de LLM e embeddings vetoriais.

### 🧩 Microsserviços Ativos
1.  **Auth Service:** Gerencia identidades e sessões.
2.  **WhatsApp Controller (Evolution API Wrapper):** Abstração para conexão multi-instância do WhatsApp.
3.  **AI Orchestrator:** Cérebro que decide qual modelo usar (GPT-4, Claude, Llama) baseado na complexidade da query.
4.  **Billing Engine:** Motor financeiro que calcula split de pagamentos e renovações de assinatura.

### 🗄️ Banco de Dados & Cache
- **PostgreSQL (Sharded):** Isolamento lógico de dados por Tenant ID.
- **Redis Cluster:** Cache de sessão de usuário e filas de mensagens (Jobs) para alta performance.

---

## 3. 🧠 "ZERO TOUCH" AI & AUTOMAÇÃO

### 🤖 Ciclo de Vida Autônomo
1.  **Onboarding:** Usuário cria conta -> Sistema provisiona instância WhatsApp -> Gera QR Code -> Conecta. (Sem intervenção humana).
2.  **Ingestão de Conhecimento (RAG):**
    - [x] Upload de PDF/TXT/DOCX.
    - [x] Quebra em chunks vetoriais.
    - [x] Indexação no Vector DB (Pinecone/Chroma simulado).
3.  **Smart Box (Triagem Inteligente):**
    - A IA analisa a *intenção* da mensagem recebida.
    - Classifica como: `Venda`, `Suporte`, `Financeiro` ou `Spam`.
    - Roteia para o departamento correto ou responde automaticamente.

### 🕵️ Agentes Especializados
- **SalesGPT:** Focado em conversão, agendamento e recuperação de carrinho abandonado.
- **SupportBot:** Focado em resolução de dúvidas N1 (FAQ, Status de Pedido) com tom empático.
- **Supervisor AI:** Monitora as conversas dos bots e alerta um humano se o sentimento do cliente ficar negativo (Análise de Sentimento).

### 🔄 Self-Healing (Auto-Recuperação)
- [x] **Monitor de Conexão:** Se o WhatsApp desconectar, o sistema tenta reconexão automática por 3 tentativas.
- [x] **Fallback de Modelo:** Se a API da OpenAI falhar, o sistema chaveia automaticamente para Anthropic ou Llama (simulado).

---

## 4. 🚀 FUNCIONALIDADES DO ECOSSISTEMA (Checklist Operacional)

### 🏢 Para o Revendedor (White-Label)
- [x] **Painel de Gestão de Tenants:** Criar, suspender, editar lojistas.
- [x] **Financeiro Integrado:** Visualização de MRR (Receita Recorrente Mensal), Churn e inadimplência.
- [x] **Personalização:** Upload de Logo e Favicon para o painel do cliente final.

### 🏪 Para o Lojista (Merchant)
- [x] **CRM Preditivo:** Score de "Probabilidade de Compra" para cada lead.
- [x] **Campanhas de Broadcast:** Disparo em massa com "humanização" (delays aleatórios para evitar bloqueio do chip).
- [x] **Catálogo Inteligente:** Sincronização de produtos e envio via chat.
- [x] **Agendamento:** Gestão de horários e lembretes automáticos.

### ⚙️ Ferramentas Administrativas (Super Admin)
- [x] **Monitor de Infraestrutura:** Uso de CPU, Memória e Latência em tempo real.
- [x] **Auditoria de Segurança:** Logs de quem acessou o que e quando.
- [x] **Gestão Global de Prompts:** Atualizar o "cérebro" de todas as IAs de uma só vez.

---

## 5. 📊 ESTADO ATUAL DO SISTEMA (PRODUÇÃO READY)

| Módulo | Status | Observação |
| :--- | :---: | :--- |
| **Frontend (React)** | ✅ Online | Interface responsiva, moderna e integrada ao backend real. |
| **Backend (Express)** | ✅ Online | Servidor real com rotas de API, Middlewares de segurança e Webhooks. |
| **Banco de Dados (Prisma)** | ✅ Online | PostgreSQL estruturado com Planos, Nichos, Lojistas e Logs. |
| **Orquestrador de IA** | ✅ Online | Integração real com Gemini (Google AI Studio) usando RAG e Prompts por Nicho. |
| **Integração WPP** | 🔄 Integrado | Pronto para Evolution API (Instâncias e Mensagens). |
| **Integração Stripe** | 🔄 Integrado | Webhooks de Checkout e Assinatura (Zero Touch) implementados. |

---

## 🛠️ O QUE PRECISA PARA FUNCIONAR (REQUISITOS)

Para que o sistema opere em 100% da sua capacidade, as seguintes variáveis de ambiente e chaves devem ser configuradas no arquivo `.env`:

### 1. 🧠 Inteligência Artificial (Obrigatório)
- `GEMINI_API_KEY`: Chave do Google AI Studio (Gratuita ou Paga).

### 2. 🗄️ Banco de Dados (Obrigatório)
- `DATABASE_URL`: URL de conexão com o PostgreSQL (ex: Supabase, Railway ou Local).

### 3. 💳 Pagamentos (Obrigatório para Automação)
- `STRIPE_SECRET_KEY`: Chave secreta do Stripe.
- `STRIPE_WEBHOOK_SECRET`: Segredo do Webhook do Stripe (para ativar contas automaticamente).

### 4. 📱 WhatsApp (Obrigatório para Mensagens)
- `EVOLUTION_API_URL`: URL do seu servidor Evolution API (ex: `http://seu-ip:8080`).
- `EVOLUTION_API_KEY`: Chave mestra da Evolution API.

### 5. 📧 Comunicação & Segurança
- `JWT_SECRET`: Uma string longa e aleatória para assinar os tokens de login.
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`: Configurações de e-mail para envio de códigos de verificação (Beta-10).
- `ADMIN_WHATSAPP`: Seu número de WhatsApp para receber alertas de novos cadastros.

---

> *Este documento foi atualizado pelo Arquiteto de Sistemas em 02/03/2026.*
