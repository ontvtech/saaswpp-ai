import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Zap, MessageSquare, Store, Crown, Sparkles, Shield, TrendingUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Modal } from '../components/Modal';
import { Toast, ToastType } from '../components/Toast';
import type { AIModule, PlanModules, PlanType } from '../types';

// =============================================================================
// CONFIGURAÇÃO DE MÓDULOS
// =============================================================================

const MODULE_CONFIG: Record<AIModule, { name: string; description: string; icon: React.ReactNode; color: string }> = {
  ESSENTIAL: {
    name: 'Atendimento & Agenda',
    description: 'Respostas a dúvidas e triangulação de agenda.',
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'blue'
  },
  SALES_PRO: {
    name: 'Módulo de Vendas',
    description: 'Links de pagamento, catálogo e indução ao fechamento.',
    icon: <TrendingUp className="w-4 h-4" />,
    color: 'emerald'
  },
  PREDICTIVE: {
    name: 'Caçador Preditivo',
    description: 'Abordagem ativa de clientes frios e aniversariantes.',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'purple'
  },
  ELITE: {
    name: 'Piloto Automático',
    description: 'IA identifica nicho e serviços automaticamente sem configuração.',
    icon: <Crown className="w-4 h-4" />,
    color: 'amber'
  }
};

const COLOR_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/30' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500/30' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' }
};

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export const PlansPage: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const { token } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // Form State - Usando tipos padronizados
  const [formData, setFormData] = useState<{
    name: string;
    price: string;
    type: PlanType;
    maxTenants: number;
    maxInstances: number;
    maxMessages: number;
    description: string;
    modules: PlanModules;
  }>({
    name: '',
    price: '',
    type: 'MERCHANT',
    maxTenants: 0,
    maxInstances: 1,
    maxMessages: 1000,
    description: '',
    modules: {
      ESSENTIAL: true,
      SALES_PRO: false,
      PREDICTIVE: false,
      ELITE: false
    }
  });

  useEffect(() => {
    fetchPlans();
  }, [token]);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/plans', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPlans(data);
        } else {
          setDefaultPlans();
        }
      } else {
        setDefaultPlans();
      }
    } catch (e) {
      console.error(e);
      setDefaultPlans();
    }
  };

  const setDefaultPlans = () => {
    setPlans([
      { 
        id: '1', 
        name: 'Básico', 
        price: 97.00, 
        type: 'MERCHANT', 
        instanceLimit: 1, 
        maxMessages: 1000, 
        description: 'Ideal para começar', 
        modules: { ESSENTIAL: true, SALES_PRO: false, PREDICTIVE: false, ELITE: false } 
      },
      { 
        id: '2', 
        name: 'Pro', 
        price: 197.00, 
        type: 'MERCHANT', 
        instanceLimit: 3, 
        maxMessages: 5000, 
        description: 'Para negócios em crescimento', 
        modules: { ESSENTIAL: true, SALES_PRO: true, PREDICTIVE: false, ELITE: false } 
      },
      { 
        id: '3', 
        name: 'Enterprise', 
        price: 297.00, 
        type: 'MERCHANT', 
        instanceLimit: 5, 
        maxMessages: 10000, 
        description: 'Automação avançada com Preditivo', 
        modules: { ESSENTIAL: true, SALES_PRO: true, PREDICTIVE: true, ELITE: false } 
      },
      { 
        id: '4', 
        name: 'Elite AI', 
        price: 497.00, 
        type: 'MERCHANT', 
        instanceLimit: 10, 
        maxMessages: 25000, 
        description: 'Automação total com Piloto Automático', 
        modules: { ESSENTIAL: true, SALES_PRO: true, PREDICTIVE: true, ELITE: true } 
      },
      { 
        id: '5', 
        name: 'Revenda Start', 
        price: 497.00, 
        type: 'RESELLER', 
        maxTenants: 10, 
        description: 'Comece sua própria SaaS',
        modules: { ESSENTIAL: true, SALES_PRO: true, PREDICTIVE: false, ELITE: false }
      },
      { 
        id: '6', 
        name: 'Revenda Pro', 
        price: 997.00, 
        type: 'RESELLER', 
        maxTenants: 50, 
        description: 'Escale sua operação de revenda',
        modules: { ESSENTIAL: true, SALES_PRO: true, PREDICTIVE: true, ELITE: true }
      }
    ]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans';
      const method = editingPlan ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          name: formData.name,
          price: Number(formData.price),
          description: formData.description,
          type: formData.type,
          maxTenants: formData.maxTenants,
          maxMessages: formData.maxMessages,
          modules: formData.modules,
          tokenLimit: formData.maxMessages * 10,
          instanceLimit: formData.maxInstances,
        })
      });

      if (res.ok) {
        setToast({ message: `Plano ${editingPlan ? 'atualizado' : 'criado'} com sucesso!`, type: 'success' });
        fetchPlans();
        setIsModalOpen(false);
        setEditingPlan(null);
        resetForm();
      } else {
        throw new Error('API Error');
      }
    } catch (e) {
      setToast({ message: 'Erro ao salvar plano.', type: 'error' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      type: 'MERCHANT',
      maxTenants: 0,
      maxInstances: 1,
      maxMessages: 1000,
      description: '',
      modules: { ESSENTIAL: true, SALES_PRO: false, PREDICTIVE: false, ELITE: false }
    });
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      price: plan.price.toString(),
      type: plan.type,
      maxTenants: plan.maxTenants || 0,
      maxInstances: plan.instanceLimit || 1,
      maxMessages: plan.maxMessages || 1000,
      description: plan.description || '',
      modules: plan.modules || { ESSENTIAL: true, SALES_PRO: false, PREDICTIVE: false, ELITE: false }
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este plano?')) {
      try {
        const res = await fetch(`/api/admin/plans/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setToast({ message: 'Plano excluído.', type: 'info' });
          fetchPlans();
        }
      } catch (e) {
        setToast({ message: 'Erro ao excluir plano.', type: 'error' });
      }
    }
  };

  const handleModuleToggle = (module: AIModule) => {
    // ESSENTIAL é sempre obrigatório
    if (module === 'ESSENTIAL') return;
    
    setFormData(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [module]: !prev.modules[module]
      }
    }));
  };

  const renderModuleBadge = (module: AIModule, isActive: boolean) => {
    const config = MODULE_CONFIG[module];
    const colors = COLOR_CLASSES[config.color];
    
    if (!isActive) return null;
    
    return (
      <span 
        key={module}
        className={`px-2 py-1 ${colors.bg} ${colors.text} text-[10px] font-bold rounded-lg flex items-center gap-1`}
      >
        {config.icon}
        {config.name}
      </span>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Planos & Preços</h2>
          <p className="text-muted-foreground">Gerencie os pacotes disponíveis para venda.</p>
        </div>
        <button 
          onClick={() => {
            setEditingPlan(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Novo Plano
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <MessageSquare className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{plans.filter(p => p.type === 'MERCHANT').length}</p>
              <p className="text-xs text-muted-foreground">Planos Lojista</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-xl">
              <Store className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{plans.filter(p => p.type === 'RESELLER').length}</p>
              <p className="text-xs text-muted-foreground">Planos Revenda</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                R$ {plans.reduce((sum, p) => sum + Number(p.price), 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-muted-foreground">Valor Total</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <Crown className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {plans.filter(p => p.modules?.ELITE).length}
              </p>
              <p className="text-xs text-muted-foreground">Com Elite AI</p>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Table */}
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-left min-w-[1000px]">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Plano</th>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Preço</th>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Recursos</th>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Módulos</th>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {plans.map(plan => (
              <tr key={plan.id} className="hover:bg-muted/20 transition-colors group">
                <td className="px-6 py-4">
                  <p className="font-bold text-sm">{plan.name}</p>
                  <p className="text-[10px] text-muted-foreground line-clamp-1 max-w-[200px]">{plan.description}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg inline-block ${plan.type === 'RESELLER' ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'}`}>
                    {plan.type === 'RESELLER' ? 'Revenda' : 'Lojista'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="font-black text-sm">R$ {Number(plan.price).toFixed(2)}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    {plan.type === 'RESELLER' ? (
                      <p className="text-[10px] flex items-center gap-1"><Store className="w-3 h-3" /> {plan.maxTenants} Lojistas</p>
                    ) : (
                      <>
                        <p className="text-[10px] flex items-center gap-1"><Zap className="w-3 h-3" /> {plan.instanceLimit} Conexões</p>
                        <p className="text-[10px] flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {plan.maxMessages?.toLocaleString()} Msg/mês</p>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1 flex-wrap max-w-[250px]">
                    {renderModuleBadge('ESSENTIAL', plan.modules?.ESSENTIAL)}
                    {renderModuleBadge('SALES_PRO', plan.modules?.SALES_PRO)}
                    {renderModuleBadge('PREDICTIVE', plan.modules?.PREDICTIVE)}
                    {renderModuleBadge('ELITE', plan.modules?.ELITE)}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(plan)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary transition-colors" title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(plan.id)} className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-destructive transition-colors" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Modal de Edição */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? "Editar Plano" : "Novo Plano"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome do Plano</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full p-2 rounded-lg border border-border bg-background" 
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Preço (R$)</label>
              <input 
                type="number" 
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
                className="w-full p-2 rounded-lg border border-border bg-background" 
                required 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tipo de Plano</label>
            <select 
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value as PlanType})}
              className="w-full p-2 rounded-lg border border-border bg-background"
            >
              <option value="MERCHANT">Lojista (Cliente Final)</option>
              <option value="RESELLER">Revendedor (White Label)</option>
            </select>
          </div>

          {formData.type === 'RESELLER' ? (
            <div>
              <label className="block text-sm font-medium mb-1">Máximo de Lojistas</label>
              <input 
                type="number" 
                value={formData.maxTenants}
                onChange={e => setFormData({...formData, maxTenants: Number(e.target.value)})}
                className="w-full p-2 rounded-lg border border-border bg-background" 
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Conexões WhatsApp</label>
                <input 
                  type="number" 
                  value={formData.maxInstances}
                  onChange={e => setFormData({...formData, maxInstances: Number(e.target.value)})}
                  className="w-full p-2 rounded-lg border border-border bg-background" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Limite Disparos/Mês</label>
                <input 
                  type="number" 
                  value={formData.maxMessages}
                  onChange={e => setFormData({...formData, maxMessages: Number(e.target.value)})}
                  className="w-full p-2 rounded-lg border border-border bg-background" 
                />
              </div>
            </div>
          )}

          {/* Módulos de IA */}
          <div className="space-y-3 pt-4 border-t border-border">
            <h4 className="font-bold text-sm">Módulos de IA Permitidos</h4>
            <div className="space-y-2">
              {(Object.keys(MODULE_CONFIG) as AIModule[]).map(module => {
                const config = MODULE_CONFIG[module];
                const colors = COLOR_CLASSES[config.color];
                const isActive = formData.modules[module];
                const isRequired = module === 'ESSENTIAL';
                
                return (
                  <label 
                    key={module}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isActive 
                        ? `${colors.bg} ${colors.border} border-2` 
                        : 'border-border bg-muted/20 hover:bg-muted/50'
                    } ${isRequired ? 'opacity-75' : ''}`}
                  >
                    <input 
                      type="checkbox" 
                      checked={isActive}
                      onChange={() => handleModuleToggle(module)}
                      disabled={isRequired}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <div className={`flex-1 ${isActive ? colors.text : ''}`}>
                      <p className="font-bold text-sm flex items-center gap-2">
                        {config.icon}
                        {config.name}
                        {isRequired && <span className="text-[8px] bg-muted px-1 rounded">OBRIGATÓRIO</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Descrição Curta</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full p-2 rounded-lg border border-border bg-background h-20" 
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
              {editingPlan ? 'Salvar Alterações' : 'Criar Plano'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
