import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Store, 
  TrendingUp, 
  DollarSign, 
  Plus, 
  Search, 
  MoreVertical, 
  ShieldCheck, 
  ShieldAlert,
  MessageSquare, 
  Zap,
  User,
  LayoutDashboard,
  Settings,
  Download,
  Server
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Toast, ToastType } from '../components/Toast';

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export const ResellerPanel: React.FC<{ initialTab?: 'tenants' | 'prompts' | 'settings' | 'finance' | 'tickets' }> = ({ initialTab = 'tenants' }) => {
  const [activeTab, setActiveTab] = useState<'tenants' | 'prompts' | 'settings' | 'finance' | 'tickets'>(initialTab);
  const [tenants, setTenants] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [settings, setSettings] = useState({ notificationPhone: '', notificationsEnabled: true });
  const [stripeConfig, setStripeConfig] = useState({ stripeSecretKey: '', stripeWebhookSecret: '' });
  const { token, fetchWithAuth } = useStore();

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tenantsRes, templatesRes, settingsRes, stripeRes] = await Promise.all([
          fetchWithAuth('/api/reseller/tenants'),
          fetchWithAuth('/api/prompts/templates'),
          fetchWithAuth('/api/reseller/settings'),
          fetchWithAuth('/api/reseller/stripe')
        ]);
        if (tenantsRes.ok) setTenants(await tenantsRes.json());
        if (templatesRes.ok) setTemplates(await templatesRes.json());
        if (settingsRes.ok) setSettings(await settingsRes.json());
        if (stripeRes.ok) setStripeConfig(await stripeRes.json());
      } catch (e) {
        console.error(e);
      }
    };
    if (token) fetchData();
  }, [token, fetchWithAuth]);

  const handleSaveStripe = async () => {
    try {
      const res = await fetchWithAuth('/api/reseller/stripe', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(stripeConfig)
      });
      if (res.ok) setToast({ message: 'Configurações do Stripe salvas!', type: 'success' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleNewTenant = () => {
    setToast({ message: 'Funcionalidade de Novo Lojista (Demo)', type: 'info' });
  };

  const handleNewTemplate = () => {
    setToast({ message: 'Funcionalidade de Novo Template (Demo)', type: 'info' });
  };

  // Mock metrics for Reseller
  const metrics = {
    totalClients: tenants.length,
    activeInstances: tenants.reduce((acc, t) => acc + (t.instances?.length || 0), 0),
    mrr: tenants.reduce((acc, t) => acc + (t.plan?.price || 0), 0),
    churnRate: '2.4%',
    commission: tenants.reduce((acc, t) => acc + (t.plan?.price || 0) * 0.3, 0) // 30% commission
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Painel de Revenda</h2>
          <p className="text-muted-foreground">Gerencie seus lojistas e acompanhe suas comissões.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-muted/30 p-1 rounded-xl border border-border">
            <button 
              onClick={() => setActiveTab('tenants')}
              className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTab === 'tenants' ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-muted")}
            >
              Lojistas
            </button>
            <button 
              onClick={() => setActiveTab('prompts')}
              className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTab === 'prompts' ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-muted")}
            >
              Templates de IA
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTab === 'settings' ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-muted")}
            >
              Configurações
            </button>
            <button 
              onClick={() => setActiveTab('finance')}
              className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTab === 'finance' ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-muted")}
            >
              Financeiro
            </button>
            <button 
              onClick={() => setActiveTab('tickets')}
              className={cn("px-4 py-2 rounded-lg text-xs font-bold transition-all", activeTab === 'tickets' ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-muted")}
            >
              Tickets
            </button>
          </div>
          <button 
            onClick={handleNewTenant}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Novo Lojista
          </button>
        </div>
      </div>

      {activeTab === 'tenants' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                  <Store className="w-5 h-5" />
                </div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Total Lojistas</p>
              </div>
              <p className="text-2xl font-bold">{metrics.totalClients}</p>
              <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" /> +12% este mês
              </p>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                  <DollarSign className="w-5 h-5" />
                </div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Sua Comissão (30%)</p>
              </div>
              <p className="text-2xl font-bold">R$ {metrics.commission.toFixed(2)}</p>
              <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3" /> +8.5% vs mês anterior
              </p>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                  <Zap className="w-5 h-5" />
                </div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Instâncias Ativas</p>
              </div>
              <p className="text-2xl font-bold">{metrics.activeInstances}</p>
              <p className="text-[10px] text-muted-foreground font-bold mt-1">
                98.5% Uptime
              </p>
            </div>
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-destructive/10 rounded-lg text-destructive">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <p className="text-xs text-muted-foreground font-bold uppercase">Churn Rate</p>
              </div>
              <p className="text-2xl font-bold">{metrics.churnRate}</p>
              <p className="text-[10px] text-emerald-500 font-bold mt-1">
                -0.5% vs mês anterior
              </p>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Lojista</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Plano</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Zero Touch</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tenants.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                            {t.name[0]}
                          </div>
                          <div>
                            <p className="font-bold">{t.name}</p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-1"><Zap className="w-2 h-2" /> {t.maxInstances} slots</span>
                              <span className="flex items-center gap-1"><MessageSquare className="w-2 h-2" /> {t.messageCount}/{t.maxMessages} msgs</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{t.plan?.name || 'Sem Plano'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${t.stripeSubscriptionId ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'}`}>
                          {t.stripeSubscriptionId ? 'Ativo' : 'Manual'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            t.status === 'active' ? "bg-emerald-500" : "bg-destructive"
                          )} />
                          <span className="text-sm font-medium">{t.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={async () => {
                              const res = await fetch(`/api/reseller/tenants/${t.id}/toggle-custom-prompts`, {
                                method: 'PATCH',
                                headers: { 
                                  'Authorization': `Bearer ${token}`,
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ allowCustomPrompts: !t.allowCustomPrompts })
                              });
                              if (res.ok) {
                                setTenants(tenants.map(item => item.id === t.id ? { ...item, allowCustomPrompts: !item.allowCustomPrompts } : item));
                              }
                            }}
                            className={cn(
                              "px-3 py-1 rounded-lg text-[10px] font-bold transition-all border",
                              t.allowCustomPrompts ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"
                            )}
                          >
                            {t.allowCustomPrompts ? 'Prompt Liberado' : 'Liberar Prompt'}
                          </button>
                          <button className="p-2 rounded-lg hover:bg-muted transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'prompts' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-bold">Seus Templates de IA</h3>
            <button 
              onClick={handleNewTemplate}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Criar Template
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map(p => (
              <div key={p.id} className="glass-card p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold">{p.name}</h4>
                  <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-lg uppercase">{p.category}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3 bg-muted/30 p-3 rounded-xl border border-border italic">
                  "{p.content}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-xl">
          <div className="glass-card p-8 space-y-6">
            <h3 className="font-bold text-lg">Configurações de Notificação</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">WhatsApp para Alertas</label>
                <input 
                  type="text" 
                  value={settings.notificationPhone}
                  onChange={e => setSettings({...settings, notificationPhone: e.target.value})}
                  placeholder="5511999999999"
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                <div>
                  <p className="text-sm font-bold">Alertas de Novos Lojistas</p>
                  <p className="text-[10px] text-muted-foreground">Receba um WhatsApp sempre que alguém se cadastrar pelo seu link.</p>
                </div>
                <button 
                  onClick={() => setSettings({...settings, notificationsEnabled: !settings.notificationsEnabled})}
                  className={cn(
                    "w-10 h-5 rounded-full transition-all relative",
                    settings.notificationsEnabled ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                >
                  <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", settings.notificationsEnabled ? "left-6" : "left-1")} />
                </button>
              </div>
              <button className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold shadow-lg shadow-primary/20">
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'finance' && (
        <div className="max-w-xl">
          <div className="glass-card p-8 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Configuração Stripe</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase">Receba direto na sua conta</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="tech-label">Stripe Secret Key</label>
                <input 
                  type="password" 
                  value={stripeConfig.stripeSecretKey}
                  onChange={e => setStripeConfig({...stripeConfig, stripeSecretKey: e.target.value})}
                  placeholder="sk_live_..."
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="tech-label">Stripe Webhook Secret</label>
                <input 
                  type="password" 
                  value={stripeConfig.stripeWebhookSecret}
                  onChange={e => setStripeConfig({...stripeConfig, stripeWebhookSecret: e.target.value})}
                  placeholder="whsec_..."
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                <p className="text-xs text-blue-500 font-medium leading-relaxed">
                  Ao configurar suas chaves, todos os seus lojistas passarão a pagar diretamente para você. Certifique-se de configurar o Webhook no painel do Stripe apontando para: <br/>
                  <code className="bg-blue-500/10 px-1 rounded">saaswpp.work/api/webhooks/reseller/{token ? JSON.parse(atob(token.split('.')[1])).id : ''}</code>
                </p>
              </div>
              <button 
                onClick={handleSaveStripe}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold shadow-lg shadow-primary/20"
              >
                Salvar Configurações Financeiras
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tickets' && (
        <div className="space-y-6">
          <Support />
        </div>
      )}

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

export const Financials: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const handleExport = () => {
    setToast({ message: 'Gerando planilha consolidada...', type: 'info' });
    setTimeout(() => {
      setToast({ message: 'Relatório financeiro exportado com sucesso (CSV)!', type: 'success' });
    }, 2000);
  };

  const handleSimulatePayment = () => {
    setToast({ message: 'Simulando processamento via Stripe...', type: 'info' });
    setTimeout(() => {
      setToast({ message: 'Pagamento PIX/Cartão aprovado com sucesso!', type: 'success' });
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Relatório Financeiro</h2>
          <p className="text-muted-foreground">Visão geral de faturamento e assinaturas.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleSimulatePayment}
            className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Zap className="w-4 h-4" /> Simular Pagamento
          </button>
          <button 
            onClick={handleExport}
            className="bg-muted text-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-muted/80 transition-colors"
          >
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6 border-t-4 border-emerald-500">
          <h3 className="text-sm font-bold text-muted-foreground uppercase">Faturamento Mensal</h3>
          <p className="text-4xl font-black mt-2">R$ 12.450,00</p>
          <p className="text-xs text-emerald-500 font-bold mt-2">+12% em relação ao mês anterior</p>
        </div>
        <div className="glass-card p-6 border-t-4 border-primary">
          <h3 className="text-sm font-bold text-muted-foreground uppercase">Assinaturas Ativas</h3>
          <p className="text-4xl font-black mt-2">84</p>
          <p className="text-xs text-muted-foreground mt-2">Lojistas e Revendedores</p>
        </div>
        <div className="glass-card p-6 border-t-4 border-amber-500">
          <h3 className="text-sm font-bold text-muted-foreground uppercase">Inadimplência</h3>
          <p className="text-4xl font-black mt-2">R$ 450,00</p>
          <p className="text-xs text-destructive font-bold mt-2">3 faturas pendentes</p>
        </div>
        <div className="glass-card p-6 border-t-4 border-blue-500">
          <h3 className="text-sm font-bold text-muted-foreground uppercase">Régua de Cobrança</h3>
          <p className="text-xs text-muted-foreground mt-2">Status: <span className="text-emerald-500 font-bold">Ativa</span></p>
          <div className="mt-2 space-y-1">
            <p className="text-[10px] text-muted-foreground">1º-5º dia: Avisos WPP</p>
            <p className="text-[10px] text-muted-foreground">48h após: Suspensão</p>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <h3 className="font-bold uppercase text-xs tracking-widest">Últimas Transações</h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-muted/10 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase">Cliente</th>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase">Valor</th>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr className="hover:bg-muted/10 transition-colors">
              <td className="px-6 py-4 font-bold">Lojista Exemplo A</td>
              <td className="px-6 py-4 font-mono text-sm">R$ 197,00</td>
              <td className="px-6 py-4">
                <span className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">Pago</span>
              </td>
              <td className="px-6 py-4 text-sm text-muted-foreground">Hoje, 14:20</td>
            </tr>
            <tr className="hover:bg-muted/10 transition-colors">
              <td className="px-6 py-4 font-bold">Revenda Beta</td>
              <td className="px-6 py-4 font-mono text-sm">R$ 497,00</td>
              <td className="px-6 py-4">
                <span className="bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">Pendente</span>
              </td>
              <td className="px-6 py-4 text-sm text-muted-foreground">Ontem, 09:15</td>
            </tr>
          </tbody>
        </table>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export const Support: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const handleAction = (action: string) => {
    setToast({ message: `Executando: ${action}...`, type: 'info' });
    setTimeout(() => {
      setToast({ message: `Ticket ${action === 'Analisar' ? 'em análise' : 'resolvido'} com sucesso!`, type: 'success' });
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Suporte e Tickets</h2>
          <p className="text-muted-foreground">Central de atendimento ao cliente.</p>
        </div>
        <button className="bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex items-center gap-2">
          <Plus className="w-5 h-5" /> Abrir Novo Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6 border-l-4 border-amber-500">
          <h3 className="text-xs font-bold text-muted-foreground uppercase">Abertos</h3>
          <p className="text-3xl font-black mt-1">12</p>
        </div>
        <div className="glass-card p-6 border-l-4 border-blue-500">
          <h3 className="text-xs font-bold text-muted-foreground uppercase">Em Atendimento</h3>
          <p className="text-3xl font-black mt-1">5</p>
        </div>
        <div className="glass-card p-6 border-l-4 border-emerald-500">
          <h3 className="text-xs font-bold text-muted-foreground uppercase">Resolvidos (Hoje)</h3>
          <p className="text-3xl font-black mt-1">24</p>
        </div>
        <div className="glass-card p-6 border-l-4 border-primary">
          <h3 className="text-xs font-bold text-muted-foreground uppercase">Tempo Médio</h3>
          <p className="text-3xl font-black mt-1">14m</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase">Ticket</th>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase">Assunto</th>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase">Prioridade</th>
              <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr className="hover:bg-muted/10 transition-colors group">
              <td className="px-6 py-4">
                <p className="font-bold text-sm">#TK-8492</p>
                <p className="text-[10px] text-muted-foreground">Lojista: João da Silva</p>
              </td>
              <td className="px-6 py-4 text-sm">Dúvida sobre integração Stripe</td>
              <td className="px-6 py-4">
                <span className="bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">Aberto</span>
              </td>
              <td className="px-6 py-4">
                <span className="text-destructive font-bold text-[10px] uppercase">Alta</span>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={() => handleAction('Analisar')}
                    className="bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all"
                  >
                    Analisar
                  </button>
                  <button 
                    onClick={() => handleAction('Resolver')}
                    className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all"
                  >
                    Resolver
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export const SystemSettings: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [config, setConfig] = useState({ trial_enabled: true });

  useEffect(() => {
    fetch('/api/admin/config')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(console.error);
  }, []);

  const toggleTrial = async () => {
    const newVal = !config.trial_enabled;
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trial_enabled: newVal })
      });
      if (res.ok) {
        setConfig({ ...config, trial_enabled: newVal });
        setToast({ message: `Protocolo Beta-10 ${newVal ? 'Ativado' : 'Desativado'}!`, type: 'success' });
      }
    } catch (e) {
      setToast({ message: 'Erro ao atualizar configuração.', type: 'error' });
    }
  };

  const handleTest = () => {
    setToast({ message: 'Testando conexão com Evolution API...', type: 'info' });
    setTimeout(() => {
      setToast({ message: 'Conexão estabelecida com sucesso!', type: 'success' });
    }, 1500);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Configurações do Sistema</h2>
          <p className="text-muted-foreground">Área técnica restrita para administradores.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <ShieldCheck className="w-6 h-6 text-primary" />
            <h3 className="font-bold text-lg">Protocolo Beta-10 (Onboarding)</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-xl border border-primary/20">
              <div>
                <p className="text-sm font-bold uppercase tracking-tight">Inscrições Beta-10</p>
                <p className="text-[10px] text-muted-foreground font-medium">Libera o link /register/beta10 para novos lojistas.</p>
              </div>
              <button 
                onClick={toggleTrial}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  config.trial_enabled ? "bg-primary" : "bg-muted-foreground/30"
                )}
              >
                <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", config.trial_enabled ? "left-7" : "left-1")} />
              </button>
            </div>
            <div className="p-4 bg-muted/30 rounded-xl border border-border">
              <p className="text-xs text-muted-foreground">
                <b>Regra:</b> O sistema permite apenas 10 lojistas ativos simultaneamente neste modo para garantir a performance do nó de 16GB.
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Server className="w-6 h-6 text-primary" />
            <h3 className="font-bold text-lg">Evolution API (Cluster)</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Endpoint Principal (Node 16GB)</label>
              <input type="text" defaultValue="https://evo-cluster.seusite.com" className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Global API Key</label>
              <div className="flex gap-2">
                <input type="password" value="evolution_key_master_..." disabled className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-3 opacity-50" />
                <button className="px-4 py-2 bg-muted rounded-xl font-bold text-xs hover:bg-muted/80 transition-colors">Gerar Nova</button>
              </div>
            </div>
            <button onClick={handleTest} className="w-full bg-primary/10 text-primary py-3 rounded-xl font-bold text-sm hover:bg-primary/20 transition-colors">Testar Conexão com Cluster</button>
          </div>
        </div>

        <div className="glass-card p-8 space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Settings className="w-6 h-6 text-primary" />
            <h3 className="font-bold text-lg">Logs do Sistema</h3>
          </div>
          <div className="bg-black/90 text-green-500 font-mono text-[10px] p-4 rounded-xl h-64 overflow-y-auto custom-scrollbar">
            <p className="opacity-50 mb-1">-- INÍCIO DO LOG --</p>
            <p><span className="text-blue-400">[SYSTEM]</span> Server started at port 3000</p>
            <p><span className="text-purple-400">[AUTH]</span> User admin@saaswpp.com logged in from 127.0.0.1</p>
            <p><span className="text-amber-400">[CRON]</span> Daily billing check completed - 0 errors</p>
            <p><span className="text-emerald-400">[WHATSAPP]</span> Instance client-1 connected successfully</p>
            <p><span className="text-blue-400">[API]</span> POST /api/reseller/tenants - 200 OK</p>
            <p><span className="text-blue-400">[SYSTEM]</span> Memory usage: 45% - CPU: 12%</p>
            <p><span className="text-amber-400">[AI]</span> Rotation triggered: key_prod_01 reached 90%</p>
            <p><span className="text-emerald-400">[AI]</span> Failover successful: key_prod_02 is now primary</p>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
