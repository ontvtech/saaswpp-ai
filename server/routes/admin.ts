import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import si from 'systeminformation';
import fs from 'fs';
import path from 'path';
import { callUniversalAI, getPoolStats, setPoolStrategy, resetKeyErrors } from '../services/aiOrchestrator';
import { requireAuth } from './auth';
import MetricsService from '../services/metricsService';
import { aiKeyPool } from '../services/keyPool';
import { triggerJobNow, getQueueStats } from '../jobs/automationJobs';
import { encrypt } from '../utils/security';
import type { PoolStrategy, AIProvider } from '../types';

const prisma = new PrismaClient();
export const adminRoutes = Router();

// Require Admin Role
adminRoutes.use(requireAuth(['ADMIN']));

// Testar Chave API
adminRoutes.post('/keys/test', async (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: 'Chave não fornecida' });

  try {
    const response = await callUniversalAI('You are a validator. Respond with "OK" if you receive this.', 'Hello World', key);
    if (response && response.includes('OK')) {
      res.json({ success: true, message: 'Chave validada com sucesso!' });
    } else {
      res.status(400).json({ success: false, message: 'Resposta inválida da API.', debug: response });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Global Config
adminRoutes.get('/config', async (req, res) => {
  try {
    const config = await prisma.globalConfig.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton', trial_enabled: true }
    });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

adminRoutes.post('/config', async (req, res) => {
  try {
    const { trial_enabled } = req.body;
    const config = await prisma.globalConfig.update({
      where: { id: 'singleton' },
      data: { trial_enabled }
    });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// Key Rotation Service
const apiKeys = [
  process.env.GEMINI_KEY_1,
  process.env.GEMINI_KEY_2,
  process.env.GEMINI_KEY_3,
];
let currentKeyIndex = 0;

export function rotateApiKey() {
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  console.log(`[SECURITY] Rotating API Key to Index: ${currentKeyIndex}`);
  return apiKeys[currentKeyIndex];
}

// Admin Endpoints
adminRoutes.post('/keys/rotate', async (req, res) => {
  rotateApiKey();
  
  // Audit Log
  await (prisma as any).auditLog.create({
    data: {
      action: 'KEY_ROTATION',
      details: `Manual key rotation triggered. New index: ${currentKeyIndex}`,
      ipAddress: req.ip
    }
  });

  res.json({ status: 'ROTATED', current: currentKeyIndex });
});

adminRoutes.get('/keys/status', (req, res) => {
  res.json({
    total: apiKeys.length,
    active: currentKeyIndex,
    health: 'OPTIMAL'
  });
});

// Module 5: Command Center and Telemetry
adminRoutes.get('/telemetry', async (req, res) => {
  try {
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    
    // Node 16GB (Current Node)
    const node16gb = {
      cpu: cpu.currentLoad.toFixed(2),
      memory: {
        used: (mem.active / 1024 / 1024 / 1024).toFixed(2),
        total: (mem.total / 1024 / 1024 / 1024).toFixed(2)
      }
    };

    // Node 8GB (Remote Node)
    // In a real scenario, this would be a fetch to the other node's /api/admin/telemetry
    // For now, we leave it as N/A until the monitoring agent is configured
    const node8gb = {
      cpu: "N/A",
      memory: {
        used: "N/A",
        total: "8.00"
      }
    };

    res.json({ node16gb, node8gb });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch telemetry' });
  }
});

adminRoutes.get('/logs', (req, res) => {
  const logType = req.query.type as string || 'backend';
  const logPaths: Record<string, string> = {
    backend: path.join(process.cwd(), 'combined.log'),
    evolution: path.join(process.cwd(), 'evolution.log')
  };

  const logPath = logPaths[logType];
  
  if (fs.existsSync(logPath)) {
    const logs = fs.readFileSync(logPath, 'utf8').split('\n').slice(-100).join('\n');
    res.json({ logs });
  } else {
    res.json({ logs: `[SYSTEM] Log file not found at ${logPath}. Ensure production logging is active.` });
  }
});

adminRoutes.get('/ai-stats', async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const stats = await prisma.interactionLog.aggregate({
      where: {
        createdAt: {
          gte: twentyFourHoursAgo
        }
      },
      _sum: {
        tokensUsed: true
      },
      _count: {
        id: true
      }
    });

    const totalTokens = stats._sum.tokensUsed || 0;
    const totalMessages = stats._count.id || 0;
    
    // Estimated cost: $0.075 per 1M tokens (Gemini 1.5 Flash pricing approx)
    const estimatedCost = (totalTokens / 1000000) * 0.075;

    res.json({
      totalMessages,
      totalTokens,
      estimatedCost: estimatedCost.toFixed(4),
      period: '24h'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch AI stats' });
  }
});

// --- PLAN MANAGEMENT ---
adminRoutes.get('/plans', async (req, res) => {
  try {
    const plans = await prisma.plan.findMany();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

adminRoutes.post('/plans', async (req, res) => {
  try {
    const { name, price, description, type, maxTenants, maxMessages, modules, tokenLimit, instanceLimit, stripePriceId } = req.body;
    const plan = await prisma.plan.create({
      data: { name, price: Number(price), description, type, maxTenants: Number(maxTenants), maxMessages: Number(maxMessages), modules, tokenLimit: Number(tokenLimit || 50000), instanceLimit: Number(instanceLimit || 1), stripePriceId }
    });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

adminRoutes.put('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, description, type, maxTenants, maxMessages, modules, tokenLimit, instanceLimit, stripePriceId } = req.body;
    const plan = await prisma.plan.update({
      where: { id },
      data: { name, price: Number(price), description, type, maxTenants: Number(maxTenants), maxMessages: Number(maxMessages), modules, tokenLimit: Number(tokenLimit || 50000), instanceLimit: Number(instanceLimit || 1), stripePriceId }
    });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

adminRoutes.delete('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.plan.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

// --- NICHE MANAGEMENT ---
adminRoutes.get('/niches', async (req, res) => {
  try {
    const niches = await prisma.nicheTemplate.findMany();
    res.json(niches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch niches' });
  }
});

adminRoutes.post('/niches', async (req, res) => {
  try {
    const { name, basePrompt } = req.body;
    const niche = await prisma.nicheTemplate.create({
      data: { name, basePrompt }
    });
    res.json(niche);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create niche' });
  }
});

adminRoutes.put('/niches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, basePrompt } = req.body;
    const niche = await prisma.nicheTemplate.update({
      where: { id },
      data: { name, basePrompt }
    });
    res.json(niche);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update niche' });
  }
});

adminRoutes.delete('/niches/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.nicheTemplate.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete niche' });
  }
});

// --- GLOBAL CONFIG ---
adminRoutes.get('/config', async (req, res) => {
  try {
    let config = await prisma.globalConfig.findUnique({ where: { id: 'singleton' } });
    if (!config) {
      config = await prisma.globalConfig.create({ data: { id: 'singleton' } });
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

adminRoutes.put('/config', async (req, res) => {
  try {
    const { trial_enabled, stripeSecretKey, stripePublicKey, stripeWebhookSecret } = req.body;
    const config = await prisma.globalConfig.upsert({
      where: { id: 'singleton' },
      update: { trial_enabled, stripeSecretKey, stripePublicKey, stripeWebhookSecret },
      create: { id: 'singleton', trial_enabled, stripeSecretKey, stripePublicKey, stripeWebhookSecret }
    });
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// --- TRIAL LINKS ---
adminRoutes.get('/trial-links', async (req, res) => {
  try {
    const links = await prisma.trialLink.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trial links' });
  }
});

adminRoutes.post('/trial-links', async (req, res) => {
  try {
    const { code, days, tokenLimit, instanceLimit, expiresAt } = req.body;
    const link = await prisma.trialLink.create({
      data: { 
        code: code || Math.random().toString(36).substring(2, 10).toUpperCase(),
        days: days || 7, 
        tokenLimit: tokenLimit || 50000, 
        instanceLimit: instanceLimit || 1, 
        expiresAt: expiresAt ? new Date(expiresAt) : null 
      }
    });
    res.json(link);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create trial link' });
  }
});

adminRoutes.delete('/trial-links/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.trialLink.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete trial link' });
  }
});

// =============================================================================
// NOVAS ROTAS - MÉTRICAS E MONITORAMENTO
// =============================================================================

// --- SYSTEM METRICS ---
adminRoutes.get('/metrics', async (req, res) => {
  try {
    const metrics = await MetricsService.getSystemMetrics();
    res.json(metrics);
  } catch (error: any) {
    console.error('[ADMIN] Erro ao buscar métricas:', error);
    res.status(500).json({ error: 'Failed to fetch metrics', details: error.message });
  }
});

// --- ALERTS ---
adminRoutes.get('/alerts', async (req, res) => {
  try {
    const alerts = await MetricsService.getActiveAlerts();
    res.json(alerts);
  } catch (error: any) {
    console.error('[ADMIN] Erro ao buscar alertas:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// --- TOP MERCHANTS ---
adminRoutes.get('/metrics/top-merchants', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const merchants = await MetricsService.getTopMerchants(limit);
    res.json(merchants);
  } catch (error: any) {
    console.error('[ADMIN] Erro ao buscar top merchants:', error);
    res.status(500).json({ error: 'Failed to fetch top merchants' });
  }
});

// --- AI KEY POOL MANAGEMENT ---
adminRoutes.get('/keys/pool', async (req, res) => {
  try {
    const keys = await prisma.aiKey.findMany({
      orderBy: [{ priority: 'desc' }, { lastUsed: 'desc' }]
    });
    const stats = await getPoolStats();
    
    res.json({ keys, stats });
  } catch (error: any) {
    console.error('[ADMIN] Erro ao buscar pool:', error);
    res.status(500).json({ error: 'Failed to fetch key pool' });
  }
});

adminRoutes.post('/keys/pool', async (req, res) => {
  try {
    const { key, provider, tier, tokenLimit, priority, weight } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: 'Chave não fornecida' });
    }

    // Criptografar chave antes de salvar
    const encryptedKey = encrypt(key);

    const newKey = await prisma.aiKey.create({
      data: {
        key: encryptedKey,
        provider: provider || 'GEMINI',
        tier: tier || 'BASIC',
        tokenLimit: tokenLimit || 1000000,
        priority: priority || 0,
        weight: weight || 1,
        status: 'active'
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'AI_KEY_ADDED',
        details: `Nova chave adicionada: ${newKey.id} (${provider})`
      }
    });

    res.json({ success: true, id: newKey.id });
  } catch (error: any) {
    console.error('[ADMIN] Erro ao adicionar chave:', error);
    res.status(500).json({ error: 'Failed to add key' });
  }
});

adminRoutes.put('/keys/pool/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, weight, tier } = req.body;

    const updated = await prisma.aiKey.update({
      where: { id },
      data: { status, priority, weight, tier }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('[ADMIN] Erro ao atualizar chave:', error);
    res.status(500).json({ error: 'Failed to update key' });
  }
});

adminRoutes.delete('/keys/pool/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.aiKey.delete({ where: { id } });
    
    await prisma.auditLog.create({
      data: {
        action: 'AI_KEY_DELETED',
        details: `Chave removida: ${id}`
      }
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('[ADMIN] Erro ao deletar chave:', error);
    res.status(500).json({ error: 'Failed to delete key' });
  }
});

adminRoutes.post('/keys/pool/:id/reset-errors', async (req, res) => {
  try {
    const { id } = req.params;
    await resetKeyErrors(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[ADMIN] Erro ao resetar erros:', error);
    res.status(500).json({ error: 'Failed to reset errors' });
  }
});

adminRoutes.put('/keys/pool-strategy', async (req, res) => {
  try {
    const { strategy } = req.body;
    
    if (!['rotation', 'load_balance', 'failover'].includes(strategy)) {
      return res.status(400).json({ error: 'Estratégia inválida' });
    }

    setPoolStrategy(strategy as PoolStrategy);
    
    await prisma.auditLog.create({
      data: {
        action: 'POOL_STRATEGY_CHANGED',
        details: `Estratégia alterada para: ${strategy}`
      }
    });

    res.json({ success: true, strategy });
  } catch (error: any) {
    console.error('[ADMIN] Erro ao alterar estratégia:', error);
    res.status(500).json({ error: 'Failed to change strategy' });
  }
});

adminRoutes.post('/keys/pool/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    
    const keyRecord = await prisma.aiKey.findUnique({ where: { id } });
    if (!keyRecord) {
      return res.status(404).json({ error: 'Chave não encontrada' });
    }

    // Testar chave (usando a chave descriptografada do pool)
    const response = await callUniversalAI(
      'You are a validator. Respond with "OK" if you receive this.',
      'Hello World',
      keyRecord.key
    );

    if (response && response.includes('OK')) {
      res.json({ success: true, message: 'Chave validada com sucesso!' });
    } else {
      res.status(400).json({ success: false, message: 'Resposta inválida da API' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// --- QUEUE MANAGEMENT ---
adminRoutes.get('/queue/stats', async (req, res) => {
  try {
    const stats = await getQueueStats();
    res.json(stats);
  } catch (error: any) {
    console.error('[ADMIN] Erro ao buscar stats da fila:', error);
    res.status(500).json({ error: 'Failed to fetch queue stats' });
  }
});

adminRoutes.post('/queue/trigger', async (req, res) => {
  try {
    const { jobType } = req.body;
    
    if (!jobType) {
      return res.status(400).json({ error: 'Job type não especificado' });
    }

    const jobId = await triggerJobNow(jobType);
    res.json({ success: true, jobId });
  } catch (error: any) {
    console.error('[ADMIN] Erro ao disparar job:', error);
    res.status(500).json({ error: 'Failed to trigger job' });
  }
});

// --- KEY METRICS ---
adminRoutes.get('/keys/metrics', async (req, res) => {
  try {
    const metrics = await MetricsService.getKeyMetrics();
    res.json(metrics);
  } catch (error: any) {
    console.error('[ADMIN] Erro ao buscar métricas de chaves:', error);
    res.status(500).json({ error: 'Failed to fetch key metrics' });
  }
});

// --- RESELLER MANAGEMENT ---
adminRoutes.get('/resellers', async (req, res) => {
  try {
    const resellers = await prisma.reseller.findMany({
      include: {
        _count: { select: { merchants: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(resellers);
  } catch (error: any) {
    console.error('[ADMIN] Erro ao buscar resellers:', error);
    res.status(500).json({ error: 'Failed to fetch resellers' });
  }
});

adminRoutes.put('/resellers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, allowedModules, maxTenants, brandName, brandPrimaryColor } = req.body;

    const updated = await prisma.reseller.update({
      where: { id },
      data: { status, allowedModules, maxTenants, brandName, brandPrimaryColor }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('[ADMIN] Erro ao atualizar reseller:', error);
    res.status(500).json({ error: 'Failed to update reseller' });
  }
});

// --- MERCHANT MANAGEMENT (Admin View) ---
adminRoutes.get('/merchants', async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as string;
    const search = req.query.search as string;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [merchants, total] = await Promise.all([
      prisma.merchant.findMany({
        where,
        include: { plan: true, reseller: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.merchant.count({ where })
    ]);

    res.json({ merchants, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    console.error('[ADMIN] Erro ao buscar merchants:', error);
    res.status(500).json({ error: 'Failed to fetch merchants' });
  }
});

adminRoutes.put('/merchants/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const merchant = await prisma.merchant.update({
      where: { id },
      data: { status }
    });

    await prisma.auditLog.create({
      data: {
        merchantId: id,
        action: 'STATUS_CHANGED',
        details: `Status alterado para: ${status}. Motivo: ${reason || 'N/A'}`
      }
    });

    res.json(merchant);
  } catch (error: any) {
    console.error('[ADMIN] Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// =============================================================================
// GLOBAL CONFIG COMPLETO (URL, Mensagens, Grace Period)
// =============================================================================

adminRoutes.get('/global-config', async (req, res) => {
  try {
    let config = await prisma.globalConfig.findUnique({ where: { id: 'singleton' } });
    if (!config) {
      config = await prisma.globalConfig.create({ 
        data: { 
          id: 'singleton',
          platformName: 'SaaSWPP',
          platformUrl: 'https://saaswpp.com',
        } 
      });
    }
    res.json(config);
  } catch (error: any) {
    console.error('[ADMIN] Erro ao buscar config global:', error);
    res.status(500).json({ error: 'Failed to fetch global config' });
  }
});

adminRoutes.put('/global-config', async (req, res) => {
  try {
    const data = req.body;
    
    const config = await prisma.globalConfig.upsert({
      where: { id: 'singleton' },
      update: {
        platformName: data.platformName,
        platformUrl: data.platformUrl,
        supportEmail: data.supportEmail,
        supportWhatsapp: data.supportWhatsapp,
        trialEnabled: data.trialEnabled,
        trialDefaultDays: data.trialDefaultDays,
        gracePeriodEnabled: data.gracePeriodEnabled,
        gracePeriodDays: data.gracePeriodDays,
        gracePeriodFinalHours: data.gracePeriodFinalHours,
        graceMessageDay1: data.graceMessageDay1,
        graceMessageDay2: data.graceMessageDay2,
        graceMessageDay3: data.graceMessageDay3,
        graceMessageDay4: data.graceMessageDay4,
        graceMessageDay5: data.graceMessageDay5,
        graceMessageSuspended: data.graceMessageSuspended,
        stripeSecretKey: data.stripeSecretKey,
        stripePublicKey: data.stripePublicKey,
        stripeWebhookSecret: data.stripeWebhookSecret,
      },
      create: {
        id: 'singleton',
        platformName: data.platformName || 'SaaSWPP',
        platformUrl: data.platformUrl || 'https://saaswpp.com',
        supportEmail: data.supportEmail,
        supportWhatsapp: data.supportWhatsapp,
        trialEnabled: data.trialEnabled ?? true,
        trialDefaultDays: data.trialDefaultDays || 7,
        gracePeriodEnabled: data.gracePeriodEnabled ?? true,
        gracePeriodDays: data.gracePeriodDays || 5,
        gracePeriodFinalHours: data.gracePeriodFinalHours || 48,
        graceMessageDay1: data.graceMessageDay1,
        graceMessageDay2: data.graceMessageDay2,
        graceMessageDay3: data.graceMessageDay3,
        graceMessageDay4: data.graceMessageDay4,
        graceMessageDay5: data.graceMessageDay5,
        graceMessageSuspended: data.graceMessageSuspended,
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'GLOBAL_CONFIG_UPDATED',
        details: 'Configurações globais atualizadas'
      }
    });

    res.json(config);
  } catch (error: any) {
    console.error('[ADMIN] Erro ao atualizar config global:', error);
    res.status(500).json({ error: 'Failed to update global config' });
  }
});

// =============================================================================
// GRACE PERIOD OVERVIEW
// =============================================================================

import { getGracePeriodOverview } from '../services/gracePeriodService';

adminRoutes.get('/grace-period/overview', async (req, res) => {
  try {
    const overview = await getGracePeriodOverview();
    res.json(overview);
  } catch (error: any) {
    console.error('[ADMIN] Erro ao buscar grace period overview:', error);
    res.status(500).json({ error: 'Failed to fetch grace period overview' });
  }
});

// =============================================================================
// RESELLER CREATE (Zero Touch setup)
// =============================================================================

adminRoutes.post('/resellers', async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      planId,
      allowedModules,
      maxTenants,
      whatsappNumber,
      zeroTouchEnabled,
      defaultTrialDays
    } = req.body;

    // Verificar se email já existe
    const existing = await prisma.reseller.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    const reseller = await prisma.reseller.create({
      data: {
        name,
        email,
        password: hashedPassword,
        planId,
        allowedModules: allowedModules || ['ESSENTIAL'],
        maxTenants: maxTenants || 10,
        whatsappNumber,
        zeroTouchEnabled: zeroTouchEnabled ?? true,
        defaultTrialDays: defaultTrialDays || 7,
        status: 'active'
      }
    });

    await prisma.auditLog.create({
      data: {
        resellerId: reseller.id,
        action: 'RESELLER_CREATED',
        details: `Revendedor criado: ${name} (${email})`
      }
    });

    // Retornar sem a senha
    const { password: _, ...resellerWithoutPassword } = reseller;
    res.json(resellerWithoutPassword);
  } catch (error: any) {
    console.error('[ADMIN] Erro ao criar reseller:', error);
    res.status(500).json({ error: 'Failed to create reseller' });
  }
});
