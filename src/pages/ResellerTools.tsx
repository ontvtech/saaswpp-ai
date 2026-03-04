import React, { useState, useEffect } from 'react';
import { Users, MessageSquare, Plus, Search, MoreVertical, Phone, Mail, Calendar, DollarSign, CheckCircle2, XCircle, Play, Settings, Zap, Trash2, Edit2, Send, RefreshCw, Store, TrendingUp, Lock, AlertTriangle } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Toast, ToastType } from '../components/Toast';
import { useStore } from '../store/useStore';

export const ResellerTenants: React.FC = () => {
  const { token, user, setImpersonation, fetchWithAuth } = useStore();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [newTenant, setNewTenant] = useState({ 
    name: '', 
    plan: 'Start', 
    email: '',
    activeModules: ['ESSENTIAL'] as string[],
    whatsappApiType: 'EVOLUTION',
    metaAccessToken: '',
    metaPhoneNumberId: '',
    metaWabaId: '',
    metaVerifyToken: ''
  });

  const handleToggleModule = (mod: string) => {
    setNewTenant(prev => ({
      ...prev,
      activeModules: prev.activeModules.includes(mod)
        ? prev.activeModules.filter(m => m !== mod)
        : [...prev.activeModules, mod]
    }));
  };

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const res = await fetchWithAuth('/api/reseller/tenants');
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        setTenants(data);
      } catch (e) {
        if (import.meta.env.DEV) {
          setTenants([
            { id: 'demo-tenant-1', name: 'Oficina do Zé', email: 'ze@oficina.com', plan: 'Pro', status: 'active', whatsappApiType: 'EVOLUTION', evolutionInstance: 'ze-oficina' },
            { id: 'demo-tenant-2', name: 'Pet Shop Auau', email: 'contato@auau.com', plan: 'Start', status: 'active', whatsappApiType: 'META', metaPhoneNumberId: '123456' },
            { id: 'demo-tenant-3', name: 'Restaurante Sabor', email: 'adm@sabor.com', plan: 'Enterprise', status: 'suspended', whatsappApiType: 'EVOLUTION' },
          ]);
        }
        console.error('Failed to fetch tenants');
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/api/reseller/tenants', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTenant)
      });

      if (res.ok) {
        const tenant = await res.json();
        setTenants([tenant, ...tenants]);
        setIsModalOpen(false);
        setNewTenant({ 
          name: '', 
          plan: 'Start', 
          email: '', 
          activeModules: ['ESSENTIAL'],
          whatsappApiType: 'EVOLUTION',
          metaAccessToken: '',
          metaPhoneNumberId: '',
          metaWabaId: '',
          metaVerifyToken: ''
        });
        setToast({ message: 'Cliente criado com sucesso!', type: 'success' });
      } else {
        const err = await res.json();
        setToast({ message: err.error || 'Erro ao criar cliente', type: 'error' });
      }
    } catch (e) {
      setToast({ message: 'Erro de rede ao criar cliente', type: 'error' });
    }
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
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Cliente</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Plano</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">WhatsApp</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Zero Touch</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">Carregando lojistas...</td>
              </tr>
            ) : tenants.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">Nenhum lojista encontrado.</td>
              </tr>
            ) : tenants.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold">{tenant.name}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest">{tenant.email}</div>
                </td>
                <td className="px-6 py-4 text-sm font-medium">{tenant.plan}</td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase w-fit ${tenant.evolutionInstance || tenant.metaPhoneNumberId ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                      {tenant.evolutionInstance || tenant.metaPhoneNumberId ? 'Configurado' : 'Pendente'}
                    </span>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">
                      Motor: {tenant.whatsappApiType}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${tenant.subscriptionId ? 'bg-blue-500/10 text-blue-500' : 'bg-muted text-muted-foreground'}`}>
                    {tenant.subscriptionId ? 'Ativo' : 'Manual'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${tenant.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                    {tenant.status === 'active' ? 'Ativo' : tenant.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => {
                        setImpersonation('merchant', tenant.id);
                        window.location.href = '/';
                      }}
                      className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors" title="Visualizar como Lojista"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button className="text-muted-foreground hover:bg-muted p-2 rounded-lg transition-colors" title="Configurações">
                      <Settings className="w-4 h-4" />
                    </button>
                    <button className="text-blue-500 hover:bg-blue-500/10 p-2 rounded-lg transition-colors" title="Faturamento (Stripe)">
                      <DollarSign className="w-4 h-4" />
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Cliente"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome da Empresa</label>
            <input 
                type="text" 
                className="w-full p-2 rounded-lg border border-border bg-background" 
                placeholder="Ex: Loja do João" 
                required 
                value={newTenant.name}
                onChange={e => setNewTenant({...newTenant, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">E-mail</label>
            <input 
                type="email" 
                className="w-full p-2 rounded-lg border border-border bg-background" 
                placeholder="joao@loja.com" 
                required 
                value={newTenant.email}
                onChange={e => setNewTenant({...newTenant, email: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Plano</label>
            <select 
                className="w-full p-2 rounded-lg border border-border bg-background"
                value={newTenant.plan}
                onChange={e => setNewTenant({...newTenant, plan: e.target.value})}
            >
                <option value="Start">Start</option>
                <option value="Pro">Pro</option>
                <option value="Enterprise">Enterprise</option>
            </select>
          </div>

          <div className="p-4 bg-muted/30 rounded-xl border border-border space-y-4">
            <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground">Motor de WhatsApp</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNewTenant({...newTenant, whatsappApiType: 'EVOLUTION'})}
                className={`flex-1 p-2 rounded-lg border text-xs font-bold transition-all ${newTenant.whatsappApiType === 'EVOLUTION' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/50'}`}
              >
                Evolution API (Não Oficial)
              </button>
              <button
                type="button"
                onClick={() => setNewTenant({...newTenant, whatsappApiType: 'META'})}
                className={`flex-1 p-2 rounded-lg border text-xs font-bold transition-all ${newTenant.whatsappApiType === 'META' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/50'}`}
              >
                Meta API (Oficial)
              </button>
            </div>

            {newTenant.whatsappApiType === 'META' && (
              <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Access Token (Meta)</label>
                  <input 
                    type="password" 
                    className="w-full p-2 rounded-lg border border-border bg-background text-xs" 
                    placeholder="EAA..." 
                    value={newTenant.metaAccessToken}
                    onChange={e => setNewTenant({...newTenant, metaAccessToken: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Phone Number ID</label>
                    <input 
                      type="text" 
                      className="w-full p-2 rounded-lg border border-border bg-background text-xs" 
                      placeholder="123456789" 
                      value={newTenant.metaPhoneNumberId}
                      onChange={e => setNewTenant({...newTenant, metaPhoneNumberId: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Verify Token (Webhook)</label>
                    <input 
                      type="text" 
                      className="w-full p-2 rounded-lg border border-border bg-background text-xs" 
                      placeholder="meu_token_secreto" 
                      value={newTenant.metaVerifyToken}
                      onChange={e => setNewTenant({...newTenant, metaVerifyToken: e.target.value})}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-amber-500 font-medium">
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  Certifique-se de configurar o Webhook na Meta Developers para: {window.location.origin}/api/webhooks/meta
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground">Módulos Ativos (Herança)</label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'ESSENTIAL', name: '📦 ESSENTIAL', desc: 'Atendente IA + KB Estática', allowed: true },
                { id: 'SALES_PRO', name: '🚀 SALES PRO', desc: 'Vendedor IA + Handoff', allowed: user?.role === 'ADMIN' || (user as any).allowedModules?.includes('SALES_PRO') },
                { id: 'ELITE', name: '🦅 ELITE', desc: 'Caçador IA + Gemini Pro', allowed: user?.role === 'ADMIN' || (user as any).allowedModules?.includes('ELITE') }
              ].map(mod => (
                <button
                  key={mod.id}
                  type="button"
                  disabled={!mod.allowed}
                  onClick={() => handleToggleModule(mod.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${newTenant.activeModules.includes(mod.id) ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'} ${!mod.allowed ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                >
                  <div className={`mt-1 w-4 h-4 rounded border flex items-center justify-center transition-colors ${newTenant.activeModules.includes(mod.id) ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                    {newTenant.activeModules.includes(mod.id) && <Zap className="w-3 h-3 text-primary-foreground fill-current" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold">{mod.name}</p>
                      {!mod.allowed && <Lock className="w-3 h-3 text-muted-foreground" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{mod.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">Criar Cliente</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const ResellerCRM: React.FC = () => {
  const [leads, setLeads] = useState([
    { id: 1, name: 'Academia Fit', contact: 'Carlos', phone: '11999999999', status: 'negotiation', value: '197.00' },
    { id: 2, name: 'Dr. Consultório', contact: 'Ana', phone: '11988888888', status: 'new', value: '497.00' },
    { id: 3, name: 'Loja de Roupas', contact: 'Mariana', phone: '11977777777', status: 'closed', value: '97.00' },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [newLead, setNewLead] = useState({ name: '', contact: '', phone: '', value: '' });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const lead = {
        id: Date.now(),
        name: newLead.name,
        contact: newLead.contact,
        phone: newLead.phone,
        status: 'new',
        value: newLead.value
    };
    setLeads([lead, ...leads]);
    setIsModalOpen(false);
    setNewLead({ name: '', contact: '', phone: '', value: '' });
    setToast({ message: 'Lead adicionado com sucesso!', type: 'success' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">CRM de Vendas</h2>
          <p className="text-muted-foreground">Gerencie seus leads e oportunidades de venda.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4" /> Novo Lead
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna: Novos */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-bold text-sm uppercase text-muted-foreground">Novos Leads</h3>
            <span className="bg-muted px-2 py-1 rounded-md text-xs font-bold">{leads.filter(l => l.status === 'new').length}</span>
          </div>
          <div className="space-y-3">
            {leads.filter(l => l.status === 'new').map(lead => (
              <div key={lead.id} className="glass-card p-4 hover:border-primary/50 transition-colors cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold">{lead.name}</span>
                  <span className="text-xs font-bold text-emerald-500">R$ {lead.value}</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2"><Users className="w-3 h-3" /> {lead.contact}</div>
                  <div className="flex items-center gap-2"><Phone className="w-3 h-3" /> {lead.phone}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna: Em Negociação */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-bold text-sm uppercase text-primary">Em Negociação</h3>
            <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-bold">{leads.filter(l => l.status === 'negotiation').length}</span>
          </div>
          <div className="space-y-3">
            {leads.filter(l => l.status === 'negotiation').map(lead => (
              <div key={lead.id} className="glass-card p-4 border-l-4 border-l-primary hover:border-primary/50 transition-colors cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold">{lead.name}</span>
                  <span className="text-xs font-bold text-emerald-500">R$ {lead.value}</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2"><Users className="w-3 h-3" /> {lead.contact}</div>
                  <div className="flex items-center gap-2"><Phone className="w-3 h-3" /> {lead.phone}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coluna: Fechados */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="font-bold text-sm uppercase text-emerald-500">Fechados</h3>
            <span className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-md text-xs font-bold">{leads.filter(l => l.status === 'closed').length}</span>
          </div>
          <div className="space-y-3">
            {leads.filter(l => l.status === 'closed').map(lead => (
              <div key={lead.id} className="glass-card p-4 opacity-75 hover:opacity-100 transition-opacity cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold line-through text-muted-foreground">{lead.name}</span>
                  <span className="text-xs font-bold text-emerald-500">R$ {lead.value}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold mt-2">
                  <CheckCircle2 className="w-4 h-4" /> Venda Realizada
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Lead"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome do Lead</label>
            <input 
                type="text" 
                className="w-full p-2 rounded-lg border border-border bg-background" 
                placeholder="Ex: Academia Fit" 
                required 
                value={newLead.name}
                onChange={e => setNewLead({...newLead, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contato</label>
            <input 
                type="text" 
                className="w-full p-2 rounded-lg border border-border bg-background" 
                placeholder="Nome do contato" 
                required 
                value={newLead.contact}
                onChange={e => setNewLead({...newLead, contact: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telefone</label>
            <input 
                type="text" 
                className="w-full p-2 rounded-lg border border-border bg-background" 
                placeholder="(11) 99999-9999" 
                required 
                value={newLead.phone}
                onChange={e => setNewLead({...newLead, phone: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Valor Estimado (R$)</label>
            <input 
                type="number" 
                className="w-full p-2 rounded-lg border border-border bg-background" 
                placeholder="0.00" 
                required 
                value={newLead.value}
                onChange={e => setNewLead({...newLead, value: e.target.value})}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">Adicionar Lead</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const AITemplates: React.FC = () => {
  const [templates, setTemplates] = useState([
    { id: 1, name: 'Atendente de Clínica', niche: 'Saúde & Bem-estar', content: 'Você é a secretária da Clínica Saúde...', active: true },
    { id: 2, name: 'Vendedor de Loja', niche: 'Varejo', content: 'Você é vendedor da Loja Fashion...', active: true },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [newTemplate, setNewTemplate] = useState({ name: '', niche: '', content: '' });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const template = {
        id: Date.now(),
        name: newTemplate.name,
        niche: newTemplate.niche,
        content: newTemplate.content,
        active: true
    };
    setTemplates([template, ...templates]);
    setIsModalOpen(false);
    setNewTemplate({ name: '', niche: '', content: '' });
    setToast({ message: 'Template criado com sucesso!', type: 'success' });
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este template?')) {
        setTemplates(templates.filter(t => t.id !== id));
        setToast({ message: 'Template excluído.', type: 'info' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Templates de IA</h2>
          <p className="text-muted-foreground">Crie prompts padrão para seus lojistas usarem.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4" /> Novo Template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map(template => (
          <div key={template.id} className="glass-card p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold">{template.name}</h4>
                  <p className="text-xs text-muted-foreground">{template.niche}</p>
                </div>
              </div>
              <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold px-2 py-1 rounded-lg uppercase">Ativo</span>
            </div>
            <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border line-clamp-3">
              "{template.content}"
            </p>
            <div className="flex gap-2 pt-2">
              <button className="text-xs font-bold hover:underline">Editar</button>
              <button onClick={() => handleDelete(template.id)} className="text-xs font-bold text-destructive hover:underline">Excluir</button>
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Template"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome do Template</label>
            <input 
                type="text" 
                className="w-full p-2 rounded-lg border border-border bg-background" 
                placeholder="Ex: Atendente de Clínica" 
                required 
                value={newTemplate.name}
                onChange={e => setNewTemplate({...newTemplate, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nicho</label>
            <input 
                type="text" 
                className="w-full p-2 rounded-lg border border-border bg-background" 
                placeholder="Ex: Saúde" 
                required 
                value={newTemplate.niche}
                onChange={e => setNewTemplate({...newTemplate, niche: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prompt Base</label>
            <textarea 
                className="w-full p-2 rounded-lg border border-border bg-background h-32 resize-none" 
                placeholder="Escreva o prompt aqui..." 
                required 
                value={newTemplate.content}
                onChange={e => setNewTemplate({...newTemplate, content: e.target.value})}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">Salvar Template</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const ResellerWhatsAppMonitor: React.FC = () => {
  const [instances, setInstances] = useState([
    { id: 1, name: 'Oficina do Zé', status: 'connected', battery: '85%', lastSync: '1 min ago' },
    { id: 2, name: 'Salão Beleza Pura', status: 'disconnected', battery: '-', lastSync: '2 hours ago' },
  ]);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const handleRestart = (name: string) => {
    setToast({ message: `Reiniciando instância de ${name}...`, type: 'info' });
    setTimeout(() => {
        setToast({ message: `Instância de ${name} reiniciada com sucesso!`, type: 'success' });
    }, 2000);
  };

  const handleNotify = (name: string) => {
    setToast({ message: `Notificação enviada para ${name}.`, type: 'success' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Monitor de WhatsApp</h2>
          <p className="text-muted-foreground">Status das conexões dos seus lojistas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {instances.map(instance => (
          <div key={instance.id} className="glass-card p-6 space-y-4 border-t-4 border-primary relative">
            <div className="flex justify-between items-start">
              <h4 className="font-bold text-lg truncate max-w-[180px]">{instance.name}</h4>
              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                instance.status === 'connected' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
              }`}>
                {instance.status === 'connected' ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Bateria:</span>
                <span className="font-bold">{instance.battery}</span>
              </div>
              <div className="flex justify-between">
                <span>Última Sincronização:</span>
                <span className="font-bold">{instance.lastSync}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex gap-2">
              <button onClick={() => handleNotify(instance.name)} className="flex-1 bg-muted hover:bg-muted/80 py-2 rounded-lg text-xs font-bold transition-colors">Notificar</button>
              <button onClick={() => handleRestart(instance.name)} className="flex-1 bg-primary/10 text-primary hover:bg-primary/20 py-2 rounded-lg text-xs font-bold transition-colors">Reiniciar</button>
            </div>
          </div>
        ))}
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

export const ResellerBroadcast: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState([
    { id: 1, title: 'Atualização de Preços', status: 'Enviado', date: 'Hoje, 10:00', recipient: 'Todos' },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [newBroadcast, setNewBroadcast] = useState({ title: '', message: '', recipient: 'Todos' });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const broadcast = {
        id: Date.now(),
        title: newBroadcast.title,
        status: 'Enviado',
        date: 'Agora',
        recipient: newBroadcast.recipient
    };
    setBroadcasts([broadcast, ...broadcasts]);
    setIsModalOpen(false);
    setNewBroadcast({ title: '', message: '', recipient: 'Todos' });
    setToast({ message: 'Comunicado enviado com sucesso!', type: 'success' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Comunicação com Lojistas</h2>
          <p className="text-muted-foreground">Envie avisos e novidades para sua base de clientes.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4" /> Novo Aviso
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Título</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Data</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {broadcasts.map((b) => (
              <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-6 py-4 font-bold">{b.title}</td>
                <td className="px-6 py-4">
                  <span className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">{b.status}</span>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{b.date}</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-muted-foreground hover:text-primary p-2"><Search className="w-4 h-4" /></button>
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Comunicado"
      >
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Título</label>
            <input 
                type="text" 
                className="w-full p-2 rounded-lg border border-border bg-background" 
                placeholder="Ex: Manutenção Programada" 
                required 
                value={newBroadcast.title}
                onChange={e => setNewBroadcast({...newBroadcast, title: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Destinatários</label>
            <select 
                className="w-full p-2 rounded-lg border border-border bg-background"
                value={newBroadcast.recipient}
                onChange={e => setNewBroadcast({...newBroadcast, recipient: e.target.value})}
            >
                <option value="Todos">Todos os Lojistas</option>
                <option value="Inadimplentes">Apenas Inadimplentes</option>
                <option value="Pro">Plano Pro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mensagem</label>
            <textarea 
                className="w-full p-2 rounded-lg border border-border bg-background h-32 resize-none" 
                placeholder="Escreva sua mensagem..." 
                required 
                value={newBroadcast.message}
                onChange={e => setNewBroadcast({...newBroadcast, message: e.target.value})}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">Enviar Aviso</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const ResellerSettings: React.FC = () => {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold mb-2">Configurações da Conta</h2>
        <p className="text-muted-foreground">Gerencie seu perfil, segurança e chaves de API.</p>
      </div>

      <div className="glass-card p-8 space-y-6">
        <h3 className="font-bold text-lg border-b border-border pb-2">Perfil do Parceiro</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome da Empresa</label>
            <input type="text" defaultValue="Minha Agência Digital" className="w-full p-3 rounded-xl border border-border bg-background" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">E-mail de Contato</label>
            <input type="email" defaultValue="contato@agencia.com" className="w-full p-3 rounded-xl border border-border bg-background" />
          </div>
        </div>
      </div>

      <div className="glass-card p-8 space-y-6">
        <h3 className="font-bold text-lg border-b border-border pb-2">Segurança</h3>
        <div className="space-y-4">
          <button className="w-full text-left p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 transition-colors flex justify-between items-center">
            <div>
              <p className="font-bold">Alterar Senha</p>
              <p className="text-xs text-muted-foreground">Atualize sua senha de acesso regularmente.</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="w-full text-left p-4 rounded-xl border border-border bg-muted/20 hover:bg-muted/50 transition-colors flex justify-between items-center">
            <div>
              <p className="font-bold">Autenticação em 2 Fatores (2FA)</p>
              <p className="text-xs text-muted-foreground">Adicione uma camada extra de segurança.</p>
            </div>
            <XCircle className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};
