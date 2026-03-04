/**
 * SERVIÇOS DE FEATURES ENTERPRISE - SaaSWPP AI
 * 
 * Análise de Sentimento, Gatilhos Automáticos, Sequências de Mensagens
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// ANÁLISE DE SENTIMENTO
// =============================================================================

export interface SentimentResult {
  score: number;        // -1 a 1 (negativo a positivo)
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;   // 0 a 1
  keywords: string[];   // Palavras que influenciaram
  alertLevel?: 'low' | 'medium' | 'high' | 'critical';
}

const NEGATIVE_KEYWORDS = [
  'procon', 'advogado', 'processo', 'processar', 'reclamação', 'reclamar',
  'horrível', 'péssimo', 'terrível', 'ódio', 'odeio', 'ruim', 'lixo',
  'enganado', 'golpe', 'fraude', 'estelionato', 'denunciar', 'denúncia',
  'cancelar', 'cancelamento', 'devolução', 'reembolso', 'dinheiro de volta',
  'nunca mais', 'última vez', 'decepcionado', 'decepção', 'insatisfeito',
  'gerente', 'supervisor', 'responsável', 'dono', 'proprietário',
  'justiça', 'tribunal', 'direitos', 'código defesa consumidor'
];

const POSITIVE_KEYWORDS = [
  'obrigado', 'obrigada', 'agradeço', 'agradecido', 'agradecida',
  'excelente', 'ótimo', 'maravilhoso', 'perfeito', 'incrível',
  'recomendo', 'indicar', 'indicação', 'satisfeito', 'satisfação',
  'parabéns', 'nota 10', 'nota dez', 'top', 'show', 'demais',
  'voltar', 'comprar novamente', 'adorei', 'amei', 'gostei'
];

/**
 * Analisa sentimento de uma mensagem
 */
export function analyzeSentiment(text: string): SentimentResult {
  const lowerText = text.toLowerCase();
  
  // Contar palavras-chave
  let negativeCount = 0;
  let positiveCount = 0;
  const foundNegative: string[] = [];
  const foundPositive: string[] = [];

  for (const keyword of NEGATIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      negativeCount++;
      foundNegative.push(keyword);
    }
  }

  for (const keyword of POSITIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      positiveCount++;
      foundPositive.push(keyword);
    }
  }

  // Calcular score
  const total = negativeCount + positiveCount;
  let score = 0;
  
  if (total > 0) {
    score = (positiveCount - negativeCount) / Math.max(total, 1);
  }

  // Determinar label
  let label: 'positive' | 'neutral' | 'negative';
  if (score >= 0.3) label = 'positive';
  else if (score <= -0.3) label = 'negative';
  else label = 'neutral';

  // Nível de alerta
  let alertLevel: 'low' | 'medium' | 'high' | 'critical' | undefined;
  
  if (negativeCount >= 3 || lowerText.includes('advogado') || lowerText.includes('procon')) {
    alertLevel = 'critical';
  } else if (negativeCount >= 2) {
    alertLevel = 'high';
  } else if (negativeCount >= 1) {
    alertLevel = 'medium';
  } else if (label === 'negative') {
    alertLevel = 'low';
  }

  // Keywords encontradas
  const keywords = [...foundNegative, ...foundPositive];

  return {
    score,
    label,
    confidence: Math.min(0.5 + total * 0.1, 1),
    keywords,
    alertLevel
  };
}

/**
 * Salva análise de sentimento no log
 */
export async function saveSentimentAnalysis(
  merchantId: string,
  interactionLogId: string,
  sentiment: SentimentResult
): Promise<void> {
  await prisma.interactionLog.update({
    where: { id: interactionLogId },
    data: {
      sentiment: sentiment.label
    }
  });

  // Se tem alerta, criar notificação
  if (sentiment.alertLevel && sentiment.alertLevel !== 'low') {
    await prisma.auditLog.create({
      data: {
        merchantId,
        action: 'SENTIMENT_ALERT',
        details: JSON.stringify({
          level: sentiment.alertLevel,
          score: sentiment.score,
          keywords: sentiment.keywords
        })
      }
    });
  }
}

// =============================================================================
// GATILHOS AUTOMÁTICOS
// =============================================================================

export interface TriggerConfig {
  type: 'inactivity' | 'keyword' | 'date' | 'event';
  config: {
    days?: number;
    hours?: number;
    keywords?: string[];
    date?: Date;
    event?: string;
  };
  action: {
    type: 'send_message' | 'tag' | 'notify' | 'webhook';
    template?: string;
    message?: string;
    tags?: string[];
    webhookUrl?: string;
  };
}

/**
 * Processa gatilhos de inatividade
 */
export async function processInactivityTriggers(merchantId: string): Promise<void> {
  const triggers = await prisma.automationTrigger.findMany({
    where: {
      merchantId,
      isActive: true,
      triggerType: 'inactivity'
    }
  });

  for (const trigger of triggers) {
    const config = trigger.triggerConfig as any;
    const days = config?.days || 3;
    
    // Buscar contatos inativos há X dias
    const inactiveSince = new Date();
    inactiveSince.setDate(inactiveSince.getDate() - days);

    const inactiveContacts = await prisma.chatSession.findMany({
      where: {
        merchantId,
        updatedAt: { lt: inactiveSince },
        state: 'IDLE'
      }
    });

    for (const contact of inactiveContacts) {
      // Executar ação
      const actionConfig = trigger.actionConfig as any;
      
      if (actionConfig?.template) {
        // Enviar mensagem usando template
        const { useTemplate } = await import('./templateService');
        const message = await useTemplate(merchantId, actionConfig.template, {
          telefone: contact.sender
        });

        if (message) {
          // Enviar via WhatsApp
          const { sendWhatsAppMessage } = await import('./whatsappService');
          await sendWhatsAppMessage(merchantId, contact.sender, message);
        }
      }

      // Atualizar contador
      await prisma.automationTrigger.update({
        where: { id: trigger.id },
        data: {
          triggerCount: { increment: 1 },
          lastTriggered: new Date()
        }
      });
    }
  }
}

/**
 * Processa gatilhos de palavra-chave
 */
export async function processKeywordTrigger(
  merchantId: string,
  message: string,
  sender: string
): Promise<boolean> {
  const triggers = await prisma.automationTrigger.findMany({
    where: {
      merchantId,
      isActive: true,
      triggerType: 'keyword'
    }
  });

  for (const trigger of triggers) {
    const config = trigger.triggerConfig as any;
    const keywords = config?.keywords || [];
    
    const lowerMessage = message.toLowerCase();
    const matched = keywords.some((kw: string) => lowerMessage.includes(kw.toLowerCase()));

    if (matched) {
      const actionConfig = trigger.actionConfig as any;

      if (actionConfig?.message) {
        const { sendWhatsAppMessage } = await import('./whatsappService');
        await sendWhatsAppMessage(merchantId, sender, actionConfig.message);
      }

      if (actionConfig?.tags) {
        // Taggear contato
      }

      // Atualizar contador
      await prisma.automationTrigger.update({
        where: { id: trigger.id },
        data: {
          triggerCount: { increment: 1 },
          lastTriggered: new Date()
        }
      });

      return true;
    }
  }

  return false;
}

// =============================================================================
// SEQUÊNCIAS DE MENSAGENS (DRIP CAMPAIGNS)
// =============================================================================

export interface DripStep {
  day: number;          // Dia relativo ao início
  delay: number;        // Delay em horas
  template: string;     // Template a usar
  time?: string;        // Horário preferido "09:00"
}

/**
 * Adiciona contato a uma campanha de sequência
 */
export async function addToDripCampaign(
  merchantId: string,
  campaignId: string,
  contactPhone: string,
  variables?: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    const campaign = await prisma.dripCampaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign || campaign.status !== 'active') {
      return { success: false, error: 'Campanha não encontrada ou inativa' };
    }

    // Criar registro de progresso
    await prisma.dripCampaignProgress.create({
      data: {
        merchantId,
        campaignId,
        contactPhone,
        currentStep: 0,
        variables: variables || {},
        startedAt: new Date(),
        nextStepAt: new Date() // Primeiro step imediatamente ou com delay
      }
    });

    return { success: true };

  } catch (error: any) {
    console.error('[DRIP] Erro ao adicionar contato:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Processa próximos passos das campanhas ativas
 */
export async function processDripCampaigns(): Promise<void> {
  const now = new Date();

  // Buscar progressos pendentes
  const progressList = await prisma.dripCampaignProgress.findMany({
    where: {
      nextStepAt: { lte: now },
      completed: false
    },
    include: {
      campaign: true
    }
  });

  for (const progress of progressList) {
    if (!progress.campaign || progress.campaign.status !== 'active') continue;

    const steps = progress.campaign.steps as DripStep[];
    const currentStep = steps[progress.currentStep];

    if (!currentStep) {
      // Campanha finalizada
      await prisma.dripCampaignProgress.update({
        where: { id: progress.id },
        data: { completed: true }
      });
      continue;
    }

    // Enviar mensagem
    const { useTemplate } = await import('./templateService');
    const message = await useTemplate(
      progress.merchantId,
      currentStep.template,
      progress.variables as Record<string, string>
    );

    if (message) {
      const { sendWhatsAppMessage } = await import('./whatsappService');
      await sendWhatsAppMessage(progress.merchantId, progress.contactPhone, message);

      // Atualizar estatísticas
      await prisma.dripCampaign.update({
        where: { id: progress.campaignId },
        data: { totalSent: { increment: 1 } }
      });
    }

    // Atualizar progresso
    const nextStep = steps[progress.currentStep + 1];
    
    if (nextStep) {
      const nextStepAt = new Date();
      nextStepAt.setDate(nextStepAt.getDate() + nextStep.day);
      if (nextStep.time) {
        const [hours, minutes] = nextStep.time.split(':').map(Number);
        nextStepAt.setHours(hours, minutes, 0, 0);
      }

      await prisma.dripCampaignProgress.update({
        where: { id: progress.id },
        data: {
          currentStep: { increment: 1 },
          nextStepAt
        }
      });
    } else {
      await prisma.dripCampaignProgress.update({
        where: { id: progress.id },
        data: { completed: true }
      });
    }
  }
}

/**
 * Remove contato de uma campanha
 */
export async function removeFromDripCampaign(
  contactPhone: string,
  campaignId?: string
): Promise<void> {
  await prisma.dripCampaignProgress.updateMany({
    where: {
      contactPhone,
      campaignId,
      completed: false
    },
    data: {
      completed: true,
      unsubscribedAt: new Date()
    }
  });
}

export default {
  analyzeSentiment,
  saveSentimentAnalysis,
  processInactivityTriggers,
  processKeywordTrigger,
  addToDripCampaign,
  processDripCampaigns,
  removeFromDripCampaign
};
