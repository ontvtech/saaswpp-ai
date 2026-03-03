/**
 * ROTAS DE NFS-e (NOTA FISCAL DE SERVIÇO) - SaaSWPP AI
 * 
 * Endpoints para configuração e gestão de notas fiscais
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { nfseService } from '../services/nfseService';
import { authenticate, requireAdmin, requireReseller } from '../middleware/auth';

const prisma = new PrismaClient();
export const nfseRoutes = Router();

// =============================================================================
// CONFIGURAÇÃO FISCAL
// =============================================================================

/**
 * GET /api/nfse/config
 * Busca configuração fiscal do usuário logado
 */
nfseRoutes.get('/config', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const ownerType = user.role === 'reseller' ? 'reseller' : 'merchant';
    const ownerId = user.id;
    
    const config = await nfseService.getConfig(ownerType, ownerId);
    
    // Ocultar dados sensíveis
    if (config) {
      const safeConfig = {
        ...config,
        apiToken: config.apiToken ? '••••••••' : null,
        apiSecret: config.apiSecret ? '••••••••' : null,
        certificatePass: config.certificatePass ? '••••••••' : null
      };
      return res.json(safeConfig);
    }
    
    res.json(null);
  } catch (error: any) {
    console.error('[NFS-e] Erro ao buscar config:', error);
    res.status(500).json({ error: 'Erro ao buscar configuração' });
  }
});

/**
 * POST /api/nfse/config
 * Salva configuração fiscal
 */
nfseRoutes.post('/config', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const ownerType = user.role === 'reseller' ? 'reseller' : 'merchant';
    const ownerId = user.id;
    
    const data = req.body;
    
    // Validações básicas
    if (data.cnpj) {
      data.cnpj = data.cnpj.replace(/\D/g, '');
    }
    if (data.phone) {
      data.phone = data.phone.replace(/\D/g, '');
    }
    if (data.addressZipCode) {
      data.addressZipCode = data.addressZipCode.replace(/\D/g, '');
    }
    
    const config = await nfseService.saveConfig(ownerType, ownerId, data);
    
    res.json({ 
      success: true, 
      message: 'Configuração salva com sucesso',
      config: {
        ...config,
        apiToken: config.apiToken ? '••••••••' : null,
        apiSecret: config.apiSecret ? '••••••••' : null,
        certificatePass: config.certificatePass ? '••••••••' : null
      }
    });
  } catch (error: any) {
    console.error('[NFS-e] Erro ao salvar config:', error);
    res.status(500).json({ error: 'Erro ao salvar configuração' });
  }
});

/**
 * PATCH /api/nfse/config/toggle
 * Ativa/desativa NFS-e
 */
nfseRoutes.patch('/config/toggle', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const ownerType = user.role === 'reseller' ? 'reseller' : 'merchant';
    const ownerId = user.id;
    const { enabled } = req.body;
    
    const config = await nfseService.saveConfig(ownerType, ownerId, {
      nfseEnabled: enabled
    });
    
    res.json({ 
      success: true, 
      message: enabled ? 'NFS-e ativada' : 'NFS-e desativada',
      nfseEnabled: config.nfseEnabled
    });
  } catch (error: any) {
    console.error('[NFS-e] Erro ao togglear:', error);
    res.status(500).json({ error: 'Erro ao atualizar configuração' });
  }
});

/**
 * PATCH /api/nfse/config/auto-issue
 * Ativa/desativa emissão automática
 */
nfseRoutes.patch('/config/auto-issue', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const ownerType = user.role === 'reseller' ? 'reseller' : 'merchant';
    const ownerId = user.id;
    const { enabled } = req.body;
    
    const config = await nfseService.saveConfig(ownerType, ownerId, {
      autoIssue: enabled
    });
    
    res.json({ 
      success: true, 
      message: enabled ? 'Emissão automática ativada' : 'Emissão automática desativada',
      autoIssue: config.autoIssue
    });
  } catch (error: any) {
    console.error('[NFS-e] Erro ao atualizar auto-issue:', error);
    res.status(500).json({ error: 'Erro ao atualizar configuração' });
  }
});

// =============================================================================
// NOTAS FISCAIS
// =============================================================================

/**
 * GET /api/nfse/invoices
 * Lista notas fiscais
 */
nfseRoutes.get('/invoices', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const ownerType = user.role === 'reseller' ? 'reseller' : 'merchant';
    const ownerId = user.id;
    
    const { status, startDate, endDate, limit, offset } = req.query;
    
    const result = await nfseService.listInvoices(ownerType, ownerId, {
      status: status as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0
    });
    
    res.json(result);
  } catch (error: any) {
    console.error('[NFS-e] Erro ao listar invoices:', error);
    res.status(500).json({ error: 'Erro ao listar notas fiscais' });
  }
});

/**
 * GET /api/nfse/invoices/:id
 * Busca uma nota fiscal específica
 */
nfseRoutes.get('/invoices/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const invoiceId = req.params.id;
    
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        // Incluir logs se necessário
      }
    });
    
    if (!invoice) {
      return res.status(404).json({ error: 'Nota não encontrada' });
    }
    
    // Verificar permissão
    const ownerType = user.role === 'reseller' ? 'reseller' : 'merchant';
    if (invoice.ownerType !== ownerType || invoice.ownerId !== user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    res.json(invoice);
  } catch (error: any) {
    console.error('[NFS-e] Erro ao buscar invoice:', error);
    res.status(500).json({ error: 'Erro ao buscar nota fiscal' });
  }
});

/**
 * POST /api/nfse/invoices/:id/retry
 * Reenvia uma nota com erro
 */
nfseRoutes.post('/invoices/:id/retry', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const invoiceId = req.params.id;
    
    // Verificar permissão
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });
    
    if (!invoice) {
      return res.status(404).json({ error: 'Nota não encontrada' });
    }
    
    const ownerType = user.role === 'reseller' ? 'reseller' : 'merchant';
    if (invoice.ownerType !== ownerType || invoice.ownerId !== user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const result = await nfseService.retryInvoice(invoiceId);
    
    res.json(result);
  } catch (error: any) {
    console.error('[NFS-e] Erro ao reenviar invoice:', error);
    res.status(500).json({ error: 'Erro ao reenviar nota fiscal' });
  }
});

/**
 * POST /api/nfse/invoices/:id/cancel
 * Cancela uma nota fiscal
 */
nfseRoutes.post('/invoices/:id/cancel', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const invoiceId = req.params.id;
    const { reason } = req.body;
    
    if (!reason || reason.length < 15) {
      return res.status(400).json({ error: 'Motivo deve ter pelo menos 15 caracteres' });
    }
    
    // Verificar permissão
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId }
    });
    
    if (!invoice) {
      return res.status(404).json({ error: 'Nota não encontrada' });
    }
    
    const ownerType = user.role === 'reseller' ? 'reseller' : 'merchant';
    if (invoice.ownerType !== ownerType || invoice.ownerId !== user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const result = await nfseService.cancelInvoice(invoiceId, reason);
    
    res.json(result);
  } catch (error: any) {
    console.error('[NFS-e] Erro ao cancelar invoice:', error);
    res.status(500).json({ error: 'Erro ao cancelar nota fiscal' });
  }
});

/**
 * POST /api/nfse/invoices/manual
 * Emite uma nota manualmente (para casos especiais)
 */
nfseRoutes.post('/invoices/manual', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const ownerType = user.role === 'reseller' ? 'reseller' : 'merchant';
    const ownerId = user.id;
    
    const { value, taker, serviceDescription, serviceCode } = req.body;
    
    if (!value || value <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }
    
    const result = await nfseService.emitOnPaymentConfirmed({
      ownerType,
      ownerId,
      value,
      taker,
      serviceDescription,
      serviceCode,
      paymentMethod: 'manual'
    });
    
    res.json(result);
  } catch (error: any) {
    console.error('[NFS-e] Erro ao emitir invoice manual:', error);
    res.status(500).json({ error: 'Erro ao emitir nota fiscal' });
  }
});

// =============================================================================
// ESTATÍSTICAS
// =============================================================================

/**
 * GET /api/nfse/stats
 * Busca estatísticas de notas fiscais
 */
nfseRoutes.get('/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const ownerType = user.role === 'reseller' ? 'reseller' : 'merchant';
    const ownerId = user.id;
    
    const stats = await nfseService.getStats(ownerType, ownerId);
    
    res.json(stats);
  } catch (error: any) {
    console.error('[NFS-e] Erro ao buscar stats:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// =============================================================================
// ADMIN ROTAS
// =============================================================================

/**
 * GET /api/nfse/admin/reseller/:resellerId/config
 * Admin busca configuração de um reseller
 */
nfseRoutes.get('/admin/reseller/:resellerId/config', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { resellerId } = req.params;
    
    const config = await nfseService.getConfig('reseller', resellerId);
    
    if (config) {
      const safeConfig = {
        ...config,
        apiToken: config.apiToken ? '••••••••' : null,
        apiSecret: config.apiSecret ? '••••••••' : null,
        certificatePass: config.certificatePass ? '••••••••' : null
      };
      return res.json(safeConfig);
    }
    
    res.json(null);
  } catch (error: any) {
    console.error('[NFS-e] Erro ao buscar config reseller:', error);
    res.status(500).json({ error: 'Erro ao buscar configuração' });
  }
});

/**
 * GET /api/nfse/admin/invoices
 * Admin lista todas as notas (com filtros)
 */
nfseRoutes.get('/admin/invoices', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, ownerType, startDate, endDate, limit, offset } = req.query;
    
    const where: any = {};
    
    if (status) where.status = status;
    if (ownerType) where.ownerType = ownerType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }
    
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(limit as string) : 50,
        skip: offset ? parseInt(offset as string) : 0
      }),
      prisma.invoice.count({ where })
    ]);
    
    res.json({ invoices, total });
  } catch (error: any) {
    console.error('[NFS-e] Erro ao listar invoices admin:', error);
    res.status(500).json({ error: 'Erro ao listar notas fiscais' });
  }
});

/**
 * GET /api/nfse/admin/stats
 * Estatísticas globais de NFS-e
 */
nfseRoutes.get('/admin/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const [totalIssued, totalValue, byStatus, byProvider] = await Promise.all([
      prisma.invoice.count({ where: { status: 'issued' } }),
      prisma.invoice.aggregate({
        where: { status: 'issued' },
        _sum: { totalValue: true }
      }),
      prisma.invoice.groupBy({
        by: ['status'],
        _count: true
      }),
      prisma.invoice.groupBy({
        by: ['provider'],
        _count: true,
        _sum: { totalValue: true }
      })
    ]);
    
    res.json({
      totalIssued,
      totalValue: totalValue._sum.totalValue || 0,
      byStatus,
      byProvider
    });
  } catch (error: any) {
    console.error('[NFS-e] Erro ao buscar stats admin:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

export default nfseRoutes;
