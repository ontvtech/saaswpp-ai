# Sistema de Humanização - SaaSWPP AI

## 🎯 Objetivo

Evitar banimento do WhatsApp simulando comportamento humano nas respostas.

---

## 📊 FLUXO COMPLETO

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CLIENTE ENVIA MENSAGEM                           │
│                         (WhatsApp)                                  │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   EVOLUTION API WEBHOOK                             │
│              (recebe a mensagem do cliente)                         │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    processIncomingMessage()                         │
│                                                                     │
│  1. Busca contexto do Redis (últimas 10 mensagens)                 │
│  2. Busca config do lojista (prompt + RAG)                         │
│  3. Monta mensagens para a IA                                       │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      POOL DE 30 CHAVES GLM                          │
│                                                                     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                           │
│  │ K1  │ │ K2  │ │ K3  │ │ K4  │ │ ... │ (30 chaves)               │
│  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘                           │
│     │       │       │       │       │                               │
│     └───────┴───────┴───┬───┴───────┘                               │
│                         │                                           │
│            Round Robin + Concorrência                               │
│            (1 request por chave por vez)                            │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    1 CHAMADA API GLM-4.7-Flash                      │
│                                                                     │
│  Input: Mensagem do cliente + contexto + prompt do sistema          │
│  Output: 1 RESPOSTA COMPLETA (ex: 350 caracteres)                   │
│                                                                     │
│  ⚠️ IMPORTANTE: SÓ 1 CHAMADA!                                       │
│  Não faz 20 chamadas para dividir em 20 mensagens                   │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       messageChunker()                              │
│                                                                     │
│  Divide a resposta em pedaços:                                      │
│                                                                     │
│  Original: "Olá! Tudo bem? Podemos ajudar com..." (350 chars)       │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │ Pedaço 1: "Olá! Tudo bem?"                     (delay: 0ms)   │  │
│  │ Pedaço 2: "Podemos ajudar com produtos..."    (delay: 2-4s)   │  │
│  │ Pedaço 3: "Temos promoções essa semana!"      (delay: 3-6s)   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Divisão inteligente por pontuação (não corta palavras)             │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    sendAIResponse()                                 │
│                                                                     │
│  Envia cada pedaço com delay humanizado:                            │
│                                                                     │
│  [0ms]    Envia pedaço 1 → Cliente vê "digitando..."                │
│  [2.3s]   Envia pedaço 2 → Cliente vê "digitando..."                │
│  [5.1s]   Envia pedaço 3 → Cliente vê "digitando..."                │
│                                                                     │
│  Delay aleatório: 2-8 segundos por pedaço                           │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CLIENTE RECEBE                                   │
│                                                                     │
│  🔔 "Olá! Tudo bem?"                                                │
│      (2 segundos depois...)                                         │
│  🔔 "Podemos ajudar com produtos..."                                │
│      (3 segundos depois...)                                         │
│  🔔 "Temos promoções essa semana!"                                  │
│                                                                     │
│  ✅ PARECE DIGITAÇÃO HUMANA!                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 COMPONENTES DO SISTEMA

### 1. messageChunker.ts
**Função:** Divide a resposta em pedaços inteligentes

```typescript
// Exemplo de uso
const { chunks } = chunkMessage("Olá! Tudo bem? Como posso ajudar?");

// Resultado:
// chunks[0] = { text: "Olá! Tudo bem?", delay: 0 }
// chunks[1] = { text: "Como posso ajudar?", delay: 2500 }
```

**Características:**
- Divide por pontuação (não corta palavras)
- Delays aleatórios (2-8 segundos)
- 15% chance de delay extra (pensando)

### 2. whatsappService.ts
**Função:** Envia mensagens com humanização

```typescript
// Envio humanizado
await sendAIResponse(merchantId, customerPhone, aiResponse);

// Processa automaticamente:
// 1. Divide em pedaços
// 2. Aguarda delays
// 3. Envia para Evolution/Meta API
```

### 3. aiOrchestrator.ts
**Função:** Coordena IA + WhatsApp

```typescript
// Função principal do webhook
await processAndSendToWhatsApp(
  merchantId,
  customerPhone,
  userMessage,
  systemPrompt,
  context
);
```

---

## 📈 CAPACIDADE DO SISTEMA

| Métrica | Valor |
|---------|-------|
| Chaves GLM simultâneas | 30 |
| Concorrência por chave | 1 |
| RPM por chave | 60 |
| **Total RPM** | **1.800** |
| **Conversas simultâneas** | **30** |

### Exemplo de Uso:
- **5 clientes** conversando ao mesmo tempo: ✅ OK
- **10 clientes** conversando ao mesmo tempo: ✅ OK
- **30 clientes** conversando ao mesmo tempo: ✅ OK (máximo)
- **31 clientes**: ⚠️ Aguarda uma chave liberar

---

## 🚨 EVITANDO BANS

O que o sistema faz para parecer humano:

1. **Delay aleatório** (2-8s entre mensagens)
2. **Divisão em pedaços** (não manda texto gigante de uma vez)
3. **Variação nas respostas** (usa GLM que é mais natural em PT-BR)
4. **Indicador "digitando..."** (presença de composing)
5. **Emoji moderado** (15-20% das respostas)

O que NÃO fazer:
- ❌ Respostas instantâneas (< 1 segundo)
- ❌ Textos gigantes de uma vez
- ❌ Mesma resposta repetida
- ❌ Linguagem robótica/formal demais

---

## 🧪 COMO TESTAR

```bash
# Testar o chunker isoladamente
cd /home/z/my-project/saaswpp-repo
npx ts-node server/tests/test-humanization.ts
```

Resultado esperado:
```
📝 TESTE 1: Mensagem Curta
Original: "Olá! Tudo bem? Como posso ajudar você hoje?" (43 chars)
Pedaços: 1
  [1] "Olá! Tudo bem? Como posso ajudar você hoje?" (delay: 0ms)

📝 TESTE 2: Mensagem Média
Pedaços: 3
  [1] "Olá! Tudo bem? Sou a assistente..." (delay: 0ms)
  [2] "Posso ajudar você com informações..." (delay: 2500ms)
  [3] "Temos uma promoção especial..." (delay: 4100ms)
```

---

## 📁 ARQUIVOS CRIADOS/MODIFICADOS

| Arquivo | Ação |
|---------|------|
| `server/services/messageChunker.ts` | ✅ Criado |
| `server/services/whatsappService.ts` | ✅ Atualizado |
| `server/services/aiOrchestrator.ts` | ✅ Atualizado |
| `server/tests/test-humanization.ts` | ✅ Criado |

---

## ✅ RESUMO

**SIM, FUNCIONA PARA O SEU SISTEMA!**

A estratégia é:
1. **1 chamada API** → Resposta completa
2. **Seu código divide** → Múltiplos pedaços
3. **Envia com delays** → Parece humano

Isso resolve o problema da concorrência 1 do GLM gratuito e ainda deixa as respostas mais naturais!
