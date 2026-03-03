/**
 * PÁGINA DE CONFIGURAÇÃO FISCAL (NFS-e) - SaaSWPP AI
 * 
 * Interface para ativar/desativar emissão de notas fiscais
 * e configurar dados da empresa e integração
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  ToggleLeft, 
  ToggleRight, 
  Building2, 
  MapPin, 
  Settings, 
  CreditCard,
  History,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Download,
  Trash2,
  Plus
} from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

interface FiscalConfig {
  id: string;
  nfseEnabled: boolean;
  autoIssue: boolean;
  
  corporateName: string;
  tradeName: string;
  cnpj: string;
  municipalRegistration: string;
  taxRegime: string;
  
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressDistrict: string;
  addressCity: string;
  addressState: string;
  addressZipCode: string;
  
  email: string;
  phone: string;
  
  serviceCode: string;
  serviceDescription: string;
  aliquotIss: number;
  
  provider: string;
  apiToken: string;
  apiSecret: string;
  apiEnvironment: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  totalValue: number;
  takerName: string;
  issuedAt: string;
  pdfUrl: string;
  invoiceUrl: string;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export const FiscalSettingsPage: React.FC = () => {
  const [config, setConfig] = useState<Partial<FiscalConfig>>({
    nfseEnabled: false,
    autoIssue: true,
    taxRegime: 'simples_nacional',
    provider: 'FOCUS_NFE',
    apiEnvironment: 'production',
    aliquotIss: 5.0
  });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'history'>('config');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [configRes, invoicesRes, statsRes] = await Promise.all([
        fetch('/api/nfse/config'),
        fetch('/api/nfse/invoices?limit=10'),
        fetch('/api/nfse/stats')
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        if (configData) setConfig(prev => ({ ...prev, ...configData }));
      }

      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setInvoices(invoicesData.invoices || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Salvar configuração
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/nfse/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Configuração salva com sucesso!' });
        setConfig(prev => ({ ...prev, ...data.config }));
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar configuração' });
    } finally {
      setSaving(false);
    }
  };

  // Toggle NFS-e
  const handleToggleNfse = async () => {
    try {
      const res = await fetch('/api/nfse/config/toggle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !config.nfseEnabled })
      });

      const data = await res.json();

      if (data.success) {
        setConfig(prev => ({ ...prev, nfseEnabled: data.nfseEnabled }));
        setMessage({ type: 'success', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao atualizar' });
    }
  };

  // Toggle auto issue
  const handleToggleAutoIssue = async () => {
    try {
      const res = await fetch('/api/nfse/config/auto-issue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !config.autoIssue })
      });

      const data = await res.json();

      if (data.success) {
        setConfig(prev => ({ ...prev, autoIssue: data.autoIssue }));
        setMessage({ type: 'success', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao atualizar' });
    }
  };

  // Reenviar nota
  const handleRetryInvoice = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/nfse/invoices/${invoiceId}/retry`, {
        method: 'POST'
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: `Nota ${data.invoiceNumber} emitida com sucesso!` });
        loadData();
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao reenviar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao reenviar nota' });
    }
  };

  // Formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Formatar data
  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Status badge
  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      issued: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: RefreshCw },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800', icon: RefreshCw },
      error: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XCircle }
    };

    const style = styles[status] || styles.pending;
    const Icon = style.icon;

    const labels: Record<string, string> = {
      issued: 'Emitida',
      pending: 'Pendente',
      processing: 'Processando',
      error: 'Erro',
      cancelled: 'Cancelada'
    };

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <Icon className="w-3 h-3" />
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" />
            Nota Fiscal de Serviço (NFS-e)
          </h1>
          <p className="text-gray-500 mt-1">
            Configure a emissão automática de NFS-e para cada pagamento recebido
          </p>
        </div>
        
        {/* Toggle Principal */}
        <button
          onClick={handleToggleNfse}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            config.nfseEnabled
              ? 'bg-green-100 text-green-800 hover:bg-green-200'
              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
          }`}
        >
          {config.nfseEnabled ? (
            <>
              <ToggleRight className="w-5 h-5" />
              NFS-e Ativa
            </>
          ) : (
            <>
              <ToggleLeft className="w-5 h-5" />
              NFS-e Inativa
            </>
          )}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Total Emitidas</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalIssued || 0}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Valor Total</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.totalValueIssued || 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Este Mês</p>
          <p className="text-2xl font-bold text-blue-600">
            {stats.byStatus?.find((s: any) => s.status === 'issued')?._count || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Erros</p>
          <p className="text-2xl font-bold text-red-600">
            {stats.byStatus?.find((s: any) => s.status === 'error')?._count || 0}
          </p>
        </div>
      </div>

      {/* Alerta se desabilitado */}
      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      {!config.nfseEnabled && (
        <div className="flex items-center gap-2 p-4 bg-yellow-50 text-yellow-800 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          NFS-e está desativada. Configure seus dados e ative para emitir notas automaticamente.
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'config'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings className="w-4 h-4 inline mr-2" />
          Configuração
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'history'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <History className="w-4 h-4 inline mr-2" />
          Histórico de Notas
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Auto Issue Toggle */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Emissão Automática</h3>
                <p className="text-sm text-gray-500">
                  Emitir NFS-e automaticamente quando um pagamento for confirmado
                </p>
              </div>
              <button
                onClick={handleToggleAutoIssue}
                disabled={!config.nfseEnabled}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  config.autoIssue && config.nfseEnabled
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-500'
                } disabled:opacity-50`}
              >
                {config.autoIssue ? 'Automático' : 'Manual'}
              </button>
            </div>
          </div>

          {/* Dados da Empresa */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-blue-600" />
              Dados da Empresa
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Razão Social *
                </label>
                <input
                  type="text"
                  value={config.corporateName || ''}
                  onChange={(e) => setConfig({ ...config, corporateName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Sua Empresa LTDA"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Fantasia
                </label>
                <input
                  type="text"
                  value={config.tradeName || ''}
                  onChange={(e) => setConfig({ ...config, tradeName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Sua Empresa"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CNPJ *
                </label>
                <input
                  type="text"
                  value={config.cnpj || ''}
                  onChange={(e) => setConfig({ ...config, cnpj: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="00.000.000/0000-00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Inscrição Municipal *
                </label>
                <input
                  type="text"
                  value={config.municipalRegistration || ''}
                  onChange={(e) => setConfig({ ...config, municipalRegistration: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="00000000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Regime Tributário
                </label>
                <select
                  value={config.taxRegime || 'simples_nacional'}
                  onChange={(e) => setConfig({ ...config, taxRegime: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="simples_nacional">Simples Nacional</option>
                  <option value="lucro_presumido">Lucro Presumido</option>
                  <option value="lucro_real">Lucro Real</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={config.email || ''}
                  onChange={(e) => setConfig({ ...config, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="contato@empresa.com"
                />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-blue-600" />
              Endereço
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logradouro
                </label>
                <input
                  type="text"
                  value={config.addressStreet || ''}
                  onChange={(e) => setConfig({ ...config, addressStreet: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Rua, Avenida, etc."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número
                </label>
                <input
                  type="text"
                  value={config.addressNumber || ''}
                  onChange={(e) => setConfig({ ...config, addressNumber: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bairro
                </label>
                <input
                  type="text"
                  value={config.addressDistrict || ''}
                  onChange={(e) => setConfig({ ...config, addressDistrict: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Centro"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cidade
                </label>
                <input
                  type="text"
                  value={config.addressCity || ''}
                  onChange={(e) => setConfig({ ...config, addressCity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="São Paulo"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  UF
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={config.addressState || ''}
                  onChange={(e) => setConfig({ ...config, addressState: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="SP"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CEP
                </label>
                <input
                  type="text"
                  value={config.addressZipCode || ''}
                  onChange={(e) => setConfig({ ...config, addressZipCode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="00000-000"
                />
              </div>
            </div>
          </div>

          {/* Serviço */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Configuração do Serviço
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código do Serviço (LC 116)
                </label>
                <input
                  type="text"
                  value={config.serviceCode || ''}
                  onChange={(e) => setConfig({ ...config, serviceCode: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1.05"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ex: 1.05 para serviços de informática
                </p>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição do Serviço
                </label>
                <input
                  type="text"
                  value={config.serviceDescription || ''}
                  onChange={(e) => setConfig({ ...config, serviceDescription: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Serviços de automação de WhatsApp via IA"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alíquota ISS (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={config.aliquotIss || 5}
                  onChange={(e) => setConfig({ ...config, aliquotIss: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Integração */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-blue-600" />
              Integração (API)
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Provedores Suportados:</strong><br/>
                  • <strong>Focus NFe</strong> - Recomendado. Documentação: focusnfe.com.br<br/>
                  • <strong>NFE.io</strong> - Alternativa popular. Documentação: nfe.io<br/>
                  • <strong>Webmania</strong> - Outra opção. Documentação: webmaniabr.com
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provedor
                  </label>
                  <select
                    value={config.provider || 'FOCUS_NFE'}
                    onChange={(e) => setConfig({ ...config, provider: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="FOCUS_NFE">Focus NFe</option>
                    <option value="NFE_IO">NFE.io</option>
                    <option value="WEBMANIA">Webmania</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ambiente
                  </label>
                  <select
                    value={config.apiEnvironment || 'production'}
                    onChange={(e) => setConfig({ ...config, apiEnvironment: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="production">Produção</option>
                    <option value="homologation">Homologação</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Token
                  </label>
                  <input
                    type="password"
                    value={config.apiToken && !config.apiToken.includes('•') ? config.apiToken : ''}
                    onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Seu token de API"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Secret (se necessário)
                  </label>
                  <input
                    type="password"
                    value={config.apiSecret && !config.apiSecret.includes('•') ? config.apiSecret : ''}
                    onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Seu secret de API"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Botão Salvar */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => loadData()}
              className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </div>
        </div>
      )}

      {/* Tab Histórico */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nota
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tomador
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Valor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Data
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Nenhuma nota fiscal emitida ainda
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium">
                          {invoice.invoiceNumber || 'Pendente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {invoice.takerName || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatCurrency(invoice.totalValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.issuedAt || invoice.id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-2">
                          {invoice.status === 'error' && (
                            <button
                              onClick={() => handleRetryInvoice(invoice.id)}
                              className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                              title="Reenviar"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          {invoice.pdfUrl && (
                            <a
                              href={invoice.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Ver PDF"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}
                          {invoice.invoiceUrl && (
                            <a
                              href={invoice.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                              title="Ver nota"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiscalSettingsPage;
