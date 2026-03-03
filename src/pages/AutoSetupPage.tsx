/**
 * PÁGINA DE SETUP AUTOMÁTICO - SaaSWPP AI
 * 
 * O "Botão Mágico" que configura tudo automaticamente:
 * - Seleciona grupos do WhatsApp
 * - Estuda mensagens
 * - Gera base de conhecimento
 * - Configura IA
 */

import React, { useState, useEffect } from 'react';
import { 
  Wand2, 
  Users, 
  MessageSquare, 
  Brain, 
  Settings, 
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Play,
  Zap
} from 'lucide-react';

// =============================================================================
// TIPOS
// =============================================================================

interface WhatsAppGroup {
  id: string;
  name: string;
  participants: number;
  picture?: string;
  studied: boolean;
  studyStatus?: string;
}

interface SetupStatus {
  status: string;
  stepGroupsLoaded: boolean;
  stepGroupsStudied: boolean;
  stepKnowledgeCreated: boolean;
  stepAIConfigured: boolean;
  stepPromptsGenerated: boolean;
  stepTriggersCreated: boolean;
  stepWelcomeSet: boolean;
  stepTested: boolean;
  totalMessagesAnalyzed: number;
  totalKnowledgeItems: number;
  confidenceScore: number;
  errorMessage?: string;
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export const AutoSetupPage: React.FC = () => {
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [step, setStep] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar grupos
      const groupsRes = await fetch('/api/auto-setup/groups');
      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        setGroups(groupsData);
      }
      
      // Carregar status
      const statusRes = await fetch('/api/auto-setup/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData.status);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle grupo
  const toggleGroup = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  // Executar setup automático
  const runSetup = async () => {
    if (selectedGroups.length === 0) {
      alert('Selecione pelo menos um grupo');
      return;
    }
    
    setRunning(true);
    setProgress(['Iniciando configuração automática...']);
    setStep(1);
    
    try {
      const res = await fetch('/api/auto-setup/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedGroupIds: selectedGroups })
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Simular progresso
        const steps = [
          'Carregando grupos do WhatsApp...',
          'Analisando mensagens com IA...',
          'Extraindo conhecimento do negócio...',
          'Configurando assistente virtual...',
          'Criando automações...',
          'Gerando templates de resposta...',
          'Testando configurações...'
        ];
        
        for (let i = 0; i < steps.length; i++) {
          await new Promise(r => setTimeout(r, 1500));
          setProgress(prev => [...prev, steps[i]]);
          setStep(i + 2);
        }
        
        setProgress(prev => [...prev, '✅ Configuração concluída com sucesso!']);
        setStep(8);
        
        // Recarregar status
        setTimeout(() => {
          loadData();
          setRunning(false);
        }, 2000);
      } else {
        setProgress(prev => [...prev, `❌ Erro: ${data.error}`]);
        setRunning(false);
      }
    } catch (error: any) {
      setProgress(prev => [...prev, `❌ Erro: ${error.message}`]);
      setRunning(false);
    }
  };

  // Ícones dos passos
  const stepIcons = [
    Users,       // 1. Grupos carregados
    MessageSquare, // 2. Mensagens analisadas
    Brain,       // 3. Conhecimento gerado
    Settings,    // 4. IA configurada
    Sparkles,    // 5. Prompts gerados
    Zap,         // 6. Triggers criados
    CheckCircle  // 7. Concluído
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Se já foi configurado
  if (status?.status === 'completed' && !running) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-xl border p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Setup Automático Concluído!
          </h1>
          <p className="text-gray-500 mb-6">
            Sua IA foi configurada automaticamente com base nos seus grupos
          </p>
          
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-blue-600">
                {status.totalMessagesAnalyzed}
              </p>
              <p className="text-xs text-gray-500">Mensagens analisadas</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-green-600">
                {status.totalKnowledgeItems}
              </p>
              <p className="text-xs text-gray-500">Itens de conhecimento</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-purple-600">
                {Math.round(status.confidenceScore * 100)}%
              </p>
              <p className="text-xs text-gray-500">Confiança</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            {status.stepKnowledgeCreated && (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                ✓ Base de conhecimento
              </span>
            )}
            {status.stepAIConfigured && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                ✓ IA configurada
              </span>
            )}
            {status.stepTriggersCreated && (
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                ✓ Automações criadas
              </span>
            )}
          </div>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setStatus(null)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Configurar Novamente
            </button>
            <a
              href="/dashboard"
              className="px-6 py-2 border rounded-lg font-medium hover:bg-gray-50"
            >
              Ir para Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Wand2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          Configuração Automática
        </h1>
        <p className="text-gray-500 mt-2 max-w-md mx-auto">
          Selecione grupos do WhatsApp e deixe a IA estudar sua empresa automaticamente
        </p>
      </div>

      {/* Progress Steps */}
      {running && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Progresso</h2>
          <div className="flex items-center justify-between mb-6">
            {stepIcons.map((Icon, i) => (
              <div 
                key={i} 
                className={`flex flex-col items-center ${step > i ? 'opacity-100' : 'opacity-40'}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step > i + 1 ? 'bg-green-500' : step === i + 1 ? 'bg-blue-500 animate-pulse' : 'bg-gray-200'
                }`}>
                  {step > i + 1 ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <Icon className={`w-5 h-5 ${step === i + 1 ? 'text-white' : 'text-gray-500'}`} />
                  )}
                </div>
                <span className="text-xs mt-1 text-gray-500">{i + 1}</span>
              </div>
            ))}
          </div>
          
          <div className="space-y-2">
            {progress.map((msg, i) => (
              <p key={i} className={`text-sm ${msg.startsWith('✅') ? 'text-green-600 font-medium' : msg.startsWith('❌') ? 'text-red-600' : 'text-gray-600'}`}>
                {msg}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Seleção de Grupos */}
      {!running && (
        <>
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Selecione os Grupos para Estudo
              </h2>
              <span className="text-sm text-gray-500">
                {selectedGroups.length} de {groups.length} selecionados
              </span>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              A IA vai analisar as mensagens desses grupos para entender seu negócio, serviços, preços e horários.
            </p>

            {groups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum grupo encontrado</p>
                <p className="text-sm">Conecte seu WhatsApp primeiro</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
                {groups.map(group => (
                  <div
                    key={group.id}
                    onClick={() => !group.studied && toggleGroup(group.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      group.studied 
                        ? 'border-green-300 bg-green-50 opacity-75' 
                        : selectedGroups.includes(group.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        {group.picture ? (
                          <img src={group.picture} alt="" className="w-12 h-12 rounded-full object-cover" />
                        ) : (
                          <Users className="w-6 h-6 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{group.name}</p>
                        <p className="text-xs text-gray-500">{group.participants} participantes</p>
                      </div>
                      {group.studied ? (
                        <span className="text-xs text-green-600 font-medium">✓ Estudado</span>
                      ) : selectedGroups.includes(group.id) ? (
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* O que vai acontecer */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              O que a IA vai fazer
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: MessageSquare, title: 'Analisar conversas', desc: 'Vai ler as mensagens e entender padrões' },
                { icon: Brain, title: 'Extrair conhecimento', desc: 'Identificar serviços, preços, horários' },
                { icon: Settings, title: 'Configurar IA', desc: 'Criar prompts personalizados' },
                { icon: Zap, title: 'Criar automações', desc: 'Mensagem de boas-vindas, reativação' }
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <item.icon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botão de Ação */}
          <button
            onClick={runSetup}
            disabled={selectedGroups.length === 0}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Wand2 className="w-6 h-6" />
            Configurar Tudo Automaticamente
            <ChevronRight className="w-5 h-5" />
          </button>
          
          <p className="text-center text-sm text-gray-500">
            Isso pode levar alguns minutos. Você pode fechar a página que continuamos trabalhando.
          </p>
        </>
      )}
    </div>
  );
};

export default AutoSetupPage;
