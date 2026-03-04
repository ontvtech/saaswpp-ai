/**
 * SERVIÇO DE INTEGRAÇÃO AI - SaaSWPP AI
 * Pool de 30+ chaves simultâneas com humanização
 * Versão: 3.0.0 - Pool Multi-Key
 */

import { PrismaClient } from '@prisma/client';
import { 
  aiKeyPool, 
  getHumanDelay, 
  humanDelay, 
  addHumanVariation,
  PoolKey 
} from './aiKeyPool';

const prisma = new PrismaClient();

// =============================================================================
// TIPOS E INTERFACES
// =============================================================================

export type AIProvider = 'GEMINI' | 'OPENAI' | 'ANTHROPIC' | 'GLM' | 'DEEPSEEK';
export type AIModel = 
  | 'gemini-2.0-flash-lite'
  | 'gemini-2.5-flash-lite'
  | 'gemini-2.0-pro'
  | 'gpt-4o-mini'
  | 'gpt-4o'
  | 'claude-3-haiku'
  | 'claude-3-sonnet'
  | 'glm-4-flash'
  | 'glm-4-plus'
  | 'glm-4.7-flash'
  | 'deepseek-chat';

export interface AIConfig {
  provider: AIProvider;
  model: AIModel;
  apiKey: string;
  keyId?: string;  // ID da chave no pool
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  content: string;
  tokensUsed: number;
  model: string;
  provider: AIProvider;
  latency: number;
  keyId?: string;
}

// =============================================================================
// CONFIGURAÇÃO DE PROVIDERS
// =============================================================================

const PROVIDER_CONFIG: Record<AIProvider, { 
  baseUrl: string; 
  models: AIModel[];
  defaultModel: AIModel;
  maxConcurrency: number;
}> = {
  GEMINI: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.0-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.0-pro'],
    defaultModel: 'gemini-2.5-flash-lite',
    maxConcurrency: 15
  },
  OPENAI: {
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o'],
    defaultModel: 'gpt-4o-mini',
    maxConcurrency: 10
  },
  ANTHROPIC: {
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-haiku', 'claude-3-sonnet'],
    defaultModel: 'claude-3-haiku',
    maxConcurrency: 10
  },
  GLM: {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4-flash', 'glm-4-plus', 'glm-4.7-flash'],
    defaultModel: 'glm-4.7-flash',
    maxConcurrency: 1  // GLM gratuito = 1 concorrência por chave
  },
  DEEPSEEK: {
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat'],
    defaultModel: 'deepseek-chat',
    maxConcurrency: 10
  }
};

// =============================================================================
// CLASSE PRINCIPAL
// =============================================================================

export class AIOrchestrator {
  private config: AIConfig;
  
  constructor(config: AIConfig) {
    this.config = config;
  }

  /**
   * Envia mensagem para o provedor de IA com humanização
   */
  async chat(messages: ChatMessage[], humanize: boolean = true): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      // Delay humanizado antes de processar
      if (humanize) {
        await humanDelay();
      }
      
      let response: AIResponse;
      
      switch (this.config.provider) {
        case 'GEMINI':
          response = await this.chatGemini(messages);
          break;
        case 'OPENAI':
          response = await this.chatOpenAI(messages);
          break;
        case 'ANTHROPIC':
          response = await this.chatAnthropic(messages);
          break;
        case 'GLM':
          response = await this.chatGLM(messages);
          break;
        case 'DEEPSEEK':
          response = await this.chatDeepSeek(messages);
          break;
        default:
          throw new Error(`Provider ${this.config.provider} não suportado`);
      }
      
      // Adicionar variação humana à resposta
      if (humanize) {
        response.content = addHumanVariation(response.content);
      }
      
      response.latency = Date.now() - startTime;
      response.keyId = this.config.keyId;
      
      return response;
      
    } catch (error: any) {
      console.error(`[AI] Erro no provider ${this.config.provider}:`, error);
      
      // Marcar chave com erro se tiver keyId
      if (this.config.keyId) {
        aiKeyPool.markKeyError(this.config.keyId, error.message);
      }
      
      throw error;
    }
  }

  // =============================================================================
  // GEMINI (Google)
  // =============================================================================
  
  private async chatGemini(messages: ChatMessage[]): Promise<AIResponse> {
    const url = `${PROVIDER_CONFIG.GEMINI.baseUrl}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;
    
    // Converter mensagens para formato Gemini
    const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
    const history = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
        contents: history,
        generationConfig: {
          maxOutputTokens: this.config.maxTokens || 2048,
          temperature: this.config.temperature || 0.7
        }
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }
    
    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    return {
      content,
      tokensUsed: data.usageMetadata?.totalTokenCount || 0,
      model: this.config.model,
      provider: 'GEMINI',
      latency: 0
    };
  }

  // =============================================================================
  // OPENAI
  // =============================================================================
  
  private async chatOpenAI(messages: ChatMessage[]): Promise<AIResponse> {
    const url = `${PROVIDER_CONFIG.OPENAI.baseUrl}/chat/completions`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        max_tokens: this.config.maxTokens || 2048,
        temperature: this.config.temperature || 0.7
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.choices?.[0]?.message?.content || '',
      tokensUsed: data.usage?.total_tokens || 0,
      model: this.config.model,
      provider: 'OPENAI',
      latency: 0
    };
  }

  // =============================================================================
  // ANTHROPIC (Claude)
  // =============================================================================
  
  private async chatAnthropic(messages: ChatMessage[]): Promise<AIResponse> {
    const url = `${PROVIDER_CONFIG.ANTHROPIC.baseUrl}/messages`;
    
    const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
    const chatMessages = messages.filter(m => m.role !== 'system');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens || 2048,
        system: systemPrompt || undefined,
        messages: chatMessages.map(m => ({
          role: m.role,
          content: m.content
        }))
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.content?.[0]?.text || '',
      tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens || 0,
      model: this.config.model,
      provider: 'ANTHROPIC',
      latency: 0
    };
  }

  // =============================================================================
  // GLM (Zhipu AI / ChatGLM) - HUMANIZAÇÃO PREMIUM
  // =============================================================================
  
  private async chatGLM(messages: ChatMessage[]): Promise<AIResponse> {
    const url = `${PROVIDER_CONFIG.GLM.baseUrl}/chat/completions`;
    
    console.log(`[AI-GLM] Usando GLM-4.7-Flash - Modelo mais humanizado para PT-BR!`);
    console.log(`[AI-GLM] Chave: ${this.config.keyId?.substring(0, 8)}...`);
    
    // Adicionar instruções de humanização no system prompt
    const humanizedMessages = this.addHumanizationPrompt(messages);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: humanizedMessages,
        max_tokens: this.config.maxTokens || 2048,
        temperature: this.config.temperature || 0.8,  // Mais variação
        top_p: 0.9,
        stream: false
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GLM API error: ${error}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.choices?.[0]?.message?.content || '',
      tokensUsed: data.usage?.total_tokens || 0,
      model: this.config.model,
      provider: 'GLM',
      latency: 0
    };
  }

  /**
   * Adiciona instruções de humanização ao prompt
   */
  private addHumanizationPrompt(messages: ChatMessage[]): ChatMessage[] {
    const humanizationInstructions = `
INSTRUÇÕES DE HUMANIZAÇÃO (SIGA SEMPRE):
- Responda de forma natural, como uma pessoa real conversando no WhatsApp
- Use linguagem informal e coloquial brasileira
- Varie suas respostas, nunca use a mesma frase duas vezes
- Use emojis com moderação (não exagere)
- Seja breve e direto, não escreva textos longos
- Pode usar gírias leves: "beleza", "tranquilo", "show", "firmeza"
- Evite pareça um robô ou assistente virtual
- Não use linguagem muito formal ou corporativa
- Responda como se fosse um atendente humano simpático`;

    const systemMessage = messages.find(m => m.role === 'system');
    
    if (systemMessage) {
      systemMessage.content = `${systemMessage.content}\n\n${humanizationInstructions}`;
      return messages;
    }
    
    return [
      { role: 'system', content: humanizationInstructions },
      ...messages
    ];
  }

  // =============================================================================
  // DEEPSEEK
  // =============================================================================
  
  private async chatDeepSeek(messages: ChatMessage[]): Promise<AIResponse> {
    const url = `${PROVIDER_CONFIG.DEEPSEEK.baseUrl}/chat/completions`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        max_tokens: this.config.maxTokens || 2048,
        temperature: this.config.temperature || 0.7
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`DeepSeek API error: ${error}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.choices?.[0]?.message?.content || '',
      tokensUsed: data.usage?.total_tokens || 0,
      model: this.config.model,
      provider: 'DEEPSEEK',
      latency: 0
    };
  }
}

// =============================================================================
// PROCESSAMENTO DE MENSAGENS ENTRANTES (WEBHOOK)
// =============================================================================

/**
 * Processa uma mensagem recebida do WhatsApp
 * Essa é a função chamada pelo webhook!
 */
export async function processIncomingMessage(params: {
  merchantId: string;
  sender: string;
  text: string;
  apiType: 'EVOLUTION' | 'META';
  instanceId?: string;
}): Promise<void> {
  const { merchantId, sender, text, apiType, instanceId } = params;
  
  console.log(`[AI-WEBHOOK] Processando mensagem de ${sender} para lojista ${merchantId}`);
  
  try {
    // 1. Buscar configuração do lojista
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        aiConfig: true,
        knowledgeBase: true
      }
    });
    
    if (!merchant) {
      throw new Error(`Lojista ${merchantId} não encontrado`);
    }
    
    // 2. Verificar se está pausado (handoff manual)
    const { isPaused } = await import('./redisService');
    if (await isPaused(merchantId, sender)) {
      console.log(`[AI-WEBHOOK] Lojista ${merchantId} pausado para ${sender}`);
      return;
    }
    
    // 3. Buscar contexto da conversa (últimas 10 mensagens)
    const contextKey = `context:${merchantId}:${sender}`;
    const { redis } = await import('./redisService');
    const contextData = await redis.lrange(contextKey, -10, -1);
    const context: ChatMessage[] = contextData.map(msg => JSON.parse(msg));
    
    // 4. Montar system prompt
    let systemPrompt = merchant.aiConfig?.systemPrompt || 
      `Você é um assistente de atendimento da ${merchant.name}. Seja educado e prestativo.`;
    
    // Adicionar base de conhecimento (RAG)
    if (merchant.knowledgeBase && merchant.knowledgeBase.length > 0) {
      const knowledge = merchant.knowledgeBase
        .map((k: any) => k.content)
        .join('\n\n');
      systemPrompt += `\n\nBASE DE CONHECIMENTO:\n${knowledge}`;
    }
    
    // 5. Processar com IA e enviar resposta humanizada
    const result = await processAndSendToWhatsApp(
      merchantId,
      sender,
      text,
      systemPrompt,
      context
    );
    
    // 6. Salvar contexto atualizado
    const newContext = [
      ...context,
      { role: 'user' as const, content: text },
      { role: 'assistant' as const, content: result.aiResponse.content }
    ].slice(-10); // Manter últimas 10
    
    await redis.del(contextKey);
    for (const msg of newContext) {
      await redis.rpush(contextKey, JSON.stringify(msg));
    }
    await redis.expire(contextKey, 24 * 60 * 60); // 24 horas
    
    console.log(`[AI-WEBHOOK] Resposta enviada: ${result.sendResult.chunksSent} mensagens`);
    
  } catch (error: any) {
    console.error('[AI-WEBHOOK] Erro:', error);
    throw error;
  }
}

// =============================================================================
// FUNÇÕES DE CONVENIÊNCIA COM POOL
// =============================================================================

/**
 * Cria uma instância do orquestrador usando o POOL de chaves
 * Suporta 30+ chaves simultâneas!
 */
export async function createAIOrchestrator(
  preferredProvider?: AIProvider,
  preferredModel?: AIModel
): Promise<{ orchestrator: AIOrchestrator; keyId: string }> {
  
  // Obter próxima chave do pool (Round Robin com concorrência)
  const poolKey = await aiKeyPool.getNextKey(preferredProvider);
  
  if (!poolKey) {
    // Fallback: buscar do banco se pool vazio
    const activeKey = await prisma.aiKey.findFirst({
      where: {
        status: 'active',
        ...(preferredProvider ? { provider: preferredProvider } : {})
      },
      orderBy: [
        { priority: 'desc' },
        { lastUsed: 'asc' }
      ]
    });
    
    if (!activeKey) {
      throw new Error('Nenhuma chave de IA ativa disponível');
    }
    
    // Adicionar ao pool
    aiKeyPool.addKey({
      id: activeKey.id,
      provider: activeKey.provider as AIProvider,
      key: activeKey.key,
      model: activeKey.model || undefined,
      status: 'active',
      lastUsed: activeKey.lastUsed,
      usageCount: activeKey.usageCount,
      currentConcurrency: 0,
      maxConcurrency: PROVIDER_CONFIG[activeKey.provider as AIProvider].maxConcurrency
    });
    
    // Tentar novamente
    return createAIOrchestrator(preferredProvider, preferredModel);
  }
  
  const model = preferredModel || 
    poolKey.model || 
    PROVIDER_CONFIG[poolKey.provider].defaultModel;
  
  const orchestrator = new AIOrchestrator({
    provider: poolKey.provider,
    model: model as AIModel,
    apiKey: poolKey.key,
    keyId: poolKey.id,
    maxTokens: 2048,
    temperature: 0.7
  });
  
  return { orchestrator, keyId: poolKey.id };
}

/**
 * Libera uma chave do pool após uso
 */
export function releaseAIKey(keyId: string) {
  aiKeyPool.releaseKey(keyId);
}

/**
 * Processa mensagem com IA usando pool completo
 * Gerencia automaticamente o ciclo de vida da chave
 */
export async function processWithAI(
  messages: ChatMessage[],
  preferredProvider?: AIProvider,
  humanize: boolean = true
): Promise<AIResponse> {
  const { orchestrator, keyId } = await createAIOrchestrator(preferredProvider);
  
  try {
    const response = await orchestrator.chat(messages, humanize);
    return response;
  } finally {
    // Sempre liberar a chave
    releaseAIKey(keyId);
  }
}

/**
 * Status do pool de chaves
 */
export function getPoolStatus() {
  return aiKeyPool.getStatus();
}

/**
 * Recarrega chaves do banco
 */
export async function reloadPool() {
  await aiKeyPool.reload();
}

/**
 * Testa conexão com um provider
 */
export async function testAIConnection(
  provider: AIProvider,
  apiKey: string,
  model?: AIModel
): Promise<{ success: boolean; latency: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const orchestrator = new AIOrchestrator({
      provider,
      apiKey,
      model: model || PROVIDER_CONFIG[provider].defaultModel
    });
    
    await orchestrator.chat([
      { role: 'user', content: 'Say "OK" if you can read this.' }
    ], false);  // Sem humanização para teste
    
    return {
      success: true,
      latency: Date.now() - startTime
    };
    
  } catch (error: any) {
    return {
      success: false,
      latency: Date.now() - startTime,
      error: error.message
    };
  }
}

// =============================================================================
// EXPORT
// =============================================================================

// =============================================================================
// INTEGRAÇÃO AI + WHATSAPP (FLUXO COMPLETO)
// =============================================================================

/**
 * Processa mensagem do cliente e envia resposta humanizada
 * 
 * FLUXO:
 * 1. Recebe mensagem do cliente
 * 2. Faz 1 chamada API (GLM/Gemini) → resposta completa
 * 3. Divide resposta em múltiplos pedaços
 * 4. Envia cada pedaço com delay 2-8 segundos
 * 
 * ISSO É O CORAÇÃO DO SISTEMA!
 */
export async function processAndSendToWhatsApp(
  merchantId: string,
  customerPhone: string,
  userMessage: string,
  systemPrompt: string,
  context: ChatMessage[] = []
): Promise<{
  aiResponse: AIResponse;
  sendResult: {
    success: boolean;
    chunksSent: number;
    totalDelay: number;
  };
}> {
  console.log(`[AI-WHATSAPP] Processando mensagem para ${customerPhone}...`);
  
  // Montar mensagens para a IA
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...context,
    { role: 'user', content: userMessage }
  ];
  
  // 1. Fazer 1 chamada API (usando pool de 30+ chaves)
  const { orchestrator, keyId } = await createAIOrchestrator('GLM');
  
  let aiResponse: AIResponse;
  
  try {
    aiResponse = await orchestrator.chat(messages, true);
    console.log(`[AI-WHATSAPP] Resposta da IA: ${aiResponse.content.length} caracteres`);
  } finally {
    // Sempre liberar a chave do pool
    releaseAIKey(keyId);
  }
  
  // 2. Enviar resposta humanizada (dividida em pedaços)
  // Importação dinâmica para evitar dependência circular
  const { sendAIResponse } = await import('./whatsappService');
  
  const sendResult = await sendAIResponse(
    merchantId,
    customerPhone,
    aiResponse.content
  );
  
  console.log(`[AI-WHATSAPP] Enviado! ${sendResult.chunksSent} mensagens em ${sendResult.totalDelay}ms`);
  
  return {
    aiResponse,
    sendResult: {
      success: sendResult.success,
      chunksSent: sendResult.chunksSent || 1,
      totalDelay: sendResult.totalDelay || 0
    }
  };
}

/**
 * Versão simplificada para chat direto (sem WhatsApp)
 * Retorna a resposta dividida em pedaços
 */
export async function chatWithChunking(
  messages: ChatMessage[],
  humanize: boolean = true
): Promise<{
  response: AIResponse;
  chunks: Array<{ text: string; delay: number }>;
}> {
  // Obter resposta da IA
  const { orchestrator, keyId } = await createAIOrchestrator();
  
  let response: AIResponse;
  
  try {
    response = await orchestrator.chat(messages, humanize);
  } finally {
    releaseAIKey(keyId);
  }
  
  // Dividir em pedaços
  const { chunkMessage } = await import('./messageChunker');
  const { chunks } = chunkMessage(response.content);
  
  return {
    response,
    chunks: chunks.map(c => ({ text: c.text, delay: c.delay }))
  };
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  AIOrchestrator,
  createAIOrchestrator,
  processWithAI,
  processIncomingMessage,
  releaseAIKey,
  getPoolStatus,
  reloadPool,
  testAIConnection,
  processAndSendToWhatsApp,
  chatWithChunking,
  PROVIDER_CONFIG,
  aiKeyPool,
  getHumanDelay,
  humanDelay,
  addHumanVariation
};
