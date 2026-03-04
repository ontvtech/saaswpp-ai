/**
 * SERVIÇOS DE FEATURES ELITE E NINJA - SaaSWPP AI
 * 
 * Memória de Longo Prazo, Webhooks, API Pública, TTS
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// MEMÓRIA DE LONGO PRAZO (ELITE)
// =============================================================================

export interface ClientMemory {
  customerPhone: string;
  customerName?: string;
  preferences: string[];
  purchaseHistory: Array<{
    product: string;
    date: string;
    value: number;
  }>;
  totalInteractions: number;
  totalPurchases: number;
  totalValue: number;
  firstContact?: Date;
  lastContact?: Date;
}

/**
 * Busca memória do cliente
 */
export async function getClientMemory(
  merchantId: string,
  customerPhone: string
): Promise<ClientMemory | null> {
  const memory = await prisma.clientMemory.findUnique({
    where: {
      merchantId_customerPhone: { merchantId, customerPhone }
    }
  });

  if (!memory) return null;

  return {
    customerPhone: memory.customerPhone,
    customerName: memory.customerName || undefined,
    preferences: (memory.preferences as string[]) || [],
    purchaseHistory: (memory.purchaseHistory as any[]) || [],
    totalInteractions: memory.totalInteractions,
    totalPurchases: memory.totalPurchases,
    totalValue: memory.totalValue,
    firstContact: memory.firstContact || undefined,
    lastContact: memory.lastContact || undefined
  };
}

/**
 * Atualiza memória do cliente
 */
export async function updateClientMemory(
  merchantId: string,
  customerPhone: string,
  data: Partial<ClientMemory>
): Promise<ClientMemory> {
  const existing = await prisma.clientMemory.findUnique({
    where: { merchantId_customerPhone: { merchantId, customerPhone } }
  });

  if (existing) {
    const updated = await prisma.clientMemory.update({
      where: { id: existing.id },
      data: {
        customerName: data.customerName || existing.customerName,
        preferences: data.preferences || existing.preferences,
        purchaseHistory: data.purchaseHistory || existing.purchaseHistory,
        totalInteractions: { increment: 1 },
        lastContact: new Date()
      }
    });

    return updated as unknown as ClientMemory;
  }

  const created = await prisma.clientMemory.create({
    data: {
      merchantId,
      customerPhone,
      customerName: data.customerName,
      preferences: data.preferences || [],
      purchaseHistory: data.purchaseHistory || [],
      totalInteractions: 1,
      firstContact: new Date(),
      lastContact: new Date()
    }
  });

  return created as unknown as ClientMemory;
}

/**
 * Registra compra na memória
 */
export async function recordPurchase(
  merchantId: string,
  customerPhone: string,
  product: string,
  value: number
): Promise<void> {
  const memory = await getClientMemory(merchantId, customerPhone);

  const purchaseHistory = memory?.purchaseHistory || [];
  purchaseHistory.push({
    product,
    date: new Date().toISOString(),
    value
  });

  await prisma.clientMemory.upsert({
    where: { merchantId_customerPhone: { merchantId, customerPhone } },
    create: {
      merchantId,
      customerPhone,
      purchaseHistory,
      totalPurchases: 1,
      totalValue: value
    },
    update: {
      purchaseHistory,
      totalPurchases: { increment: 1 },
      totalValue: { increment: value }
    }
  });
}

/**
 * Gera contexto de memória para IA
 */
export async function buildMemoryContext(
  merchantId: string,
  customerPhone: string
): Promise<string> {
  const memory = await getClientMemory(merchantId, customerPhone);

  if (!memory) return '';

  let context = `INFORMAÇÕES DO CLIENTE:\n`;
  
  if (memory.customerName) {
    context += `- Nome: ${memory.customerName}\n`;
  }
  
  if (memory.totalPurchases > 0) {
    context += `- Cliente já fez ${memory.totalPurchases} compra(s) totalizando R$ ${memory.totalValue.toFixed(2)}\n`;
  }

  if (memory.preferences.length > 0) {
    context += `- Preferências: ${memory.preferences.join(', ')}\n`;
  }

  if (memory.purchaseHistory.length > 0) {
    const lastPurchase = memory.purchaseHistory[memory.purchaseHistory.length - 1];
    context += `- Última compra: ${lastPurchase.product} (R$ ${lastPurchase.value.toFixed(2)})\n`;
  }

  return context;
}

// =============================================================================
// WEBHOOKS (ELITE)
// =============================================================================

export type WebhookEvent = 
  | 'new_message' 
  | 'sale_confirmed' 
  | 'appointment_created'
  | 'appointment_confirmed'
  | 'human_handoff'
  | 'sentiment_negative';

/**
 * Dispara webhook
 */
export async function triggerWebhook(
  merchantId: string,
  event: WebhookEvent,
  data: any
): Promise<void> {
  const webhooks = await prisma.webhookConfig.findMany({
    where: {
      merchantId,
      isActive: true,
      events: { has: event }
    }
  });

  for (const webhook of webhooks) {
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SaaSWPP-Event': event,
          'X-SaaSWPP-Signature': generateSignature(data, webhook.secret || ''),
          ...(webhook.headers as Record<string, string> || {})
        },
        body: JSON.stringify({
          event,
          timestamp: new Date().toISOString(),
          data
        })
      });

      if (response.ok) {
        await prisma.webhookConfig.update({
          where: { id: webhook.id },
          data: {
            totalSent: { increment: 1 },
            lastSentAt: new Date()
          }
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }

    } catch (error: any) {
      console.error(`[WEBHOOK] Erro ao disparar:`, error);
      
      await prisma.webhookConfig.update({
        where: { id: webhook.id },
        data: { totalFailed: { increment: 1 } }
      });
    }
  }
}

function generateSignature(data: any, secret: string): string {
  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(data))
    .digest('hex');
}

// =============================================================================
// API PÚBLICA (NINJA)
// =============================================================================

export interface ApiKey {
  id: string;
  merchantId: string;
  key: string;
  name: string;
  permissions: string[];
  lastUsed?: Date;
  requestCount: number;
}

/**
 * Cria chave de API
 */
export async function createApiKey(
  merchantId: string,
  name: string,
  permissions: string[] = ['read', 'write']
): Promise<ApiKey> {
  const crypto = require('crypto');
  const key = `sk_${crypto.randomBytes(24).toString('hex')}`;

  const apiKey = await prisma.apiKey.create({
    data: {
      merchantId,
      key,
      name,
      permissions,
      requestCount: 0
    }
  });

  return apiKey as unknown as ApiKey;
}

/**
 * Valida chave de API
 */
export async function validateApiKey(key: string): Promise<ApiKey | null> {
  const apiKey = await prisma.apiKey.findUnique({
    where: { key }
  });

  if (!apiKey) return null;

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: {
      lastUsed: new Date(),
      requestCount: { increment: 1 }
    }
  });

  return apiKey as unknown as ApiKey;
}

// =============================================================================
// TTS - TEXT TO SPEECH (NINJA)
// =============================================================================

export interface TTSOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
}

/**
 * Converte texto em áudio (TTS)
 */
export async function textToSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<{ success: boolean; audioUrl?: string; duration?: number; error?: string }> {
  try {
    // Integração com serviço TTS (ElevenLabs, Azure, Google)
    const ttsProvider = process.env.TTS_PROVIDER || 'elevenlabs';
    const ttsApiKey = process.env.TTS_API_KEY;

    if (!ttsApiKey) {
      return { success: false, error: 'TTS não configurado' };
    }

    if (ttsProvider === 'elevenlabs') {
      return await elevenLabsTTS(text, ttsApiKey, options);
    }

    // Fallback para Google TTS
    return await googleTTS(text, options);

  } catch (error: any) {
    console.error('[TTS] Erro:', error);
    return { success: false, error: error.message };
  }
}

async function elevenLabsTTS(
  text: string,
  apiKey: string,
  options: TTSOptions
): Promise<{ success: boolean; audioUrl?: string; duration?: number; error?: string }> {
  const voiceId = options.voice || process.env.TTS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          speed: options.speed || 1.0
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    return { success: false, error };
  }

  // Salvar áudio
  const audioBuffer = await response.arrayBuffer();
  const filename = `tts_${Date.now()}.mp3`;
  const audioPath = `uploads/tts/${filename}`;

  // Salvar arquivo (usar storageService)
  const fs = require('fs');
  const path = require('path');
  
  const uploadDir = path.join(process.cwd(), 'uploads', 'tts');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(audioBuffer));

  const baseUrl = process.env.PLATFORM_URL || 'https://saaswpp.work';
  const audioUrl = `${baseUrl}/uploads/tts/${filename}`;

  // Calcular duração aproximada (150 palavras por minuto)
  const wordCount = text.split(' ').length;
  const duration = (wordCount / 150) * 60;

  return { 
    success: true, 
    audioUrl,
    duration
  };
}

async function googleTTS(
  text: string,
  options: TTSOptions
): Promise<{ success: boolean; audioUrl?: string; duration?: number; error?: string }> {
  // Implementar Google Cloud TTS se necessário
  return { success: false, error: 'Google TTS não implementado' };
}

// =============================================================================
// AGENTES AUTÔNOMOS (NINJA)
// =============================================================================

export type AgentAction = 
  | 'create_order'
  | 'send_invoice'
  | 'check_stock'
  | 'schedule_appointment'
  | 'process_payment'
  | 'update_crm';

export interface AgentDecision {
  action: AgentAction;
  confidence: number;
  parameters: Record<string, any>;
  requiresConfirmation: boolean;
}

/**
 * Analisa mensagem e decide ação autônoma
 */
export async function analyzeForAgentAction(
  message: string,
  context: { merchantId: string; customerPhone: string }
): Promise<AgentDecision | null> {
  const lowerMessage = message.toLowerCase();

  // Detectar intenção de pedido
  if (lowerMessage.includes('quero pedir') || lowerMessage.includes('fazer pedido') || lowerMessage.includes('comprar')) {
    return {
      action: 'create_order',
      confidence: 0.8,
      parameters: { intent: 'purchase' },
      requiresConfirmation: true
    };
  }

  // Detectar intenção de agendamento
  if (lowerMessage.includes('agendar') || lowerMessage.includes('marcar horário') || lowerMessage.includes('reservar')) {
    return {
      action: 'schedule_appointment',
      confidence: 0.85,
      parameters: { intent: 'schedule' },
      requiresConfirmation: true
    };
  }

  // Detectar intenção de pagamento
  if (lowerMessage.includes('pagar') || lowerMessage.includes('pix') || lowerMessage.includes('cartão')) {
    return {
      action: 'process_payment',
      confidence: 0.75,
      parameters: { intent: 'payment' },
      requiresConfirmation: true
    };
  }

  return null;
}

export default {
  getClientMemory,
  updateClientMemory,
  recordPurchase,
  buildMemoryContext,
  triggerWebhook,
  createApiKey,
  validateApiKey,
  textToSpeech,
  analyzeForAgentAction
};
