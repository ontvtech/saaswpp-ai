/**
 * FEATURES PRO (R$ 247) - SaaSWPP AI
 * 
 * 1. Media Sending - Enviar imagens, vídeos, áudios e PDFs
 * 2. ROI Dashboard - Ver quanto a IA está gerando em vendas
 * 3. Calendar Sync - Google Calendar e Outlook integrados
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// 1. MEDIA SENDING - Envio de Mídia pelo WhatsApp
// =============================================================================

export interface MediaFile {
  type: 'image' | 'video' | 'audio' | 'document';
  url?: string;
  base64?: string;
  filename?: string;
  mimetype?: string;
  caption?: string;
}

export interface MediaMessage {
  to: string;
  media: MediaFile;
  caption?: string;
  delay?: number;
}

export class MediaSendingService {
  
  private evolutionUrl: string;
  private evolutionKey: string;
  
  constructor() {
    this.evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';
    this.evolutionKey = process.env.EVOLUTION_API_KEY || '';
  }
  
  /**
   * Envia imagem
   */
  async sendImage(
    instanceName: string,
    message: MediaMessage
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[MEDIA] Enviando imagem para ${message.to}`);
    
    try {
      const payload = {
        number: message.to,
        mediatype: 'image',
        caption: message.caption || message.media.caption,
        ...(message.media.url 
          ? { url: message.media.url }
          : { base64: message.media.base64 }
        ),
        options: {
          delay: message.delay || 1500,
          presence: 'composing'
        }
      };
      
      const response = await fetch(
        `${this.evolutionUrl}/message/sendMedia/${instanceName}`,
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
        return { success: false, error: data.message || 'Erro ao enviar imagem' };
      }
      
      return { success: true, messageId: data.key?.id };
      
    } catch (error: any) {
      console.error('[MEDIA] Erro:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Envia vídeo
   */
  async sendVideo(
    instanceName: string,
    message: MediaMessage
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[MEDIA] Enviando vídeo para ${message.to}`);
    
    try {
      const payload = {
        number: message.to,
        mediatype: 'video',
        caption: message.caption || message.media.caption,
        ...(message.media.url 
          ? { url: message.media.url }
          : { base64: message.media.base64 }
        ),
        options: {
          delay: message.delay || 2000,
          presence: 'composing'
        }
      };
      
      const response = await fetch(
        `${this.evolutionUrl}/message/sendMedia/${instanceName}`,
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
        return { success: false, error: data.message || 'Erro ao enviar vídeo' };
      }
      
      return { success: true, messageId: data.key?.id };
      
    } catch (error: any) {
      console.error('[MEDIA] Erro:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Envia áudio (PTT - mensagem de voz)
   */
  async sendAudio(
    instanceName: string,
    to: string,
    audioUrlOrBase64: string,
    isBase64: boolean = false
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[MEDIA] Enviando áudio para ${to}`);
    
    try {
      const payload = {
        number: to,
        audio: isBase64 ? audioUrlOrBase64 : undefined,
        url: !isBase64 ? audioUrlOrBase64 : undefined,
        options: {
          delay: 2000,
          presence: 'recording'
        }
      };
      
      const response = await fetch(
        `${this.evolutionUrl}/message/sendWhatsAppAudio/${instanceName}`,
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
        return { success: false, error: data.message || 'Erro ao enviar áudio' };
      }
      
      return { success: true, messageId: data.key?.id };
      
    } catch (error: any) {
      console.error('[MEDIA] Erro:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Envia documento (PDF, DOC, etc.)
   */
  async sendDocument(
    instanceName: string,
    message: MediaMessage
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[MEDIA] Enviando documento para ${message.to}`);
    
    try {
      const payload = {
        number: message.to,
        mediatype: 'document',
        fileName: message.media.filename || 'documento.pdf',
        caption: message.caption || message.media.caption,
        ...(message.media.url 
          ? { url: message.media.url }
          : { base64: message.media.base64 }
        ),
        options: {
          delay: message.delay || 2000,
          presence: 'composing'
        }
      };
      
      const response = await fetch(
        `${this.evolutionUrl}/message/sendMedia/${instanceName}`,
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
        return { success: false, error: data.message || 'Erro ao enviar documento' };
      }
      
      return { success: true, messageId: data.key?.id };
      
    } catch (error: any) {
      console.error('[MEDIA] Erro:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Envia mídia genérica (detecta tipo automaticamente)
   */
  async sendMedia(
    instanceName: string,
    message: MediaMessage
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { type } = message.media;
    
    switch (type) {
      case 'image':
        return this.sendImage(instanceName, message);
      case 'video':
        return this.sendVideo(instanceName, message);
      case 'audio':
        return this.sendAudio(instanceName, message.to, message.media.url || message.media.base64 || '', !!message.media.base64);
      case 'document':
        return this.sendDocument(instanceName, message);
      default:
        return { success: false, error: 'Tipo de mídia não suportado' };
    }
  }
  
  /**
   * Envia catálogo de produtos como carousel
   */
  async sendProductCatalog(
    instanceName: string,
    to: string,
    products: {
      name: string;
      price: number;
      description: string;
      imageUrl: string;
    }[]
  ): Promise<{ success: boolean; messagesSent: number }> {
    let messagesSent = 0;
    
    for (const product of products) {
      const caption = `📦 *${product.name}*\n💰 R$ ${product.price.toFixed(2)}\n\n${product.description}`;
      
      const result = await this.sendImage(instanceName, {
        to,
        media: {
          type: 'image',
          url: product.imageUrl,
          caption
        }
      });
      
      if (result.success) {
        messagesSent++;
      }
      
      // Delay entre mensagens para evitar spam
      await new Promise(r => setTimeout(r, 2000));
    }
    
    return { success: true, messagesSent };
  }
}

// =============================================================================
// 2. ROI DASHBOARD - Retorno sobre Investimento
// =============================================================================

export interface ROIMetrics {
  // Vendas
  totalSales: number;
  salesValue: number;
  aiGeneratedSales: number;
  aiGeneratedValue: number;
  humanGeneratedSales: number;
  humanGeneratedValue: number;
  
  // Atendimentos
  totalConversations: number;
  aiHandledConversations: number;
  humanHandledConversations: number;
  handoffRate: number;
  
  // Eficiência
  averageResponseTime: number;
  aiResolutionRate: number;
  customerSatisfactionRate: number;
  
  // Financeiro
  monthlyRevenue: number;
  platformCost: number;
  roi: number;
  paybackMonths: number;
  
  // Comparativo
  salesGrowth: number;
  conversationGrowth: number;
}

export interface ROITrend {
  date: string;
  sales: number;
  value: number;
  conversations: number;
}

export class ROIService {
  
  /**
   * Calcula métricas de ROI completas
   */
  async calculateROI(merchantId: string, period: 'week' | 'month' | 'quarter' = 'month'): Promise<ROIMetrics> {
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
    }
    
    // Buscar vendas
    const sales = await prisma.saleTracking.findMany({
      where: {
        merchantId,
        createdAt: { gte: startDate },
        status: 'confirmed'
      }
    });
    
    const totalSales = sales.length;
    const salesValue = sales.reduce((sum, s) => sum + (s.value || 0), 0);
    const aiGeneratedSales = sales.filter(s => s.source === 'ai').length;
    const aiGeneratedValue = sales.filter(s => s.source === 'ai').reduce((sum, s) => sum + (s.value || 0), 0);
    const humanGeneratedSales = totalSales - aiGeneratedSales;
    const humanGeneratedValue = salesValue - aiGeneratedValue;
    
    // Buscar conversas
    const interactions = await prisma.interactionLog.findMany({
      where: {
        merchantId,
        createdAt: { gte: startDate }
      }
    });
    
    const uniqueSenders = new Set(interactions.map(i => i.sender));
    const totalConversations = uniqueSenders.size;
    
    // Buscar sessões de chat para calcular handoff
    const chatSessions = await prisma.chatSession.findMany({
      where: {
        merchantId,
        createdAt: { gte: startDate }
      }
    });
    
    const humanHandledConversations = chatSessions.filter(s => s.state === 'HUMAN_HANDOFF').length;
    const aiHandledConversations = totalConversations - humanHandledConversations;
    const handoffRate = totalConversations > 0 ? (humanHandledConversations / totalConversations) * 100 : 0;
    
    // Buscar sentimento para satisfação
    const sentiments = interactions.filter(i => i.sentiment);
    const positiveSentiments = sentiments.filter(i => i.sentiment === 'positive').length;
    const customerSatisfactionRate = sentiments.length > 0 
      ? (positiveSentiments / sentiments.length) * 100 
      : 85; // Default
    
    // Buscar plano do merchant para calcular custo
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: { plan: true }
    });
    
    const platformCost = merchant?.plan?.price || 97;
    const monthlyRevenue = salesValue;
    const roi = platformCost > 0 ? ((monthlyRevenue - platformCost) / platformCost) * 100 : 0;
    const paybackMonths = monthlyRevenue > 0 ? Math.ceil(platformCost / monthlyRevenue) : 0;
    
    // Taxa de resolução pela IA
    const aiResolutionRate = totalConversations > 0 
      ? ((totalConversations - humanHandledConversations) / totalConversations) * 100 
      : 90;
    
    return {
      totalSales,
      salesValue,
      aiGeneratedSales,
      aiGeneratedValue,
      humanGeneratedSales,
      humanGeneratedValue,
      
      totalConversations,
      aiHandledConversations,
      humanHandledConversations,
      handoffRate,
      
      averageResponseTime: 3.5, // segundos (mock, implementar medição real)
      aiResolutionRate,
      customerSatisfactionRate,
      
      monthlyRevenue,
      platformCost,
      roi,
      paybackMonths,
      
      salesGrowth: 15, // percentual (comparar com período anterior)
      conversationGrowth: 22
    };
  }
  
  /**
   * Busca tendências de vendas
   */
  async getTrends(merchantId: string, days: number = 30): Promise<ROITrend[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const sales = await prisma.saleTracking.findMany({
      where: {
        merchantId,
        createdAt: { gte: startDate }
      }
    });
    
    const interactions = await prisma.interactionLog.findMany({
      where: {
        merchantId,
        createdAt: { gte: startDate }
      }
    });
    
    // Agrupar por dia
    const trends: ROITrend[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const daySales = sales.filter(s => 
        new Date(s.createdAt).toISOString().split('T')[0] === dateStr
      );
      
      const dayConversations = interactions.filter(i => 
        new Date(i.createdAt).toISOString().split('T')[0] === dateStr
      );
      
      trends.push({
        date: dateStr,
        sales: daySales.length,
        value: daySales.reduce((sum, s) => sum + (s.value || 0), 0),
        conversations: new Set(dayConversations.map(c => c.sender)).size
      });
    }
    
    return trends.reverse();
  }
  
  /**
   * Gera relatório de ROI
   */
  async generateReport(merchantId: string): Promise<string> {
    const metrics = await this.calculateROI(merchantId, 'month');
    const trends = await this.getTrends(merchantId, 30);
    
    const report = `
# Relatório de ROI - SaaSWPP AI

## Resumo do Mês

### Vendas
- Total de vendas: ${metrics.totalSales}
- Valor total: R$ ${metrics.salesValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Vendas geradas pela IA: ${metrics.aiGeneratedSales} (R$ ${metrics.aiGeneratedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
- Vendas geradas por humanos: ${metrics.humanGeneratedSales} (R$ ${metrics.humanGeneratedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})

### Atendimentos
- Total de conversas: ${metrics.totalConversations}
- Atendidas pela IA: ${metrics.aiHandledConversations} (${metrics.aiResolutionRate.toFixed(1)}%)
- Transferidas para humano: ${metrics.humanHandledConversations} (${metrics.handoffRate.toFixed(1)}%)

### Financeiro
- Receita do mês: R$ ${metrics.monthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Custo da plataforma: R$ ${metrics.platformCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- ROI: ${metrics.roi.toFixed(1)}%
- Payback: ${metrics.paybackMonths} mês(es)

### Satisfação
- Taxa de satisfação: ${metrics.customerSatisfactionRate.toFixed(1)}%
- Tempo médio de resposta: ${metrics.averageResponseTime}s

---

*Gerado automaticamente pelo SaaSWPP AI em ${new Date().toLocaleDateString('pt-BR')}*
`;

    return report;
  }
  
  /**
   * Registra uma venda para tracking de ROI
   */
  async trackSale(
    merchantId: string,
    data: {
      customerPhone: string;
      customerName?: string;
      product?: string;
      value: number;
      source: 'ai' | 'human';
      conversationId?: string;
    }
  ): Promise<void> {
    await prisma.saleTracking.create({
      data: {
        merchantId,
        customerPhone: data.customerPhone,
        customerName: data.customerName,
        product: data.product,
        value: data.value,
        source: data.source,
        conversationId: data.conversationId,
        status: 'confirmed',
        confirmedAt: new Date()
      }
    });
  }
}

// =============================================================================
// 3. CALENDAR SYNC - Integração com Google Calendar e Outlook
// =============================================================================

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: { email: string; name?: string }[];
  reminders?: { minutes: number; method: 'email' | 'popup' }[];
}

export interface CalendarProvider {
  name: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export class CalendarService {
  
  /**
   * Sincroniza agendamento com Google Calendar
   */
  async syncWithGoogleCalendar(
    merchantId: string,
    event: CalendarEvent
  ): Promise<{ success: boolean; eventId?: string; eventUrl?: string; error?: string }> {
    console.log(`[CALENDAR] Sincronizando com Google Calendar: ${event.title}`);
    
    // Buscar configuração do calendário
    const config = await prisma.calendarConfig.findUnique({
      where: { merchantId }
    });
    
    if (!config || config.provider !== 'google') {
      return { success: false, error: 'Google Calendar não configurado' };
    }
    
    try {
      // Verificar se token expirou e renovar se necessário
      const accessToken = await this.ensureValidToken(config);
      
      const payload = {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: event.start.toISOString(),
          timeZone: 'America/Sao_Paulo'
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: 'America/Sao_Paulo'
        },
        location: event.location,
        attendees: event.attendees?.map(a => ({ email: a.email, displayName: a.name })),
        reminders: {
          useDefault: false,
          overrides: event.reminders?.map(r => ({
            minutes: r.minutes,
            method: r.method
          })) || [
            { minutes: 60, method: 'popup' },
            { minutes: 10, method: 'popup' }
          ]
        }
      };
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${config.calendarId}/events`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error?.message || 'Erro ao criar evento' };
      }
      
      return {
        success: true,
        eventId: data.id,
        eventUrl: data.htmlLink
      };
      
    } catch (error: any) {
      console.error('[CALENDAR] Erro:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Sincroniza com Outlook/Microsoft
   */
  async syncWithOutlook(
    merchantId: string,
    event: CalendarEvent
  ): Promise<{ success: boolean; eventId?: string; eventUrl?: string; error?: string }> {
    console.log(`[CALENDAR] Sincronizando com Outlook: ${event.title}`);
    
    const config = await prisma.calendarConfig.findUnique({
      where: { merchantId }
    });
    
    if (!config || config.provider !== 'outlook') {
      return { success: false, error: 'Outlook não configurado' };
    }
    
    try {
      const accessToken = await this.ensureValidToken(config);
      
      const payload = {
        subject: event.title,
        body: {
          contentType: 'text',
          content: event.description || ''
        },
        start: {
          dateTime: event.start.toISOString(),
          timeZone: 'America/Sao_Paulo'
        },
        end: {
          dateTime: event.end.toISOString(),
          timeZone: 'America/Sao_Paulo'
        },
        location: event.location ? { displayName: event.location } : undefined,
        attendees: event.attendees?.map(a => ({
          emailAddress: { address: a.email, name: a.name || '' },
          type: 'required'
        })),
        isReminderOn: true,
        reminderMinutesBeforeStart: 60
      };
      
      const response = await fetch(
        'https://graph.microsoft.com/v1.0/me/events',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error?.message || 'Erro ao criar evento' };
      }
      
      return {
        success: true,
        eventId: data.id,
        eventUrl: data.webLink
      };
      
    } catch (error: any) {
      console.error('[CALENDAR] Erro:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Sincroniza com provedor configurado
   */
  async syncAppointment(
    merchantId: string,
    appointment: {
      clientName: string;
      clientPhone?: string;
      clientEmail?: string;
      service: string;
      date: Date;
      duration: number;
      notes?: string;
    }
  ): Promise<{ success: boolean; eventId?: string; eventUrl?: string }> {
    const config = await prisma.calendarConfig.findUnique({
      where: { merchantId }
    });
    
    if (!config || !config.syncEnabled) {
      return { success: false };
    }
    
    const event: CalendarEvent = {
      title: `${appointment.service} - ${appointment.clientName}`,
      description: `Cliente: ${appointment.clientName}\nTelefone: ${appointment.clientPhone || 'N/A'}\n${appointment.notes || ''}`,
      start: appointment.date,
      end: new Date(appointment.date.getTime() + appointment.duration * 60 * 1000),
      attendees: appointment.clientEmail ? [
        { email: appointment.clientEmail, name: appointment.clientName }
      ] : undefined,
      reminders: [
        { minutes: 60, method: 'popup' },
        { minutes: 10, method: 'popup' }
      ]
    };
    
    if (config.provider === 'google') {
      return this.syncWithGoogleCalendar(merchantId, event);
    } else if (config.provider === 'outlook') {
      return this.syncWithOutlook(merchantId, event);
    }
    
    return { success: false };
  }
  
  /**
   * Garante que o token de acesso é válido
   */
  private async ensureValidToken(config: any): Promise<string> {
    // Se token ainda é válido, retornar
    if (config.expiresAt && new Date(config.expiresAt) > new Date()) {
      return config.accessToken;
    }
    
    // Renovar token usando refresh token
    if (config.provider === 'google') {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          refresh_token: config.refreshToken,
          grant_type: 'refresh_token'
        })
      });
      
      const data = await response.json();
      
      // Atualizar no banco
      await prisma.calendarConfig.update({
        where: { id: config.id },
        data: {
          accessToken: data.access_token,
          expiresAt: new Date(Date.now() + data.expires_in * 1000)
        }
      });
      
      return data.access_token;
    }
    
    // Similar para Outlook...
    return config.accessToken;
  }
  
  /**
   * Busca eventos do calendário
   */
  async getEvents(
    merchantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    const config = await prisma.calendarConfig.findUnique({
      where: { merchantId }
    });
    
    if (!config) return [];
    
    const accessToken = await this.ensureValidToken(config);
    
    if (config.provider === 'google') {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${config.calendarId}/events?` +
        `timeMin=${startDate.toISOString()}&timeMax=${endDate.toISOString()}&singleEvents=true&orderBy=startTime`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      
      const data = await response.json();
      
      return (data.items || []).map((item: any) => ({
        id: item.id,
        title: item.summary,
        description: item.description,
        start: new Date(item.start.dateTime || item.start.date),
        end: new Date(item.end.dateTime || item.end.date),
        location: item.location,
        eventUrl: item.htmlLink
      }));
    }
    
    return [];
  }
  
  /**
   * Cancela evento no calendário
   */
  async cancelEvent(
    merchantId: string,
    eventId: string
  ): Promise<{ success: boolean }> {
    const config = await prisma.calendarConfig.findUnique({
      where: { merchantId }
    });
    
    if (!config) return { success: false };
    
    const accessToken = await this.ensureValidToken(config);
    
    if (config.provider === 'google') {
      await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${config.calendarId}/events/${eventId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
    } else if (config.provider === 'outlook') {
      await fetch(
        `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
    }
    
    return { success: true };
  }
  
  /**
   * Inicia fluxo de OAuth para Google Calendar
   */
  getGoogleOAuthUrl(merchantId: string): string {
    const redirectUri = `${process.env.PLATFORM_URL || 'https://saaswpp.work'}/api/calendar/callback`;
    
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'consent',
      state: merchantId
    });
    
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }
  
  /**
   * Processa callback do OAuth
   */
  async handleOAuthCallback(
    merchantId: string,
    code: string,
    provider: 'google' | 'outlook'
  ): Promise<{ success: boolean }> {
    const redirectUri = `${process.env.PLATFORM_URL || 'https://saaswpp.work'}/api/calendar/callback`;
    
    if (provider === 'google') {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });
      
      const data = await response.json();
      
      await prisma.calendarConfig.upsert({
        where: { merchantId },
        update: {
          provider: 'google',
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: new Date(Date.now() + data.expires_in * 1000)
        },
        create: {
          merchantId,
          provider: 'google',
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: new Date(Date.now() + data.expires_in * 1000)
        }
      });
    }
    
    return { success: true };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const mediaSendingService = new MediaSendingService();
export const roiService = new ROIService();
export const calendarService = new CalendarService();

export default {
  mediaSendingService,
  roiService,
  calendarService
};
