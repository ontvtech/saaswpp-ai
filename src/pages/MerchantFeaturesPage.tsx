/**
 * PÁGINA CONSOLIDADA DE FEATURES DO LOJISTA - SaaSWPP AI
 * 
 * Inclui todas as features em abas:
 * - ROI Dashboard
 * - Heatmap
 * - Templates
 * - Triggers
 * - Sequências
 * - Memória
 * - Webhooks
 * - API Keys
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3, Calendar, Clock, Code, FileText, History,
  Key, MessageSquare, Settings, TrendingUp, Users, Webhook,
  Zap, RefreshCw, Plus, Trash2, Play, Pause, Send, Download,
  Check, X, AlertCircle, Eye, Copy, ExternalLink, ChevronRight
} from 'lucide-react';

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export const MerchantFeaturesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('roi');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const tabs = [
    { id: 'roi', label: 'ROI Dashboard', icon: TrendingUp },
    { id: 'heatmap', label: 'Horários', icon: Clock },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'triggers', label: 'Automações', icon: Zap },
    { id: 'sequences', label: 'Sequências', icon: MessageSquare },
    { id: 'memory', label: 'Clientes', icon: Users },
    { id: 'webhooks', label: 'Webhooks', icon: Webhook },
    { id: 'api', label: 'API Keys', icon: Key },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Recursos Avançados</h1>
        <p className="text-gray-500">Gerencie todas as funcionalidades da sua IA</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border p-6">
        {activeTab === 'roi' && <ROIDashboard merchantId={user?.merchantId} />}
        {activeTab === 'heatmap' && <HeatmapView merchantId={user?.merchantId} />}
        {activeTab === 'templates' && <TemplatesView merchantId={user?.merchantId} />}
        {activeTab === 'triggers' && <TriggersView merchantId={user?.merchantId} />}
        {activeTab === 'sequences' && <SequencesView merchantId={user?.merchantId} />}
        {activeTab === 'memory' && <MemoryView merchantId={user?.merchantId} />}
        {activeTab === 'webhooks' && <WebhooksView merchantId={user?.merchantId} />}
        {activeTab === 'api' && <ApiKeysView merchantId={user?.merchantId} />}
      </div>
    </div>
  );
};

// =============================================================================
// ROI DASHBOARD
// =============================================================================

const ROIDashboard: React.FC<{ merchantId?: string }> = ({ merchantId }) => {
  const [roi, setRoi] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (merchantId) {
      Promise.all([
        fetch('/api/features/pro/roi').then(r => r.json()),
        fetch('/api/features/pro/roi/trends?days=30').then(r => r.json())
      ]).then(([roiData, trendsData]) => {
        setRoi(roiData);
        setTrends(trendsData);
        setLoading(false);
      });
    }
  }, [merchantId]);

  if (loading) return <div className="animate-pulse">Carregando métricas...</div>;

  const formatCurrency = (v: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Dashboard de ROI</h2>
      
      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-600">Vendas Totais</p>
          <p className="text-2xl font-bold text-green-700">{roi?.totalSales || 0}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600">Valor Total</p>
          <p className="text-2xl font-bold text-blue-700">{formatCurrency(roi?.salesValue || 0)}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-600">Vendas pela IA</p>
          <p className="text-2xl font-bold text-purple-700">{roi?.aiGeneratedSales || 0}</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-lg">
          <p className="text-sm text-amber-600">ROI</p>
          <p className="text-2xl font-bold text-amber-700">{roi?.roi?.toFixed(0) || 0}%</p>
        </div>
      </div>

      {/* Vendas por IA vs Humano */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium mb-3">Vendas por Origem</h3>
        <div className="flex gap-4">
          <div className="flex-1 bg-blue-100 p-3 rounded">
            <p className="text-sm">IA Automático</p>
            <p className="text-lg font-bold">{roi?.aiGeneratedSales || 0} vendas</p>
            <p className="text-sm text-gray-600">{formatCurrency(roi?.aiGeneratedValue || 0)}</p>
          </div>
          <div className="flex-1 bg-gray-200 p-3 rounded">
            <p className="text-sm">Humano</p>
            <p className="text-lg font-bold">{roi?.humanGeneratedSales || 0} vendas</p>
            <p className="text-sm text-gray-600">{formatCurrency(roi?.humanGeneratedValue || 0)}</p>
          </div>
        </div>
      </div>

      {/* Métricas de Eficiência */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 border rounded-lg">
          <p className="text-3xl font-bold text-blue-600">{roi?.aiResolutionRate?.toFixed(0) || 0}%</p>
          <p className="text-sm text-gray-500">Taxa de Resolução IA</p>
        </div>
        <div className="text-center p-4 border rounded-lg">
          <p className="text-3xl font-bold text-green-600">{roi?.customerSatisfactionRate?.toFixed(0) || 0}%</p>
          <p className="text-sm text-gray-500">Satisfação</p>
        </div>
        <div className="text-center p-4 border rounded-lg">
          <p className="text-3xl font-bold text-purple-600">{roi?.totalConversations || 0}</p>
          <p className="text-sm text-gray-500">Conversas</p>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// HEATMAP VIEW
// =============================================================================

const HeatmapView: React.FC<{ merchantId?: string }> = ({ merchantId }) => {
  const [stats, setStats] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (merchantId) {
      Promise.all([
        fetch('/api/features/start/heatmap/stats').then(r => r.json()),
        fetch('/api/features/start/heatmap/recommendations').then(r => r.json())
      ]).then(([statsData, recsData]) => {
        setStats(statsData);
        setRecommendations(recsData);
        setLoading(false);
      });
    }
  }, [merchantId]);

  if (loading) return <div className="animate-pulse">Carregando análise...</div>;

  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Análise de Horários</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-sm text-blue-600">Horário de Pico</p>
          <p className="text-xl font-bold text-blue-700">{stats?.peakHour}:00</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <p className="text-sm text-green-600">Dia Mais Movimentado</p>
          <p className="text-xl font-bold text-green-700">{stats?.peakDayName}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <p className="text-sm text-purple-600">Total de Mensagens</p>
          <p className="text-xl font-bold text-purple-700">{stats?.totalMessages}</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-lg">
          <p className="text-sm text-amber-600">Média por Hora</p>
          <p className="text-xl font-bold text-amber-700">{stats?.avgPerHour}</p>
        </div>
      </div>

      {/* Horários */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-medium text-green-700 mb-2">🔥 Horários Mais Movimentados</h3>
          <div className="space-y-1">
            {stats?.busierHours?.map((h: number) => (
              <div key={h} className="text-green-600">{h}:00 - {h+1}:00</div>
            ))}
          </div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-700 mb-2">😴 Horários Mais Tranquilos</h3>
          <div className="space-y-1">
            {stats?.quieterHours?.map((h: number) => (
              <div key={h} className="text-gray-600">{h}:00 - {h+1}:00</div>
            ))}
          </div>
        </div>
      </div>

      {/* Recomendações */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-700 mb-3">💡 Recomendações</h3>
        <ul className="space-y-2">
          {recommendations.map((rec, i) => (
            <li key={i} className="text-blue-600 text-sm">{rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// =============================================================================
// TEMPLATES VIEW
// =============================================================================

const TemplatesView: React.FC<{ merchantId?: string }> = ({ merchantId }) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (merchantId) {
      fetch('/api/features/start/templates')
        .then(r => r.json())
        .then(data => {
          setTemplates(data);
          setLoading(false);
        });
    }
  }, [merchantId]);

  if (loading) return <div className="animate-pulse">Carregando templates...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Templates de Mensagens</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
          <Plus className="w-4 h-4" />
          Novo Template
        </button>
      </div>

      <div className="grid gap-4">
        {templates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhum template criado ainda
          </div>
        ) : (
          templates.map(t => (
            <div key={t.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{t.name}</h3>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">{t.category}</span>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{t.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// =============================================================================
// TRIGGERS VIEW
// =============================================================================

const TriggersView: React.FC<{ merchantId?: string }> = ({ merchantId }) => {
  const [triggers, setTriggers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (merchantId) {
      fetch('/api/features/enterprise/triggers')
        .then(r => r.json())
        .then(data => {
          setTriggers(data);
          setLoading(false);
        });
    }
  }, [merchantId]);

  if (loading) return <div className="animate-pulse">Carregando automações...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Automações</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
          <Plus className="w-4 h-4" />
          Nova Automação
        </button>
      </div>

      <div className="grid gap-4">
        {triggers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhuma automação configurada
          </div>
        ) : (
          triggers.map(t => (
            <div key={t.id} className="border rounded-lg p-4 flex justify-between items-center">
              <div>
                <h3 className="font-medium">{t.name}</h3>
                <p className="text-sm text-gray-500">{t.description}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {t.triggerType}
                  </span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    {t.actionType}
                  </span>
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${t.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// =============================================================================
// SEQUENCES VIEW
// =============================================================================

const SequencesView: React.FC<{ merchantId?: string }> = ({ merchantId }) => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (merchantId) {
      fetch('/api/features/enterprise/sequences')
        .then(r => r.json())
        .then(data => {
          setCampaigns(data);
          setLoading(false);
        });
    }
  }, [merchantId]);

  if (loading) return <div className="animate-pulse">Carregando campanhas...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Sequências de Mensagens</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
          <Plus className="w-4 h-4" />
          Nova Campanha
        </button>
      </div>

      <div className="grid gap-4">
        {campaigns.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Nenhuma campanha criada
          </div>
        ) : (
          campaigns.map(c => (
            <div key={c.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{c.name}</h3>
                  <p className="text-sm text-gray-500">{c.steps?.length || 0} passos</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    c.status === 'active' ? 'bg-green-100 text-green-700' :
                    c.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {c.status}
                  </span>
                  {c.status === 'active' ? (
                    <button className="p-2 hover:bg-gray-100 rounded">
                      <Pause className="w-4 h-4" />
                    </button>
                  ) : (
                    <button className="p-2 hover:bg-gray-100 rounded">
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// =============================================================================
// MEMORY VIEW
// =============================================================================

const MemoryView: React.FC<{ merchantId?: string }> = ({ merchantId }) => {
  const [searchPhone, setSearchPhone] = useState('');
  const [memory, setMemory] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const searchMemory = async () => {
    if (!searchPhone) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/features/elite/memory/${searchPhone}`);
      const data = await res.json();
      setMemory(data);
    } catch {
      setMemory(null);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Memória de Clientes</h2>

      {/* Busca */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Telefone do cliente (com DDD)"
          value={searchPhone}
          onChange={(e) => setSearchPhone(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg"
        />
        <button
          onClick={searchMemory}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Buscar
        </button>
      </div>

      {/* Resultado */}
      {loading && <div className="animate-pulse">Buscando...</div>}

      {memory && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Nome</p>
              <p className="font-medium">{memory.customerName || 'Não identificado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total de Compras</p>
              <p className="font-medium">{memory.totalPurchases}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Valor Total</p>
              <p className="font-medium">R$ {memory.totalValue?.toFixed(2)}</p>
            </div>
          </div>

          {memory.preferences?.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Preferências Conhecidas</p>
              <div className="flex flex-wrap gap-2">
                {memory.preferences.map((p: string, i: number) => (
                  <span key={i} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-sm">{p}</span>
                ))}
              </div>
            </div>
          )}

          {memory.tags?.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {memory.tags.map((t: string, i: number) => (
                  <span key={i} className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-sm">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// WEBHOOKS VIEW
// =============================================================================

const WebhooksView: React.FC<{ merchantId?: string }> = ({ merchantId }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/features/elite/webhooks')
      .then(r => r.json())
      .then(data => {
        setEvents(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="animate-pulse">Carregando eventos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Webhooks e Integrações</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
          <Plus className="w-4 h-4" />
          Novo Webhook
        </button>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-700 mb-2">Eventos Disponíveis</h3>
        <div className="grid md:grid-cols-2 gap-2">
          {events.map((e, i) => (
            <div key={i} className="bg-white p-2 rounded text-sm">
              <code className="text-blue-600">{e.event}</code>
              <p className="text-gray-500 text-xs">{e.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-center py-8 text-gray-500">
        Configure webhooks para integrar com Zapier, Make, ou seu próprio sistema
      </div>
    </div>
  );
};

// =============================================================================
// API KEYS VIEW
// =============================================================================

const ApiKeysView: React.FC<{ merchantId?: string }> = ({ merchantId }) => {
  const [keys, setKeys] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/features/ninja/api-keys').then(r => r.json()),
      fetch('/api/features/ninja/api/docs').then(r => r.json())
    ]).then(([keysData, docsData]) => {
      setKeys(keysData);
      setDocs(docsData);
      setLoading(false);
    });
  }, []);

  const generateKey = async () => {
    const res = await fetch('/api/features/ninja/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'API Key',
        permissions: ['read', 'write'],
        rateLimit: 1000
      })
    });
    const newKey = await res.json();
    setKeys([...keys, newKey]);
  };

  if (loading) return <div className="animate-pulse">Carregando API...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">API Keys</h2>
        <button
          onClick={generateKey}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Gerar Nova Key
        </button>
      </div>

      {/* Keys */}
      <div className="space-y-2">
        {keys.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            Nenhuma API Key criada
          </div>
        ) : (
          keys.map(k => (
            <div key={k.id} className="border rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="font-medium">{k.name}</p>
                <code className="text-sm text-gray-500">{k.key}</code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Ativa</span>
                <button className="p-2 hover:bg-gray-100 rounded text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Docs */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium mb-3">Endpoints Disponíveis</h3>
        <div className="max-h-60 overflow-y-auto space-y-1">
          {docs.slice(0, 10).map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className={`px-2 py-0.5 rounded text-xs font-mono ${
                d.method === 'GET' ? 'bg-green-100 text-green-700' :
                d.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                d.method === 'PUT' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>{d.method}</span>
              <code className="text-gray-600">{d.endpoint}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MerchantFeaturesPage;
