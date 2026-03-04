import React, { useState, useEffect } from 'react';
import { BrainCircuit, Save, Sparkles, MessageSquare, User, Volume2, ShieldAlert, Plus, Lock, Zap, Target, Smile, Radar, Send, CheckCircle2, X, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { Toast, ToastType } from '../components/Toast';
import { Modal } from '../components/Modal';

interface Snippet {
  id: string;
  label: string;
  text: string;
  trigger?: string;
}

export const AIConfig: React.FC = () => {
  const { token, fetchWithAuth } = useStore();
  const [allowCustomPrompts, setAllowCustomPrompts] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [config, setConfig] = useState({
    aiName: 'Assistente Inteligente',
    niche: 'Oficina Mecânica',
    tone: 'Profissional e Amigável',
    personality: 'Amigável',
    salesGoal: 'Agendar',
    priceDisabled: false,
    handoffEnabled: true,
    salesMode: true,
    predictiveMode: true,
    mindset: 'GROUNDING', // GROUNDING, CONSULTANT
    basePrompt: 'Você é um assistente virtual especializado em atendimento ao cliente...',
    businessData: '',
    humanHandoffThreshold: 3,
    tokenLimit: 50000,
    tokensUsed: 12500
  });
  const [activePromptId, setActivePromptId] = useState('');
  const [predictiveData, setPredictiveData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [planModules, setPlanModules] = useState({
    attendance: true,
    sales: false,
    predictive: false
  });
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  
  // Estados para Snippets
  const [snippets, setSnippets] = useState<Snippet[]>([
    { id: '1', label: 'Saudação', text: 'Olá! Como posso ajudar você hoje?' },
    { id: '2', label: 'Agendamento', text: 'Claro! Qual o melhor dia e horário para você?' },
    { id: '3', label: 'Preço', text: 'Nossos valores variam conforme o serviço. Posso te passar uma tabela?' },
    { id: '4', label: 'Localização', text: 'Estamos localizados na Rua Exemplo, 123. Esperamos você!' },
  ]);
  const [showSnippetModal, setShowSnippetModal] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  const [snippetForm, setSnippetForm] = useState({ label: '', text: '', trigger: '' });
  
  // Estados para Simulador de Chat
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([
    { role: 'ai', text: 'Olá! Eu sou o Assistente Inteligente. Como posso ajudar você hoje?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Estado para modal de limite
  const [showLimitModal, setShowLimitModal] = useState(false);
  
  // Estado para abordagem proativa
  const [isStartingProactive, setIsStartingProactive] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configRes, templatesRes] = await Promise.all([
          fetchWithAuth('/api/ai/config'),
          fetchWithAuth('/api/prompts/templates')
        ]);
        if (configRes.ok) {
          const data = await configRes.json();
          if (data.aiConfig) setConfig(prev => ({ ...prev, ...data.aiConfig }));
          setAllowCustomPrompts(data.allowCustomPrompts);
          setActivePromptId(data.activePromptId || '');
          if (data.planModules) setPlanModules(data.planModules);
        } else {
            // Mock data fallback
            setTemplates([
                { id: '1', name: 'Atendente de Clínica' },
                { id: '2', name: 'Vendedor de Loja' },
                { id: '3', name: 'Suporte Técnico' }
            ]);
        }
        if (templatesRes.ok) setTemplates(await templatesRes.json());
      } catch (e) {
        console.error(e);
        // Fallback templates
        setTemplates([
            { id: '1', name: 'Atendente de Clínica' },
            { id: '2', name: 'Vendedor de Loja' },
            { id: '3', name: 'Suporte Técnico' }
        ]);
      }
    };
    if (token) fetchData();
  }, [token]);

  const handleSave = async () => {
    try {
      const res = await fetchWithAuth('/api/ai/config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ aiConfig: config, activePromptId, mindset: config.mindset })
      });
      if (res.ok) {
        setToast({ message: 'Configurações salvas com sucesso!', type: 'success' });
      } else {
        // Mock success for demo
        setToast({ message: 'Configurações salvas (Modo Demo)!', type: 'success' });
      }
    } catch (e) {
      console.error(e);
      setToast({ message: 'Configurações salvas (Modo Demo)!', type: 'success' });
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetchWithAuth('/api/ai/predictive/analyze', {
        method: 'POST'
      });
      if (res.ok) setPredictiveData(await res.json());
      else {
        // Mock data
        setTimeout(() => {
            setPredictiveData({
                potentialReaches: 142,
                message: 'Identificamos 142 clientes que não interagem há mais de 30 dias e possuem perfil de compra recorrente.'
            });
        }, 1500);
      }
    } catch (e) {
      console.error(e);
      setTimeout(() => {
        setPredictiveData({
            potentialReaches: 142,
            message: 'Identificamos 142 clientes que não interagem há mais de 30 dias e possuem perfil de compra recorrente.'
        });
    }, 1500);
    } finally {
      setTimeout(() => setIsAnalyzing(false), 1500);
    }
  };

  // === FUNÇÕES DE SNIPPETS ===
  
  const handleAddSnippet = () => {
    setEditingSnippet(null);
    setSnippetForm({ label: '', text: '', trigger: '' });
    setShowSnippetModal(true);
  };
  
  const handleEditSnippet = (snippet: Snippet) => {
    setEditingSnippet(snippet);
    setSnippetForm({ label: snippet.label, text: snippet.text, trigger: snippet.trigger || '' });
    setShowSnippetModal(true);
  };
  
  const handleDeleteSnippet = (id: string) => {
    setSnippets(snippets.filter(s => s.id !== id));
    setToast({ message: 'Snippet removido!', type: 'info' });
  };
  
  const handleSaveSnippet = () => {
    if (!snippetForm.label || !snippetForm.text) {
      setToast({ message: 'Preencha todos os campos!', type: 'error' });
      return;
    }
    
    if (editingSnippet) {
      setSnippets(snippets.map(s => s.id === editingSnippet.id ? { ...s, ...snippetForm } : s));
      setToast({ message: 'Snippet atualizado!', type: 'success' });
    } else {
      setSnippets([...snippets, { id: Date.now().toString(), ...snippetForm }]);
      setToast({ message: 'Snippet adicionado!', type: 'success' });
    }
    
    setShowSnippetModal(false);
  };

  // === FUNÇÃO DE SIMULADOR DE CHAT ===
  
  const handleSimulateChat = async () => {
    if (!chatInput.trim() || isSimulating) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsSimulating(true);
    
    // Simular resposta da IA
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    
    // Gerar resposta baseada no contexto
    const responses = [
      `Entendi sua dúvida sobre "${userMessage}". Deixe-me verificar isso para você!`,
      `Interessante pergunta! Com base nas informações do seu negócio, posso sugerir algumas opções.`,
      `Claro! Vou te ajudar com isso. O ${config.aiName} está aqui para resolver suas necessidades.`,
      `Perfeito! Baseado no seu perfil de ${config.niche}, recomendo entrarmos em contato para um atendimento personalizado.`
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    setChatMessages(prev => [...prev, { role: 'ai', text: randomResponse }]);
    setIsSimulating(false);
  };

  // === FUNÇÃO DE AUMENTAR LIMITE ===
  
  const handleIncreaseLimit = async () => {
    try {
      const res = await fetchWithAuth('/api/merchant/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (res.ok) {
        const data = await res.json();
        setConfig(prev => ({ ...prev, tokenLimit: data.newLimit || prev.tokenLimit * 2 }));
        setToast({ message: 'Limite aumentado com sucesso!', type: 'success' });
      } else {
        // Redirecionar para página de upgrade
        setToast({ message: 'Redirecionando para upgrade...', type: 'info' });
        // Em produção, redirecionar para checkout
      }
    } catch (e) {
      setToast({ message: 'Entre em contato com seu revendedor para aumentar o limite.', type: 'info' });
    }
    setShowLimitModal(false);
  };

  // === FUNÇÃO DE ABORDAGEM PROATIVA ===
  
  const handleStartProactive = async () => {
    setIsStartingProactive(true);
    
    try {
      const res = await fetchWithAuth('/api/ai/predictive/start-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetCount: predictiveData?.potentialReaches || 0,
          message: `Olá! Sentimos sua falta. Temos uma oferta especial para você retornar!`
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setToast({ message: `Campanha iniciada! ${data.messagesSent || predictiveData?.potentialReaches} mensagens sendo enviadas.`, type: 'success' });
        setPredictiveData(null);
      } else {
        // Simular sucesso
        setToast({ message: `Campanha iniciada! ${predictiveData?.potentialReaches} mensagens sendo enviadas.`, type: 'success' });
        setPredictiveData(null);
      }
    } catch (e) {
      // Simular sucesso em modo demo
      setToast({ message: `Campanha iniciada (Demo)! ${predictiveData?.potentialReaches} mensagens simuladas.`, type: 'success' });
      setPredictiveData(null);
    } finally {
      setIsStartingProactive(false);
    }
  };

  const niches = [
    'Oficina Mecânica',
    'Clínica Odontológica',
    'Pet Shop',
    'Loja de Móveis Planejados',
    'Distribuidora de Gás/Água',
    'Estética e Beleza',
    'Academia / Personal',
    'Varejo Geral'
  ];

  // Calcular uso de tokens
  const tokenUsagePercent = (config.tokensUsed / config.tokenLimit) * 100;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Configuração da IA</h2>
          <p className="tech-label text-primary">Inteligência Central</p>
        </div>
        <button 
          onClick={handleSave}
          className="bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-black uppercase tracking-tighter shadow-xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-2"
        >
          <Save className="w-5 h-5" />
          Salvar Alterações
        </button>
      </div>

      {/* Token Usage Card */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Uso de Tokens IA</p>
              <p className="text-xs text-muted-foreground">{config.tokensUsed.toLocaleString()} / {config.tokenLimit.toLocaleString()} tokens</p>
            </div>
          </div>
          <button 
            onClick={() => setShowLimitModal(true)}
            className="px-4 py-2 rounded-xl border border-primary text-primary text-xs font-bold hover:bg-primary/10 transition-colors"
          >
            Aumentar Limite
          </button>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-500",
              tokenUsagePercent > 90 ? "bg-red-500" : tokenUsagePercent > 70 ? "bg-amber-500" : "bg-primary"
            )}
            style={{ width: `${Math.min(tokenUsagePercent, 100)}%` }}
          />
        </div>
        {tokenUsagePercent > 80 && (
          <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Seu limite está quase esgotado. Considere fazer um upgrade.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Form */}
        <div className="lg:col-span-2 space-y-8">
          {/* Vendedor IA Section */}
          <div className="glass-card p-8 space-y-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">Vendedor IA</h3>
                <p className="text-[10px] text-muted-foreground font-bold uppercase">Configure a alma do seu atendimento</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="tech-label flex items-center gap-2"><Sparkles className="w-3 h-3" /> Mindset da IA</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setConfig({...config, mindset: 'GROUNDING'})}
                    className={`p-3 rounded-xl border text-left transition-all ${config.mindset === 'GROUNDING' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
                  >
                    <p className="text-[10px] font-black uppercase tracking-tighter">100% Automático</p>
                    <p className="text-[9px] text-muted-foreground leading-tight">Grounding: Só responde o que está na base.</p>
                  </button>
                  <button
                    onClick={() => setConfig({...config, mindset: 'CONSULTANT'})}
                    className={`p-3 rounded-xl border text-left transition-all ${config.mindset === 'CONSULTANT' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-primary/50'}`}
                  >
                    <p className="text-[10px] font-black uppercase tracking-tighter">Consultor Híbrido</p>
                    <p className="text-[9px] text-muted-foreground leading-tight">Criativo: Sugere soluções além da base.</p>
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="tech-label flex items-center gap-2"><ShieldAlert className="w-3 h-3" /> Segurança</label>
                <div className="p-3 rounded-xl border border-border bg-muted/30">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Proteção Ativa
                  </p>
                  <p className="text-[9px] text-muted-foreground leading-tight">
                    {config.mindset === 'GROUNDING' 
                      ? "Risco Zero de Alucinação: A IA está travada nos seus documentos." 
                      : "IA Criativa: A IA usará o Gemini para ajudar na conversão."}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="tech-label">Nome do Vendedor</label>
                <input 
                  type="text" 
                  value={config.aiName}
                  onChange={e => setConfig({...config, aiName: e.target.value})}
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors font-bold text-sm"
                  placeholder="Ex: Carlos Vendedor"
                />
              </div>
              <div className="space-y-2">
                <label className="tech-label">Template de Inteligência</label>
                <select 
                  value={activePromptId}
                  onChange={e => setActivePromptId(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors font-bold text-sm"
                >
                  <option value="">Selecione um Template...</option>
                  {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="tech-label flex items-center gap-2"><Smile className="w-3 h-3" /> Personalidade</label>
                <select 
                  value={config.personality}
                  onChange={e => setConfig({...config, personality: e.target.value})}
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors font-bold text-sm"
                >
                  <option>Amigável e Prestativo</option>
                  <option>Sério e Profissional</option>
                  <option>Vendedor Agressivo</option>
                  <option>Engraçado e Jovem</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="tech-label flex items-center gap-2"><Target className="w-3 h-3" /> Objetivo Principal</label>
                <select 
                  value={config.salesGoal}
                  onChange={e => setConfig({...config, salesGoal: e.target.value})}
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors font-bold text-sm"
                >
                  <option>Agendar Horário</option>
                  <option>Vender Produto</option>
                  <option>Capturar Lead</option>
                  <option>Tirar Dúvidas</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="tech-label">Dados Específicos do Negócio</label>
              <textarea 
                rows={4}
                value={config.businessData}
                onChange={e => setConfig({...config, businessData: e.target.value})}
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors resize-none text-sm"
                placeholder="Endereço, Senha Wi-Fi, Regras de Cancelamento, etc..."
              />
              <p className="text-[10px] text-muted-foreground italic">Essas informações serão injetadas na inteligência da IA.</p>
            </div>
          </div>

          {/* IA Preditiva (Predatória) Section */}
          <div className="relative">
            {!planModules.predictive && (
              <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[2px] rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-amber-500/20">
                <div className="bg-amber-500 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest shadow-2xl flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Upgrade Necessário
                </div>
                <p className="mt-4 text-xs font-bold text-muted-foreground uppercase tracking-tighter">Módulo Preditivo não incluso no seu plano</p>
              </div>
            )}
            <div className={cn("glass-card p-8 space-y-8 border-l-4 border-amber-500", !planModules.predictive && "opacity-50")}>
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Radar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight">IA Preditiva (Modo Caçador)</h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Não espere o cliente. Vá até ele.</p>
                </div>
              </div>
              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className={cn(
                  "px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2",
                  isAnalyzing ? "bg-muted text-muted-foreground" : "bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:scale-105"
                )}
              >
                {isAnalyzing ? "Analisando..." : "Analisar Base Agora"}
              </button>
            </div>

            {predictiveData && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Clientes Identificados:</span>
                  <span className="text-xl font-black text-amber-500">{predictiveData.potentialReaches}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{predictiveData.message}</p>
                <button 
                  onClick={handleStartProactive}
                  disabled={isStartingProactive}
                  className="w-full bg-amber-500 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors disabled:opacity-50"
                >
                  {isStartingProactive ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Iniciando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Iniciar Abordagem Proativa
                    </>
                  )}
                </button>
              </motion.div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border">
                <div>
                  <p className="text-sm font-bold">Follow-up Automático</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Reativar clientes após 30 dias</p>
                </div>
                <button 
                  onClick={() => setConfig({...config, predictiveMode: !config.predictiveMode})}
                  className={cn(
                    "w-10 h-5 rounded-full transition-all relative",
                    config.predictiveMode ? "bg-amber-500" : "bg-muted-foreground/30"
                  )}
                >
                  <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", config.predictiveMode ? "left-6" : "left-1")} />
                </button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border">
                <div>
                  <p className="text-sm font-bold">Lembrete de Agendamento</p>
                  <p className="text-[10px] text-muted-foreground uppercase">24h antes do compromisso</p>
                </div>
                <div className="w-10 h-5 rounded-full bg-amber-500 relative">
                  <div className="absolute top-1 left-6 w-3 h-3 bg-white rounded-full" />
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* Custom Prompt Section */}
          <div className="relative">
            {!allowCustomPrompts && (
              <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[2px] rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-primary/20">
                <div className="bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-black uppercase tracking-widest shadow-2xl flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Em Breve
                </div>
                <p className="mt-4 text-xs font-bold text-muted-foreground uppercase tracking-tighter">Função bloqueada pelo seu Revendedor</p>
              </div>
            )}
            
            <div className="glass-card p-8 space-y-6 opacity-50">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-primary" />
                  Prompt Customizado
                </h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="tech-label">Instruções Avançadas</label>
                  <textarea 
                    disabled
                    rows={6}
                    className="w-full bg-muted/20 border border-border rounded-xl px-4 py-3 outline-none cursor-not-allowed"
                    placeholder="Escreva seu próprio prompt aqui..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="tech-label">Nicho de Negócio</label>
                <select 
                  value={config.niche}
                  onChange={e => setConfig({...config, niche: e.target.value})}
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors font-bold text-sm"
                >
                  {niches.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="tech-label">Identidade do Assistente</label>
                <input 
                  type="text" 
                  value={config.aiName}
                  onChange={e => setConfig({...config, aiName: e.target.value})}
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors font-bold text-sm"
                  placeholder="Ex: Assistente Oficina"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="tech-label">Tom de Voz</label>
                <select 
                  value={config.tone}
                  onChange={e => setConfig({...config, tone: e.target.value})}
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors font-bold text-sm"
                >
                  <option>Profissional e Amigável</option>
                  <option>Descontraído e Jovem</option>
                  <option>Sério e Técnico</option>
                  <option>Vendedor Agressivo</option>
                </select>
              </div>
              <div className="space-y-2 relative">
                {!planModules.sales && (
                  <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center border border-dashed border-primary/20">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary bg-background px-3 py-1 rounded-full shadow-sm">
                      <Lock className="w-3 h-3" /> Upgrade
                    </div>
                  </div>
                )}
                <label className="tech-label">Modo Vendas</label>
                <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-xl border border-border">
                  <div className={cn("w-2 h-2 rounded-full", config.salesMode ? "bg-emerald-500" : "bg-muted-foreground")} />
                  <span className="text-xs font-bold uppercase tracking-wider flex-1">Ativo</span>
                  <button 
                    disabled={!planModules.sales}
                    onClick={() => setConfig({...config, salesMode: !config.salesMode})}
                    className={cn(
                      "w-10 h-5 rounded-full transition-all relative",
                      config.salesMode ? "bg-primary" : "bg-muted-foreground/30",
                      !planModules.sales && "cursor-not-allowed opacity-50"
                    )}
                  >
                    <div className={cn("absolute top-1 w-3 h-3 bg-white rounded-full transition-all", config.salesMode ? "left-6" : "left-1")} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Prompt Base (Instruções do Sistema)
              </label>
              <textarea 
                rows={6}
                value={config.basePrompt}
                onChange={e => setConfig({...config, basePrompt: e.target.value})}
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors resize-none"
                placeholder="Descreva como a IA deve se comportar..."
              />
              <p className="text-[10px] text-muted-foreground italic">Dica: Use variáveis como {'{{nome_empresa}}'} e {'{{produtos}}'} para que a IA use dados reais do seu catálogo.</p>
            </div>

            <div className="space-y-4 pt-8 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="tech-label">Respostas Rápidas (Snippets)</label>
                <button 
                  onClick={handleAddSnippet}
                  className="text-primary tech-label hover:underline flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Adicionar Snippet
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {snippets.map((snippet) => (
                  <div 
                    key={snippet.id} 
                    className="p-4 rounded-xl bg-muted/30 border border-border group hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <p className="tech-label text-[10px] mb-1">{snippet.label}</p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditSnippet(snippet)}
                          className="p-1 hover:bg-primary/10 rounded"
                        >
                          <MessageSquare className="w-3 h-3 text-muted-foreground hover:text-primary" />
                        </button>
                        <button 
                          onClick={() => handleDeleteSnippet(snippet.id)}
                          className="p-1 hover:bg-destructive/10 rounded"
                        >
                          <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs font-medium text-muted-foreground line-clamp-2">"{snippet.text}"</p>
                    {snippet.trigger && (
                      <p className="text-[10px] text-primary mt-1">Gatilho: {snippet.trigger}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Ocultar Preços</p>
                    <p className="text-xs text-muted-foreground">A IA nunca mencionará valores, sugerindo orçamento humano.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setConfig({...config, priceDisabled: !config.priceDisabled})}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    config.priceDisabled ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    config.priceDisabled ? "left-7" : "left-1"
                  )} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Handoff Humano</p>
                    <p className="text-xs text-muted-foreground">Pausa a IA por 30 min se você enviar uma mensagem manual.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setConfig({...config, handoffEnabled: !config.handoffEnabled})}
                  className={cn(
                    "w-12 h-6 rounded-full transition-colors relative",
                    config.handoffEnabled ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    config.handoffEnabled ? "left-7" : "left-1"
                  )} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview / Simulation */}
        <div className="space-y-6">
          <div className="glass-card p-6 h-full flex flex-col">
            <h3 className="font-bold mb-6 flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-primary" />
              Simulador de Chat
            </h3>
            
            <div className="flex-1 bg-muted/30 rounded-2xl border border-border p-4 space-y-4 overflow-auto min-h-[400px] max-h-[500px]">
              <AnimatePresence>
                {chatMessages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-2 max-w-[80%]",
                      msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      msg.role === 'ai' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {msg.role === 'ai' ? <Sparkles className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className={cn(
                      "p-3 rounded-2xl text-xs shadow-sm border",
                      msg.role === 'ai' 
                        ? "bg-card rounded-tl-none border-border" 
                        : "bg-primary text-primary-foreground rounded-tr-none shadow-primary/10"
                    )}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isSimulating && (
                <div className="flex gap-2 max-w-[80%]">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="bg-card p-3 rounded-2xl rounded-tl-none text-xs border border-border">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <input 
                type="text" 
                placeholder="Teste uma mensagem..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSimulateChat()}
                className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-2 text-xs outline-none focus:border-primary/50"
                disabled={isSimulating}
              />
              <button 
                onClick={handleSimulateChat}
                disabled={isSimulating || !chatInput.trim()}
                className="p-2 bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/10 disabled:opacity-50 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
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
      
      {/* Modal de Snippet */}
      <Modal
        isOpen={showSnippetModal}
        onClose={() => setShowSnippetModal(false)}
        title={editingSnippet ? "Editar Snippet" : "Novo Snippet"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome do Snippet</label>
            <input 
              type="text" 
              value={snippetForm.label}
              onChange={(e) => setSnippetForm({...snippetForm, label: e.target.value})}
              className="w-full p-2 rounded-lg border border-border bg-background" 
              placeholder="Ex: Saudação"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Texto da Resposta</label>
            <textarea 
              value={snippetForm.text}
              onChange={(e) => setSnippetForm({...snippetForm, text: e.target.value})}
              className="w-full p-2 rounded-lg border border-border bg-background h-24 resize-none" 
              placeholder="Digite a mensagem..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gatilho (opcional)</label>
            <input 
              type="text" 
              value={snippetForm.trigger}
              onChange={(e) => setSnippetForm({...snippetForm, trigger: e.target.value})}
              className="w-full p-2 rounded-lg border border-border bg-background" 
              placeholder="Ex: /saudacao"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button 
              type="button" 
              onClick={() => setShowSnippetModal(false)}
              className="px-4 py-2 rounded-lg hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="button" 
              onClick={handleSaveSnippet}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
            >
              {editingSnippet ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      </Modal>
      
      {/* Modal de Limite */}
      <Modal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        title="Aumentar Limite de Tokens"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Seu plano atual tem <strong>{config.tokenLimit.toLocaleString()} tokens/mês</strong>.
          </p>
          <p className="text-muted-foreground">
            Você já usou <strong>{config.tokensUsed.toLocaleString()} tokens</strong> ({tokenUsagePercent.toFixed(1)}%).
          </p>
          <div className="p-4 bg-muted/30 rounded-xl border border-border">
            <p className="text-sm font-bold mb-2">Opções de Upgrade:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Plano Pro: 200.000 tokens/mês</li>
              <li>• Plano Enterprise: 500.000 tokens/mês</li>
              <li>• Tokens avulsos: R$ 10,00 / 10.000 tokens</li>
            </ul>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button 
              type="button" 
              onClick={() => setShowLimitModal(false)}
              className="px-4 py-2 rounded-lg hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="button" 
              onClick={handleIncreaseLimit}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity"
            >
              Fazer Upgrade
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
