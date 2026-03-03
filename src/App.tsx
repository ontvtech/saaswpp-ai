import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Layout } from './components/Layout';

const cn = (...inputs: any[]) => inputs.filter(Boolean).join(' ');

import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import { WhatsApp } from './pages/WhatsApp';
import { AIConfig } from './pages/AIConfig';
import { Catalog } from './pages/Catalog';
import { AIAnalysis } from './pages/AIAnalysis';
import { Appointments } from './pages/Appointments';
import { Campaigns } from './pages/Campaigns';
import { AdminDashboard } from './pages/AdminDashboard';
import { ResellerPanel, Financials, Support, SystemSettings } from './pages/Panels';
import { PlansPage } from './pages/PlansPage';
import { ResellersPage } from './pages/ResellersPage';
import { ResellerTenants, ResellerCRM, AITemplates, ResellerWhatsAppMonitor, ResellerBroadcast, ResellerSettings } from './pages/ResellerTools';
import { 
  AdminWhatsAppMonitor, 
  AIGlobalConfig, 
  AISalesGlobal, 
  AIPredictiveGlobal, 
  PaymentGatewayConfig, 
  BroadcastCenter, 
  InfrastructureMonitor, 
  AuditSecurity, 
  GlobalPrompts,
  SystemLogs,
  ServiceStatus,
  NewReseller,
  AIModelsLimits,
  AutoKnowledgeBase,
  SecurityFirewall,
  AccessLogs,
  GlobalPlansAndNiches,
  TrialLinkGenerator
} from './pages/AdminTools';
import { KnowledgeBase, CRMPredictive, CrisisManagement, PerformanceReports, MerchantPlan, TeamProfile } from './pages/MerchantPages';
import { MessageSquare, Lock, Mail, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

const Login: React.FC<{ initialView?: 'login' | 'trial'; onBack: () => void }> = ({ initialView = 'login', onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState<'login' | 'forgot' | 'trial'>(initialView);
  const { setAuth, loginDemo } = useStore();

  const handleLogin = async (role: 'ADMIN' | 'RESELLER' | 'MERCHANT') => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email || (role === 'ADMIN' ? 'admin@saaswpp.com' : 'user@example.com'), 
          password: 'password123' 
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAuth(data.user, data.token, data.merchant);
      } else {
        loginDemo(role);
      }
    } catch (error) {
      loginDemo(role);
    }
  };

  const [recoveryMethod, setRecoveryMethod] = useState<'email' | 'whatsapp'>('email');
  const [recoveryValue, setRecoveryValue] = useState('');

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryMethod === 'whatsapp') {
      alert(`Um código de segurança foi enviado para o WhatsApp: ${recoveryValue}`);
    } else {
      alert(`Um link de recuperação foi enviado para o e-mail: ${recoveryValue}`);
    }
    setView('login');
  };

  const handleTrialSignup = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Sua conta trial de 7 dias foi criada! Redirecionando para configuração do WhatsApp...');
    handleLogin('MERCHANT');
  };

  if (view === 'forgot') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card w-full max-w-md p-10 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black tracking-tight">Recuperar Senha</h2>
            <p className="text-muted-foreground">Escolha como deseja receber seu código.</p>
          </div>

          <div className="flex gap-2 p-1 bg-muted rounded-xl">
            <button 
              onClick={() => setRecoveryMethod('email')}
              className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all", recoveryMethod === 'email' ? "bg-background shadow-sm" : "text-muted-foreground")}
            >
              E-mail
            </button>
            <button 
              onClick={() => setRecoveryMethod('whatsapp')}
              className={cn("flex-1 py-2 rounded-lg text-xs font-bold transition-all", recoveryMethod === 'whatsapp' ? "bg-background shadow-sm" : "text-muted-foreground")}
            >
              WhatsApp
            </button>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                {recoveryMethod === 'email' ? 'E-mail' : 'WhatsApp (com DDD)'}
              </label>
              <input 
                type={recoveryMethod === 'email' ? 'email' : 'text'} 
                required 
                value={recoveryValue}
                onChange={e => setRecoveryValue(e.target.value)}
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 outline-none focus:border-primary/50" 
                placeholder={recoveryMethod === 'email' ? 'seu@email.com' : '5511999999999'} 
              />
            </div>
            <button type="submit" className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold shadow-xl shadow-primary/20">
              {recoveryMethod === 'email' ? 'Enviar Link' : 'Enviar Código via WhatsApp'}
            </button>
            <button type="button" onClick={() => setView('login')} className="w-full text-sm font-bold text-muted-foreground hover:text-foreground">Voltar para o Login</button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (view === 'trial') {
    window.location.href = '/register/trial';
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card w-full max-w-md p-10 space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground mx-auto mb-6 shadow-xl shadow-primary/20">
            <MessageSquare className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black tracking-tight">Bem-vindo</h2>
          <p className="text-muted-foreground">Acesse sua conta SaaSWpp</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">E-mail</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-muted/50 border border-border rounded-xl pl-12 pr-4 py-3 outline-none focus:border-primary/50 transition-colors"
                placeholder="seu@email.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Senha</label>
              <button onClick={() => setView('forgot')} className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest">Esqueci minha senha</button>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-muted/50 border border-border rounded-xl pl-12 pr-4 py-3 outline-none focus:border-primary/50 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <p className="text-[10px] text-center text-muted-foreground font-bold uppercase tracking-widest mb-2">Entrar como (Demo):</p>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => handleLogin('MERCHANT')} className="py-2 rounded-lg border border-border text-[10px] font-bold hover:border-primary/50 hover:bg-primary/5 transition-all">LOJISTA</button>
            <button onClick={() => handleLogin('RESELLER')} className="py-2 rounded-lg border border-border text-[10px] font-bold hover:border-primary/50 hover:bg-primary/5 transition-all">REVENDA</button>
            <button onClick={() => handleLogin('ADMIN')} className="py-2 rounded-lg border border-border text-[10px] font-bold hover:border-primary/50 hover:bg-primary/5 transition-all">ADMIN</button>
          </div>
        </div>

        <button onClick={() => handleLogin('MERCHANT')} className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
          Entrar no Sistema <ArrowRight className="w-5 h-5" />
        </button>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Não tem uma conta? <button onClick={() => setView('trial')} className="text-primary font-bold hover:underline">Comece o Trial</button>
          </p>
          <button onClick={onBack} className="mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors uppercase font-bold tracking-widest">Voltar para Início</button>
        </div>
      </motion.div>
    </div>
  );
};

import { ProtectedRoute } from './components/ProtectedRoute';

// ... (imports remain the same)

import { StatusPage } from './pages/StatusPage';
import { Beta10Register } from './pages/Beta10Register';
import { TrialRegister } from './pages/TrialRegister';
import { RegisterSuccess } from './pages/RegisterSuccess';

export default function App() {
  const { user, token } = useStore();
  const [showLogin, setShowLogin] = useState(false);
  const [initialView, setInitialView] = useState<'login' | 'trial'>('login');

  // If not logged in, show Landing Page or Login
  // In DEV, we only bypass if the user is NOT on the landing page or explicitly logged in
  const isAuth = !!(user && token);
  
  if (!isAuth) {
    if (window.location.pathname === '/status') return <StatusPage />;
    if (window.location.pathname === '/register/beta10') return <Beta10Register />;
    if (window.location.pathname === '/register/trial') return <TrialRegister />;
    if (window.location.pathname === '/register/success') return <RegisterSuccess />;
    if (showLogin) return <Login initialView={initialView} onBack={() => setShowLogin(false)} />;
    return (
      <LandingPage 
        onLogin={(view?: 'login' | 'trial') => {
          setInitialView(view || 'login');
          setShowLogin(true);
        }} 
      />
    );
  }

  return (
    <>
      <Routes>
        <Route path="/register/success" element={<RegisterSuccess />} />
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/status" element={<StatusPage />} />
              <Route path="/" element={
                user?.role === 'ADMIN' ? <Navigate to="/admin" replace /> :
                user?.role === 'RESELLER' ? <Navigate to="/reseller" replace /> :
                <Dashboard />
              } />
        
        {/* Merchant Routes - Accessible by ALL (Merchant is base level) */}
        <Route path="/whatsapp" element={<WhatsApp />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/ai-config" element={<AIConfig />} />
        <Route path="/knowledge-base" element={<KnowledgeBase />} />
        <Route path="/crm-predictive" element={<CRMPredictive />} />
        <Route path="/crisis-management" element={<CrisisManagement />} />
        <Route path="/reports" element={<PerformanceReports />} />
        <Route path="/my-plan" element={<MerchantPlan />} />
        <Route path="/team-profile" element={<TeamProfile />} />

        {/* Reseller Routes - Protected */}
        <Route path="/resellers" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'RESELLER']}>
            <ResellersPage />
          </ProtectedRoute>
        } />
        <Route path="/reseller/tenants" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'RESELLER']}>
            <ResellerTenants />
          </ProtectedRoute>
        } />
        <Route path="/reseller/crm" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'RESELLER']}>
            <ResellerCRM />
          </ProtectedRoute>
        } />
        <Route path="/reseller/ai-templates" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'RESELLER']}>
            <AITemplates />
          </ProtectedRoute>
        } />
        <Route path="/reseller/whatsapp-monitor" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'RESELLER']}>
            <ResellerWhatsAppMonitor />
          </ProtectedRoute>
        } />
        <Route path="/reseller/broadcast" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'RESELLER']}>
            <ResellerBroadcast />
          </ProtectedRoute>
        } />
        <Route path="/reseller/settings" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'RESELLER']}>
            <ResellerSettings />
          </ProtectedRoute>
        } />

        {/* Admin Routes - Protected (Level 0) */}
        {/* INFRAESTRUTURA */}
        <Route path="/admin/infrastructure/whatsapp" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminWhatsAppMonitor />
          </ProtectedRoute>
        } />
        <Route path="/admin/infrastructure/servers" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <InfrastructureMonitor />
          </ProtectedRoute>
        } />
        <Route path="/admin/infrastructure/logs" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <SystemLogs />
          </ProtectedRoute>
        } />
        <Route path="/admin/infrastructure/status" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <ServiceStatus />
          </ProtectedRoute>
        } />
        <Route path="/admin/infrastructure/ai-keys" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AIGlobalConfig />
          </ProtectedRoute>
        } />

        {/* REVENDEDORES */}
        <Route path="/admin/resellers/list" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <ResellersPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/resellers/new" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <NewReseller />
          </ProtectedRoute>
        } />
        <Route path="/admin/resellers/plans" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <PlansPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/resellers/financials" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Financials />
          </ProtectedRoute>
        } />

        {/* IA GLOBAL */}
        <Route path="/admin/ai/prompts" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <GlobalPrompts />
          </ProtectedRoute>
        } />
        <Route path="/admin/ai/plans-niches" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <GlobalPlansAndNiches />
          </ProtectedRoute>
        } />
        <Route path="/admin/ai/trial-links" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <TrialLinkGenerator />
          </ProtectedRoute>
        } />
        <Route path="/admin/ai/sales" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AISalesGlobal />
          </ProtectedRoute>
        } />
        <Route path="/admin/ai/predictive" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AIPredictiveGlobal />
          </ProtectedRoute>
        } />
        <Route path="/admin/ai/models" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AIModelsLimits />
          </ProtectedRoute>
        } />
        <Route path="/admin/ai/knowledge-base" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AutoKnowledgeBase />
          </ProtectedRoute>
        } />

        {/* SEGURANÇA */}
        <Route path="/admin/security/firewall" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <SecurityFirewall />
          </ProtectedRoute>
        } />
        <Route path="/admin/security/logs" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AccessLogs />
          </ProtectedRoute>
        } />
        <Route path="/admin/security/audit" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AuditSecurity />
          </ProtectedRoute>
        } />

        {/* COMUNICAÇÃO */}
        <Route path="/admin/communication/broadcast" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <BroadcastCenter />
          </ProtectedRoute>
        } />
        <Route path="/admin/communication/support" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <Support />
          </ProtectedRoute>
        } />

        {/* CONFIGURAÇÕES GERAIS */}
        <Route path="/admin/settings/system" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <SystemSettings />
          </ProtectedRoute>
        } />
        <Route path="/admin/settings/payment" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <PaymentGatewayConfig />
          </ProtectedRoute>
        } />

        {/* Legacy / Fallback */}
        <Route path="/reseller" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'RESELLER']}>
            <ResellerPanel />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
    } />
    </Routes>
    </>
  );
}
