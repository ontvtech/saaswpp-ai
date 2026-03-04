/**
 * ROTAS PARA TODAS AS FEATURES - SaaSWPP AI
 */

import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';

// Importar serviços
import { interactiveMessagesService, dynamicTemplatesService, heatmapService } from '../services/startFeaturesService';
import { mediaSendingService, roiService, calendarService } from '../services/proFeaturesService';
import { sentimentAnalysisService, autoTriggersService, messageSequencesService } from '../services/enterpriseFeaturesService';
import { longTermMemoryService, flowBuilderService, webhooksService } from '../services/eliteFeaturesService';
import { autonomousAgentsService, publicApiService, voiceResponsesService } from '../services/ninjaFeaturesService';

export const allFeaturesRouter = Router();

// =============================================================================
// START FEATURES (R$ 97)
// =============================================================================

// Interactive Messages
allFeaturesRouter.post('/start/interactive/buttons', authenticate, async (req: Request, res: Response) => {
  try {
    const { instanceName, to, message } = req.body;
    const result = await interactiveMessagesService.sendButtonMessage(instanceName, to, message);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.post('/start/interactive/list', authenticate, async (req: Request, res: Response) => {
  try {
    const { instanceName, to, message } = req.body;
    const result = await interactiveMessagesService.sendListMessage(instanceName, to, message);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Dynamic Templates
allFeaturesRouter.get('/start/templates', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const templates = await dynamicTemplatesService.listTemplates(user.merchantId || user.id);
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.post('/start/templates', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const template = await dynamicTemplatesService.createTemplate(user.merchantId || user.id, req.body);
    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.post('/start/templates/use', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { templateKey, variables } = req.body;
    const message = await dynamicTemplatesService.useTemplate(user.merchantId || user.id, templateKey, variables);
    res.json({ message });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Heatmap
allFeaturesRouter.get('/start/heatmap', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const days = parseInt(req.query.days as string) || 30;
    const heatmap = await heatmapService.generateHeatmap(user.merchantId || user.id, days);
    res.json(heatmap);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.get('/start/heatmap/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const stats = await heatmapService.getHeatmapStats(user.merchantId || user.id);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.get('/start/heatmap/recommendations', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const recommendations = await heatmapService.getRecommendations(user.merchantId || user.id);
    res.json(recommendations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// PRO FEATURES (R$ 247)
// =============================================================================

// Media Sending
allFeaturesRouter.post('/pro/media/image', authenticate, async (req: Request, res: Response) => {
  try {
    const { instanceName, message } = req.body;
    const result = await mediaSendingService.sendImage(instanceName, message);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.post('/pro/media/video', authenticate, async (req: Request, res: Response) => {
  try {
    const { instanceName, message } = req.body;
    const result = await mediaSendingService.sendVideo(instanceName, message);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.post('/pro/media/audio', authenticate, async (req: Request, res: Response) => {
  try {
    const { instanceName, to, audioUrl } = req.body;
    const result = await mediaSendingService.sendAudio(instanceName, to, audioUrl);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.post('/pro/media/document', authenticate, async (req: Request, res: Response) => {
  try {
    const { instanceName, message } = req.body;
    const result = await mediaSendingService.sendDocument(instanceName, message);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ROI Dashboard
allFeaturesRouter.get('/pro/roi', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const period = (req.query.period as 'week' | 'month' | 'quarter') || 'month';
    const roi = await roiService.calculateROI(user.merchantId || user.id, period);
    res.json(roi);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.get('/pro/roi/trends', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const days = parseInt(req.query.days as string) || 30;
    const trends = await roiService.getTrends(user.merchantId || user.id, days);
    res.json(trends);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.get('/pro/roi/report', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const report = await roiService.generateReport(user.merchantId || user.id);
    res.type('text/markdown').send(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.post('/pro/roi/sale', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    await roiService.trackSale(user.merchantId || user.id, req.body);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Calendar Sync
allFeaturesRouter.post('/pro/calendar/sync', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = await calendarService.syncAppointment(user.merchantId || user.id, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.get('/pro/calendar/events', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const start = new Date(req.query.start as string);
    const end = new Date(req.query.end as string);
    const events = await calendarService.getEvents(user.merchantId || user.id, start, end);
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.get('/pro/calendar/oauth', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const url = calendarService.getGoogleOAuthUrl(user.merchantId || user.id);
    res.json({ url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// ENTERPRISE FEATURES (R$ 497)
// =============================================================================

// Sentiment Analysis
allFeaturesRouter.post('/enterprise/sentiment/analyze', authenticate, async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const result = await sentimentAnalysisService.analyzeSentiment(message);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.get('/enterprise/sentiment/alerts', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const alerts = await sentimentAnalysisService.getPendingAlerts(user.merchantId || user.id);
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Auto Triggers
allFeaturesRouter.get('/enterprise/triggers', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const triggers = await autoTriggersService.listTriggers(user.merchantId || user.id);
    res.json(triggers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.post('/enterprise/triggers', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const trigger = await autoTriggersService.createTrigger(user.merchantId || user.id, req.body);
    res.json(trigger);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.get('/enterprise/triggers/templates', authenticate, async (req: Request, res: Response) => {
  try {
    const templates = autoTriggersService.getTriggerTemplates();
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Message Sequences
allFeaturesRouter.get('/enterprise/sequences', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const campaigns = await messageSequencesService.listCampaigns(user.merchantId || user.id);
    res.json(campaigns);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.post('/enterprise/sequences', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const campaign = await messageSequencesService.createCampaign(user.merchantId || user.id, req.body);
    res.json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.post('/enterprise/sequences/:id/pause', authenticate, async (req: Request, res: Response) => {
  try {
    await messageSequencesService.pauseCampaign(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.get('/enterprise/sequences/templates', authenticate, async (req: Request, res: Response) => {
  try {
    const templates = messageSequencesService.getCampaignTemplates();
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// ELITE FEATURES (R$ 997)
// =============================================================================

// Long-term Memory
allFeaturesRouter.get('/elite/memory/:phone', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const memory = await longTermMemoryService.getOrCreateMemory(user.merchantId || user.id, req.params.phone);
    res.json(memory);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.get('/elite/memory/:phone/context', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const context = await longTermMemoryService.generateAIContext(user.merchantId || user.id, req.params.phone);
    res.type('text/plain').send(context);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.post('/elite/memory/:phone/preference', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { preference } = req.body;
    await longTermMemoryService.learnPreference(user.merchantId || user.id, req.params.phone, preference);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Flow Builder
allFeaturesRouter.get('/elite/flows', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const flows = await flowBuilderService.listFlows(user.merchantId || user.id);
    res.json(flows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.post('/elite/flows', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const flow = await flowBuilderService.createFlow(user.merchantId || user.id, req.body);
    res.json(flow);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.post('/elite/flows/:id/execute', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const result = await flowBuilderService.executeFlow(req.params.id, {
      merchantId: user.merchantId || user.id,
      ...req.body
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Webhooks
allFeaturesRouter.get('/elite/webhooks', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const webhooks = await webhooksService.getAvailableEvents();
    res.json(webhooks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.post('/elite/webhooks', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const webhook = await webhooksService.createWebhook(user.merchantId || user.id, req.body);
    res.json(webhook);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.post('/elite/webhooks/:id/test', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await webhooksService.testWebhook(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// NINJA FEATURES (R$ 1.997)
// =============================================================================

// Autonomous Agents
allFeaturesRouter.post('/ninja/agents/analyze', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { message, context } = req.body;
    const decision = await autonomousAgentsService.analyzeAndAct(
      user.merchantId || user.id,
      message,
      context
    );
    res.json(decision);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.post('/ninja/agents/execute', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { action } = req.body;
    const result = await autonomousAgentsService.executeAction(user.merchantId || user.id, action);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Public API Keys
allFeaturesRouter.get('/ninja/api-keys', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const keys = await publicApiService.listApiKeys(user.merchantId || user.id);
    res.json(keys);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.post('/ninja/api-keys', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, permissions, rateLimit, expiresInDays } = req.body;
    const key = await publicApiService.generateApiKey(
      user.merchantId || user.id,
      name,
      permissions,
      rateLimit,
      expiresInDays
    );
    res.json(key);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.delete('/ninja/api-keys/:id', authenticate, async (req: Request, res: Response) => {
  try {
    await publicApiService.revokeApiKey(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.get('/ninja/api/docs', authenticate, async (req: Request, res: Response) => {
  try {
    const docs = publicApiService.getApiDocumentation();
    res.json(docs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Voice TTS
allFeaturesRouter.get('/ninja/voice/voices', authenticate, async (req: Request, res: Response) => {
  try {
    const voices = voiceResponsesService.getAvailableVoices();
    res.json(voices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.post('/ninja/voice/generate', authenticate, async (req: Request, res: Response) => {
  try {
    const { text, config } = req.body;
    const result = await voiceResponsesService.textToSpeech(text, config);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

allFeaturesRouter.post('/ninja/voice/send', authenticate, async (req: Request, res: Response) => {
  try {
    const { instanceName, to, text, config } = req.body;
    const result = await voiceResponsesService.sendVoiceMessage(instanceName, to, text, config);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default allFeaturesRouter;
