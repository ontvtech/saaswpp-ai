
// Dados estáticos para simulação completa no Frontend (Client-Side)

export const MOCK_DATA = {
  user: {
    id: 'demo-user',
    name: 'Usuário Demo',
    email: 'demo@saaswpp.com',
    role: 'ADMIN',
    avatar: 'https://github.com/shadcn.png'
  },
  
  adminStats: {
    totalResellers: 15,
    activePlans: 8,
    mrr: 14500.00,
    apiHealth: '100%',
    dbHealth: '100%',
    aiHealth: '99.9%',
    dailyConsumption: '45.2k tokens',
    totalMessages: 1250,
    estimatedCost: '4.50',
    smartBox: '12 pendentes',
    inbox: '1.2k mensagens',
    hotEngagement: '92% taxa'
  },

  adminLogs: [
    { id: 1, level: 'info', message: 'Sistema iniciado em modo Client-Side Mock', timestamp: new Date().toISOString() },
    { id: 2, level: 'success', message: 'Conexão simulada com Evolution API estabelecida', timestamp: new Date().toISOString() },
    { id: 3, level: 'warn', message: 'Uso de IA acima da média no Tenant #42', timestamp: new Date().toISOString() }
  ],

  backendLogs: `[INFO] Server started on port 3000
[INFO] Connected to PostgreSQL
[INFO] Evolution API Cluster: Connected (3 nodes)
[WARN] High latency detected on Node 8GB (124ms)
[INFO] User admin@demo.com logged in
[SUCCESS] Payment processed for Tenant #12
[INFO] AI Orchestrator: Processing batch #8492`,

  resellerTenants: [
    { id: 't1', name: 'Oficina do Zé', email: 'ze@oficina.com', plan: 'Pro', status: 'active', whatsappApiType: 'EVOLUTION', evolutionInstance: 'ze-oficina', subscriptionId: 'sub_123' },
    { id: 't2', name: 'Pet Shop Auau', email: 'contato@auau.com', plan: 'Start', status: 'active', whatsappApiType: 'META', metaPhoneNumberId: '123456', subscriptionId: 'sub_456' },
    { id: 't3', name: 'Restaurante Sabor', email: 'adm@sabor.com', plan: 'Enterprise', status: 'suspended', whatsappApiType: 'EVOLUTION', subscriptionId: null },
  ],

  merchantStats: {
    messages: 8540,
    leads: 142,
    conversion: '12.5%',
    response_time: '0.8s',
    activeChats: 15,
    aiAutomationRate: '94%'
  },

  catalog: [
    { id: 1, name: 'Troca de Óleo Premium', category: 'Serviço', price: 189.90, stock: 999, description: 'Óleo sintético + Filtro' },
    { id: 2, name: 'Pneu Aro 15 Pirelli', category: 'Produto', price: 450.00, stock: 8, description: 'Pneu novo com garantia' },
    { id: 3, name: 'Alinhamento e Balanceamento', category: 'Serviço', price: 120.00, stock: 999, description: 'Serviço completo 3D' },
    { id: 4, name: 'Bateria Moura 60Ah', category: 'Produto', price: 520.00, stock: 3, description: 'Bateria original' },
  ],

  appointments: [
    { id: 'a1', client: 'Carlos Silva', date: '2024-03-15', time: '14:00', service: 'Troca de Óleo', status: 'confirmed' },
    { id: 'a2', client: 'Ana Maria', date: '2024-03-15', time: '15:30', service: 'Alinhamento', status: 'pending' }
  ],

  campaigns: [
    { id: 'c1', name: 'Desconto de Páscoa', sent: 1500, opened: 980, converted: 120, status: 'active' },
    { id: 'c2', name: 'Black Friday Antecipada', sent: 5000, opened: 3200, converted: 450, status: 'completed' }
  ],

  templates: [
    { id: '1', name: 'Atendente de Clínica', niche: 'Saúde', content: 'Você é a secretária...' },
    { id: '2', name: 'Vendedor de Loja', niche: 'Varejo', content: 'Você é vendedor...' },
    { id: '3', name: 'Suporte Técnico', niche: 'Tecnologia', content: 'Você é suporte...' }
  ],

  aiStats: {
    totalTokens: 124500,
    totalMessages: 8420,
    estimatedCost: '12.45'
  },

  telemetry: {
    node16gb: { cpu: '45%', memory: { used: '6.2GB' } },
    node8gb: { cpu: '30%', memory: { used: '3.1GB' } }
  },

  resellerSettings: {
    notificationPhone: '5511999999999',
    notificationsEnabled: true
  },

  stripeConfig: {
    stripeSecretKey: 'sk_test_mock_key',
    stripeWebhookSecret: 'whsec_mock_secret'
  },

  adminConfig: {
    trial_enabled: true
  }
};

// Função simuladora de delay de rede
export const mockDelay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));
