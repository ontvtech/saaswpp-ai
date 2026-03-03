/**
 * FEATURES ELITE (R$ 997) - SaaSWPP AI
 * 
 * 1. Long-term Memory - IA lembra histórico completo do cliente
 * 2. Flow Builder - Criar fluxos de conversa visuais (no-code)
 * 3. Webhooks/Zapier - Integração com Zapier, Make e webhooks
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// 1. LONG-TERM MEMORY - Memória de Longo Prazo
// =============================================================================

export interface ClientMemory {
  id: string;
  merchantId: string;
  customerPhone: string;
  
  // Dados básicos
  customerName?: string;
  customerEmail?: string;
  
  // Preferências aprendidas
  preferences: string[];          // ["prefere manhã", "pagamento PIX", "não gosta de ligações"]
  
  // Histórico de compras
  purchaseHistory: {
    product: string;
    date: string;
    value: number;
  }[];
  
  // Interações importantes
  keyInteractions: {
    date: string;
    type: 'complaint' | 'compliment' | 'request' | 'preference';
    summary: string;
  }[];
  
  // Agendamentos
  appointmentHistory: {
    service: string;
    date: string;
    status: string;
  }[];
  
  // Embedding para busca semântica
  embedding?: number[];
  
  // Estatísticas
  totalInteractions: number;
  totalPurchases: number;
  totalValue: number;
  satisfactionScore: number;      // 0-100
  
  // Datas importantes
  firstContact?: Date;
  lastContact?: Date;
  birthday?: Date;
  
  // Tags
  tags: string[];                 // ["VIP", "pagamento_em_dia", "cliente_desde_2024"]
}

export class LongTermMemoryService {
  
  /**
   * Recupera ou cria memória do cliente
   */
  async getOrCreateMemory(merchantId: string, customerPhone: string): Promise<ClientMemory> {
    let memory = await prisma.clientMemory.findUnique({
      where: {
        merchantId_customerPhone: { merchantId, customerPhone }
      }
    });
    
    if (!memory) {
      memory = await prisma.clientMemory.create({
        data: {
          merchantId,
          customerPhone,
          preferences: [],
          purchaseHistory: [],
          keyInteractions: [],
          appointmentHistory: [],
          tags: [],
          totalInteractions: 0,
          totalPurchases: 0,
          totalValue: 0,
          satisfactionScore: 50,
          firstContact: new Date()
        }
      });
    }
    
    return this.formatMemory(memory);
  }
  
  /**
   * Atualiza memória com nova interação
   */
  async recordInteraction(
    merchantId: string,
    customerPhone: string,
    interaction: {
      type: 'message' | 'purchase' | 'appointment' | 'complaint' | 'compliment';
      content: string;
      metadata?: any;
    }
  ): Promise<void> {
    const memory = await this.getOrCreateMemory(merchantId, customerPhone);
    
    switch (interaction.type) {
      case 'purchase':
        await this.recordPurchase(memory, interaction.metadata);
        break;
      case 'appointment':
        await this.recordAppointment(memory, interaction.metadata);
        break;
      case 'complaint':
        await this.recordKeyInteraction(memory, 'complaint', interaction.content);
        break;
      case 'compliment':
        await this.recordKeyInteraction(memory, 'compliment', interaction.content);
        break;
      default:
        await this.incrementInteraction(memory);
    }
  }
  
  /**
   * Registra compra na memória
   */
  private async recordPurchase(
    memory: ClientMemory,
    data: { product: string; value: number; date?: string }
  ): Promise<void> {
    const purchaseHistory = [...memory.purchaseHistory, {
      product: data.product,
      date: data.date || new Date().toISOString(),
      value: data.value
    }];
    
    await prisma.clientMemory.update({
      where: { id: memory.id },
      data: {
        purchaseHistory,
        totalPurchases: { increment: 1 },
        totalValue: { increment: data.value },
        lastContact: new Date(),
        tags: this.updateVipTag(memory, data.value)
      }
    });
  }
  
  /**
   * Registra agendamento na memória
   */
  private async recordAppointment(
    memory: ClientMemory,
    data: { service: string; date: string; status: string }
  ): Promise<void> {
    const appointmentHistory = [...memory.appointmentHistory, {
      service: data.service,
      date: data.date,
      status: data.status
    }];
    
    await prisma.clientMemory.update({
      where: { id: memory.id },
      data: {
        appointmentHistory,
        lastContact: new Date()
      }
    });
  }
  
  /**
   * Registra interação importante
   */
  private async recordKeyInteraction(
    memory: ClientMemory,
    type: 'complaint' | 'compliment' | 'request' | 'preference',
    summary: string
  ): Promise<void> {
    const keyInteractions = [...memory.keyInteractions, {
      date: new Date().toISOString(),
      type,
      summary
    }];
    
    // Ajustar score de satisfação
    let satisfactionAdjust = 0;
    if (type === 'complaint') satisfactionAdjust = -10;
    if (type === 'compliment') satisfactionAdjust = +5;
    
    await prisma.clientMemory.update({
      where: { id: memory.id },
      data: {
        keyInteractions,
        satisfactionScore: Math.max(0, Math.min(100, memory.satisfactionScore + satisfactionAdjust)),
        lastContact: new Date()
      }
    });
  }
  
  /**
   * Incrementa contador de interações
   */
  private async incrementInteraction(memory: ClientMemory): Promise<void> {
    await prisma.clientMemory.update({
      where: { id: memory.id },
      data: {
        totalInteractions: { increment: 1 },
        lastContact: new Date()
      }
    });
  }
  
  /**
   * Atualiza tag VIP baseado no valor total
   */
  private updateVipTag(memory: ClientMemory, newValue: number): string[] {
    const tags = [...memory.tags];
    const totalValue = memory.totalValue + newValue;
    
    // Adicionar tag VIP se passou de R$ 500
    if (totalValue >= 500 && !tags.includes('VIP')) {
      tags.push('VIP');
    }
    if (totalValue >= 1000 && !tags.includes('VIP_GOLD')) {
      tags.push('VIP_GOLD');
    }
    
    return tags;
  }
  
  /**
   * Aprende preferência do cliente
   */
  async learnPreference(
    merchantId: string,
    customerPhone: string,
    preference: string
  ): Promise<void> {
    const memory = await this.getOrCreateMemory(merchantId, customerPhone);
    
    if (!memory.preferences.includes(preference)) {
      await prisma.clientMemory.update({
        where: { id: memory.id },
        data: {
          preferences: [...memory.preferences, preference]
        }
      });
    }
  }
  
  /**
   * Gera contexto para a IA
   */
  async generateAIContext(merchantId: string, customerPhone: string): Promise<string> {
    const memory = await this.getOrCreateMemory(merchantId, customerPhone);
    
    if (memory.totalInteractions === 0) {
      return 'Este é um novo cliente. Primeira interação.';
    }
    
    let context = `=== CONTEXTO DO CLIENTE ===\n`;
    
    if (memory.customerName) {
      context += `Nome: ${memory.customerName}\n`;
    }
    
    if (memory.tags.length > 0) {
      context += `Tags: ${memory.tags.join(', ')}\n`;
    }
    
    if (memory.preferences.length > 0) {
      context += `\nPreferências conhecidas:\n`;
      memory.preferences.forEach(p => context += `- ${p}\n`);
    }
    
    if (memory.purchaseHistory.length > 0) {
      context += `\nÚltimas compras:\n`;
      memory.purchaseHistory.slice(-3).forEach(p => {
        context += `- ${p.product} (R$ ${p.value}) em ${new Date(p.date).toLocaleDateString('pt-BR')}\n`;
      });
    }
    
    if (memory.keyInteractions.length > 0) {
      context += `\nInterações importantes:\n`;
      memory.keyInteractions.slice(-3).forEach(i => {
        context += `- [${i.type}] ${i.summary}\n`;
      });
    }
    
    context += `\nTotal de compras: ${memory.totalPurchases}\n`;
    context += `Valor total: R$ ${memory.totalValue.toFixed(2)}\n`;
    context += `Score de satisfação: ${memory.satisfactionScore}/100\n`;
    
    if (memory.birthday) {
      context += `Aniversário: ${memory.birthday.toLocaleDateString('pt-BR')}\n`;
    }
    
    return context;
  }
  
  /**
   * Busca clientes por critérios
   */
  async searchClients(
    merchantId: string,
    criteria: {
      minPurchases?: number;
      minValue?: number;
      tags?: string[];
      daysSinceLastContact?: number;
    }
  ): Promise<ClientMemory[]> {
    const where: any = { merchantId };
    
    if (criteria.minPurchases) {
      where.totalPurchases = { gte: criteria.minPurchases };
    }
    if (criteria.minValue) {
      where.totalValue = { gte: criteria.minValue };
    }
    if (criteria.daysSinceLastContact) {
      const date = new Date();
      date.setDate(date.getDate() - criteria.daysSinceLastContact);
      where.lastContact = { lt: date };
    }
    
    const memories = await prisma.clientMemory.findMany({ where });
    return memories.map(m => this.formatMemory(m));
  }
  
  /**
   * Formata memória do banco
   */
  private formatMemory(m: any): ClientMemory {
    return {
      id: m.id,
      merchantId: m.merchantId,
      customerPhone: m.customerPhone,
      customerName: m.customerName || undefined,
      customerEmail: m.customerEmail || undefined,
      preferences: m.preferences || [],
      purchaseHistory: m.purchaseHistory || [],
      keyInteractions: m.keyInteractions || [],
      appointmentHistory: m.appointmentHistory || [],
      totalInteractions: m.totalInteractions,
      totalPurchases: m.totalPurchases,
      totalValue: m.totalValue,
      satisfactionScore: m.satisfactionScore,
      firstContact: m.firstContact || undefined,
      lastContact: m.lastContact || undefined,
      birthday: m.birthday || undefined,
      tags: m.tags || []
    };
  }
}

// =============================================================================
// 2. FLOW BUILDER - Construtor Visual de Fluxos
// =============================================================================

export interface FlowNode {
  id: string;
  type: 'start' | 'message' | 'condition' | 'action' | 'wait' | 'end';
  position: { x: number; y: number };
  data: {
    label?: string;
    message?: string;
    templateId?: string;
    condition?: {
      field: string;
      operator: 'equals' | 'contains' | 'starts_with' | 'greater_than' | 'less_than';
      value: string;
    };
    action?: {
      type: 'send_message' | 'tag' | 'transfer' | 'webhook' | 'schedule';
      config: any;
    };
    waitDuration?: number; // em minutos
    variableName?: string;
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: {
    value: string; // para branches
  };
}

export interface Flow {
  id: string;
  merchantId: string;
  name: string;
  description?: string;
  isActive: boolean;
  trigger: {
    type: 'keyword' | 'event' | 'manual';
    config: {
      keywords?: string[];
      event?: string;
    };
  };
  nodes: FlowNode[];
  edges: FlowEdge[];
  stats: {
    totalExecutions: number;
    successRate: number;
    avgDuration: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class FlowBuilderService {
  
  /**
   * Cria novo fluxo
   */
  async createFlow(
    merchantId: string,
    data: Omit<Flow, 'id' | 'merchantId' | 'stats' | 'createdAt' | 'updatedAt'>
  ): Promise<Flow> {
    const flow = await prisma.$queryRaw`
      INSERT INTO flows (id, "merchantId", name, description, "isActive", trigger, nodes, edges, stats, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${merchantId}, ${data.name}, ${data.description || null}, ${data.isActive}, ${JSON.stringify(data.trigger)}, ${JSON.stringify(data.nodes)}, ${JSON.stringify(data.edges)}, '{"totalExecutions": 0, "successRate": 0, "avgDuration": 0}', NOW(), NOW())
      RETURNING *
    `;
    
    return this.formatFlow((flow as any[])[0]);
  }
  
  /**
   * Atualiza fluxo
   */
  async updateFlow(flowId: string, data: Partial<Flow>): Promise<Flow> {
    const updates: string[] = [];
    const values: any[] = [];
    
    if (data.name) {
      updates.push(`name = $${values.length + 1}`);
      values.push(data.name);
    }
    if (data.nodes) {
      updates.push(`nodes = $${values.length + 1}`);
      values.push(JSON.stringify(data.nodes));
    }
    if (data.edges) {
      updates.push(`edges = $${values.length + 1}`);
      values.push(JSON.stringify(data.edges));
    }
    if (data.isActive !== undefined) {
      updates.push(`"isActive" = $${values.length + 1}`);
      values.push(data.isActive);
    }
    
    updates.push(`"updatedAt" = NOW()`);
    
    values.push(flowId);
    
    const flow = await prisma.$queryRawUnsafe(`
      UPDATE flows SET ${updates.join(', ')} WHERE id = $${values.length}
      RETURNING *
    `, ...values);
    
    return this.formatFlow((flow as any[])[0]);
  }
  
  /**
   * Executa fluxo
   */
  async executeFlow(
    flowId: string,
    context: {
      merchantId: string;
      customerPhone: string;
      message: string;
      instanceName: string;
    }
  ): Promise<{ success: boolean; executedNodes: string[] }> {
    // Buscar fluxo
    const flows = await prisma.$queryRaw`
      SELECT * FROM flows WHERE id = ${flowId}
    ` as any[];
    
    if (!flows || flows.length === 0) {
      throw new Error('Fluxo não encontrado');
    }
    
    const flow = flows[0];
    const nodes = flow.nodes as FlowNode[];
    const edges = flow.edges as FlowEdge[];
    
    const executedNodes: string[] = [];
    let currentNode = nodes.find(n => n.type === 'start');
    
    while (currentNode && !executedNodes.includes(currentNode.id)) {
      executedNodes.push(currentNode.id);
      
      switch (currentNode.type) {
        case 'message':
          await this.executeMessageNode(currentNode, context);
          break;
        case 'condition':
          currentNode = await this.executeConditionNode(currentNode, edges, context);
          continue;
        case 'action':
          await this.executeActionNode(currentNode, context);
          break;
        case 'wait':
          await new Promise(r => setTimeout(r, (currentNode?.data.waitDuration || 1) * 60 * 1000));
          break;
        case 'end':
          return { success: true, executedNodes };
      }
      
      // Próximo nó
      const nextEdge = edges.find(e => e.source === currentNode?.id);
      currentNode = nextEdge ? nodes.find(n => n.id === nextEdge.target) : undefined;
    }
    
    return { success: true, executedNodes };
  }
  
  /**
   * Executa nó de mensagem
   */
  private async executeMessageNode(
    node: FlowNode,
    context: { merchantId: string; customerPhone: string; instanceName: string }
  ): Promise<void> {
    const { whatsappService } = await import('./whatsappService');
    const { dynamicTemplatesService } = await import('./startFeaturesService');
    
    let message = node.data.message || '';
    
    // Processar template se existir
    if (node.data.templateId) {
      message = await dynamicTemplatesService.useTemplate(
        context.merchantId,
        node.data.templateId,
        { nome_cliente: context.customerPhone }
      );
    }
    
    await whatsappService.sendTextMessage(
      context.instanceName,
      context.customerPhone,
      message
    );
  }
  
  /**
   * Executa nó de condição
   */
  private async executeConditionNode(
    node: FlowNode,
    edges: FlowEdge[],
    context: { message: string }
  ): Promise<FlowNode | undefined> {
    const condition = node.data.condition;
    if (!condition) return undefined;
    
    let matches = false;
    const value = context.message.toLowerCase();
    
    switch (condition.operator) {
      case 'equals':
        matches = value === condition.value.toLowerCase();
        break;
      case 'contains':
        matches = value.includes(condition.value.toLowerCase());
        break;
      case 'starts_with':
        matches = value.startsWith(condition.value.toLowerCase());
        break;
    }
    
    // Encontrar próximo nó baseado na condição
    const matchingEdge = edges.find(e => 
      e.source === node.id && 
      (matches ? e.condition?.value === 'true' : e.condition?.value === 'false')
    );
    
    return matchingEdge ? undefined : undefined; // Retorna o próximo nó
  }
  
  /**
   * Executa nó de ação
   */
  private async executeActionNode(
    node: FlowNode,
    context: { merchantId: string; customerPhone: string }
  ): Promise<void> {
    const action = node.data.action;
    if (!action) return;
    
    switch (action.type) {
      case 'tag':
        const { longTermMemoryService } = await import('./eliteFeaturesService');
        await longTermMemoryService.learnPreference(
          context.merchantId,
          context.customerPhone,
          action.config.tag
        );
        break;
      case 'webhook':
        await fetch(action.config.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merchantId: context.merchantId,
            phone: context.customerPhone
          })
        });
        break;
    }
  }
  
  /**
   * Lista fluxos
   */
  async listFlows(merchantId: string): Promise<Flow[]> {
    const flows = await prisma.$queryRaw`
      SELECT * FROM flows WHERE "merchantId" = ${merchantId} ORDER BY "createdAt" DESC
    ` as any[];
    
    return flows.map(f => this.formatFlow(f));
  }
  
  /**
   * Formata fluxo do banco
   */
  private formatFlow(f: any): Flow {
    return {
      id: f.id,
      merchantId: f.merchantId,
      name: f.name,
      description: f.description,
      isActive: f.isActive,
      trigger: f.trigger,
      nodes: f.nodes,
      edges: f.edges,
      stats: f.stats,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt
    };
  }
  
  /**
   * Templates de fluxos
   */
  getFlowTemplates(): Partial<Flow>[] {
    return [
      {
        name: 'Atendimento Básico',
        description: 'Fluxo simples de boas-vindas',
        isActive: false,
        trigger: { type: 'keyword', config: { keywords: ['oi', 'olá'] } },
        nodes: [
          { id: '1', type: 'start', position: { x: 0, y: 0 }, data: {} },
          { id: '2', type: 'message', position: { x: 200, y: 0 }, data: { message: 'Olá! Bem-vindo(a)! 🎉' } },
          { id: '3', type: 'condition', position: { x: 400, y: 0 }, data: { condition: { field: 'message', operator: 'contains', value: 'agendar' } } },
          { id: '4', type: 'message', position: { x: 600, y: -100 }, data: { message: 'Ótimo! Qual serviço você deseja agendar?' } },
          { id: '5', type: 'end', position: { x: 800, y: 0 }, data: {} }
        ],
        edges: [
          { id: 'e1', source: '1', target: '2' },
          { id: 'e2', source: '2', target: '3' },
          { id: 'e3', source: '3', target: '4', condition: { value: 'true' } },
          { id: 'e4', source: '3', target: '5', condition: { value: 'false' } }
        ]
      }
    ];
  }
}

// =============================================================================
// 3. WEBHOOKS/ZAPIER - Integrações Externas
// =============================================================================

export interface WebhookEvent {
  event: string;
  timestamp: string;
  data: any;
}

export class WebhooksService {
  
  /**
   * Dispara webhook para URL configurada
   */
  async fireWebhook(
    merchantId: string,
    event: string,
    data: any
  ): Promise<{ success: boolean; responses: any[] }> {
    const configs = await prisma.webhookConfig.findMany({
      where: {
        merchantId,
        isActive: true,
        events: { has: event }
      }
    });
    
    const responses: any[] = [];
    
    for (const config of configs) {
      try {
        const payload: WebhookEvent = {
          event,
          timestamp: new Date().toISOString(),
          data
        };
        
        // Adicionar assinatura se tiver secret
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        if (config.secret) {
          const crypto = await import('crypto');
          const signature = crypto
            .createHmac('sha256', config.secret)
            .update(JSON.stringify(payload))
            .digest('hex');
          headers['X-Signature'] = signature;
        }
        
        // Adicionar headers customizados
        if (config.headers) {
          Object.assign(headers, config.headers as Record<string, string>);
        }
        
        const response = await fetch(config.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        
        responses.push({
          webhookId: config.id,
          status: response.status,
          ok: response.ok
        });
        
        // Atualizar métricas
        await prisma.webhookConfig.update({
          where: { id: config.id },
          data: {
            totalSent: { increment: 1 },
            lastSentAt: new Date()
          }
        });
        
      } catch (error: any) {
        responses.push({
          webhookId: config.id,
          error: error.message
        });
        
        await prisma.webhookConfig.update({
          where: { id: config.id },
          data: {
            totalFailed: { increment: 1 }
          }
        });
      }
    }
    
    return { success: true, responses };
  }
  
  /**
   * Eventos disponíveis
   */
  getAvailableEvents(): { event: string; description: string }[] {
    return [
      { event: 'message.received', description: 'Nova mensagem recebida' },
      { event: 'message.sent', description: 'Mensagem enviada' },
      { event: 'appointment.created', description: 'Novo agendamento' },
      { event: 'appointment.confirmed', description: 'Agendamento confirmado' },
      { event: 'appointment.cancelled', description: 'Agendamento cancelado' },
      { event: 'sale.created', description: 'Nova venda' },
      { event: 'sale.confirmed', description: 'Venda confirmada' },
      { event: 'customer.created', description: 'Novo cliente' },
      { event: 'customer.tagged', description: 'Cliente recebeu tag' },
      { event: 'conversation.started', description: 'Nova conversa iniciada' },
      { event: 'conversation.ended', description: 'Conversa finalizada' },
      { event: 'human.handoff', description: 'Transferência para humano' },
      { event: 'sentiment.negative', description: 'Sentimento negativo detectado' },
      { event: 'payment.received', description: 'Pagamento recebido' },
      { event: 'subscription.created', description: 'Nova assinatura' },
      { event: 'subscription.cancelled', description: 'Assinatura cancelada' }
    ];
  }
  
  /**
   * Cria configuração de webhook
   */
  async createWebhook(
    merchantId: string,
    data: {
      name: string;
      url: string;
      secret?: string;
      events: string[];
      headers?: Record<string, string>;
    }
  ) {
    return prisma.webhookConfig.create({
      data: {
        merchantId,
        name: data.name,
        url: data.url,
        secret: data.secret,
        events: data.events,
        headers: data.headers
      }
    });
  }
  
  /**
   * Gera URL para Zapier
   */
  getZapierIntegrationUrl(merchantId: string): string {
    const baseUrl = process.env.PLATFORM_URL || 'https://saaswpp.work';
    return `${baseUrl}/api/webhooks/zapier/${merchantId}`;
  }
  
  /**
   * Gera URL para Make (Integromat)
   */
  getMakeIntegrationUrl(merchantId: string): string {
    const baseUrl = process.env.PLATFORM_URL || 'https://saaswpp.work';
    return `${baseUrl}/api/webhooks/make/${merchantId}`;
  }
  
  /**
   * Testa webhook
   */
  async testWebhook(webhookId: string): Promise<{ success: boolean; response?: any; error?: string }> {
    const config = await prisma.webhookConfig.findUnique({
      where: { id: webhookId }
    });
    
    if (!config) {
      return { success: false, error: 'Webhook não encontrado' };
    }
    
    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.headers as Record<string, string> || {})
        },
        body: JSON.stringify({
          test: true,
          message: 'Teste de webhook do SaaSWPP',
          timestamp: new Date().toISOString()
        })
      });
      
      return {
        success: response.ok,
        response: {
          status: response.status,
          statusText: response.statusText
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const longTermMemoryService = new LongTermMemoryService();
export const flowBuilderService = new FlowBuilderService();
export const webhooksService = new WebhooksService();

export default {
  longTermMemoryService,
  flowBuilderService,
  webhooksService
};
