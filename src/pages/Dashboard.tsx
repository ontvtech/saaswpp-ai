import React, { useState, useEffect, useRef } from 'react';
import { Responsive } from 'react-grid-layout';
import { useNavigate } from 'react-router-dom';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useStore } from '../store/useStore';
import { Modal } from '../components/Modal';
import { Toast, ToastType } from '../components/Toast';
import { 
  MessageSquare, 
  TrendingUp, 
  Users, 
  Calendar, 
  Zap, 
  BrainCircuit,
  ArrowUpRight,
  Clock,
  Package,
  CheckCircle2,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function useContainerWidth() {
  const [width, setWidth] = useState(1200);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateWidth);
      observer.disconnect();
    };
  }, []);

  return { width, containerRef, mounted };
}


const data = [
  { name: 'Seg', messages: 400, leads: 24 },
  { name: 'Ter', messages: 300, leads: 13 },
  { name: 'Qua', messages: 200, leads: 98 },
  { name: 'Qui', messages: 278, leads: 39 },
  { name: 'Sex', messages: 189, leads: 48 },
  { name: 'Sáb', messages: 239, leads: 38 },
  { name: 'Dom', messages: 349, leads: 43 },
];

export const Dashboard: React.FC = () => {
  const [stats, setStats] = React.useState<any>(null);
  const { user, token, fetchWithAuth } = useStore();
  const merchant = user?.merchant;
  const { width, containerRef, mounted } = useContainerWidth();
  const navigate = useNavigate();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'appointment' | 'campaign' | 'product' | 'message' | null>(null);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const handleQuickAction = (label: string) => {
    switch (label) {
      case 'Config. IA': navigate('/ai-config'); break;
      case 'Catálogo': navigate('/catalog'); break;
      case 'Agenda': navigate('/appointments'); break;
      case 'WhatsApp': navigate('/whatsapp'); break;
    }
  };

  const openModal = (type: 'appointment' | 'campaign' | 'product' | 'message', lead?: any) => {
    setModalType(type);
    if (lead) setSelectedLead(lead);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate API call
    setTimeout(() => {
      setIsModalOpen(false);
      setToast({ message: 'Ação realizada com sucesso!', type: 'success' });
    }, 500);
  };

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetchWithAuth('/api/merchant/stats');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setStats({
          messages: 12543, // Keep some hardcoded or mix with API
          leads: data.activeChats,
          conversion: data.aiAutomationRate,
          response_time: '1.2s'
        });
      } catch (e) {
        if (import.meta.env.DEV) {
          console.warn('Using mock data for dashboard stats');
          setStats({
            messages: 12543,
            leads: 48,
            conversion: '8.2%',
            response_time: '1.2s'
          });
        }
      }
    };
    fetchStats();
  }, [token]);

  const defaultLayouts = {
    lg: [
      { i: 'status', x: 0, y: 0, w: 3, h: 3 },
      { i: 'plan-info', x: 0, y: 3, w: 3, h: 3 },
      { i: 'metrics', x: 3, y: 0, w: 6, h: 4 },
      { i: 'usage', x: 9, y: 0, w: 3, h: 4 },
      { i: 'leads', x: 0, y: 6, w: 3, h: 5 },
      { i: 'hot-leads', x: 3, y: 4, w: 6, h: 4 },
      { i: 'shortcuts', x: 9, y: 4, w: 3, h: 4 },
    ]
  };

  const [layouts, setLayouts] = useState(() => {
    const saved = localStorage.getItem('dashboard_layout');
    return saved ? JSON.parse(saved) : defaultLayouts;
  });

  const handleLayoutChange = (layout: any, allLayouts: any) => {
    setLayouts(allLayouts);
    localStorage.setItem('dashboard_layout', JSON.stringify(allLayouts));
  };

  const handleResetLayout = () => {
    setLayouts(defaultLayouts);
    localStorage.removeItem('dashboard_layout');
    setToast({ message: 'Layout restaurado para o padrão.', type: 'info' });
  };

  return (
    <div className="space-y-8" ref={containerRef}>
      <div className="flex justify-end mb-2">
        <button 
          onClick={handleResetLayout}
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
        >
          <Settings className="w-3 h-3" /> Restaurar Layout Padrão
        </button>
      </div>
      {mounted && (
        <Responsive
          className="layout"
          width={width}
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          draggableHandle=".drag-handle"
          onLayoutChange={handleLayoutChange}
          {...({} as any)}
        >
        {/* WhatsApp Status Widget */}
        <div key="status" className="glass-card p-6 flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap className="w-20 h-20" />
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="drag-handle cursor-move p-1.5 hover:bg-muted rounded-lg transition-colors">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="tech-label text-primary">Sistema Online</span>
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="tech-label mb-1">Status da Rede</h3>
            <p className="text-xl md:text-2xl font-black tracking-tighter uppercase truncate">Operacional</p>
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <span className="tech-label">Mensagens</span>
              <span className="data-value font-bold text-primary">{stats?.messages || 0}</span>
            </div>
          </div>
        </div>

        {/* Plan & Niche Info Widget */}
        <div key="plan-info" className="glass-card p-6 flex flex-col justify-between group overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldCheck className="w-20 h-20" />
          </div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="drag-handle cursor-move p-1.5 hover:bg-muted rounded-lg transition-colors">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <span className="tech-label text-primary">Assinatura Ativa</span>
            </div>
          </div>
          <div className="relative z-10">
            <h3 className="tech-label mb-1">Plano Atual</h3>
            <p className="text-xl md:text-2xl font-black tracking-tighter uppercase truncate">{merchant?.plan?.name || 'Beta 10'}</p>
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <span className="tech-label">Nicho</span>
              <span className="data-value font-bold text-primary">{merchant?.niche?.name || 'Geral'}</span>
            </div>
          </div>
        </div>

        {/* Main Metrics Chart */}
        <div key="metrics" className="glass-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="drag-handle cursor-move p-1.5 hover:bg-muted rounded-lg transition-colors">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold uppercase tracking-tight truncate">Visão Geral</h3>
                <p className="tech-label truncate">Tráfego em tempo real</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-2 w-2 rounded-full bg-primary/20" />
              <select className="bg-muted/50 border border-border rounded-lg text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 outline-none focus:border-primary/50">
                <option>Últimos 7 Dias</option>
                <option>Últimos 30 Dias</option>
              </select>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 9, fill: 'var(--muted-foreground)', fontWeight: 600, fontFamily: 'var(--font-mono)'}} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 9, fill: 'var(--muted-foreground)', fontWeight: 600, fontFamily: 'var(--font-mono)'}} 
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--card)', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border)', 
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                  }}
                  cursor={{stroke: 'var(--primary)', strokeWidth: 1, strokeDasharray: '4 4'}}
                />
                <Area 
                  type="monotone" 
                  dataKey="messages" 
                  stroke="var(--primary)" 
                  fillOpacity={1} 
                  fill="url(#colorMessages)" 
                  strokeWidth={2} 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Usage Widget */}
        <div key="usage" className="glass-card p-6 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <BrainCircuit className="w-32 h-32" />
          </div>

          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="drag-handle cursor-move p-1.5 hover:bg-muted rounded-lg transition-colors">
              <BrainCircuit className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold uppercase tracking-tight truncate">Consumo IA</h3>
              <p className="tech-label truncate">Tokens & Requisições</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-4 relative z-10 mt-2">
            <div className="flex items-center justify-between gap-2">
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                 <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" stroke="var(--muted)" strokeWidth="6" fill="transparent" />
                    <circle 
                      cx="40" 
                      cy="40" 
                      r="32" 
                      stroke="var(--primary)" 
                      strokeWidth="6" 
                      fill="transparent" 
                      strokeDasharray={201} 
                      strokeDashoffset={201 * (1 - 0.65)} 
                      strokeLinecap="round"
                      className="drop-shadow-[0_0_10px_rgba(var(--primary),0.5)] transition-all duration-1000 ease-out"
                    />
                 </svg>
                 <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className="text-lg font-black tracking-tighter">65%</span>
                 </div>
              </div>
              <div className="flex-1 pl-2 space-y-1.5 min-w-0">
                 <div>
                    <p className="tech-label text-[10px] uppercase">Tokens Totais</p>
                    <p className="text-xl font-black tracking-tight truncate">3.2M</p>
                 </div>
                 <div>
                    <p className="tech-label text-[10px] uppercase">Custo Est.</p>
                    <p className="text-xs font-mono text-muted-foreground truncate">R$ 45,20</p>
                 </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                  <span>Input (Prompt)</span>
                  <span>1.8M</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-[60%]" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] uppercase font-bold text-muted-foreground">
                  <span>Output (Completion)</span>
                  <span>1.4M</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 w-[40%]" />
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-border mt-auto">
               <div className="flex justify-between items-center">
                  <span className="tech-label text-[10px]">Renova em 5 dias</span>
                  <button className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors">
                    Aumentar Limite
                  </button>
               </div>
            </div>
          </div>
        </div>

        {/* Smart Inbox (Kanban CRM) */}
        <div key="leads" className="glass-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="drag-handle cursor-move p-1.5 hover:bg-muted rounded-lg transition-colors">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold uppercase tracking-tight truncate">Smart Inbox</h3>
                <p className="tech-label truncate">CRM Autônomo (Kanban)</p>
              </div>
            </div>
            <div className="flex gap-1">
               <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="IA Classificando..." />
               <span className="tech-label text-[10px] text-muted-foreground">IA Ativa</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-x-auto custom-scrollbar pb-2">
            <div className="flex gap-4 min-w-[600px] h-full">
              {/* Coluna: Interesse */}
              <div className="flex-1 bg-muted/30 rounded-xl p-3 flex flex-col gap-3 border border-border/50">
                <div className="flex justify-between items-center mb-1">
                   <span className="text-xs font-bold uppercase text-blue-500">Interesse</span>
                   <span className="text-[10px] font-mono bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded">3</span>
                </div>
                <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1">
                   <div className="bg-background p-3 rounded-lg border border-border shadow-sm hover:border-blue-500/50 transition-colors cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                         <span className="font-bold text-sm truncate">Maria Souza</span>
                         <span className="text-[10px] text-muted-foreground">12m</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">"Gostaria de saber mais sobre o plano anual..."</p>
                      <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button className="p-1 hover:bg-muted rounded"><MessageSquare className="w-3 h-3" /></button>
                      </div>
                   </div>
                   <div className="bg-background p-3 rounded-lg border border-border shadow-sm hover:border-blue-500/50 transition-colors cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                         <span className="font-bold text-sm truncate">Pedro Lima</span>
                         <span className="text-[10px] text-muted-foreground">45m</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">"Qual o valor da troca de óleo?"</p>
                   </div>
                   <div className="bg-background p-3 rounded-lg border border-border shadow-sm hover:border-blue-500/50 transition-colors cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                         <span className="font-bold text-sm truncate">Ana Costa</span>
                         <span className="text-[10px] text-muted-foreground">1h</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">"Vocês aceitam cartão de crédito?"</p>
                   </div>
                </div>
              </div>

              {/* Coluna: Negociação */}
              <div className="flex-1 bg-muted/30 rounded-xl p-3 flex flex-col gap-3 border border-border/50">
                <div className="flex justify-between items-center mb-1">
                   <span className="text-xs font-bold uppercase text-amber-500">Negociação</span>
                   <span className="text-[10px] font-mono bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded">2</span>
                </div>
                <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1">
                   <div className="bg-background p-3 rounded-lg border border-border shadow-sm hover:border-amber-500/50 transition-colors cursor-pointer group relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                      <div className="flex justify-between items-start mb-2 pl-2">
                         <span className="font-bold text-sm truncate">João Silva</span>
                         <span className="text-[10px] text-muted-foreground">5m</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-2">"Pode me enviar o link de pagamento?"</p>
                      <div className="mt-2 pl-2 flex gap-1">
                         <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded border border-amber-200">Aguardando Link</span>
                      </div>
                   </div>
                   <div className="bg-background p-3 rounded-lg border border-border shadow-sm hover:border-amber-500/50 transition-colors cursor-pointer group pl-3">
                      <div className="flex justify-between items-start mb-2">
                         <span className="font-bold text-sm truncate">Carlos Edu</span>
                         <span className="text-[10px] text-muted-foreground">2h</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">"Vou ver com minha esposa e retorno."</p>
                   </div>
                </div>
              </div>

              {/* Coluna: Fechamento */}
              <div className="flex-1 bg-muted/30 rounded-xl p-3 flex flex-col gap-3 border border-border/50">
                <div className="flex justify-between items-center mb-1">
                   <span className="text-xs font-bold uppercase text-emerald-500">Fechado</span>
                   <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded">1</span>
                </div>
                <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1">
                   <div className="bg-background p-3 rounded-lg border border-border shadow-sm hover:border-emerald-500/50 transition-colors cursor-pointer group relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                      <div className="flex justify-between items-start mb-2 pl-2">
                         <span className="font-bold text-sm truncate">Roberto C.</span>
                         <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-2">Pagamento confirmado via PIX.</p>
                      <div className="mt-2 pl-2">
                         <span className="text-[10px] font-bold text-emerald-600">R$ 197,00</span>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/appointments')}
            className="w-full mt-4 py-2 rounded-lg text-xs font-bold border border-border hover:bg-muted transition-all shrink-0 flex items-center justify-center gap-2"
          >
            Ver Pipeline Completo <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        {/* Hot Re-engagement Leads */}
        <div key="hot-leads" className="glass-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="drag-handle cursor-move p-1.5 hover:bg-muted rounded-lg transition-colors">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold uppercase tracking-tight truncate">Reengajamento Quente</h3>
                <p className="tech-label text-primary truncate">Alta probabilidade</p>
              </div>
            </div>
            <div className="px-2 py-1 rounded bg-primary/10 border border-primary/20 shrink-0">
              <span className="tech-label text-primary animate-pulse">Prioridade</span>
            </div>
          </div>
          <div className="space-y-4 flex-1 overflow-auto custom-scrollbar">
            {[
              { name: "Roberto Carlos", reason: "Revisão vencida", phone: "5511999999999", score: 98 },
              { name: "Julia Mendes", reason: "Banho e tosa atrasado", phone: "5511888888888", score: 92 },
              { name: "Marcos Paulo", reason: "Limpeza dentária", phone: "5511777777777", score: 85 },
            ].map((lead, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-all group">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 shrink-0 rounded-full bg-primary text-white flex items-center justify-center font-black">
                    {lead.score}%
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black tracking-tight truncate">{lead.name}</p>
                    <p className="tech-label opacity-70 truncate">{lead.reason}</p>
                  </div>
                </div>
                <button 
                  onClick={() => openModal('message', lead)}
                  className="bg-primary text-white p-2 rounded-xl hover:scale-110 transition-transform shadow-lg shadow-primary/20 shrink-0 ml-2"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
          <button 
            onClick={() => navigate('/crm-predictive')}
            className="w-full mt-6 py-3 rounded-xl tech-label border border-border hover:bg-muted transition-all shrink-0"
          >
            Ver Todas as Oportunidades
          </button>
        </div>

        {/* Shortcuts */}
        <div key="shortcuts" className="glass-card p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <div className="drag-handle cursor-move p-1.5 hover:bg-muted rounded-lg transition-colors">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold uppercase tracking-tight truncate">Ações Rápidas</h3>
              <p className="tech-label truncate">Centro de comando</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 flex-1">
            {[
              { label: "Config. IA", icon: BrainCircuit, color: "bg-emerald-500/5 text-emerald-500 border-emerald-500/10" },
              { label: "Catálogo", icon: Package, color: "bg-blue-500/5 text-blue-500 border-blue-500/10" },
              { label: "Agenda", icon: Calendar, color: "bg-amber-500/5 text-amber-500 border-amber-500/10" },
              { label: "WhatsApp", icon: MessageSquare, color: "bg-purple-500/5 text-purple-500 border-purple-500/10" },
            ].map((s, i) => (
              <button 
                key={i} 
                onClick={() => handleQuickAction(s.label)}
                className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-border hover:border-primary/30 hover:bg-muted/50 transition-all group"
              >
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-all group-hover:scale-110 group-hover:shadow-lg shrink-0", s.color)}>
                  <s.icon className="w-5 h-5" />
                </div>
                <span className="tech-label font-bold truncate w-full text-center">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </Responsive>
      )}

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
        title={
          modalType === 'appointment' ? 'Novo Agendamento' :
          modalType === 'campaign' ? 'Nova Campanha' :
          modalType === 'product' ? 'Novo Produto' :
          'Enviar Mensagem'
        }
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {modalType === 'appointment' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Cliente</label>
                <input type="text" className="w-full p-2 rounded-lg border border-border bg-background" placeholder="Nome do cliente" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Data</label>
                <input type="datetime-local" className="w-full p-2 rounded-lg border border-border bg-background" required />
              </div>
            </>
          )}
          
          {modalType === 'campaign' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Nome da Campanha</label>
                <input type="text" className="w-full p-2 rounded-lg border border-border bg-background" placeholder="Ex: Promoção de Verão" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mensagem</label>
                <textarea className="w-full p-2 rounded-lg border border-border bg-background" rows={3} placeholder="Olá [Nome], ..." required />
              </div>
            </>
          )}

          {modalType === 'product' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Nome do Produto</label>
                <input type="text" className="w-full p-2 rounded-lg border border-border bg-background" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Preço (R$)</label>
                  <input type="number" step="0.01" className="w-full p-2 rounded-lg border border-border bg-background" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Estoque</label>
                  <input type="number" className="w-full p-2 rounded-lg border border-border bg-background" required />
                </div>
              </div>
            </>
          )}

          {modalType === 'message' && (
            <>
              <div className="p-3 bg-muted/50 rounded-lg mb-4">
                <p className="text-sm font-bold">{selectedLead?.name}</p>
                <p className="text-xs text-muted-foreground">{selectedLead?.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mensagem</label>
                <textarea 
                  className="w-full p-2 rounded-lg border border-border bg-background" 
                  rows={4} 
                  defaultValue={selectedLead ? `Olá ${selectedLead.name}, notamos que ${selectedLead.reason.toLowerCase()}. Gostaria de agendar?` : ''}
                  required 
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">Confirmar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
