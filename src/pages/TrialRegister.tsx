import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle, Loader2, Smartphone, Zap } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const TrialRegister: React.FC = () => {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const [step, setStep] = useState<'check' | 'register' | 'verify' | 'success'>('check');
  const [linkData, setLinkData] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    validateCode();
  }, [code]);

  const validateCode = async () => {
    setLoading(true);
    try {
      const url = code ? `/api/auth/trial/validate?code=${code}` : '/api/auth/trial/validate';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setLinkData(data);
        setStep('register');
      } else {
        setError(data.error || 'Código inválido ou expirado.');
      }
    } catch (e) {
      setError('Erro ao validar código.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/trial/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, code }),
      });
      if (res.ok) {
        setStep('verify');
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (e) {
      setError('Erro ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, code: verificationCode }),
      });
      if (res.ok) {
        setStep('success');
      } else {
        setError('Código inválido.');
      }
    } catch (e) {
      setError('Erro na verificação.');
    } finally {
      setLoading(false);
    }
  };

  if (error && step === 'check') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-card max-w-md w-full p-10 text-center space-y-6">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <h2 className="text-2xl font-black">Acesso Inválido</h2>
          <p className="text-muted-foreground">{error}</p>
          <button onClick={() => navigate('/')} className="w-full bg-muted py-3 rounded-xl font-bold">Voltar ao Início</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <AnimatePresence mode="wait">
        {step === 'register' && (
          <motion.div key="reg" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="glass-card max-w-md w-full p-10 space-y-8">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                <Zap className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-black tracking-tight">Teste Gratuito</h2>
              <p className="text-muted-foreground text-sm">
                Você recebeu um convite para testar a plataforma por <b>{linkData?.days} dias</b> com <b>{linkData?.tokenLimit?.toLocaleString()} tokens</b>.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nome da Empresa</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" required 
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-muted/50 border border-border rounded-xl pl-12 pr-4 py-3 outline-none focus:border-primary/50" 
                    placeholder="Minha Loja" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">E-mail Corporativo</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="email" required 
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-muted/50 border border-border rounded-xl pl-12 pr-4 py-3 outline-none focus:border-primary/50" 
                    placeholder="contato@loja.com" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Senha de Acesso</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="password" required 
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-muted/50 border border-border rounded-xl pl-12 pr-4 py-3 outline-none focus:border-primary/50" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>
              {error && <p className="text-destructive text-xs font-bold text-center">{error}</p>}
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold shadow-xl shadow-primary/20 flex items-center justify-center gap-2 mt-6"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Começar Teste Grátis'}
              </button>
            </form>
          </motion.div>
        )}

        {step === 'verify' && (
          <motion.div key="verify" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card max-w-md w-full p-10 space-y-8 text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto">
                <Smartphone className="w-8 h-8 animate-bounce" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Aguardando Ativação</h2>
              <p className="text-muted-foreground text-sm px-4">
                Enviamos um código de 6 dígitos para seu <b>E-mail</b>.
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-6">
              <input 
                type="text" 
                maxLength={6}
                required
                value={verificationCode}
                onChange={e => setVerificationCode(e.target.value)}
                className="w-full bg-muted/50 border-2 border-border rounded-2xl px-4 py-6 text-center text-4xl font-black tracking-[0.5em] outline-none focus:border-primary"
                placeholder="000000"
              />
              {error && <p className="text-destructive text-xs font-bold">{error}</p>}
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Ativar Minha Conta'}
              </button>
            </form>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card max-w-md w-full p-10 space-y-8 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tight">Conta Ativada</h2>
              <p className="text-muted-foreground">Sua conta de teste foi ativada com sucesso. Aproveite todos os recursos!</p>
            </div>
            <button 
              onClick={() => navigate('/')}
              className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold shadow-xl shadow-primary/20"
            >
              Acessar Painel
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
