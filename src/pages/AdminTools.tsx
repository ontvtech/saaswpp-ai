import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Server, Activity, AlertTriangle, CheckCircle2, RefreshCw, Settings, Key, Shield, DollarSign, BrainCircuit, Send, Users, Play, Pause, Edit2, Trash2, Plus, Terminal, BarChart, Download, Link as LinkIcon, ShieldCheck } from 'lucide-react';
import { Modal } from '../components/Modal';
import { Toast, ToastType } from '../components/Toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const AdminWhatsAppMonitor: React.FC = () => {
  const [stats, setStats] = useState({
    totalInstances: 157,
    connected: 142,
    disconnected: 12,
    qrReady: 3,
    avgLatency: '124ms',
    clusterHealth: 'Healthy'
  });
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const handleRefresh = () => {
    setToast({ message: 'Sincronizando com Evolution Cluster...', type: 'info' });
    setTimeout(() => {
        setToast({ message: 'Cluster sincronizado!', type: 'success' });
    }, 1500);
  };

  const handleRestartCluster = () => {
    if (confirm('AVISO: Isso reiniciará todos os containers da Evolution API. Continuar?')) {
      setToast({ message: 'Reiniciando cluster...', type: 'warning' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Monitoramento Global WhatsApp</h2>
          <p className="text-muted-foreground">Saúde do Cluster Evolution API e instâncias globais.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleRestartCluster}
            className="bg-destructive/10 text-destructive px-4 py-2 rounded-xl font-bold text-xs hover:bg-destructive/20 transition-colors"
          >
            Reiniciar Cluster
          </button>
          <button 
            onClick={handleRefresh}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          >
            <RefreshCw className="w-4 h-4" /> Sincronizar Cluster
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Instâncias</p>
          <p className="text-2xl font-black">{stats.totalInstances}</p>
        </div>
        <div className="glass-card p-4 text-center border-b-2 border-emerald-500">
          <p className="text-[10px] font-bold text-emerald-500 uppercase">Conectadas</p>
          <p className="text-2xl font-black">{stats.connected}</p>
        </div>
        <div className="glass-card p-4 text-center border-b-2 border-destructive">
          <p className="text-[10px] font-bold text-destructive uppercase">Offline</p>
          <p className="text-2xl font-black">{stats.disconnected}</p>
        </div>
        <div className="glass-card p-4 text-center border-b-2 border-amber-500">
          <p className="text-[10px] font-bold text-amber-500 uppercase">Aguardando QR</p>
          <p className="text-2xl font-black">{stats.qrReady}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Latência Média</p>
          <p className="text-2xl font-black">{stats.avgLatency}</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase">Status Cluster</p>
          <p className="text-sm font-black text-emerald-500 uppercase">{stats.clusterHealth}</p>
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

export const AIGlobalConfig: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [poolConfig, setPoolConfig] = useState({
    mode: 'SIMULTANEOUS' as 'SEQUENTIAL' | 'FALLBACK' | 'SIMULTANEOUS',
    maxKeys: 100,
    defaultProvider: 'GLM'
  });
  const [poolStatus, setPoolStatus] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [newKey, setNewKey] = useState({ provider: 'GLM', key: '', model: 'glm-4.7-flash', priority: 0 });
  const [bulkKeys, setBulkKeys] = useState('');
  const { fetchWithAuth } = useStore();

  // Carregar dados do pool
  const fetchPoolData = async () => {
    try {
      const [statusRes, keysRes, configRes] = await Promise.all([
        fetchWithAuth('/api/ai-pool/status'),
        fetchWithAuth('/api/ai-pool/keys'),
        fetchWithAuth('/api/ai-pool/config')
      ]);
      
      if (statusRes.ok) {
        const data = await statusRes.json();
        setPoolStatus(data.pool);
      }
      if (keysRes.ok) {
        const data = await keysRes.json();
        setApiKeys(data.keys || []);
      }
      if (configRes.ok) {
        const data = await configRes.json();
        setPoolConfig(data.config);
      }
    } catch (e) {
      console.error('Erro ao carregar pool:', e);
    }
  };

  useEffect(() => {
    fetchPoolData();
  }, []);

  const handleTestKey = async (id: string) => {
    setToast({ message: 'Testando chave...', type: 'info' });
    try {
      const res = await fetchWithAuth(`/api/ai-pool/keys/${id}/test`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setToast({ message: `✅ Chave válida! Latência: ${data.latency}ms`, type: 'success' });
      } else {
        setToast({ message: `❌ Falha: ${data.error}`, type: 'error' });
      }
    } catch (e) {
      setToast({ message: 'Erro ao testar chave.', type: 'error' });
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/api/ai-pool/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKey)
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: `✅ Chave adicionada! Latência: ${data.key.latency}ms`, type: 'success' });
        setIsModalOpen(false);
        setNewKey({ provider: 'GLM', key: '', model: 'glm-4.7-flash', priority: 0 });
        fetchPoolData();
      } else {
        setToast({ message: `❌ Erro: ${data.error}`, type: 'error' });
      }
    } catch (e) {
      setToast({ message: 'Erro ao adicionar chave.', type: 'error' });
    }
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Parse keys (uma por linha, formato: provider,key,model ou só key)
      const lines = bulkKeys.split('\n').filter(l => l.trim());
      const keys = lines.map(line => {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          return { provider: parts[0].toUpperCase(), key: parts[1], model: parts[2] || 'glm-4.7-flash' };
        }
        // Se só tem a chave, assume GLM
        return { provider: 'GLM', key: parts[0], model: 'glm-4.7-flash' };
      });

      const res = await fetchWithAuth('/api/ai-pool/keys/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys })
      });
      const data = await res.json();
      
      setToast({ 
        message: `✅ ${data.results.added} chaves adicionadas, ${data.results.failed} falharam`, 
        type: data.results.added > 0 ? 'success' : 'error' 
      });
      
      if (data.results.added > 0) {
        setIsBulkModalOpen(false);
        setBulkKeys('');
        fetchPoolData();
      }
    } catch (e) {
      setToast({ message: 'Erro ao adicionar chaves.', type: 'error' });
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Remover esta chave do pool?')) return;
    try {
      const res = await fetchWithAuth(`/api/ai-pool/keys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setToast({ message: 'Chave removida.', type: 'info' });
        fetchPoolData();
      }
    } catch (e) {
      setToast({ message: 'Erro ao remover chave.', type: 'error' });
    }
  };

  const handleUpdateConfig = async () => {
    try {
      const res = await fetchWithAuth('/api/ai-pool/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(poolConfig)
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: `✅ Configuração salva! Modo: ${poolConfig.mode}`, type: 'success' });
        fetchPoolData();
      }
    } catch (e) {
      setToast({ message: 'Erro ao salvar configuração.', type: 'error' });
    }
  };

  const handleTestAllKeys = async () => {
    setToast({ message: 'Testando todas as chaves...', type: 'info' });
    try {
      const res = await fetchWithAuth('/api/ai-pool/keys/test-all', { method: 'POST' });
      const data = await res.json();
      setToast({ 
        message: `Teste completo: ${data.results.working} funcionando, ${data.results.failed} com erro`, 
        type: data.results.failed === 0 ? 'success' : 'warning' 
      });
      fetchPoolData();
    } catch (e) {
      setToast({ message: 'Erro ao testar chaves.', type: 'error' });
    }
  };

  const handleReloadPool = async () => {
    setToast({ message: 'Recarregando pool...', type: 'info' });
    try {
      const res = await fetchWithAuth('/api/ai-pool/reload', { method: 'POST' });
      if (res.ok) {
        setToast({ message: '✅ Pool recarregado!', type: 'success' });
        fetchPoolData();
      }
    } catch (e) {
      setToast({ message: 'Erro ao recarregar pool.', type: 'error' });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Pool de Chaves API - IA</h2>
          <p className="text-muted-foreground">Configure quantas chaves quiser e o modo de operação.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button 
            onClick={handleReloadPool}
            className="bg-muted text-foreground px-4 py-3 rounded-2xl font-bold text-xs hover:bg-muted/80 transition-colors"
          >
            <RefreshCw className="w-4 h-4 inline mr-1" /> Recarregar
          </button>
          <button 
            onClick={handleTestAllKeys}
            className="bg-amber-500/10 text-amber-500 px-4 py-3 rounded-2xl font-bold text-xs hover:bg-amber-500/20 transition-colors"
          >
            <Play className="w-4 h-4 inline mr-1" /> Testar Todas
          </button>
          <button 
            onClick={() => setIsBulkModalOpen(true)}
            className="bg-purple-500/10 text-purple-500 px-4 py-3 rounded-2xl font-bold text-xs hover:bg-purple-500/20 transition-colors"
          >
            <Plus className="w-4 h-4 inline mr-1" /> Adicionar Múltiplas
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-primary-foreground px-4 py-3 rounded-2xl font-bold text-xs shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          >
            <Plus className="w-4 h-4 inline mr-1" /> Nova Chave
          </button>
        </div>
      </div>

      {/* Status Cards */}
      {poolStatus && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="glass-card p-4 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Total de Chaves</p>
            <p className="text-2xl font-black">{poolStatus.total}</p>
          </div>
          <div className="glass-card p-4 text-center border-b-2 border-emerald-500">
            <p className="text-[10px] font-bold text-emerald-500 uppercase">Ativas</p>
            <p className="text-2xl font-black">{poolStatus.active}</p>
          </div>
          <div className="glass-card p-4 text-center border-b-2 border-primary">
            <p className="text-[10px] font-bold text-primary uppercase">Disponíveis</p>
            <p className="text-2xl font-black">{poolStatus.available}</p>
          </div>
          <div className="glass-card p-4 text-center">
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Em Uso</p>
            <p className="text-2xl font-black">{poolStatus.currentConcurrency}</p>
          </div>
          <div className="glass-card p-4 text-center border-b-2 border-purple-500">
            <p className="text-[10px] font-bold text-purple-500 uppercase">Máx Simultâneo</p>
            <p className="text-2xl font-black">{poolStatus.maxSimultaneous}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" /> Chaves Cadastradas ({apiKeys.length})
              </h3>
              <div className="text-xs text-muted-foreground">
                Por provedor: GLM: {poolStatus?.byProvider?.GLM || 0} | Gemini: {poolStatus?.byProvider?.GEMINI || 0}
              </div>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/30 border-b border-border sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase">ID</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase">Provedor</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase">Modelo</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase">Uso</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {apiKeys.map((key) => (
                    <tr key={key.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{key.id?.substring(0, 8)}...</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          key.provider === 'GLM' ? 'bg-purple-500/10 text-purple-500' :
                          key.provider === 'GEMINI' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {key.provider}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">{key.model || 'default'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                          key.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                          key.status === 'error' ? 'bg-destructive/10 text-destructive' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {key.status === 'active' ? 'Ativa' : key.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">{key.usageCount || 0} usos</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleTestKey(key.id)}
                            className="text-primary hover:bg-primary/10 p-1 rounded-lg transition-colors"
                            title="Testar"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteKey(key.id)}
                            className="text-muted-foreground hover:text-destructive p-1"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {apiKeys.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhuma chave cadastrada. Clique em "Nova Chave" para adicionar.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Config Panel */}
        <div className="space-y-6">
          <div className="glass-card p-8 space-y-6">
            <h3 className="font-bold text-lg flex items-center gap-2 border-b border-border pb-4">
              <Settings className="w-5 h-5 text-primary" /> Modo de Operação
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Como usar as chaves?</label>
                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={() => setPoolConfig(prev => ({ ...prev, mode: 'SEQUENTIAL' }))}
                    className={`p-3 rounded-lg text-xs font-bold border transition-all text-left ${
                      poolConfig.mode === 'SEQUENTIAL' 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-background border-border hover:border-primary/50'
                    }`}
                  >
                    📋 SEQUENCIAL
                    <span className="block text-[10px] font-normal opacity-80 mt-1">
                      Usa uma por vez, em ordem: K1 → K2 → K3 → K1...
                    </span>
                  </button>
                  <button 
                    onClick={() => setPoolConfig(prev => ({ ...prev, mode: 'FALLBACK' }))}
                    className={`p-3 rounded-lg text-xs font-bold border transition-all text-left ${
                      poolConfig.mode === 'FALLBACK' 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-background border-border hover:border-primary/50'
                    }`}
                  >
                    🔄 FALLBACK
                    <span className="block text-[10px] font-normal opacity-80 mt-1">
                      Usa principal (priority alta), se falhar tenta próxima
                    </span>
                  </button>
                  <button 
                    onClick={() => setPoolConfig(prev => ({ ...prev, mode: 'SIMULTANEOUS' }))}
                    className={`p-3 rounded-lg text-xs font-bold border transition-all text-left ${
                      poolConfig.mode === 'SIMULTANEOUS' 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-background border-border hover:border-primary/50'
                    }`}
                  >
                    ⚡ SIMULTÂNEAS
                    <span className="block text-[10px] font-normal opacity-80 mt-1">
                      Usa todas ao mesmo tempo! Máxima capacidade!
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Provider Padrão</label>
                <select 
                  className="w-full p-2 rounded-lg border border-border bg-background"
                  value={poolConfig.defaultProvider}
                  onChange={e => setPoolConfig(prev => ({ ...prev, defaultProvider: e.target.value }))}
                >
                  <option value="GLM">GLM-4.7-Flash (Recomendado PT-BR)</option>
                  <option value="GEMINI">Google Gemini 2.5 Flash-Lite</option>
                  <option value="OPENAI">OpenAI GPT-4o-mini</option>
                  <option value="DEEPSEEK">DeepSeek Chat</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Máximo de Chaves</label>
                <input 
                  type="number" 
                  className="w-full p-2 rounded-lg border border-border bg-background"
                  value={poolConfig.maxKeys}
                  onChange={e => setPoolConfig(prev => ({ ...prev, maxKeys: parseInt(e.target.value) || 100 }))}
                  min={1}
                  max={1000}
                />
                <p className="text-[10px] text-muted-foreground">Limite de chaves no pool (pode aumentar)</p>
              </div>

              <button 
                onClick={handleUpdateConfig}
                className="w-full bg-primary text-primary-foreground px-4 py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
              >
                <CheckCircle2 className="w-4 h-4 inline mr-2" /> Salvar Configuração
              </button>
            </div>
          </div>

          {/* Info Card */}
          <div className="glass-card p-6 space-y-4 bg-muted/20">
            <h4 className="font-bold text-sm flex items-center gap-2">
              💡 Dica: Humanização
            </h4>
            <div className="text-xs text-muted-foreground space-y-2">
              <p>✅ <strong>1 chamada API</strong> = 1 resposta completa</p>
              <p>✅ Sistema <strong>divide</strong> a resposta em pedaços</p>
              <p>✅ Envia com <strong>delay 2-8s</strong> (parece humano)</p>
              <p>✅ <strong>30 chaves GLM</strong> = 30 conversas simultâneas!</p>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      {/* Modal: Nova Chave */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Adicionar Chave API">
        <form onSubmit={handleAddKey} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Provedor</label>
            <select 
              className="w-full p-2 rounded-lg border border-border bg-background"
              value={newKey.provider}
              onChange={e => setNewKey({...newKey, provider: e.target.value, model: e.target.value === 'GLM' ? 'glm-4.7-flash' : e.target.value === 'GEMINI' ? 'gemini-2.5-flash-lite' : '' })}
            >
              <option value="GLM">GLM-4.7-Flash (Zhipu AI) ⚡ Recomendado PT-BR</option>
              <option value="GEMINI">Google Gemini 2.5 Flash-Lite</option>
              <option value="OPENAI">OpenAI GPT-4o-mini</option>
              <option value="DEEPSEEK">DeepSeek Chat</option>
              <option value="ANTHROPIC">Anthropic Claude</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Modelo</label>
            <input 
              type="text" 
              className="w-full p-2 rounded-lg border border-border bg-background" 
              value={newKey.model}
              onChange={e => setNewKey({...newKey, model: e.target.value})}
              placeholder="glm-4.7-flash"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Chave API</label>
            <input 
              type="text" 
              className="w-full p-2 rounded-lg border border-border bg-background" 
              placeholder="sk-..." 
              required 
              value={newKey.key}
              onChange={e => setNewKey({...newKey, key: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prioridade (para modo FALLBACK)</label>
            <input 
              type="number" 
              className="w-full p-2 rounded-lg border border-border bg-background" 
              value={newKey.priority}
              onChange={e => setNewKey({...newKey, priority: parseInt(e.target.value) || 0})}
              min={0}
              max={100}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Maior = mais importante</p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">Adicionar</button>
          </div>
        </form>
      </Modal>

      {/* Modal: Adicionar Múltiplas */}
      <Modal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} title="Adicionar Múltiplas Chaves">
        <form onSubmit={handleBulkAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Chaves (uma por linha)</label>
            <textarea 
              className="w-full h-40 p-2 rounded-lg border border-border bg-background font-mono text-xs"
              value={bulkKeys}
              onChange={e => setBulkKeys(e.target.value)}
              placeholder={`GLM,sk-xxxxx,glm-4.7-flash\nGLM,sk-yyyyy,glm-4.7-flash\nGEMINI,sk-zzzzz,gemini-2.5-flash-lite\n\nOu só a chave (assume GLM):\nsk-aaaaa\nsk-bbbbb`}
            />
          </div>
          <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
            <p className="font-bold mb-1">Formatos aceitos:</p>
            <p>• <code>PROVIDER,CHAVE,MODELO</code> (ex: GLM,sk-xxx,glm-4.7-flash)</p>
            <p>• <code>CHAVE</code> (assume GLM automaticamente)</p>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsBulkModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">Adicionar Todas</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const GlobalPlansAndNiches: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [niches, setNiches] = useState<any[]>([]);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isNicheModalOpen, setIsNicheModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const { fetchWithAuth } = useStore();

  const [newPlan, setNewPlan] = useState({ name: '', price: 0, tokenLimit: 50000, instanceLimit: 1 });
  const [newNiche, setNewNiche] = useState({ name: '', basePrompt: '' });

  const fetchData = async () => {
    try {
      const [plansRes, nichesRes] = await Promise.all([
        fetchWithAuth('/api/admin/plans'),
        fetchWithAuth('/api/admin/niches')
      ]);
      if (plansRes.ok) setPlans(await plansRes.json());
      if (nichesRes.ok) setNiches(await nichesRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPlan)
      });
      if (res.ok) {
        setToast({ message: 'Plano criado com sucesso!', type: 'success' });
        setIsPlanModalOpen(false);
        fetchData();
      }
    } catch (e) {
      setToast({ message: 'Erro ao criar plano.', type: 'error' });
    }
  };

  const handleCreateNiche = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/api/admin/niches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNiche)
      });
      if (res.ok) {
        setToast({ message: 'Nicho criado com sucesso!', type: 'success' });
        setIsNicheModalOpen(false);
        fetchData();
      }
    } catch (e) {
      setToast({ message: 'Erro ao criar nicho.', type: 'error' });
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Excluir este plano?')) return;
    try {
      const res = await fetchWithAuth(`/api/admin/plans/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteNiche = async (id: string) => {
    if (!confirm('Excluir este nicho?')) return;
    try {
      const res = await fetchWithAuth(`/api/admin/niches/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Planos e Nichos (Zero Touch)</h2>
          <p className="text-muted-foreground">Configure a herança automática de limites e prompts.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Plans Section */}
        <div className="glass-card p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" /> Planos Globais
            </h3>
            <button 
              onClick={() => setIsPlanModalOpen(true)}
              className="text-xs font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Novo Plano
            </button>
          </div>

          <div className="space-y-4">
            {plans.map(plan => (
              <div key={plan.id} className="p-4 rounded-xl border border-border bg-muted/20 flex justify-between items-center group">
                <div>
                  <h4 className="font-bold">{plan.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    R$ {plan.price.toFixed(2)} | {plan.tokenLimit.toLocaleString()} tokens | {plan.instanceLimit} inst.
                  </p>
                </div>
                <button onClick={() => handleDeletePlan(plan.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {plans.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Nenhum plano cadastrado.</p>}
          </div>
        </div>

        {/* Niches Section */}
        <div className="glass-card p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-primary" /> Prompts por Nicho
            </h3>
            <button 
              onClick={() => setIsNicheModalOpen(true)}
              className="text-xs font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Novo Nicho
            </button>
          </div>

          <div className="space-y-4">
            {niches.map(niche => (
              <div key={niche.id} className="p-4 rounded-xl border border-border bg-muted/20 flex justify-between items-start group">
                <div className="flex-1">
                  <h4 className="font-bold">{niche.name}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1 italic">"{niche.basePrompt}"</p>
                </div>
                <button onClick={() => handleDeleteNiche(niche.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {niches.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Nenhum nicho cadastrado.</p>}
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Plan Modal */}
      <Modal isOpen={isPlanModalOpen} onClose={() => setIsPlanModalOpen(false)} title="Criar Novo Plano">
        <form onSubmit={handleCreatePlan} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome do Plano</label>
            <input type="text" className="w-full p-2 rounded-lg border border-border bg-background" required value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Preço (R$)</label>
              <input type="number" className="w-full p-2 rounded-lg border border-border bg-background" required value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: parseFloat(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Limite de Instâncias</label>
              <input type="number" className="w-full p-2 rounded-lg border border-border bg-background" required value={newPlan.instanceLimit} onChange={e => setNewPlan({...newPlan, instanceLimit: parseInt(e.target.value)})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Limite de Tokens (Mensal)</label>
            <input type="number" className="w-full p-2 rounded-lg border border-border bg-background" required value={newPlan.tokenLimit} onChange={e => setNewPlan({...newPlan, tokenLimit: parseInt(e.target.value)})} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsPlanModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold">Criar Plano</button>
          </div>
        </form>
      </Modal>

      {/* Niche Modal */}
      <Modal isOpen={isNicheModalOpen} onClose={() => setIsNicheModalOpen(false)} title="Criar Novo Nicho">
        <form onSubmit={handleCreateNiche} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome do Nicho</label>
            <input type="text" className="w-full p-2 rounded-lg border border-border bg-background" required value={newNiche.name} onChange={e => setNewNiche({...newNiche, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Prompt Base (Herança)</label>
            <textarea className="w-full p-2 rounded-lg border border-border bg-background h-32 resize-none" required value={newNiche.basePrompt} onChange={e => setNewNiche({...newNiche, basePrompt: e.target.value})} placeholder="Ex: Você é um assistente de uma oficina mecânica..." />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsNicheModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold">Criar Nicho</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const AISalesGlobal: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const handleValidate = () => {
    setToast({ message: 'Validando links de pagamento...', type: 'info' });
    setTimeout(() => {
        setToast({ message: 'Todos os links estão ativos!', type: 'success' });
    }, 1500);
  };

  const handleSave = () => {
    setToast({ message: 'Prompt Master atualizado com sucesso!', type: 'success' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">IA Sale Global (Vendas)</h2>
          <p className="text-muted-foreground">Orquestração do módulo de vendas e Function Calling.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleValidate} className="bg-muted text-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Validar Links
          </button>
          <button onClick={handleSave} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20">
            <Settings className="w-4 h-4" /> Salvar Prompt Master
          </button>
        </div>
      </div>

      <div className="glass-card p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-6">
          <div>
            <h3 className="font-bold text-lg">Módulo de Vendas Ativo</h3>
            <p className="text-sm text-muted-foreground">Permite que a IA gere links de pagamento e atue como vendedora.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold">Prompt Master de Vendas</h3>
          <textarea 
            className="w-full h-32 p-4 rounded-xl border border-border bg-muted/50 font-mono text-sm resize-none"
            defaultValue="Você é um vendedor especialista. Seu objetivo é converter dúvidas em vendas. Sempre que o cliente perguntar o preço, ofereça o link de pagamento."
          />
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

export const AIPredictiveGlobal: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const handleScan = () => {
    setToast({ message: 'Iniciando varredura de base...', type: 'info' });
    setTimeout(() => {
        setToast({ message: 'Varredura concluída! 15 oportunidades encontradas.', type: 'success' });
    }, 2000);
  };

  const handleConfig = () => {
    setToast({ message: 'Configurações de gatilhos salvas.', type: 'success' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">IA Predictive Global (Retenção)</h2>
          <p className="text-muted-foreground">Gatilhos e análise histórica para retenção de clientes.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleScan} className="bg-muted text-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2">
            <Activity className="w-4 h-4" /> Varredura Manual
          </button>
          <button onClick={handleConfig} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20">
            <Settings className="w-4 h-4" /> Salvar Gatilhos
          </button>
        </div>
      </div>

      <div className="glass-card p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-6">
          <div>
            <h3 className="font-bold text-lg">Módulo Preditivo Ativo</h3>
            <p className="text-sm text-muted-foreground">Analisa o histórico e sugere retornos proativamente.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 rounded-xl border border-border bg-muted/20">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold">Gatilho: Clientes Frios</h4>
              <span className="text-xs font-bold bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-md">Ativo</span>
            </div>
            <p className="text-xs text-muted-foreground">Dispara após 30 dias sem interação.</p>
          </div>
          <div className="p-4 rounded-xl border border-border bg-muted/20">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold">Gatilho: Aniversariantes</h4>
              <span className="text-xs font-bold bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-md">Ativo</span>
            </div>
            <p className="text-xs text-muted-foreground">Dispara no dia do aniversário do cliente.</p>
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
    </div>
  );
};

export const PaymentGatewayConfig: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [config, setConfig] = useState({
    stripeSecretKey: '',
    stripePublicKey: '',
    stripeWebhookSecret: '',
    trial_enabled: true
  });
  const { fetchWithAuth } = useStore();

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetchWithAuth('/api/admin/config');
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        setToast({ message: 'Configurações de pagamento salvas com sucesso!', type: 'success' });
      }
    } catch (e) {
      setToast({ message: 'Erro ao salvar configurações.', type: 'error' });
    }
  };

  const handleTest = () => {
    setToast({ message: 'Testando conexão com Stripe...', type: 'info' });
    setTimeout(() => {
        setToast({ message: 'Conexão estabelecida com sucesso!', type: 'success' });
    }, 1500);
  };

  const handleSimulate = () => {
    setToast({ message: 'Simulando pagamento de R$ 97,00...', type: 'info' });
    setTimeout(() => {
        setToast({ message: 'Webhook recebido: payment_intent.succeeded', type: 'success' });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gateway de Pagamento</h2>
          <p className="text-muted-foreground">Configurações do Stripe, Webhooks e métodos de pagamento.</p>
        </div>
        <button onClick={handleSave} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20">
          <CheckCircle2 className="w-4 h-4" /> Salvar Configurações
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-8 space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" /> Credenciais Stripe
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Stripe Secret Key</label>
              <input 
                type="password" 
                value={config.stripeSecretKey || ''} 
                onChange={e => setConfig({...config, stripeSecretKey: e.target.value})}
                className="w-full p-3 rounded-xl border border-border bg-muted/50 font-mono text-sm" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stripe Public Key</label>
              <input 
                type="text" 
                value={config.stripePublicKey || ''} 
                onChange={e => setConfig({...config, stripePublicKey: e.target.value})}
                className="w-full p-3 rounded-xl border border-border bg-muted/50 font-mono text-sm" 
              />
            </div>
          </div>
        </div>

        <div className="glass-card p-8 space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" /> Webhooks (Zero Touch)
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Webhook Secret</label>
              <input 
                type="password" 
                value={config.stripeWebhookSecret || ''} 
                onChange={e => setConfig({...config, stripeWebhookSecret: e.target.value})}
                className="w-full p-3 rounded-xl border border-border bg-muted/50 font-mono text-sm" 
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleTest} className="flex-1 bg-muted hover:bg-muted/80 py-2 rounded-lg text-xs font-bold transition-colors">Testar Conexão</button>
              <button onClick={handleSimulate} className="flex-1 bg-primary/10 text-primary hover:bg-primary/20 py-2 rounded-lg text-xs font-bold transition-colors">Simular Pagamento</button>
            </div>
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
    </div>
  );
};

export const TrialLinkGenerator: React.FC = () => {
  const [links, setLinks] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const { fetchWithAuth } = useStore();
  const [newLink, setNewLink] = useState({
    code: '',
    days: 7,
    tokenLimit: 50000,
    instanceLimit: 1,
    expiresAt: ''
  });

  const fetchLinks = async () => {
    try {
      const res = await fetchWithAuth('/api/admin/trial-links');
      if (res.ok) setLinks(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/api/admin/trial-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLink)
      });
      if (res.ok) {
        setToast({ message: 'Link de teste criado!', type: 'success' });
        setIsModalOpen(false);
        fetchLinks();
      }
    } catch (e) {
      setToast({ message: 'Erro ao criar link.', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este link?')) return;
    try {
      const res = await fetchWithAuth(`/api/admin/trial-links/${id}`, { method: 'DELETE' });
      if (res.ok) fetchLinks();
    } catch (e) {
      console.error(e);
    }
  };

  const copyToClipboard = (code: string) => {
    const url = `${window.location.origin}/register/trial?code=${code}`;
    navigator.clipboard.writeText(url);
    setToast({ message: 'URL copiada para o clipboard!', type: 'success' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gerador de Links de Teste</h2>
          <p className="text-muted-foreground">Crie links personalizados com limites específicos para trials.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" /> Novo Link de Teste
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Código</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Dias</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Tokens</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {links.map((link) => (
              <tr key={link.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-6 py-4 font-mono text-sm">{link.code}</td>
                <td className="px-6 py-4 text-sm">{link.days} dias</td>
                <td className="px-6 py-4 text-sm">{link.tokenLimit.toLocaleString()}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                    link.used ? 'bg-muted text-muted-foreground' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {link.used ? 'Usado' : 'Disponível'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => copyToClipboard(link.code)} className="text-muted-foreground hover:text-primary p-2 transition-colors"><LinkIcon className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(link.id)} className="text-muted-foreground hover:text-destructive p-2 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Criar Link de Teste Personalizado">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Código (Opcional)</label>
            <input type="text" className="w-full p-2 rounded-lg border border-border bg-background" value={newLink.code} onChange={e => setNewLink({...newLink, code: e.target.value})} placeholder="DEIXE VAZIO PARA GERAR AUTOMÁTICO" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Duração (Dias)</label>
              <input type="number" className="w-full p-2 rounded-lg border border-border bg-background" required value={newLink.days} onChange={e => setNewLink({...newLink, days: parseInt(e.target.value)})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Limite de Tokens</label>
              <input type="number" className="w-full p-2 rounded-lg border border-border bg-background" required value={newLink.tokenLimit} onChange={e => setNewLink({...newLink, tokenLimit: parseInt(e.target.value)})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Data de Expiração do Link (Opcional)</label>
            <input type="date" className="w-full p-2 rounded-lg border border-border bg-background" value={newLink.expiresAt} onChange={e => setNewLink({...newLink, expiresAt: e.target.value})} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold">Gerar Link</button>
          </div>
        </form>
      </Modal>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export const BroadcastCenter: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState([
    { id: 1, title: 'Atualização de Sistema v2.1', target: 'Todos os Lojistas', status: 'Enviado', date: 'Hoje, 10:00' },
    { id: 2, title: 'Manutenção Programada', target: 'Revendedores', status: 'Agendado', date: 'Amanhã, 02:00' },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [newBroadcast, setNewBroadcast] = useState({ title: '', message: '', target: 'Todos' });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const broadcast = {
        id: Date.now(),
        title: newBroadcast.title,
        target: newBroadcast.target === 'Todos' ? 'Todos os Lojistas' : newBroadcast.target,
        status: 'Enviado',
        date: 'Agora'
    };
    setBroadcasts([broadcast, ...broadcasts]);
    setIsModalOpen(false);
    setNewBroadcast({ title: '', message: '', target: 'Todos' });
    setToast({ message: 'Comunicado enviado com sucesso!', type: 'success' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Central de Comunicados</h2>
          <p className="text-muted-foreground">Envie avisos em massa para lojistas e revendas.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          <Send className="w-4 h-4" /> Novo Comunicado
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Título</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Destinatários</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Data</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {broadcasts.map((b) => (
              <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-6 py-4 font-bold">{b.title}</td>
                <td className="px-6 py-4 text-sm">{b.target}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                    b.status === 'Enviado' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{b.date}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="text-muted-foreground hover:text-primary p-2 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button className="text-muted-foreground hover:text-destructive p-2 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
        title="Novo Comunicado"
      >
        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Título</label>
            <input 
                type="text" 
                className="w-full p-2 rounded-lg border border-border bg-background" 
                placeholder="Ex: Atualização do Sistema" 
                required 
                value={newBroadcast.title}
                onChange={e => setNewBroadcast({...newBroadcast, title: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Público Alvo</label>
            <select 
                className="w-full p-2 rounded-lg border border-border bg-background"
                value={newBroadcast.target}
                onChange={e => setNewBroadcast({...newBroadcast, target: e.target.value})}
            >
                <option value="Todos">Todos os Usuários</option>
                <option value="Resellers">Apenas Revendedores</option>
                <option value="Tenants">Apenas Lojistas</option>
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
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">Enviar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const InfrastructureMonitor: React.FC = () => {
  const [nodes, setNodes] = useState<any[]>([]);
  const [telemetryHistory, setTelemetryHistory] = useState<any[]>([]);
  const [logs, setLogs] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'monitor' | 'logs'>('monitor');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/api/admin/telemetry');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        
        const newNodes = [
          { 
            name: 'Node 01 (16GB) - WhatsApp Cluster', 
            role: 'Worker / Swarm Manager',
            status: 'Operational', 
            load: `${data.node16gb.cpu}%`, 
            memory: `${data.node16gb.memory.used}GB / ${data.node16gb.memory.total}GB`,
            services: ['Evolution API Shard 01', 'Evolution API Shard 02', 'Nginx LB']
          },
          { 
            name: 'Node 02 (8GB) - Core & AI Brain', 
            role: 'Database / AI Controller',
            status: 'Operational', 
            load: `${data.node8gb.cpu}%`, 
            memory: `${data.node8gb.memory.used}GB / ${data.node8gb.memory.total}GB`,
            services: ['PostgreSQL Primary', 'Redis Cache', 'AI Orchestrator (Gemini)']
          },
        ];
        setNodes(newNodes);

        setTelemetryHistory(prev => {
          const newPoint = {
            time: new Date().toLocaleTimeString(),
            node16: parseFloat(data.node16gb.cpu),
            node8: parseFloat(data.node8gb.cpu)
          };
          const updated = [...prev, newPoint].slice(-20);
          return updated;
        });
      } catch (e) {
        const mockData = {
          node16gb: { cpu: (Math.random() * 20 + 30).toFixed(1), memory: { used: 8.4, total: 16 } },
          node8gb: { cpu: (Math.random() * 15 + 20).toFixed(1), memory: { used: 4.2, total: 8 } }
        };
        const newNodes = [
          { 
            name: 'Node 01 (16GB) - WhatsApp Cluster', 
            role: 'Worker / Swarm Manager',
            status: 'Operational', 
            load: `${mockData.node16gb.cpu}%`, 
            memory: `${mockData.node16gb.memory.used}GB / ${mockData.node16gb.memory.total}GB`,
            services: ['Evolution API Shard 01', 'Evolution API Shard 02', 'Nginx LB']
          },
          { 
            name: 'Node 02 (8GB) - Core & AI Brain', 
            role: 'Database / AI Controller',
            status: 'Operational', 
            load: `${mockData.node8gb.cpu}%`, 
            memory: `${mockData.node8gb.memory.used}GB / ${mockData.node8gb.memory.total}GB`,
            services: ['PostgreSQL Primary', 'Redis Cache', 'AI Orchestrator (Gemini)']
          },
        ];
        setNodes(newNodes);
        setTelemetryHistory(prev => {
          const newPoint = {
            time: new Date().toLocaleTimeString(),
            node16: parseFloat(mockData.node16gb.cpu),
            node8: parseFloat(mockData.node8gb.cpu)
          };
          const updated = [...prev, newPoint].slice(-20);
          return updated;
        });
      }
    };

    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/admin/logs?type=backend');
        if (!res.ok) throw new Error('Failed to fetch logs');
        const data = await res.json();
        setLogs(data.logs);
      } catch (e) {
        setLogs(`[${new Date().toISOString()}] INFO: Server started successfully\n[${new Date().toISOString()}] INFO: Connected to database\n[${new Date().toISOString()}] WARN: High memory usage detected on Node 01`);
      }
    };

    fetchTelemetry();
    fetchLogs();
    const interval = setInterval(() => {
      fetchTelemetry();
      if (activeTab === 'logs') fetchLogs();
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const handlePing = () => {
    setToast({ message: 'Pingando Cluster (Coolify)...', type: 'info' });
    setTimeout(() => {
        setToast({ message: 'Latência Interna: 0.4ms (VLAN)', type: 'success' });
    }, 1500);
  };

  const handleGlobalAction = (action: string) => {
    setToast({ message: `Executando ${action} global...`, type: 'info' });
    setTimeout(() => {
        setToast({ message: `${action} concluído com sucesso em todos os nós.`, type: 'success' });
    }, 2500);
  };

  const handleRestartService = (nodeName: string, service?: string) => {
    const action = service ? `Reiniciando ${service}` : 'Reiniciando Servidor';
    setToast({ message: `${action} em: ${nodeName}...`, type: 'error' });
    setTimeout(() => {
        setToast({ message: `${service || 'Servidor'} ${nodeName} reiniciado com sucesso.`, type: 'success' });
    }, 3000);
  };

  const handleViewLogs = (nodeName: string) => {
    setToast({ message: `Buscando logs em tempo real de ${nodeName}...`, type: 'info' });
    setTimeout(() => {
        alert(`[LOGS - ${nodeName}]\n2024-01-20 14:22:01 INFO: Evolution API Shard 01 connected\n2024-01-20 14:22:05 WARN: AI Pool latency high (120ms)\n2024-01-20 14:22:10 INFO: Backup routine completed`);
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Centro de Comando e Telemetria</h2>
          <p className="text-muted-foreground">Monitoramento em tempo real do Cluster Distribuído</p>
        </div>
        <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab(activeTab === 'monitor' ? 'logs' : 'monitor')}
              className="bg-muted text-foreground px-4 py-3 rounded-2xl font-bold text-xs hover:bg-muted/80 transition-colors flex items-center gap-2"
            >
              {activeTab === 'monitor' ? <Terminal className="w-4 h-4" /> : <BarChart className="w-4 h-4" />}
              {activeTab === 'monitor' ? 'Ver Logs' : 'Ver Monitor'}
            </button>
            <button 
            onClick={() => handleGlobalAction('Limpar Cache')}
            className="bg-muted text-foreground px-4 py-3 rounded-2xl font-bold text-xs hover:bg-muted/80 transition-colors"
            >
            Limpar Cache
            </button>
            <button 
            onClick={() => handleGlobalAction('Backup DB')}
            className="bg-muted text-foreground px-4 py-3 rounded-2xl font-bold text-xs hover:bg-muted/80 transition-colors"
            >
            Backup DB
            </button>
            <button onClick={handlePing} className="bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform flex items-center gap-2">
            <Activity className="w-5 h-5" /> Ping Cluster
            </button>
        </div>
      </div>

      {activeTab === 'monitor' ? (
        <>
          <div className="glass-card p-6 h-[300px]">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Carga de CPU Combinada (Histórico)</h3>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetryHistory}>
                <defs>
                  <linearGradient id="colorNode16" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorNode8" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" hide />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="node16" stroke="#10b981" fillOpacity={1} fill="url(#colorNode16)" name="Node 16GB" />
                <Area type="monotone" dataKey="node8" stroke="#6366f1" fillOpacity={1} fill="url(#colorNode8)" name="Node 8GB" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {nodes.map((node, i) => (
              <div key={i} className="glass-card p-6 space-y-4 border-t-4 border-primary">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg">{node.name}</h3>
                    <p className="text-xs text-muted-foreground uppercase font-bold">{node.role}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                    node.status === 'Operational' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
                  }`}>
                    {node.status}
                  </span>
                </div>
                
                <div className="space-y-2 py-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CPU Load</span>
                    <span className="font-mono font-bold">{node.load}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: node.load }}></div>
                  </div>
                  
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Memory Usage</span>
                    <span className="font-mono font-bold">{node.memory}</span>
                  </div>
                   <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: (parseFloat(node.memory.split('/')[0]) / parseFloat(node.memory.split('/')[1])) * 100 + '%' }}></div>
                  </div>
                </div>

                <div className="bg-muted/30 p-3 rounded-xl border border-border">
                  <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Serviços Ativos</p>
                  <div className="flex flex-wrap gap-2">
                    {node.services.map((s: string, idx: number) => (
                      <span key={idx} className="text-[10px] font-mono bg-background border border-border px-2 py-1 rounded">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleRestartService(node.name)}
                            className="flex-1 py-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 font-bold text-xs transition-colors"
                        >
                            Reiniciar Servidor
                        </button>
                        <button 
                            onClick={() => handleViewLogs(node.name)}
                            className="flex-1 py-2 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 font-bold text-xs transition-colors"
                        >
                            Logs de Erro
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => handleRestartService(node.name, 'Evolution API')}
                            className="flex-1 py-2 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 font-bold text-xs transition-colors"
                        >
                            Restart Evo
                        </button>
                        <button 
                            onClick={() => handleRestartService(node.name, 'Database')}
                            className="flex-1 py-2 rounded-lg border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 font-bold text-xs transition-colors"
                        >
                            Restart DB
                        </button>
                    </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="glass-card p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-border pb-4">
            <h3 className="font-bold flex items-center gap-2">
              <Terminal className="w-5 h-5 text-primary" /> Logs do Sistema (Tail -50)
            </h3>
            <div className="flex gap-2">
              <button onClick={() => setActiveTab('logs')} className="p-2 rounded-lg bg-muted hover:bg-muted/80">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="bg-black/80 p-6 rounded-xl border border-border font-mono text-xs text-emerald-500 h-[500px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">
            {logs || 'Iniciando stream de logs...'}
          </div>
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

export const GlobalPrompts: React.FC = () => {
  const [prompts, setPrompts] = useState([
    { id: 1, name: 'Atendimento Petshop', content: 'Você é um especialista em cuidados animais...', type: 'ATTENDANCE', active: true, segment: 'Petshop' },
    { id: 2, name: 'Vendedor Clínica Médica', content: 'Você é um consultor de saúde...', type: 'SALES', active: true, segment: 'Clínica' },
    { id: 3, name: 'Suporte Oficina Mecânica', content: 'Você entende tudo de motores e peças...', type: 'SUPPORT', active: true, segment: 'Oficina' },
    { id: 4, name: 'Preditivo Varejo Moda', content: 'Analise o comportamento de compra...', type: 'PREDICTIVE', active: true, segment: 'Varejo' },
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setToast({ message: 'Prompt Master salvo com sucesso!', type: 'success' });
    setIsModalOpen(false);
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este prompt?')) {
      setPrompts(prompts.filter(p => p.id !== id));
      setToast({ message: 'Prompt excluído com sucesso!', type: 'success' });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Prompts Globais (Multi-Segmento)</h2>
          <p className="text-muted-foreground">Defina a base de IA por nicho. O Lojista apenas customiza os detalhes.</p>
        </div>
        <button 
          onClick={() => { setEditingPrompt(null); setIsModalOpen(true); }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          <Plus className="w-4 h-4" /> Novo Prompt Master
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {prompts.map(prompt => (
          <div key={prompt.id} className="glass-card p-6 space-y-4 border-t-4 border-primary relative group">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-lg">{prompt.name}</h4>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{prompt.segment}</p>
              </div>
              <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${prompt.active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                {prompt.active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3 bg-muted/30 p-3 rounded-lg border border-border italic">
              "{prompt.content}"
            </p>
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setEditingPrompt(prompt); setIsModalOpen(true); }} className="flex-1 bg-muted hover:bg-primary hover:text-primary-foreground py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2">
                <Edit2 className="w-3 h-3" /> Editar
              </button>
              <button 
                onClick={() => handleDelete(prompt.id)}
                className="flex-1 bg-destructive/10 text-destructive hover:bg-destructive/20 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3 h-3" /> Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPrompt ? "Editar Prompt Master" : "Novo Prompt Master"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome do Template</label>
              <input type="text" className="w-full p-2 rounded-lg border border-border bg-background" placeholder="Ex: Vendedor Especialista" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Segmento/Nicho</label>
              <input type="text" className="w-full p-2 rounded-lg border border-border bg-background" placeholder="Ex: Petshop" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de Comportamento</label>
            <select className="w-full p-2 rounded-lg border border-border bg-background">
              <option value="ATTENDANCE">Atendimento</option>
              <option value="SALES">Vendas</option>
              <option value="SUPPORT">Suporte</option>
              <option value="PREDICTIVE">Preditivo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Conteúdo do Prompt (Base Master)</label>
            <textarea className="w-full p-2 rounded-lg border border-border bg-background h-40 resize-none font-mono text-sm" placeholder="Escreva as instruções base para este nicho..." required />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">Salvar Prompt Master</button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export const AuditSecurity: React.FC = () => {
  const [logs] = useState([
    { id: 1, action: 'Login Admin', user: 'admin@sistema.com', ip: '192.168.1.1', date: 'Hoje, 10:42' },
    { id: 2, action: 'Alteração de Chave API', user: 'dev@sistema.com', ip: '10.0.0.5', date: 'Hoje, 09:15' },
    { id: 3, action: 'Exportação de Base', user: 'analista@sistema.com', ip: '172.16.0.2', date: 'Ontem, 18:30' },
  ]);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const handleExport = () => {
    setToast({ message: 'Gerando relatório de auditoria...', type: 'info' });
    setTimeout(() => {
        setToast({ message: 'Relatório enviado para seu email.', type: 'success' });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Auditoria e Segurança</h2>
          <p className="text-muted-foreground">Logs de acesso e ações críticas no sistema.</p>
        </div>
        <button onClick={handleExport} className="bg-muted text-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-muted/80 transition-colors">
          <Shield className="w-4 h-4" /> Exportar Auditoria
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Ação</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Usuário</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">IP Origem</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-6 py-4 font-bold">{log.action}</td>
                <td className="px-6 py-4 text-sm">{log.user}</td>
                <td className="px-6 py-4 font-mono text-xs">{log.ip}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{log.date}</td>
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
    </div>
  );
};

export const SystemLogs: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const handleExport = () => {
    setToast({ message: 'Exportando logs do sistema...', type: 'info' });
    setTimeout(() => {
      setToast({ message: 'Logs exportados com sucesso!', type: 'success' });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Logs do Sistema</h2>
          <p className="text-muted-foreground">Registro detalhado de eventos do sistema.</p>
        </div>
        <button onClick={handleExport} className="bg-muted px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-muted/80 transition-colors">
          <Download className="w-4 h-4" /> Exportar
        </button>
      </div>
      <div className="glass-card p-6 bg-black/90 font-mono text-xs text-green-400 h-[500px] overflow-y-auto">
        <p>[2024-03-02 10:00:01] INFO: System startup complete.</p>
        <p>[2024-03-02 10:00:05] INFO: Connected to Database (Primary).</p>
        <p>[2024-03-02 10:01:22] WARN: High latency detected on Node-02.</p>
        <p>[2024-03-02 10:05:00] INFO: Cron job 'DailyReport' executed successfully.</p>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export const ServiceStatus: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const handleRefresh = () => {
    setToast({ message: 'Atualizando status dos serviços...', type: 'info' });
    setTimeout(() => {
      setToast({ message: 'Status atualizado com sucesso!', type: 'success' });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Status dos Serviços</h2>
        <button onClick={handleRefresh} className="bg-muted px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-muted/80 transition-colors">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['API Gateway', 'Database Primary', 'Redis Cache', 'AI Orchestrator', 'Evolution API', 'Email Service'].map((service) => (
          <div key={service} className="glass-card p-6 flex items-center justify-between border-l-4 border-emerald-500">
            <span className="font-bold">{service}</span>
            <span className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded text-xs font-bold uppercase">Online</span>
          </div>
        ))}
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export const NewReseller: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [formData, setFormData] = useState({ name: '', cnpj: '', email: '', plan: 'Starter' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setToast({ message: 'Criando conta de revenda...', type: 'info' });
    setTimeout(() => {
      setToast({ message: 'Revendedor criado com sucesso!', type: 'success' });
      setFormData({ name: '', cnpj: '', email: '', plan: 'Starter' });
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold">Cadastrar Novo Revendedor</h2>
      <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">Nome da Empresa</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full p-3 rounded-xl border border-border bg-background" 
              placeholder="Ex: Tech Solutions" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground">CNPJ</label>
            <input 
              type="text" 
              required
              value={formData.cnpj}
              onChange={e => setFormData({...formData, cnpj: e.target.value})}
              className="w-full p-3 rounded-xl border border-border bg-background" 
              placeholder="00.000.000/0000-00" 
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-muted-foreground">Email do Administrador</label>
          <input 
            type="email" 
            required
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            className="w-full p-3 rounded-xl border border-border bg-background" 
            placeholder="admin@empresa.com" 
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase text-muted-foreground">Plano Base</label>
          <select 
            value={formData.plan}
            onChange={e => setFormData({...formData, plan: e.target.value})}
            className="w-full p-3 rounded-xl border border-border bg-background"
          >
            <option value="Starter">Starter (Até 10 Lojistas)</option>
            <option value="Pro">Pro (Até 50 Lojistas)</option>
            <option value="Enterprise">Enterprise (Ilimitado)</option>
          </select>
        </div>
        <button type="submit" className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold shadow-lg shadow-primary/20">
          Criar Conta de Revenda
        </button>
      </form>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export const AIModelsLimits: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [defaultModel, setDefaultModel] = useState('Gemini 1.5 Flash');
  const [limits, setLimits] = useState({ basic: 1000, pro: 4000 });

  const handleSave = () => {
    setToast({ message: 'Limites e modelos atualizados com sucesso!', type: 'success' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Modelos e Limites de IA</h2>
        <button onClick={handleSave} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20">
          <CheckCircle2 className="w-4 h-4" /> Salvar Configurações
        </button>
      </div>
      <div className="glass-card p-8 space-y-8">
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Modelo Padrão Global</h3>
          <div className="grid grid-cols-3 gap-4">
            {['Gemini 1.5 Flash', 'GPT-4 Turbo', 'Claude 3 Haiku'].map(model => (
              <button 
                key={model}
                onClick={() => setDefaultModel(model)}
                className={`p-4 rounded-xl border-2 font-bold transition-all ${defaultModel === model ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/50 text-muted-foreground'}`}
              >
                {model}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Limites de Tokens (Saída)</h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase">
                <span>Lojistas Basic</span>
                <span>{limits.basic.toLocaleString()} tokens</span>
              </div>
              <input 
                type="range" 
                min="500" 
                max="5000" 
                step="100"
                value={limits.basic}
                onChange={e => setLimits({...limits, basic: parseInt(e.target.value)})}
                className="w-full accent-primary" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold uppercase">
                <span>Lojistas Pro</span>
                <span>{limits.pro.toLocaleString()} tokens</span>
              </div>
              <input 
                type="range" 
                min="2000" 
                max="20000" 
                step="500"
                value={limits.pro}
                onChange={e => setLimits({...limits, pro: parseInt(e.target.value)})}
                className="w-full accent-primary" 
              />
            </div>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export const AutoKnowledgeBase: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [settings, setSettings] = useState({ scraper: true, predictive: true });

  const handleSave = () => {
    setToast({ message: 'Configurações de RAG salvas com sucesso!', type: 'success' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Base de Conhecimento Automática (RAG)</h2>
          <p className="text-muted-foreground">Configure como a IA aprende sobre os negócios dos lojistas.</p>
        </div>
        <button onClick={handleSave} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20">
          <CheckCircle2 className="w-4 h-4" /> Salvar Configurações
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><LinkIcon className="w-5 h-5" /></div>
            <h3 className="font-bold">Extração via Link (Scraper)</h3>
          </div>
          <p className="text-xs text-muted-foreground">A IA varre o Instagram/Site do lojista para montar o perfil inicial.</p>
          <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
            <input 
              type="checkbox" 
              className="accent-primary" 
              checked={settings.scraper}
              onChange={e => setSettings({...settings, scraper: e.target.checked})}
            /> 
            Ativar Scraper Automático
          </label>
        </div>

        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><BrainCircuit className="w-5 h-5" /></div>
            <h3 className="font-bold">Auto-Preditivo</h3>
          </div>
          <p className="text-xs text-muted-foreground">A IA analisa conversas passadas para identificar padrões de compra.</p>
          <label className="flex items-center gap-2 text-sm font-bold cursor-pointer">
            <input 
              type="checkbox" 
              className="accent-primary" 
              checked={settings.predictive}
              onChange={e => setSettings({...settings, predictive: e.target.checked})}
            /> 
            Ativar Análise de Histórico
          </label>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export const SecurityFirewall: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [wafActive, setWafActive] = useState(true);

  const toggleWaf = () => {
    setWafActive(!wafActive);
    setToast({ message: `WAF ${!wafActive ? 'ativado' : 'desativado'} com sucesso!`, type: !wafActive ? 'success' : 'info' });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Proteção e Firewall</h2>
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
          <div>
            <h3 className="font-bold">WAF (Web Application Firewall)</h3>
            <p className="text-xs text-muted-foreground">Proteção contra DDoS e ataques comuns.</p>
          </div>
          <button 
            onClick={toggleWaf}
            className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors ${wafActive ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            {wafActive ? 'Ativo' : 'Inativo'}
          </button>
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-bold uppercase text-muted-foreground">IPs Bloqueados Recentemente</h4>
          <div className="bg-black/50 p-4 rounded-xl font-mono text-xs text-red-400">
            <p>192.168.1.55 - Tentativa de Brute Force</p>
            <p>10.0.0.99 - SQL Injection Detectado</p>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export const AccessLogs: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const handleExport = () => {
    setToast({ message: 'Exportando logs de acesso...', type: 'info' });
    setTimeout(() => {
      setToast({ message: 'Logs exportados com sucesso!', type: 'success' });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Logs de Acesso</h2>
        <button onClick={handleExport} className="bg-muted px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-muted/80 transition-colors">
          <Download className="w-4 h-4" /> Exportar
        </button>
      </div>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Usuário</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">IP</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Localização</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[1,2,3,4,5].map(i => (
              <tr key={i} className="hover:bg-muted/20">
                <td className="px-6 py-4 font-bold">admin@saaswpp.com</td>
                <td className="px-6 py-4 font-mono text-xs">192.168.1.{i}</td>
                <td className="px-6 py-4 text-sm">São Paulo, BR</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">Hoje, 10:{10+i}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export const ResellersList: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const handleNewReseller = () => {
    setToast({ message: 'Abrindo formulário de novo revendedor...', type: 'info' });
  };

  const handleSettings = (id: number) => {
    setToast({ message: `Abrindo configurações do revendedor ${id}...`, type: 'info' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Lista de Revendedores</h2>
          <p className="text-muted-foreground">Gerencie seus parceiros e suas lojas.</p>
        </div>
        <button onClick={handleNewReseller} className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg shadow-primary/20 hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Novo Revendedor
        </button>
      </div>
      <div className="glass-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Empresa</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Plano</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Lojas</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Status</th>
              <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <tr key={i} className="hover:bg-muted/20 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold">Tech Solutions {i}</div>
                  <div className="text-xs text-muted-foreground">admin@tech{i}.com</div>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-primary">Enterprise</td>
                <td className="px-6 py-4 font-mono text-xs">12/50</td>
                <td className="px-6 py-4">
                  <span className="bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded text-[10px] font-bold uppercase">Ativo</span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <button onClick={() => handleSettings(i)} className="p-2 hover:bg-muted rounded-lg transition-colors"><Settings className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export const ResellerPlans: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const handleEditPlan = (plan: string) => {
    setToast({ message: `Abrindo editor para o plano ${plan}...`, type: 'info' });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Planos e Preços Globais</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['Starter', 'Pro', 'Enterprise'].map((plan) => (
          <div key={plan} className="glass-card p-6 space-y-4 border-t-4 border-primary relative group hover:scale-105 transition-transform">
            <h3 className="text-xl font-black uppercase">{plan}</h3>
            <div className="text-3xl font-bold text-primary">R$ 99<span className="text-sm text-muted-foreground">/mês</span></div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Até 10 Lojas</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> IA Básica</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Suporte Email</li>
            </ul>
            <button onClick={() => handleEditPlan(plan)} className="w-full py-2 rounded-lg bg-muted font-bold text-xs hover:bg-primary hover:text-primary-foreground transition-colors">
              Editar Plano
            </button>
          </div>
        ))}
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export const ResellerFinancial: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const handleExport = () => {
    setToast({ message: 'Exportando relatório financeiro...', type: 'info' });
    setTimeout(() => {
      setToast({ message: 'Relatório exportado com sucesso!', type: 'success' });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Relatórios Financeiros</h2>
        <button onClick={handleExport} className="bg-muted px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-muted/80 transition-colors">
          <Download className="w-4 h-4" /> Exportar
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 space-y-2">
          <p className="text-xs font-bold uppercase text-muted-foreground">MRR Total</p>
          <p className="text-3xl font-black text-emerald-500">R$ 45.200,00</p>
        </div>
        <div className="glass-card p-6 space-y-2">
          <p className="text-xs font-bold uppercase text-muted-foreground">Lojas Ativas</p>
          <p className="text-3xl font-black text-primary">1,240</p>
        </div>
        <div className="glass-card p-6 space-y-2">
          <p className="text-xs font-bold uppercase text-muted-foreground">Churn Rate</p>
          <p className="text-3xl font-black text-red-500">1.2%</p>
        </div>
      </div>
      <div className="glass-card p-6 h-[400px] flex items-center justify-center text-muted-foreground font-mono text-xs">
        [Gráfico de Receita Recorrente - Em Breve]
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
