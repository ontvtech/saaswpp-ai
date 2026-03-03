import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, Zap, MessageSquare, Store, MoreVertical, User, ShieldCheck, ShieldAlert, Play } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Modal } from '../components/Modal';
import { Toast, ToastType } from '../components/Toast';

export const ResellersPage: React.FC = () => {
  const [resellers, setResellers] = useState<any[]>([]);
  const { token, setImpersonation, fetchWithAuth } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReseller, setEditingReseller] = useState<any | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    planId: '',
    status: 'active',
    allowedModules: ['ESSENTIAL'] as string[]
  });

  useEffect(() => {
    fetchResellers();
  }, [token]);

  const fetchResellers = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/resellers');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setResellers(data);
        } else {
          setResellers([
            { id: '1', name: 'Revenda Alpha', email: 'alpha@reseller.com', status: 'active', plan: { name: 'Revenda Start' }, managedTenants: [1,2,3] },
            { id: '2', name: 'Beta Solutions', email: 'beta@reseller.com', status: 'suspended', plan: { name: 'Revenda Pro' }, managedTenants: [1] },
          ]);
        }
      } else {
        // Fallback data if API fails
        setResellers([
          { id: '1', name: 'Revenda Alpha', email: 'alpha@reseller.com', status: 'active', plan: { name: 'Revenda Start' }, managedTenants: [1,2,3] },
          { id: '2', name: 'Beta Solutions', email: 'beta@reseller.com', status: 'suspended', plan: { name: 'Revenda Pro' }, managedTenants: [1] },
        ]);
      }
    } catch (e) {
      console.error(e);
      setResellers([
        { id: '1', name: 'Revenda Alpha', email: 'alpha@reseller.com', status: 'active', plan: { name: 'Revenda Start' }, managedTenants: [1,2,3] },
        { id: '2', name: 'Beta Solutions', email: 'beta@reseller.com', status: 'suspended', plan: { name: 'Revenda Pro' }, managedTenants: [1] },
      ]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call
    const newReseller = { 
      ...formData, 
      id: editingReseller?.id || Date.now().toString(),
      plan: { name: 'Revenda Start' }, // Mock plan name
      managedTenants: []
    };
    
    if (editingReseller) {
      setResellers(resellers.map(r => r.id === editingReseller.id ? { ...r, ...formData } : r));
      setToast({ message: 'Revendedor atualizado com sucesso!', type: 'success' });
    } else {
      setResellers([...resellers, newReseller]);
      setToast({ message: 'Revendedor criado com sucesso!', type: 'success' });
    }
    setIsModalOpen(false);
    setEditingReseller(null);
    setFormData({ name: '', email: '', password: '', planId: '', status: 'active', allowedModules: ['ESSENTIAL'] });
  };

  const handleEdit = (reseller: any) => {
    setEditingReseller(reseller);
    setFormData({ ...reseller, password: '' }); // Don't show password
    setIsModalOpen(true);
  };

  const handleToggleStatus = (id: string) => {
    setResellers(resellers.map(r => {
      if (r.id === id) {
        const newStatus = r.status === 'active' ? 'suspended' : 'active';
        setToast({ message: `Revendedor ${newStatus === 'active' ? 'ativado' : 'suspenso'}!`, type: newStatus === 'active' ? 'success' : 'info' });
        return { ...r, status: newStatus };
      }
      return r;
    }));
  };

  const handleToggleModule = (module: string) => {
    setFormData(prev => ({
      ...prev,
      allowedModules: prev.allowedModules.includes(module)
        ? prev.allowedModules.filter(m => m !== module)
        : [...prev.allowedModules, module]
    }));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Gestão de Revendedores</h2>
          <p className="text-muted-foreground">Administre parceiros e suas carteiras de clientes.</p>
        </div>
        <button 
          onClick={() => {
            setEditingReseller(null);
            setFormData({ name: '', email: '', password: '', planId: '', status: 'active', allowedModules: ['ESSENTIAL'] });
            setIsModalOpen(true);
          }}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Novo Revendedor
        </button>
      </div>

      <div className="glass-card overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Revendedor</th>
              <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Plano Atual</th>
              <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lojistas Ativos</th>
              <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {resellers.map(r => (
              <tr key={r.id} className="hover:bg-muted/20 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                      {r.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate max-w-[150px]">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{r.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs font-medium whitespace-nowrap">{r.plan?.name || 'Sem Plano'}</td>
                <td className="px-4 py-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Store className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="font-bold">{r.managedTenants?.length || 0}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase inline-block ${r.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'}`}>
                    {r.status === 'active' ? 'Ativo' : 'Suspenso'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setImpersonation('reseller', r.id);
                        window.location.href = '/';
                      }}
                      className="p-1.5 hover:bg-muted rounded-md text-primary hover:text-primary transition-colors" title="Visualizar como Revendedor"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleEdit(r)} className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-primary transition-colors" title="Editar">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleToggleStatus(r.id)} className={`p-1.5 hover:bg-muted rounded-md transition-colors ${r.status === 'active' ? 'text-destructive hover:bg-destructive/10' : 'text-emerald-500 hover:bg-emerald-500/10'}`} title={r.status === 'active' ? 'Suspender' : 'Ativar'}>
                      {r.status === 'active' ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
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
        title={editingReseller ? "Editar Revendedor" : "Novo Revendedor"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome da Empresa/Revenda</label>
            <input 
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full p-2 rounded-lg border border-border bg-background" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">E-mail de Acesso</label>
            <input 
              type="email" 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full p-2 rounded-lg border border-border bg-background" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Senha {editingReseller && '(Deixe em branco para manter)'}</label>
            <input 
              type="password" 
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              className="w-full p-2 rounded-lg border border-border bg-background" 
              required={!editingReseller}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Plano de Revenda</label>
            <select 
              value={formData.planId}
              onChange={e => setFormData({...formData, planId: e.target.value})}
              className="w-full p-2 rounded-lg border border-border bg-background"
            >
              <option value="">Selecione um plano...</option>
              <option value="1">Revenda Start</option>
              <option value="2">Revenda Pro</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-bold uppercase tracking-widest text-muted-foreground">Módulos Permitidos (Herança)</label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'ESSENTIAL', name: '📦 ESSENTIAL (Atendente)', desc: 'Gemini Flash Lite + KB Estática' },
                { id: 'SALES_PRO', name: '🚀 SALES PRO (Vendedor)', desc: 'Gemini Flash + Handoff + Estudo Dinâmico' },
                { id: 'ELITE', name: '🦅 ELITE (Caçador)', desc: 'Gemini Pro + IA Proativa' }
              ].map(mod => (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => handleToggleModule(mod.id)}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${formData.allowedModules.includes(mod.id) ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
                >
                  <div className={`mt-1 w-4 h-4 rounded border flex items-center justify-center transition-colors ${formData.allowedModules.includes(mod.id) ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                    {formData.allowedModules.includes(mod.id) && <Zap className="w-3 h-3 text-primary-foreground fill-current" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold">{mod.name}</p>
                    <p className="text-[10px] text-muted-foreground">{mod.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
              {editingReseller ? 'Salvar Alterações' : 'Criar Revendedor'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
