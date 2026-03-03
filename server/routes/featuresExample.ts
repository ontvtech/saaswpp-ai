/**
 * EXEMPLO DE USO DO SISTEMA DE FEATURES NAS ROTAS
 * 
 * Mostra como usar o middleware requireFeature() para proteger rotas
 */

import { Router } from 'express';
import { requireFeature } from '../middleware/validateFeature';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Todas as rotas precisam de autenticação
router.use(requireAuth(['MERCHANT']));

// =============================================================================
// EXEMPLOS DE ROTAS PROTEGIDAS POR FEATURE
// =============================================================================

/**
 * Enviar mídia (imagem, vídeo, áudio)
 * Requer: SALES_PRO ou superior
 */
router.post('/send-media', requireFeature('MEDIA_SENDING'), async (req, res) => {
  // Só chega aqui se o merchant tem SALES_PRO ou superior
  const { to, type, url, caption } = req.body;
  
  // Lógica de envio de mídia...
  
  res.json({ success: true, message: 'Mídia enviada' });
});

/**
 * Dashboard de ROI
 * Requer: SALES_PRO ou superior
 */
router.get('/roi-dashboard', requireFeature('ROI_DASHBOARD'), async (req, res) => {
  // Retorna dados de ROI
  res.json({
    salesGenerated: 15000,
    conversionRate: 0.12,
    averageTicket: 150
  });
});

/**
 * Análise de sentimento em tempo real
 * Requer: PREDICTIVE ou superior
 */
router.get('/sentiment', requireFeature('SENTIMENT_ANALYSIS'), async (req, res) => {
  // Retorna análise de sentimento
  res.json({
    positive: 65,
    neutral: 25,
    negative: 10,
    alerts: [
      { phone: '5511999999999', score: -0.8, reason: 'Palavras: "procon", "advogado"' }
    ]
  });
});

/**
 * Criar sequência de mensagens (drip campaign)
 * Requer: PREDICTIVE ou superior
 */
router.post('/drip-campaigns', requireFeature('DRIP_CAMPAIGNS'), async (req, res) => {
  const { name, steps, targetSegment } = req.body;
  
  // Criar campanha...
  
  res.json({ success: true, campaignId: 'uuid' });
});

/**
 * Memória de longo prazo
 * Requer: ELITE ou superior
 */
router.get('/client-memory/:phone', requireFeature('LONG_TERM_MEMORY'), async (req, res) => {
  const { phone } = req.params;
  
  // Buscar memórias do cliente...
  
  res.json({
    phone,
    totalInteractions: 47,
    firstContact: '2024-01-15',
    preferences: ['agenda pela manhã', 'prefere PIX'],
    lastPurchase: '2024-02-20'
  });
});

/**
 * Builder de fluxos visuais
 * Requer: ELITE ou superior
 */
router.post('/flows', requireFeature('FLOW_BUILDER'), async (req, res) => {
  // Criar fluxo...
  res.json({ success: true });
});

/**
 * Agentes autônomos (executar ações)
 * Requer: NINJA
 */
router.post('/agents/execute', requireFeature('AUTONOMOUS_AGENTS'), async (req, res) => {
  const { action, params } = req.body;
  
  // Validar ação
  const allowedActions = ['CREATE_ORDER', 'SEND_INVOICE', 'PROCESS_PAYMENT'];
  if (!allowedActions.includes(action)) {
    return res.status(400).json({ error: 'Ação não permitida' });
  }
  
  // Executar ação...
  
  res.json({ success: true, result: 'Ação executada' });
});

/**
 * Gerar resposta de voz (TTS)
 * Requer: NINJA
 */
router.post('/voice/generate', requireFeature('VOICE_RESPONSES_TTS'), async (req, res) => {
  const { text, voice } = req.body;
  
  // Gerar áudio via TTS...
  
  res.json({ 
    success: true, 
    audioUrl: 'https://storage/audio.mp3',
    duration: 5.2
  });
});

/**
 * API Pública
 * Requer: NINJA
 */
router.get('/public/contacts', requireFeature('PUBLIC_API'), async (req, res) => {
  // Listar contatos via API pública
  res.json({ contacts: [] });
});

export default router;

// =============================================================================
// EXEMPLO DE RESPOSTA QUANDO NÃO TEM ACESSO
// =============================================================================

/*
GET /api/features/roi-dashboard
Response 403:

{
  "error": "Feature 'Dashboard de ROI' requer o módulo SALES_PRO. Faça upgrade do seu plano.",
  "requiredFeature": "ROI_DASHBOARD",
  "requiredModule": "SALES_PRO",
  "currentModules": ["ESSENTIAL"],
  "upgradeUrl": "/my-plan"
}
*/
