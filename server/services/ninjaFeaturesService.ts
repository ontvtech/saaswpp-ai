/**
 * FEATURES NINJA (R$ 1.997) - SaaSWPP AI
 * 
 * 1. Autonomous Agents - IA executa ações: criar pedidos, processar pagamentos
 * 2. Public API - API REST para desenvolvedores
 * 3. Voice Responses TTS - IA responde com áudio natural
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// =============================================================================
// 1. AUTONOMOUS AGENTS - Agentes Autônomos
// =============================================================================

export interface AgentAction {
  type: 'create_order' | 'process_payment' | 'schedule_appointment' | 'send_coupon' | 'update_customer' | 'transfer_human';
  params: Record<string, any>;
  requiresApproval: boolean;
  autoExecute: boolean;
}

export interface AgentDecision {
  action: AgentAction;
  reasoning: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface Order {
  id: string;
  merchantId: string;
  customerPhone: string;
  customerName?: string;
  items: {
    productId?: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod?: string;
  paymentStatus?: string;
  notes?: string;
  createdAt: Date;
}

export class AutonomousAgentsService {
  
  /**
   * Analisa mensagem e decide qual ação tomar
   */
  async analyzeAndAct(
    merchantId: string,
    message: string,
    context: {
      customerPhone: string;
      conversationHistory: string[];
      customerData?: any;
    }
  ): Promise<AgentDecision | null> {
    const lowerMessage = message.toLowerCase();
    
    // Detectar intenção de pedido
    if (this.detectOrderIntent(lowerMessage)) {
      return this.handleOrderIntent(merchantId, message, context);
    }
    
    // Detectar intenção de pagamento
    if (this.detectPaymentIntent(lowerMessage)) {
      return this.handlePaymentIntent(merchantId, message, context);
    }
    
    // Detectar intenção de agendamento
    if (this.detectScheduleIntent(lowerMessage)) {
      return this.handleScheduleIntent(merchantId, message, context);
    }
    
    // Detectar solicitação de cupom
    if (this.detectCouponIntent(lowerMessage)) {
      return this.handleCouponIntent(merchantId, context);
    }
    
    // Detectar necessidade de atendimento humano
    if (this.detectHumanNeed(lowerMessage)) {
      return {
        action: {
          type: 'transfer_human',
          params: { reason: 'Cliente solicitou atendimento humano' },
          requiresApproval: false,
          autoExecute: true
        },
        reasoning: 'Cliente solicitou atendimento humano explicitamente',
        confidence: 0.95,
        riskLevel: 'low'
      };
    }
    
    return null;
  }
  
  /**
   * Detecta intenção de fazer pedido
   */
  private detectOrderIntent(message: string): boolean {
    const keywords = [
      'quero comprar', 'quero pedir', 'fazer pedido', 'quero encomendar',
      'pode mandar', 'me manda', 'quero esse', 'vou querer',
      'qual o preço', 'quanto custa', 'tem disponível'
    ];
    return keywords.some(kw => message.includes(kw));
  }
  
  /**
   * Detecta intenção de pagamento
   */
  private detectPaymentIntent(message: string): boolean {
    const keywords = [
      'pagar', 'pix', 'cartão', 'transferir', 'como pago',
      'mandar dinheiro', 'efetuar pagamento', 'realizar pagamento'
    ];
    return keywords.some(kw => message.includes(kw));
  }
  
  /**
   * Detecta intenção de agendamento
   */
  private detectScheduleIntent(message: string): boolean {
    const keywords = [
      'agendar', 'marcar', 'horário', 'horario', 'reservar',
      'queria marcar', 'posso agendar', 'tem vaga'
    ];
    return keywords.some(kw => message.includes(kw));
  }
  
  /**
   * Detecta solicitação de cupom
   */
  private detectCouponIntent(message: string): boolean {
    const keywords = [
      'cupom', 'desconto', 'promoção', 'promocao', 'oferta',
      'tem desconto', 'mais barato', 'economizar'
    ];
    return keywords.some(kw => message.includes(kw));
  }
  
  /**
   * Detecta necessidade de atendimento humano
   */
  private detectHumanNeed(message: string): boolean {
    const keywords = [
      'falar com humano', 'falar com gerente', 'falar com pessoa',
      'atendente', 'não quero robô', 'nao quero robo', 'pessoa real',
      'humano por favor', 'quero falar com alguém'
    ];
    return keywords.some(kw => message.includes(kw));
  }
  
  /**
   * Processa intenção de pedido
   */
  private async handleOrderIntent(
    merchantId: string,
    message: string,
    context: any
  ): Promise<AgentDecision> {
    // Buscar produtos do catálogo
    const products = await prisma.product.findMany({
      where: { merchantId }
    });
    
    return {
      action: {
        type: 'create_order',
        params: {
          customerPhone: context.customerPhone,
          items: [], // Será preenchido após confirmação
          requiresProductSelection: products.length > 0
        },
        requiresApproval: true,
        autoExecute: false
      },
      reasoning: 'Cliente demonstrou intenção de fazer um pedido. Necessário confirmar produtos e quantidades.',
      confidence: 0.75,
      riskLevel: 'medium'
    };
  }
  
  /**
   * Processa intenção de pagamento
   */
  private async handlePaymentIntent(
    merchantId: string,
    message: string,
    context: any
  ): Promise<AgentDecision> {
    // Verificar se tem pedidos pendentes
    const pendingOrders = await prisma.$queryRaw`
      SELECT * FROM orders 
      WHERE "merchantId" = ${merchantId} 
      AND "customerPhone" = ${context.customerPhone}
      AND status = 'pending'
      LIMIT 1
    ` as any[];
    
    if (pendingOrders.length > 0) {
      const order = pendingOrders[0];
      
      return {
        action: {
          type: 'process_payment',
          params: {
            orderId: order.id,
            total: order.total,
            methods: ['pix', 'credit_card', 'boleto']
          },
          requiresApproval: false,
          autoExecute: true
        },
        reasoning: `Cliente quer pagar pedido #${order.id} de R$ ${order.total}. Enviando opções de pagamento.`,
        confidence: 0.85,
        riskLevel: 'low'
      };
    }
    
    return {
      action: {
        type: 'process_payment',
        params: {
          hasPendingOrder: false
        },
        requiresApproval: false,
        autoExecute: true
      },
      reasoning: 'Cliente quer pagar mas não há pedidos pendentes. Oferecendo ajuda para criar pedido.',
      confidence: 0.7,
      riskLevel: 'low'
    };
  }
  
  /**
   * Processa intenção de agendamento
   */
  private async handleScheduleIntent(
    merchantId: string,
    message: string,
    context: any
  ): Promise<AgentDecision> {
    return {
      action: {
        type: 'schedule_appointment',
        params: {
          customerPhone: context.customerPhone
        },
        requiresApproval: true,
        autoExecute: false
      },
      reasoning: 'Cliente quer agendar um horário. Necessário confirmar serviço, data e hora.',
      confidence: 0.8,
      riskLevel: 'low'
    };
  }
  
  /**
   * Processa solicitação de cupom
   */
  private async handleCouponIntent(
    merchantId: string,
    context: any
  ): Promise<AgentDecision> {
    // Gerar cupom único
    const couponCode = `WPP${Date.now().toString(36).toUpperCase()}`;
    
    return {
      action: {
        type: 'send_coupon',
        params: {
          code: couponCode,
          discount: 10, // 10% de desconto
          expiresIn: 7 // 7 dias
        },
        requiresApproval: false,
        autoExecute: true
      },
      reasoning: 'Cliente solicitou desconto. Gerando cupom de 10% válido por 7 dias.',
      confidence: 0.9,
      riskLevel: 'low'
    };
  }
  
  /**
   * Executa ação do agente
   */
  async executeAction(
    merchantId: string,
    action: AgentAction
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    switch (action.type) {
      case 'create_order':
        return this.createOrder(merchantId, action.params);
      case 'process_payment':
        return this.processPayment(merchantId, action.params);
      case 'schedule_appointment':
        return this.scheduleAppointment(merchantId, action.params);
      case 'send_coupon':
        return this.sendCoupon(merchantId, action.params);
      case 'transfer_human':
        return this.transferToHuman(merchantId, action.params);
      default:
        return { success: false, error: 'Ação não reconhecida' };
    }
  }
  
  /**
   * Cria pedido
   */
  private async createOrder(
    merchantId: string,
    params: any
  ): Promise<{ success: boolean; result?: Order; error?: string }> {
    try {
      const orderId = `ORD${Date.now().toString(36).toUpperCase()}`;
      
      // Salvar pedido (usando query raw pois não temos modelo Order)
      await prisma.$executeRaw`
        INSERT INTO orders (id, "merchantId", "customerPhone", items, total, status, "createdAt")
        VALUES (${orderId}, ${merchantId}, ${params.customerPhone}, ${JSON.stringify(params.items || [])}, ${params.total || 0}, 'pending', NOW())
      `;
      
      return {
        success: true,
        result: {
          id: orderId,
          merchantId,
          customerPhone: params.customerPhone,
          items: params.items || [],
          total: params.total || 0,
          status: 'pending',
          createdAt: new Date()
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Processa pagamento
   */
  private async processPayment(
    merchantId: string,
    params: any
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    if (!params.orderId) {
      return { success: true, result: { message: 'Nenhum pedido pendente encontrado' } };
    }
    
    // Aqui integraria com gateway de pagamento real
    // Por agora, retorna informações de PIX
    return {
      success: true,
      result: {
        orderId: params.orderId,
        total: params.total,
        pixCode: `00020126580014br.gov.bcb.pix0136${crypto.randomBytes(16).toString('hex')}520400005303986540${params.total}5802BR5925SaaSWPP6009SAO PAULO62070503***6304`,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=pix_${params.orderId}`
      }
    };
  }
  
  /**
   * Agenda atendimento
   */
  private async scheduleAppointment(
    merchantId: string,
    params: any
  ): Promise<{ success: boolean; result?: any; error?: string }> {
    const appointment = await prisma.appointment.create({
      data: {
        merchantId,
        clientName: params.customerName || 'Cliente',
        clientPhone: params.customerPhone,
        date: params.date ? new Date(params.date) : new Date(),
        service: params.service || 'A definir',
        status: 'pending'
      }
    });
    
    return {
      success: true,
      result: appointment
    };
  }
  
  /**
   * Envia cupom
   */
  private async sendCoupon(
    merchantId: string,
    params: any
  ): Promise<{ success: boolean; result?: any }> {
    // Em produção, salvaria no banco
    return {
      success: true,
      result: {
        code: params.code,
        discount: params.discount,
        expiresIn: params.expiresIn,
        message: `🎁 Use o cupom *${params.code}* para ${params.discount}% de desconto! Válido por ${params.expiresIn} dias.`
      }
    };
  }
  
  /**
   * Transfere para humano
   */
  private async transferToHuman(
    merchantId: string,
    params: any
  ): Promise<{ success: boolean }> {
    // Marcar conversa para transferência
    console.log(`[AGENT] Transferindo para humano. Merchant: ${merchantId}. Motivo: ${params.reason}`);
    return { success: true };
  }
}

// =============================================================================
// 2. PUBLIC API - API REST para Desenvolvedores
// =============================================================================

export interface ApiKey {
  id: string;
  merchantId: string;
  key: string;
  name: string;
  permissions: string[];
  rateLimit: number;
  lastUsed?: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface ApiRequest {
  endpoint: string;
  method: string;
  params: Record<string, any>;
  merchantId: string;
}

export class PublicApiService {
  
  /**
   * Gera nova API Key
   */
  async generateApiKey(
    merchantId: string,
    name: string,
    permissions: string[] = ['read', 'write'],
    rateLimit: number = 1000,
    expiresInDays?: number
  ): Promise<ApiKey> {
    const key = `sk_live_${crypto.randomBytes(24).toString('hex')}`;
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;
    
    // Salvar no banco (tabela de API keys)
    const apiKey = await prisma.$queryRaw`
      INSERT INTO api_keys (id, "merchantId", key, name, permissions, "rateLimit", "expiresAt", "isActive", "createdAt")
      VALUES (gen_random_uuid(), ${merchantId}, ${key}, ${name}, ${JSON.stringify(permissions)}, ${rateLimit}, ${expiresAt || null}, true, NOW())
      RETURNING *
    ` as any[];
    
    return {
      id: apiKey[0]?.id,
      merchantId,
      key,
      name,
      permissions,
      rateLimit,
      expiresAt,
      isActive: true
    };
  }
  
  /**
   * Valida API Key
   */
  async validateApiKey(key: string): Promise<ApiKey | null> {
    const apiKeys = await prisma.$queryRaw`
      SELECT * FROM api_keys WHERE key = ${key} AND "isActive" = true
    ` as any[];
    
    if (!apiKeys || apiKeys.length === 0) {
      return null;
    }
    
    const apiKey = apiKeys[0];
    
    // Verificar expiração
    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return null;
    }
    
    // Atualizar lastUsed
    await prisma.$executeRaw`
      UPDATE api_keys SET "lastUsed" = NOW() WHERE id = ${apiKey.id}
    `;
    
    return {
      id: apiKey.id,
      merchantId: apiKey.merchantId,
      key: apiKey.key,
      name: apiKey.name,
      permissions: apiKey.permissions,
      rateLimit: apiKey.rateLimit,
      lastUsed: apiKey.lastUsed,
      expiresAt: apiKey.expiresAt,
      isActive: apiKey.isActive
    };
  }
  
  /**
   * Verifica permissão
   */
  hasPermission(apiKey: ApiKey, permission: string): boolean {
    return apiKey.permissions.includes(permission) || apiKey.permissions.includes('admin');
  }
  
  /**
   * Lista API Keys do merchant
   */
  async listApiKeys(merchantId: string): Promise<ApiKey[]> {
    const keys = await prisma.$queryRaw`
      SELECT * FROM api_keys WHERE "merchantId" = ${merchantId} ORDER BY "createdAt" DESC
    ` as any[];
    
    return keys.map(k => ({
      id: k.id,
      merchantId: k.merchantId,
      key: k.key.substring(0, 12) + '...', // Ocultar parte da chave
      name: k.name,
      permissions: k.permissions,
      rateLimit: k.rateLimit,
      lastUsed: k.lastUsed,
      expiresAt: k.expiresAt,
      isActive: k.isActive
    }));
  }
  
  /**
   * Revoga API Key
   */
  async revokeApiKey(keyId: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE api_keys SET "isActive" = false WHERE id = ${keyId}
    `;
  }
  
  /**
   * Documentação da API
   */
  getApiDocumentation(): { endpoint: string; method: string; description: string; auth: boolean }[] {
    return [
      // Mensagens
      { endpoint: '/api/v1/messages', method: 'GET', description: 'Listar mensagens', auth: true },
      { endpoint: '/api/v1/messages', method: 'POST', description: 'Enviar mensagem', auth: true },
      { endpoint: '/api/v1/messages/:id', method: 'GET', description: 'Buscar mensagem', auth: true },
      
      // Conversas
      { endpoint: '/api/v1/conversations', method: 'GET', description: 'Listar conversas', auth: true },
      { endpoint: '/api/v1/conversations/:id', method: 'GET', description: 'Detalhes da conversa', auth: true },
      
      // Clientes
      { endpoint: '/api/v1/customers', method: 'GET', description: 'Listar clientes', auth: true },
      { endpoint: '/api/v1/customers/:phone', method: 'GET', description: 'Detalhes do cliente', auth: true },
      { endpoint: '/api/v1/customers/:phone', method: 'PUT', description: 'Atualizar cliente', auth: true },
      
      // Agendamentos
      { endpoint: '/api/v1/appointments', method: 'GET', description: 'Listar agendamentos', auth: true },
      { endpoint: '/api/v1/appointments', method: 'POST', description: 'Criar agendamento', auth: true },
      { endpoint: '/api/v1/appointments/:id', method: 'PUT', description: 'Atualizar agendamento', auth: true },
      { endpoint: '/api/v1/appointments/:id', method: 'DELETE', description: 'Cancelar agendamento', auth: true },
      
      // Produtos
      { endpoint: '/api/v1/products', method: 'GET', description: 'Listar produtos', auth: true },
      { endpoint: '/api/v1/products', method: 'POST', description: 'Criar produto', auth: true },
      { endpoint: '/api/v1/products/:id', method: 'PUT', description: 'Atualizar produto', auth: true },
      { endpoint: '/api/v1/products/:id', method: 'DELETE', description: 'Remover produto', auth: true },
      
      // Pedidos
      { endpoint: '/api/v1/orders', method: 'GET', description: 'Listar pedidos', auth: true },
      { endpoint: '/api/v1/orders', method: 'POST', description: 'Criar pedido', auth: true },
      { endpoint: '/api/v1/orders/:id', method: 'GET', description: 'Detalhes do pedido', auth: true },
      { endpoint: '/api/v1/orders/:id/status', method: 'PUT', description: 'Atualizar status', auth: true },
      
      // Webhooks
      { endpoint: '/api/v1/webhooks', method: 'GET', description: 'Listar webhooks', auth: true },
      { endpoint: '/api/v1/webhooks', method: 'POST', description: 'Criar webhook', auth: true },
      { endpoint: '/api/v1/webhooks/:id', method: 'DELETE', description: 'Remover webhook', auth: true },
      
      // Métricas
      { endpoint: '/api/v1/metrics', method: 'GET', description: 'Métricas gerais', auth: true },
      { endpoint: '/api/v1/metrics/messages', method: 'GET', description: 'Métricas de mensagens', auth: true },
      { endpoint: '/api/v1/metrics/sales', method: 'GET', description: 'Métricas de vendas', auth: true }
    ];
  }
}

// =============================================================================
// 3. VOICE RESPONSES TTS - Respostas de Voz
// =============================================================================

export interface VoiceConfig {
  provider: 'google' | 'azure' | 'amazon' | 'elevenlabs';
  voiceId: string;
  language: string;
  speed: number;
  pitch: number;
}

export interface VoiceResponse {
  audioUrl: string;
  duration: number;
  text: string;
}

export class VoiceResponsesService {
  
  private evolutionUrl: string;
  private evolutionKey: string;
  
  constructor() {
    this.evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';
    this.evolutionKey = process.env.EVOLUTION_API_KEY || '';
  }
  
  /**
   * Gera áudio a partir de texto (TTS)
   */
  async textToSpeech(
    text: string,
    config: VoiceConfig = {
      provider: 'google',
      voiceId: 'pt-BR-Standard-A',
      language: 'pt-BR',
      speed: 1.0,
      pitch: 0
    }
  ): Promise<{ success: boolean; audioBase64?: string; error?: string }> {
    try {
      // Usar SDK de TTS (aqui usamos o z-ai-web-dev-sdk para TTS)
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();
      
      const response = await zai.tts.generate({
        text,
        voice: config.voiceId,
        language: config.language
      });
      
      return {
        success: true,
        audioBase64: response.audio
      };
      
    } catch (error: any) {
      console.error('[TTS] Erro:', error);
      
      // Fallback: usar Google TTS API diretamente
      return this.googleTextToSpeech(text, config);
    }
  }
  
  /**
   * Google Cloud TTS
   */
  private async googleTextToSpeech(
    text: string,
    config: VoiceConfig
  ): Promise<{ success: boolean; audioBase64?: string; error?: string }> {
    try {
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text },
            voice: {
              languageCode: config.language,
              name: config.voiceId
            },
            audioConfig: {
              audioEncoding: 'OGG_OPUS',
              speakingRate: config.speed,
              pitch: config.pitch
            }
          })
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.error?.message };
      }
      
      return {
        success: true,
        audioBase64: data.audioContent
      };
      
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Envia mensagem de voz via WhatsApp
   */
  async sendVoiceMessage(
    instanceName: string,
    to: string,
    text: string,
    config?: VoiceConfig
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    console.log(`[TTS] Gerando áudio para ${to}`);
    
    // Gerar áudio
    const audioResult = await this.textToSpeech(text, config);
    
    if (!audioResult.success || !audioResult.audioBase64) {
      return { success: false, error: audioResult.error || 'Erro ao gerar áudio' };
    }
    
    // Enviar via Evolution API
    try {
      const response = await fetch(
        `${this.evolutionUrl}/message/sendWhatsAppAudio/${instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.evolutionKey
          },
          body: JSON.stringify({
            number: to,
            audio: audioResult.audioBase64,
            options: {
              delay: 2000,
              presence: 'recording'
            }
          })
        }
      );
      
      const data = await response.json();
      
      if (!response.ok) {
        return { success: false, error: data.message || 'Erro ao enviar áudio' };
      }
      
      return { success: true, messageId: data.key?.id };
      
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Lista vozes disponíveis
   */
  getAvailableVoices(): { id: string; name: string; gender: string; language: string }[] {
    return [
      // Português Brasil
      { id: 'pt-BR-Standard-A', name: 'Ana', gender: 'female', language: 'pt-BR' },
      { id: 'pt-BR-Standard-B', name: 'Bruno', gender: 'male', language: 'pt-BR' },
      { id: 'pt-BR-Standard-C', name: 'Carla', gender: 'female', language: 'pt-BR' },
      { id: 'pt-BR-Wavenet-A', name: 'Ana (Natural)', gender: 'female', language: 'pt-BR' },
      { id: 'pt-BR-Wavenet-B', name: 'Bruno (Natural)', gender: 'male', language: 'pt-BR' },
      { id: 'pt-BR-Neural2-A', name: 'Ana (Neural)', gender: 'female', language: 'pt-BR' },
      { id: 'pt-BR-Neural2-B', name: 'Bruno (Neural)', gender: 'male', language: 'pt-BR' },
      
      // Português Portugal
      { id: 'pt-PT-Standard-A', name: 'Maria', gender: 'female', language: 'pt-PT' },
      { id: 'pt-PT-Standard-B', name: 'João', gender: 'male', language: 'pt-PT' },
      
      // Espanhol
      { id: 'es-ES-Standard-A', name: 'Carmen', gender: 'female', language: 'es-ES' },
      { id: 'es-ES-Standard-B', name: 'Carlos', gender: 'male', language: 'es-ES' },
      
      // Inglês
      { id: 'en-US-Standard-A', name: 'Emily', gender: 'female', language: 'en-US' },
      { id: 'en-US-Standard-B', name: 'James', gender: 'male', language: 'en-US' }
    ];
  }
  
  /**
   * Configuração padrão
   */
  getDefaultConfig(): VoiceConfig {
    return {
      provider: 'google',
      voiceId: 'pt-BR-Wavenet-A',
      language: 'pt-BR',
      speed: 1.0,
      pitch: 0
    };
  }
  
  /**
   * Deve usar voz para esta resposta?
   */
  shouldUseVoice(
    message: string,
    config: { voiceEnabled: boolean; voiceForLongMessages: boolean; minCharsForVoice: number }
  ): boolean {
    if (!config.voiceEnabled) return false;
    
    // Se configurado para mensagens longas
    if (config.voiceForLongMessages && message.length >= config.minCharsForVoice) {
      return true;
    }
    
    // Se cliente pediu áudio
    if (message.toLowerCase().includes('[voice]')) {
      return true;
    }
    
    return false;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const autonomousAgentsService = new AutonomousAgentsService();
export const publicApiService = new PublicApiService();
export const voiceResponsesService = new VoiceResponsesService();

export default {
  autonomousAgentsService,
  publicApiService,
  voiceResponsesService
};
