import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, Mail, Lock, User, ArrowRight, CheckCircle2, AlertCircle, Loader2, 
  Smartphone, CreditCard, Building, FileText, Phone, Zap 
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface FormData {
  name: string;
  email: string;
  password: string;
  phone: string;
  documentType: 'CPF' | 'CNPJ';
  documentNumber: string;
  planId: string;
}

export const CheckoutTrial: React.FC = () => {
  const [searchParams] = useSearchParams();
  const planId = searchParams.get('plan') || 'trial';
  const [step, setStep] = useState<'form' | 'payment' | 'verify' | 'success'>('form');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    phone: '',
    documentType: 'CPF',
    documentNumber: '',
    planId
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  // Máscaras de input
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatCNPJ = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formData.documentType === 'CPF' 
      ? formatCPF(value) 
      : formatCNPJ(value);
    setFormData({ ...formData, documentNumber: formatted });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, phone: formatPhone(e.target.value) });
  };

  const validateDocument = (): boolean => {
    const numbers = formData.documentNumber.replace(/\D/g, '');
    if (formData.documentType === 'CPF') {
      return numbers.length === 11;
    } else {
      return numbers.length === 14;
    }
  };

  const validatePhone = (): boolean => {
    const numbers = formData.phone.replace(/\D/g, '');
    return numbers.length >= 10 && numbers.length <= 11;
  };

  // Verificar se é trial gratuito ou checkout pago
  const isPaidPlan = planId !== 'trial';

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateDocument()) {
      setError(`${formData.documentType} inválido. Verifique os dígitos.`);
      return;
    }

    if (!validatePhone()) {
      setError('Telefone inválido. Inclua DDD.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isPaidPlan) {
        // Criar sessão de checkout do Stripe
        const res = await fetch('/api/checkout/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (res.ok && data.url) {
          // Salvar dados temporários no localStorage
          localStorage.setItem('checkout_data', JSON.stringify(formData));
          window.location.href = data.url;
        } else {
          setError(data.error || 'Erro ao criar checkout.');
        }
      } else {
        // Registro de trial gratuito
        const res = await fetch('/api/checkout/trial-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        if (res.ok) {
          setStep('verify');
        } else {
          const data = await res.json();
          setError(data.error);
        }
      }
    } catch (e) {
      setError('Erro ao processar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {step === 'form' && (
          <motion.div 
            key="form" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }} 
            className="w-full max-w-lg"
          >
            <div className="glass-card p-8 md:p-10 space-y-6">
              {/* Header */}
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto">
                  <Zap className="w-7 h-7" />
                </div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight">
                  {isPaidPlan ? 'Finalizar Assinatura' : 'Iniciar Teste Gratuito'}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {isPaidPlan 
                    ? 'Complete seus dados para ativar sua conta.' 
                    : '7 dias grátis, sem compromisso. Cancele quando quiser.'}
                </p>
              </div>

              <form onSubmit={handleSubmitForm} className="space-y-4">
                {/* Nome */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Nome da Empresa / Seu Nome
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                      type="text" 
                      required 
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-muted/50 border border-border rounded-xl pl-12 pr-4 py-3 outline-none focus:border-primary/50 transition-colors" 
                      placeholder="Minha Loja" 
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    E-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                      type="email" 
                      required 
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-muted/50 border border-border rounded-xl pl-12 pr-4 py-3 outline-none focus:border-primary/50 transition-colors" 
                      placeholder="seu@email.com" 
                    />
                  </div>
                </div>

                {/* Telefone */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    WhatsApp (obrigatório)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                      type="tel" 
                      required 
                      maxLength={15}
                      value={formData.phone}
                      onChange={handlePhoneChange}
                      className="w-full bg-muted/50 border border-border rounded-xl pl-12 pr-4 py-3 outline-none focus:border-primary/50 transition-colors" 
                      placeholder="(11) 99999-9999" 
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Receberá código de verificação</p>
                </div>

                {/* Tipo de Documento */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Tipo de Documento
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, documentType: 'CPF', documentNumber: '' })}
                      className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                        formData.documentType === 'CPF' 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-border bg-muted/30 hover:border-primary/30'
                      }`}
                    >
                      <User className="w-4 h-4" />
                      <span className="font-bold text-sm">CPF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, documentType: 'CNPJ', documentNumber: '' })}
                      className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                        formData.documentType === 'CNPJ' 
                          ? 'border-primary bg-primary/5 text-primary' 
                          : 'border-border bg-muted/30 hover:border-primary/30'
                      }`}
                    >
                      <Building className="w-4 h-4" />
                      <span className="font-bold text-sm">CNPJ</span>
                    </button>
                  </div>
                </div>

                {/* Número do Documento */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {formData.documentType}
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                      type="text" 
                      required 
                      maxLength={formData.documentType === 'CPF' ? 14 : 18}
                      value={formData.documentNumber}
                      onChange={handleDocumentChange}
                      className="w-full bg-muted/50 border border-border rounded-xl pl-12 pr-4 py-3 outline-none focus:border-primary/50 transition-colors font-mono tracking-wide" 
                      placeholder={formData.documentType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'} 
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {formData.documentType === 'CPF' ? '11 dígitos' : '14 dígitos'} - Apenas números
                  </p>
                </div>

                {/* Senha */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Criar Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                      type="password" 
                      required 
                      minLength={6}
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-muted/50 border border-border rounded-xl pl-12 pr-4 py-3 outline-none focus:border-primary/50 transition-colors" 
                      placeholder="Mínimo 6 caracteres" 
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Termos */}
                <p className="text-[10px] text-muted-foreground text-center">
                  Ao continuar, você concorda com nossos{' '}
                  <a href="#" className="text-primary hover:underline">Termos de Uso</a>
                  {' '}e{' '}
                  <a href="#" className="text-primary hover:underline">Política de Privacidade</a>.
                </p>

                {/* Submit Button */}
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold shadow-xl shadow-primary/20 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {isPaidPlan ? 'Ir para Pagamento' : 'Criar Conta Gratuita'}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Secure Badge */}
                <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs">
                  <Shield className="w-4 h-4" />
                  <span>Pagamento seguro via Stripe</span>
                </div>
              </form>

              {/* Back Link */}
              <div className="text-center pt-4 border-t border-border">
                <button 
                  onClick={() => navigate('/')}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  ← Voltar para o início
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {step === 'verify' && (
          <motion.div 
            key="verify" 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="glass-card max-w-md w-full p-10 space-y-8 text-center"
          >
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto">
                <Smartphone className="w-8 h-8 animate-bounce" />
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Verifique seu WhatsApp</h2>
              <p className="text-muted-foreground text-sm">
                Enviamos um código de 6 dígitos para <b>{formData.phone}</b>
              </p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              // Lógica de verificação
            }} className="space-y-6">
              <input 
                type="text" 
                maxLength={6}
                required
                className="w-full bg-muted/50 border-2 border-border rounded-2xl px-4 py-6 text-center text-4xl font-black tracking-[0.5em] outline-none focus:border-primary"
                placeholder="000000"
              />
              <button 
                type="submit" 
                className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold shadow-xl shadow-primary/20"
              >
                Verificar e Ativar
              </button>
            </form>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div 
            key="success" 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="glass-card max-w-md w-full p-10 space-y-8 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tight">Conta Criada!</h2>
              <p className="text-muted-foreground">
                {isPaidPlan 
                  ? 'Sua assinatura foi ativada. Bem-vindo!'
                  : 'Seu período de teste começou agora. Aproveite!'}
              </p>
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
