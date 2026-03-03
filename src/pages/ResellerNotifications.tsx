import React, { useState, useEffect } from 'react';
import { 
  Bell, Phone, Save, CheckCircle2, AlertCircle, Loader2, 
  ShoppingCart, Clock, Ban, CheckCircle, CreditCard, MessageSquare,
  TestTube
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Toast, ToastType } from '../components/Toast';

interface NotificationSettings {
  whatsappNumber: string;
  notificationsEnabled: boolean;
  notifyNewSale: boolean;
  notifyTrialExpiring: boolean;
  notifySuspended: boolean;
  notifyActivated: boolean;
  notifyPaymentFailed: boolean;
}

export const ResellerNotifications: React.FC = () => {
  const { token } = useStore();
  const [settings, setSettings] = useState<NotificationSettings>({
    whatsappNumber: '',
    notificationsEnabled: true,
    notifyNewSale: true,
    notifyTrialExpiring: true,
    notifySuspended: true,
    notifyActivated: true,
    notifyPaymentFailed: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [token]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/reseller/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/reseller/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        setToast({ message: 'Configurações salvas com sucesso!', type: 'success' });
      } else {
        throw new Error();
      }
    } catch (e) {
      setToast({ message: 'Erro ao salvar configurações.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!settings.whatsappNumber) {
      setToast({ message: 'Adicione um número primeiro.', type: 'warning' });
      return;
    }

    setTesting(true);
    try {
      const res = await fetch('/api/reseller/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ phone: settings.whatsappNumber })
      });

      if (res.ok) {
        setToast({ message: 'Mensagem de teste enviada! Verifique seu WhatsApp.', type: 'success' });
      } else {
        const data = await res.json();
        setToast({ message: data.error || 'Erro ao enviar teste.', type: 'error' });
      }
    } catch (e) {
      setToast({ message: 'Erro ao enviar teste.', type: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const toggleSetting = (key: keyof NotificationSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Notificações WhatsApp
          </h2>
          <p className="text-muted-foreground">
            Receba alertas de vendas, prazos e status de clientes diretamente no seu WhatsApp.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuração de Número */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Phone className="w-5 h-5 text-primary" />
            Número para Notificações
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Número do WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="tel"
                  value={settings.whatsappNumber}
                  onChange={e => setSettings({
                    ...settings,
                    whatsappNumber: formatPhone(e.target.value)
                  })}
                  className="w-full bg-muted/50 border border-border rounded-xl pl-12 pr-4 py-3 outline-none focus:border-primary/50"
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Inclua o DDD. Exemplo: (11) 99999-9999
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20">
              <div>
                <p className="font-medium">Ativar Notificações</p>
                <p className="text-xs text-muted-foreground">
                  Receber alertas neste número
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notificationsEnabled}
                  onChange={() => toggleSetting('notificationsEnabled')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleTest}
                disabled={testing || !settings.whatsappNumber}
                className="flex-1 px-4 py-3 rounded-xl border border-border hover:bg-muted transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <TestTube className="w-4 h-4" />
                    Enviar Teste
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Tipos de Notificação */}
        <div className="glass-card p-6 space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Tipos de Notificação
          </h3>

          <div className="space-y-3">
            {[
              { key: 'notifyNewSale', icon: ShoppingCart, label: 'Nova Venda', desc: 'Quando um cliente assinar um plano', color: 'emerald' },
              { key: 'notifyTrialExpiring', icon: Clock, label: 'Trial Expirando', desc: '3 dias antes do trial expirar', color: 'amber' },
              { key: 'notifySuspended', icon: Ban, label: 'Cliente Suspenso', desc: 'Quando uma conta for suspensa', color: 'red' },
              { key: 'notifyActivated', icon: CheckCircle, label: 'Cliente Ativado', desc: 'Quando uma conta for ativada', color: 'blue' },
              { key: 'notifyPaymentFailed', icon: CreditCard, label: 'Pagamento Falhou', desc: 'Quando um pagamento for recusado', color: 'orange' }
            ].map((item) => (
              <label
                key={item.key}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  settings[item.key as keyof NotificationSettings]
                    ? `border-${item.color}-500/50 bg-${item.color}-500/5`
                    : 'border-border bg-muted/20 hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    settings[item.key as keyof NotificationSettings]
                      ? `bg-${item.color}-500/20 text-${item.color}-500`
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings[item.key as keyof NotificationSettings] as boolean}
                  onChange={() => toggleSetting(item.key as keyof NotificationSettings)}
                  disabled={!settings.notificationsEnabled}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                />
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Preview de Mensagens */}
      <div className="glass-card p-6">
        <h3 className="font-bold text-lg mb-4">Exemplos de Mensagens</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { type: 'Venda', msg: '🎉 *NOVA VENDA!*\n\n📦 Cliente: Loja ABC\n💎 Plano: Pro\n💰 R$ 197/mês' },
            { type: 'Trial', msg: '⚠️ *TRIAL EXPIRANDO*\n\n📦 Cliente: Loja XYZ\n⏰ 3 dias restantes' },
            { type: 'Suspenso', msg: '🔴 *CLIENTE SUSPENSO*\n\n📦 Cliente: Loja 123\n📝 Pagamento falhou' }
          ].map((example, i) => (
            <div key={i} className="p-4 rounded-xl bg-muted/30 font-mono text-xs whitespace-pre-line">
              <p className="text-muted-foreground text-[10px] uppercase mb-2">{example.type}</p>
              {example.msg}
            </div>
          ))}
        </div>
      </div>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Save className="w-5 h-5" />
              Salvar Configurações
            </>
          )}
        </button>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
