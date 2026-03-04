/**
 * WEBHOOK DO META (WhatsApp Business API) - SaaSWPP AI
 * Com validação de assinatura HMAC X-Hub-Signature-256
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { processIncomingMessage } from '../services/aiOrchestrator';
import { validateMetaSignature, maskPhone } from '../utils/security';
import { auditLog } from '../utils/permissions';

const prisma = new PrismaClient();

// =============================================================================
// CONFIGURAÇÕES
// =============================================================================

// App Secret da Meta (obrigatório para validação de assinatura)
const META_APP_SECRET = process.env.META_APP_SECRET;
const META_VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'saaswpp_verify_token';

if (!META_APP_SECRET) {
  console.warn('[META-WEBHOOK] META_APP_SECRET não configurado! Webhooks não serão validados.');
}

// =============================================================================
// VERIFICAÇÃO DO WEBHOOK (GET)
// =============================================================================

/**
 * Validação inicial do Webhook (Meta exige um GET para verificar o token)
 * Endpoint: GET /api/webhooks/meta
 */
export const verifyMetaWebhook = async (req: Request, res: Response): Promise<void> => {
  const mode = req.query['hub.mode'] as string;
  const token = req.query['hub.verify_token'] as string;
  const challenge = req.query['hub.challenge'] as string;

  console.log('[META-WEBHOOK] Recebida requisição de verificação:', {
    mode,
    token: token ? '***' : 'missing',
    challenge
  });

  // Verificar modo e token
  if (mode === 'subscribe' && token) {
    // Buscar merchant pelo verify token (pode ser global ou por merchant)
    const merchant = await prisma.merchant.findFirst({
      where: { metaVerifyToken: token }
    });

    // Verificar token: primeiro por merchant, depois global
    const isValidToken = merchant?.metaVerifyToken === token || token === META_VERIFY_TOKEN;

    if (isValidToken) {
      console.log('[META-WEBHOOK] Webhook verificado com sucesso');
      res.status(200).send(challenge);
      return;
    }
  }

  console.warn('[META-WEBHOOK] Falha na verificação - token inválido');
  res.sendStatus(403);
};

// =============================================================================
// RECEBIMENTO DE MENSAGENS (POST)
// =============================================================================

/**
 * Recebimento de Mensagens da Meta
 * Endpoint: POST /api/webhooks/meta
 */
export const handleMetaWebhook = async (req: Request, res: Response): Promise<void> => {
  // ============================================================================
  // 1. VALIDAÇÃO DE ASSINATURA HMAC
  // ============================================================================

  const signature = req.headers['x-hub-signature-256'] as string;
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  // Validar assinatura se o secret estiver configurado
  if (META_APP_SECRET) {
    if (!signature) {
      console.error('[META-WEBHOOK] Assinatura X-Hub-Signature-256 ausente');
      res.sendStatus(401);
      return;
    }

    const isValidSignature = validateMetaSignature(
      rawBody,
      signature,
      META_APP_SECRET
    );

    if (!isValidSignature) {
      console.error('[META-WEBHOOK] Assinatura HMAC inválida');
      
      await auditLog({
        action: 'META_WEBHOOK_INVALID_SIGNATURE',
        details: 'Tentativa de webhook com assinatura inválida'
      });

      res.sendStatus(401);
      return;
    }

    console.log('[META-WEBHOOK] Assinatura HMAC validada com sucesso');
  } else {
    console.warn('[META-WEBHOOK] Validação de assinatura DESABILITADA - META_APP_SECRET não configurado');
  }

  // ============================================================================
  // 2. PROCESSAR MENSAGENS
  // ============================================================================

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  // Verificar se é um evento de WhatsApp Business
  if (body.object !== 'whatsapp_business_account') {
    console.log('[META-WEBHOOK] Objeto não é whatsapp_business_account:', body.object);
    res.sendStatus(404);
    return;
  }

  try {
    let messagesProcessed = 0;
    let errors = 0;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        // Processar mensagens recebidas
        if (change.value?.messages) {
          for (const message of change.value.messages) {
            try {
              const result = await processMetaMessage(
                message,
                change.value,
                entry.id
              );
              
              if (result) {
                messagesProcessed++;
              }
            } catch (msgError) {
              console.error('[META-WEBHOOK] Erro ao processar mensagem:', msgError);
              errors++;
            }
          }
        }

        // Processar status de mensagens (delivered, read, etc)
        if (change.value?.statuses) {
          await processMessageStatus(change.value.statuses);
        }
      }
    }

    console.log(`[META-WEBHOOK] Processamento concluído: ${messagesProcessed} mensagens, ${errors} erros`);
    res.sendStatus(200);

  } catch (error) {
    console.error('[META-WEBHOOK] Erro crítico:', error);
    res.sendStatus(500);
  }
};

// =============================================================================
// PROCESSADORES
// =============================================================================

/**
 * Processa uma mensagem individual da Meta
 */
async function processMetaMessage(
  message: any,
  metadata: any,
  wabaId: string
): Promise<boolean> {
  const phone = message.from;
  const phoneNumberId = metadata.metadata?.phone_number_id;

  // Extrair texto da mensagem
  let text = '';
  
  if (message.text?.body) {
    text = message.text.body;
  } else if (message.image?.caption) {
    text = `[IMAGEM] ${message.image.caption}`;
  } else if (message.document?.caption) {
    text = `[DOCUMENTO] ${message.document.caption}`;
  } else if (message.audio) {
    text = '[ÁUDIO]';
  } else if (message.location) {
    text = `[LOCALIZAÇÃO] ${message.location.latitude}, ${message.location.longitude}`;
  } else if (message.contacts) {
    text = '[CONTATO]';
  } else if (message.button?.text) {
    text = message.button.text;
  } else if (message.interactive?.button_reply?.title) {
    text = message.interactive.button_reply.title;
  } else if (message.interactive?.list_reply?.title) {
    text = message.interactive.list_reply.title;
  }

  if (!text) {
    console.log(`[META-WEBHOOK] Mensagem sem texto processável de ${maskPhone(phone)}`);
    return false;
  }

  // Localizar merchant pelo Phone Number ID
  const merchant = await prisma.merchant.findFirst({
    where: {
      metaPhoneNumberId: phoneNumberId,
      whatsappApiType: 'META'
    }
  });

  if (!merchant) {
    console.warn(`[META-WEBHOOK] Merchant não encontrado para Phone Number ID: ${phoneNumberId}`);
    return false;
  }

  // Verificar se o merchant está ativo
  if (!['active', 'trial'].includes(merchant.status)) {
    console.log(`[META-WEBHOOK] Merchant ${merchant.id} inativo (${merchant.status})`);
    return false;
  }

  console.log(`[META-WEBHOOK] Processando mensagem de ${maskPhone(phone)} para merchant ${merchant.name}`);

  // Orquestrar resposta da IA
  const response = await processIncomingMessage({
    merchantId: merchant.id,
    sender: phone,
    text: text,
    apiType: 'META'
  });

  return response !== null;
}

/**
 * Processa atualizações de status de mensagens
 */
async function processMessageStatus(statuses: any[]): Promise<void> {
  for (const status of statuses) {
    const { id, status: statusType, recipient_id, timestamp } = status;

    // Log de status (pode ser usado para analytics)
    console.log(`[META-STATUS] Mensagem ${id}: ${statusType} para ${maskPhone(recipient_id)}`);

    // Em produção, pode-se armazenar no banco para métricas
    // await prisma.messageStatus.create(...)
  }
}

// =============================================================================
// ENVIO DE MENSAGENS (HELPER)
// =============================================================================

/**
 * Envia mensagem via Meta API
 */
export async function sendMetaMessage(params: {
  merchantId: string;
  to: string;
  text: string;
}): Promise<boolean> {
  const { merchantId, to, text } = params;

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    });

    if (!merchant?.metaAccessToken || !merchant.metaPhoneNumberId) {
      console.error(`[META-SEND] Merchant ${merchantId} não configurado para Meta`);
      return false;
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${merchant.metaPhoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${merchant.metaAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: {
            preview_url: false,
            body: text
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`[META-SEND] Erro ao enviar: ${error}`);
      return false;
    }

    const data = await response.json();
    console.log(`[META-SEND] Mensagem enviada com sucesso: ${data.messages?.[0]?.id}`);
    return true;

  } catch (error) {
    console.error('[META-SEND] Erro:', error);
    return false;
  }
}

/**
 * Envia mensagem com template (para iniciar conversas)
 */
export async function sendMetaTemplate(params: {
  merchantId: string;
  to: string;
  templateName: string;
  languageCode: string;
  components?: any[];
}): Promise<boolean> {
  const { merchantId, to, templateName, languageCode, components } = params;

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    });

    if (!merchant?.metaAccessToken || !merchant.metaPhoneNumberId) {
      console.error(`[META-TEMPLATE] Merchant ${merchantId} não configurado para Meta`);
      return false;
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${merchant.metaPhoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${merchant.metaAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode
            },
            components: components || []
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error(`[META-TEMPLATE] Erro ao enviar template: ${error}`);
      return false;
    }

    return true;

  } catch (error) {
    console.error('[META-TEMPLATE] Erro:', error);
    return false;
  }
}

// =============================================================================
// MARK ONLINE (TYPING INDICATOR)
// =============================================================================

/**
 * Marca mensagem como lida
 */
export async function markMessageRead(params: {
  merchantId: string;
  messageId: string;
}): Promise<boolean> {
  const { merchantId, messageId } = params;

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    });

    if (!merchant?.metaAccessToken || !merchant.metaPhoneNumberId) {
      return false;
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${merchant.metaPhoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${merchant.metaAccessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId
        })
      }
    );

    return response.ok;

  } catch (error) {
    console.error('[META-MARK-READ] Erro:', error);
    return false;
  }
}
