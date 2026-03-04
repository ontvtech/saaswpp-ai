/**
 * SERVIÇO DE MÉTRICAS - SaaSWPP AI
 * Versão: 2.0.0
 * 
 * Coleta e agregação de métricas do sistema:
 * - Uso de tokens por merchant
 * - Performance do pool de chaves
 * - Status de assinaturas
 * - Alertas de quota
 */

import { PrismaClient } from '@prisma/client';
import type { AIProvider } from '../types';

const prisma = new PrismaClient();

// =============================================================================
// INTERFACES
// =============================================================================

export interface SystemMetrics {
  // Merchants
  totalMerchants: number;
  activeMerchants: number;
  trialMerchants: number;
  suspendedMerchants: number;
  gracePeriodMerchants: number;

  // Revenue
  mrr: number;
  churnedThisMonth: number;
  newThisMonth: number;

  // AI Pool
  totalKeys: number;
  activeKeys: number;
  totalTokensUsed: number;
  totalRequests: number;

  // Messages
  messagesToday: number;
  messagesThisMonth: number;

  // Alerts
  quotaWarnings: number;
  expiringTrials: number;
  expiringGracePeriods: number;
}

export interface MerchantMetrics {
  id: string;
  name: string;
  email: string;
  status: string;

  // Usage
  tokensUsed: number;
  tokensLimit: number;
  percentUsed: number;

  // Messages
  messagesToday: number;
  messagesThisMonth: number;

  // Plan
  planName: string;
  planPrice: number;

  // Dates
  createdAt: Date;
  trialEndsAt?: Date;
  gracePeriodEndsAt?: Date;
}

export interface KeyMetrics {
  id: string;
  provider: AIProvider;
  tier: string;
  status: string;

  // Usage
  tokensUsed: number;
  tokensLimit: number;
  percentUsed: number;
  requestsToday: number;
  totalRequests: number;

  // Health
  errorCount: number;
  lastError?: string;
  lastUsed: Date;

  // Priority
  priority: number;
  weight: number;
}

// =============================================================================
// MÉTRICAS DO SISTEMA
// =============================================================================

export async function getSystemMetrics(): Promise<SystemMetrics> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Contagem de merchants
  const [
    totalMerchants,
    activeMerchants,
    trialMerchants,
    suspendedMerchants,
    gracePeriodMerchants
  ] = await Promise.all([
    prisma.merchant.count(),
    prisma.merchant.count({ where: { status: 'active' } }),
    prisma.merchant.count({ where: { status: 'trial' } }),
    prisma.merchant.count({ where: { status: 'suspended' } }),
    prisma.merchant.count({ where: { status: 'grace_period' } })
  ]);

  // MRR (Monthly Recurring Revenue)
  const activeWithPlan = await prisma.merchant.findMany({
    where: { status: 'active' },
    include: { plan: true }
  });

  const mrr = activeWithPlan.reduce((sum, m) => sum + (m.plan?.price || 0), 0);

  // Churn este mês
  const churnedThisMonth = await prisma.merchant.count({
    where: {
      status: 'suspended',
      updatedAt: { gte: startOfMonth }
    }
  });

  // Novos este mês
  const newThisMonth = await prisma.merchant.count({
    where: {
      createdAt: { gte: startOfMonth }
    }
  });

  // Métricas de chaves
  const [totalKeys, activeKeys] = await Promise.all([
    prisma.aiKey.count(),
    prisma.aiKey.count({ where: { status: 'active' } })
  ]);

  const tokensAgg = await prisma.aiKey.aggregate({
    _sum: { totalTokens: true, totalRequests: true }
  });

  // Mensagens
  const [messagesToday, messagesThisMonth] = await Promise.all([
    prisma.interactionLog.count({
      where: { createdAt: { gte: startOfDay } }
    }),
    prisma.interactionLog.count({
      where: { createdAt: { gte: startOfMonth } }
    })
  ]);

  // Alertas
  const merchants = await prisma.merchant.findMany({
    include: { plan: true }
  });

  let quotaWarnings = 0;
  for (const m of merchants) {
    const limit = m.plan?.tokenLimit || m.tokenQuota;
    if (m.tokenUsage >= limit * 0.9) quotaWarnings++;
  }

  const expiringTrials = await prisma.merchant.count({
    where: {
      status: 'trial',
      trialEndsAt: {
        gt: now,
        lt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 dias
      }
    }
  });

  const expiringGracePeriods = await prisma.merchant.count({
    where: {
      status: 'grace_period',
      gracePeriodEndsAt: {
        gt: now,
        lt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) // 2 dias
      }
    }
  });

  return {
    totalMerchants,
    activeMerchants,
    trialMerchants,
    suspendedMerchants,
    gracePeriodMerchants,
    mrr,
    churnedThisMonth,
    newThisMonth,
    totalKeys,
    activeKeys,
    totalTokensUsed: tokensAgg._sum.totalTokens || 0,
    totalRequests: tokensAgg._sum.totalRequests || 0,
    messagesToday,
    messagesThisMonth,
    quotaWarnings,
    expiringTrials,
    expiringGracePeriods
  };
}

// =============================================================================
// MÉTRICAS DE MERCHANTS
// =============================================================================

export async function getMerchantMetrics(merchantId: string): Promise<MerchantMetrics | null> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: { plan: true }
  });

  if (!merchant) return null;

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [messagesToday, messagesThisMonth] = await Promise.all([
    prisma.interactionLog.count({
      where: { merchantId: merchant.id, createdAt: { gte: startOfDay } }
    }),
    prisma.interactionLog.count({
      where: { merchantId: merchant.id, createdAt: { gte: startOfMonth } }
    })
  ]);

  const tokensLimit = merchant.plan?.tokenLimit || merchant.tokenQuota;
  const percentUsed = (merchant.tokenUsage / tokensLimit) * 100;

  return {
    id: merchant.id,
    name: merchant.name,
    email: merchant.email,
    status: merchant.status,
    tokensUsed: merchant.tokenUsage,
    tokensLimit,
    percentUsed,
    messagesToday,
    messagesThisMonth,
    planName: merchant.plan?.name || 'Sem plano',
    planPrice: merchant.plan?.price || 0,
    createdAt: merchant.createdAt,
    trialEndsAt: merchant.trialEndsAt || undefined,
    gracePeriodEndsAt: merchant.gracePeriodEndsAt || undefined
  };
}

export async function getTopMerchants(limit: number = 10): Promise<MerchantMetrics[]> {
  const merchants = await prisma.merchant.findMany({
    where: { status: { in: ['active', 'trial', 'grace_period'] } },
    include: { plan: true },
    orderBy: { tokenUsage: 'desc' },
    take: limit
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const metrics: MerchantMetrics[] = [];

  for (const m of merchants) {
    const messagesThisMonth = await prisma.interactionLog.count({
      where: { merchantId: m.id, createdAt: { gte: startOfMonth } }
    });

    const tokensLimit = m.plan?.tokenLimit || m.tokenQuota;

    metrics.push({
      id: m.id,
      name: m.name,
      email: m.email,
      status: m.status,
      tokensUsed: m.tokenUsage,
      tokensLimit,
      percentUsed: (m.tokenUsage / tokensLimit) * 100,
      messagesToday: 0,
      messagesThisMonth,
      planName: m.plan?.name || 'Sem plano',
      planPrice: m.plan?.price || 0,
      createdAt: m.createdAt,
      trialEndsAt: m.trialEndsAt || undefined,
      gracePeriodEndsAt: m.gracePeriodEndsAt || undefined
    });
  }

  return metrics;
}

// =============================================================================
// MÉTRICAS DE CHAVES
// =============================================================================

export async function getKeyMetrics(): Promise<KeyMetrics[]> {
  const keys = await prisma.aiKey.findMany({
    orderBy: [{ priority: 'desc' }, { lastUsed: 'desc' }]
  });

  return keys.map(k => {
    const tierLimits: Record<string, number> = {
      'BASIC': 1000000,
      'PREMIUM': 5000000,
      'ENTERPRISE': 50000000
    };

    const tokensLimit = tierLimits[k.tier] || 1000000;

    return {
      id: k.id,
      provider: k.provider as AIProvider,
      tier: k.tier,
      status: k.status,
      tokensUsed: k.totalTokens,
      tokensLimit,
      percentUsed: (k.totalTokens / tokensLimit) * 100,
      requestsToday: k.requestsUsed,
      totalRequests: k.totalRequests,
      errorCount: k.errorCount,
      lastError: k.lastError || undefined,
      lastUsed: k.lastUsed,
      priority: k.priority,
      weight: k.weight
    };
  });
}

// =============================================================================
// ALERTAS
// =============================================================================

export interface Alert {
  id: string;
  type: 'quota_warning' | 'quota_exceeded' | 'trial_expiring' | 'grace_expiring' | 'key_error' | 'payment_failed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  merchantId?: string;
  merchantName?: string;
  keyId?: string;
  createdAt: Date;
}

export async function getActiveAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const now = new Date();

  // Quota warnings (90%+)
  const merchantsNearLimit = await prisma.merchant.findMany({
    where: { status: { in: ['active', 'trial'] } },
    include: { plan: true }
  });

  for (const m of merchantsNearLimit) {
    const limit = m.plan?.tokenLimit || m.tokenQuota;
    const percentUsed = (m.tokenUsage / limit) * 100;

    if (percentUsed >= 100) {
      alerts.push({
        id: `quota_exceeded_${m.id}`,
        type: 'quota_exceeded',
        severity: 'high',
        message: `Merchant ${m.name} excedeu a cota de tokens (${percentUsed.toFixed(1)}%)`,
        merchantId: m.id,
        merchantName: m.name,
        createdAt: now
      });
    } else if (percentUsed >= 90) {
      alerts.push({
        id: `quota_warning_${m.id}`,
        type: 'quota_warning',
        severity: 'medium',
        message: `Merchant ${m.name} próximo do limite (${percentUsed.toFixed(1)}%)`,
        merchantId: m.id,
        merchantName: m.name,
        createdAt: now
      });
    }
  }

  // Trials expirando em 3 dias
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const expiringTrials = await prisma.merchant.findMany({
    where: {
      status: 'trial',
      trialEndsAt: { gt: now, lt: threeDaysFromNow }
    }
  });

  for (const m of expiringTrials) {
    const daysRemaining = Math.ceil(((m.trialEndsAt?.getTime() || 0) - now.getTime()) / (1000 * 60 * 60 * 24));
    alerts.push({
      id: `trial_expiring_${m.id}`,
      type: 'trial_expiring',
      severity: 'medium',
      message: `Trial de ${m.name} expira em ${daysRemaining} dia(s)`,
      merchantId: m.id,
      merchantName: m.name,
      createdAt: now
    });
  }

  // Grace periods expirando em 2 dias
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const expiringGrace = await prisma.merchant.findMany({
    where: {
      status: 'grace_period',
      gracePeriodEndsAt: { gt: now, lt: twoDaysFromNow }
    }
  });

  for (const m of expiringGrace) {
    const daysRemaining = Math.ceil(((m.gracePeriodEndsAt?.getTime() || 0) - now.getTime()) / (1000 * 60 * 60 * 24));
    alerts.push({
      id: `grace_expiring_${m.id}`,
      type: 'grace_expiring',
      severity: 'high',
      message: `Grace period de ${m.name} expira em ${daysRemaining} dia(s)`,
      merchantId: m.id,
      merchantName: m.name,
      createdAt: now
    });
  }

  // Chaves com erros
  const keysWithErrors = await prisma.aiKey.findMany({
    where: { errorCount: { gte: 2 } }
  });

  for (const k of keysWithErrors) {
    alerts.push({
      id: `key_error_${k.id}`,
      type: 'key_error',
      severity: k.errorCount >= 5 ? 'critical' : 'high',
      message: `Chave ${k.id.slice(0, 8)}... (${k.provider}) com ${k.errorCount} erros`,
      keyId: k.id,
      createdAt: now
    });
  }

  // Ordenar por severidade
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return alerts;
}

// =============================================================================
// EXPORTAÇÃO
// =============================================================================

export const MetricsService = {
  getSystemMetrics,
  getMerchantMetrics,
  getTopMerchants,
  getKeyMetrics,
  getActiveAlerts
};

export default MetricsService;
