/**
 * SISTEMA DE FEATURES E MÓDULOS - SaaSWPP AI
 * 
 * Cada MÓDULO contém várias FEATURES específicas
 * O Admin/Reseller pode ativar/desativar features individuais
 */

// =============================================================================
// TIPOS
// =============================================================================

export type AIModule = 'ESSENTIAL' | 'SALES_PRO' | 'PREDICTIVE' | 'ELITE' | 'NINJA';

export type FeatureKey = 
  // === ESSENTIAL - Básico ===
  | 'WHATSAPP_CONNECT'
  | 'AI_ATTENDANT'
  | 'KNOWLEDGE_BASE'
  | 'BASIC_REPORTS'
  | 'INTERACTIVE_MESSAGES'
  | 'DYNAMIC_TEMPLATES'
  | 'AUTO_REPORTS_EMAIL'
  | 'KEYWORD_ANALYSIS'
  | 'HEATMAP_HOURS'
  
  // === SALES_PRO - Vendas ===
  | 'MEDIA_SENDING'
  | 'PRODUCT_CATALOG'
  | 'PRICE_QUOTES'
  | 'ROI_DASHBOARD'
  | 'CALENDAR_SYNC'
  | 'APPOINTMENT_MANAGEMENT'
  | 'PERFORMANCE_RANKING'
  
  // === PREDICTIVE - Automação ===
  | 'SENTIMENT_ANALYSIS'
  | 'AUTO_TRIGGERS'
  | 'DRIP_CAMPAIGNS'
  | 'LOYALTY_PROGRAM'
  | 'ABANDONED_CART'
  | 'CLIENT_REACTIVATION'
  
  // === ELITE - Premium ===
  | 'LONG_TERM_MEMORY'
  | 'FLOW_BUILDER'
  | 'CRM_INTEGRATION'
  | 'ECOMMERCE_INTEGRATION'
  | 'WEBHOOKS_ZAPIER'
  | 'INSTAGRAM_MESSENGER'
  | 'HUMAN_SUGGESTIONS'
  | 'FEW_SHOT_TRAINING'
  
  // === NINJA - Enterprise ===
  | 'AUTONOMOUS_AGENTS'
  | 'VOICE_RESPONSES_TTS'
  | 'PUBLIC_API'
  | 'PIX_PAYMENTS'
  | 'ORDER_PROCESSING'
  | 'WHITE_LABEL'
  | 'DEDICATED_SUPPORT'
  | 'NFSE_AUTO_ISSUE';

export interface FeatureConfig {
  key: FeatureKey;
  name: string;
  description: string;
  module: AIModule;
  requiresUpgrade?: AIModule[]; // Módulos que também liberam esta feature
}

// =============================================================================
// DEFINIÇÃO DE FEATURES POR MÓDULO
// =============================================================================

export const FEATURES: Record<FeatureKey, FeatureConfig> = {
  // ==================== ESSENTIAL ====================
  WHATSAPP_CONNECT: {
    key: 'WHATSAPP_CONNECT',
    name: 'Conexão WhatsApp',
    description: 'Conectar número de WhatsApp via QR Code',
    module: 'ESSENTIAL'
  },
  AI_ATTENDANT: {
    key: 'AI_ATTENDANT',
    name: 'Atendente IA 24h',
    description: 'IA responde automaticamente clientes',
    module: 'ESSENTIAL'
  },
  KNOWLEDGE_BASE: {
    key: 'KNOWLEDGE_BASE',
    name: 'Base de Conhecimento',
    description: 'Adicionar textos e PDFs para IA aprender',
    module: 'ESSENTIAL'
  },
  BASIC_REPORTS: {
    key: 'BASIC_REPORTS',
    name: 'Relatórios Básicos',
    description: 'Visualizar métricas de atendimento',
    module: 'ESSENTIAL'
  },
  INTERACTIVE_MESSAGES: {
    key: 'INTERACTIVE_MESSAGES',
    name: 'Mensagens Interativas',
    description: 'Botões e listas clicáveis no WhatsApp',
    module: 'ESSENTIAL'
  },
  DYNAMIC_TEMPLATES: {
    key: 'DYNAMIC_TEMPLATES',
    name: 'Templates Dinâmicos',
    description: 'Mensagens com variáveis personalizáveis',
    module: 'ESSENTIAL'
  },
  AUTO_REPORTS_EMAIL: {
    key: 'AUTO_REPORTS_EMAIL',
    name: 'Relatórios Automáticos',
    description: 'Resumos diários/semanais por email',
    module: 'ESSENTIAL'
  },
  KEYWORD_ANALYSIS: {
    key: 'KEYWORD_ANALYSIS',
    name: 'Análise de Palavras-Chave',
    description: 'Ver o que clientes mais perguntam',
    module: 'ESSENTIAL'
  },
  HEATMAP_HOURS: {
    key: 'HEATMAP_HOURS',
    name: 'Heatmap de Horários',
    description: 'Visualizar horários de pico',
    module: 'ESSENTIAL'
  },

  // ==================== SALES_PRO ====================
  MEDIA_SENDING: {
    key: 'MEDIA_SENDING',
    name: 'Envio de Mídia',
    description: 'Enviar imagens, vídeos, áudios e PDFs',
    module: 'SALES_PRO'
  },
  PRODUCT_CATALOG: {
    key: 'PRODUCT_CATALOG',
    name: 'Catálogo de Produtos',
    description: 'Cadastrar produtos com fotos e preços',
    module: 'SALES_PRO'
  },
  PRICE_QUOTES: {
    key: 'PRICE_QUOTES',
    name: 'Orçamentos Automáticos',
    description: 'IA gera orçamentos personalizados',
    module: 'SALES_PRO'
  },
  ROI_DASHBOARD: {
    key: 'ROI_DASHBOARD',
    name: 'Dashboard de ROI',
    description: 'Ver quanto a IA está gerando em vendas',
    module: 'SALES_PRO'
  },
  CALENDAR_SYNC: {
    key: 'CALENDAR_SYNC',
    name: 'Sincronização de Calendário',
    description: 'Google Calendar e Outlook integrados',
    module: 'SALES_PRO'
  },
  APPOINTMENT_MANAGEMENT: {
    key: 'APPOINTMENT_MANAGEMENT',
    name: 'Gestão de Agendamentos',
    description: 'Gerenciar horários e confirmações',
    module: 'SALES_PRO'
  },
  PERFORMANCE_RANKING: {
    key: 'PERFORMANCE_RANKING',
    name: 'Ranking de Performance',
    description: 'Comparar desempenho com outros lojistas',
    module: 'SALES_PRO'
  },

  // ==================== PREDICTIVE ====================
  SENTIMENT_ANALYSIS: {
    key: 'SENTIMENT_ANALYSIS',
    name: 'Análise de Sentimento',
    description: 'Detectar clientes insatisfeitos em tempo real',
    module: 'PREDICTIVE'
  },
  AUTO_TRIGGERS: {
    key: 'AUTO_TRIGGERS',
    name: 'Gatilhos Automáticos',
    description: 'Ações baseadas em eventos e comportamentos',
    module: 'PREDICTIVE'
  },
  DRIP_CAMPAIGNS: {
    key: 'DRIP_CAMPAIGNS',
    name: 'Sequências de Mensagens',
    description: 'Campanhas de nutrição de leads',
    module: 'PREDICTIVE'
  },
  LOYALTY_PROGRAM: {
    key: 'LOYALTY_PROGRAM',
    name: 'Programa de Fidelidade',
    description: 'Pontos e recompensas via WhatsApp',
    module: 'PREDICTIVE'
  },
  ABANDONED_CART: {
    key: 'ABANDONED_CART',
    name: 'Recuperação de Carrinho',
    description: 'Recuperar vendas não finalizadas',
    module: 'PREDICTIVE'
  },
  CLIENT_REACTIVATION: {
    key: 'CLIENT_REACTIVATION',
    name: 'Reativação de Clientes',
    description: 'Contatar clientes inativos automaticamente',
    module: 'PREDICTIVE'
  },

  // ==================== ELITE ====================
  LONG_TERM_MEMORY: {
    key: 'LONG_TERM_MEMORY',
    name: 'Memória de Longo Prazo',
    description: 'IA lembra histórico completo do cliente',
    module: 'ELITE'
  },
  FLOW_BUILDER: {
    key: 'FLOW_BUILDER',
    name: 'Builder de Fluxos',
    description: 'Criar fluxos de conversa visuais (no-code)',
    module: 'ELITE'
  },
  CRM_INTEGRATION: {
    key: 'CRM_INTEGRATION',
    name: 'Integração com CRMs',
    description: 'HubSpot, Pipedrive e outros CRMs',
    module: 'ELITE'
  },
  ECOMMERCE_INTEGRATION: {
    key: 'ECOMMERCE_INTEGRATION',
    name: 'Integração E-commerce',
    description: 'Shopify, WooCommerce e outras plataformas',
    module: 'ELITE'
  },
  WEBHOOKS_ZAPIER: {
    key: 'WEBHOOKS_ZAPIER',
    name: 'Webhooks e Zapier',
    description: 'Integração com Zapier, Make e webhooks',
    module: 'ELITE'
  },
  INSTAGRAM_MESSENGER: {
    key: 'INSTAGRAM_MESSENGER',
    name: 'Instagram + Messenger',
    description: 'Atendimento multicanal (Instagram + Facebook)',
    module: 'ELITE'
  },
  HUMAN_SUGGESTIONS: {
    key: 'HUMAN_SUGGESTIONS',
    name: 'Sugestões para Humano',
    description: 'IA sugere respostas para atendente humano',
    module: 'ELITE'
  },
  FEW_SHOT_TRAINING: {
    key: 'FEW_SHOT_TRAINING',
    name: 'Treinamento por Exemplo',
    description: 'Ensinar IA com conversas reais',
    module: 'ELITE'
  },

  // ==================== NINJA ====================
  AUTONOMOUS_AGENTS: {
    key: 'AUTONOMOUS_AGENTS',
    name: 'Agentes Autônomos',
    description: 'IA executa ações: criar pedidos, processar pagamentos',
    module: 'NINJA'
  },
  VOICE_RESPONSES_TTS: {
    key: 'VOICE_RESPONSES_TTS',
    name: 'Respostas de Voz',
    description: 'IA responde com áudio natural (TTS)',
    module: 'NINJA'
  },
  PUBLIC_API: {
    key: 'PUBLIC_API',
    name: 'API Pública',
    description: 'API REST para desenvolvedores',
    module: 'NINJA'
  },
  PIX_PAYMENTS: {
    key: 'PIX_PAYMENTS',
    name: 'Pagamentos via PIX',
    description: 'Gerar e processar PIX automaticamente',
    module: 'NINJA'
  },
  ORDER_PROCESSING: {
    key: 'ORDER_PROCESSING',
    name: 'Processamento de Pedidos',
    description: 'IA cria e gerencia pedidos completos',
    module: 'NINJA'
  },
  WHITE_LABEL: {
    key: 'WHITE_LABEL',
    name: 'White Label',
    description: 'Personalizar marca e domínio próprio',
    module: 'NINJA'
  },
  DEDICATED_SUPPORT: {
    key: 'DEDICATED_SUPPORT',
    name: 'Suporte Dedicado',
    description: 'Gerente de conta e suporte prioritário',
    module: 'NINJA'
  },
  NFSE_AUTO_ISSUE: {
    key: 'NFSE_AUTO_ISSUE',
    name: 'NFS-e Automática',
    description: 'Emitir nota fiscal de serviço automaticamente após pagamento',
    module: 'NINJA'
  }
};

// =============================================================================
// MAPEAMENTO REVERSO: FEATURE -> MÓDULO
// =============================================================================

export const FEATURE_TO_MODULE: Record<FeatureKey, AIModule> = 
  Object.fromEntries(
    Object.entries(FEATURES).map(([key, config]) => [key, config.module])
  ) as Record<FeatureKey, AIModule>;

// =============================================================================
// FEATURES POR MÓDULO
// =============================================================================

export const FEATURES_BY_MODULE: Record<AIModule, FeatureKey[]> = {
  ESSENTIAL: [
    'WHATSAPP_CONNECT',
    'AI_ATTENDANT',
    'KNOWLEDGE_BASE',
    'BASIC_REPORTS',
    'INTERACTIVE_MESSAGES',
    'DYNAMIC_TEMPLATES',
    'AUTO_REPORTS_EMAIL',
    'KEYWORD_ANALYSIS',
    'HEATMAP_HOURS'
  ],
  SALES_PRO: [
    'MEDIA_SENDING',
    'PRODUCT_CATALOG',
    'PRICE_QUOTES',
    'ROI_DASHBOARD',
    'CALENDAR_SYNC',
    'APPOINTMENT_MANAGEMENT',
    'PERFORMANCE_RANKING'
  ],
  PREDICTIVE: [
    'SENTIMENT_ANALYSIS',
    'AUTO_TRIGGERS',
    'DRIP_CAMPAIGNS',
    'LOYALTY_PROGRAM',
    'ABANDONED_CART',
    'CLIENT_REACTIVATION'
  ],
  ELITE: [
    'LONG_TERM_MEMORY',
    'FLOW_BUILDER',
    'CRM_INTEGRATION',
    'ECOMMERCE_INTEGRATION',
    'WEBHOOKS_ZAPIER',
    'INSTAGRAM_MESSENGER',
    'HUMAN_SUGGESTIONS',
    'FEW_SHOT_TRAINING'
  ],
  NINJA: [
    'AUTONOMOUS_AGENTS',
    'VOICE_RESPONSES_TTS',
    'PUBLIC_API',
    'PIX_PAYMENTS',
    'ORDER_PROCESSING',
    'WHITE_LABEL',
    'DEDICATED_SUPPORT',
    'NFSE_AUTO_ISSUE'
  ]
};

// =============================================================================
// PLANOS PRÉ-DEFINIDOS
// =============================================================================

export const DEFAULT_PLANS = {
  START: {
    name: 'START',
    price: 97,
    modules: ['ESSENTIAL'] as AIModule[],
    features: FEATURES_BY_MODULE.ESSENTIAL,
    limits: {
      messages: 5000,
      tokens: 50000,
      instances: 1
    }
  },
  PRO: {
    name: 'PRO',
    price: 247,
    modules: ['ESSENTIAL', 'SALES_PRO'] as AIModule[],
    features: [
      ...FEATURES_BY_MODULE.ESSENTIAL,
      ...FEATURES_BY_MODULE.SALES_PRO
    ],
    limits: {
      messages: 20000,
      tokens: 150000,
      instances: 1
    }
  },
  ENTERPRISE: {
    name: 'ENTERPRISE',
    price: 497,
    modules: ['ESSENTIAL', 'SALES_PRO', 'PREDICTIVE'] as AIModule[],
    features: [
      ...FEATURES_BY_MODULE.ESSENTIAL,
      ...FEATURES_BY_MODULE.SALES_PRO,
      ...FEATURES_BY_MODULE.PREDICTIVE
    ],
    limits: {
      messages: 50000,
      tokens: 300000,
      instances: 2
    }
  },
  ELITE: {
    name: 'ELITE',
    price: 997,
    modules: ['ESSENTIAL', 'SALES_PRO', 'PREDICTIVE', 'ELITE'] as AIModule[],
    features: [
      ...FEATURES_BY_MODULE.ESSENTIAL,
      ...FEATURES_BY_MODULE.SALES_PRO,
      ...FEATURES_BY_MODULE.PREDICTIVE,
      ...FEATURES_BY_MODULE.ELITE
    ],
    limits: {
      messages: 150000,
      tokens: 1000000,
      instances: 5
    }
  },
  NINJA: {
    name: 'NINJA',
    price: 1997,
    modules: ['ESSENTIAL', 'SALES_PRO', 'PREDICTIVE', 'ELITE', 'NINJA'] as AIModule[],
    features: Object.keys(FEATURES) as FeatureKey[],
    limits: {
      messages: -1, // Ilimitado
      tokens: -1,   // Ilimitado
      instances: -1 // Ilimitado
    }
  }
};

// =============================================================================
// FUNÇÕES UTILITÁRIAS
// =============================================================================

/**
 * Verifica se uma feature pertence a um módulo
 */
export function isFeatureInModule(feature: FeatureKey, module: AIModule): boolean {
  return FEATURES[feature]?.module === module;
}

/**
 * Retorna todas as features de uma lista de módulos
 */
export function getFeaturesForModules(modules: AIModule[]): FeatureKey[] {
  const features: FeatureKey[] = [];
  for (const module of modules) {
    features.push(...(FEATURES_BY_MODULE[module] || []));
  }
  return [...new Set(features)]; // Remove duplicatas
}

/**
 * Verifica se um merchant tem acesso a uma feature específica
 */
export async function hasFeatureAccess(
  merchantModules: AIModule[],
  feature: FeatureKey
): Promise<boolean> {
  const requiredModule = FEATURE_TO_MODULE[feature];
  if (!requiredModule) return false;
  
  // Módulos são hierárquicos: NINJA > ELITE > PREDICTIVE > SALES_PRO > ESSENTIAL
  const moduleHierarchy: AIModule[] = ['ESSENTIAL', 'SALES_PRO', 'PREDICTIVE', 'ELITE', 'NINJA'];
  const requiredIndex = moduleHierarchy.indexOf(requiredModule);
  
  // Se tem o módulo ou um superior, tem acesso
  return merchantModules.some(m => {
    const moduleIndex = moduleHierarchy.indexOf(m);
    return moduleIndex >= requiredIndex;
  });
}

export default {
  FEATURES,
  FEATURE_TO_MODULE,
  FEATURES_BY_MODULE,
  DEFAULT_PLANS,
  isFeatureInModule,
  getFeaturesForModules,
  hasFeatureAccess
};
