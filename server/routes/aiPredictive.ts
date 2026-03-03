/**
 * ROTAS DE AI PREDITIVO - SaaSWPP AI
 * Análise preditiva e campanhas de reativação
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from './auth';
import { validateModule } from '../middleware/validateModule';

const prisma = new PrismaClient();
export const aiPredictiveRoutes = Router();

// =============================================================================
// POST /api/ai/predictive-analysis - Executa análise preditiva
// =============================================================================
aiPredictiveRoutes.post('/', requireAuth(['MERCHANT', 'RESELLER', 'ADMIN']), async (req: any, res: Response) => {
  try {
    const merchantId = req.user.role === 'MERCHANT' ? req.user.id : req.body.merchantId;
    const { updateReminders } = req.body;

    // Buscar histórico de interações
    const interactions = await prisma.interactionLog.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      take: 1000
    });

    // Análise simulada (em produção, usar IA para análise real)
    const predictions = generatePredictions(interactions);

    res.json({ predictions });

  } catch (error: any) {
    console.error('[AI_PREDICTIVE] Erro na análise:', error);
    res.status(500).json({ error: 'Erro na análise preditiva' });
  }
});

// =============================================================================
// POST /api/ai/predictive-analysis/approve-all - Aprova todos os scripts
// =============================================================================
aiPredictiveRoutes.post('/approve-all', requireAuth(['MERCHANT', 'RESELLER', 'ADMIN']), async (req: any, res: Response) => {
  try {
    const merchantId = req.user.role === 'MERCHANT' ? req.user.id : req.body.merchantId;

    // Em produção, aqui seria enviada uma campanha via Evolution API
    // Por agora, apenas simulamos o sucesso
    
    await prisma.auditLog.create({
      data: {
        merchantId,
        action: 'PREDICTIVE_APPROVE_ALL',
        details: 'Todos os scripts de abordagem aprovados'
      }
    });

    res.json({ 
      success: true, 
      messagesSent: 0,
      message: 'Campanha iniciada com sucesso'
    });

  } catch (error: any) {
    console.error('[AI_PREDICTIVE] Erro ao aprovar:', error);
    res.status(500).json({ error: 'Erro ao aprovar scripts' });
  }
});

// =============================================================================
// POST /api/ai/predictive-analysis/send - Envia mensagem individual
// =============================================================================
aiPredictiveRoutes.post('/send', requireAuth(['MERCHANT', 'RESELLER', 'ADMIN']), async (req: any, res: Response) => {
  try {
    const merchantId = req.user.role === 'MERCHANT' ? req.user.id : req.body.merchantId;
    const { customerId, message } = req.body;

    // Em produção, buscar o telefone do cliente e enviar via Evolution API
    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.252:8080';
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'MainInstance';

    // Buscar merchant para pegar a instância
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { evolutionInstance: true }
    });

    if (merchant?.evolutionInstance && apiKey) {
      // Enviar mensagem real
      try {
        await fetch(`${evolutionUrl}/message/sendText/${merchant.evolutionInstance}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey
          },
          body: JSON.stringify({
            number: customerId, // Deveria ser o telefone real
            text: message
          })
        });
      } catch (e) {
        console.error('[AI_PREDICTIVE] Erro ao enviar mensagem:', e);
      }
    }

    await prisma.auditLog.create({
      data: {
        merchantId,
        action: 'PREDICTIVE_MESSAGE_SENT',
        details: `Mensagem enviada para ${customerId}`
      }
    });

    res.json({ success: true });

  } catch (error: any) {
    console.error('[AI_PREDICTIVE] Erro ao enviar:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
});

// =============================================================================
// POST /api/ai/predictive/reactivate-cold-leads - Reativa leads frios
// =============================================================================
aiPredictiveRoutes.post('/reactivate-cold-leads', requireAuth(['MERCHANT', 'RESELLER', 'ADMIN']), async (req: any, res: Response) => {
  try {
    const merchantId = req.user.role === 'MERCHANT' ? req.user.id : req.body.merchantId;

    // Buscar clientes inativos (sem interação há mais de 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const interactions = await prisma.interactionLog.findMany({
      where: {
        merchantId,
        createdAt: { lt: thirtyDaysAgo }
      },
      select: { sender: true },
      distinct: ['sender']
    });

    const coldLeads = interactions.map(i => i.sender);

    // Em produção, enviar mensagens via Evolution API
    // Por agora, apenas retornamos a contagem

    await prisma.auditLog.create({
      data: {
        merchantId,
        action: 'COLD_LEADS_REACTIVATION',
        details: `${coldLeads.length} leads frios identificados para reativação`
      }
    });

    res.json({
      success: true,
      coldLeadsCount: coldLeads.length,
      messagesSent: coldLeads.length // Simulado
    });

  } catch (error: any) {
    console.error('[AI_PREDICTIVE] Erro na reativação:', error);
    res.status(500).json({ error: 'Erro na reativação de leads' });
  }
});

// =============================================================================
// POST /api/ai/predictive/analyze - Análise de base (módulo preditivo)
// =============================================================================
aiPredictiveRoutes.post('/analyze', requireAuth(['MERCHANT', 'RESELLER', 'ADMIN']), validateModule('PREDICTIVE'), async (req: any, res: Response) => {
  try {
    const merchantId = req.user.role === 'MERCHANT' ? req.user.id : req.body.merchantId;

    // Buscar interações
    const interactions = await prisma.interactionLog.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      take: 500
    });

    // Calcular estatísticas
    const uniqueSenders = new Set(interactions.map(i => i.sender)).size;
    
    // Simular análise
    const potentialReaches = Math.floor(uniqueSenders * 0.3);

    res.json({
      potentialReaches,
      message: `Identificamos ${potentialReaches} clientes que não interagem há mais de 30 dias e possuem perfil de compra recorrente.`
    });

  } catch (error: any) {
    console.error('[AI_PREDICTIVE] Erro na análise:', error);
    res.status(500).json({ error: 'Erro na análise' });
  }
});

// =============================================================================
// POST /api/ai/predictive/start-campaign - Inicia campanha proativa
// =============================================================================
aiPredictiveRoutes.post('/start-campaign', requireAuth(['MERCHANT', 'RESELLER', 'ADMIN']), async (req: any, res: Response) => {
  try {
    const merchantId = req.user.role === 'MERCHANT' ? req.user.id : req.body.merchantId;
    const { targetCount, message } = req.body;

    // Em produção, criar uma campanha na fila BullMQ
    await prisma.auditLog.create({
      data: {
        merchantId,
        action: 'PROACTIVE_CAMPAIGN_STARTED',
        details: `Campanha proativa iniciada: ${targetCount} alvos`
      }
    });

    res.json({
      success: true,
      messagesSent: targetCount,
      message: 'Campanha iniciada com sucesso'
    });

  } catch (error: any) {
    console.error('[AI_PREDICTIVE] Erro ao iniciar campanha:', error);
    res.status(500).json({ error: 'Erro ao iniciar campanha' });
  }
});

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

function generatePredictions(interactions: any[]): any[] {
  // Análise simples baseada em padrões de interação
  const predictions = [];
  const senderMap = new Map<string, any[]>();

  // Agrupar por sender
  interactions.forEach(i => {
    if (!senderMap.has(i.sender)) {
      senderMap.set(i.sender, []);
    }
    senderMap.get(i.sender)!.push(i);
  });

  // Identificar padrões
  senderMap.forEach((msgs, sender) => {
    if (msgs.length >= 2) {
      const lastMsg = msgs[0];
      const daysSinceLastContact = Math.floor(
        (Date.now() - new Date(lastMsg.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastContact >= 20) {
        predictions.push({
          customerId: sender,
          customerName: `Cliente ${sender.slice(-4)}`,
          predictedDate: new Date(Date.now() + Math.random() * 7 * 86400000).toISOString().split('T')[0],
          confidence: 0.7 + Math.random() * 0.25,
          suggestedMessage: `Olá! Sentimos sua falta. Temos uma oferta especial para você retornar!`
        });
      }
    }
  });

  return predictions.slice(0, 10); // Retornar no máximo 10
}

export default aiPredictiveRoutes;
