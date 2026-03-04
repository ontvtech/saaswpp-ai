/**
 * PÁGINA DE GERENCIAMENTO DE PLANOS E FEATURES - Admin
 * Permite configurar quais features estão incluídas em cada plano
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, Crown, Check, X, ChevronDown, ChevronUp, 
  Zap, TrendingUp, Brain, Shield, Sparkles, Save, RefreshCw
} from 'lucide-react';

// Tipos
type AIModule = 'ESSENTIAL' | 'SALES_PRO' | 'PREDICTIVE' | 'ELITE' | 'NINJA';

interface FeatureConfig {
  key: string;
  name: string;
  description: string;
  module: AIModule;
}

interface PlanConfig {
  name: string;
  price: number;
  modules: AIModule[];
  features: string[];
  limits: {
    messages: number;
    tokens: number;
    instances: number;
  };
}

// Dados das Features
const FEATURES: Record<string, FeatureConfig> = {
  // ESSENTIAL
  WHATSAPP_CONNECT: { key: 'WHATSAPP_CONNECT', name: 'Conexão WhatsApp', description: 'Conectar via QR Code', module: 'ESSENTIAL' },
  AI_ATTENDANT: { key: 'AI_ATTENDANT', name: 'Atendente IA 24h', description: 'Respostas automáticas', module: 'ESSENTIAL' },
  KNOWLEDGE_BASE: { key: 'KNOWLEDGE_BASE', name: 'Base de Conhecimento', description: 'Textos e PDFs', module: 'ESSENTIAL' },
  BASIC_REPORTS: { key: 'BASIC_REPORTS', name: 'Relatórios Básicos', description: 'Métricas de atendimento', module: 'ESSENTIAL' },
  INTERACTIVE_MESSAGES: { key: 'INTERACTIVE_MESSAGES', name: 'Mensagens Interativas', description: 'Botões e listas', module: 'ESSENTIAL' },
  DYNAMIC_TEMPLATES: { key: 'DYNAMIC_TEMPLATES', name: 'Templates Dinâmicos', description: 'Variáveis personalizáveis', module: 'ESSENTIAL' },
  AUTO_REPORTS_EMAIL: { key: 'AUTO_REPORTS_EMAIL', name: 'Relatórios por Email', description: 'Resumos automáticos', module: 'ESSENTIAL' },
  KEYWORD_ANALYSIS: { key: 'KEYWORD_ANALYSIS', name: 'Análise de Palavras', description: 'Intenções frequentes', module: 'ESSENTIAL' },
  HEATMAP_HOURS: { key: 'HEATMAP_HOURS', name: 'Heatmap de Horários', description: 'Picos de atendimento', module: 'ESSENTIAL' },

  // SALES_PRO
  MEDIA_SENDING: { key: 'MEDIA_SENDING', name: 'Envio de Mídia', description: 'Imagens, vídeos, PDFs', module: 'SALES_PRO' },
  PRODUCT_CATALOG: { key: 'PRODUCT_CATALOG', name: 'Catálogo de Produtos', description: 'Cadastro com fotos', module: 'SALES_PRO' },
  PRICE_QUOTES: { key: 'PRICE_QUOTES', name: 'Orçamentos Automáticos', description: 'Propostas personalizadas', module: 'SALES_PRO' },
  ROI_DASHBOARD: { key: 'ROI_DASHBOARD', name: 'Dashboard de ROI', description: 'Vendas geradas', module: 'SALES_PRO' },
  CALENDAR_SYNC: { key: 'CALENDAR_SYNC', name: 'Sincronização Calendário', description: 'Google/Outlook', module: 'SALES_PRO' },
  APPOINTMENT_MANAGEMENT: { key: 'APPOINTMENT_MANAGEMENT', name: 'Gestão de Agendamentos', description: 'Horários e confirmações', module: 'SALES_PRO' },
  PERFORMANCE_RANKING: { key: 'PERFORMANCE_RANKING', name: 'Ranking de Performance', description: 'Comparativo', module: 'SALES_PRO' },

  // PREDICTIVE
  SENTIMENT_ANALYSIS: { key: 'SENTIMENT_ANALYSIS', name: 'Análise de Sentimento', description: 'Clientes insatisfeitos', module: 'PREDICTIVE' },
  AUTO_TRIGGERS: { key: 'AUTO_TRIGGERS', name: 'Gatilhos Automáticos', description: 'Ações por evento', module: 'PREDICTIVE' },
  DRIP_CAMPAIGNS: { key: 'DRIP_CAMPAIGNS', name: 'Sequências de Mensagens', description: 'Nutrição de leads', module: 'PREDICTIVE' },
  LOYALTY_PROGRAM: { key: 'LOYALTY_PROGRAM', name: 'Programa de Fidelidade', description: 'Pontos e recompensas', module: 'PREDICTIVE' },
  ABANDONED_CART: { key: 'ABANDONED_CART', name: 'Recuperação de Carrinho', description: 'Vendas perdidas', module: 'PREDICTIVE' },
  CLIENT_REACTIVATION: { key: 'CLIENT_REACTIVATION', name: 'Reativação de Clientes', description: 'Clientes inativos', module: 'PREDICTIVE' },

  // ELITE
  LONG_TERM_MEMORY: { key: 'LONG_TERM_MEMORY', name: 'Memória de Longo Prazo', description: 'Histórico completo', module: 'ELITE' },
  FLOW_BUILDER: { key: 'FLOW_BUILDER', name: 'Builder de Fluxos', description: 'No-code visual', module: 'ELITE' },
  CRM_INTEGRATION: { key: 'CRM_INTEGRATION', name: 'Integração CRMs', description: 'HubSpot, Pipedrive', module: 'ELITE' },
  ECOMMERCE_INTEGRATION: { key: 'ECOMMERCE_INTEGRATION', name: 'Integração E-commerce', description: 'Shopify, WooCommerce', module: 'ELITE' },
  WEBHOOKS_ZAPIER: { key: 'WEBHOOKS_ZAPIER', name: 'Webhooks/Zapier', description: 'Integrações custom', module: 'ELITE' },
  INSTAGRAM_MESSENGER: { key: 'INSTAGRAM_MESSENGER', name: 'Instagram + Messenger', description: 'Multicanal', module: 'ELITE' },
  HUMAN_SUGGESTIONS: { key: 'HUMAN_SUGGESTIONS', name: 'Sugestões para Humano', description: 'Assistência ao atendente', module: 'ELITE' },
  FEW_SHOT_TRAINING: { key: 'FEW_SHOT_TRAINING', name: 'Treinamento por Exemplo', description: 'Conversas reais', module: 'ELITE' },

  // NINJA
  AUTONOMOUS_AGENTS: { key: 'AUTONOMOUS_AGENTS', name: 'Agentes Autônomos', description: 'IA executa ações', module: 'NINJA' },
  VOICE_RESPONSES_TTS: { key: 'VOICE_RESPONSES_TTS', name: 'Respostas de Voz', description: 'Áudio natural (TTS)', module: 'NINJA' },
  PUBLIC_API: { key: 'PUBLIC_API', name: 'API Pública', description: 'Para desenvolvedores', module: 'NINJA' },
  PIX_PAYMENTS: { key: 'PIX_PAYMENTS', name: 'Pagamentos PIX', description: 'Gerar e processar', module: 'NINJA' },
  ORDER_PROCESSING: { key: 'ORDER_PROCESSING', name: 'Processamento de Pedidos', description: 'Pedidos completos', module: 'NINJA' },
  WHITE_LABEL: { key: 'WHITE_LABEL', name: 'White Label', description: 'Marca própria', module: 'NINJA' },
  DEDICATED_SUPPORT: { key: 'DEDICATED_SUPPORT', name: 'Suporte Dedicado', description: 'Gerente de conta', module: 'NINJA' },
};

// Features por módulo
const FEATURES_BY_MODULE: Record<AIModule, string[]> = {
  ESSENTIAL: ['WHATSAPP_CONNECT', 'AI_ATTENDANT', 'KNOWLEDGE_BASE', 'BASIC_REPORTS', 'INTERACTIVE_MESSAGES', 'DYNAMIC_TEMPLATES', 'AUTO_REPORTS_EMAIL', 'KEYWORD_ANALYSIS', 'HEATMAP_HOURS'],
  SALES_PRO: ['MEDIA_SENDING', 'PRODUCT_CATALOG', 'PRICE_QUOTES', 'ROI_DASHBOARD', 'CALENDAR_SYNC', 'APPOINTMENT_MANAGEMENT', 'PERFORMANCE_RANKING'],
  PREDICTIVE: ['SENTIMENT_ANALYSIS', 'AUTO_TRIGGERS', 'DRIP_CAMPAIGNS', 'LOYALTY_PROGRAM', 'ABANDONED_CART', 'CLIENT_REACTIVATION'],
  ELITE: ['LONG_TERM_MEMORY', 'FLOW_BUILDER', 'CRM_INTEGRATION', 'ECOMMERCE_INTEGRATION', 'WEBHOOKS_ZAPIER', 'INSTAGRAM_MESSENGER', 'HUMAN_SUGGESTIONS', 'FEW_SHOT_TRAINING'],
  NINJA: ['AUTONOMOUS_AGENTS', 'VOICE_RESPONSES_TTS', 'PUBLIC_API', 'PIX_PAYMENTS', 'ORDER_PROCESSING', 'WHITE_LABEL', 'DEDICATED_SUPPORT'],
};

// Configuração dos planos
const DEFAULT_PLANS: Record<string, PlanConfig> = {
  START: {
    name: 'START',
    price: 97,
    modules: ['ESSENTIAL'],
    features: FEATURES_BY_MODULE.ESSENTIAL,
    limits: { messages: 5000, tokens: 50000, instances: 1 }
  },
  PRO: {
    name: 'PRO',
    price: 247,
    modules: ['ESSENTIAL', 'SALES_PRO'],
    features: [...FEATURES_BY_MODULE.ESSENTIAL, ...FEATURES_BY_MODULE.SALES_PRO],
    limits: { messages: 20000, tokens: 150000, instances: 1 }
  },
  ENTERPRISE: {
    name: 'ENTERPRISE',
    price: 497,
    modules: ['ESSENTIAL', 'SALES_PRO', 'PREDICTIVE'],
    features: [...FEATURES_BY_MODULE.ESSENTIAL, ...FEATURES_BY_MODULE.SALES_PRO, ...FEATURES_BY_MODULE.PREDICTIVE],
    limits: { messages: 50000, tokens: 300000, instances: 2 }
  },
  ELITE: {
    name: 'ELITE',
    price: 997,
    modules: ['ESSENTIAL', 'SALES_PRO', 'PREDICTIVE', 'ELITE'],
    features: [...FEATURES_BY_MODULE.ESSENTIAL, ...FEATURES_BY_MODULE.SALES_PRO, ...FEATURES_BY_MODULE.PREDICTIVE, ...FEATURES_BY_MODULE.ELITE],
    limits: { messages: 150000, tokens: 1000000, instances: 5 }
  },
  NINJA: {
    name: 'NINJA',
    price: 1997,
    modules: ['ESSENTIAL', 'SALES_PRO', 'PREDICTIVE', 'ELITE', 'NINJA'],
    features: Object.keys(FEATURES),
    limits: { messages: -1, tokens: -1, instances: -1 }
  },
};

// Cores dos módulos
const MODULE_COLORS: Record<AIModule, { bg: string; text: string; border: string }> = {
  ESSENTIAL: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  SALES_PRO: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
  PREDICTIVE: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' },
  ELITE: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
  NINJA: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
};

const MODULE_ICONS: Record<AIModule, React.ReactNode> = {
  ESSENTIAL: <Zap className="w-4 h-4" />,
  SALES_PRO: <TrendingUp className="w-4 h-4" />,
  PREDICTIVE: <Brain className="w-4 h-4" />,
  ELITE: <Crown className="w-4 h-4" />,
  NINJA: <Sparkles className="w-4 h-4" />,
};

export const AdminPlansFeatures: React.FC = () => {
  const [plans, setPlans] = useState<Record<string, PlanConfig>>(DEFAULT_PLANS);
  const [expandedModule, setExpandedModule] = useState<AIModule | null>('ESSENTIAL');
  const [selectedPlan, setSelectedPlan] = useState<string>('START');
  const [hasChanges, setHasChanges] = useState(false);

  const toggleFeature = (planName: string, featureKey: string) => {
    setPlans(prev => {
      const plan = prev[planName];
      const hasFeature = plan.features.includes(featureKey);
      
      return {
        ...prev,
        [planName]: {
          ...plan,
          features: hasFeature 
            ? plan.features.filter(f => f !== featureKey)
            : [...plan.features, featureKey]
        }
      };
    });
    setHasChanges(true);
  };

  const toggleModule = (planName: string, moduleName: AIModule) => {
    setPlans(prev => {
      const plan = prev[planName];
      const hasModule = plan.modules.includes(moduleName);
      const moduleFeatures = FEATURES_BY_MODULE[moduleName];
      
      return {
        ...prev,
        [planName]: {
          ...plan,
          modules: hasModule 
            ? plan.modules.filter(m => m !== moduleName)
            : [...plan.modules, moduleName],
          features: hasModule
            ? plan.features.filter(f => !moduleFeatures.includes(f))
            : [...new Set([...plan.features, ...moduleFeatures])]
        }
      };
    });
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Aqui salvaria no backend
    console.log('Salvando configuração:', plans);
    setHasChanges(false);
    alert('Configuração salva com sucesso!');
  };

  const plan = plans[selectedPlan];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Planos e Features</h1>
            <p className="text-muted-foreground mt-1">
              Configure quais funcionalidades estão disponíveis em cada plano
            </p>
          </div>
          
          {hasChanges && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleSave}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-lg hover:scale-105 transition-transform"
            >
              <Save className="w-5 h-5" />
              Salvar Alterações
            </motion.button>
          )}
        </div>

        {/* Seletor de Plano */}
        <div className="flex gap-4 mb-8">
          {Object.keys(plans).map(planName => (
            <button
              key={planName}
              onClick={() => setSelectedPlan(planName)}
              className={`px-6 py-4 rounded-xl border-2 transition-all ${
                selectedPlan === planName
                  ? 'border-primary bg-primary/5 shadow-lg'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="text-sm font-medium text-muted-foreground">{planName}</div>
              <div className="text-2xl font-bold">R$ {plans[planName].price}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {plans[planName].features.length} features
              </div>
            </button>
          ))}
        </div>

        {/* Grid de Módulos e Features */}
        <div className="space-y-6">
          {(['ESSENTIAL', 'SALES_PRO', 'PREDICTIVE', 'ELITE', 'NINJA'] as AIModule[]).map(moduleName => {
            const colors = MODULE_COLORS[moduleName];
            const moduleFeatures = FEATURES_BY_MODULE[moduleName];
            const isExpanded = expandedModule === moduleName;
            const hasModule = plan.modules.includes(moduleName);
            const activeFeatures = moduleFeatures.filter(f => plan.features.includes(f)).length;

            return (
              <motion.div
                key={moduleName}
                className={`rounded-2xl border-2 ${colors.border} ${colors.bg} overflow-hidden`}
                layout
              >
                {/* Header do Módulo */}
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setExpandedModule(isExpanded ? null : moduleName)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${colors.text} bg-white flex items-center justify-center shadow-sm`}>
                      {MODULE_ICONS[moduleName]}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{moduleName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {activeFeatures} de {moduleFeatures.length} features ativas
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {/* Toggle do Módulo */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleModule(selectedPlan, moduleName);
                      }}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        hasModule
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-white text-muted-foreground border border-border'
                      }`}
                    >
                      {hasModule ? 'Incluído' : 'Adicionar'}
                    </button>
                    
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {/* Features do Módulo */}
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border/50 bg-white/50 p-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {moduleFeatures.map(featureKey => {
                        const feature = FEATURES[featureKey];
                        const isActive = plan.features.includes(featureKey);

                        return (
                          <div
                            key={featureKey}
                            onClick={() => toggleFeature(selectedPlan, featureKey)}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                              isActive
                                ? `${colors.border} ${colors.bg}`
                                : 'border-border/50 bg-white hover:border-primary/30'
                            }`}
                          >
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                              isActive 
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}>
                              {isActive ? <Check className="w-4 h-4" /> : <X className="w-4 h-4 text-muted-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{feature.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{feature.description}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Limites do Plano */}
        <div className="mt-8 p-6 rounded-2xl border border-border bg-muted/20">
          <h3 className="font-bold text-lg mb-4">Limites do Plano {selectedPlan}</h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="text-sm text-muted-foreground">Mensagens/mês</label>
              <input
                type="number"
                value={plan.limits.messages === -1 ? '' : plan.limits.messages}
                placeholder="Ilimitado"
                onChange={(e) => {
                  setPlans(prev => ({
                    ...prev,
                    [selectedPlan]: {
                      ...prev[selectedPlan],
                      limits: { ...prev[selectedPlan].limits, messages: parseInt(e.target.value) || -1 }
                    }
                  }));
                  setHasChanges(true);
                }}
                className="w-full mt-1 px-4 py-2 rounded-lg border border-border bg-background"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Tokens/mês</label>
              <input
                type="number"
                value={plan.limits.tokens === -1 ? '' : plan.limits.tokens}
                placeholder="Ilimitado"
                onChange={(e) => {
                  setPlans(prev => ({
                    ...prev,
                    [selectedPlan]: {
                      ...prev[selectedPlan],
                      limits: { ...prev[selectedPlan].limits, tokens: parseInt(e.target.value) || -1 }
                    }
                  }));
                  setHasChanges(true);
                }}
                className="w-full mt-1 px-4 py-2 rounded-lg border border-border bg-background"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Instâncias WhatsApp</label>
              <input
                type="number"
                value={plan.limits.instances === -1 ? '' : plan.limits.instances}
                placeholder="Ilimitado"
                onChange={(e) => {
                  setPlans(prev => ({
                    ...prev,
                    [selectedPlan]: {
                      ...prev[selectedPlan],
                      limits: { ...prev[selectedPlan].limits, instances: parseInt(e.target.value) || -1 }
                    }
                  }));
                  setHasChanges(true);
                }}
                className="w-full mt-1 px-4 py-2 rounded-lg border border-border bg-background"
              />
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="mt-8 p-6 rounded-2xl bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Plano {selectedPlan}</h3>
              <p className="text-muted-foreground">
                {plan.features.length} features ativas em {plan.modules.length} módulos
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">R$ {plan.price}</div>
              <div className="text-sm text-muted-foreground">/mês</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPlansFeatures;
