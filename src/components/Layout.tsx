import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  MessageSquare, 
  Settings, 
  BrainCircuit, 
  LogOut, 
  Sun, 
  Moon,
  ShieldCheck,
  Store,
  Package,
  Bell,
  Send,
  DollarSign,
  Server,
  Shield,
  ShieldAlert,
  BarChart3,
  UserCircle,
  UserPlus,
  Cpu,
  Database,
  FileText,
  Eye,
  Headphones,
  CreditCard,
  Key,
  Activity,
  Terminal,
  Link as LinkIcon,
  Globe,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { theme, toggleTheme, user, logout, impersonatedMerchantId, impersonatedResellerId, setImpersonation } = useStore();
  const location = useLocation();

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const menuItems = [
    // Dashboard
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['ADMIN', 'RESELLER', 'MERCHANT'] },

    // ========================================
    // 👑 ADMIN - FOCO EM REVENDEDORES
    // ========================================
    
    // REVENDEDORES (FOCO PRINCIPAL)
    { path: '/admin/resellers', icon: Users, label: 'Lista de Revendedores', roles: ['ADMIN'], group: 'REVENDEDORES' },
    { path: '/admin/resellers/new', icon: UserPlus, label: 'Criar Revendedor', roles: ['ADMIN'], group: 'REVENDEDORES' },
    { path: '/admin/resellers/plans', icon: ShieldCheck, label: 'Planos de Revendedor', roles: ['ADMIN'], group: 'REVENDEDORES' },
    { path: '/admin/resellers/grace-period', icon: ShieldAlert, label: 'Grace Period', roles: ['ADMIN'], group: 'REVENDEDORES' },
    { path: '/admin/resellers/financials', icon: DollarSign, label: 'Financeiro', roles: ['ADMIN'], group: 'REVENDEDORES' },

    // INFRAESTRUTURA
    { path: '/admin/infrastructure/servers', icon: Server, label: 'Servidores', roles: ['ADMIN'], group: 'INFRAESTRUTURA' },
    { path: '/admin/infrastructure/ai-keys', icon: Key, label: 'Pool de IA', roles: ['ADMIN'], group: 'INFRAESTRUTURA' },
    { path: '/admin/infrastructure/whatsapp', icon: MessageSquare, label: 'WhatsApp (Evolution)', roles: ['ADMIN'], group: 'INFRAESTRUTURA' },
    { path: '/admin/infrastructure/logs', icon: Terminal, label: 'Logs do Sistema', roles: ['ADMIN'], group: 'INFRAESTRUTURA' },

    // CONFIGURAÇÕES GLOBAIS
    { path: '/admin/settings/global', icon: Settings, label: 'Configurações Globais', roles: ['ADMIN'], group: 'CONFIGURAÇÕES' },
    { path: '/admin/settings/platform', icon: Globe, label: 'Plataforma (URL, Nome)', roles: ['ADMIN'], group: 'CONFIGURAÇÕES' },
    { path: '/admin/settings/messages', icon: MessageSquare, label: 'Mensagens Automáticas', roles: ['ADMIN'], group: 'CONFIGURAÇÕES' },
    { path: '/admin/settings/payment', icon: CreditCard, label: 'Gateways de Pagamento', roles: ['ADMIN'], group: 'CONFIGURAÇÕES' },

    // IA GLOBAL
    { path: '/admin/ai/prompts', icon: MessageSquare, label: 'Prompts por Nicho', roles: ['ADMIN'], group: 'IA GLOBAL' },
    { path: '/admin/ai/trial-links', icon: LinkIcon, label: 'Links de Trial', roles: ['ADMIN'], group: 'IA GLOBAL' },
    { path: '/admin/ai/models', icon: Cpu, label: 'Modelos e Limites', roles: ['ADMIN'], group: 'IA GLOBAL' },

    // SUPORTE
    { path: '/admin/support/tickets', icon: Headphones, label: 'Tickets de Suporte', roles: ['ADMIN'], group: 'SUPORTE' },
    { path: '/admin/support/broadcast', icon: Send, label: 'Avisos em Massa', roles: ['ADMIN'], group: 'SUPORTE' },

    // ========================================
    // 🏢 REVENDEDOR - GESTÃO DE LOJISTAS
    // ========================================
    { path: '/reseller/tenants', icon: Store, label: 'Meus Lojistas', roles: ['RESELLER'], group: 'LOJISTAS' },
    { path: '/reseller/tenants/new', icon: UserPlus, label: 'Criar Lojista', roles: ['RESELLER'], group: 'LOJISTAS' },
    { path: '/reseller/trials', icon: Calendar, label: 'Trials Ativos', roles: ['RESELLER'], group: 'LOJISTAS' },
    { path: '/reseller/grace-period', icon: ShieldAlert, label: 'Grace Period', roles: ['RESELLER'], group: 'LOJISTAS' },
    { path: '/reseller/financials', icon: DollarSign, label: 'Financeiro', roles: ['RESELLER'], group: 'LOJISTAS' },
    
    // Revendedor - IA
    { path: '/reseller/ai-templates', icon: BrainCircuit, label: 'Templates de IA', roles: ['RESELLER'], group: 'IA' },
    { path: '/reseller/whatsapp-monitor', icon: MessageSquare, label: 'Monitor WhatsApp', roles: ['RESELLER'], group: 'WHATSAPP' },
    
    // Revendedor - Configurações
    { path: '/reseller/settings', icon: Settings, label: 'Minha Conta', roles: ['RESELLER'], group: 'CONFIGURAÇÕES' },
    { path: '/reseller/zero-touch', icon: Zap, label: 'Zero Touch', roles: ['RESELLER'], group: 'CONFIGURAÇÕES' },

    // ========================================
    // 🏪 LOJISTA - BASEADO EM MÓDULOS
    // ========================================
    { path: '/whatsapp', icon: MessageSquare, label: 'WhatsApp', roles: ['MERCHANT'], group: 'CONEXÃO' },
    { path: '/ai-config', icon: BrainCircuit, label: 'Configuração da IA', roles: ['MERCHANT'], group: 'IA', modules: ['ESSENTIAL'] },
    { path: '/catalog', icon: Package, label: 'Catálogo', roles: ['MERCHANT'], group: 'PRODUTOS', modules: ['ESSENTIAL'] },
    { path: '/appointments', icon: Calendar, label: 'Agenda', roles: ['MERCHANT'], group: 'AGENDA', modules: ['SALES_PRO'] },
    { path: '/crm-predictive', icon: Users, label: 'CRM Preditivo', roles: ['MERCHANT'], group: 'CRM', modules: ['PREDICTIVE'] },
    { path: '/crisis-management', icon: ShieldAlert, label: 'Gestão de Crises', roles: ['MERCHANT'], group: 'NINJA', modules: ['NINJA'] },
    { path: '/reports', icon: BarChart3, label: 'Relatórios', roles: ['MERCHANT'], group: 'ANÁLISE' },
    { path: '/my-plan', icon: DollarSign, label: 'Meu Plano', roles: ['MERCHANT'], group: 'CONTA' },
    { path: '/team-profile', icon: UserCircle, label: 'Perfil e Equipe', roles: ['MERCHANT'], group: 'CONTA' },
  ];

  const effectiveRole = impersonatedMerchantId ? 'MERCHANT' : (impersonatedResellerId ? 'RESELLER' : user?.role);
  
  // Módulos ativos do merchant (para filtrar menu)
  const activeModules = (user as any)?.activeModules || ['ESSENTIAL'];
  
  const filteredMenu = menuItems.filter(item => {
    // Filtrar por role
    if (!item.roles.includes(effectiveRole || '')) return false;
    
    // Filtrar por módulos (apenas para MERCHANT)
    if (effectiveRole === 'MERCHANT' && item.modules) {
      const hasModule = item.modules.some((mod: string) => activeModules.includes(mod));
      if (!hasModule) return false;
    }
    
    return true;
  });

  // Group items
  const groupedMenu: { [key: string]: typeof menuItems } = {};
  filteredMenu.forEach(item => {
    const group = item.group || 'GERAL';
    if (!groupedMenu[group]) groupedMenu[group] = [];
    groupedMenu[group].push(item);
  });

  const isSuspended = user?.status === 'suspended';

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/80 backdrop-blur-2xl flex flex-col fixed h-full z-50">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase">SaaSWpp</h1>
            <p className="text-[8px] font-mono font-bold tracking-[0.2em] text-muted-foreground uppercase">Empresarial v2.0</p>
          </div>
        </div>

        {isSuspended && (
          <div className="mx-4 mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl">
            <p className="text-[10px] font-bold text-destructive uppercase tracking-widest flex items-center gap-2">
              <ShieldAlert className="w-3 h-3" /> Conta Suspensa
            </p>
            <p className="text-[9px] text-muted-foreground mt-1">Regularize seu financeiro para liberar o acesso.</p>
          </div>
        )}

        <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto custom-scrollbar">
          {Object.entries(groupedMenu).map(([group, items]) => (
            <div key={group} className="space-y-1">
              {group !== 'GERAL' && (
                <h3 className="px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">{group}</h3>
              )}
              {items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group relative",
                      isActive 
                        ? "emerald-active shadow-sm" 
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4 transition-transform group-hover:scale-110 shrink-0", isActive && "text-primary")} />
                    <span className="text-xs font-bold tracking-tight truncate">{item.label}</span>
                    {isActive && (
                      <motion.div 
                        layoutId="active-pill"
                        className="absolute left-0 w-1 h-4 bg-primary rounded-r-full"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="p-6 mt-auto border-t border-border bg-muted/20 shrink-0">
          <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-background/50 border border-border">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider truncate">Plano Pro</p>
              <div className="w-full h-1 bg-muted rounded-full mt-1 overflow-hidden">
                <div className="w-3/4 h-full bg-primary" />
              </div>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all group"
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-semibold">Encerrar Sessão</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        {(impersonatedMerchantId || impersonatedResellerId) && (
          <div className="bg-amber-500 text-white px-10 py-2 flex items-center justify-between sticky top-0 z-[60] shadow-lg">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
              <span className="text-sm font-bold uppercase tracking-widest">
                Modo de Visualização Ativo: {impersonatedMerchantId ? 'Lojista' : 'Revendedor'} ({impersonatedMerchantId || impersonatedResellerId})
              </span>
            </div>
            <button 
              onClick={() => {
                setImpersonation(null, null);
                window.location.href = '/';
              }}
              className="bg-white text-amber-500 px-4 py-1 rounded-lg text-xs font-black uppercase hover:bg-amber-50 transition-colors"
            >
              Sair da Visualização
            </button>
          </div>
        )}
        {/* Header */}
        <header className="h-20 border-b border-border bg-background/60 backdrop-blur-xl sticky top-0 z-40 px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-8 w-1 bg-primary/20 rounded-full" />
            <div className="flex flex-col">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                {menuItems.find(i => i.path === location.pathname)?.label || 'Dashboard'}
              </h2>
              <p className="text-xs font-medium">Sessão ativa: <span className="text-primary">{user?.name}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            
            <div className="h-8 w-px bg-border mx-2" />

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold">{user?.name}</p>
                <p className="text-[10px] uppercase tracking-wider text-primary font-bold">{user?.role}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center border border-border overflow-hidden">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} 
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
