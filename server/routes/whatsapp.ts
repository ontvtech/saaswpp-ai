/**
 * ROTAS DE WHATSAPP - SaaSWPP AI
 * Com verificação de limite de instâncias e validação de módulos
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from './auth';
import { callUniversalAI } from '../services/aiOrchestrator';
import { checkInstanceLimit, canMerchantOperate, auditLog } from '../utils/permissions';
import { 
  createInstanceSchema, 
  studyGroupSchema,
  validateOrThrow 
} from '../utils/validators';
import { requireModule } from '../middleware/validateModule';

const prisma = new PrismaClient();
export const whatsappRoutes = Router();

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Todas as rotas exigem autenticação
whatsappRoutes.use(requireAuth(['MERCHANT', 'ADMIN']));

/**
 * Middleware para verificar se o merchant pode operar
 */
const checkMerchantCanOperate = async (req: any, res: any, next: any) => {
  try {
    const merchantId = req.user.role === 'MERCHANT' 
      ? req.user.id 
      : req.user.impersonatedMerchantId;

    if (!merchantId) {
      if (req.user.role === 'ADMIN') {
        return next(); // Admin pode continuar mesmo sem merchant
      }
      return res.status(400).json({ error: 'Merchant não identificado' });
    }

    const check = await canMerchantOperate(merchantId);
    if (!check.canOperate) {
      return res.status(403).json({
        error: check.reason || 'Merchant não pode operar',
        code: 'MERCHANT_CANNOT_OPERATE',
        status: check.status
      });
    }

    req.merchantId = merchantId;
    next();
  } catch (error) {
    console.error('[WHATSAPP] Erro ao verificar merchant:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
};

/**
 * Middleware para verificar posse da instância
 */
const checkInstanceOwnership = async (req: any, res: any, next: any) => {
  const { id } = req.params;
  
  // Admin tem acesso total
  if (req.user.role === 'admin' || req.user.role === 'ADMIN') {
    return next();
  }

  const merchant = await prisma.merchant.findUnique({
    where: { id: req.merchantId || req.user.id }
  });

  if (!merchant || merchant.evolutionInstance !== id) {
    return res.status(403).json({
      error: 'Acesso negado. Você não é proprietário desta instância.',
      code: 'INSTANCE_OWNERSHIP_DENIED'
    });
  }

  next();
};

// =============================================================================
// ROTAS DE INSTÂNCIAS
// =============================================================================

/**
 * GET /instances
 * Lista instâncias do merchant
 */
whatsappRoutes.get('/instances', checkMerchantCanOperate, async (req: any, res: Response) => {
  try {
    const merchantId = req.merchantId || req.user.id;

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: { plan: true }
    });

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant não encontrado' });
    }

    if (!merchant.evolutionInstance) {
      return res.json([]);
    }

    // Buscar status da instância na Evolution API
    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';
    const apiKey = process.env.EVOLUTION_API_KEY;

    try {
      const response = await fetch(
        `${evolutionUrl}/instance/connectionState/${merchant.evolutionInstance}`,
        {
          headers: { 'apikey': apiKey || '' }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        let status = 'disconnected';
        if (data.instance?.state === 'open') status = 'connected';
        else if (data.instance?.state === 'connecting') status = 'connecting';

        return res.json([{
          id: merchant.evolutionInstance,
          name: 'Principal',
          status,
          qrCode: null,
          phone: data.instance?.user?.id || null,
          planLimit: merchant.plan?.instanceLimit || 1
        }]);
      }
    } catch (e) {
      console.error('[WHATSAPP] Erro ao buscar status Evolution:', e);
    }

    // Fallback - retorna instância com status desconhecido
    res.json([{
      id: merchant.evolutionInstance,
      name: 'Principal',
      status: 'disconnected',
      qrCode: null,
      planLimit: merchant.plan?.instanceLimit || 1
    }]);

  } catch (error: any) {
    console.error('[WHATSAPP] Erro ao buscar instâncias:', error);
    res.status(500).json({ error: 'Erro ao buscar instâncias' });
  }
});

/**
 * POST /instances
 * Cria nova instância WhatsApp
 */
whatsappRoutes.post('/instances', checkMerchantCanOperate, async (req: any, res: Response) => {
  try {
    const merchantId = req.merchantId || req.user.id;
    const { name } = req.body;

    // Buscar merchant com plano
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: { plan: true }
    });

    if (!merchant) {
      return res.status(404).json({ error: 'Merchant não encontrado' });
    }

    // Verificar limite de instâncias
    const limitCheck = await checkInstanceLimit(merchantId);
    if (!limitCheck.canCreate) {
      return res.status(403).json({
        error: `Limite de instâncias atingido (${limitCheck.current}/${limitCheck.max})`,
        code: 'INSTANCE_LIMIT_EXCEEDED',
        current: limitCheck.current,
        max: limitCheck.max
      });
    }

    // Se já tem instância, verificar se precisa recriar
    if (merchant.evolutionInstance) {
      return res.status(400).json({
        error: 'Já existe uma instância ativa. Delete a atual antes de criar uma nova.',
        code: 'INSTANCE_ALREADY_EXISTS',
        currentInstance: merchant.evolutionInstance
      });
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';
    const apiKey = process.env.EVOLUTION_API_KEY;
    const instanceName = `inst_${merchant.id.substring(0, 8)}`;

    // 1. Criar instância na Evolution API
    const createRes = await fetch(`${evolutionUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey || ''
      },
      body: JSON.stringify({
        instanceName: instanceName,
        token: apiKey,
        qrcode: true
      })
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error('[WHATSAPP] Evolution API Error:', err);
      return res.status(500).json({
        error: 'Erro ao criar instância na Evolution API',
        details: err
      });
    }

    const data = await createRes.json();

    // 2. Configurar Webhook
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET || 'default-secret';

    try {
      await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey || ''
        },
        body: JSON.stringify({
          url: `${appUrl}/api/webhooks/evolution`,
          enabled: true,
          events: ['messages.upsert'],
          headers: {
            'x-evolution-secret': webhookSecret
          }
        })
      });
    } catch (webhookError) {
      console.error('[WHATSAPP] Erro ao configurar webhook:', webhookError);
      // Continua mesmo sem webhook
    }

    // 3. Salvar instância no merchant
    await prisma.merchant.update({
      where: { id: merchantId },
      data: { evolutionInstance: instanceName }
    });

    // Registrar auditoria
    await auditLog({
      merchantId,
      action: 'INSTANCE_CREATED',
      details: `Instância ${instanceName} criada`,
      ipAddress: req.ip
    });

    res.status(201).json({
      id: instanceName,
      name: name || 'Principal',
      status: 'connecting',
      qrCode: data.qrcode?.base64 || null
    });

  } catch (error: any) {
    console.error('[WHATSAPP] Erro ao criar instância:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /instances/:id
 * Deleta uma instância
 */
whatsappRoutes.delete('/instances/:id', checkInstanceOwnership, async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const merchantId = req.merchantId || req.user.id;

    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';
    const apiKey = process.env.EVOLUTION_API_KEY;

    // Deletar da Evolution API
    try {
      await fetch(`${evolutionUrl}/instance/delete/${id}`, {
        method: 'DELETE',
        headers: { 'apikey': apiKey || '' }
      });
    } catch (e) {
      console.error('[WHATSAPP] Erro ao deletar da Evolution:', e);
    }

    // Remover do merchant
    await prisma.merchant.update({
      where: { id: merchantId },
      data: { evolutionInstance: null }
    });

    // Registrar auditoria
    await auditLog({
      merchantId,
      action: 'INSTANCE_DELETED',
      details: `Instância ${id} deletada`,
      ipAddress: req.ip
    });

    res.json({ success: true });

  } catch (error: any) {
    console.error('[WHATSAPP] Erro ao deletar instância:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /instances/:id/connect
 * Conecta uma instância (gera QR)
 */
whatsappRoutes.post('/instances/:id/connect', checkInstanceOwnership, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';
    const apiKey = process.env.EVOLUTION_API_KEY;

    const response = await fetch(`${evolutionUrl}/instance/connect/${id}`, {
      headers: { 'apikey': apiKey || '' }
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: err });
    }

    const data = await response.json();

    res.json({
      success: true,
      qrCode: data.qrcode?.base64 || null,
      status: data.instance?.state || 'connecting'
    });

  } catch (error: any) {
    console.error('[WHATSAPP] Erro ao conectar:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /instances/:id/disconnect
 * Desconecta uma instância
 */
whatsappRoutes.post('/instances/:id/disconnect', checkInstanceOwnership, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';
    const apiKey = process.env.EVOLUTION_API_KEY;

    await fetch(`${evolutionUrl}/instance/logout/${id}`, {
      method: 'POST',
      headers: { 'apikey': apiKey || '' }
    });

    res.json({ success: true });

  } catch (error: any) {
    console.error('[WHATSAPP] Erro ao desconectar:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /instances/:id/study
 * Estuda um grupo/chat para extrair conhecimento
 */
whatsappRoutes.post(
  '/instances/:id/study',
  checkInstanceOwnership,
  requireModule('ELITE'), // Apenas ELITE pode usar estudo de grupo
  async (req: any, res: Response) => {
    const { id } = req.params;
    const merchantId = req.merchantId || req.user.id;

    try {
      // Validar entrada
      const { remoteJid } = validateOrThrow(studyGroupSchema, req.body);

      const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';
      const apiKey = process.env.EVOLUTION_API_KEY;

      // 1. Buscar últimas mensagens
      const response = await fetch(
        `${evolutionUrl}/chat/findMessages/${id}?remoteJid=${remoteJid}&count=100`,
        {
          headers: { 'apikey': apiKey || '' }
        }
      );

      if (!response.ok) {
        throw new Error('Falha ao buscar mensagens da Evolution API');
      }

      const data = await response.json();
      const messages = data.messages || [];

      if (messages.length === 0) {
        return res.status(400).json({ error: 'Nenhuma mensagem encontrada neste chat/grupo' });
      }

      // 2. Formatar mensagens para IA
      const conversationText = messages
        .map((m: any) => {
          const text = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
          return `${m.pushName || m.key?.remoteJid || 'Desconhecido'}: ${text}`;
        })
        .filter((t: string) => t.length > 5)
        .join('\n');

      if (!conversationText.trim()) {
        return res.status(400).json({ error: 'Não foi possível extrair texto das mensagens' });
      }

      // 3. Estudo com IA
      const systemInstruction = `
        Você é um especialista em treinamento de IAs de atendimento.
        Analise a conversa abaixo e extraia o CONHECIMENTO necessário para atender futuros clientes.
        
        Identifique:
        - Produtos e serviços mencionados (com detalhes)
        - Preços e condições de pagamento
        - Tom de voz e estilo de comunicação da equipe
        - Perguntas frequentes e suas respostas
        - Políticas de entrega, troca e reembolso
        - Horários de funcionamento
        - Informações de contato
        
        Gere um texto ESTRUTURADO e DIRETO que servirá de base de conhecimento.
        Use marcadores e seções para organizar as informações.
      `;

      const knowledge = await callUniversalAI(
        systemInstruction,
        `CONVERSA:\n${conversationText}`,
        process.env.GEMINI_API_KEY || '',
        'gemini-3-flash-preview'
      );

      if (!knowledge) {
        throw new Error('IA falhou ao processar a conversa');
      }

      // 4. Salvar na Base de Conhecimento
      await prisma.knowledgeBase.create({
        data: {
          merchantId,
          title: `[ESTUDO DE GRUPO - ${new Date().toLocaleDateString('pt-BR')}]`,
          content: knowledge,
          source: 'whatsapp_study'
        }
      });

      // Registrar auditoria
      await auditLog({
        merchantId,
        action: 'GROUP_STUDY',
        details: `Estudo de grupo ${remoteJid} realizado`,
        ipAddress: req.ip
      });

      res.json({ success: true, knowledge, messagesAnalyzed: messages.length });

    } catch (error: any) {
      console.error('[WHATSAPP] Erro no estudo de grupo:', error);
      
      if (error.message.startsWith('Erro de validação:')) {
        return res.status(400).json({ error: error.message });
      }
      
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /instances/:id/qr
 * Busca QR Code atual
 */
whatsappRoutes.get('/instances/:id/qr', checkInstanceOwnership, async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';
    const apiKey = process.env.EVOLUTION_API_KEY;

    const response = await fetch(`${evolutionUrl}/instance/connect/${id}`, {
      headers: { 'apikey': apiKey || '' }
    });

    if (!response.ok) {
      return res.status(404).json({ error: 'Instância não encontrada' });
    }

    const data = await response.json();

    res.json({
      qrCode: data.qrcode?.base64 || null,
      status: data.instance?.state || 'disconnected'
    });

  } catch (error: any) {
    console.error('[WHATSAPP] Erro ao buscar QR:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /limits
 * Retorna limites de instâncias do merchant
 */
whatsappRoutes.get('/limits', checkMerchantCanOperate, async (req: any, res: Response) => {
  try {
    const merchantId = req.merchantId || req.user.id;
    const limitCheck = await checkInstanceLimit(merchantId);

    res.json(limitCheck);

  } catch (error: any) {
    console.error('[WHATSAPP] Erro ao buscar limites:', error);
    res.status(500).json({ error: 'Erro ao buscar limites' });
  }
});
