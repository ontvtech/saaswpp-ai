import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const RegisterSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionId) {
      const verifySession = async () => {
        try {
          const res = await fetch(`/api/auth/checkout/verify?session_id=${sessionId}`);
          if (res.ok) {
            setStatus('success');
          } else {
            setStatus('error');
          }
        } catch (e) {
          setStatus('error');
        }
      };
      verifySession();
    } else {
      setStatus('error');
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="glass-card max-w-md w-full p-10 text-center space-y-8"
      >
        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
            <h2 className="text-2xl font-black uppercase tracking-tight">Verificando Pagamento...</h2>
            <p className="text-muted-foreground">Aguarde enquanto confirmamos sua assinatura.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tight">Pagamento Confirmado!</h2>
              <p className="text-muted-foreground">Sua assinatura foi ativada com sucesso. Bem-vindo ao SaaSWpp!</p>
            </div>
            <button 
              onClick={() => navigate('/')}
              className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold shadow-xl shadow-primary/20"
            >
              Acessar Painel
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-2xl font-black uppercase tracking-tight">Erro na Verificação</h2>
            <p className="text-muted-foreground">Não foi possível confirmar seu pagamento. Por favor, entre em contato com o suporte.</p>
            <button 
              onClick={() => navigate('/')}
              className="w-full bg-muted py-3 rounded-xl font-bold"
            >
              Voltar ao Início
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
