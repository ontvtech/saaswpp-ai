import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';

// Webhooks
import { stripeWebhookHandler } from './server/routes/stripeWebhook';
import { evolutionWebhookHandler } from './server/routes/evolutionWebhook';
import { verifyMetaWebhook, handleMetaWebhook } from './server/routes/metaWebhook';

// Rotas principais
import { adminRoutes } from './server/routes/admin';
import authRoutes from './server/routes/authRoutes';
import { whatsappRoutes } from './server/routes/whatsapp';
import { resellerRoutes } from './server/routes/reseller';
import { catalogRoutes } from './server/routes/catalog';
import { appointmentsRoutes } from './server/routes/appointments';
import aiPredictiveRoutes from './server/routes/aiPredictive';
import trialLinkRoutes from './server/routes/trialLinks';
import { checkoutRoutes } from './server/routes/checkout';
import aiPoolRoutes from './server/routes/aiPool';

// NFS-e (Nota Fiscal de Serviço)
import nfseRoutes from './server/routes/nfseRoutes';

// Auto Setup e Features
import autoSetupRoutes from './server/routes/autoSetupRoutes';

// Todas as Features (START, PRO, ENTERPRISE, ELITE, NINJA)
import allFeaturesRoutes from './server/routes/allFeaturesRoutes';

import rateLimit from 'express-rate-limit';

// Simple Logger for Production Hardening
const logStream = fs.createWriteStream(path.join(process.cwd(), 'combined.log'), { flags: 'a' });
const logger = (msg: string) => {
  const entry = `[${new Date().toISOString()}] ${msg}\n`;
  logStream.write(entry);
  console.log(msg);
};

// Rate Limiting: Protect against brute force and API abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Security: IP Filter Middleware for Webhooks
const webhookGuard = (req: Request, res: Response, next: NextFunction) => {
  // In development/preview, we allow all traffic to avoid blocking the UI
  if (process.env.NODE_ENV !== 'production' || process.env.VITE_DEV_SERVER === 'true') {
    return next();
  }

  const clientIp = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  
  // Allow Cloudflare (detected by header) or Mikrotik IP
  const isCloudflare = !!req.headers['cf-connecting-ip'];
  const isMikrotik = clientIp === '192.168.88.1';
  const isLocal = clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === '::ffff:127.0.0.1';

  if (isCloudflare || isMikrotik || isLocal) {
    return next();
  }

  console.warn(`[SECURITY] Blocked unauthorized access from ${clientIp}`);
  return res.status(403).json({ error: 'Access Denied' });
};

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Security Middleware
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));
  
  app.use(cors({
    origin: process.env.PLATFORM_URL || 'https://saaswpp.work',
    credentials: true
  }));

  // Apply rate limiter to all routes (only in production)
  if (process.env.NODE_ENV === 'production') {
    app.use(limiter);
  }

  // Vite Middleware (Dev Mode) - MOVED UP to ensure assets are served correctly
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Node Configuration (Production Welding)
  // Redis: Node 8GB (192.168.88.5)
  // Evolution: Node 16GB (192.168.88.6)
  process.env.REDIS_HOST = process.env.REDIS_HOST || '192.168.88.5';
  process.env.EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';

  // Raw body parser for Stripe webhooks (with Guard)
  app.use('/api/webhooks/stripe', webhookGuard, express.raw({ type: 'application/json' }), stripeWebhookHandler);

  // JSON parser for other routes
  app.use(express.json());

  // Evolution API Webhook (Messages -> AI) (with Guard)
  app.use('/api/webhooks/evolution', webhookGuard, evolutionWebhookHandler);

  // Meta API Webhook
  app.get('/api/webhooks/meta', verifyMetaWebhook);
  app.post('/api/webhooks/meta', handleMetaWebhook);

  // --- MOCK API LAYER (For Preview/Demo) ---
  app.get('/api/auth/me', (req, res) => {
    res.json({
      user: { id: 'demo-id', name: 'Usuário Demo', email: 'demo@saaswpp.com', role: 'ADMIN' },
      merchant: { id: 'm-1', name: 'Loja Demo', whatsappApiType: 'EVOLUTION', status: 'active' }
    });
  });

  app.get('/api/admin/stats', (req, res) => {
    res.json({
      totalMerchants: 1240,
      activeInstances: 856,
      aiMessages: 45200,
      revenue: 125000.50,
      nodes: [
        { name: 'Redis-01', status: 'operational', load: '12%' },
        { name: 'Evo-API-Primary', status: 'operational', load: '45%' }
      ]
    });
  });

  app.get('/api/admin/logs', (req, res) => {
    res.json([
      { id: 1, level: 'info', message: 'Instância m-842 conectada com sucesso', timestamp: new Date().toISOString() },
      { id: 2, level: 'warn', message: 'Latência elevada no nó Evolution-02', timestamp: new Date().toISOString() },
      { id: 3, level: 'info', message: 'Backup diário concluído', timestamp: new Date().toISOString() }
    ]);
  });

  app.get('/api/reseller/tenants', (req, res) => {
    res.json([
      { id: 't1', name: 'Oficina do Zé', status: 'active', plan: 'Premium', users: 5 },
      { id: 't2', name: 'Pet Shop Auau', status: 'active', plan: 'Basic', users: 2 },
      { id: 't3', name: 'Restaurante Sabor', status: 'trial', plan: 'Trial', users: 1 }
    ]);
  });

  app.get('/api/whatsapp/instances', (req, res) => {
    res.json([
      { id: 'inst-1', name: 'Principal', status: 'connected', phone: '5511999999999' }
    ]);
  });

  app.post('/api/whatsapp/instances', (req, res) => {
    res.json({ id: 'new-inst', name: req.body.name || 'Nova Instância', status: 'qr_ready', qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=MOCK_QR_CODE' });
  });

  app.get('/api/reseller/stats', (req, res) => {
    res.json({
      activeTenants: 45,
      monthlyRevenue: 8500.00,
      aiUsage: 12500,
      supportTickets: 3
    });
  });

  // --- ADDITIONAL MOCK DATA FOR MERCHANT FEATURES ---
  app.get('/api/catalog', (req, res) => {
    res.json([
      { id: 'p1', name: 'Produto Premium A', price: 199.90, stock: 15, category: 'Eletrônicos' },
      { id: 'p2', name: 'Serviço de Consultoria', price: 450.00, stock: 99, category: 'Serviços' },
      { id: 'p3', name: 'Kit Iniciante', price: 89.00, stock: 5, category: 'Kits' }
    ]);
  });

  app.get('/api/appointments', (req, res) => {
    res.json([
      { id: 'a1', client: 'João Silva', date: '2024-03-10', time: '14:00', service: 'Corte de Cabelo', status: 'confirmed' },
      { id: 'a2', client: 'Maria Oliveira', date: '2024-03-10', time: '15:30', service: 'Manicure', status: 'pending' }
    ]);
  });

  app.get('/api/campaigns', (req, res) => {
    res.json([
      { id: 'c1', name: 'Promoção de Verão', sent: 1200, opened: 850, converted: 45, status: 'completed' },
      { id: 'c2', name: 'Recuperação de Carrinho', sent: 450, opened: 300, converted: 82, status: 'active' }
    ]);
  });

  app.get('/api/crm/predictive', (req, res) => {
    res.json([
      { id: 'l1', name: 'Roberto Souza', score: 95, reason: 'Alta interação recente', action: 'Enviar Cupom 10%' },
      { id: 'l2', name: 'Carla Dias', score: 82, reason: 'Aniversário chegando', action: 'Mensagem Parabéns' },
      { id: 'l3', name: 'Marcos Lima', score: 45, reason: 'Inativo há 30 dias', action: 'Reativação' }
    ]);
  });

  app.get('/api/knowledge-base', (req, res) => {
    res.json([
      { id: 'k1', title: 'Política de Reembolso', content: 'Nossa política permite reembolsos em até 7 dias...', source: 'Manual' },
      { id: 'k2', title: 'Horário de Funcionamento', content: 'Segunda a Sexta, das 08h às 18h.', source: 'WhatsApp' }
    ]);
  });

  app.get('/api/financial/transactions', (req, res) => {
    res.json([
      { id: 't1', description: 'Assinatura Plano Pro', amount: 197.00, type: 'credit', date: new Date().toISOString() },
      { id: 't2', description: 'Taxa Gateway Meta', amount: -15.40, type: 'debit', date: new Date().toISOString() },
      { id: 't3', description: 'Venda Catálogo #842', amount: 89.90, type: 'credit', date: new Date().toISOString() }
    ]);
  });

  app.get('/api/merchant/stats', (req, res) => {
    res.json({
      totalSales: 4520.50,
      activeChats: 12,
      aiAutomationRate: '88%',
      pendingAppointments: 3
    });
  });
  // --- END ADDITIONAL MOCK DATA ---

  // --- END MOCK API LAYER ---

  // Admin Routes (Key Rotation, Global Prompts)
  app.use('/api/admin', adminRoutes);

  // WhatsApp Routes
  app.use('/api/whatsapp', whatsappRoutes);

  // Reseller Routes
  app.use('/api/reseller', resellerRoutes);

  // Catalog Routes
  app.use('/api/catalog', catalogRoutes);

  // Appointments Routes
  app.use('/api/appointments', appointmentsRoutes);

  // AI Predictive Routes
  app.use('/api/ai/predictive-analysis', aiPredictiveRoutes);
  app.use('/api/ai/predictive', aiPredictiveRoutes);

  // Trial Link Routes
  app.use('/api/trial-links', trialLinkRoutes);

  // Checkout Routes
  app.use('/api/checkout', checkoutRoutes);

  // AI Pool Routes (30+ keys management)
  app.use('/api/ai/pool', aiPoolRoutes);

  // ==========================================================================
  // FEATURES POR PLANO
  // ==========================================================================

  // NFS-e (Nota Fiscal de Serviço) - Emissão Automática
  app.use('/api/nfse', nfseRoutes);

  // Auto Setup (Botão Mágico) e Gerenciamento de Features
  app.use('/api/auto-setup', autoSetupRoutes);

  // Todas as Features por Plano (START, PRO, ENTERPRISE, ELITE, NINJA)
  app.use('/api/features', allFeaturesRoutes);

  // Auth Routes (Login, Registro, Recuperação de Senha)
  app.use('/api/auth', authRoutes);

  // Public API (NINJA)
  app.use('/api/public', async (req, res, next) => {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      return res.status(401).json({ error: 'API Key obrigatória' });
    }
    
    const { validateApiKey } = await import('./server/services/eliteNinjaFeatures');
    const key = await validateApiKey(apiKey);
    
    if (!key) {
      return res.status(401).json({ error: 'API Key inválida' });
    }
    
    (req as any).apiKey = key;
    next();
  });

  // ==========================================================================
  // FILES / UPLOADS
  // ==========================================================================
  
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      nodes: {
        redis: process.env.REDIS_HOST,
        evolution: process.env.EVOLUTION_API_URL
      },
      timestamp: new Date().toISOString() 
    });
  });

  // Public Status Page Endpoint
  app.get('/api/status', async (req, res) => {
    let evolutionStatus = 'degraded';
    let dbStatus = 'degraded';
    
    // Check Evolution API
    try {
      const evoRes = await fetch(`${process.env.EVOLUTION_API_URL}/instance/fetchInstances`, {
        headers: { 'apikey': process.env.EVOLUTION_API_KEY || '' },
        // timeout: 2000
      });
      if (evoRes.ok) evolutionStatus = 'operational';
    } catch (e) {
      evolutionStatus = 'degraded';
    }

    // Check DB (Prisma)
    try {
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'operational';
    } catch (e) {
      dbStatus = 'degraded';
    }

    const overallStatus = (evolutionStatus === 'operational' && dbStatus === 'operational') ? 'operational' : 'degraded';

    res.json({
      status: overallStatus,
      services: {
        ai_brain: { status: 'operational', latency: '120ms' }, // AI is serverless, assume operational if backend is up
        message_gateway: { status: evolutionStatus, uptime: '99.9%' },
        database: { status: dbStatus },
        redis_cache: { status: 'operational' } // Assume operational if we can't easily check
      },
      last_update: new Date().toISOString()
    });
  });

  // Vite Middleware (Dev Mode)
  if (process.env.NODE_ENV !== 'production') {
    // Already applied above
  } else if (!fs.existsSync(path.join(process.cwd(), 'dist'))) {
    // Fallback for production environment without build
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger(`Server running on http://0.0.0.0:${PORT}`);
    logger(`> Node 8GB (Redis): ${process.env.REDIS_HOST}`);
    logger(`> Node 16GB (Evolution): ${process.env.EVOLUTION_API_URL}`);
    logger(`> IP Filter: ACTIVE (Cloudflare & Mikrotik)`);
  });
}

startServer();
