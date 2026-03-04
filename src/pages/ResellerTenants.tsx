import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Modal } from '../components/Modal';
import { Toast, ToastType } from '../components/Toast';
import { 
  Store, 
  Plus, 
  Play, 
  Settings, 
  DollarSign, 
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Eye,
  Send,
  Calendar,
  ShieldAlert
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  email: string;
  plan?: { name: string; price: number };
  status: string;
  whatsappApiType: string;
  evolutionInstance?: string;
  metaPhoneNumberId?: string;
  subscriptionId?: string;
  trialEndsAt?: string;
  gracePeriodEndsAt?: string;
  activeModules?: string[];
  createdAt: string;
}

export const ResellerTenants: React.FC = () => {
  const { token, user, setImpersonation, fetchWithAuth } = useStore();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [creating, setCreating] = useState(false);
  
  const [newTenant, setNewTenant] = useState({
    name: '',
    email: '',
    plan: 'START',
    createMode: 'trial', // 'trial' ou 'direct'
    trialDays: 7,
    activeModules: ['ESSENTIAL'],
    whatsappApiType: 'EVOLUTION',
  });

  // Módulos permitidos para este revendedor
  const allowedModules = (user as any)?.allowedModules || ['ESSENTIAL'];
  
  // Planos de lojista (pré-definidos)
  const plans = [
    { id: 'START', name: 'START', price: 97, modules: ['ESSENTIAL'], maxMessages: 5000 },
    { id: 'PRO', name: 'PRO', price: 247, modules: ['ESSENTIAL', 'SALES_PRO'], maxMessages: 20000 },
    { id: 'TOP_AI', name: 'TOP AI', price: 497, modules: ['ESSENTIAL', 'SALES_PRO', 'PREDICTIVE', 'ELITE', 'NINJA'], maxMessages: 50000 },
  ];

  useEffect(() => {
    fetchTenants();
  }, [token]);

  const fetchTenants = async () => {
    try {
      const res = await fetchWithAuth('/api/reseller/tenants');
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      setTenants(data);
    } catch (e) {
      // Mock para dev
      if (import.meta.env.DEV) {
        setTenants([
          { id: '1', name: 'Oficina do Zé', email: 'ze@oficina.com', plan: { name: 'PRO', price: 247 }, status: 'active', whatsappApiType: 'EVOLUTION', evolutionInstance: 'ze-oficina', activeModules: ['ESSENTIAL', 'SALES_PRO'], createdAt: new Date().toISOString() },
          { id: '2', name: 'Pet Shop Auau', email: 'contato@auau.com', plan: { name: 'START', price: 97 }, status: 'trial', whatsappApiType: 'EVOLUTION', trialEndsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), activeModules: ['ESSENTIAL'], createdAt: new Date().toISOString() },
          { id: '3', name: 'Clínica Saúde', email: 'adm@clinica.com', plan: { name: 'TOP AI', price: 497 }, status: 'grace_period', whatsappApiType: 'META', metaPhoneNumberId: '123456', gracePeriodEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), activeModules: ['ESSENTIAL', 'SALES_PRO', 'PREDICTIVE', 'ELITE', 'NINJA'], createdAt: new Date().toISOString() },
        ]);
      }
      console.error('Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    
    try {
      const res = await fetchWithAuth('/api/reseller/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newTenant,
          activeModules: plans.find(p => p.id === newTenant.plan)?.modules || ['ESSENTIAL'],
        }),
      });

      if (res.ok) {
        const tenant = await res.json();
        setTenants([tenant, ...tenants]);
        setIsModalOpen(false);
        setNewTenant({
          name: '',
          email: '',
          plan: 'START',
          createMode: 'trial',
          trialDays: 7,
          activeModules: ['ESSENTIAL'],
          whatsappApiType: 'EVOLUTION',
        });
        setToast({ message: `Lojista criado com sucesso! ${newTenant.createMode === 'trial' ? 'Trial de ' + newTenant.trialDays + ' dias iniciado.' : 'Pagamento configurado.'}`, type: 'success' });
      } else {
        const err = await res.json();
        setToast({ message: err.error || 'Erro ao criar lojista', type: 'error' });
      }
    } catch (e) {
      setToast({ message: 'Erro de rede ao criar lojista', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleImpersonate = (tenantId: string) => {
    setImpersonation('merchant', tenantId);
    navigate('/');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
      active: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', label: 'Ativo' },
      trial: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'Trial' },
      grace_period: { bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'Grace Period' },
      suspended: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Suspenso' },
    };
    const style = styles[status] || styles.active;
    return (
      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Meus Lojistas</h2>
          <p className="text-muted-foreground">Gerencie seus clientes e acesse suas contas.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4" /> Novo Lojista
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black">{tenants.filter(t => t.status === 'active').length}</p>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black">{tenants.filter(t => t.status === 'trial').length}</p>
              <p className="text-xs text-muted-foreground">Em Trial</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black">{tenants.filter(t => t.status === 'grace_period').length}</p>
              <p className="text-xs text-muted-foreground">Grace Period</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black">R$ {tenants.reduce((sum, t) => sum + (t.plan?.price || 0), 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">MRR</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Lojistas */}
      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Lojista</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Plano</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">WhatsApp</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                  Nenhum lojista encontrado. Clique em "Novo Lojista" para começar.
                </td>
              </tr>
            ) : (
              tenants.map((tenant) => (
                <tr key={tenant.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold">{tenant.name}</div>
                    <div className="text-[10px] text-muted-foreground">{tenant.email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold">{tenant.plan?.name || 'Sem plano'}</div>
                    <div className="text-[10px] text-muted-foreground">
                      R$ {tenant.plan?.price?.toLocaleString() || 0}/mês
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(tenant.status)}
                    {tenant.trialEndsAt && (
                      <div className="text-[9px] text-muted-foreground mt-1">
                        Trial: {new Date(tenant.trialEndsAt).toLocaleDateString()}
                      </div>
                    )}
                    {tenant.gracePeriodEndsAt && (
                      <div className="text-[9px] text-amber-500 mt-1">
                        Até: {new Date(tenant.gracePeriodEndsAt).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${tenant.evolutionInstance || tenant.metaPhoneNumberId ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                      {tenant.evolutionInstance || tenant.metaPhoneNumberId ? 'Conectado' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleImpersonate(tenant.id)}
                        className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors" 
                        title="Visualizar como Lojista"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-muted-foreground hover:bg-muted p-2 rounded-lg transition-colors" title="Configurações">
                        <Settings className="w-4 h-4" />
                      </button>
                      <button className="text-blue-500 hover:bg-blue-500/10 p-2 rounded-lg transition-colors" title="Faturamento">
                        <DollarSign className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Criar Lojista */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Criar Novo Lojista"
      >
        <form onSubmit={handleCreateTenant} className="space-y-6">
          {/* Dados básicos */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Dados da Empresa</h4>
            <div>
              <label className="block text-sm font-medium mb-1">Nome da Empresa</label>
              <input 
                type="text" 
                className="w-full p-3 rounded-xl border border-border bg-background"
                placeholder="Ex: Pizzaria do João"
                required
                value={newTenant.name}
                onChange={e => setNewTenant({ ...newTenant, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">E-mail</label>
              <input 
                type="email" 
                className="w-full p-3 rounded-xl border border-border bg-background"
                placeholder="joao@pizzaria.com"
                required
                value={newTenant.email}
                onChange={e => setNewTenant({ ...newTenant, email: e.target.value })}
              />
            </div>
          </div>

          {/* Seleção de Plano */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Plano</h4>
            <div className="grid grid-cols-3 gap-3">
              {plans.map(plan => {
                const canCreate = plan.modules.every(m => allowedModules.includes(m));
                return (
                  <button
                    key={plan.id}
                    type="button"
                    disabled={!canCreate}
                    onClick={() => setNewTenant({ ...newTenant, plan: plan.id })}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      newTenant.plan === plan.id 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary' 
                        : 'border-border hover:border-primary/50'
                    } ${!canCreate ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <p className="font-bold text-sm">{plan.name}</p>
                    <p className="text-lg font-black text-primary">R$ {plan.price}</p>
                    <p className="text-[10px] text-muted-foreground">{plan.maxMessages.toLocaleString()} mensagens</p>
                    {!canCreate && <p className="text-[9px] text-amber-500 mt-1">Módulos não disponíveis</p>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modo de Criação */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tipo de Criação</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNewTenant({ ...newTenant, createMode: 'trial' })}
                className={`p-4 rounded-xl border text-center transition-all ${
                  newTenant.createMode === 'trial' 
                    ? 'border-blue-500 bg-blue-500/5 ring-2 ring-blue-500' 
                    : 'border-border hover:border-blue-500/50'
                }`}
              >
                <Calendar className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <p className="font-bold text-sm">Trial</p>
                <p className="text-[10px] text-muted-foreground">Período de teste gratuito</p>
              </button>
              <button
                type="button"
                onClick={() => setNewTenant({ ...newTenant, createMode: 'direct' })}
                className={`p-4 rounded-xl border text-center transition-all ${
                  newTenant.createMode === 'direct' 
                    ? 'border-emerald-500 bg-emerald-500/5 ring-2 ring-emerald-500' 
                    : 'border-border hover:border-emerald-500/50'
                }`}
              >
                <DollarSign className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                <p className="font-bold text-sm">Direto</p>
                <p className="text-[10px] text-muted-foreground">Cobrar imediatamente</p>
              </button>
            </div>
            
            {newTenant.createMode === 'trial' && (
              <div className="mt-3">
                <label className="block text-sm font-medium mb-1">Dias de Trial</label>
                <input 
                  type="number" 
                  className="w-full p-3 rounded-xl border border-border bg-background"
                  min="1"
                  max="30"
                  value={newTenant.trialDays}
                  onChange={e => setNewTenant({ ...newTenant, trialDays: parseInt(e.target.value) || 7 })}
                />
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)} 
              className="px-4 py-2 rounded-xl hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={creating}
              className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {creating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Criar Lojista
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
};

// =====================================================
// COMPONENTE: ZERO TOUCH SETTINGS
// =====================================================
export const ResellerZeroTouch: React.FC = () => {
  const { fetchWithAuth, user } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  
  const [settings, setSettings] = useState({
    zeroTouchEnabled: true,
    defaultTrialDays: 7,
    autoSuspendAfterGrace: true,
    notifyNewTenant: true,
    notifyPaymentFailed: true,
    notifySuspended: true,
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetchWithAuth('/api/reseller/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(prev => ({
            ...prev,
            zeroTouchEnabled: data.zeroTouchEnabled ?? true,
            defaultTrialDays: data.defaultTrialDays || 7,
          }));
        }
      } catch (e) {
        console.error('Erro ao carregar settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetchWithAuth('/api/reseller/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setToast({ message: 'Configurações salvas com sucesso!', type: 'success' });
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (e) {
      setToast({ message: 'Erro ao salvar configurações', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Zero Touch</h2>
          <p className="text-muted-foreground">Configure a automação de pagamentos e aprovações.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* Zero Touch Toggle */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${settings.zeroTouchEnabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold">Zero Touch</h3>
              <p className="text-sm text-muted-foreground">
                {settings.zeroTouchEnabled 
                  ? 'Sistema aprova pagamentos automaticamente' 
                  : 'Você aprova cada pagamento manualmente'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSettings({ ...settings, zeroTouchEnabled: !settings.zeroTouchEnabled })}
            className={`w-16 h-9 rounded-full transition-colors ${settings.zeroTouchEnabled ? 'bg-primary' : 'bg-muted'}`}
          >
            <div className={`w-7 h-7 bg-white rounded-full shadow transition-transform ${settings.zeroTouchEnabled ? 'translate-x-8' : 'translate-x-1'}`} />
          </button>
        </div>

        {settings.zeroTouchEnabled && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <p className="text-sm text-emerald-200">
              ✅ Com Zero Touch ativo, quando um lojista faz upgrade ou renova, o sistema aprova automaticamente.
              Você só precisa intervir em casos de falha de pagamento.
            </p>
          </div>
        )}

        {!settings.zeroTouchEnabled && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <p className="text-sm text-amber-200">
              ⚠️ Com Zero Touch desativado, você precisará aprovar manualmente cada pagamento.
              Isso dá mais controle, mas requer mais atenção.
            </p>
          </div>
        )}
      </div>

      {/* Trial Padrão */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Trial Padrão
        </h3>
        <div>
          <label className="block text-sm font-medium mb-2">Dias de Trial para Novos Lojistas</label>
          <input 
            type="number" 
            className="w-32 p-3 rounded-xl border border-border bg-background"
            min="1"
            max="30"
            value={settings.defaultTrialDays}
            onChange={e => setSettings({ ...settings, defaultTrialDays: parseInt(e.target.value) || 7 })}
          />
          <p className="text-xs text-muted-foreground mt-1">Novos lojistas terão esse período de teste antes do primeiro pagamento.</p>
        </div>
      </div>

      {/* Notificações */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="font-bold flex items-center gap-2">
          <Send className="w-5 h-5 text-primary" />
          Notificações
        </h3>
        <div className="space-y-3">
          {[
            { key: 'notifyNewTenant', label: 'Novo lojista criado', desc: 'Receber alerta quando um novo lojista se cadastrar' },
            { key: 'notifyPaymentFailed', label: 'Pagamento falhou', desc: 'Alerta quando um pagamento for recusado' },
            { key: 'notifySuspended', label: 'Conta suspensa', desc: 'Aviso quando uma conta for suspensa por inadimplência' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between p-3 rounded-xl border border-border">
              <div>
                <p className="font-bold text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, [item.key]: !(settings as any)[item.key] })}
                className={`w-12 h-7 rounded-full transition-colors ${(settings as any)[item.key] ? 'bg-primary' : 'bg-muted'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${(settings as any)[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
};

export default ResellerTenants;
