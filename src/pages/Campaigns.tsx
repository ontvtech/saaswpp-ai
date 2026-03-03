import React, { useState } from 'react';
import { Send, Users, MessageSquare, BarChart3, Plus, Search, Filter, Play, Pause, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Modal } from '../components/Modal';
import { Toast, ToastType } from '../components/Toast';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

export const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState([
    { id: 1, name: 'Reativação Pet Shop - Banho', status: 'Ativa', sent: 142, converted: 12, type: 'Automática' },
    { id: 2, name: 'Lembrete Gás - 30 Dias', status: 'Pausada', sent: 850, converted: 245, type: 'Agendada' },
    { id: 3, name: 'Checkup Odonto Semestral', status: 'Concluída', sent: 320, converted: 45, type: 'Única' },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    type: 'Automática',
    message: ''
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const campaign = {
        id: Date.now(),
        name: newCampaign.name,
        status: 'Ativa',
        sent: 0,
        converted: 0,
        type: newCampaign.type
    };
    setCampaigns([campaign, ...campaigns]);
    setIsModalOpen(false);
    setNewCampaign({ name: '', type: 'Automática', message: '' });
    setToast({ message: 'Campanha criada e iniciada!', type: 'success' });
  };

  const toggleStatus = (id: number) => {
    setCampaigns(campaigns.map(c => {
        if (c.id === id) {
            const newStatus = c.status === 'Ativa' ? 'Pausada' : 'Ativa';
            setToast({ message: `Campanha ${newStatus === 'Ativa' ? 'retomada' : 'pausada'}.`, type: 'info' });
            return { ...c, status: newStatus };
        }
        return c;
    }));
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir esta campanha?')) {
        setCampaigns(campaigns.filter(c => c.id !== id));
        setToast({ message: 'Campanha excluída.', type: 'info' });
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Central de Campanhas</h2>
          <p className="tech-label text-primary">Motor de Reengajamento em Massa</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-10 py-5 rounded-2xl font-black uppercase tracking-tighter shadow-2xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-3"
        >
          <Plus className="w-6 h-6" />
          Criar Campanha
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[
          { label: 'Total Enviado', val: campaigns.reduce((acc, c) => acc + c.sent, 0).toLocaleString(), icon: Send, color: 'text-blue-500' },
          { label: 'Conv. Média', val: '18.4%', icon: BarChart3, color: 'text-emerald-500' },
          { label: 'Fluxos Ativos', val: campaigns.filter(c => c.status === 'Ativa').length, icon: Play, color: 'text-purple-500' },
          { label: 'Receita Total', val: 'R$ 42k', icon: Users, color: 'text-amber-500' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center", stat.color)}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="tech-label opacity-50">{stat.label}</p>
              <p className="text-2xl font-black tracking-tighter">{stat.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-8 border-b border-border flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Buscar campanhas..." 
                className="w-full bg-background border border-border rounded-xl pl-12 pr-4 py-3 outline-none focus:border-primary/50 tech-label"
              />
            </div>
            <button className="p-3 rounded-xl border border-border hover:bg-muted transition-all">
              <Filter className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-10 py-5 tech-label">Nome da Campanha</th>
                <th className="px-10 py-5 tech-label">Tipo</th>
                <th className="px-10 py-5 tech-label">Status</th>
                <th className="px-10 py-5 tech-label text-center">Enviados</th>
                <th className="px-10 py-5 tech-label text-center">Convertidos</th>
                <th className="px-10 py-5 tech-label text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-10 py-8">
                    <p className="font-black uppercase tracking-tight text-lg">{c.name}</p>
                    <span className="tech-label opacity-50">ID: CAMP-{c.id}</span>
                  </td>
                  <td className="px-10 py-8">
                    <span className="tech-label px-3 py-1 bg-muted rounded-full border border-border">{c.type}</span>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        c.status === 'Ativa' ? 'bg-emerald-500 animate-pulse' : 
                        c.status === 'Pausada' ? 'bg-amber-500' : 'bg-blue-500'
                      )} />
                      <span className="tech-label font-bold">{c.status}</span>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <p className="data-value font-bold">{c.sent}</p>
                  </td>
                  <td className="px-10 py-8 text-center">
                    <p className="data-value font-bold text-primary">{c.converted}</p>
                    <p className="tech-label text-[8px] opacity-50">{c.sent > 0 ? ((c.converted/c.sent)*100).toFixed(1) : 0}% Taxa</p>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => toggleStatus(c.id)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-all" title={c.status === 'Ativa' ? 'Pausar' : 'Retomar'}>
                        {c.status === 'Ativa' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-all" title="Excluir">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
        title="Nova Campanha"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome da Campanha</label>
            <input 
                type="text" 
                className="w-full p-2 rounded-lg border border-border bg-background" 
                placeholder="Ex: Promoção de Natal" 
                required 
                value={newCampaign.name}
                onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select 
                className="w-full p-2 rounded-lg border border-border bg-background"
                value={newCampaign.type}
                onChange={e => setNewCampaign({...newCampaign, type: e.target.value})}
            >
                <option value="Automática">Automática (Gatilho)</option>
                <option value="Agendada">Agendada (Data)</option>
                <option value="Única">Única (Broadcast)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mensagem Inicial</label>
            <textarea 
                className="w-full p-2 rounded-lg border border-border bg-background h-24 resize-none" 
                placeholder="Olá {{nome}}, temos uma oferta especial..."
                value={newCampaign.message}
                onChange={e => setNewCampaign({...newCampaign, message: e.target.value})}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">Criar Campanha</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
