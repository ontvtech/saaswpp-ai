import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle, Loader2, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_mock');

const CheckoutForm: React.FC<{ email: string; onPaymentSuccess: (paymentMethodId: string) => void }> = ({ email, onPaymentSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      // 1. Get SetupIntent Client Secret
      const response = await fetch('/api/auth/setup-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const { clientSecret } = await response.json();

      // 2. Confirm SetupIntent
      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: { email },
        },
      });

      if (result.error) {
        setError(result.error.message || 'Erro ao validar cartão.');
      } else {
        onPaymentSuccess(result.setupIntent.payment_method as string);
      }
    } catch (err: any) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-muted/50 rounded-xl border border-border">
        <CardElement options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#ffffff',
              '::placeholder': { color: '#a1a1aa' },
            },
          },
        }} />
      </div>
      {error && (
        <div className="flex items-center gap-2 text-destructive text-xs font-bold bg-destructive/10 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Validar Cartão (R$ 0,00)'}
      </button>
    </form>
  );
};

export const Beta10Register: React.FC = () => {
  const [step, setStep] = useState<'check' | 'register' | 'payment' | 'verify' | 'success'>('check');
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [reason, setReason] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    checkEligibility();
  }, []);

  const checkEligibility = async () => {
    try {
      const res = await fetch('/api/auth/beta10/check');
      const data = await res.json();
      setEligible(data.eligible);
      if (!data.eligible) setReason(data.reason);
      if (data.eligible) setStep('register');
    } catch (e) {
      setEligible(false);
      setReason('Erro ao conectar ao servidor.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment');
  };

  const handlePaymentSuccess = (pmId: string) => {
    setPaymentMethodId(pmId);
    finalizeRegistration(pmId);
  };

  const finalizeRegistration = async (pmId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/beta10/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, paymentMethodId: pmId }),
      });
      if (res.ok) {
        setStep('verify');
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (e) {
      setError('Erro ao finalizar cadastro.');
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

  if (eligible === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="glass-card max-w-md w-full p-10 text-center space-y-6">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
          <h2 className="text-2xl font-black">Acesso Restrito</h2>
          <p className="text-muted-foreground">{reason}</p>
          <button onClick={() => navigate('/')} className="w-full bg-muted py-3 rounded-xl font-bold">Voltar</button>
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
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-black tracking-tight">Protocolo Beta-10</h2>
              <p className="text-muted-foreground text-sm">Onboarding de elite para os primeiros 10 lojistas.</p>
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
              <button type="submit" className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold shadow-xl shadow-primary/20 flex items-center justify-center gap-2 mt-6">
                Próximo Passo <ArrowRight className="w-5 h-5" />
              </button>
            </form>
          </motion.div>
        )}

        {step === 'payment' && (
          <motion.div key="pay" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="glass-card max-w-md w-full p-10 space-y-8">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black">Filtragem de Cartão</h2>
              <p className="text-muted-foreground text-sm">Validamos seu cartão com R$ 0,00 para evitar bots e garantir a qualidade da rede.</p>
            </div>

            <Elements stripe={stripePromise}>
              <CheckoutForm email={formData.email} onPaymentSuccess={handlePaymentSuccess} />
            </Elements>

            <p className="text-[10px] text-center text-muted-foreground uppercase font-bold tracking-widest">
              Ambiente Seguro via Stripe SSL
            </p>
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
                Enviamos um código de 6 dígitos para seu <b>E-mail</b> e um alerta para seu <b>WhatsApp</b>.
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
              <h2 className="text-3xl font-black uppercase tracking-tight">Bem-vindo ao Elite</h2>
              <p className="text-muted-foreground">Sua conta Beta-10 foi ativada com sucesso. Você agora faz parte do grupo seleto de lojistas.</p>
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
