/**
 * PÁGINA DE GERENCIAMENTO DE FEATURES POR PLANO - SaaSWPP AI
 * 
 * Interface para Admin ativar/desativar features e módulos em cada plano
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Check, 
  X, 
  Package, 
  Zap, 
  Shield, 
  Crown,
  RefreshCw,
  Save,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle
} from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

interface Feature {
  key: string;
  name: string;
  description: string;
  module: string;
}

interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  type: string;
  featureConfig?: {
    features: Record<string, boolean>;
    modules: Record<string, boolean>;
    maxMessages: number;
    maxTokens: number;
    maxInstances: number;
    maxStudyGroups: number;
  };
}

interface FeaturesData {
  features: Record<string, Feature>;
  byModule: Record<string, string[]>;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export const AdminFeaturesPage: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [featuresData, setFeaturesData] = useState<FeaturesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'features' | 'modules' | 'limits'>('features');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [plansRes, featuresRes] = await Promise.all([
        fetch('/api/auto-setup/admin/plans'),
        fetch('/api/auto-setup/admin/features')
      ]);
      
      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData);
      }
      
      if (featuresRes.ok) {
        const featuresData = await featuresRes.json();
        setFeaturesData(featuresData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle feature
  const toggleFeature = async (planId: string, featureKey: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/auto-setup/admin/plans/${planId}/features/${featureKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      
      if (res.ok) {
        // Atualizar estado local
        setPlans(plans.map(p => {
          if (p.id === planId && p.featureConfig) {
            return {
              ...p,
              featureConfig: {
                ...p.featureConfig,
                features: {
                  ...p.featureConfig.features,
                  [featureKey]: enabled
                }
              }
            };
          }
          return p;
        }));
      }
    } catch (error) {
      console.error('Erro ao atualizar feature:', error);
    }
  };

  // Toggle módulo
  const toggleModule = async (planId: string, module: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/auto-setup/admin/plans/${planId}/modules/${module}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      
      if (res.ok) {
        setPlans(plans.map(p => {
          if (p.id === planId && p.featureConfig) {
            return {
              ...p,
              featureConfig: {
                ...p.featureConfig,
                modules: {
                  ...p.featureConfig.modules,
                  [module]: enabled
                }
              }
            };
          }
          return p;
        }));
      }
    } catch (error) {
      console.error('Erro ao atualizar módulo:', error);
    }
  };

  // Salvar limites
  const saveLimits = async (planId: string, limits: any) => {
    try {
      setSaving(true);
      
      const res = await fetch(`/api/auto-setup/admin/plans/${planId}/features`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          features: plans.find(p => p.id === planId)?.featureConfig?.features || {},
          modules: plans.find(p => p.id === planId)?.featureConfig?.modules || {},
          limits
        })
      });
      
      if (res.ok) {
        setMessage({ type: 'success', text: 'Limites atualizados!' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar limites' });
    } finally {
      setSaving(false);
    }
  };

  // Ativar/desativar todas as features de um módulo
  const toggleAllModuleFeatures = (planId: string, module: string, enabled: boolean) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan?.featureConfig || !featuresData) return;
    
    const moduleFeatures = featuresData.byModule[module] || [];
    const newFeatures = { ...plan.featureConfig.features };
    
    moduleFeatures.forEach(featureKey => {
      newFeatures[featureKey] = enabled;
    });
    
    // Atualizar no backend
    fetch(`/api/auto-setup/admin/plans/${planId}/features`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        features: newFeatures,
        modules: plan.featureConfig.modules,
        limits: {
          maxMessages: plan.featureConfig.maxMessages,
          maxTokens: plan.featureConfig.maxTokens,
          maxInstances: plan.featureConfig.maxInstances,
          maxStudyGroups: plan.featureConfig.maxStudyGroups
        }
      })
    }).then(() => loadData());
  };

  // Ícone do módulo
  const getModuleIcon = (module: string) => {
    const icons: Record<string, any> = {
      ESSENTIAL: Package,
      SALES_PRO: Zap,
      PREDICTIVE: RefreshCw,
      ELITE: Shield,
      NINJA: Crown
    };
    return icons[module] || Package;
  };

  // Cor do módulo
  const getModuleColor = (module: string) => {
    const colors: Record<string, string> = {
      ESSENTIAL: 'text-gray-600 bg-gray-100',
      SALES_PRO: 'text-blue-600 bg-blue-100',
      PREDICTIVE: 'text-purple-600 bg-purple-100',
      ELITE: 'text-amber-600 bg-amber-100',
      NINJA: 'text-red-600 bg-red-100'
    };
    return colors[module] || 'text-gray-600 bg-gray-100';
  };

  // Cor do plano
  const getPlanColor = (name: string) => {
    const colors: Record<string, string> = {
      START: 'border-gray-300',
      PRO: 'border-blue-400',
      ENTERPRISE: 'border-purple-400',
      ELITE: 'border-amber-400',
      NINJA: 'border-red-400'
    };
    return colors[name?.toUpperCase()] || 'border-gray-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-7 h-7 text-blue-600" />
            Gerenciar Features por Plano
          </h1>
          <p className="text-gray-500 mt-1">
            Configure quais features estão disponíveis em cada plano de assinatura
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Mensagem */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Lista de Planos */}
      <div className="space-y-4">
        {plans.map((plan) => (
          <div 
            key={plan.id} 
            className={`bg-white rounded-xl border-2 ${getPlanColor(plan.name)} overflow-hidden`}
          >
            {/* Header do Plano */}
            <div 
              className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${getPlanColor(plan.name).replace('border', 'bg').replace('-400', '-100')}`}>
                  {React.createElement(getModuleIcon(
                    plan.name === 'START' ? 'ESSENTIAL' :
                    plan.name === 'PRO' ? 'SALES_PRO' :
                    plan.name === 'ENTERPRISE' ? 'PREDICTIVE' :
                    plan.name === 'ELITE' ? 'ELITE' : 'NINJA'
                  ), { className: 'w-6 h-6' })}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{plan.name}</h2>
                  <p className="text-gray-500">{plan.description || 'Plano de assinatura'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    R$ {plan.price.toLocaleString('pt-BR')}
                  </p>
                  <p className="text-sm text-gray-500">/mês</p>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {plan.featureConfig && (
                    <>
                      <span>{Object.values(plan.featureConfig.features).filter(Boolean).length} features</span>
                      <span>•</span>
                      <span>{Object.values(plan.featureConfig.modules).filter(Boolean).length} módulos</span>
                    </>
                  )}
                </div>
                
                {expandedPlan === plan.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {/* Conteúdo Expandido */}
            {expandedPlan === plan.id && plan.featureConfig && (
              <div className="border-t">
                {/* Tabs */}
                <div className="flex border-b bg-gray-50">
                  <button
                    onClick={() => setActiveTab('features')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === 'features'
                        ? 'border-blue-600 text-blue-600 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Features
                  </button>
                  <button
                    onClick={() => setActiveTab('modules')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === 'modules'
                        ? 'border-blue-600 text-blue-600 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Módulos
                  </button>
                  <button
                    onClick={() => setActiveTab('limits')}
                    className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                      activeTab === 'limits'
                        ? 'border-blue-600 text-blue-600 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Limites
                  </button>
                </div>

                <div className="p-6">
                  {/* Tab Features */}
                  {activeTab === 'features' && featuresData && (
                    <div className="space-y-6">
                      {Object.entries(featuresData.byModule).map(([module, featureKeys]) => (
                        <div key={module}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {React.createElement(getModuleIcon(module), { 
                                className: `w-5 h-5 ${getModuleColor(module).split(' ')[0]}` 
                              })}
                              <h3 className="font-semibold text-gray-900">{module}</h3>
                              <span className="text-sm text-gray-500">
                                ({featureKeys.filter(f => plan.featureConfig?.features[f]).length}/{featureKeys.length})
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => toggleAllModuleFeatures(plan.id, module, true)}
                                className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded"
                              >
                                Ativar todas
                              </button>
                              <button
                                onClick={() => toggleAllModuleFeatures(plan.id, module, false)}
                                className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                              >
                                Desativar todas
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {featureKeys.map(featureKey => {
                              const feature = featuresData.features[featureKey];
                              const isEnabled = plan.featureConfig?.features[featureKey] || false;
                              
                              return (
                                <div
                                  key={featureKey}
                                  onClick={() => toggleFeature(plan.id, featureKey, !isEnabled)}
                                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                                    isEnabled 
                                      ? 'border-green-300 bg-green-50 hover:bg-green-100' 
                                      : 'border-gray-200 bg-white hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className={`font-medium text-sm ${isEnabled ? 'text-green-800' : 'text-gray-700'}`}>
                                      {feature?.name || featureKey}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate">
                                      {feature?.description}
                                    </p>
                                  </div>
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                    isEnabled ? 'bg-green-500' : 'bg-gray-300'
                                  }`}>
                                    {isEnabled ? (
                                      <Check className="w-3 h-3 text-white" />
                                    ) : (
                                      <X className="w-3 h-3 text-white" />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab Módulos */}
                  {activeTab === 'modules' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {['ESSENTIAL', 'SALES_PRO', 'PREDICTIVE', 'ELITE', 'NINJA'].map(module => {
                        const isEnabled = plan.featureConfig?.modules?.[module] || false;
                        const ModuleIcon = getModuleIcon(module);
                        
                        return (
                          <div
                            key={module}
                            onClick={() => toggleModule(plan.id, module, !isEnabled)}
                            className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                              isEnabled 
                                ? `${getPlanColor(module)} bg-opacity-10` 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${getModuleColor(module)}`}>
                                  <ModuleIcon className="w-6 h-6" />
                                </div>
                                <div>
                                  <p className={`font-bold ${isEnabled ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {module}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {featuresData?.byModule[module]?.length || 0} features
                                  </p>
                                </div>
                              </div>
                              <div className={`w-10 h-6 rounded-full flex items-center transition-colors ${
                                isEnabled ? 'bg-green-500' : 'bg-gray-300'
                              }`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                  isEnabled ? 'translate-x-5' : 'translate-x-1'
                                }`} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Tab Limites */}
                  {activeTab === 'limits' && (
                    <div className="max-w-xl space-y-4">
                      <LimitsEditor 
                        plan={plan} 
                        onSave={(limits) => saveLimits(plan.id, limits)}
                        saving={saving}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 rounded-xl p-6">
        <div className="flex gap-3">
          <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900">Como funciona</h3>
            <ul className="mt-2 text-sm text-blue-800 space-y-1">
              <li>• <strong>Módulos</strong> são pacotes de features. Ativar um módulo ativa todas as features dele.</li>
              <li>• <strong>Features</strong> individuais podem ser ativadas/desativadas independentemente.</li>
              <li>• <strong>Limites</strong> definem o máximo de mensagens, tokens, instâncias e grupos de estudo.</li>
              <li>• Revendedores podem ter restrições adicionais por módulos permitidos.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// COMPONENTE DE EDIÇÃO DE LIMITES
// =============================================================================

const LimitsEditor: React.FC<{
  plan: Plan;
  onSave: (limits: any) => void;
  saving: boolean;
}> = ({ plan, onSave, saving }) => {
  const [limits, setLimits] = useState({
    maxMessages: plan.featureConfig?.maxMessages || 5000,
    maxTokens: plan.featureConfig?.maxTokens || 50000,
    maxInstances: plan.featureConfig?.maxInstances || 1,
    maxStudyGroups: plan.featureConfig?.maxStudyGroups || 1
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Máximo de Mensagens/mês
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={limits.maxMessages}
            onChange={(e) => setLimits({ ...limits, maxMessages: parseInt(e.target.value) || 0 })}
            className="w-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-500">(-1 para ilimitado)</span>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Máximo de Tokens/mês
        </label>
        <input
          type="number"
          value={limits.maxTokens}
          onChange={(e) => setLimits({ ...limits, maxTokens: parseInt(e.target.value) || 0 })}
          className="w-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Máximo de Instâncias WhatsApp
        </label>
        <input
          type="number"
          value={limits.maxInstances}
          onChange={(e) => setLimits({ ...limits, maxInstances: parseInt(e.target.value) || 0 })}
          className="w-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Máximo de Grupos para Estudo
        </label>
        <input
          type="number"
          value={limits.maxStudyGroups}
          onChange={(e) => setLimits({ ...limits, maxStudyGroups: parseInt(e.target.value) || 0 })}
          className="w-32 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <button
        onClick={() => onSave(limits)}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : (
          <Save className="w-4 h-4" />
        )}
        Salvar Limites
      </button>
    </div>
  );
};

export default AdminFeaturesPage;
