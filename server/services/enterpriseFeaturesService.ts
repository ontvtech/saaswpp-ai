/**
 * FEATURES ENTERPRISE (R$ 497) - SaaSWPP AI
 * 
 * 1. Sentiment Analysis - Detectar clientes insatisfeitos em tempo real
 * 2. Auto Triggers - Ações baseadas em eventos e comportamentos
 * 3. Message Sequences - Campanhas de nutrição de leads (Drip Campaigns)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// 1. SENTIMENT ANALYSIS - Análise de Sentimento em Tempo Real
// =============================================================================

export interface SentimentResult {
  score: number;        // -1 a 1 (negativo a positivo)
  label: 'positive' | 'neutral' | 'negative';
  confidence: number;   // 0 a 1
  emotions?: {
    joy: number;
    anger: number;
    sadness: number;
    fear: number;
    surprise: number;
  };
  keywords?: string[];
  requiresAttention: boolean;
  suggestedAction?: string;
}

export interface SentimentAlert {
  id: string;
  merchantId: string;
  customerPhone: string;
  sentiment: SentimentResult;
  message: string;
  conversationId?: string;
  handledAt?: Date;
  handledBy?: string;
}

export class SentimentAnalysisService {
  
  // Palavras-chave para análise rápida
  private readonly positiveWords = [
    'obrigado', 'obrigada', 'ótimo', 'ótima', 'excelente', 'perfeito', 'perfeita',
    'adorei', 'amei', 'incrível', 'maravilhoso', 'maravilhosa', 'sensacional',
    'top', 'show', 'demais', 'legal', 'bacana', 'gostei', 'satisfeito', 'satisfeita',
    'recomendo', 'parabéns', 'parabens', 'sucesso', 'bom', 'boa', 'melhor'
  ];
  
  private readonly negativeWords = [
    'ruim', 'péssimo', 'pessimo', 'horrível', 'horrivel', 'terrível', 'terrivel',
    'péssima', 'pessima', 'odiei', 'detestei', 'frustrado', 'frustrada', 'decepcionado',
    'decepcionada', 'insatisfeito', 'insatisfeita', 'reclamação', 'reclamacao',
    'reclamar', 'problema', 'erro', 'errado', 'defeito', 'defeituoso', 'engano',
    'enganado', 'enganada', 'nunca mais', 'cancelar', 'cancelamento', 'devolução'
  ];
  
  private readonly criticalWords = [
    'procon', 'advogado', 'jurídico', 'juridico', 'processo', 'processar',
    'denúncia', 'denuncia', 'fraude', 'estelionato', 'golpe', 'justiça', 'justica',
    'direitos', 'código', 'codigo', 'defesa', 'consumidor', 'reembolso', 'reclameaqui',
    'avaliação negativa', 'avaliacao negativa', 'google negativo', 'comentário negativo'
  ];
  
  private readonly handoffWords = [
    'falar com gerente', 'falar com humano', 'falar com pessoa', 'atendente',
    'atendimento humano', 'quero falar', 'passa pra alguém', 'passa para alguem',
    'não quero robô', 'nao quero robo', 'humano por favor', 'pessoa real'
  ];
  
  /**
   * Analisa sentimento de uma mensagem
   */
  async analyzeSentiment(message: string): Promise<SentimentResult> {
    const lowerMessage = message.toLowerCase();
    
    // Contar palavras positivas e negativas
    let positiveCount = 0;
    let negativeCount = 0;
    let criticalCount = 0;
    let handoffDetected = false;
    
    this.positiveWords.forEach(word => {
      if (lowerMessage.includes(word)) positiveCount++;
    });
    
    this.negativeWords.forEach(word => {
      if (lowerMessage.includes(word)) negativeCount++;
    });
    
    this.criticalWords.forEach(word => {
      if (lowerMessage.includes(word)) criticalCount++;
    });
    
    this.handoffWords.forEach(phrase => {
      if (lowerMessage.includes(phrase)) handoffDetected = true;
    });
    
    // Calcular score
    let score = 0;
    const totalKeywords = positiveCount + negativeCount + criticalCount;
    
    if (totalKeywords > 0) {
      score = (positiveCount - negativeCount - (criticalCount * 3)) / Math.max(totalKeywords, 1);
    }
    
    // Determinar label
    let label: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (score >= 0.2) label = 'positive';
    else if (score <= -0.2) label = 'negative';
    
    // Calcular confiança baseada na quantidade de palavras encontradas
    const confidence = Math.min(1, totalKeywords * 0.2 + 0.3);
    
    // Verificar se requer atenção
    const requiresAttention = criticalCount > 0 || score <= -0.5 || handoffDetected;
    
    // Sugerir ação
    let suggestedAction: string | undefined;
    if (criticalCount > 0) {
      suggestedAction = 'URGENT: Cliente mencionou termos críticos (procon, advogado, etc). Transferir imediatamente para atendimento humano.';
    } else if (handoffDetected) {
      suggestedAction = 'Cliente solicitou atendimento humano. Transferir para [HUMAN_HANDOFF].';
    } else if (score <= -0.5) {
      suggestedAction = 'Cliente muito insatisfeito. Considerar oferecer compensação ou desconto.';
    } else if (score <= -0.2) {
      suggestedAction = 'Cliente levemente insatisfeito. Oferecer solução ou escuta ativa.';
    }
    
    // Extrair palavras-chave relevantes
    const keywords: string[] = [];
    [...this.positiveWords, ...this.negativeWords, ...this.criticalWords].forEach(word => {
      if (lowerMessage.includes(word)) keywords.push(word);
    });
    
    // Análise de emoções (simplificada)
    const emotions = {
      joy: positiveCount > 0 ? Math.min(1, positiveCount * 0.3) : 0,
      anger: negativeCount > 0 || criticalCount > 0 ? Math.min(1, (negativeCount + criticalCount) * 0.3) : 0,
      sadness: lowerMessage.includes('triste') || lowerMessage.includes('decepcionado') ? 0.5 : 0,
      fear: criticalCount > 0 ? 0.3 : 0,
      surprise: lowerMessage.includes('surpresa') || lowerMessage.includes('inesperado') ? 0.5 : 0
    };
    
    return {
      score,
      label,
      confidence,
      emotions,
      keywords: keywords.slice(0, 5),
      requiresAttention,
      suggestedAction
    };
  }
  
  /**
   * Analisa sentimento com IA (mais preciso)
   */
  async analyzeWithAI(message: string): Promise<SentimentResult> {
    try {
      const { aiOrchestrator } = await import('./aiOrchestrator');
      
      const prompt = `Analise o sentimento da seguinte mensagem de um cliente e retorne APENAS um JSON válido:

Mensagem: "${message}"

Retorne no formato:
{
  "score": <número de -1 a 1>,
  "label": "<positive, neutral ou negative>",
  "confidence": <número de 0 a 1>,
  "emotions": {
    "joy": <0 a 1>,
    "anger": <0 a 1>,
    "sadness": <0 a 1>,
    "fear": <0 a 1>,
    "surprise": <0 a 1>
  },
  "keywords": ["palavra1", "palavra2"],
  "requiresAttention": <true ou false>,
  "suggestedAction": "<ação sugerida se necessário>"
}`;

      const response = await aiOrchestrator.generateResponse({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt: 'Você é um analisador de sentimento. Retorne apenas JSON válido.',
        merchantId: 'system'
      });
      
      const cleaned = response.content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleaned);
      
    } catch (error) {
      // Fallback para análise local
      return this.analyzeSentiment(message);
    }
  }
  
  /**
   * Salva alerta de sentimento
   */
  async createAlert(
    merchantId: string,
    customerPhone: string,
    message: string,
    sentiment: SentimentResult
  ): Promise<SentimentAlert> {
    const alert = await prisma.interactionLog.create({
      data: {
        merchantId,
        sender: customerPhone,
        question: message,
        answer: JSON.stringify(sentiment),
        sentiment: sentiment.label
      }
    });
    
    return {
      id: alert.id,
      merchantId,
      customerPhone,
      sentiment,
      message
    };
  }
  
  /**
   * Busca alertas pendentes
   */
  async getPendingAlerts(merchantId: string): Promise<SentimentAlert[]> {
    const alerts = await prisma.interactionLog.findMany({
      where: {
        merchantId,
        sentiment: 'negative'
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    return alerts.map(a => ({
      id: a.id,
      merchantId: a.merchantId,
      customerPhone: a.sender,
      sentiment: JSON.parse(a.answer || '{}'),
      message: a.question
    }));
  }
  
  /**
   * Marca alerta como tratado
   */
  async markAlertHandled(alertId: string, handledBy: string): Promise<void> {
    await prisma.interactionLog.update({
      where: { id: alertId },
      data: {
        intent: `handled_by_${handledBy}`
      }
    });
  }
}

// =============================================================================
// 2. AUTO TRIGGERS - Gatilhos Automáticos
// =============================================================================

export interface TriggerConfig {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  isActive: boolean;
  
  // Condição
  triggerType: 'keyword' | 'inactivity' | 'event' | 'time' | 'sentiment';
  triggerConfig: {
    keywords?: string[];
    days?: number;
    hours?: number[];
    event?: string;
    sentimentThreshold?: number;
  };
  
  // Ação
  actionType: 'send_message' | 'tag' | 'notify' | 'webhook' | 'transfer';
  actionConfig: {
    message?: string;
    template?: string;
    tags?: string[];
    webhookUrl?: string;
    transferTo?: string;
  };
  
  // Métricas
  triggerCount: number;
  lastTriggered?: Date;
}

export class AutoTriggersService {
  
  /**
   * Processa mensagem e verifica triggers
   */
  async processTriggers(
    merchantId: string,
    message: string,
    sender: string,
    context: {
      lastMessageDate?: Date;
      sentiment?: SentimentResult;
    }
  ): Promise<{
    triggered: boolean;
    actions: { type: string; config: any }[];
  }> {
    const triggers = await prisma.automationTrigger.findMany({
      where: {
        merchantId,
        isActive: true
      }
    });
    
    const actions: { type: string; config: any }[] = [];
    
    for (const trigger of triggers) {
      const config = trigger.triggerConfig as any;
      const shouldTrigger = await this.checkTrigger(trigger.triggerType, config, {
        message,
        sender,
        ...context
      });
      
      if (shouldTrigger) {
        // Registrar trigger
        await prisma.automationTrigger.update({
          where: { id: trigger.id },
          data: {
            triggerCount: { increment: 1 },
            lastTriggered: new Date()
          }
        });
        
        actions.push({
          type: trigger.actionType,
          config: trigger.actionConfig
        });
      }
    }
    
    return {
      triggered: actions.length > 0,
      actions
    };
  }
  
  /**
   * Verifica se trigger deve ser acionado
   */
  private async checkTrigger(
    triggerType: string,
    config: any,
    context: {
      message: string;
      sender: string;
      lastMessageDate?: Date;
      sentiment?: SentimentResult;
    }
  ): Promise<boolean> {
    const lowerMessage = context.message.toLowerCase();
    
    switch (triggerType) {
      case 'keyword':
        return (config.keywords || []).some((kw: string) => 
          lowerMessage.includes(kw.toLowerCase())
        );
        
      case 'inactivity':
        if (!context.lastMessageDate) return false;
        const daysSinceLastMessage = Math.floor(
          (Date.now() - context.lastMessageDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysSinceLastMessage >= (config.days || 7);
        
      case 'time':
        const currentHour = new Date().getHours();
        return (config.hours || []).includes(currentHour);
        
      case 'sentiment':
        if (!context.sentiment) return false;
        return context.sentiment.score <= (config.sentimentThreshold || -0.3);
        
      case 'event':
        // Eventos são processados separadamente
        return false;
        
      default:
        return false;
    }
  }
  
  /**
   * Cria trigger
   */
  async createTrigger(
    merchantId: string,
    data: Omit<TriggerConfig, 'id' | 'merchantId' | 'triggerCount'>
  ): Promise<TriggerConfig> {
    const trigger = await prisma.automationTrigger.create({
      data: {
        merchantId,
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        triggerType: data.triggerType,
        triggerConfig: data.triggerConfig,
        actionType: data.actionType,
        actionConfig: data.actionConfig
      }
    });
    
    return {
      id: trigger.id,
      merchantId,
      name: trigger.name,
      description: trigger.description || undefined,
      isActive: trigger.isActive,
      triggerType: trigger.triggerType as any,
      triggerConfig: trigger.triggerConfig as any,
      actionType: trigger.actionType as any,
      actionConfig: trigger.actionConfig as any,
      triggerCount: trigger.triggerCount
    };
  }
  
  /**
   * Lista triggers
   */
  async listTriggers(merchantId: string): Promise<TriggerConfig[]> {
    const triggers = await prisma.automationTrigger.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' }
    });
    
    return triggers.map(t => ({
      id: t.id,
      merchantId: t.merchantId,
      name: t.name,
      description: t.description || undefined,
      isActive: t.isActive,
      triggerType: t.triggerType as any,
      triggerConfig: t.triggerConfig as any,
      actionType: t.actionType as any,
      actionConfig: t.actionConfig as any,
      triggerCount: t.triggerCount,
      lastTriggered: t.lastTriggered || undefined
    }));
  }
  
  /**
   * Executa ação do trigger
   */
  async executeAction(
    action: { type: string; config: any },
    context: {
      merchantId: string;
      sender: string;
      instanceName: string;
    }
  ): Promise<void> {
    switch (action.type) {
      case 'send_message':
        const { whatsappService } = await import('./whatsappService');
        await whatsappService.sendTextMessage(
          context.instanceName,
          context.sender,
          action.config.message
        );
        break;
        
      case 'notify':
        // Enviar notificação para o lojista
        console.log(`[TRIGGER] Notificar lojista: ${action.config.message}`);
        break;
        
      case 'webhook':
        await fetch(action.config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: context.merchantId,
            sender: context.sender,
            timestamp: new Date().toISOString()
          })
        });
        break;
        
      case 'transfer':
        // Marcar para transferência humana
        console.log(`[TRIGGER] Transferir para: ${action.config.transferTo}`);
        break;
    }
  }
  
  /**
   * Templates de triggers pré-definidos
   */
  getTriggerTemplates(): Partial<TriggerConfig>[] {
    return [
      {
        name: 'Boas-vindas Automático',
        description: 'Responde quando cliente manda "oi" ou "olá"',
        triggerType: 'keyword',
        triggerConfig: { keywords: ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hi'] },
        actionType: 'send_message',
        actionConfig: { message: 'Olá! Bem-vindo(a)! 🎉\n\nComo posso ajudar você hoje?' }
      },
      {
        name: 'Reativação de Clientes Inativos',
        description: 'Mensagem para clientes que não aparecem há 30 dias',
        triggerType: 'inactivity',
        triggerConfig: { days: 30 },
        actionType: 'send_message',
        actionConfig: { message: 'Oi! Faz tempo que não apareço por aqui. Sentimos sua falta! 🤗\n\nTemos novidades esperando por você!' }
      },
      {
        name: 'Alerta de Insatisfação',
        description: 'Notifica quando cliente está insatisfeito',
        triggerType: 'sentiment',
        triggerConfig: { sentimentThreshold: -0.4 },
        actionType: 'notify',
        actionConfig: { message: 'Cliente insatisfeito detectado! Verifique a conversa.' }
      },
      {
        name: 'Promoção do Meio-dia',
        description: 'Envia promoção às 12h',
        triggerType: 'time',
        triggerConfig: { hours: [12] },
        actionType: 'send_message',
        actionConfig: { message: '🕐 Hora do almoço! Temos uma promoção especial para você!\n\nConfira agora!' }
      }
    ];
  }
}

// =============================================================================
// 3. MESSAGE SEQUENCES - Campanhas de Drip
// =============================================================================

export interface DripStep {
  id: string;
  order: number;
  delayHours: number;
  type: 'message' | 'template' | 'condition';
  content: string;
  templateId?: string;
  condition?: {
    field: string;
    operator: 'equals' | 'contains' | 'not_equals';
    value: string;
  };
}

export interface DripCampaignConfig {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  
  // Segmentação
  targetSegment: 'all' | 'new_leads' | 'inactive' | 'customers' | 'custom';
  segmentConfig?: {
    tags?: string[];
    daysSinceLastContact?: number;
    totalPurchases?: { min?: number; max?: number };
  };
  
  // Passos da sequência
  steps: DripStep[];
  
  // Métricas
  totalEnrolled: number;
  totalCompleted: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  
  startsAt?: Date;
  endsAt?: Date;
}

export interface DripEnrollment {
  id: string;
  campaignId: string;
  customerPhone: string;
  customerName?: string;
  currentStep: number;
  status: 'active' | 'completed' | 'unsubscribed' | 'bounced';
  enrolledAt: Date;
  nextStepAt?: Date;
  completedAt?: Date;
}

export class MessageSequencesService {
  
  /**
   * Cria campanha de drip
   */
  async createCampaign(
    merchantId: string,
    data: Omit<DripCampaignConfig, 'id' | 'merchantId' | 'totalEnrolled' | 'totalCompleted' | 'totalSent' | 'totalOpened' | 'totalClicked'>
  ): Promise<DripCampaignConfig> {
    const campaign = await prisma.dripCampaign.create({
      data: {
        merchantId,
        name: data.name,
        description: data.description,
        status: data.status,
        targetSegment: data.targetSegment,
        steps: data.steps as any,
        startsAt: data.startsAt,
        endsAt: data.endsAt
      }
    });
    
    return {
      id: campaign.id,
      merchantId,
      name: campaign.name,
      description: campaign.description || undefined,
      status: campaign.status as any,
      targetSegment: campaign.targetSegment as any,
      steps: campaign.steps as any,
      totalEnrolled: campaign.totalSent,
      totalCompleted: 0,
      totalSent: campaign.totalSent,
      totalOpened: campaign.totalOpened,
      totalClicked: campaign.totalClicked,
      startsAt: campaign.startsAt || undefined,
      endsAt: campaign.endsAt || undefined
    };
  }
  
  /**
   * Inscreve cliente na campanha
   */
  async enrollCustomer(
    campaignId: string,
    customerPhone: string,
    customerName?: string
  ): Promise<DripEnrollment> {
    const campaign = await prisma.dripCampaign.findUnique({
      where: { id: campaignId }
    });
    
    if (!campaign || campaign.status !== 'active') {
      throw new Error('Campanha não encontrada ou inativa');
    }
    
    const steps = campaign.steps as DripStep[];
    const firstStep = steps[0];
    
    const enrollment = await prisma.dripCampaign.update({
      where: { id: campaignId },
      data: {
        totalSent: { increment: 1 }
      }
    });
    
    // Agendar primeira mensagem
    const nextStepAt = new Date(Date.now() + (firstStep?.delayHours || 0) * 60 * 60 * 1000);
    
    return {
      id: `${campaignId}_${customerPhone}`,
      campaignId,
      customerPhone,
      customerName,
      currentStep: 0,
      status: 'active',
      enrolledAt: new Date(),
      nextStepAt
    };
  }
  
  /**
   * Processa próximo passo da sequência
   */
  async processNextStep(
    merchantId: string,
    enrollment: DripEnrollment
  ): Promise<{
    success: boolean;
    message?: string;
    completed?: boolean;
  }> {
    const campaign = await prisma.dripCampaign.findUnique({
      where: { id: enrollment.campaignId }
    });
    
    if (!campaign) {
      return { success: false, message: 'Campanha não encontrada' };
    }
    
    const steps = campaign.steps as DripStep[];
    const currentStep = steps[enrollment.currentStep];
    
    if (!currentStep) {
      return { success: true, completed: true };
    }
    
    // Enviar mensagem
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    });
    
    if (merchant?.evolutionInstance) {
      const { whatsappService } = await import('./whatsappService');
      
      await whatsappService.sendTextMessage(
        merchant.evolutionInstance,
        enrollment.customerPhone,
        currentStep.content
      );
      
      // Atualizar métricas
      await prisma.dripCampaign.update({
        where: { id: campaign.id },
        data: {
          totalSent: { increment: 1 }
        }
      });
    }
    
    // Verificar se é o último passo
    if (enrollment.currentStep >= steps.length - 1) {
      return { success: true, completed: true };
    }
    
    // Agendar próximo passo
    const nextStep = steps[enrollment.currentStep + 1];
    const nextStepAt = new Date(Date.now() + (nextStep?.delayHours || 24) * 60 * 60 * 1000);
    
    return {
      success: true,
      message: `Passo ${enrollment.currentStep + 1} enviado`,
      completed: false
    };
  }
  
  /**
   * Lista campanhas
   */
  async listCampaigns(merchantId: string): Promise<DripCampaignConfig[]> {
    const campaigns = await prisma.dripCampaign.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' }
    });
    
    return campaigns.map(c => ({
      id: c.id,
      merchantId: c.merchantId,
      name: c.name,
      description: c.description || undefined,
      status: c.status as any,
      targetSegment: c.targetSegment as any,
      steps: c.steps as any,
      totalEnrolled: c.totalSent,
      totalCompleted: 0,
      totalSent: c.totalSent,
      totalOpened: c.totalOpened,
      totalClicked: c.totalClicked,
      startsAt: c.startsAt || undefined,
      endsAt: c.endsAt || undefined
    }));
  }
  
  /**
   * Pausa campanha
   */
  async pauseCampaign(campaignId: string): Promise<void> {
    await prisma.dripCampaign.update({
      where: { id: campaignId },
      data: { status: 'paused' }
    });
  }
  
  /**
   * Retoma campanha
   */
  async resumeCampaign(campaignId: string): Promise<void> {
    await prisma.dripCampaign.update({
      where: { id: campaignId },
      data: { status: 'active' }
    });
  }
  
  /**
   * Templates de campanhas
   */
  getCampaignTemplates(): Partial<DripCampaignConfig>[] {
    return [
      {
        name: 'Boas-vindas Novos Clientes',
        description: 'Sequência de 3 mensagens para novos leads',
        status: 'draft',
        targetSegment: 'new_leads',
        steps: [
          {
            id: '1',
            order: 1,
            delayHours: 0,
            type: 'message',
            content: 'Olá {nome_cliente}! 👋\n\nBem-vindo(a) à {nome_empresa}! Ficamos felizes em ter você conosco.\n\nQuer saber mais sobre nossos serviços?'
          },
          {
            id: '2',
            order: 2,
            delayHours: 24,
            type: 'message',
            content: 'Oi {nome_cliente}! Tudo bem?\n\nVi que você ainda não conheceu nossos serviços. Posso te contar mais sobre o que oferecemos?'
          },
          {
            id: '3',
            order: 3,
            delayHours: 72,
            type: 'message',
            content: '{nome_cliente}, não quer perder você!\n\nTemos uma oferta especial para novos clientes: 10% de desconto no primeiro atendimento!\n\nQuer aproveitar?'
          }
        ]
      },
      {
        name: 'Reativação de Clientes',
        description: 'Reconquista clientes inativos',
        status: 'draft',
        targetSegment: 'inactive',
        steps: [
          {
            id: '1',
            order: 1,
            delayHours: 0,
            type: 'message',
            content: 'Oi {nome_cliente}! Sentimos sua falta! 🥺\n\nFaz um tempinho que você não aparece. Preparamos algo especial para seu retorno!'
          },
          {
            id: '2',
            order: 2,
            delayHours: 48,
            type: 'message',
            content: '{nome_cliente}, ainda estamos esperando você!\n\nQue tal agendar um horinho essa semana? Tenho horários disponíveis!'
          }
        ]
      },
      {
        name: 'Nutrição Pós-Venda',
        description: 'Acompanhamento após compra',
        status: 'draft',
        targetSegment: 'customers',
        steps: [
          {
            id: '1',
            order: 1,
            delayHours: 2,
            type: 'message',
            content: 'Obrigado pela preferência, {nome_cliente}! 🙏\n\nEsperamos que tenha gostado do atendimento. Estamos à disposição!'
          },
          {
            id: '2',
            order: 2,
            delayHours: 168,
            type: 'message',
            content: 'Oi {nome_cliente}! Tudo bem?\n\nPassando para saber como está sendo sua experiência. Tem algo em que podemos ajudar?'
          },
          {
            id: '3',
            order: 3,
            delayHours: 720,
            type: 'message',
            content: '{nome_cliente}, já faz um mês!\n\nQue tal renovar seu atendimento? Temos horários disponíveis essa semana!'
          }
        ]
      }
    ];
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const sentimentAnalysisService = new SentimentAnalysisService();
export const autoTriggersService = new AutoTriggersService();
export const messageSequencesService = new MessageSequencesService();

export default {
  sentimentAnalysisService,
  autoTriggersService,
  messageSequencesService
};
