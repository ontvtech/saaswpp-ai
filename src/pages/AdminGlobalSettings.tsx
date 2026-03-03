import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Toast, ToastType } from '../components/Toast';
import { 
  Settings, 
  Globe, 
  MessageSquare, 
  Clock, 
  CreditCard, 
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Edit2,
  X
} from 'lucide-react';

interface GlobalConfig {
  platformName: string;
  supportEmail: string;
  supportWhatsapp: string;
  
  trialEnabled: boolean;
  trialDefaultDays: number;
  
  gracePeriodEnabled: boolean;
  gracePeriodDays: number;
  gracePeriodFinalHours: number;
  
  graceMessageDay1: string;
  graceMessageDay2: string;
  graceMessageDay3: string;
  graceMessageDay4: string;
  graceMessageDay5: string;
  graceMessageSuspended: string;
}

const DEFAULT_MESSAGES = {
  day1: `⚠️ *Pagamento não processado*

Olá {nome}! Tivemos um problema com seu pagamento.
Nenhuma ação é necessária agora - vamos tentar novamente.

Seu sistema continua funcionando normalmente. 💚

*Equipe {platformName}*`,

  day2: `⚠️ *Lembrete de Pagamento*

Oi {nome}, seu pagamento ainda está pendente.
Você tem {diasRestantes} dias para regularizar sem interrupções.

Acesse: {platformUrl}/minha-conta

*Equipe {platformName}*`,

  day3: `⚠️ *3° Aviso - Pagamento Pendente*

{nome}, restam {diasRestantes} dias para regularizar seu pagamento.
Não queremos que você fique sem o sistema!

Precisa de ajuda? Responda esta mensagem.

*Equipe {platformName}*`,

  day4: `⚠️ *URGENTE: Pagamento Pendente*

{nome}, apenas {diasRestantes} dias restantes!
Sua conta pode ser suspensa se não regularizar.

Formas de pagamento: {platformUrl}/minha-conta

*Equipe {platformName}*`,

  day5: `🚨 *ÚLTIMO AVISO - 48 HORAS*

{nome}, este é seu último aviso!

Você tem apenas **{horasFinais} horas** para regularizar seu pagamento.
Após isso, sua conta será suspensa automaticamente.

Não perca seus dados e configurações!

*Equipe {platformName}*`,

  suspended: `❌ *Conta Suspensa*

{nome}, sua conta foi suspensa por inadimplência.

Para reativar, acesse: {platformUrl}/minha-conta
Ou responda esta mensagem para falar com suporte.

Estamos aqui para ajudar! 💚

*Equipe {platformName}*`
};

export const AdminGlobalSettings: React.FC = () => {
  const { fetchWithAuth } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  
  const [config, setConfig] = useState<GlobalConfig>({
    platformName: 'SaaSWPP',
    supportEmail: 'suporte@saaswpp.work',
    supportWhatsapp: '',
    trialEnabled: true,
    trialDefaultDays: 7,
    gracePeriodEnabled: true,
    gracePeriodDays: 5,
    gracePeriodFinalHours: 48,
    graceMessageDay1: DEFAULT_MESSAGES.day1,
    graceMessageDay2: DEFAULT_MESSAGES.day2,
    graceMessageDay3: DEFAULT_MESSAGES.day3,
    graceMessageDay4: DEFAULT_MESSAGES.day4,
    graceMessageDay5: DEFAULT_MESSAGES.day5,
    graceMessageSuspended: DEFAULT_MESSAGES.suspended,
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetchWithAuth('/api/admin/global-config');
        if (res.ok) {
          const data = await res.json();
          setConfig(prev => ({
            ...prev,
            ...data,
            // Garantir que mensagens tenham valores padrão
            graceMessageDay1: data.graceMessageDay1 || DEFAULT_MESSAGES.day1,
            graceMessageDay2: data.graceMessageDay2 || DEFAULT_MESSAGES.day2,
            graceMessageDay3: data.graceMessageDay3 || DEFAULT_MESSAGES.day3,
            graceMessageDay4: data.graceMessageDay4 || DEFAULT_MESSAGES.day4,
            graceMessageDay5: data.graceMessageDay5 || DEFAULT_MESSAGES.day5,
            graceMessageSuspended: data.graceMessageSuspended || DEFAULT_MESSAGES.suspended,
          }));
        }
      } catch (e) {
        console.error('Erro ao carregar configurações:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetchWithAuth('/api/admin/global-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (res.ok) {
        setToast({ message: 'Configurações salvas com sucesso!', type: 'success' });
      } else {
        throw new Error('Erro ao salvar');
      }
    } catch (e) {
      setToast({ message: 'Erro ao salvar configurações', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const resetMessage = (field: string) => {
    const key = field.replace('graceMessage', '') as keyof typeof DEFAULT_MESSAGES;
    const defaultKey = 'day' + key.replace('day', '').toLowerCase() as keyof typeof DEFAULT_MESSAGES;
    const finalKey = key === 'Suspended' ? 'suspended' : defaultKey;
    
    setConfig(prev => ({
      ...prev,
      [field]: DEFAULT_MESSAGES[finalKey as keyof typeof DEFAULT_MESSAGES]
    }));
    setToast({ message: 'Mensagem restaurada para padrão', type: 'info' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Configurações Globais</h2>
          <p className="text-muted-foreground">Configure a plataforma, URLs e mensagens automáticas.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-primary-foreground px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar Tudo'}
        </button>
      </div>

      {/* === IDENTIDADE DA PLATAFORMA === */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="font-bold uppercase text-sm tracking-widest">Identidade da Plataforma</h3>
        </div>

        {/* URL Automática */}
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm text-emerald-400">URL da Plataforma (Automático)</p>
              <p className="text-xs text-muted-foreground mt-1">Detectada automaticamente via variável de ambiente</p>
            </div>
            <code className="px-3 py-1 bg-background rounded-lg text-sm font-mono text-emerald-500">
              https://saaswpp.work
            </code>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Nome da Plataforma</label>
            <input 
              type="text" 
              value={config.platformName}
              onChange={e => setConfig({ ...config, platformName: e.target.value })}
              className="w-full p-3 rounded-xl border border-border bg-background"
              placeholder="SaaSWPP"
            />
            <p className="text-xs text-muted-foreground mt-1">Usado nas mensagens automáticas</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">WhatsApp de Suporte</label>
            <input 
              type="text" 
              value={config.supportWhatsapp}
              onChange={e => setConfig({ ...config, supportWhatsapp: e.target.value })}
              className="w-full p-3 rounded-xl border border-border bg-background"
              placeholder="5511999999999"
            />
            <p className="text-xs text-muted-foreground mt-1">Formato: código país + DDD + número</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email de Suporte</label>
            <input 
              type="email" 
              value={config.supportEmail}
              onChange={e => setConfig({ ...config, supportEmail: e.target.value })}
              className="w-full p-3 rounded-xl border border-border bg-background"
              placeholder="suporte@saaswpp.work"
            />
          </div>
        </div>
      </div>

      {/* === TRIAL === */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-bold uppercase text-sm tracking-widest">Período de Trial</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border">
            <div>
              <p className="font-bold">Trials Ativos</p>
              <p className="text-xs text-muted-foreground">Permitir novos clientes em trial</p>
            </div>
            <button
              onClick={() => setConfig({ ...config, trialEnabled: !config.trialEnabled })}
              className={`w-14 h-8 rounded-full transition-colors ${config.trialEnabled ? 'bg-primary' : 'bg-muted'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${config.trialEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Dias Padrão de Trial</label>
            <input 
              type="number" 
              value={config.trialDefaultDays}
              onChange={e => setConfig({ ...config, trialDefaultDays: parseInt(e.target.value) || 7 })}
              className="w-full p-3 rounded-xl border border-border bg-background"
              min="1"
              max="30"
            />
          </div>
        </div>
      </div>

      {/* === GRACE PERIOD === */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="font-bold uppercase text-sm tracking-widest">Janela de Suspensão Ativa (Grace Period)</h3>
        </div>

        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p className="text-sm text-amber-200">
            <strong>Como funciona:</strong> Quando um pagamento falha, a conta entra em "grace period".
            O sistema continua funcionando por X dias, enviando 1 mensagem por dia. Após esse período,
            mais Y horas finais antes da suspensão total.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border">
            <div>
              <p className="font-bold">Grace Period Ativo</p>
              <p className="text-xs text-muted-foreground">Dar tempo antes de suspender</p>
            </div>
            <button
              onClick={() => setConfig({ ...config, gracePeriodEnabled: !config.gracePeriodEnabled })}
              className={`w-14 h-8 rounded-full transition-colors ${config.gracePeriodEnabled ? 'bg-primary' : 'bg-muted'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${config.gracePeriodEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Dias de Grace Period</label>
            <input 
              type="number" 
              value={config.gracePeriodDays}
              onChange={e => setConfig({ ...config, gracePeriodDays: parseInt(e.target.value) || 5 })}
              className="w-full p-3 rounded-xl border border-border bg-background"
              min="1"
              max="15"
            />
            <p className="text-xs text-muted-foreground mt-1">Dias que o sistema continua funcionando</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Horas Finais (após grace)</label>
            <input 
              type="number" 
              value={config.gracePeriodFinalHours}
              onChange={e => setConfig({ ...config, gracePeriodFinalHours: parseInt(e.target.value) || 48 })}
              className="w-full p-3 rounded-xl border border-border bg-background"
              min="0"
              max="72"
            />
            <p className="text-xs text-muted-foreground mt-1">Últimas horas após o período</p>
          </div>
        </div>

        {/* Preview do fluxo */}
        <div className="p-4 bg-muted/30 rounded-xl border border-border">
          <h4 className="font-bold text-xs uppercase tracking-widest mb-3 text-muted-foreground">Fluxo com suas configurações:</h4>
          <div className="flex items-center gap-2 text-sm overflow-x-auto pb-2">
            <span className="px-3 py-1 bg-destructive/10 text-destructive rounded-lg whitespace-nowrap">Pagamento Falhou</span>
            <span className="text-muted-foreground">→</span>
            <span className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-lg whitespace-nowrap">{config.gracePeriodDays} dias Grace</span>
            <span className="text-muted-foreground">→</span>
            <span className="px-3 py-1 bg-orange-500/10 text-orange-500 rounded-lg whitespace-nowrap">{config.gracePeriodFinalHours}h Finais</span>
            <span className="text-muted-foreground">→</span>
            <span className="px-3 py-1 bg-red-500/10 text-red-500 rounded-lg whitespace-nowrap">Suspenso</span>
          </div>
        </div>
      </div>

      {/* === MENSAGENS DO GRACE PERIOD === */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <MessageSquare className="w-5 h-5 text-primary" />
          <h3 className="font-bold uppercase text-sm tracking-widest">Mensagens Automáticas do Grace Period</h3>
        </div>

        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-200">
          <strong>Variáveis disponíveis:</strong> {'{nome}'}, {'{platformName}'}, {'{platformUrl}'}, {'{diasRestantes}'}, {'{horasFinais}'}
        </div>

        <div className="space-y-4">
          {/* Dia 1 */}
          <MessageEditor
            title="Mensagem Dia 1 - Falha no Pagamento"
            value={config.graceMessageDay1}
            onChange={v => setConfig({ ...config, graceMessageDay1: v })}
            onReset={() => resetMessage('graceMessageDay1')}
            editing={editingMessage === 'day1'}
            onToggleEdit={() => setEditingMessage(editingMessage === 'day1' ? null : 'day1')}
          />

          {/* Dia 2 */}
          <MessageEditor
            title="Mensagem Dia 2"
            value={config.graceMessageDay2}
            onChange={v => setConfig({ ...config, graceMessageDay2: v })}
            onReset={() => resetMessage('graceMessageDay2')}
            editing={editingMessage === 'day2'}
            onToggleEdit={() => setEditingMessage(editingMessage === 'day2' ? null : 'day2')}
          />

          {/* Dia 3 */}
          <MessageEditor
            title="Mensagem Dia 3"
            value={config.graceMessageDay3}
            onChange={v => setConfig({ ...config, graceMessageDay3: v })}
            onReset={() => resetMessage('graceMessageDay3')}
            editing={editingMessage === 'day3'}
            onToggleEdit={() => setEditingMessage(editingMessage === 'day3' ? null : 'day3')}
          />

          {/* Dia 4 */}
          <MessageEditor
            title="Mensagem Dia 4"
            value={config.graceMessageDay4}
            onChange={v => setConfig({ ...config, graceMessageDay4: v })}
            onReset={() => resetMessage('graceMessageDay4')}
            editing={editingMessage === 'day4'}
            onToggleEdit={() => setEditingMessage(editingMessage === 'day4' ? null : 'day4')}
          />

          {/* Dia 5 - Último Aviso */}
          <MessageEditor
            title="Mensagem Dia 5 - Último Aviso (48h)"
            value={config.graceMessageDay5}
            onChange={v => setConfig({ ...config, graceMessageDay5: v })}
            onReset={() => resetMessage('graceMessageDay5')}
            editing={editingMessage === 'day5'}
            onToggleEdit={() => setEditingMessage(editingMessage === 'day5' ? null : 'day5')}
            highlight
          />

          {/* Suspenso */}
          <MessageEditor
            title="Mensagem de Suspensão"
            value={config.graceMessageSuspended}
            onChange={v => setConfig({ ...config, graceMessageSuspended: v })}
            onReset={() => resetMessage('graceMessageSuspended')}
            editing={editingMessage === 'suspended'}
            onToggleEdit={() => setEditingMessage(editingMessage === 'suspended' ? null : 'suspended')}
            danger
          />
        </div>
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

// Componente para editar mensagens
interface MessageEditorProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  onReset: () => void;
  editing: boolean;
  onToggleEdit: () => void;
  highlight?: boolean;
  danger?: boolean;
}

const MessageEditor: React.FC<MessageEditorProps> = ({
  title,
  value,
  onChange,
  onReset,
  editing,
  onToggleEdit,
  highlight,
  danger
}) => {
  const borderColor = danger 
    ? 'border-red-500/30' 
    : highlight 
      ? 'border-amber-500/30' 
      : 'border-border';

  return (
    <div className={`rounded-xl border ${borderColor} overflow-hidden`}>
      <div 
        className={`flex items-center justify-between px-4 py-3 cursor-pointer ${danger ? 'bg-red-500/5' : highlight ? 'bg-amber-500/5' : 'bg-muted/30'}`}
        onClick={onToggleEdit}
      >
        <h4 className="font-bold text-sm">{title}</h4>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReset();
            }}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            Restaurar padrão
          </button>
          {editing ? (
            <X className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Edit2 className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>
      
      {editing && (
        <div className="p-4 border-t border-border">
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full p-3 rounded-xl border border-border bg-background font-mono text-sm h-48 resize-none"
            placeholder="Digite a mensagem..."
          />
          <p className="text-xs text-muted-foreground mt-2">
            {value.length} caracteres
          </p>
        </div>
      )}
      
      {!editing && (
        <div className="px-4 py-3 bg-background/50">
          <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{value}</p>
        </div>
      )}
    </div>
  );
};

export default AdminGlobalSettings;
