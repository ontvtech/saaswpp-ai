import React, { useEffect, useState } from 'react';
import { ShieldCheck, Activity, Zap, MessageSquare, Database, BrainCircuit, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { motion } from 'motion/react';

export const StatusPage: React.FC = () => {
  const [statusData, setStatusData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        setStatusData(data);
      } catch (e) {
        console.error('Status fetch failed');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Activity className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  const services = [
    { name: 'Serviço de IA (Gemini Brain)', id: 'ai_brain', icon: BrainCircuit },
    { name: 'Gateway de Mensagens (Evolution)', id: 'message_gateway', icon: MessageSquare },
    { name: 'Banco de Dados (PostgreSQL)', id: 'database', icon: Database },
    { name: 'Cache Global (Redis)', id: 'redis_cache', icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-8 md:p-20">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 mb-4">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-widest">Página de Status Oficial</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter uppercase">SaaSWpp Status</h1>
          <p className="text-muted-foreground text-lg">Monitoramento em tempo real da nossa infraestrutura global.</p>
        </div>

        {/* Global Status Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-8 rounded-3xl border-2 flex items-center justify-between ${
            statusData?.status === 'operational' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
              : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
          }`}
        >
          <div className="flex items-center gap-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              statusData?.status === 'operational' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
            }`}>
              {statusData?.status === 'operational' ? <CheckCircle2 className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-tight">
                {statusData?.status === 'operational' ? 'Todos os sistemas operacionais' : 'Instabilidade Detectada'}
              </h2>
              <p className="opacity-80 font-medium">Última verificação: {new Date(statusData?.last_update).toLocaleTimeString()}</p>
            </div>
          </div>
          <div className="hidden md:block">
            <span className="text-sm font-bold uppercase tracking-widest opacity-60">Uptime 90 dias: 99.98%</span>
          </div>
        </motion.div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 gap-4">
          {services.map((service, i) => {
            const sData = statusData?.services[service.id];
            return (
              <motion.div 
                key={service.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 flex items-center justify-between border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <service.icon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold">{service.name}</h3>
                    {sData?.latency && <p className="text-[10px] text-muted-foreground font-mono">Latência: {sData.latency}</p>}
                    {sData?.uptime && <p className="text-[10px] text-muted-foreground font-mono">Uptime: {sData.uptime}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold uppercase tracking-widest ${
                    sData?.status === 'operational' ? 'text-emerald-500' : 'text-amber-500'
                  }`}>
                    {sData?.status === 'operational' ? 'Operacional' : 'Degradado'}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${
                    sData?.status === 'operational' ? 'bg-emerald-500' : 'bg-amber-500'
                  } animate-pulse`} />
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Incident History */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Histórico de Incidentes
          </h3>
          <div className="space-y-4">
            {[
              { date: '25 de Fev, 2024', title: 'Manutenção Programada - Cluster Evolution', status: 'Resolvido', desc: 'Atualização de segurança nos nós de 16GB concluída com sucesso.' },
              { date: '12 de Fev, 2024', title: 'Instabilidade na API Gemini', status: 'Resolvido', desc: 'Detectamos latência elevada no pool de IA. Failover automático executado.' }
            ].map((incident, i) => (
              <div key={i} className="p-6 rounded-2xl bg-muted/30 border border-border space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold">{incident.title}</h4>
                  <span className="text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-lg">{incident.status}</span>
                </div>
                <p className="text-sm text-muted-foreground">{incident.desc}</p>
                <p className="text-[10px] font-mono text-muted-foreground">{incident.date}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center pt-12 border-t border-border">
          <p className="text-sm text-muted-foreground">© 2024 SaaSWpp Enterprise. Todos os direitos reservados.</p>
          <div className="flex justify-center gap-6 mt-4">
            <a href="#" className="text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors">Termos</a>
            <a href="#" className="text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors">Privacidade</a>
            <a href="#" className="text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors">Suporte</a>
          </div>
        </footer>
      </div>
    </div>
  );
};
