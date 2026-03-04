/**
 * VALIDAÇÃO DE PERMISSÕES E LIMITES - SaaSWPP AI
 */

import { PrismaClient } from '@prisma/client';
import type { AIModule, PlanModules } from '../types';

const prisma = new PrismaClient();

// =============================================================================
// VERIFICAÇÃO DE MÓDULOS
// =============================================================================

/**
 * Verifica se merchant tem acesso a um módulo
 */
export async function hasModuleAccess(
  merchantId: string,
  module: AIModule
): Promise<{ allowed: boolean; reason?: string }> {
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

  // Módulos ativos do merchant
  const activeModules = (merchant.activeModules as AIModule[]) || [];

  // Módulos permitidos pelo plano
  const planModules = (merchant.plan?.modules as PlanModules) || {};

  // Módulos permitidos pelo revendedor
  const resellerModules = (merchant.reseller?.allowedModules as AIModule[]) || [];

  // Verificações
  const isActive = activeModules.includes(module);
  const isPlanAllowed = planModules[module] === true;
  const isResellerAllowed = resellerModules.length === 0 || resellerModules.includes(module);

  if (!isActive) {
    return { allowed: false, reason: 'Módulo não está ativo para este merchant' };
  }
  if (!isPlanAllowed) {
    return { allowed: false, reason: 'Módulo não incluído no plano atual' };
  }
  if (!isResellerAllowed) {
    return { allowed: false, reason: 'Revendedor não tem permissão para este módulo' };
  }

  return { allowed: true };
}

/**
 * Retorna todos os módulos válidos para um merchant
 */
export async function getValidModules(
  merchantId: string
): Promise<AIModule[]> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: {
      plan: true,
      reseller: true
    }
  });

  if (!merchant) return [];

  const activeModules = (merchant.activeModules as AIModule[]) || [];
  const planModules = (merchant.plan?.modules as PlanModules) || {};
  const resellerModules = (merchant.reseller?.allowedModules as AIModule[]) || [];

  return activeModules.filter(m => {
    const planOk = planModules[m] === true;
    const resellerOk = resellerModules.length === 0 || resellerModules.includes(m);
    return planOk && resellerOk;
  });
}

// =============================================================================
// VERIFICAÇÃO DE LIMITES
// =============================================================================

/**
 * Verifica limite de tenants do revendedor
 */
export async function checkTenantLimit(
  resellerId: string
): Promise<{ canCreate: boolean; current: number; max: number }> {
  const reseller = await prisma.reseller.findUnique({
    where: { id: resellerId },
    include: {
      _count: {
        select: { merchants: true }
      }
    }
  });

  if (!reseller) {
    return { canCreate: false, current: 0, max: 0 };
  }

  const current = reseller._count.merchants;
  const max = reseller.maxTenants;

  return {
    canCreate: current < max,
    current,
    max
  };
}

/**
 * Verifica limite de instâncias do merchant
 */
export async function checkInstanceLimit(
  merchantId: string
): Promise<{ canCreate: boolean; current: number; max: number }> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: { plan: true }
  });

  if (!merchant) {
    return { canCreate: false, current: 0, max: 0 };
  }

  // Contar instâncias ativas
  const current = merchant.evolutionInstance ? 1 : 0;
  const max = merchant.plan?.instanceLimit || 1;

  return {
    canCreate: current < max,
    current,
    max
  };
}

/**
 * Verifica limite de tokens do merchant
 */
export async function checkTokenLimit(
  merchantId: string
): Promise<{ hasQuota: boolean; used: number; total: number; percentUsed: number }> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: { plan: true }
  });

  if (!merchant) {
    return { hasQuota: false, used: 0, total: 0, percentUsed: 100 };
  }

  const used = merchant.tokenUsage;
  const total = merchant.plan?.tokenLimit || merchant.tokenQuota;
  const percentUsed = total > 0 ? (used / total) * 100 : 100;

  return {
    hasQuota: used < total,
    used,
    total,
    percentUsed
  };
}

/**
 * Verifica limite de mensagens do merchant
 */
export async function checkMessageLimit(
  merchantId: string
): Promise<{ hasQuota: boolean; used: number; total: number }> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: { plan: true }
  });

  if (!merchant) {
    return { hasQuota: false, used: 0, total: 0 };
  }

  // Contar mensagens do mês atual
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const used = await prisma.interactionLog.count({
    where: {
      merchantId,
      createdAt: { gte: startOfMonth }
    }
  });

  const total = merchant.plan?.maxMessages || 1000;

  return {
    hasQuota: used < total,
    used,
    total
  };
}

// =============================================================================
// VERIFICAÇÃO DE STATUS
// =============================================================================

/**
 * Verifica se merchant pode usar o sistema
 */
export async function canMerchantOperate(
  merchantId: string
): Promise<{ canOperate: boolean; reason?: string; status?: string }> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: { reseller: true, plan: true }
  });

  if (!merchant) {
    return { canOperate: false, reason: 'Merchant não encontrado' };
  }

  // Verificar status do merchant
  if (merchant.status === 'suspended') {
    return { canOperate: false, reason: 'Conta suspensa', status: 'suspended' };
  }

  if (merchant.status === 'pending_verification') {
    return { canOperate: false, reason: 'Aguardando verificação', status: 'pending_verification' };
  }

  // Verificar trial expirado
  if (merchant.status === 'trial' && merchant.trialEndsAt) {
    if (new Date() > merchant.trialEndsAt) {
      // Auto-suspender
      await prisma.merchant.update({
        where: { id: merchantId },
        data: { status: 'suspended' }
      });
      return { canOperate: false, reason: 'Trial expirado', status: 'trial_expired' };
    }
  }

  // Verificar status do reseller (se houver)
  if (merchant.reseller && merchant.reseller.status === 'suspended') {
    return { canOperate: false, reason: 'Revendedor suspenso', status: 'reseller_suspended' };
  }

  // Verificar limite de tokens
  const tokenCheck = await checkTokenLimit(merchantId);
  if (!tokenCheck.hasQuota) {
    return { canOperate: false, reason: 'Limite de tokens excedido', status: 'quota_exceeded' };
  }

  return { canOperate: true };
}

/**
 * Verifica se reseller pode operar
 */
export async function canResellerOperate(
  resellerId: string
): Promise<{ canOperate: boolean; reason?: string }> {
  const reseller = await prisma.reseller.findUnique({
    where: { id: resellerId }
  });

  if (!reseller) {
    return { canOperate: false, reason: 'Revendedor não encontrado' };
  }

  if (reseller.status === 'suspended') {
    return { canOperate: false, reason: 'Conta suspensa' };
  }

  return { canOperate: true };
}

// =============================================================================
// AUDITORIA
// =============================================================================

/**
 * Registra ação de auditoria
 */
export async function auditLog(params: {
  action: string;
  merchantId?: string;
  resellerId?: string;
  adminId?: string;
  details?: string;
  ipAddress?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        merchantId: params.merchantId,
        resellerId: params.resellerId,
        action: params.action,
        details: params.details,
        ipAddress: params.ipAddress
      }
    });
  } catch (error) {
    console.error('[AUDIT] Erro ao registrar log:', error);
  }
}

// =============================================================================
// MAPEAMENTO DE MÓDULOS (Frontend -> Backend)
// =============================================================================

/**
 * Mapeia nomes de módulos do frontend para o backend
 */
export function mapModulesToBackend(frontendModules: {
  attendance?: boolean;
  sales?: boolean;
  predictive?: boolean;
  autoPilot?: boolean;
}): PlanModules {
  return {
    ESSENTIAL: frontendModules.attendance ?? true,
    SALES_PRO: frontendModules.sales ?? false,
    PREDICTIVE: frontendModules.predictive ?? false,
    ELITE: frontendModules.autoPilot ?? false
  };
}

/**
 * Mapeia nomes de módulos do backend para o frontend
 */
export function mapModulesToFrontend(backendModules: PlanModules): {
  attendance: boolean;
  sales: boolean;
  predictive: boolean;
  autoPilot: boolean;
} {
  return {
    attendance: backendModules.ESSENTIAL ?? true,
    sales: backendModules.SALES_PRO ?? false,
    predictive: backendModules.PREDICTIVE ?? false,
    autoPilot: backendModules.ELITE ?? false
  };
}

// =============================================================================
// MIDDLEWARE DE AUTENTICAÇÃO
// =============================================================================

/**
 * Middleware que requer autenticação de admin
 * (Simplificado - em produção usar JWT)
 */
export function requireAdmin(req: any, res: any, next: any) {
  // Em produção, verificar JWT e role
  // Por enquanto, permite tudo em desenvolvimento
  const isAdmin = req.headers['x-admin-key'] === process.env.ADMIN_KEY;
  
  if (process.env.NODE_ENV !== 'production' || isAdmin) {
    return next();
  }
  
  // Verificar se tem usuário logado como admin
  const user = (req as any).user;
  if (user && user.role === 'ADMIN') {
    return next();
  }
  
  return res.status(403).json({ error: 'Acesso negado. Requer privilégios de administrador.' });
}
