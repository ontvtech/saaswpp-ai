/**
 * ROTAS DE FEATURES START - SaaSWPP AI
 * 
 * Mensagens Interativas, Templates Dinâmicos, Heatmap
 */

import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { requireFeature } from '../middleware/validateFeature';
import { 
  sendButtonMessage, 
  sendMainMenu, 
  sendConfirmation,
  sendAvailableSlots 
} from '../services/interactiveMessages';
import { 
  listTemplates, 
  saveTemplate, 
  deleteTemplate, 
  useTemplate,
  processTemplate,
  extractVariables,
  DEFAULT_TEMPLATES
} from '../services/templateService';
import { 
  generateHeatmap, 
  getHourlyStats, 
  getDailyStats, 
  detectPeakHours,
  recommendHumanHours 
} from '../services/heatmapService';

const prisma = new PrismaClient();
export const startFeaturesRoutes = Router();

// Todas as rotas precisam de autenticação
startFeaturesRoutes.use(requireAuth(['MERCHANT']));

// =============================================================================
// MENSAGENS INTERATIVAS
// =============================================================================

/**
 * POST /interactive/send-buttons
 * Envia mensagem com botões
 */
startFeaturesRoutes.post('/interactive/send-buttons', 
  requireFeature('INTERACTIVE_MESSAGES'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const { to, body, buttons, footer } = req.body;

      if (!to || !body || !buttons || !Array.isArray(buttons)) {
        return res.status(400).json({ 
          error: 'Parâmetros obrigatórios: to, body, buttons[]' 
        });
      }

      const result = await sendButtonMessage(merchantId, to, {
        type: 'button',
        body,
        buttons: buttons.map((b: any, i: number) => ({
          id: b.id || `btn_${i}`,
          text: b.text
        })),
        footer
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true, messageId: result.messageId });

    } catch (error: any) {
      console.error('[START] Erro ao enviar botões:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /interactive/send-list
 * Envia mensagem com lista de opções
 */
startFeaturesRoutes.post('/interactive/send-list',
  requireFeature('INTERACTIVE_MESSAGES'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const { to, header, body, footer, sections } = req.body;

      if (!to || !body || !sections || !Array.isArray(sections)) {
        return res.status(400).json({ 
          error: 'Parâmetros obrigatórios: to, body, sections[]' 
        });
      }

      const result = await sendButtonMessage(merchantId, to, {
        type: 'list',
        header: header ? { type: 'text', text: header } : undefined,
        body,
        footer,
        sections: sections.map((s: any) => ({
          title: s.title,
          rows: s.rows.map((r: any) => ({
            id: r.id,
            title: r.title,
            description: r.description
          }))
        }))
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true, messageId: result.messageId });

    } catch (error: any) {
      console.error('[START] Erro ao enviar lista:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /interactive/send-menu
 * Envia menu principal
 */
startFeaturesRoutes.post('/interactive/send-menu',
  requireFeature('INTERACTIVE_MESSAGES'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const { to } = req.body;

      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId }
      });

      const result = await sendMainMenu(
        merchantId, 
        to, 
        merchant?.name || 'Nossa Empresa'
      );

      res.json(result);

    } catch (error: any) {
      console.error('[START] Erro ao enviar menu:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /interactive/send-confirmation
 * Envia confirmação Sim/Não
 */
startFeaturesRoutes.post('/interactive/send-confirmation',
  requireFeature('INTERACTIVE_MESSAGES'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const { to, question } = req.body;

      const result = await sendConfirmation(merchantId, to, question);
      res.json(result);

    } catch (error: any) {
      console.error('[START] Erro ao enviar confirmação:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /interactive/send-slots
 * Envia lista de horários disponíveis
 */
startFeaturesRoutes.post('/interactive/send-slots',
  requireFeature('INTERACTIVE_MESSAGES'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const { to, date, slots } = req.body;

      const result = await sendAvailableSlots(
        merchantId, 
        to, 
        new Date(date), 
        slots
      );

      res.json(result);

    } catch (error: any) {
      console.error('[START] Erro ao enviar horários:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// =============================================================================
// TEMPLATES DINÂMICOS
// =============================================================================

/**
 * GET /templates
 * Lista todos os templates
 */
startFeaturesRoutes.get('/templates',
  requireFeature('DYNAMIC_TEMPLATES'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const templates = await listTemplates(merchantId);
      res.json(templates);

    } catch (error: any) {
      console.error('[START] Erro ao listar templates:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /templates/:key
 * Busca template por key
 */
startFeaturesRoutes.get('/templates/:key',
  requireFeature('DYNAMIC_TEMPLATES'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const { key } = req.params;

      const { getTemplate } = await import('../services/templateService');
      const template = await getTemplate(merchantId, key);

      if (!template) {
        return res.status(404).json({ error: 'Template não encontrado' });
      }

      res.json(template);

    } catch (error: any) {
      console.error('[START] Erro ao buscar template:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /templates
 * Cria ou atualiza template
 */
startFeaturesRoutes.post('/templates',
  requireFeature('DYNAMIC_TEMPLATES'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const { key, name, content, category } = req.body;

      if (!key || !name || !content) {
        return res.status(400).json({ 
          error: 'Parâmetros obrigatórios: key, name, content' 
        });
      }

      const template = await saveTemplate(merchantId, key, name, content, category);
      res.json(template);

    } catch (error: any) {
      console.error('[START] Erro ao salvar template:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * DELETE /templates/:key
 * Deleta template customizado
 */
startFeaturesRoutes.delete('/templates/:key',
  requireFeature('DYNAMIC_TEMPLATES'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const { key } = req.params;

      const success = await deleteTemplate(merchantId, key);
      res.json({ success });

    } catch (error: any) {
      console.error('[START] Erro ao deletar template:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /templates/use
 * Usa template e retorna mensagem processada
 */
startFeaturesRoutes.post('/templates/use',
  requireFeature('DYNAMIC_TEMPLATES'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const { key, variables } = req.body;

      const message = await useTemplate(merchantId, key, variables);

      if (!message) {
        return res.status(404).json({ error: 'Template não encontrado' });
      }

      res.json({ message });

    } catch (error: any) {
      console.error('[START] Erro ao usar template:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /templates/preview
 * Prévia do template com variáveis
 */
startFeaturesRoutes.post('/templates/preview',
  requireFeature('DYNAMIC_TEMPLATES'),
  async (req: any, res: Response) => {
    try {
      const { content, variables } = req.body;
      const preview = processTemplate(content, variables);
      const vars = extractVariables(content);

      res.json({ preview, variables: vars });

    } catch (error: any) {
      console.error('[START] Erro ao pré-visualizar:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /templates/defaults
 * Lista templates padrão do sistema
 */
startFeaturesRoutes.get('/templates/defaults',
  requireFeature('DYNAMIC_TEMPLATES'),
  async (req: any, res: Response) => {
    res.json(DEFAULT_TEMPLATES);
  }
);

// =============================================================================
// HEATMAP DE HORÁRIOS
// =============================================================================

/**
 * GET /heatmap
 * Dados completos do heatmap
 */
startFeaturesRoutes.get('/heatmap',
  requireFeature('HEATMAP_HOURS'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const days = parseInt(req.query.days as string) || 30;

      const heatmap = await generateHeatmap(merchantId, days);
      res.json(heatmap);

    } catch (error: any) {
      console.error('[START] Erro ao gerar heatmap:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /heatmap/hourly
 * Estatísticas por hora
 */
startFeaturesRoutes.get('/heatmap/hourly',
  requireFeature('HEATMAP_HOURS'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const days = parseInt(req.query.days as string) || 30;

      const stats = await getHourlyStats(merchantId, days);
      res.json(stats);

    } catch (error: any) {
      console.error('[START] Erro ao buscar estatísticas horárias:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /heatmap/daily
 * Estatísticas por dia da semana
 */
startFeaturesRoutes.get('/heatmap/daily',
  requireFeature('HEATMAP_HOURS'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const days = parseInt(req.query.days as string) || 30;

      const stats = await getDailyStats(merchantId, days);
      res.json(stats);

    } catch (error: any) {
      console.error('[START] Erro ao buscar estatísticas diárias:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /heatmap/peaks
 * Detecta horários de pico
 */
startFeaturesRoutes.get('/heatmap/peaks',
  requireFeature('HEATMAP_HOURS'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const threshold = parseFloat(req.query.threshold as string) || 0.05;

      const peaks = await detectPeakHours(merchantId, threshold);
      res.json(peaks);

    } catch (error: any) {
      console.error('[START] Erro ao detectar picos:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /heatmap/recommendations
 * Recomendações de horários para atendimento
 */
startFeaturesRoutes.get('/heatmap/recommendations',
  requireFeature('HEATMAP_HOURS'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const recommendations = await recommendHumanHours(merchantId);
      res.json(recommendations);

    } catch (error: any) {
      console.error('[START] Erro ao gerar recomendações:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

export default startFeaturesRoutes;
