/**
 * FEATURES START (R$ 97) - SaaSWPP AI
 * 
 * 1. Interactive Messages - Botões e listas clicáveis no WhatsApp
 * 2. Dynamic Templates - Mensagens com variáveis personalizáveis
 * 3. Hours Heatmap - Visualizar horários de pico
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// 1. INTERACTIVE MESSAGES - Botões e Listas no WhatsApp
// =============================================================================

export interface InteractiveButton {
  id: string;
  title: string;
}

export interface InteractiveSection {
  title: string;
  rows: {
    id: string;
    title: string;
    description?: string;
  }[];
}

export interface InteractiveMessage {
  type: 'button' | 'list';
  body: string;
  footer?: string;
  buttons?: InteractiveButton[];
  list?: {
    title: string;
    sections: InteractiveSection[];
  };
}

export class InteractiveMessagesService {
  
  private evolutionUrl: string;
  private evolutionKey: string;
  
  constructor() {
    this.evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';
    this.evolutionKey = process.env.EVOLUTION_API_KEY || '';
  }
  
  /**
   * Envia mensagem com BOTÕES clicáveis
   */
  async sendButtonMessage(
    instanceName: string,
    to: string,
    message: InteractiveMessage
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[INTERACTIVE] Enviando botões para ${to}`);
    
    try {
      const payload = {
        number: to,
        buttonReplyMessage: {
          text: message.body,
          buttons: message.buttons?.map((btn, i) => ({
            buttonId: btn.id || `btn_${i}`,
            buttonText: { displayText: btn.title },
            type: 1
          })),
          footerText: message.footer
        },
        options: {
          delay: 1200,
          presence: 'composing'
        }
      };
      
      const response = await fetch(
        `${this.evolutionUrl}/message/sendButtons/${instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.evolutionKey
          },
          body: JSON.stringify(payload)
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.message || 'Erro ao enviar' };
      }
      
      return { success: true, messageId: data.key?.id };
      
    } catch (error: any) {
      console.error('[INTERACTIVE] Erro:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Envia mensagem com LISTA de opções
   */
  async sendListMessage(
    instanceName: string,
    to: string,
    message: InteractiveMessage
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[INTERACTIVE] Enviando lista para ${to}`);
    
    try {
      const payload = {
        number: to,
        listReplyMessage: {
          title: message.list?.title || 'Opções',
          description: message.body,
          buttonText: 'Ver opções',
          sections: message.list?.sections.map(section => ({
            title: section.title,
            rows: section.rows.map(row => ({
              title: row.title,
              description: row.description || '',
              rowId: row.id
            }))
          }))
        },
        options: {
          delay: 1200,
          presence: 'composing'
        }
      };
      
      const response = await fetch(
        `${this.evolutionUrl}/message/sendListMessage/${instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.evolutionKey
          },
          body: JSON.stringify(payload)
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.message || 'Erro ao enviar' };
      }
      
      return { success: true, messageId: data.key?.id };
      
    } catch (error: any) {
      console.error('[INTERACTIVE] Erro:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Cria menu interativo padrão para o lojista
   */
  async createDefaultMenu(merchantId: string): Promise<InteractiveMessage> {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    });
    
    const businessName = merchant?.name || 'nossa empresa';
    
    return {
      type: 'list',
      body: `Olá! Bem-vindo(a) à ${businessName}! 🎉\n\nComo posso ajudar você hoje?`,
      footer: 'Escolha uma opção abaixo',
      list: {
        title: 'Menu Principal',
        sections: [
          {
            title: '📋 Informações',
            rows: [
              { id: 'info_hours', title: 'Horário de funcionamento', description: 'Veja quando estamos abertos' },
              { id: 'info_location', title: 'Localização', description: 'Endereço e como chegar' },
              { id: 'info_services', title: 'Serviços', description: 'Conheça nossos serviços' }
            ]
          },
          {
            title: '💰 Atendimento',
            rows: [
              { id: 'action_schedule', title: 'Agendar horário', description: 'Marque seu atendimento' },
              { id: 'action_price', title: 'Ver preços', description: 'Nossa tabela de preços' },
              { id: 'action_talk', title: 'Falar com atendente', description: 'Atendimento humano' }
            ]
          }
        ]
      }
    };
  }
  
  /**
   * Processa resposta do botão/lista
   */
  async handleInteractiveResponse(
    merchantId: string,
    from: string,
    selectedId: string,
    instanceName: string
  ): Promise<string> {
    // Mapear respostas para ações
    const responses: Record<string, string> = {
      'info_hours': 'Nosso horário de funcionamento é:\n\n📅 Segunda a Sexta: 09:00 às 18:00\n📅 Sábado: 09:00 às 13:00\n📅 Domingo: Fechado\n\nPosso ajudar com mais alguma coisa?',
      'info_location': 'Estamos localizados na:\n\n📍 Rua Exemplo, 123 - Centro\nCidade - Estado\nCEP: 00000-000\n\nQuer que eu envie a localização no mapa?',
      'info_services': 'Nossos principais serviços:\n\n✨ Serviço 1\n✨ Serviço 2\n✨ Serviço 3\n\nQuer saber mais sobre algum específico?',
      'action_schedule': '[SCHEDULE_REQUEST] Ótimo! Para agendar, me diga:\n\n1. Qual serviço você deseja?\n2. Qual dia e horário prefere?',
      'action_price': 'Nossa tabela de preços:\n\n💰 Serviço 1: R$ XX,XX\n💰 Serviço 2: R$ XX,XX\n💰 Serviço 3: R$ XX,XX\n\nPosso tirar dúvidas sobre algum serviço?',
      'action_talk': '[HUMAN_HANDOFF] Perfeito! Vou transferir você para um atendente humano. Aguarde um momento...'
    };
    
    return responses[selectedId] || 'Desculpe, não entendi sua seleção. Pode tentar novamente?';
  }
  
  /**
   * Salva template de mensagem interativa
   */
  async saveInteractiveTemplate(
    merchantId: string,
    name: string,
    message: InteractiveMessage
  ): Promise<void> {
    await prisma.messageTemplate.create({
      data: {
        merchantId,
        key: `interactive_${name.toLowerCase().replace(/\s+/g, '_')}`,
        name,
        content: JSON.stringify(message),
        category: 'interactive',
        isActive: true
      }
    });
  }
  
  /**
   * Lista templates interativos
   */
  async listInteractiveTemplates(merchantId: string) {
    const templates = await prisma.messageTemplate.findMany({
      where: {
        merchantId,
        category: 'interactive'
      }
    });
    
    return templates.map(t => ({
      ...t,
      content: JSON.parse(t.content as string || '{}')
    }));
  }
}

// =============================================================================
// 2. DYNAMIC TEMPLATES - Mensagens com Variáveis
// =============================================================================

export interface TemplateVariable {
  key: string;
  label: string;
  defaultValue?: string;
}

export interface DynamicTemplate {
  id: string;
  name: string;
  content: string;
  variables: TemplateVariable[];
  category: string;
}

export class DynamicTemplatesService {
  
  /**
   * Variáveis padrão do sistema
   */
  static readonly SYSTEM_VARIABLES: TemplateVariable[] = [
    { key: 'nome_cliente', label: 'Nome do Cliente', defaultValue: 'Cliente' },
    { key: 'nome_empresa', label: 'Nome da Empresa', defaultValue: 'Nossa Empresa' },
    { key: 'data_hoje', label: 'Data de Hoje', defaultValue: '' },
    { key: 'hora_agora', label: 'Hora Atual', defaultValue: '' },
    { key: 'dia_semana', label: 'Dia da Semana', defaultValue: '' },
    { key: 'proxima_semana', label: 'Próxima Semana', defaultValue: '' },
    { key: 'mes_atual', label: 'Mês Atual', defaultValue: '' }
  ];
  
  /**
   * Processa template substituindo variáveis
   */
  processTemplate(
    template: string,
    variables: Record<string, string>,
    merchantData?: { name?: string }
  ): string {
    let result = template;
    
    // Adicionar variáveis do sistema
    const now = new Date();
    const systemVars: Record<string, string> = {
      '{nome_cliente}': variables.nome_cliente || 'Cliente',
      '{nome_empresa}': merchantData?.name || 'Nossa Empresa',
      '{data_hoje}': now.toLocaleDateString('pt-BR'),
      '{hora_agora}': now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      '{dia_semana}': now.toLocaleDateString('pt-BR', { weekday: 'long' }),
      '{proxima_semana}': new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
      '{mes_atual}': now.toLocaleDateString('pt-BR', { month: 'long' })
    };
    
    // Substituir todas as variáveis
    Object.entries({ ...systemVars, ...variables }).forEach(([key, value]) => {
      const pattern = key.startsWith('{') ? key : `{${key}}`;
      result = result.replace(new RegExp(pattern.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    
    return result;
  }
  
  /**
   * Extrai variáveis de um template
   */
  extractVariables(template: string): string[] {
    const matches = template.match(/\{([^}]+)\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
  }
  
  /**
   * Cria template dinâmico
   */
  async createTemplate(
    merchantId: string,
    data: {
      name: string;
      content: string;
      category: string;
      variables?: TemplateVariable[];
    }
  ): Promise<DynamicTemplate> {
    const extractedVars = this.extractVariables(data.content);
    
    const template = await prisma.messageTemplate.create({
      data: {
        merchantId,
        key: data.name.toLowerCase().replace(/\s+/g, '_'),
        name: data.name,
        content: data.content,
        category: data.category,
        variables: data.variables || extractedVars.map(v => ({
          key: v,
          label: v.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        }))
      }
    });
    
    return {
      id: template.id,
      name: template.name,
      content: template.content,
      variables: template.variables as TemplateVariable[],
      category: template.category
    };
  }
  
  /**
   * Lista templates do merchant
   */
  async listTemplates(merchantId: string, category?: string) {
    const where: any = { merchantId };
    if (category) where.category = category;
    
    return prisma.messageTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }
  
  /**
   * Usa template com variáveis
   */
  async useTemplate(
    merchantId: string,
    templateKey: string,
    variables: Record<string, string>
  ): Promise<string> {
    const template = await prisma.messageTemplate.findFirst({
      where: { merchantId, key: templateKey }
    });
    
    if (!template) {
      throw new Error('Template não encontrado');
    }
    
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    });
    
    return this.processTemplate(
      template.content,
      variables,
      { name: merchant?.name }
    );
  }
  
  /**
   * Templates pré-definidos por categoria
   */
  getPredefinedTemplates(): DynamicTemplate[] {
    return [
      {
        id: 'welcome',
        name: 'Boas-vindas',
        content: 'Olá {nome_cliente}! 👋\n\nBem-vindo(a) à {nome_empresa}! Estamos muito felizes em ter você conosco.\n\nComo posso ajudar você hoje?',
        variables: [
          { key: 'nome_cliente', label: 'Nome do Cliente' },
          { key: 'nome_empresa', label: 'Nome da Empresa' }
        ],
        category: 'welcome'
      },
      {
        id: 'appointment_confirm',
        name: 'Confirmação de Agendamento',
        content: '✅ Agendamento confirmado!\n\n📅 Data: {data_agendamento}\n⏰ Horário: {hora_agendamento}\n💈 Serviço: {servico}\n👤 Profissional: {profissional}\n\nAguardamos você! Qualquer dúvida, é só chamar.',
        variables: [
          { key: 'data_agendamento', label: 'Data' },
          { key: 'hora_agendamento', label: 'Horário' },
          { key: 'servico', label: 'Serviço' },
          { key: 'profissional', label: 'Profissional' }
        ],
        category: 'appointment'
      },
      {
        id: 'appointment_reminder',
        name: 'Lembrete de Agendamento',
        content: '⏰ Lembrete!\n\nOlá {nome_cliente}, você tem um agendamento amanhã:\n\n📅 {data_agendamento} às {hora_agendamento}\n💈 {servico}\n\nConfirma para nós? Responda SIM ou NÃO.',
        variables: [
          { key: 'nome_cliente', label: 'Nome do Cliente' },
          { key: 'data_agendamento', label: 'Data' },
          { key: 'hora_agendamento', label: 'Horário' },
          { key: 'servico', label: 'Serviço' }
        ],
        category: 'appointment'
      },
      {
        id: 'follow_up',
        name: 'Follow-up Pós-Atendimento',
        content: 'Oi {nome_cliente}! 😊\n\nFoi um prazer atender você {dia_atendimento}!\n\nEsperamos que tenha gostado do serviço. Sua opinião é muito importante para nós.\n\nVocê poderia avaliar seu atendimento? De 1 a 5 estrelas, que nota você daria?',
        variables: [
          { key: 'nome_cliente', label: 'Nome do Cliente' },
          { key: 'dia_atendimento', label: 'Dia do Atendimento' }
        ],
        category: 'follow_up'
      },
      {
        id: 'promotion',
        name: 'Promoção',
        content: '🔥 PROMOÇÃO ESPECIAL! 🔥\n\n{nome_cliente}, preparamos algo especial para você!\n\n🎉 {descricao_promocao}\n\n💰 De: R$ {preco_original}\n✨ Por apenas: R$ {preco_promocional}\n\n⏰ Válido até {data_validade}\n\nAproveite! É só responder QUERO!',
        variables: [
          { key: 'nome_cliente', label: 'Nome do Cliente' },
          { key: 'descricao_promocao', label: 'Descrição da Promoção' },
          { key: 'preco_original', label: 'Preço Original' },
          { key: 'preco_promocional', label: 'Preço Promocional' },
          { key: 'data_validade', label: 'Data de Validade' }
        ],
        category: 'promotion'
      },
      {
        id: 'reactivation',
        name: 'Reativação de Cliente',
        content: 'Oi {nome_cliente}! Faz tempo que não apareço por aqui 😊\n\nSentimos sua falta na {nome_empresa}!\n\nPreparamos um presentinho especial para seu retorno: {oferta_especial}\n\nQuer agendar um horinho? É só me avisar!',
        variables: [
          { key: 'nome_cliente', label: 'Nome do Cliente' },
          { key: 'nome_empresa', label: 'Nome da Empresa' },
          { key: 'oferta_especial', label: 'Oferta Especial' }
        ],
        category: 'reactivation'
      }
    ];
  }
}

// =============================================================================
// 3. HOURS HEATMAP - Horários de Pico
// =============================================================================

export interface HeatmapData {
  hour: number;
  day: number; // 0-6 (domingo-sábado)
  count: number;
  percentage: number;
}

export interface HeatmapStats {
  peakHour: number;
  peakDay: number;
  peakDayName: string;
  totalMessages: number;
  avgPerHour: number;
  busierHours: number[];
  quieterHours: number[];
}

export class HeatmapService {
  
  /**
   * Gera dados do heatmap de mensagens
   */
  async generateHeatmap(merchantId: string, days: number = 30): Promise<HeatmapData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Buscar logs de interação
    const interactions = await prisma.interactionLog.findMany({
      where: {
        merchantId,
        createdAt: { gte: startDate }
      },
      select: { createdAt: true }
    });
    
    // Agrupar por hora e dia da semana
    const counts: Record<string, number> = {};
    let maxCount = 0;
    
    interactions.forEach(interaction => {
      const date = new Date(interaction.createdAt);
      const hour = date.getHours();
      const day = date.getDay();
      const key = `${hour}-${day}`;
      
      counts[key] = (counts[key] || 0) + 1;
      maxCount = Math.max(maxCount, counts[key]);
    });
    
    // Gerar grid completo (24 horas x 7 dias)
    const heatmap: HeatmapData[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let day = 0; day < 7; day++) {
        const key = `${hour}-${day}`;
        const count = counts[key] || 0;
        heatmap.push({
          hour,
          day,
          count,
          percentage: maxCount > 0 ? Math.round((count / maxCount) * 100) : 0
        });
      }
    }
    
    return heatmap;
  }
  
  /**
   * Calcula estatísticas do heatmap
   */
  async getHeatmapStats(merchantId: string, days: number = 30): Promise<HeatmapStats> {
    const heatmap = await this.generateHeatmap(merchantId, days);
    
    // Encontrar pico
    const peak = heatmap.reduce((max, item) => 
      item.count > max.count ? item : max, heatmap[0]);
    
    const totalMessages = heatmap.reduce((sum, item) => sum + item.count, 0);
    const activeHours = heatmap.filter(h => h.count > 0);
    const avgPerHour = activeHours.length > 0 ? totalMessages / activeHours.length : 0;
    
    // Horários mais movimentados
    const hourlyTotals: Record<number, number> = {};
    heatmap.forEach(h => {
      hourlyTotals[h.hour] = (hourlyTotals[h.hour] || 0) + h.count;
    });
    
    const sortedHours = Object.entries(hourlyTotals)
      .sort((a, b) => b[1] - a[1]);
    
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    return {
      peakHour: peak.hour,
      peakDay: peak.day,
      peakDayName: dayNames[peak.day],
      totalMessages,
      avgPerHour: Math.round(avgPerHour),
      busierHours: sortedHours.slice(0, 5).map(([h]) => parseInt(h)),
      quieterHours: sortedHours.slice(-5).reverse().map(([h]) => parseInt(h))
    };
  }
  
  /**
   * Recomendações baseadas no heatmap
   */
  async getRecommendations(merchantId: string): Promise<string[]> {
    const stats = await this.getHeatmapStats(merchantId);
    const recommendations: string[] = [];
    
    // Horário de pico
    recommendations.push(
      `Seu horário de pico é ${stats.peakHour}:00 na ${stats.peakDayName}. ` +
      `Considere ter mais atendentes disponíveis neste horário.`
    );
    
    // Horários tranquilos
    if (stats.quieterHours.length > 0) {
      const quietHours = stats.quieterHours.slice(0, 3).map(h => `${h}:00`).join(', ');
      recommendations.push(
        `Horários mais tranquilos: ${quietHours}. ` +
        `Ideal para fazer pausas ou tarefas administrativas.`
      );
    }
    
    // Média de mensagens
    if (stats.avgPerHour > 50) {
      recommendations.push(
        `Você recebe em média ${stats.avgPerHour} mensagens por hora ativo. ` +
        `Considere configurar respostas automáticas para perguntas frequentes.`
      );
    }
    
    // Sugestão de horário de funcionamento
    const activeStart = Math.min(...stats.busierHours);
    const activeEnd = Math.max(...stats.busierHours) + 1;
    recommendations.push(
      `Baseado no seu movimento, seu horário de atendimento ideal seria ` +
      `${activeStart}:00 às ${activeEnd}:00.`
    );
    
    return recommendations;
  }
  
  /**
   * Exporta dados para CSV
   */
  async exportHeatmapCSV(merchantId: string): Promise<string> {
    const heatmap = await this.generateHeatmap(merchantId);
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    
    const lines = ['Hora,' + dayNames.join(',')];
    
    for (let hour = 0; hour < 24; hour++) {
      const row = [`${hour}:00`];
      for (let day = 0; day < 7; day++) {
        const item = heatmap.find(h => h.hour === hour && h.day === day);
        row.push(item?.count.toString() || '0');
      }
      lines.push(row.join(','));
    }
    
    return lines.join('\n');
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const interactiveMessagesService = new InteractiveMessagesService();
export const dynamicTemplatesService = new DynamicTemplatesService();
export const heatmapService = new HeatmapService();

export default {
  interactiveMessagesService,
  dynamicTemplatesService,
  heatmapService
};
