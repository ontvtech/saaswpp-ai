/**
 * ROTAS DE AUTO-SETUP E GERENCIAMENTO DE FEATURES - SaaSWPP AI
 * 
 * O "Botão Mágico" que configura tudo automaticamente
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { autoSetupService, featureManagerService } from '../services/autoSetupService';
import { authenticate, requireAdmin, requireReseller } from '../middleware/auth';
import { FEATURES, FEATURES_BY_MODULE, type FeatureKey, type AIModule } from '../config/features';

const prisma = new PrismaClient();
export const autoSetupRoutes = Router();

// =============================================================================
// AUTO SETUP - BOTÃO MÁGICO
// =============================================================================

/**
 * GET /api/auto-setup/groups
 * Lista grupos do WhatsApp disponíveis para estudo
 */
autoSetupRoutes.get('/groups', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Buscar merchant
    const merchant = await prisma.merchant.findFirst({
      where: { id: user.merchantId || user.id }
    });
    
    if (!merchant || !merchant.evolutionInstance) {
      return res.status(400).json({ error: 'Instância WhatsApp não configurada' });
    }
    
    // Carregar grupos
    const groups = await autoSetupService.loadGroups(merchant.evolutionInstance);
    
    // Buscar grupos já estudados
    const studiedGroups = await prisma.studyGroup.findMany({
      where: { merchantId: merchant.id }
    });
    
    // Marcar grupos já estudados
    const groupsWithStatus = groups.map(g => ({
      ...g,
      studied: studiedGroups.some(sg => sg.groupId === g.id),
      studyStatus: studiedGroups.find(sg => sg.groupId === g.id)?.status || null
    }));
    
    res.json(groupsWithStatus);
  } catch (error: any) {
    console.error('[AUTO-SETUP] Erro ao carregar grupos:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auto-setup/run
 * Executa o setup automático completo
 */
autoSetupRoutes.post('/run', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { selectedGroupIds } = req.body;
    
    if (!selectedGroupIds || selectedGroupIds.length === 0) {
      return res.status(400).json({ error: 'Selecione pelo menos um grupo' });
    }
    
    const merchantId = user.merchantId || user.id;
    
    // Executar setup em background
    const progress = await autoSetupService.runAutoSetup(merchantId, selectedGroupIds);
    
    res.json({ 
      success: true, 
      message: 'Setup automático iniciado',
      progress 
    });
  } catch (error: any) {
    console.error('[AUTO-SETUP] Erro ao executar setup:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auto-setup/status
 * Busca status do setup automático
 */
autoSetupRoutes.get('/status', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const merchantId = user.merchantId || user.id;
    
    const status = await autoSetupService.getAutoSetupStatus(merchantId);
    const studyGroups = await autoSetupService.listStudyGroups(merchantId);
    
    res.json({ status, studyGroups });
  } catch (error: any) {
    console.error('[AUTO-SETUP] Erro ao buscar status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auto-setup/study-groups
 * Lista grupos já estudados
 */
autoSetupRoutes.get('/study-groups', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const merchantId = user.merchantId || user.id;
    
    const groups = await autoSetupService.listStudyGroups(merchantId);
    res.json(groups);
  } catch (error: any) {
    console.error('[AUTO-SETUP] Erro ao listar grupos:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auto-setup/study-group/:groupId/sync
 * Re-estuda um grupo específico
 */
autoSetupRoutes.post('/study-group/:groupId/sync', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { groupId } = req.params;
    const merchantId = user.merchantId || user.id;
    
    const merchant = await prisma.merchant.findFirst({
      where: { id: merchantId }
    });
    
    if (!merchant || !merchant.evolutionInstance) {
      return res.status(400).json({ error: 'Instância não configurada' });
    }
    
    // Buscar mensagens
    const messages = await autoSetupService.getGroupMessages(merchant.evolutionInstance, groupId);
    
    // Estudar
    const study = await autoSetupService.studyMessages(messages);
    
    // Atualizar grupo
    const studyGroup = await prisma.studyGroup.update({
      where: {
        merchantId_groupId: { merchantId, groupId }
      },
      data: {
        status: 'completed',
        studiedAt: new Date(),
        messageCount: study.messagesAnalyzed,
        generatedKnowledge: JSON.stringify(study.knowledgeItems),
        confidence: study.confidence
      }
    });
    
    // Adicionar conhecimento à base
    for (const item of study.knowledgeItems) {
      await prisma.knowledgeBase.create({
        data: {
          merchantId,
          title: item.substring(0, 50) + (item.length > 50 ? '...' : ''),
          content: item,
          source: 'auto_sync'
        }
      });
    }
    
    res.json({ success: true, studyGroup, study });
  } catch (error: any) {
    console.error('[AUTO-SETUP] Erro ao sincronizar:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// FEATURE MANAGER - ADMIN
// =============================================================================

/**
 * GET /api/auto-setup/admin/features
 * Lista todas as features disponíveis
 */
autoSetupRoutes.get('/admin/features', requireAdmin, async (req: Request, res: Response) => {
  try {
    const features = featureManagerService.getAllFeatures();
    const byModule = featureManagerService.getFeaturesByModule();
    
    res.json({ features, byModule });
  } catch (error: any) {
    console.error('[FEATURES] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auto-setup/admin/plans/:planId/features
 * Busca configuração de features de um plano
 */
autoSetupRoutes.get('/admin/plans/:planId/features', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    
    const config = await featureManagerService.getPlanFeatures(planId);
    
    res.json(config);
  } catch (error: any) {
    console.error('[FEATURES] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/auto-setup/admin/plans/:planId/features
 * Atualiza todas as features de um plano
 */
autoSetupRoutes.put('/admin/plans/:planId/features', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const { features, modules, limits } = req.body;
    
    const config = await prisma.planFeatureConfig.upsert({
      where: { planId },
      update: {
        features,
        modules,
        ...limits
      },
      create: {
        planId,
        features,
        modules,
        ...limits
      }
    });
    
    res.json({ success: true, config });
  } catch (error: any) {
    console.error('[FEATURES] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/auto-setup/admin/plans/:planId/features/:featureKey
 * Atualiza uma feature específica
 */
autoSetupRoutes.patch('/admin/plans/:planId/features/:featureKey', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { planId, featureKey } = req.params;
    const { enabled } = req.body;
    
    const config = await featureManagerService.updatePlanFeature(
      planId, 
      featureKey as FeatureKey, 
      enabled
    );
    
    res.json({ success: true, config });
  } catch (error: any) {
    console.error('[FEATURES] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/auto-setup/admin/plans/:planId/modules/:module
 * Atualiza um módulo específico
 */
autoSetupRoutes.patch('/admin/plans/:planId/modules/:module', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { planId, module } = req.params;
    const { enabled } = req.body;
    
    const config = await featureManagerService.updatePlanModule(
      planId,
      module as AIModule,
      enabled
    );
    
    res.json({ success: true, config });
  } catch (error: any) {
    console.error('[FEATURES] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auto-setup/admin/plans
 * Lista todos os planos com suas configurações
 */
autoSetupRoutes.get('/admin/plans', requireAdmin, async (req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: { price: 'asc' }
    });
    
    const plansWithConfig = await Promise.all(
      plans.map(async (plan) => {
        const config = await featureManagerService.getPlanFeatures(plan.id);
        return { ...plan, featureConfig: config };
      })
    );
    
    res.json(plansWithConfig);
  } catch (error: any) {
    console.error('[FEATURES] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auto-setup/admin/plans
 * Cria um novo plano
 */
autoSetupRoutes.post('/admin/plans', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, description, price, type, modules, features, limits } = req.body;
    
    // Criar plano
    const plan = await prisma.plan.create({
      data: {
        name,
        description,
        price,
        type: type || 'MERCHANT',
        modules
      }
    });
    
    // Criar configuração de features
    await prisma.planFeatureConfig.create({
      data: {
        planId: plan.id,
        features,
        modules,
        ...limits
      }
    });
    
    res.json({ success: true, plan });
  } catch (error: any) {
    console.error('[FEATURES] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// VERIFICAÇÃO DE ACESSO A FEATURES
// =============================================================================

/**
 * GET /api/auto-setup/my-features
 * Lista features disponíveis para o usuário logado
 */
autoSetupRoutes.get('/my-features', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const merchantId = user.merchantId || user.id;
    
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: { plan: true }
    });
    
    if (!merchant || !merchant.plan) {
      return res.json({ features: {}, modules: {} });
    }
    
    const config = await featureManagerService.getPlanFeatures(merchant.plan.id);
    
    // Verificar restrições do revendedor
    if (merchant.resellerId) {
      const reseller = await prisma.reseller.findUnique({
        where: { id: merchant.resellerId }
      });
      
      if (reseller?.allowedModules) {
        const allowedModules = reseller.allowedModules as string[];
        const modules = config?.modules as Record<string, boolean> || {};
        
        // Desabilitar módulos não permitidos pelo revendedor
        Object.keys(modules).forEach(m => {
          if (!allowedModules.includes(m)) {
            modules[m] = false;
          }
        });
      }
    }
    
    res.json({
      plan: merchant.plan,
      features: config?.features || {},
      modules: config?.modules || {},
      limits: {
        maxMessages: config?.maxMessages,
        maxTokens: config?.maxTokens,
        maxInstances: config?.maxInstances,
        maxStudyGroups: config?.maxStudyGroups
      }
    });
  } catch (error: any) {
    console.error('[FEATURES] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auto-setup/check/:featureKey
 * Verifica se o usuário tem acesso a uma feature
 */
autoSetupRoutes.get('/check/:featureKey', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { featureKey } = req.params;
    const merchantId = user.merchantId || user.id;
    
    const hasAccess = await featureManagerService.hasFeatureAccess(merchantId, featureKey as FeatureKey);
    
    res.json({ featureKey, hasAccess });
  } catch (error: any) {
    console.error('[FEATURES] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

export default autoSetupRoutes;
