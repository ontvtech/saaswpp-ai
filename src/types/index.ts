/**
 * TIPOS PADRONIZADOS - SaaSWPP AI
 * Versão: 2.0.0
 * 
 * Este arquivo centraliza TODOS os tipos do sistema para evitar
 * inconsistências entre frontend e backend.
 */

// =============================================================================
// MÓDULOS DE IA (Padronizado)
// =============================================================================

/**
 * Módulos disponíveis no sistema
 * - ESSENTIAL: Atendimento básico + Agenda
 * - SALES_PRO: Vendas + Catálogo + PIX
 * - PREDICTIVE: Caçador de leads frios + Aniversariantes
 * - ELITE: Piloto automático + Auto-conhecimento
 */
export type AIModule = 'ESSENTIAL' | 'SALES_PRO' | 'PREDICTIVE' | 'ELITE';

/**
 * Configuração de módulos de um plano
 */
export interface PlanModules {
  ESSENTIAL: boolean;    // Atendimento + Agenda (sempre true)
  SALES_PRO: boolean;    // Vendas + Catálogo
  PREDICTIVE: boolean;   // Caçador de leads
  ELITE: boolean;        // Piloto automático
}

/**
 * Módulos padrão para cada tier
 */
export const DEFAULT_MODULES: Record<string, PlanModules> = {
  'BASIC': {
    ESSENTIAL: true,
    SALES_PRO: false,
    PREDICTIVE: false,
    ELITE: false
  },
  'PRO': {
    ESSENTIAL: true,
    SALES_PRO: true,
    PREDICTIVE: false,
    ELITE: false
  },
  'ENTERPRISE': {
    ESSENTIAL: true,
    SALES_PRO: true,
    PREDICTIVE: true,
    ELITE: false
  },
  'ELITE': {
    ESSENTIAL: true,
    SALES_PRO: true,
    PREDICTIVE: true,
    ELITE: true
  }
};

// =============================================================================
// HIERARQUIA DE PLANOS
// =============================================================================

/**
 * Tipo de plano
 */
export type PlanType = 'MERCHANT' | 'RESELLER';

/**
 * Status de assinatura
 */
export type SubscriptionStatus = 
  | 'trial'      // Em período de teste
  | 'active'     // Assinatura ativa
  | 'suspended'  // Suspenso por inadimplência
  | 'cancelled'  // Cancelado
  | 'pending_verification'; // Aguardando verificação

/**
 * Plano de assinatura
 */
export interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  type: PlanType;
  
  // Limites
  maxTenants: number;      // Para RESELLER: máximo de lojistas
  maxMessages: number;     // Mensagens por mês
  tokenLimit: number;      // Tokens IA por mês
  instanceLimit: number;   // Instâncias WhatsApp
  
  // Módulos permitidos
  modules: PlanModules;
  
  // Integração
  stripePriceId?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// HIERARQUIA DE USUÁRIOS
// =============================================================================

/**
 * Role de usuário (nível de acesso)
 */
export type UserRole = 'ADMIN' | 'RESELLER' | 'MERCHANT';

/**
 * Usuário base
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: SubscriptionStatus;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Admin do sistema (Nível 0)
 */
export interface Admin extends User {
  role: 'ADMIN';
  hasFullAccess: boolean;
}

/**
 * Revendedor (Nível 1)
 */
export interface Reseller extends User {
  role: 'RESELLER';
  
  // Herança de plano
  planId?: string;
  plan?: Plan;
  
  // Limites herdados/estendidos
  allowedModules: AIModule[];
  maxTenants: number;
  activeTenants: number;
  
  // Personalização White-Label
  brandName?: string;
  brandLogo?: string;
  brandPrimaryColor?: string;
  customDomain?: string;
  
  // Financeiro
  stripeKey?: string;
  commissionRate: number; // % de comissão
}

/**
 * Lojista (Nível 2)
 */
export interface Merchant extends User {
  role: 'MERCHANT';
  
  // Relacionamentos
  resellerId?: string;
  reseller?: Reseller;
  planId?: string;
  plan?: Plan;
  nicheId?: string;
  
  // Módulos ativos (herdados do plano + revendedor)
  activeModules: AIModule[];
  
  // Configuração de IA
  mindset: 'GROUNDING' | 'CONSULTANT';
  aiConfig?: {
    name?: string;
    tone?: 'formal' | 'informal' | 'empathetic' | 'sales';
    prompt?: string;
  };
  
  // Limites e uso
  tokenQuota: number;
  tokenUsage: number;
  trialEndsAt?: Date;
  
  // WhatsApp
  whatsappApiType: 'EVOLUTION' | 'META';
  evolutionInstance?: string;
  evolutionApiKey?: string;
  metaAccessToken?: string;
  metaPhoneNumberId?: string;
  metaWabaId?: string;
  
  // Stripe
  stripeCustomerId?: string;
  stripePaymentMethod?: string;
  subscriptionId?: string;
}

// =============================================================================
// POOL DE CHAVES IA
// =============================================================================

/**
 * Estratégia de pool de chaves
 */
export type PoolStrategy = 
  | 'rotation'       // Rotação sequencial
  | 'load_balance'   // Balanceamento de carga
  | 'failover';      // Alta disponibilidade

/**
 * Status de uma chave
 */
export type KeyStatus = 'active' | 'exhausted' | 'error' | 'paused';

/**
 * Tier da chave
 */
export type KeyTier = 'BASIC' | 'PREMIUM' | 'ENTERPRISE';

/**
 * Provedor de IA
 */
export type AIProvider = 'GEMINI' | 'OPENAI' | 'ANTHROPIC' | 'DEEPSEEK';

/**
 * Chave de API de IA
 */
export interface AIKey {
  id: string;
  key: string;              // Chave criptografada
  provider: AIProvider;
  tier: KeyTier;
  status: KeyStatus;
  
  // Limites
  tokenLimit: number;       // Limite mensal
  tokensUsed: number;       // Uso atual
  requestLimit: number;     // Limite de requisições
  requestsUsed: number;     // Requisições atuais
  
  // Estatísticas
  totalRequests: number;    // Total histórico
  totalTokens: number;      // Total histórico
  errorCount: number;       // Erros consecutivos
  lastError?: string;
  
  // Controle
  lastUsed: Date;
  createdAt: Date;
  
  // Configuração
  priority: number;         // Prioridade no pool (maior = mais importante)
  weight: number;           // Peso para load_balance
}

/**
 * Configuração do pool
 */
export interface PoolConfig {
  strategy: PoolStrategy;
  threshold: number;        // % para trocar de chave (padrão: 90%)
  maxErrors: number;        // Erros antes de pausar chave
  retryDelay: number;       // MS antes de tentar novamente
  simultaneous: number;     // Chaves simultâneas para load_balance
}

// =============================================================================
// AGENDAMENTO
// =============================================================================

/**
 * Status de agendamento
 */
export type AppointmentStatus = 
  | 'pending'      // Aguardando aprovação
  | 'confirmed'    // Confirmado
  | 'cancelled'    // Cancelado
  | 'completed'    // Realizado
  | 'no_show';     // Cliente não apareceu

/**
 * Agendamento
 */
export interface Appointment {
  id: string;
  merchantId: string;
  
  clientName: string;
  clientPhone: string;
  
  date: Date;
  duration: number;         // Minutos
  service: string;
  
  status: AppointmentStatus;
  notes?: string;
  
  // Confirmação
  confirmedBy?: string;     // ID do usuário que confirmou
  confirmedAt?: Date;
  
  // Lembretes
  reminderSent24h: boolean;
  reminderSent2h: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// CONVERSAS E MENSAGENS
// =============================================================================

/**
 * Estado de uma conversa
 */
export type ConversationState = 
  | 'IDLE'              // Sem atividade
  | 'AI_ACTIVE'         // IA respondendo
  | 'SCHEDULE_PENDING'  // Aguardando aprovação de agendamento
  | 'PAYMENT_PENDING'   // Aguardando pagamento
  | 'HUMAN_HANDOFF'     // Transferido para humano
  | 'PAUSED';           // Pausado manualmente

/**
 * Sessão de chat
 */
export interface ChatSession {
  id: string;
  merchantId: string;
  sender: string;           // Telefone do cliente
  
  state: ConversationState;
  pausedUntil?: Date;
  
  // Contexto
  context?: {
    intent?: string;
    lastProduct?: string;
    appointmentIntent?: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Log de interação
 */
export interface InteractionLog {
  id: string;
  merchantId: string;
  sender: string;
  
  question: string;
  answer: string;
  
  tokensUsed: number;
  model?: string;
  provider?: AIProvider;
  
  // Análise
  sentiment?: 'positive' | 'neutral' | 'negative';
  intent?: string;
  
  createdAt: Date;
}

// =============================================================================
// TAGS DE CONTROLE (IA)
// =============================================================================

/**
 * Tags que a IA pode retornar para acionar ações
 */
export const AI_TAGS = {
  SCHEDULE_REQUEST: '[SCHEDULE_REQUEST]',
  HUMAN_HANDOFF: '[HUMAN_HANDOFF]',
  PIX_SIGNAL_REQUEST: '[PIX_SIGNAL_REQUEST]',
  SALE_CLOSED: '[SALE_CLOSED]',
  PRICE_QUOTED: '[PRICE_QUOTED]',
} as const;

export type AITag = typeof AI_TAGS[keyof typeof AI_TAGS];

// =============================================================================
// CONFIGURAÇÃO GLOBAL
// =============================================================================

/**
 * Configuração global do sistema
 */
export interface GlobalConfig {
  id: string;
  
  // Trials
  trial_enabled: boolean;
  trial_default_days: number;
  
  // Stripe
  stripeSecretKey?: string;
  stripePublicKey?: string;
  stripeWebhookSecret?: string;
  
  // Evolução API
  evolutionApiUrl?: string;
  evolutionApiKey?: string;
  
  // Redis
  redisHost?: string;
  redisPort?: number;
  
  updatedAt: Date;
}

// =============================================================================
// WEBHOOKS
// =============================================================================

/**
 * Evento de webhook da Evolution API
 */
export interface EvolutionWebhookEvent {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text: string;
      };
    };
    pushName?: string;
    messageTimestamp: number;
  };
}

/**
 * Evento de webhook do Stripe
 */
export interface StripeWebhookEvent {
  type: string;
  data: {
    object: any;
  };
}
