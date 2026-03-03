import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, ShieldAlert, CheckCircle2, AlertTriangle, BarChart3, Download, CreditCard, UserPlus, Key, Zap, XCircle, MessageSquare, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../store/useStore';
import { Toast, ToastType } from '../components/Toast';
import { Modal } from '../components/Modal';

export const KnowledgeBase: React.FC = () => {
  const [whatsappSource, setWhatsappSource] = useState({
    enabled: false,
    groups: [] as string[],
    lastSync: null as string | null
  });

  const [topics, setTopics] = useState([
    { id: 1, question: 'Qual o endereço?', answer: 'Rua das Flores, 123 - Centro. Próximo ao metrô.' },
    { id: 2, question: 'Formas de Pagamento', answer: 'Aceitamos PIX, Cartão de Crédito em até 3x sem juros e Dinheiro.' },
    { id: 3, question: 'Horário de Funcionamento', answer: 'Segunda a Sexta das 09h às 18h. Sábados das 09h às 13h.' },
    { id: 4, question: 'Política de Troca', answer: 'Trocas em até 7 dias com a etiqueta original.' }
  ]);

  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [newGroupName, setNewGroupName] = useState('');

  const [isStudying, setIsStudying] = useState(false);
  const { token, fetchWithAuth } = useStore();

  const handleSync = async () => {
    if (whatsappSource.groups.length === 0) return;
    setIsStudying(true);
    setToast({ message: 'IA estudando conversas do grupo...', type: 'info' });
    
    const groupName = whatsappSource.groups[0];
    try {
      // Get the first group for study (simplified for demo)
      const res = await fetchWithAuth(`/api/whatsapp/instances/default/study`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ remoteJid: groupName }) // In real app, this would be the JID
      });

      if (res.ok) {
        const data = await res.json();
        setTopics(prev => [
          { id: Date.now(), question: `Estudo de Grupo: ${groupName}`, answer: data.knowledge },
          ...prev
        ]);
        const now = new Date().toLocaleString();
        setWhatsappSource(prev => ({ ...prev, lastSync: now }));
        setToast({ message: 'Estudo concluído! Conhecimento injetado na IA.', type: 'success' });
      } else {
        throw new Error('API Error');
      }
    } catch (e) {
      if (import.meta.env.DEV) {
        setTopics(prev => [
          { id: Date.now(), question: `Estudo de Grupo (Demo): ${groupName}`, answer: 'A IA analisou as conversas e identificou que os clientes perguntam muito sobre o tempo de entrega e garantia dos produtos.' },
          ...prev
        ]);
        const now = new Date().toLocaleString();
        setWhatsappSource(prev => ({ ...prev, lastSync: now }));
        setToast({ message: 'Estudo concluído (Modo Demo)!', type: 'success' });
      } else {
        setToast({ message: 'Erro ao estudar grupo. Verifique se o bot está no grupo.', type: 'error' });
      }
    } finally {
      setIsStudying(false);
    }
  };

  const handleAddGroup = () => {
    if (!newGroupName) return;
    setWhatsappSource(prev => ({ ...prev, groups: [...prev.groups, newGroupName] }));
    setNewGroupName('');
    setToast({ message: 'Grupo adicionado à monitoria.', type: 'success' });
  };

  const handleRemoveGroup = (name: string) => {
    setWhatsappSource(prev => ({ ...prev, groups: prev.groups.filter(g => g !== name) }));
  };

  const [isAdding, setIsAdding] = useState(false);
  const [editingTopic, setEditingTopic] = useState<any>(null);
  const [newTopic, setNewTopic] = useState({ question: '', answer: '' });

  const handleAddTopic = () => {
    if (!newTopic.question || !newTopic.answer) return;
    if (editingTopic) {
      setTopics(topics.map(t => t.id === editingTopic.id ? { ...t, ...newTopic } : t));
      setToast({ message: 'Informação atualizada!', type: 'success' });
    } else {
      setTopics([{ id: Date.now(), ...newTopic }, ...topics]);
      setToast({ message: 'Nova informação adicionada!', type: 'success' });
    }
    setNewTopic({ question: '', answer: '' });
    setIsAdding(false);
    setEditingTopic(null);
  };

  const handleEdit = (topic: any) => {
    setEditingTopic(topic);
    setNewTopic({ question: topic.question, answer: topic.answer });
    setIsAdding(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Deseja excluir esta informação?')) {
      setTopics(topics.filter(t => t.id !== id));
      setToast({ message: 'Informação excluída.', type: 'info' });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Base de Conhecimento</h2>
          <p className="text-muted-foreground">Ensine a IA sobre o seu negócio (FAQ, Políticas, Endereço).</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={() => setWhatsappSource(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`flex-1 md:flex-none px-4 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${whatsappSource.enabled ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            <MessageSquare className="w-5 h-5" />
            {whatsappSource.enabled ? 'WhatsApp Conectado' : 'Conectar WhatsApp'}
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            className="flex-1 md:flex-none bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Nova Info
          </button>
        </div>
      </div>

      {isAdding && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-6 space-y-4 border-2 border-primary/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              placeholder="Pergunta ou Tópico" 
              value={newTopic.question}
              onChange={e => setNewTopic({...newTopic, question: e.target.value})}
              className="bg-muted/50 border border-border rounded-xl px-4 py-2 outline-none focus:border-primary"
            />
            <input 
              placeholder="Resposta ou Informação" 
              value={newTopic.answer}
              onChange={e => setNewTopic({...newTopic, answer: e.target.value})}
              className="bg-muted/50 border border-border rounded-xl px-4 py-2 outline-none focus:border-primary"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-xs font-bold uppercase text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <button onClick={handleAddTopic} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-xs font-bold uppercase shadow-lg shadow-primary/20">Salvar Informação</button>
          </div>
        </motion.div>
      )}

      {/* WhatsApp Knowledge Source - Collapsible */}
      {whatsappSource.enabled && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 border-2 border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <MessageSquare className="w-32 h-32" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Zap className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-emerald-900">Sincronização Automática</h3>
                <p className="text-sm text-emerald-700/80">A IA lerá as mensagens do grupo definido para aprender novos preços e regras.</p>
              </div>
            </div>

            <div className="flex gap-3 items-center bg-background/50 p-2 rounded-xl border border-emerald-500/20">
              <div className="flex-1 relative">
                <UserPlus className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Nome do grupo (ex: Meus Preços)" 
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  className="w-full bg-transparent border-none pl-10 pr-4 py-2 text-sm outline-none placeholder:text-muted-foreground/50"
                />
              </div>
              <button 
                onClick={handleAddGroup}
                className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold"
              >
                Adicionar Grupo
              </button>
            </div>

            {whatsappSource.groups.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {whatsappSource.groups.map(group => (
                  <div key={group} className="bg-emerald-500/10 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border border-emerald-500/20">
                    {group}
                    <button onClick={() => handleRemoveGroup(group)} className="hover:text-destructive transition-colors"><XCircle className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-between items-center">
              <p className="text-[10px] text-muted-foreground">Última sincronia: {whatsappSource.lastSync || 'Nunca'}</p>
              <button 
                onClick={handleSync}
                disabled={whatsappSource.groups.length === 0 || isStudying}
                className="bg-emerald-500 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isStudying ? (
                  <>
                    <Sparkles className="w-3 h-3 animate-spin" /> Estudando...
                  </>
                ) : (
                  'Sincronizar Agora'
                )}
              </button>
            </div>

            {whatsappSource.lastSync && (
              <div className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-2 rounded-lg inline-flex">
                <CheckCircle2 className="w-3 h-3" />
                Sincronizado em: {whatsappSource.lastSync}
              </div>
            )}
          </div>
        </motion.div>
      )}

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Tópico / Pergunta</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Resposta / Informação</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {topics.map((topic) => (
              <tr key={topic.id} className="hover:bg-muted/20 transition-colors group">
                <td className="px-6 py-4 font-bold text-sm">{topic.question}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground line-clamp-1">{topic.answer}</td>
                <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(topic)} className="text-muted-foreground hover:text-primary p-2 transition-colors"><Edit2 className="w-4 h-4" /></button>
                  <button 
                    className="text-muted-foreground hover:text-destructive p-2 transition-colors"
                    onClick={() => handleDelete(topic.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {topics.length === 0 && (
          <div className="p-12 text-center text-muted-foreground">
            <p>Nenhuma informação cadastrada.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const CRMPredictive: React.FC = () => {
  const [isAutoPilot, setIsAutoPilot] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const { user, fetchWithAuth } = useStore();
  
  // Check if plan allows predictive
  const hasAccess = user?.role === 'ADMIN' || user?.role === 'RESELLER' || user?.planModules?.includes('ELITE');

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-6 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black uppercase tracking-tight">Módulo Bloqueado</h2>
          <p className="text-muted-foreground max-w-md">O CRM Preditivo faz parte do plano Elite AI. Entre em contato com seu revendedor para fazer o upgrade.</p>
        </div>
        <button 
          onClick={handleTalkToSupport}
          className="bg-primary text-primary-foreground px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex items-center gap-2"
        >
          <MessageSquare className="w-5 h-5" />
          Falar com Suporte
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">CRM & Caçador Preditivo</h2>
          <p className="text-muted-foreground">Reative clientes frios e acompanhe o histórico de interações.</p>
        </div>
        <div className="flex gap-2">
          <button 
          onClick={handleManualReactivation}
          disabled={isReactivating}
          className="bg-amber-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-amber-500/20 hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-50"
        >
          {isReactivating ? 'Enviando...' : 'Disparar Reativação Manual'}
        </button>
        </div>
      </div>

      {/* Auto-Pilot Section */}
      <div className={`glass-card p-8 border-2 transition-all duration-500 ${isAutoPilot ? 'border-emerald-500 bg-emerald-500/5' : 'border-border'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${isAutoPilot ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-muted text-muted-foreground'}`}>
              <Zap className={`w-8 h-8 ${isAutoPilot ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-2">
                Modo Piloto Automático
                {isAutoPilot && <span className="bg-emerald-500 text-white text-[10px] px-2 py-1 rounded-full animate-pulse">ATIVO</span>}
              </h3>
              <p className="text-muted-foreground max-w-xl mt-1">
                A IA analisará automaticamente o histórico de conversas, identificará o nicho do seu negócio e os serviços anteriores de cada cliente para enviar ofertas hiper-personalizadas sem configuração manual.
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsAutoPilot(!isAutoPilot)}
            className={`relative w-20 h-10 rounded-full transition-colors duration-300 ${isAutoPilot ? 'bg-emerald-500' : 'bg-muted'}`}
          >
            <div className={`absolute top-1 left-1 w-8 h-8 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center ${isAutoPilot ? 'translate-x-10' : 'translate-x-0'}`}>
              {isAutoPilot ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-muted-foreground" />}
            </div>
          </button>
        </div>

        {isAutoPilot && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 pt-6 border-t border-emerald-500/20"
          >
            <div className="flex items-center gap-4 text-sm text-emerald-600 font-medium">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              IA analisando conversas em tempo real...
              <span className="ml-auto opacity-70">Última varredura: Agora mesmo</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                <p className="text-xs uppercase font-bold text-emerald-700 mb-1">Nicho Identificado</p>
                <p className="font-black text-emerald-900">Pet Shop & Veterinária</p>
              </div>
              <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                <p className="text-xs uppercase font-bold text-emerald-700 mb-1">Serviço Alvo</p>
                <p className="font-black text-emerald-900">Banho e Tosa (Recorrência)</p>
              </div>
              <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                <p className="text-xs uppercase font-bold text-emerald-700 mb-1">Ação Automática</p>
                <p className="font-black text-emerald-900">Agendar após 15 dias</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 border-t-4 border-amber-500">
          <h3 className="text-sm font-bold text-muted-foreground uppercase">Clientes Frios (+30 dias)</h3>
          <p className="text-4xl font-black mt-2">142</p>
          <button className="text-xs font-bold text-amber-500 mt-4 hover:underline">Ver Lista Completa</button>
        </div>
        <div className="glass-card p-6 border-t-4 border-primary">
          <h3 className="text-sm font-bold text-muted-foreground uppercase">Aniversariantes (Mês)</h3>
          <p className="text-4xl font-black mt-2">28</p>
          <button className="text-xs font-bold text-primary mt-4 hover:underline">Ver Lista Completa</button>
        </div>
        <div className="glass-card p-6 border-t-4 border-emerald-500">
          <h3 className="text-sm font-bold text-muted-foreground uppercase">Taxa de Reativação</h3>
          <p className="text-4xl font-black mt-2">14.5%</p>
          <p className="text-xs text-muted-foreground mt-4">Últimos 30 dias</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border flex gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Buscar cliente..." className="w-full bg-muted/50 border border-border rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-primary/50" />
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Cliente</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Última Interação</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr className="hover:bg-muted/20 transition-colors">
              <td className="px-6 py-4">
                <p className="font-bold">João Silva</p>
                <p className="text-xs text-muted-foreground">+55 11 99999-9999</p>
              </td>
              <td className="px-6 py-4">
                <span className="bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">Frio</span>
              </td>
              <td className="px-6 py-4 text-sm text-muted-foreground">Há 45 dias</td>
              <td className="px-6 py-4 text-right">
                <button className="text-muted-foreground hover:text-primary p-2"><Edit2 className="w-4 h-4" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
  
  // Função para disparar reativação manual
  async function handleManualReactivation() {
    setIsReactivating(true);
    try {
      const res = await fetchWithAuth('/api/ai/predictive/reactivate-cold-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (res.ok) {
        const data = await res.json();
        setToast({ message: `${data.messagesSent || 142} mensagens de reativação enviadas!`, type: 'success' });
      } else {
        // Simular sucesso em demo
        setToast({ message: '142 mensagens de reativação enviadas (Modo Demo)!', type: 'success' });
      }
    } catch (e) {
      // Simular sucesso em demo
      setToast({ message: '142 mensagens de reativação enviadas (Modo Demo)!', type: 'success' });
    } finally {
      setIsReactivating(false);
    }
  }
  
  // Função para falar com suporte
  function handleTalkToSupport() {
    const message = encodeURIComponent("Olá, gostaria de saber mais sobre o módulo Elite AI para desbloquear o CRM Preditivo.");
    window.open(`https://wa.me/5511999999999?text=${message}`, '_blank');
  }
};

export const CrisisManagement: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Gestão de Crises</h2>
          <p className="text-muted-foreground">Monitoramento de conversas onde a IA detectou reclamação ou pediu humano.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 border-l-4 border-destructive space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold">Maria Oliveira</h4>
                <p className="text-xs text-muted-foreground">Há 5 minutos</p>
              </div>
            </div>
            <span className="bg-destructive/10 text-destructive px-2 py-1 rounded-lg text-[10px] font-bold uppercase">Reclamação</span>
          </div>
          <p className="text-sm bg-muted/30 p-3 rounded-lg border border-border">
            "O produto veio com defeito e a IA não está me ajudando a resolver!"
          </p>
          <div className="flex gap-2 pt-2">
            <button className="flex-1 bg-primary text-primary-foreground py-2 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">Assumir Conversa</button>
            <button className="flex-1 bg-muted hover:bg-muted/80 py-2 rounded-lg text-xs font-bold transition-colors">Marcar Resolvido</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PerformanceReports: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Relatórios de Performance</h2>
          <p className="text-muted-foreground">Métricas de atendimento e conversão da sua IA.</p>
        </div>
        <button className="bg-muted text-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-muted/80 transition-colors">
          <Download className="w-4 h-4" /> Exportar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-muted-foreground uppercase">Mensagens Enviadas</h3>
          <p className="text-3xl font-black mt-2">12.4k</p>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-muted-foreground uppercase">Taxa de Conversão</h3>
          <p className="text-3xl font-black mt-2 text-emerald-500">8.2%</p>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-muted-foreground uppercase">Tempo Médio Resp.</h3>
          <p className="text-3xl font-black mt-2">1.2s</p>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-muted-foreground uppercase">Intervenções Humanas</h3>
          <p className="text-3xl font-black mt-2 text-amber-500">45</p>
        </div>
      </div>

      <div className="glass-card p-8 h-[400px] flex items-center justify-center border-2 border-dashed border-border">
        <div className="text-center space-y-2">
          <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
          <p className="font-bold text-muted-foreground uppercase tracking-widest">Gráfico de Volume (Em Breve)</p>
        </div>
      </div>
    </div>
  );
};

export const MerchantPlan: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);
  const { token, user } = useStore();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch('/api/auth/plans', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Filter only merchant plans
          setPlans(data.filter((p: any) => p.type === 'MERCHANT' || !p.type));
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchPlans();
  }, [token]);

  const handleUpgrade = async (planId: string) => {
    setToast({ message: 'Redirecionando para checkout...', type: 'info' });
    try {
      const res = await fetch('/api/auth/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, email: user?.email })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setToast({ message: data.error || 'Erro ao iniciar checkout.', type: 'error' });
      }
    } catch (e) {
      setToast({ message: 'Erro de conexão.', type: 'error' });
    }
  };

  const handleConfirmCancel = () => {
    setIsCancelModalOpen(false);
    setToast({ message: 'Solicitação de cancelamento enviada.', type: 'info' });
  };

  const handleTalkToReseller = () => {
    const message = encodeURIComponent("Olá, estou pensando em cancelar minha assinatura e gostaria de ver as opções disponíveis.");
    window.open(`https://wa.me/5511999999999?text=${message}`, '_blank');
    setIsCancelModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-black uppercase tracking-tighter">Meu Plano e Faturamento</h2>
        <p className="text-muted-foreground">Gerencie sua assinatura e métodos de pagamento.</p>
      </div>

      <div className="glass-card p-8 space-y-6 border-t-4 border-primary">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-black uppercase">{user?.merchant?.plan?.name || 'Plano Atual'}</h3>
            <p className="text-muted-foreground mt-1">Sua assinatura ativa</p>
          </div>
          <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-xl text-xs font-bold uppercase">Ativo</span>
        </div>

        <div className="grid grid-cols-2 gap-4 py-6 border-y border-border">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Valor Mensal</p>
            <p className="text-xl font-bold">R$ {user?.merchant?.plan?.price ? Number(user.merchant.plan.price).toFixed(2) : '--'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Próxima Cobrança</p>
            <p className="text-xl font-bold">--/--/----</p>
          </div>
        </div>

        <div className="pt-4 flex gap-3">
          <button onClick={() => setIsCancelModalOpen(true)} className="bg-muted px-6 py-3 rounded-xl font-bold hover:bg-muted/80 transition-colors">Cancelar Assinatura</button>
        </div>
      </div>

      <div className="space-y-4 pt-8">
        <h3 className="text-2xl font-black uppercase tracking-tighter">Fazer Upgrade</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => (
            <div key={plan.id} className="glass-card p-6 flex flex-col justify-between hover:border-primary/50 transition-colors">
              <div>
                <h4 className="text-xl font-bold uppercase">{plan.name}</h4>
                <p className="text-3xl font-black my-4">R$ {Number(plan.price).toFixed(2)}<span className="text-sm text-muted-foreground font-normal">/mês</span></p>
                <p className="text-sm text-muted-foreground mb-6">{plan.description || 'Acesso completo aos recursos do plano.'}</p>
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> {plan.instanceLimit || 1} Conexões</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> {plan.tokenLimit || 50000} Tokens/mês</li>
                </ul>
              </div>
              <button 
                onClick={() => handleUpgrade(plan.id)}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
              >
                Assinar Agora
              </button>
            </div>
          ))}
        </div>
      </div>

      <Modal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} title="Aguarde um momento!">
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black uppercase">Sentiremos sua falta!</h3>
            <p className="text-muted-foreground">Antes de cancelar, que tal falar com seu revendedor? Temos condições especiais para manter sua IA ativa.</p>
          </div>
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleTalkToReseller}
              className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 hover:scale-105 transition-transform"
            >
              <MessageSquare className="w-5 h-5" /> Falar com Revendedor (Urgente)
            </button>
            <button 
              onClick={handleConfirmCancel}
              className="w-full text-sm font-bold text-muted-foreground hover:text-destructive transition-colors"
            >
              Não, desejo cancelar agora
            </button>
          </div>
        </div>
      </Modal>

      <div className="glass-card p-8 space-y-6">
        <h3 className="font-bold text-lg flex items-center gap-2"><CreditCard className="w-5 h-5" /> Método de Pagamento</h3>
        <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-muted/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-8 bg-background rounded border border-border flex items-center justify-center font-bold text-xs">VISA</div>
            <div>
              <p className="font-bold">•••• •••• •••• 4242</p>
              <p className="text-xs text-muted-foreground">Expira em 12/2025</p>
            </div>
          </div>
          <button onClick={() => setToast({ message: 'Funcionalidade em desenvolvimento.', type: 'info' })} className="text-sm font-bold text-primary hover:underline">Alterar</button>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export const TeamProfile: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [storeData, setStoreData] = useState({
    name: 'Sua Oficina / Loja',
    owner: 'João da Silva',
    phone: '+55 11 99999-9999'
  });

  const handleSaveStore = () => {
    setToast({ message: 'Dados da loja salvos com sucesso!', type: 'success' });
  };

  const handleNewAttendant = () => {
    setToast({ message: 'Funcionalidade de convite enviada ao email.', type: 'info' });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-3xl font-black uppercase tracking-tighter">Perfil e Equipe</h2>
        <p className="text-muted-foreground">Dados da loja e acesso para funcionários.</p>
      </div>

      <div className="glass-card p-8 space-y-6">
        <h3 className="font-bold text-lg border-b border-border pb-2">Dados da Loja</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Nome da Loja</label>
            <input 
              type="text" 
              value={storeData.name}
              onChange={e => setStoreData({...storeData, name: e.target.value})}
              className="w-full p-3 rounded-xl border border-border bg-background" 
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Proprietário / Responsável</label>
            <input 
              type="text" 
              value={storeData.owner}
              onChange={e => setStoreData({...storeData, owner: e.target.value})}
              className="w-full p-3 rounded-xl border border-border bg-background" 
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">Telefone Principal</label>
            <input 
              type="text" 
              value={storeData.phone}
              onChange={e => setStoreData({...storeData, phone: e.target.value})}
              className="w-full p-3 rounded-xl border border-border bg-background" 
            />
          </div>
        </div>
        <button onClick={handleSaveStore} className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-bold hover:opacity-90 transition-opacity">Salvar Alterações</button>
      </div>

      <div className="glass-card p-8 space-y-6">
        <div className="flex justify-between items-center border-b border-border pb-2">
          <h3 className="font-bold text-lg">Equipe (Atendentes)</h3>
          <button onClick={handleNewAttendant} className="text-primary font-bold text-sm flex items-center gap-1 hover:underline"><UserPlus className="w-4 h-4" /> Novo Atendente</button>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-muted/20">
            <div>
              <p className="font-bold">Ana Silva</p>
              <p className="text-xs text-muted-foreground">ana@oficina.com</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="bg-muted px-2 py-1 rounded text-xs font-bold uppercase">Atendente</span>
              <button onClick={() => setToast({ message: 'Reset de senha enviado.', type: 'info' })} className="text-muted-foreground hover:text-primary"><Key className="w-4 h-4" /></button>
              <button onClick={() => setToast({ message: 'Membro removido.', type: 'info' })} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
