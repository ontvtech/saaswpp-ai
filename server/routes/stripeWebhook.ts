/**
 * WEBHOOK DO STRIPE - SaaSWPP AI
 * Com grace period de 7 dias e validação de assinatura
 * Emissão automática de NFS-e
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { validateStripeSignature } from '../utils/security';
import { auditLog } from '../utils/permissions';
import { nfseService } from '../services/nfseService';

const prisma = new PrismaClient();
export const stripeWebhookHandler = Router();

// =============================================================================
// CONFIGURAÇÕES
// =============================================================================

const GRACE_PERIOD_DAYS = 7; // Período de carência antes da suspensão total

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Deleta instância da Evolution API
 */
async function deleteEvolutionInstance(instanceName: string): Promise<void> {
  const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';
  const apiKey = process.env.EVOLUTION_API_KEY;

  if (!instanceName || !apiKey) {
    console.log('[STRIPE] Instância ou API key não configurados, pulando deleção');
    return;
  }

  try {
    const response = await fetch(`${evolutionUrl}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': apiKey }
    });

    if (!response.ok) {
      console.error(`[EVOLUTION] Falha ao deletar instância ${instanceName}: ${response.statusText}`);
    } else {
      console.log(`[EVOLUTION] Instância ${instanceName} deletada com sucesso`);
    }
  } catch (error) {
    console.error(`[EVOLUTION] Erro ao deletar instância ${instanceName}:`, error);
  }
}

/**
 * Envia email de notificação
 */
async function sendGracePeriodNotification(
  email: string,
  merchantName: string,
  daysRemaining: number
): Promise<void> {
  // Em produção, integrar com serviço de email
  console.log(`[STRIPE] Enviando notificação de grace period para ${email}: ${daysRemaining} dias restantes`);
}

/**
 * Calcula data de expiração do grace period
 */
function calculateGracePeriodEnd(startDate: Date = new Date()): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + GRACE_PERIOD_DAYS);
  return endDate;
}

// =============================================================================
// WEBHOOK HANDLER
// =============================================================================

stripeWebhookHandler.post('/', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Validação obrigatória do secret
  if (!endpointSecret) {
    console.error('[STRIPE] STRIPE_WEBHOOK_SECRET não configurado!');
    return res.status(500).send('Webhook secret não configurado');
  }

  let event: Stripe.Event;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    console.error('[STRIPE] STRIPE_SECRET_KEY não configurado!');
    return res.status(500).send('Stripe key não configurado');
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2025-02-24-preview' as any
  });

  // Validar assinatura do webhook
  try {
    // Usar raw body para validação
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    
    // Tentar validação nativa do Stripe primeiro
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
    } catch (stripeError) {
      // Fallback para validação customizada
      const isValid = validateStripeSignature(rawBody, sig, endpointSecret);
      if (!isValid) {
        console.error('[STRIPE] Validação de assinatura falhou');
        return res.status(400).send('Assinatura inválida');
      }
      // Parse manual do evento
      event = JSON.parse(rawBody);
    }
  } catch (err: any) {
    console.error(`[STRIPE] Erro na verificação de assinatura: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`[STRIPE] Evento recebido: ${event.type}`);

  // Processar eventos
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        await handleCheckoutCompleted(event, stripe);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await handleSubscriptionUpdated(event, stripe);
        break;
      }

      case 'customer.subscription.deleted': {
        await handleSubscriptionDeleted(event);
        break;
      }

      case 'invoice.payment_succeeded': {
        await handlePaymentSucceeded(event);
        break;
      }

      case 'invoice.payment_failed': {
        await handlePaymentFailed(event);
        break;
      }

      default:
        console.log(`[STRIPE] Evento não tratado: ${event.type}`);
    }

    res.send();
  } catch (error: any) {
    console.error('[STRIPE] Erro ao processar evento:', error);
    res.status(500).send('Erro interno');
  }
});

// =============================================================================
// HANDLERS DE EVENTOS
// =============================================================================

/**
 * Processa checkout completado
 */
async function handleCheckoutCompleted(event: Stripe.Event, stripe: Stripe): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;
  const email = session.customer_email || session.customer_details?.email;

  if (!email) {
    console.error('[ZERO-TOUCH] Email não encontrado na sessão');
    return;
  }

  console.log(`[ZERO-TOUCH] Pagamento confirmado para ${email}`);

  try {
    // Buscar plano pelo metadata ou usar plano padrão
    const planName = session.metadata?.planName || 'Start';
    const plan = await prisma.plan.findFirst({
      where: { name: planName }
    });

    if (!plan) {
      console.error(`[ZERO-TOUCH] Plano ${planName} não encontrado`);
      return;
    }

    // Criar ou atualizar merchant
    const merchant = await prisma.merchant.upsert({
      where: { email },
      update: {
        status: 'active',
        stripeCustomerId: session.customer as string,
        subscriptionId: session.subscription as string,
        planId: plan.id,
        tokenQuota: plan.tokenLimit,
        // Limpar grace period se existir
        gracePeriodEndsAt: null
      } as any,
      create: {
        email,
        name: session.metadata?.name || email.split('@')[0],
        status: 'active',
        stripeCustomerId: session.customer as string,
        subscriptionId: session.subscription as string,
        planId: plan.id,
        tokenQuota: plan.tokenLimit
      }
    });

    // Provisionar instância Evolution
    const instanceName = `inst_${merchant.id.slice(0, 8)}`;
    await prisma.merchant.update({
      where: { id: merchant.id },
      data: { evolutionInstance: instanceName }
    });

    await auditLog({
      merchantId: merchant.id,
      action: 'CHECKOUT_COMPLETED',
      details: `Checkout completado - Plano: ${plan.name}`
    });

    console.log(`[ZERO-TOUCH] Merchant ${merchant.id} provisionado com sucesso`);

    // =============================================================================
    // EMISSÃO DE NFS-e (SE HABILITADO)
    // =============================================================================
    // Verificar se o revendedor tem NFS-e habilitado
    if (merchant.resellerId) {
      try {
        const paymentAmount = session.amount_total ? session.amount_total / 100 : plan.price;
        
        // Emitir NFS-e para o revendedor (ele é quem recebe)
        const nfseResult = await nfseService.emitOnPaymentConfirmed({
          ownerType: 'reseller',
          ownerId: merchant.resellerId,
          value: paymentAmount,
          taker: {
            type: merchant.documentType === 'CNPJ' ? 'cnpj' : 'cpf',
            document: merchant.documentNumber || undefined,
            name: merchant.name,
            email: merchant.email
          },
          serviceDescription: `Assinatura SaaSWPP - Plano ${plan.name}`,
          paymentId: session.id,
          subscriptionId: session.subscription as string,
          paymentMethod: 'stripe'
        });
        
        if (nfseResult.success) {
          console.log(`[NFS-e] Nota emitida com sucesso: ${nfseResult.invoiceNumber}`);
          await auditLog({
            merchantId: merchant.id,
            action: 'NFSE_ISSUED',
            details: `NFS-e ${nfseResult.invoiceNumber} emitida para revendedor`
          });
        } else if (nfseResult.error !== 'NFS-e desabilitado' && nfseResult.error !== 'Configuração fiscal não encontrada') {
          console.warn(`[NFS-e] Falha ao emitir: ${nfseResult.error}`);
        }
      } catch (nfseError: any) {
        // Não falhar o checkout por erro de NFS-e
        console.error('[NFS-e] Erro ao emitir nota:', nfseError);
      }
    }

  } catch (dbError) {
    console.error('[ZERO-TOUCH] Erro no banco:', dbError);
  }
}

/**
 * Processa atualização de assinatura
 */
async function handleSubscriptionUpdated(event: Stripe.Event, stripe: Stripe): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  try {
    const merchant = await prisma.merchant.findFirst({
      where: { stripeCustomerId: customerId }
    });

    if (!merchant) {
      console.log(`[STRIPE] Merchant não encontrado para cliente ${customerId}`);
      return;
    }

    // Atualizar status baseado no status da assinatura
    const status = mapStripeStatusToLocal(subscription.status);

    await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        status,
        subscriptionId: subscription.id,
        gracePeriodEndsAt: status === 'active' ? null : merchant.gracePeriodEndsAt
      } as any
    });

    await auditLog({
      merchantId: merchant.id,
      action: 'SUBSCRIPTION_UPDATED',
      details: `Assinatura atualizada: ${subscription.status} -> ${status}`
    });

  } catch (error) {
    console.error('[STRIPE] Erro ao atualizar assinatura:', error);
  }
}

/**
 * Processa deleção de assinatura (com grace period)
 */
async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  console.log(`[SUSPENSION] Assinatura cancelada para cliente ${customerId}`);

  try {
    const merchant = await prisma.merchant.findFirst({
      where: { stripeCustomerId: customerId }
    });

    if (!merchant) {
      console.log(`[SUSPENSION] Merchant não encontrado para cliente ${customerId}`);
      return;
    }

    // Aplicar grace period
    const gracePeriodEnds = calculateGracePeriodEnd();

    await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        status: 'grace_period',
        gracePeriodEndsAt: gracePeriodEnds
      } as any
    });

    // Enviar notificação
    await sendGracePeriodNotification(
      merchant.email,
      merchant.name,
      GRACE_PERIOD_DAYS
    );

    await auditLog({
      merchantId: merchant.id,
      action: 'GRACE_PERIOD_STARTED',
      details: `Grace period iniciado - Expira em ${GRACE_PERIOD_DAYS} dias`
    });

    console.log(`[SUSPENSION] Grace period aplicado para merchant ${merchant.id} até ${gracePeriodEnds}`);

  } catch (error) {
    console.error('[SUSPENSION] Erro ao processar cancelamento:', error);
  }
}

/**
 * Processa pagamento bem-sucedido
 */
async function handlePaymentSucceeded(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;

  try {
    const merchant = await prisma.merchant.findFirst({
      where: { stripeCustomerId: customerId }
    });

    if (!merchant) return;

    // Reativar se estava em grace period ou suspenso
    if (['grace_period', 'suspended'].includes(merchant.status)) {
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          status: 'active',
          gracePeriodEndsAt: null
        } as any
      });

      await auditLog({
        merchantId: merchant.id,
        action: 'PAYMENT_RESTORED',
        details: 'Pagamento confirmado - Conta reativada'
      });

      console.log(`[STRIPE] Merchant ${merchant.id} reativado após pagamento`);
    }

  } catch (error) {
    console.error('[STRIPE] Erro ao processar pagamento:', error);
  }
}

/**
 * Processa falha de pagamento (inicia grace period)
 */
async function handlePaymentFailed(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const customerId = invoice.customer as string;

  console.log(`[PAYMENT-FAILED] Falha no pagamento para cliente ${customerId}`);

  try {
    const merchant = await prisma.merchant.findFirst({
      where: { stripeCustomerId: customerId }
    });

    if (!merchant) return;

    // Se já está em grace period, não fazer nada
    if (merchant.status === 'grace_period') {
      console.log(`[PAYMENT-FAILED] Merchant ${merchant.id} já está em grace period`);
      return;
    }

    // Iniciar grace period
    const gracePeriodEnds = calculateGracePeriodEnd();

    await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        status: 'grace_period',
        gracePeriodEndsAt: gracePeriodEnds
      } as any
    });

    // Enviar notificação
    await sendGracePeriodNotification(
      merchant.email,
      merchant.name,
      GRACE_PERIOD_DAYS
    );

    await auditLog({
      merchantId: merchant.id,
      action: 'PAYMENT_FAILED',
      details: `Falha no pagamento - Grace period iniciado (${invoice.attempt_count} tentativas)`
    });

    console.log(`[PAYMENT-FAILED] Grace period iniciado para ${merchant.id}`);

  } catch (error) {
    console.error('[PAYMENT-FAILED] Erro:', error);
  }
}

// =============================================================================
// UTILITÁRIOS
// =============================================================================

/**
 * Mapeia status do Stripe para status local
 */
function mapStripeStatusToLocal(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    'active': 'active',
    'trialing': 'trial',
    'past_due': 'grace_period',
    'canceled': 'suspended',
    'unpaid': 'suspended',
    'incomplete': 'pending_verification',
    'incomplete_expired': 'suspended',
    'paused': 'suspended'
  };

  return statusMap[stripeStatus] || 'suspended';
}

/**
 * Job para verificar grace periods expirados
 * Deve ser executado diariamente por um scheduler
 */
export async function checkExpiredGracePeriods(): Promise<number> {
  console.log('[GRACE-PERIOD] Verificando grace periods expirados...');

  const now = new Date();

  const expiredMerchants = await prisma.merchant.findMany({
    where: {
      status: 'grace_period',
      gracePeriodEndsAt: { lt: now }
    }
  });

  let suspendedCount = 0;

  for (const merchant of expiredMerchants) {
    try {
      // Deletar instância Evolution
      if (merchant.evolutionInstance) {
        await deleteEvolutionInstance(merchant.evolutionInstance);
      }

      // Suspender merchant
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          status: 'suspended',
          evolutionInstance: null
        }
      });

      await auditLog({
        merchantId: merchant.id,
        action: 'GRACE_PERIOD_EXPIRED',
        details: 'Conta suspensa após grace period expirado'
      });

      suspendedCount++;
      console.log(`[GRACE-PERIOD] Merchant ${merchant.id} suspenso`);

    } catch (error) {
      console.error(`[GRACE-PERIOD] Erro ao suspender ${merchant.id}:`, error);
    }
  }

  console.log(`[GRACE-PERIOD] ${suspendedCount} merchants suspensos`);
  return suspendedCount;
}
