/**
 * VALIDAÇÃO DE MÓDULOS - Middleware para hierarquia de permissões
 * 
 * Regras:
 * 1. Admin tem acesso total
 * 2. Reseller pode acessar apenas módulos em allowedModules
 * 3. Merchant pode acessar apenas módulos em activeModules E que estejam no plano
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import type { AIModule, PlanModules } from '../types';

const prisma = new PrismaClient();

// Módulos disponíveis no sistema
const AVAILABLE_MODULES: AIModule[] = ['ESSENTIAL', 'SALES_PRO', 'PREDICTIVE', 'ELITE'];

/**
 * Middleware que valida se o merchant tem acesso a um módulo específico
 */
export function requireModule(module: AIModule) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const merchantId = req.user?.merchantId || req.headers['x-merchant-id'];
      
      if (!merchantId) {
        return res.status(401).json({ 
          error: 'Merchant não identificado',
          requiredModule: module 
        });
      }

      const hasAccess = await validateModuleAccess(merchantId, module);
      
      if (!hasAccess.allowed) {
        return res.status(403).json({ 
          error: hasAccess.reason,
          requiredModule: module,
          upgradeUrl: '/my-plan'
        });
      }

      // Adiciona informações ao request para uso posterior
      req.moduleAccess = {
        module,
        planModules: hasAccess.planModules,
        resellerModules: hasAccess.resellerModules
      };

      next();
    } catch (error) {
      console.error('[MODULE_VALIDATION] Erro:', error);
      return res.status(500).json({ error: 'Erro interno de validação' });
    }
  };
}

/**
 * Valida acesso a módulo considerando toda a hierarquia
 */
export async function validateModuleAccess(
  merchantId: string, 
  module: AIModule
): Promise<{
  allowed: boolean;
  reason?: string;
  planModules?: PlanModules;
  resellerModules?: AIModule[];
}> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: {
      plan: true,
      reseller: true
    }
  });

  if (!merchant) {
    return { allowed: false, reason: 'Merchant não encontrado' };
  }

  // 1. Verificar status do merchant
  if (merchant.status === 'suspended') {
    return { allowed: false, reason: 'Conta suspensa. Regularize sua situação.' };
  }

  if (merchant.status === 'trial' && merchant.trialEndsAt && new Date() > merchant.trialEndsAt) {
    return { allowed: false, reason: 'Período de trial expirado' };
  }

  // 2. Verificar status do reseller (se existir)
  if (merchant.reseller && merchant.reseller.status === 'suspended') {
    return { allowed: false, reason: 'Revendedor suspenso. Contate seu provedor.' };
  }

  // 3. Obter módulos do plano
  const planModules = (merchant.plan?.modules as PlanModules) || {
    ESSENTIAL: true,
    SALES_PRO: false,
    PREDICTIVE: false,
    ELITE: false
  };

  // 4. Obter módulos permitidos pelo reseller
  const resellerModules = (merchant.reseller?.allowedModules as AIModule[]) || AVAILABLE_MODULES;

  // 5. Obter módulos ativos do merchant
  const activeModules = (merchant.activeModules as AIModule[]) || ['ESSENTIAL'];

  // 6. Validação em cadeia:
  
  // O módulo está no plano?
  if (!planModules[module]) {
    return { 
      allowed: false, 
      reason: `Módulo ${module} não está incluído no seu plano. Faça upgrade.`,
      planModules
    };
  }

  // O reseller permite este módulo?
  if (resellerModules.length > 0 && !resellerModules.includes(module)) {
    return { 
      allowed: false, 
      reason: `Módulo ${module} não está disponível através do seu revendedor.`,
      planModules,
      resellerModules
    };
  }

  // O merchant tem este módulo ativo?
  if (!activeModules.includes(module)) {
    return { 
      allowed: false, 
      reason: `Módulo ${module} não está ativo. Ative em Configurações.`,
      planModules,
      resellerModules
    };
  }

  return { 
    allowed: true,
    planModules,
    resellerModules
  };
}

/**
 * Verifica limite de instâncias do merchant
 */
export async function checkInstanceLimit(merchantId: string): Promise<{
  canCreate: boolean;
  current: number;
  max: number;
  reason?: string;
}> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: { plan: true }
  });

  if (!merchant) {
    return { canCreate: false, current: 0, max: 0, reason: 'Merchant não encontrado' };
  }

  // Contar instâncias ativas
  const activeInstances = merchant.evolutionInstance ? 1 : 0;
  const maxInstances = merchant.plan?.instanceLimit || 1;

  return {
    canCreate: activeInstances < maxInstances,
    current: activeInstances,
    max: maxInstances,
    reason: activeInstances >= maxInstances 
      ? `Limite de ${maxInstances} instância(s) atingido` 
      : undefined
  };
}

/**
 * Verifica limite de tokens do merchant
 */
export async function checkTokenLimit(merchantId: string): Promise<{
  hasQuota: boolean;
  used: number;
  total: number;
  percentUsed: number;
  reason?: string;
}> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: { plan: true }
  });

  if (!merchant) {
    return { hasQuota: false, used: 0, total: 0, percentUsed: 0, reason: 'Merchant não encontrado' };
  }

  const used = merchant.tokenUsage;
  const total = merchant.plan?.tokenLimit || merchant.tokenQuota;
  const percentUsed = (used / total) * 100;

  return {
    hasQuota: used < total,
    used,
    total,
    percentUsed,
    reason: used >= total 
      ? 'Cota mensal de tokens excedida. Faça upgrade ou aguarde o próximo mês.'
      : percentUsed > 90 
        ? 'Cota de tokens quase excedida (90%+). Considere fazer upgrade.'
        : undefined
  };
}

/**
 * Verifica limite de tenants do reseller
 */
export async function checkTenantLimit(resellerId: string): Promise<{
  canCreate: boolean;
  current: number;
  max: number;
  reason?: string;
}> {
  const reseller = await prisma.reseller.findUnique({
    where: { id: resellerId },
    include: {
      _count: {
        select: { merchants: true }
      }
    }
  });

  if (!reseller) {
    return { canCreate: false, current: 0, max: 0, reason: 'Revendedor não encontrado' };
  }

  if (reseller.status === 'suspended') {
    return { canCreate: false, current: 0, max: 0, reason: 'Revendedor suspenso' };
  }

  const current = reseller._count.merchants;
  const max = reseller.maxTenants;

  return {
    canCreate: current < max,
    current,
    max,
    reason: current >= max 
      ? `Limite de ${max} lojista(s) atingido. Faça upgrade do seu plano.`
      : undefined
  };
}

/**
 * Middleware para verificar limite de rate por tenant
 */
export function tenantRateLimit(maxRequestsPerMinute: number = 60) {
  const requestCounts = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const merchantId = req.user?.merchantId;
    if (!merchantId) return next();

    const now = Date.now();
    const record = requestCounts.get(merchantId);

    if (!record || now > record.resetAt) {
      requestCounts.set(merchantId, { count: 1, resetAt: now + 60000 });
      return next();
    }

    if (record.count >= maxRequestsPerMinute) {
      return res.status(429).json({
        error: 'Limite de requisições excedido. Tente novamente em alguns segundos.',
        retryAfter: Math.ceil((record.resetAt - now) / 1000)
      });
    }

    record.count++;
    next();
  };
}

/**
 * Obtém todos os módulos válidos para um merchant
 * Considera: Plano + Revendedor + Status
 */
export async function getValidModulesForMerchant(merchantId: string): Promise<AIModule[]> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: {
      plan: true,
      reseller: true
    }
  });

  if (!merchant) return [];

  // Verificar status
  if (merchant.status === 'suspended') return [];
  if (merchant.status === 'trial' && merchant.trialEndsAt && new Date() > merchant.trialEndsAt) return [];
  if (merchant.reseller?.status === 'suspended') return [];

  // Módulos do plano
  const planModules = (merchant.plan?.modules as PlanModules) || {
    ESSENTIAL: true,
    SALES_PRO: false,
    PREDICTIVE: false,
    ELITE: false
  };

  // Módulos permitidos pelo reseller
  const resellerModules = (merchant.reseller?.allowedModules as AIModule[]) || AVAILABLE_MODULES;

  // Interseção: Plano ∩ Reseller
  const validModules: AIModule[] = [];

  for (const module of AVAILABLE_MODULES) {
    const inPlan = planModules[module] === true;
    const inReseller = resellerModules.includes(module);

    if (inPlan && inReseller) {
      validModules.push(module);
    }
  }

  return validModules;
}

/**
 * Verifica se o merchant pode usar um recurso específico
 */
export async function canUseFeature(
  merchantId: string, 
  feature: 'scheduling' | 'sales' | 'predictive' | 'autopilot' | 'catalog'
): Promise<{ allowed: boolean; reason?: string }> {
  const validModules = await getValidModulesForMerchant(merchantId);

  const featureModuleMap: Record<string, AIModule> = {
    'scheduling': 'ESSENTIAL',
    'sales': 'SALES_PRO',
    'predictive': 'PREDICTIVE',
    'autopilot': 'ELITE',
    'catalog': 'SALES_PRO'
  };

  const requiredModule = featureModuleMap[feature];
  if (!requiredModule) {
    return { allowed: false, reason: 'Feature não mapeada' };
  }

  const hasModule = validModules.includes(requiredModule);
  
  if (!hasModule) {
    return { 
      allowed: false, 
      reason: `Feature '${feature}' requer o módulo ${requiredModule}. Faça upgrade do seu plano.` 
    };
  }

  return { allowed: true };
}

/**
 * Verifica quota de mensagens do merchant
 */
export async function checkMessageQuota(merchantId: string): Promise<{
  hasQuota: boolean;
  used: number;
  total: number;
  percentUsed: number;
  warning?: string;
}> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: { plan: true }
  });

  if (!merchant) {
    return { hasQuota: false, used: 0, total: 0, percentUsed: 0, warning: 'Merchant não encontrado' };
  }

  const total = merchant.plan?.maxMessages || 1000;
  
  // Calcular mensagens usadas este mês
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usedThisMonth = await prisma.interactionLog.count({
    where: {
      merchantId: merchant.id,
      createdAt: { gte: startOfMonth }
    }
  });

  const percentUsed = (usedThisMonth / total) * 100;

  let warning: string | undefined;
  if (percentUsed >= 100) {
    warning = 'Cota mensal excedida. Faça upgrade ou aguarde o próximo mês.';
  } else if (percentUsed >= 90) {
    warning = 'Cota de mensagens quase excedida (90%+).';
  } else if (percentUsed >= 75) {
    warning = 'Atenção: 75% da cota mensal utilizada.';
  }

  return {
    hasQuota: usedThisMonth < total,
    used: usedThisMonth,
    total,
    percentUsed,
    warning
  };
}

/**
 * Validação completa antes de processar mensagem
 */
export async function validateMerchantForProcessing(merchantId: string): Promise<{
  valid: boolean;
  reason?: string;
  merchant?: any;
  modules?: AIModule[];
  quota?: { hasQuota: boolean; percentUsed: number };
}> {
  // 1. Buscar merchant
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: { plan: true, reseller: true }
  });

  if (!merchant) {
    return { valid: false, reason: 'Merchant não encontrado' };
  }

  // 2. Verificar status
  if (merchant.status === 'suspended') {
    return { valid: false, reason: 'Conta suspensa. Regularize sua situação.' };
  }

  if (merchant.status === 'trial' && merchant.trialEndsAt && new Date() > merchant.trialEndsAt) {
    return { valid: false, reason: 'Período de trial expirado.' };
  }

  if (merchant.gracePeriodEndsAt && new Date() > merchant.gracePeriodEndsAt) {
    return { valid: false, reason: 'Período de carência expirado.' };
  }

  // 3. Verificar reseller
  if (merchant.reseller?.status === 'suspended') {
    return { valid: false, reason: 'Revendedor suspenso. Contate seu provedor.' };
  }

  // 4. Obter módulos válidos
  const modules = await getValidModulesForMerchant(merchantId);
  if (modules.length === 0) {
    return { valid: false, reason: 'Nenhum módulo ativo disponível.' };
  }

  // 5. Verificar quota de tokens
  const tokenQuota = merchant.plan?.tokenLimit || merchant.tokenQuota;
  if (merchant.tokenUsage >= tokenQuota) {
    return { 
      valid: false, 
      reason: 'Cota de tokens excedida. Faça upgrade ou aguarde o próximo mês.' 
    };
  }

  // 6. Verificar quota de mensagens
  const messageQuota = await checkMessageQuota(merchantId);
  const quota = {
    hasQuota: messageQuota.hasQuota,
    percentUsed: messageQuota.percentUsed
  };

  if (!quota.hasQuota) {
    return { 
      valid: false, 
      reason: 'Cota de mensagens excedida.',
      quota
    };
  }

  return {
    valid: true,
    merchant,
    modules,
    quota
  };
}

export default {
  requireModule,
  validateModuleAccess,
  checkInstanceLimit,
  checkTokenLimit,
  checkTenantLimit,
  tenantRateLimit,
  getValidModulesForMerchant,
  canUseFeature,
  checkMessageQuota,
  validateMerchantForProcessing,
  AVAILABLE_MODULES
};
