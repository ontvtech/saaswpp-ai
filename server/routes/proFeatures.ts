/**
 * ROTAS DE FEATURES PRO - SaaSWPP AI
 * 
 * Envio de Mídia, Dashboard ROI, Sincronização Calendário
 */

import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { requireFeature } from '../middleware/validateFeature';
import { sendMedia, detectMediaType } from '../services/mediaService';
import { 
  trackSale, 
  confirmSale, 
  cancelSale,
  getCurrentMonthROI, 
  getLastNDaysROI, 
  getDailyROI,
  compareROI,
  getTopProducts
} from '../services/roiService';
import { 
  syncAppointment, 
  cancelCalendarEvent, 
  getAvailableSlots,
  saveCalendarConfig 
} from '../services/calendarService';

const prisma = new PrismaClient();
export const proFeaturesRoutes = Router();

proFeaturesRoutes.use(requireAuth(['MERCHANT']));

// =============================================================================
// ENVIO DE MÍDIA
// =============================================================================

/**
 * POST /media/send
 * Envia mídia (imagem, vídeo, áudio, documento)
 */
proFeaturesRoutes.post('/media/send',
  requireFeature('MEDIA_SENDING'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const { type, to, mediaUrl, base64, filename, caption } = req.body;

      if (!to || (!mediaUrl && !base64)) {
        return res.status(400).json({ 
          error: 'Parâmetros obrigatórios: to, mediaUrl OU base64' 
        });
      }

      const mediaType = type || (base64 ? detectMediaType(req.body.mimeType) : null);
      if (!mediaType) {
        return res.status(400).json({ error: 'Tipo de mídia não detectado' });
      }

      const result = await sendMedia(merchantId, {
        type: mediaType,
        to,
        mediaUrl,
        base64,
        filename,
        caption
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result);

    } catch (error: any) {
      console.error('[PRO] Erro ao enviar mídia:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /media/send-image
 * Envia imagem
 */
proFeaturesRoutes.post('/media/send-image',
  requireFeature('MEDIA_SENDING'),
  async (req: any, res: Response) => {
    const merchantId = req.user.merchantId || req.user.id;
    const { to, imageUrl, base64, caption } = req.body;

    const result = await sendMedia(merchantId, {
      type: 'image',
      to,
      mediaUrl: imageUrl,
      base64,
      caption
    });

    res.json(result);
  }
);

/**
 * POST /media/send-document
 * Envia documento PDF
 */
proFeaturesRoutes.post('/media/send-document',
  requireFeature('MEDIA_SENDING'),
  async (req: any, res: Response) => {
    const merchantId = req.user.merchantId || req.user.id;
    const { to, documentUrl, base64, filename, caption } = req.body;

    const result = await sendMedia(merchantId, {
      type: 'document',
      to,
      mediaUrl: documentUrl,
      base64,
      filename,
      caption
    });

    res.json(result);
  }
);

// =============================================================================
// DASHBOARD DE ROI
// =============================================================================

/**
 * GET /roi/current-month
 * ROI do mês atual
 */
proFeaturesRoutes.get('/roi/current-month',
  requireFeature('ROI_DASHBOARD'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      
      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        include: { plan: true }
      });

      const planPrice = merchant?.plan?.price || 97;
      const roi = await getCurrentMonthROI(merchantId, planPrice);

      res.json(roi);

    } catch (error: any) {
      console.error('[PRO] Erro ao calcular ROI:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /roi/last-days/:days
 * ROI dos últimos N dias
 */
proFeaturesRoutes.get('/roi/last-days/:days',
  requireFeature('ROI_DASHBOARD'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const days = parseInt(req.params.days) || 30;

      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        include: { plan: true }
      });

      const planPrice = merchant?.plan?.price || 97;
      const roi = await getLastNDaysROI(merchantId, days, planPrice);

      res.json(roi);

    } catch (error: any) {
      console.error('[PRO] Erro ao calcular ROI:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /roi/daily
 * ROI diário do período
 */
proFeaturesRoutes.get('/roi/daily',
  requireFeature('ROI_DASHBOARD'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);

      const daily = await getDailyROI(merchantId, startDate, endDate);
      res.json(daily);

    } catch (error: any) {
      console.error('[PRO] Erro ao buscar ROI diário:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /roi/compare
 * Compara ROI entre períodos
 */
proFeaturesRoutes.get('/roi/compare',
  requireFeature('ROI_DASHBOARD'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;

      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        include: { plan: true }
      });

      const planPrice = merchant?.plan?.price || 97;
      const comparison = await compareROI(merchantId, planPrice);

      res.json(comparison);

    } catch (error: any) {
      console.error('[PRO] Erro ao comparar ROI:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /roi/top-products
 * Produtos mais vendidos
 */
proFeaturesRoutes.get('/roi/top-products',
  requireFeature('ROI_DASHBOARD'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const limit = parseInt(req.query.limit as string) || 10;

      const products = await getTopProducts(merchantId, limit);
      res.json(products);

    } catch (error: any) {
      console.error('[PRO] Erro ao buscar produtos:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /roi/sales
 * Registra uma venda
 */
proFeaturesRoutes.post('/roi/sales',
  requireFeature('ROI_DASHBOARD'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const { customerPhone, customerName, product, value, source } = req.body;

      const sale = await trackSale({
        merchantId,
        customerPhone,
        customerName,
        product,
        value,
        source
      });

      res.json(sale);

    } catch (error: any) {
      console.error('[PRO] Erro ao registrar venda:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * PUT /roi/sales/:id/confirm
 * Confirma uma venda
 */
proFeaturesRoutes.put('/roi/sales/:id/confirm',
  requireFeature('ROI_DASHBOARD'),
  async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const success = await confirmSale(id);
      res.json({ success });

    } catch (error: any) {
      console.error('[PRO] Erro ao confirmar venda:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

// =============================================================================
// SINCRONIZAÇÃO DE CALENDÁRIO
// =============================================================================

/**
 * GET /calendar/slots
 * Busca horários disponíveis
 */
proFeaturesRoutes.get('/calendar/slots',
  requireFeature('CALENDAR_SYNC'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const date = new Date(req.query.date as string);
      const duration = parseInt(req.query.duration as string) || 30;

      const slots = await getAvailableSlots(merchantId, date, duration);
      res.json({ date: date.toISOString(), slots });

    } catch (error: any) {
      console.error('[PRO] Erro ao buscar horários:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /calendar/sync/:appointmentId
 * Sincroniza agendamento com calendário
 */
proFeaturesRoutes.post('/calendar/sync/:appointmentId',
  requireFeature('CALENDAR_SYNC'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const { appointmentId } = req.params;

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId }
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Agendamento não encontrado' });
      }

      const result = await syncAppointment(merchantId, {
        id: appointment.id,
        clientName: appointment.clientName,
        clientPhone: appointment.clientPhone,
        service: appointment.service,
        date: appointment.date,
        duration: appointment.duration,
        notes: appointment.notes || undefined
      });

      res.json(result);

    } catch (error: any) {
      console.error('[PRO] Erro ao sincronizar:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * DELETE /calendar/event/:eventId
 * Cancela evento no calendário
 */
proFeaturesRoutes.delete('/calendar/event/:eventId',
  requireFeature('CALENDAR_SYNC'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const { eventId } = req.params;

      const result = await cancelCalendarEvent(merchantId, eventId);
      res.json(result);

    } catch (error: any) {
      console.error('[PRO] Erro ao cancelar evento:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /calendar/config
 * Salva configuração de calendário
 */
proFeaturesRoutes.post('/calendar/config',
  requireFeature('CALENDAR_SYNC'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;
      const config = req.body;

      await saveCalendarConfig(merchantId, config);
      res.json({ success: true });

    } catch (error: any) {
      console.error('[PRO] Erro ao salvar config:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /calendar/config
 * Busca configuração de calendário
 */
proFeaturesRoutes.get('/calendar/config',
  requireFeature('CALENDAR_SYNC'),
  async (req: any, res: Response) => {
    try {
      const merchantId = req.user.merchantId || req.user.id;

      const config = await prisma.calendarConfig.findUnique({
        where: { merchantId }
      });

      res.json(config || null);

    } catch (error: any) {
      console.error('[PRO] Erro ao buscar config:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

export default proFeaturesRoutes;
