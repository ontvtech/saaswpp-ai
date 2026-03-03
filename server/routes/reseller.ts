/**
 * ROTAS DE RESELLER - SaaSWPP AI
 * Com verificação de limite de tenants e validação de módulos
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { requireAuth } from './auth';
import { checkTenantLimit, canResellerOperate, auditLog } from '../utils/permissions';
import { 
  createTenantSchema, 
  updateMerchantSchema,
  validateOrThrow 
} from '../utils/validators';
import { 
  validateResellerModuleGrant,
  getValidModulesForMerchant 
} from '../middleware/validateModule';
import { generateSecurePassword, generateVerificationCode } from '../utils/security';
import type { AIModule } from '../../src/types';

const prisma = new PrismaClient();
export const resellerRoutes = Router();

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Todas as rotas exigem autenticação de Reseller ou Admin
resellerRoutes.use(requireAuth(['RESELLER', 'ADMIN']));

// =============================================================================
// ROTAS DE STATISTICS
// =============================================================================

/**
 * GET /stats
 * Estatísticas do reseller
 */
resellerRoutes.get('/stats', async (req: any, res: Response) => {
  try {
    const resellerId = req.user.role === 'RESELLER' ? req.user.id : req.query.resellerId;

    if (!resellerId) {
      return res.status(400).json({ error: 'resellerId é obrigatório para admin' });
    }

    const reseller = await prisma.reseller.findUnique({
      where: { id: resellerId },
      include: {
        _count: {
          select: { merchants: true }
        }
      }
    });

    if (!reseller) {
      return res.status(404).json({ error: 'Revendedor não encontrado' });
    }

    // Contar merchants ativos
    const activeMerchants = await prisma.merchant.count({
      where: {
        resellerId,
        status: { in: ['active', 'trial'] }
      }
    });

    // Total de tokens usados pelos tenants
    const tokenUsage = await prisma.merchant.aggregate({
      where: { resellerId },
      _sum: { tokenUsage: true }
    });

    res.json({
      activeTenants: activeMerchants,
      totalTenants: reseller._count.merchants,
      maxTenants: reseller.maxTenants,
      monthlyRevenue: activeMerchants * 100, // Placeholder
      aiUsage: tokenUsage._sum.tokenUsage || 0,
      status: reseller.status,
      canCreateTenant: reseller._count.merchants < reseller.maxTenants
    });

  } catch (error: any) {
    console.error('[RESELLER] Erro ao buscar stats:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// =============================================================================
// ROTAS DE TENANTS
// =============================================================================

/**
 * GET /tenants
 * Lista todos os tenants do reseller
 */
resellerRoutes.get('/tenants', async (req: any, res: Response) => {
  try {
    const where: any = {};
    
    if (req.user.role === 'RESELLER') {
      where.resellerId = req.user.id;
    } else if (req.query.resellerId) {
      where.resellerId = req.query.resellerId;
    }

    const tenants = await prisma.merchant.findMany({
      where,
      include: {
        plan: true,
        knowledgeBase: {
          take: 1,
          select: { id: true }
        },
        _count: {
          select: { interactionLogs: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tenants);

  } catch (error: any) {
    console.error('[RESELLER] Erro ao buscar tenants:', error);
    res.status(500).json({ error: 'Erro ao buscar tenants' });
  }
});

/**
 * POST /tenants
 * Cria um novo tenant
 */
resellerRoutes.post('/tenants', async (req: any, res: Response) => {
  try {
    const data = req.body;
    
    // Determinar resellerId
    let resellerId: string;
    if (req.user.role === 'RESELLER') {
      resellerId = req.user.id;
    } else if (req.body.resellerId) {
      resellerId = req.body.resellerId;
    } else {
      return res.status(400).json({ error: 'resellerId é obrigatório para admin' });
    }

    // Verificar se o reseller pode operar
    const resellerCheck = await canResellerOperate(resellerId);
    if (!resellerCheck.canOperate) {
      return res.status(403).json({
        error: resellerCheck.reason || 'Revendedor não pode criar tenants',
        code: 'RESELLER_INACTIVE'
      });
    }

    // Verificar limite de tenants
    const limitCheck = await checkTenantLimit(resellerId);
    if (!limitCheck.canCreate) {
      return res.status(403).json({
        error: `Limite de tenants atingido (${limitCheck.current}/${limitCheck.max})`,
        code: 'TENANT_LIMIT_EXCEEDED',
        current: limitCheck.current,
        max: limitCheck.max
      });
    }

    // Validar dados de entrada
    const validatedData = validateOrThrow(createTenantSchema, data);

    // Verificar se email já existe
    const existing = await prisma.merchant.findUnique({
      where: { email: validatedData.email }
    });
    if (existing) {
      return res.status(400).json({ error: 'E-mail já cadastrado' });
    }

    // Validar módulos permitidos (se especificados)
    if (data.activeModules && Array.isArray(data.activeModules)) {
      for (const module of data.activeModules as AIModule[]) {
        const moduleCheck = await validateResellerModuleGrant(resellerId, module);
        if (!moduleCheck.allowed) {
          return res.status(403).json({
            error: moduleCheck.reason || `Módulo ${module} não permitido`,
            code: 'MODULE_NOT_ALLOWED'
          });
        }
      }
    }

    // Gerar senha temporária
    const temporaryPassword = generateSecurePassword(12);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);
    const verificationCode = generateVerificationCode(6);

    // Buscar plano
    let planId: string | undefined;
    if (validatedData.plan) {
      const plan = await prisma.plan.findFirst({
        where: { name: validatedData.plan }
      });
      if (plan) planId = plan.id;
    }

    // Criar tenant
    const tenant = await prisma.merchant.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        verificationCode,
        status: 'pending_verification',
        resellerId,
        planId,
        tokenQuota: validatedData.tokenQuota || 10000,
        whatsappApiType: validatedData.whatsappApiType || 'EVOLUTION',
        metaAccessToken: validatedData.metaAccessToken,
        metaPhoneNumberId: validatedData.metaPhoneNumberId,
        metaWabaId: validatedData.metaWabaId,
        metaVerifyToken: validatedData.metaVerifyToken,
        activeModules: data.activeModules || ['ESSENTIAL']
      } as any,
      include: { plan: true }
    });

    // Registrar auditoria
    await auditLog({
      resellerId,
      merchantId: tenant.id,
      action: 'TENANT_CREATED',
      details: `Tenant ${tenant.name} criado por reseller`,
      ipAddress: req.ip
    });

    // Enviar email com credenciais temporárias
    // (em produção, implementar envio de email)

    res.status(201).json({
      ...tenant,
      temporaryPassword, // Apenas na criação, remover em produção
      verificationCode   // Para testes
    });

  } catch (error: any) {
    console.error('[RESELLER] Erro ao criar tenant:', error);
    
    if (error.message.startsWith('Erro de validação:')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /tenants/:id
 * Busca um tenant específico
 */
resellerRoutes.get('/tenants/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    const where: any = { id };
    if (req.user.role === 'RESELLER') {
      where.resellerId = req.user.id;
    }

    const tenant = await prisma.merchant.findFirst({
      where,
      include: {
        plan: true,
        niche: true,
        knowledgeBase: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant não encontrado' });
    }

    // Buscar módulos válidos
    const validModules = await getValidModulesForMerchant(tenant.id);

    res.json({
      ...tenant,
      validModules
    });

  } catch (error: any) {
    console.error('[RESELLER] Erro ao buscar tenant:', error);
    res.status(500).json({ error: 'Erro ao buscar tenant' });
  }
});

/**
 * PUT /tenants/:id
 * Atualiza um tenant
 */
resellerRoutes.put('/tenants/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verificar propriedade
    const tenant = await prisma.merchant.findUnique({
      where: { id },
      include: { reseller: true }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant não encontrado' });
    }

    if (req.user.role === 'RESELLER' && tenant.resellerId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Validar dados
    const validatedData = validateOrThrow(updateMerchantSchema, req.body);

    // Validar módulos (se estiverem sendo atualizados)
    if (validatedData.activeModules && tenant.resellerId) {
      for (const module of validatedData.activeModules as AIModule[]) {
        const moduleCheck = await validateResellerModuleGrant(tenant.resellerId, module);
        if (!moduleCheck.allowed) {
          return res.status(403).json({
            error: moduleCheck.reason || `Módulo ${module} não permitido`,
            code: 'MODULE_NOT_ALLOWED'
          });
        }
      }
    }

    // Atualizar tenant
    const updated = await prisma.merchant.update({
      where: { id },
      data: validatedData as any,
      include: { plan: true }
    });

    // Registrar auditoria
    await auditLog({
      resellerId: tenant.resellerId,
      merchantId: id,
      action: 'TENANT_UPDATED',
      details: `Tenant atualizado: ${JSON.stringify(Object.keys(validatedData))}`,
      ipAddress: req.ip
    });

    res.json(updated);

  } catch (error: any) {
    console.error('[RESELLER] Erro ao atualizar tenant:', error);
    
    if (error.message.startsWith('Erro de validação:')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /tenants/:id
 * Remove um tenant (soft delete - suspende)
 */
resellerRoutes.delete('/tenants/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    
    // Verificar propriedade
    const tenant = await prisma.merchant.findUnique({
      where: { id }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant não encontrado' });
    }

    if (req.user.role === 'RESELLER' && tenant.resellerId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Suspender tenant
    await prisma.merchant.update({
      where: { id },
      data: {
        status: 'suspended',
        evolutionInstance: null
      }
    });

    // Deletar instância Evolution (se existir)
    if (tenant.evolutionInstance) {
      const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';
      const apiKey = process.env.EVOLUTION_API_KEY;

      try {
        await fetch(`${evolutionUrl}/instance/delete/${tenant.evolutionInstance}`, {
          method: 'DELETE',
          headers: { 'apikey': apiKey || '' }
        });
      } catch (e) {
        console.error('[RESELLER] Erro ao deletar instância Evolution:', e);
      }
    }

    // Registrar auditoria
    await auditLog({
      resellerId: tenant.resellerId,
      merchantId: id,
      action: 'TENANT_DELETED',
      details: `Tenant ${tenant.name} suspenso/deletado`,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'Tenant suspenso com sucesso' });

  } catch (error: any) {
    console.error('[RESELLER] Erro ao deletar tenant:', error);
    res.status(500).json({ error: 'Erro ao deletar tenant' });
  }
});

/**
 * POST /tenants/:id/modules
 * Atualiza módulos de um tenant
 */
resellerRoutes.post('/tenants/:id/modules', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { modules } = req.body;

    if (!Array.isArray(modules)) {
      return res.status(400).json({ error: 'modules deve ser um array' });
    }

    // Verificar propriedade
    const tenant = await prisma.merchant.findUnique({
      where: { id },
      include: { reseller: true, plan: true }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant não encontrado' });
    }

    if (req.user.role === 'RESELLER' && tenant.resellerId !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Validar cada módulo
    for (const module of modules as AIModule[]) {
      // Verificar se o plano permite
      const planModules = (tenant.plan?.modules as any) || {};
      if (!planModules[module]) {
        return res.status(403).json({
          error: `Módulo ${module} não incluído no plano atual`,
          code: 'MODULE_NOT_IN_PLAN'
        });
      }

      // Verificar se o reseller permite
      if (tenant.resellerId) {
        const moduleCheck = await validateResellerModuleGrant(tenant.resellerId, module);
        if (!moduleCheck.allowed) {
          return res.status(403).json({
            error: moduleCheck.reason,
            code: 'MODULE_NOT_ALLOWED'
          });
        }
      }
    }

    // Atualizar módulos
    const updated = await prisma.merchant.update({
      where: { id },
      data: { activeModules: modules }
    });

    await auditLog({
      resellerId: tenant.resellerId,
      merchantId: id,
      action: 'MODULES_UPDATED',
      details: `Módulos atualizados: ${modules.join(', ')}`,
      ipAddress: req.ip
    });

    res.json(updated);

  } catch (error: any) {
    console.error('[RESELLER] Erro ao atualizar módulos:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /limits
 * Retorna limites do reseller
 */
resellerRoutes.get('/limits', async (req: any, res: Response) => {
  try {
    const resellerId = req.user.role === 'RESELLER' ? req.user.id : req.query.resellerId;

    if (!resellerId) {
      return res.status(400).json({ error: 'resellerId é obrigatório para admin' });
    }

    const limitCheck = await checkTenantLimit(resellerId);
    const reseller = await prisma.reseller.findUnique({
      where: { id: resellerId },
      select: {
        allowedModules: true,
        maxTenants: true,
        status: true
      }
    });

    res.json({
      tenants: limitCheck,
      modules: reseller?.allowedModules || [],
      status: reseller?.status
    });

  } catch (error: any) {
    console.error('[RESELLER] Erro ao buscar limites:', error);
    res.status(500).json({ error: 'Erro ao buscar limites' });
  }
});

// =============================================================================
// ROTAS DE NOTIFICAÇÕES
// =============================================================================

/**
 * GET /notifications
 * Busca configurações de notificação do reseller
 */
resellerRoutes.get('/notifications', async (req: any, res: Response) => {
  try {
    const resellerId = req.user.role === 'RESELLER' ? req.user.id : req.query.resellerId;

    if (!resellerId) {
      return res.status(400).json({ error: 'resellerId é obrigatório para admin' });
    }

    const reseller = await prisma.reseller.findUnique({
      where: { id: resellerId },
      select: {
        whatsappNumber: true,
        notificationsEnabled: true,
        notifyNewSale: true,
        notifyTrialExpiring: true,
        notifySuspended: true,
        notifyActivated: true,
        notifyPaymentFailed: true
      }
    });

    if (!reseller) {
      return res.status(404).json({ error: 'Revendedor não encontrado' });
    }

    res.json(reseller);

  } catch (error: any) {
    console.error('[RESELLER] Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro ao buscar configurações de notificação' });
  }
});

/**
 * PUT /notifications
 * Atualiza configurações de notificação
 */
resellerRoutes.put('/notifications', async (req: any, res: Response) => {
  try {
    const resellerId = req.user.role === 'RESELLER' ? req.user.id : req.body.resellerId;

    if (!resellerId) {
      return res.status(400).json({ error: 'resellerId é obrigatório para admin' });
    }

    const {
      whatsappNumber,
      notificationsEnabled,
      notifyNewSale,
      notifyTrialExpiring,
      notifySuspended,
      notifyActivated,
      notifyPaymentFailed
    } = req.body;

    // Validar formato do telefone (se fornecido)
    if (whatsappNumber) {
      const cleanPhone = whatsappNumber.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 11) {
        return res.status(400).json({ error: 'Número de WhatsApp inválido' });
      }
    }

    const updated = await prisma.reseller.update({
      where: { id: resellerId },
      data: {
        whatsappNumber: whatsappNumber ? whatsappNumber.replace(/\D/g, '') : null,
        notificationsEnabled: notificationsEnabled ?? true,
        notifyNewSale: notifyNewSale ?? true,
        notifyTrialExpiring: notifyTrialExpiring ?? true,
        notifySuspended: notifySuspended ?? true,
        notifyActivated: notifyActivated ?? true,
        notifyPaymentFailed: notifyPaymentFailed ?? true
      }
    });

    await auditLog({
      resellerId,
      action: 'NOTIFICATIONS_UPDATED',
      details: `Configurações de notificação atualizadas`
    });

    res.json(updated);

  } catch (error: any) {
    console.error('[RESELLER] Erro ao atualizar notificações:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações' });
  }
});

/**
 * POST /notifications/test
 * Envia mensagem de teste para o WhatsApp do reseller
 */
resellerRoutes.post('/notifications/test', async (req: any, res: Response) => {
  try {
    const resellerId = req.user.role === 'RESELLER' ? req.user.id : req.body.resellerId;
    const { phone } = req.body;

    if (!resellerId) {
      return res.status(400).json({ error: 'resellerId é obrigatório para admin' });
    }

    const reseller = await prisma.reseller.findUnique({
      where: { id: resellerId }
    });

    const targetPhone = phone || reseller?.whatsappNumber;

    if (!targetPhone) {
      return res.status(400).json({ error: 'Nenhum número configurado' });
    }

    // Enviar mensagem de teste
    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'MainInstance';
    const cleanPhone = targetPhone.replace(/\D/g, '');

    const testMessage = `🔔 *TESTE DE NOTIFICAÇÃO*\n\nOlá, ${reseller?.name || 'Revendedor'}!\n\nEste é um teste de notificação do SaaSWPP.\n\n✅ Se você recebeu esta mensagem, suas notificações estão funcionando corretamente!`;

    try {
      const response = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey || ''
        },
        body: JSON.stringify({
          number: cleanPhone,
          text: testMessage
        })
      });

      if (!response.ok) {
        throw new Error(`Evolution API error: ${response.statusText}`);
      }

      await auditLog({
        resellerId,
        action: 'NOTIFICATION_TEST_SENT',
        details: `Teste enviado para ${cleanPhone}`
      });

      res.json({ success: true, message: 'Mensagem de teste enviada!' });

    } catch (error: any) {
      console.error('[RESELLER] Erro ao enviar teste:', error);
      res.status(500).json({ error: 'Erro ao enviar mensagem de teste' });
    }

  } catch (error: any) {
    console.error('[RESELLER] Erro no teste de notificação:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /profile
 * Busca perfil completo do reseller (incluindo documentos)
 */
resellerRoutes.get('/profile', async (req: any, res: Response) => {
  try {
    const resellerId = req.user.role === 'RESELLER' ? req.user.id : req.query.resellerId;

    if (!resellerId) {
      return res.status(400).json({ error: 'resellerId é obrigatório para admin' });
    }

    const reseller = await prisma.reseller.findUnique({
      where: { id: resellerId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        documentType: true,
        documentNumber: true,
        whatsappNumber: true,
        brandName: true,
        brandLogo: true,
        brandPrimaryColor: true,
        customDomain: true,
        maxTenants: true,
        commissionRate: true,
        notificationsEnabled: true,
        allowedModules: true,
        createdAt: true
      }
    });

    if (!reseller) {
      return res.status(404).json({ error: 'Revendedor não encontrado' });
    }

    // Contar tenants
    const tenantsCount = await prisma.merchant.count({
      where: { resellerId }
    });

    res.json({
      ...reseller,
      tenantsCount
    });

  } catch (error: any) {
    console.error('[RESELLER] Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
});

/**
 * PUT /profile
 * Atualiza perfil do reseller
 */
resellerRoutes.put('/profile', async (req: any, res: Response) => {
  try {
    const resellerId = req.user.role === 'RESELLER' ? req.user.id : req.body.resellerId;

    if (!resellerId) {
      return res.status(400).json({ error: 'resellerId é obrigatório para admin' });
    }

    const {
      name,
      documentType,
      documentNumber,
      whatsappNumber,
      brandName,
      brandLogo,
      brandPrimaryColor,
      customDomain
    } = req.body;

    // Validar documento (se fornecido)
    if (documentNumber) {
      const cleanDoc = documentNumber.replace(/\D/g, '');
      const isValid = documentType === 'CPF' 
        ? validateCPF(cleanDoc) 
        : validateCNPJ(cleanDoc);

      if (!isValid) {
        return res.status(400).json({ error: `${documentType} inválido` });
      }

      // Verificar se já existe
      const existing = await prisma.reseller.findFirst({
        where: { 
          documentNumber: cleanDoc,
          NOT: { id: resellerId }
        }
      });

      if (existing) {
        return res.status(400).json({ error: 'Documento já cadastrado' });
      }
    }

    const updated = await prisma.reseller.update({
      where: { id: resellerId },
      data: {
        name,
        documentType,
        documentNumber: documentNumber?.replace(/\D/g, ''),
        whatsappNumber: whatsappNumber?.replace(/\D/g, ''),
        brandName,
        brandLogo,
        brandPrimaryColor,
        customDomain
      }
    });

    await auditLog({
      resellerId,
      action: 'PROFILE_UPDATED',
      details: 'Perfil atualizado'
    });

    res.json(updated);

  } catch (error: any) {
    console.error('[RESELLER] Erro ao atualizar perfil:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// FUNÇÕES AUXILIARES (Validação de documentos)
// =============================================================================

function validateCPF(cpf: string): boolean {
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11) return false;
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[10])) return false;
  
  return true;
}

function validateCNPJ(cnpj: string): boolean {
  const numbers = cnpj.replace(/\D/g, '');
  if (numbers.length !== 14) return false;
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(numbers[12])) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(numbers[13])) return false;
  
  return true;
}
