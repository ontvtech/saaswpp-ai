/**
 * MIDDLEWARE DE VALIDAÇÃO DE FEATURES - SaaSWPP AI
 * 
 * Valida se o merchant tem acesso a uma feature específica
 * Usa o sistema hierárquico de módulos
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  FeatureKey, 
  AIModule, 
  FEATURES, 
  FEATURE_TO_MODULE,
  FEATURES_BY_MODULE 
} from '../config/features';

const prisma = new PrismaClient();

// Hierarquia de módulos (maior = mais features)
const MODULE_HIERARCHY: AIModule[] = ['ESSENTIAL', 'SALES_PRO', 'PREDICTIVE', 'ELITE', 'NINJA'];

declare global {
  namespace Express {
    interface Request {
      featureAccess?: {
        feature: FeatureKey;
        module: AIModule;
        merchantModules: AIModule[];
      };
    }
  }
}

/**
 * Middleware que valida se o merchant tem acesso a uma feature específica
 */
export function requireFeature(feature: FeatureKey) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const merchantId = req.user?.merchantId || 
                         req.user?.id || 
                         req.headers['x-merchant-id'];
      
      if (!merchantId) {
        return res.status(401).json({ 
          error: 'Merchant não identificado',
          requiredFeature: feature 
        });
      }

      const access = await validateFeatureAccess(merchantId, feature);
      
      if (!access.allowed) {
        return res.status(403).json({ 
          error: access.reason,
          requiredFeature: feature,
          requiredModule: access.requiredModule,
          currentModules: access.currentModules,
          upgradeUrl: '/my-plan'
        });
      }

      // Adiciona informações ao request
      req.featureAccess = {
        feature,
        module: access.requiredModule!,
        merchantModules: access.currentModules
      };

      next();
    } catch (error) {
      console.error('[FEATURE_VALIDATION] Erro:', error);
      return res.status(500).json({ error: 'Erro interno de validação' });
    }
  };
}

/**
 * Valida acesso a feature considerando toda a hierarquia
 */
export async function validateFeatureAccess(
  merchantId: string, 
  feature: FeatureKey
): Promise<{
  allowed: boolean;
  reason?: string;
  requiredModule?: AIModule;
  currentModules?: AIModule[];
}> {
  // 1. Buscar merchant com relações
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

  // 2. Verificar status do merchant
  if (merchant.status === 'suspended') {
    return { allowed: false, reason: 'Conta suspensa. Regularize sua situação.' };
  }

  if (merchant.status === 'trial' && merchant.trialEndsAt && new Date() > merchant.trialEndsAt) {
    return { allowed: false, reason: 'Período de trial expirado' };
  }

  if (merchant.status === 'grace_period' && merchant.gracePeriodEndsAt && new Date() > merchant.gracePeriodEndsAt) {
    return { allowed: false, reason: 'Período de carência expirado' };
  }

  // 3. Verificar status do reseller
  if (merchant.reseller && merchant.reseller.status === 'suspended') {
    return { allowed: false, reason: 'Revendedor suspenso. Contate seu provedor.' };
  }

  // 4. Obter módulos do plano
  const planModulesMap = (merchant.plan?.modules as Record<AIModule, boolean>) || {
    ESSENTIAL: true,
    SALES_PRO: false,
    PREDICTIVE: false,
    ELITE: false,
    NINJA: false
  };

  // Converter para array de módulos ativos no plano
  const planModules: AIModule[] = MODULE_HIERARCHY.filter(m => planModulesMap[m] === true);

  // 5. Obter módulos permitidos pelo reseller
  const resellerAllowedModules = (merchant.reseller?.allowedModules as AIModule[]) || MODULE_HIERARCHY;

  // 6. Obter módulos ativos do merchant
  const merchantActiveModules = (merchant.activeModules as AIModule[]) || ['ESSENTIAL'];

  // 7. Calcular módulos efetivos (interseção)
  const effectiveModules = planModules.filter(
    m => resellerAllowedModules.includes(m) && merchantActiveModules.includes(m)
  );

  // 8. Verificar se a feature existe
  const featureConfig = FEATURES[feature];
  if (!featureConfig) {
    return { allowed: false, reason: `Feature '${feature}' não encontrada` };
  }

  const requiredModule = featureConfig.module;
  const requiredIndex = MODULE_HIERARCHY.indexOf(requiredModule);

  // 9. Verificar acesso hierárquico
  // Se tem um módulo superior, automaticamente tem acesso às features dos inferiores
  const hasAccess = effectiveModules.some(m => {
    const moduleIndex = MODULE_HIERARCHY.indexOf(m);
    return moduleIndex >= requiredIndex;
  });

  if (!hasAccess) {
    // Verificar em qual nível está o bloqueio
    const highestModule = effectiveModules.length > 0 
      ? effectiveModules.reduce((a, b) => 
          MODULE_HIERARCHY.indexOf(a) > MODULE_HIERARCHY.indexOf(b) ? a : b
        )
      : null;

    if (!planModules.includes(requiredModule) && planModules.length > 0) {
      return { 
        allowed: false, 
        reason: `Feature '${featureConfig.name}' requer o módulo ${requiredModule}. Faça upgrade do seu plano.`,
        requiredModule,
        currentModules: effectiveModules
      };
    }

    if (!resellerAllowedModules.includes(requiredModule)) {
      return { 
        allowed: false, 
        reason: `Feature '${featureConfig.name}' não está disponível através do seu revendedor.`,
        requiredModule,
        currentModules: effectiveModules
      };
    }

    if (!merchantActiveModules.includes(requiredModule)) {
      return { 
        allowed: false, 
        reason: `Feature '${featureConfig.name}' não está ativa. Ative em Configurações.`,
        requiredModule,
        currentModules: effectiveModules
      };
    }

    return { 
      allowed: false, 
      reason: `Feature '${featureConfig.name}' requer o módulo ${requiredModule}.`,
      requiredModule,
      currentModules: effectiveModules
    };
  }

  return { 
    allowed: true,
    requiredModule,
    currentModules: effectiveModules
  };
}

/**
 * Retorna todas as features disponíveis para um merchant
 */
export async function getAvailableFeatures(merchantId: string): Promise<FeatureKey[]> {
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: { plan: true, reseller: true }
  });

  if (!merchant) return [];

  // Verificar status
  if (merchant.status === 'suspended') return [];
  if (merchant.status === 'trial' && merchant.trialEndsAt && new Date() > merchant.trialEndsAt) return [];
  if (merchant.reseller?.status === 'suspended') return [];

  // Módulos do plano
  const planModulesMap = (merchant.plan?.modules as Record<AIModule, boolean>) || {
    ESSENTIAL: true, SALES_PRO: false, PREDICTIVE: false, ELITE: false, NINJA: false
  };
  const planModules = MODULE_HIERARCHY.filter(m => planModulesMap[m] === true);

  // Módulos do reseller
  const resellerModules = (merchant.reseller?.allowedModules as AIModule[]) || MODULE_HIERARCHY;

  // Módulos ativos
  const activeModules = (merchant.activeModules as AIModule[]) || ['ESSENTIAL'];

  // Interseção
  const effectiveModules = planModules.filter(
    m => resellerModules.includes(m) && activeModules.includes(m)
  );

  // Coletar todas as features
  const availableFeatures: FeatureKey[] = [];
  for (const module of effectiveModules) {
    const moduleIndex = MODULE_HIERARCHY.indexOf(module);
    // Adicionar features deste módulo e dos inferiores
    for (let i = 0; i <= moduleIndex; i++) {
      availableFeatures.push(...(FEATURES_BY_MODULE[MODULE_HIERARCHY[i]] || []));
    }
  }

  return [...new Set(availableFeatures)];
}

/**
 * Verifica se uma feature está disponível (sem lançar erro)
 */
export async function isFeatureAvailable(merchantId: string, feature: FeatureKey): Promise<boolean> {
  const access = await validateFeatureAccess(merchantId, feature);
  return access.allowed;
}

export default {
  requireFeature,
  validateFeatureAccess,
  getAvailableFeatures,
  isFeatureAvailable
};
