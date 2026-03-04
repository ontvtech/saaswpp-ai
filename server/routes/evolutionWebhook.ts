import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { processIncomingMessage } from '../services/aiOrchestrator';
import { setPause, consumeBotExpectation } from '../services/redisService';

const prisma = new PrismaClient();
export const evolutionWebhookHandler = Router();

// Module 3.5: The RAG Orchestrator (Real Context)
evolutionWebhookHandler.post('/', async (req, res) => {
  const { event, instance, data } = req.body;
  const webhookSecret = req.headers['x-evolution-secret'];

  // 0. Validate Webhook Secret
  if (process.env.EVOLUTION_WEBHOOK_SECRET && webhookSecret !== process.env.EVOLUTION_WEBHOOK_SECRET) {
    return res.status(401).send('UNAUTHORIZED');
  }

  // 1. Filter only incoming messages
  if (event !== 'messages.upsert') {
    return res.status(200).send('IGNORED');
  }

  const sender = data.key?.remoteJid;
  if (!sender) return res.status(200).send('NO_SENDER');

  // 2. Detect Manual Message (Handoff Trigger)
  if (data.key?.fromMe) {
    const isBot = await consumeBotExpectation(instance, sender);
    if (isBot) return res.status(200).send('BOT_MESSAGE_IGNORED');

    const merchant = await prisma.merchant.findUnique({ where: { evolutionInstance: instance } });
    if (merchant) {
      await setPause(merchant.id, sender, 30);
    }
    return res.status(200).send('FROM_ME_HANDLED');
  }

  const messageContent = data.message?.conversation || data.message?.extendedTextMessage?.text;
  if (!messageContent) return res.status(200).send('NO_CONTENT');

  try {
    const merchant = await prisma.merchant.findUnique({ where: { evolutionInstance: instance } });
    if (!merchant) return res.status(404).send('MERCHANT_NOT_FOUND');

    await processIncomingMessage({
      merchantId: merchant.id,
      sender: sender,
      text: messageContent,
      apiType: 'EVOLUTION',
      instanceId: instance
    });
    
    res.status(200).send('PROCESSED');
  } catch (error: any) {
    console.error('[WEBHOOK] Evolution Processing Error:', error);
    res.status(500).send('ERROR');
  }
});
