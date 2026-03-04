/**
 * ROTAS DE TRIAL LINKS - SaaSWPP AI
 * Sistema de geração e validação de links de trial
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from './auth';
import { auditLog } from '../utils/permissions';
import { generateVerificationCode } from '../utils/security';

const prisma = new PrismaClient();
export const trialLinkRoutes = Router();

// =============================================================================
// GET /api/trial-links - Lista links de trial (Admin/Reseller)
// =============================================================================
trialLinkRoutes.get('/', requireAuth(['ADMIN', 'RESELLER']), async (req: any, res: Response) => {
  try {
    const links = await prisma.trialLink.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json(links);

  } catch (error: any) {
    console.error('[TRIAL_LINKS] Erro ao listar:', error);
    res.status(500).json({ error: 'Erro ao listar links' });
  }
});

// =============================================================================
// POST /api/trial-links - Gera novo link de trial
// =============================================================================
trialLinkRoutes.post('/', requireAuth(['ADMIN', 'RESELLER']), async (req: any, res: Response) => {
  try {
    const { days, tokenLimit, instanceLimit, expiresInDays } = req.body;

    // Gerar código único
    const code = generateTrialCode();

    // Calcular expiração
    let expiresAt: Date | null = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    const link = await prisma.trialLink.create({
      data: {
        code,
        days: days || 7,
        tokenLimit: tokenLimit || 50000,
        instanceLimit: instanceLimit || 1,
        expiresAt
      }
    });

    await auditLog({
      resellerId: req.user.role === 'RESELLER' ? req.user.id : undefined,
      action: 'TRIAL_LINK_CREATED',
      details: `Link criado: ${code}`
    });

    // Retornar URL completa
    const baseUrl = process.env.APP_URL || 'https://saaswpp.work';
    res.status(201).json({
      ...link,
      url: `${baseUrl}/trial/${code}`,
      fullUrl: `${baseUrl}/trial/${code}`
    });

  } catch (error: any) {
    console.error('[TRIAL_LINKS] Erro ao criar:', error);
    res.status(500).json({ error: 'Erro ao criar link' });
  }
});

// =============================================================================
// GET /api/trial-links/:code/validate - Valida link de trial (público)
// =============================================================================
trialLinkRoutes.get('/:code/validate', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const link = await prisma.trialLink.findUnique({
      where: { code }
    });

    if (!link) {
      return res.status(404).json({ error: 'Link não encontrado' });
    }

    // Verificar se já foi usado
    if (link.used) {
      return res.status(400).json({ error: 'Este link já foi utilizado' });
    }

    // Verificar expiração
    if (link.expiresAt && new Date() > link.expiresAt) {
      return res.status(400).json({ error: 'Este link expirou' });
    }

    // Buscar configuração global
    const config = await prisma.globalConfig.findUnique({
      where: { id: 'singleton' }
    });

    res.json({
      valid: true,
      days: link.days,
      tokenLimit: link.tokenLimit,
      instanceLimit: link.instanceLimit,
      trialEnabled: config?.trial_enabled ?? true,
      defaultDays: config?.trial_default_days ?? 7
    });

  } catch (error: any) {
    console.error('[TRIAL_LINKS] Erro ao validar:', error);
    res.status(500).json({ error: 'Erro ao validar link' });
  }
});

// =============================================================================
// POST /api/trial-links/generate-batch - Gera múltiplos links
// =============================================================================
trialLinkRoutes.post('/generate-batch', requireAuth(['ADMIN', 'RESELLER']), async (req: any, res: Response) => {
  try {
    const { count, days, tokenLimit, instanceLimit, expiresInDays } = req.body;
    const linkCount = Math.min(count || 5, 50); // Máximo 50 links por vez

    const links = [];

    for (let i = 0; i < linkCount; i++) {
      const code = generateTrialCode();
      
      let expiresAt: Date | null = null;
      if (expiresInDays) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      }

      const link = await prisma.trialLink.create({
        data: {
          code,
          days: days || 7,
          tokenLimit: tokenLimit || 50000,
          instanceLimit: instanceLimit || 1,
          expiresAt
        }
      });

      links.push(link);
    }

    await auditLog({
      resellerId: req.user.role === 'RESELLER' ? req.user.id : undefined,
      action: 'TRIAL_LINKS_BATCH_CREATED',
      details: `${linkCount} links criados`
    });

    const baseUrl = process.env.APP_URL || 'https://saaswpp.work';
    const linksWithUrls = links.map(l => ({
      ...l,
      url: `${baseUrl}/trial/${l.code}`
    }));

    res.status(201).json({
      count: links.length,
      links: linksWithUrls
    });

  } catch (error: any) {
    console.error('[TRIAL_LINKS] Erro ao criar batch:', error);
    res.status(500).json({ error: 'Erro ao criar links' });
  }
});

// =============================================================================
// DELETE /api/trial-links/:id - Remove link não utilizado
// =============================================================================
trialLinkRoutes.delete('/:id', requireAuth(['ADMIN', 'RESELLER']), async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const link = await prisma.trialLink.findUnique({
      where: { id }
    });

    if (!link) {
      return res.status(404).json({ error: 'Link não encontrado' });
    }

    if (link.used) {
      return res.status(400).json({ error: 'Não é possível excluir um link já utilizado' });
    }

    await prisma.trialLink.delete({
      where: { id }
    });

    await auditLog({
      resellerId: req.user.role === 'RESELLER' ? req.user.id : undefined,
      action: 'TRIAL_LINK_DELETED',
      details: `Link deletado: ${link.code}`
    });

    res.json({ success: true });

  } catch (error: any) {
    console.error('[TRIAL_LINKS] Erro ao deletar:', error);
    res.status(500).json({ error: 'Erro ao deletar link' });
  }
});

// =============================================================================
// GET /api/trial-links/stats - Estatísticas de uso
// =============================================================================
trialLinkRoutes.get('/stats', requireAuth(['ADMIN', 'RESELLER']), async (req: any, res: Response) => {
  try {
    const [total, used, expired, active] = await Promise.all([
      prisma.trialLink.count(),
      prisma.trialLink.count({ where: { used: true } }),
      prisma.trialLink.count({
        where: {
          expiresAt: { lt: new Date() },
          used: false
        }
      }),
      prisma.trialLink.count({
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ],
          used: false
        }
      })
    ]);

    res.json({
      total,
      used,
      expired,
      active,
      conversionRate: total > 0 ? ((used / total) * 100).toFixed(1) : 0
    });

  } catch (error: any) {
    console.error('[TRIAL_LINKS] Erro ao buscar stats:', error);
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

function generateTrialCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sem I, O, 1, 0 para evitar confusão
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default trialLinkRoutes;
