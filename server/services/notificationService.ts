/**
 * SERVIÇO DE NOTIFICAÇÕES WHATSAPP - SaaSWPP AI
 * Versão: 1.0.0
 * 
 * Envia notificações automáticas para revendedores via WhatsApp:
 * - Novas vendas
 * - Trials expirando
 * - Clientes suspensos
 * - Clientes ativados
 * - Pagamentos falhos
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// INTERFACES
// =============================================================================

export interface NotificationConfig {
  whatsappNumber: string;
  notifyNewSale: boolean;
  notifyTrialExpiring: boolean;
  notifySuspended: boolean;
  notifyActivated: boolean;
  notifyPaymentFailed: boolean;
}

export interface NotificationData {
  type: 'NEW_SALE' | 'TRIAL_EXPIRING' | 'SUSPENDED' | 'ACTIVATED' | 'PAYMENT_FAILED' | 'GRACE_PERIOD' | 'WELCOME';
  resellerId: string;
  merchantId?: string;
  merchantName?: string;
  merchantEmail?: string;
  planName?: string;
  planPrice?: number;
  daysRemaining?: number;
  reason?: string;
}

// =============================================================================
// FUNÇÃO PRINCIPAL DE ENVIO
// =============================================================================

/**
 * Envia mensagem WhatsApp via Evolution API
 */
async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'MainInstance';

  if (!apiKey || !phone) {
    console.log('[NOTIFICATIONS] WhatsApp não configurado, pulando...');
    return false;
  }

  // Formatar número (remover caracteres não numéricos)
  const formattedPhone = phone.replace(/\D/g, '');

  try {
    const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
        delay: 1000
      })
    });

    if (!response.ok) {
      console.error('[NOTIFICATIONS] Erro ao enviar:', response.statusText);
      return false;
    }

    console.log(`[NOTIFICATIONS] Mensagem enviada para ${formattedPhone}`);
    return true;

  } catch (error) {
    console.error('[NOTIFICATIONS] Erro:', error);
    return false;
  }
}

// =============================================================================
// NOTIFICAÇÕES POR TIPO
// =============================================================================

/**
 * Notifica sobre nova venda
 */
export async function notifyNewSale(data: {
  resellerId: string;
  merchantName: string;
  merchantEmail: string;
  planName: string;
  planPrice: number;
}): Promise<void> {
  const reseller = await prisma.reseller.findUnique({
    where: { id: data.resellerId }
  });

  if (!reseller?.whatsappNumber || !reseller.notifyNewSale) return;

  const commission = data.planPrice * (reseller.commissionRate || 0.2);
  
  const message = `🎉 *NOVA VENDA!*

📦 Cliente: ${data.merchantName}
📧 Email: ${data.merchantEmail]
💎 Plano: ${data.planName}
💰 Valor: R$ ${data.planPrice.toFixed(2)}
💵 Sua comissão: R$ ${commission.toFixed(2)}

_Acesse seu painel para mais detalhes._`;

  await sendWhatsAppMessage(reseller.whatsappNumber, message);
  
  // Log da notificação
  await prisma.auditLog.create({
    data: {
      resellerId: reseller.id,
      action: 'NOTIFICATION_NEW_SALE',
      details: `Notificação enviada para ${reseller.whatsappNumber}`
    }
  });
}

/**
 * Notifica sobre trial expirando
 */
export async function notifyTrialExpiring(data: {
  resellerId: string;
  merchantName: string;
  merchantEmail: string;
  daysRemaining: number;
}): Promise<void> {
  const reseller = await prisma.reseller.findUnique({
    where: { id: data.resellerId }
  });

  if (!reseller?.whatsappNumber || !reseller.notifyTrialExpiring) return;

  const urgency = data.daysRemaining <= 1 ? '🚨 *URGENTE*' : '⚠️ *ATENÇÃO*';
  
  const message = `${urgency} - TRIAL EXPIRANDO

📦 Cliente: ${data.merchantName}
📧 Email: ${data.merchantEmail}
⏰ Dias restantes: ${data.daysRemaining}

_Entre em contato para converter em assinatura!_`;

  await sendWhatsAppMessage(reseller.whatsappNumber, message);
}

/**
 * Notifica sobre cliente suspenso
 */
export async function notifySuspended(data: {
  resellerId: string;
  merchantName: string;
  merchantEmail: string;
  reason: string;
}): Promise<void> {
  const reseller = await prisma.reseller.findUnique({
    where: { id: data.resellerId }
  });

  if (!reseller?.whatsappNumber || !reseller.notifySuspended) return;

  const message = `🔴 *CLIENTE SUSPENSO*

📦 Cliente: ${data.merchantName}
📧 Email: ${data.merchantEmail}
📝 Motivo: ${data.reason}

_Acesse seu painel para regularizar._`;

  await sendWhatsAppMessage(reseller.whatsappNumber, message);
}

/**
 * Notifica sobre cliente ativado
 */
export async function notifyActivated(data: {
  resellerId: string;
  merchantName: string;
  merchantEmail: string;
  planName: string;
}): Promise<void> {
  const reseller = await prisma.reseller.findUnique({
    where: { id: data.resellerId }
  });

  if (!reseller?.whatsappNumber || !reseller.notifyActivated) return;

  const message = `✅ *CLIENTE ATIVADO!*

📦 Cliente: ${data.merchantName}
📧 Email: ${data.merchantEmail}
💎 Plano: ${data.planName}

_Tudo certo! O cliente já pode usar a plataforma._`;

  await sendWhatsAppMessage(reseller.whatsappNumber, message);
}

/**
 * Notifica sobre pagamento falho
 */
export async function notifyPaymentFailed(data: {
  resellerId: string;
  merchantName: string;
  merchantEmail: string;
  planName: string;
}): Promise<void> {
  const reseller = await prisma.reseller.findUnique({
    where: { id: data.resellerId }
  });

  if (!reseller?.whatsappNumber || !reseller.notifyPaymentFailed) return;

  const message = `⚠️ *PAGAMENTO FALHOU*

📦 Cliente: ${data.merchantName}
📧 Email: ${data.merchantEmail}
💎 Plano: ${data.planName}

_O cliente entrou em período de carência (7 dias). Entre em contato!_`;

  await sendWhatsAppMessage(reseller.whatsappNumber, message);
}

/**
 * Notifica sobre grace period
 */
export async function notifyGracePeriod(data: {
  resellerId: string;
  merchantName: string;
  merchantEmail: string;
  daysRemaining: number;
}): Promise<void> {
  const reseller = await prisma.reseller.findUnique({
    where: { id: data.resellerId }
  });

  if (!reseller?.whatsappNumber) return;

  const message = `⏳ *PERÍODO DE CARÊNCIA*

📦 Cliente: ${data.merchantName}
📧 Email: ${data.merchantEmail}
⏰ Dias restantes: ${data.daysRemaining}

_Após isso, a conta será suspensa automaticamente._`;

  await sendWhatsAppMessage(reseller.whatsappNumber, message);
}

/**
 * Envia mensagem de boas-vindas para novo revendedor
 */
export async function notifyWelcomeReseller(data: {
  resellerId: string;
  resellerName: string;
  maxTenants: number;
}): Promise<void> {
  const reseller = await preller.findUnique({
    where: { id: data.resellerId }
  });

  if (!reseller?.whatsappNumber) return;

  const message = `👋 *BEM-VINDO AO SaaSWPP!*

🎉 Parabéns, ${data.resellerName}!
🏢 Sua conta de revendedor está ativa.
👥 Máximo de lojistas: ${data.maxTenants}

_Você receberá notificações de vendas e alertas aqui neste WhatsApp._

_Acesse seu painel para começar!_`;

  await sendWhatsAppMessage(reseller.whatsappNumber, message);
}

// =============================================================================
// FUNÇÃO UNIFICADA DE NOTIFICAÇÃO
// =============================================================================

export async function sendNotification(data: NotificationData): Promise<void> {
  switch (data.type) {
    case 'NEW_SALE':
      if (data.merchantName && data.merchantEmail && data.planName && data.planPrice) {
        await notifyNewSale({
          resellerId: data.resellerId,
          merchantName: data.merchantName,
          merchantEmail: data.merchantEmail,
          planName: data.planName,
          planPrice: data.planPrice
        });
      }
      break;

    case 'TRIAL_EXPIRING':
      if (data.merchantName && data.merchantEmail && data.daysRemaining) {
        await notifyTrialExpiring({
          resellerId: data.resellerId,
          merchantName: data.merchantName,
          merchantEmail: data.merchantEmail,
          daysRemaining: data.daysRemaining
        });
      }
      break;

    case 'SUSPENDED':
      if (data.merchantName && data.merchantEmail && data.reason) {
        await notifySuspended({
          resellerId: data.resellerId,
          merchantName: data.merchantName,
          merchantEmail: data.merchantEmail,
          reason: data.reason
        });
      }
      break;

    case 'ACTIVATED':
      if (data.merchantName && data.merchantEmail && data.planName) {
        await notifyActivated({
          resellerId: data.resellerId,
          merchantName: data.merchantName,
          merchantEmail: data.merchantEmail,
          planName: data.planName
        });
      }
      break;

    case 'PAYMENT_FAILED':
      if (data.merchantName && data.merchantEmail && data.planName) {
        await notifyPaymentFailed({
          resellerId: data.resellerId,
          merchantName: data.merchantName,
          merchantEmail: data.merchantEmail,
          planName: data.planName
        });
      }
      break;

    case 'GRACE_PERIOD':
      if (data.merchantName && data.merchantEmail && data.daysRemaining) {
        await notifyGracePeriod({
          resellerId: data.resellerId,
          merchantName: data.merchantName,
          merchantEmail: data.merchantEmail,
          daysRemaining: data.daysRemaining
        });
      }
      break;
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export const NotificationService = {
  sendNotification,
  notifyNewSale,
  notifyTrialExpiring,
  notifySuspended,
  notifyActivated,
  notifyPaymentFailed,
  notifyGracePeriod,
  notifyWelcomeReseller
};

export default NotificationService;
