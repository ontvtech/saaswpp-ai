/**
 * WHATSAPP SERVICE - SaaSWPP AI
 * Envio de mensagens com humanização (chunking + delays)
 * 
 * FLUXO HUMANIZADO:
 * 1. Recebe texto completo da IA
 * 2. Divide em múltiplos pedaços
 * 3. Envia cada pedaço com delay aleatório (2-8s)
 * 
 * RESULTADO: Parece digitação humana, evita bans!
 */

import { PrismaClient } from '@prisma/client';
import { chunkMessage, MessageChunk } from './messageChunker';

const prisma = new PrismaClient();

// =============================================================================
// TIPOS
// =============================================================================

export interface SendMessageParams {
  merchantId: string;
  to: string;
  text: string;
  humanize?: boolean;     // Se true, divide em pedaços com delay
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  chunksSent?: number;
  totalDelay?: number;
  error?: string;
}

// =============================================================================
// FUNÇÃO PRINCIPAL
// =============================================================================

/**
 * Envia uma mensagem para o cliente
 * Se humanize=true, divide em múltiplos pedaços com delays
 */
export async function sendMessage(params: SendMessageParams): Promise<SendResult> {
  const { merchantId, to, text, humanize = true } = params;

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    });

    if (!merchant) {
      throw new Error("Lojista não encontrado.");
    }

    // Limpeza do número
    const cleanPhone = to.replace(/\D/g, '');

    // Se humanize=true, dividir em pedaços
    if (humanize) {
      return await sendChunkedMessage(merchant, cleanPhone, text);
    }

    // Envio único (sem humanização)
    const result = merchant.whatsappApiType === 'META' 
      ? await sendViaMeta(merchant, cleanPhone, text)
      : await sendViaEvolution(merchant, cleanPhone, text);

    return { success: true, ...result };

  } catch (error: any) {
    console.error('[WHATSAPP] Erro ao enviar:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Envia mensagem em pedaços com delays humanizados
 * ESSA É A FUNÇÃO CHAVE PARA EVITAR BANS!
 */
async function sendChunkedMessage(merchant: any, to: string, text: string): Promise<SendResult> {
  console.log(`[WHATSAPP] Humanizando mensagem para ${to}...`);
  
  // Dividir a mensagem em pedaços
  const { chunks, totalDelay } = chunkMessage(text);
  
  console.log(`[WHATSAPP] Mensagem dividida em ${chunks.length} pedaços (delay total: ${totalDelay}ms)`);

  const results: any[] = [];
  let successCount = 0;

  for (const chunk of chunks) {
    // Aguardar delay antes de enviar (exceto primeiro)
    if (chunk.delay > 0) {
      console.log(`[WHATSAPP] Aguardando ${chunk.delay}ms antes do pedaço ${chunk.index + 1}/${chunk.total}...`);
      await sleep(chunk.delay);
    }

    console.log(`[WHATSAPP] Enviando pedaço ${chunk.index + 1}/${chunk.total}: "${chunk.text.substring(0, 50)}..."`);

    try {
      const result = merchant.whatsappApiType === 'META'
        ? await sendViaMeta(merchant, to, chunk.text)
        : await sendViaEvolution(merchant, to, chunk.text);

      results.push(result);
      successCount++;

    } catch (error: any) {
      console.error(`[WHATSAPP] Erro no pedaço ${chunk.index + 1}:`, error);
      // Continua tentando os próximos pedaços
    }
  }

  return {
    success: successCount > 0,
    chunksSent: successCount,
    totalDelay
  };
}

// =============================================================================
// ENVIO META API
// =============================================================================

async function sendViaMeta(merchant: any, to: string, text: string) {
  if (!merchant.metaAccessToken || !merchant.metaPhoneNumberId) {
    throw new Error("Configurações da Meta API incompletas.");
  }

  const url = `https://graph.facebook.com/v21.0/${merchant.metaPhoneNumberId}/messages`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${merchant.metaAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to,
      type: "text",
      text: { body: text }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("[META API ERROR]", error);
    throw new Error(`Erro Meta API: ${error.error?.message || 'Erro desconhecido'}`);
  }

  return response.json();
}

// =============================================================================
// ENVIO EVOLUTION API
// =============================================================================

async function sendViaEvolution(merchant: any, to: string, text: string) {
  if (!merchant.evolutionInstance) {
    throw new Error("Nenhuma instância Evolution conectada.");
  }

  const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';
  const apiKey = process.env.EVOLUTION_API_KEY;

  // Delay natural já embutido no Evolution
  const randomDelay = 1000 + Math.floor(Math.random() * 2000); // 1-3s

  const response = await fetch(`${evolutionUrl}/message/sendText/${merchant.evolutionInstance}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey || ''
    },
    body: JSON.stringify({
      number: to,
      options: {
        delay: randomDelay,
        presence: "composing",    // Mostra "digitando..."
        linkPreview: false
      },
      textMessage: {
        text: text
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[EVOLUTION API ERROR]", error);
    throw new Error(`Erro Evolution API: ${error}`);
  }

  return response.json();
}

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// FUNÇÃO PARA PROCESSAR RESPOSTA DA IA E ENVIAR
// =============================================================================

/**
 * Função de conveniência: processa resposta da IA e envia humanizado
 * USO PRINCIPAL NO FLUXO DO CHATBOT
 */
export async function sendAIResponse(
  merchantId: string, 
  to: string, 
  aiResponseText: string
): Promise<SendResult> {
  console.log(`[WHATSAPP] Processando resposta da IA (${aiResponseText.length} caracteres)...`);
  
  // Simular tempo de "digitação" antes de começar a enviar
  const typingDelay = Math.min(aiResponseText.length * 30, 3000);
  console.log(`[WHATSAPP] Simulando digitação por ${typingDelay}ms...`);
  await sleep(typingDelay);
  
  // Enviar com humanização (chunking + delays)
  return sendMessage({
    merchantId,
    to,
    text: aiResponseText,
    humanize: true
  });
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  sendMessage,
  sendAIResponse,
  chunkMessage
};
