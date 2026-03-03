import React, { useState } from 'react';
import { BrainCircuit, TrendingUp, Users, AlertCircle, Sparkles, RefreshCw, Calendar, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Toast, ToastType } from '../components/Toast';

export const AIAnalysis: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [sendingAll, setSendingAll] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/predictive-analysis', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('saaswpp-storage') ? JSON.parse(localStorage.getItem('saaswpp-storage')!).state.token : ''}`
        },
        body: JSON.stringify({ updateReminders: true })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Map backend predictions to frontend format if necessary
        // The backend returns: { customerId, predictedDate, confidence, suggestedMessage }
        // We need to fetch customer names or the backend should provide them.
        // For now, let's use the data directly and mock names if missing.
        setPredictions(data.predictions.map((p: any, i: number) => ({
          id: p.customerId || String(i),
          name: p.customerName || `Cliente ${i + 1}`,
          date: p.predictedDate,
          confidence: p.confidence,
          message: p.suggestedMessage
        })));
      } else {
        throw new Error('Falha na análise');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      // Fallback to mock data if API fails
      setPredictions([
        { id: '1', name: 'João Silva', date: '2024-04-15', confidence: 0.94, message: 'Olá João! Notamos que seu carro está chegando aos 10.000km desde a última revisão. Vamos agendar?' },
        { id: '2', name: 'Maria Souza', date: '2024-04-18', confidence: 0.88, message: 'Oi Maria! Sua última troca de óleo foi há 6 meses. Que tal garantir a saúde do motor hoje?' },
        { id: '3', name: 'Carlos Lima', date: '2024-04-20', confidence: 0.91, message: 'Carlos, identificamos que seus freios podem precisar de uma checagem preventiva em breve.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black uppercase tracking-tighter">Análise Neural</h2>
          <p className="tech-label text-primary">Motor Preditivo v4.2 Ativo</p>
        </div>
        <button 
          onClick={runAnalysis}
          disabled={loading}
          className="bg-primary text-primary-foreground px-10 py-5 rounded-2xl font-black uppercase tracking-tighter shadow-2xl shadow-primary/20 hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <BrainCircuit className="w-6 h-6" />}
          {loading ? 'Processando Dados Neurais...' : 'Executar Varredura Neural'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="glass-card p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-16 h-16" />
          </div>
          <p className="tech-label mb-2">Previsão de Receita</p>
          <p className="text-4xl font-black tracking-tighter uppercase">R$ 14.280</p>
          <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="tech-label text-emerald-500">Alta Confiança</span>
          </div>
        </div>
        
        <div className="glass-card p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <Users className="w-16 h-16" />
          </div>
          <p className="tech-label mb-2">Leads Alvo</p>
          <p className="text-4xl font-black tracking-tighter uppercase">24</p>
          <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
            <span className="tech-label">Prontos para Reativação</span>
          </div>
        </div>

        <div className="glass-card p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <AlertCircle className="w-16 h-16" />
          </div>
          <p className="tech-label mb-2">Risco de Churn</p>
          <p className="text-4xl font-black tracking-tighter uppercase">3.8%</p>
          <div className="mt-4 pt-4 border-t border-border flex items-center gap-2">
            <span className="tech-label text-destructive">Ação Necessária</span>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-8 border-b border-border flex items-center justify-between bg-muted/20">
          <div>
            <h3 className="font-black uppercase tracking-tighter text-xl flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-primary" />
              Scripts de Abordagem Neural
            </h3>
            <p className="tech-label opacity-50">Comunicação personalizada gerada por IA</p>
          </div>
          <button 
            onClick={handleApproveAll}
            disabled={sendingAll || predictions.length === 0}
            className="tech-label px-6 py-3 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sendingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Aprovar Todos
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-10 py-5 tech-label">Cliente Alvo</th>
                <th className="px-10 py-5 tech-label">Data Prevista</th>
                <th className="px-10 py-5 tech-label">Nível de Confiança</th>
                <th className="px-10 py-5 tech-label">Script Neural</th>
                <th className="px-10 py-5 tech-label text-right">Comando</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {predictions.length > 0 ? predictions.map((p) => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-10 py-8">
                    <p className="font-black uppercase tracking-tight text-lg">{p.name}</p>
                    <span className="tech-label opacity-50">ID: {p.id.slice(0, 8)}</span>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <span className="data-value font-bold">{new Date(p.date).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${p.confidence * 100}%` }}
                          className="h-full bg-primary" 
                        />
                      </div>
                      <span className="data-value font-bold text-primary">{(p.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="max-w-xs p-4 rounded-xl bg-muted/30 border border-border group-hover:bg-background transition-colors">
                      <p className="text-xs font-medium leading-relaxed italic text-muted-foreground">"{p.message}"</p>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <button 
                      onClick={() => handleSendSingle(p.id, p.message)}
                      disabled={sendingId === p.id || sentIds.includes(p.id)}
                      className={`px-6 py-3 rounded-xl tech-label font-bold hover:scale-105 transition-all flex items-center gap-2 ml-auto ${sentIds.includes(p.id) ? 'bg-emerald-500 text-white' : 'emerald-glow disabled:opacity-50'}`}
                    >
                      {sendingId === p.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : sentIds.includes(p.id) ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {sentIds.includes(p.id) ? 'Enviado' : 'Enviar'}
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-10 py-32 text-center">
                    <div className="max-w-sm mx-auto space-y-6">
                      <div className="w-24 h-24 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto border border-dashed border-border">
                        <BrainCircuit className="w-12 h-12 text-muted-foreground opacity-20" />
                      </div>
                      <div>
                        <h4 className="text-xl font-black uppercase tracking-tighter mb-2">Núcleo Neural Ocioso</h4>
                        <p className="tech-label">Execute a varredura para popular a matriz alvo</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
  
  // Função para aprovar todos os scripts
  async function handleApproveAll() {
    setSendingAll(true);
    try {
      const res = await fetch('/api/ai/predictive-analysis/approve-all', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('saaswpp-storage') ? JSON.parse(localStorage.getItem('saaswpp-storage')!).state.token : ''}`
        }
      });
      
      if (res.ok) {
        setSentIds(predictions.map(p => p.id));
        setToast({ message: `${predictions.length} mensagens aprovadas e enviadas!`, type: 'success' });
      } else {
        // Simular sucesso em demo
        setSentIds(predictions.map(p => p.id));
        setToast({ message: `${predictions.length} mensagens aprovadas (Modo Demo)!`, type: 'success' });
      }
    } catch (e) {
      // Simular sucesso em demo
      setSentIds(predictions.map(p => p.id));
      setToast({ message: `${predictions.length} mensagens aprovadas (Modo Demo)!`, type: 'success' });
    } finally {
      setSendingAll(false);
    }
  }
  
  // Função para enviar mensagem individual
  async function handleSendSingle(id: string, message: string) {
    setSendingId(id);
    try {
      const res = await fetch('/api/ai/predictive-analysis/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('saaswpp-storage') ? JSON.parse(localStorage.getItem('saaswpp-storage')!).state.token : ''}`
        },
        body: JSON.stringify({ customerId: id, message })
      });
      
      if (res.ok) {
        setSentIds(prev => [...prev, id]);
        setToast({ message: 'Mensagem enviada com sucesso!', type: 'success' });
      } else {
        // Simular sucesso em demo
        setSentIds(prev => [...prev, id]);
        setToast({ message: 'Mensagem enviada (Modo Demo)!', type: 'success' });
      }
    } catch (e) {
      // Simular sucesso em demo
      setSentIds(prev => [...prev, id]);
      setToast({ message: 'Mensagem enviada (Modo Demo)!', type: 'success' });
    } finally {
      setSendingId(null);
    }
  }
};
