/**
 * ROTAS DE GERENCIAMENTO DO POOL DE IA
 * SaaSWPP AI - Múltiplas chaves com modos configuráveis
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  getPoolStatus, 
  reloadPool, 
  testAIConnection,
  processWithAI,
  AIProvider 
} from '../services/aiOrchestrator';
import { aiKeyPool, PoolMode } from '../services/aiKeyPool';
import { requireAdmin } from '../utils/permissions';

const router = Router();
const prisma = new PrismaClient();

// =============================================================================
// CONFIGURAÇÃO DO POOL (MODO DE OPERAÇÃO)
// =============================================================================

/**
 * Obter configuração atual do pool
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = aiKeyPool.getConfig();
    
    res.json({
      success: true,
      config: {
        mode: config.mode,
        maxKeys: config.maxKeys,
        defaultProvider: config.defaultProvider,
        modes: {
          SEQUENTIAL: 'Usa chaves em ordem (K1 → K2 → K3...)',
          FALLBACK: 'Usa principal, se falhar tenta próxima',
          SIMULTANEOUS: 'Usa todas ao mesmo tempo (máx. capacidade)'
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Atualizar configuração do pool
 */
router.put('/config', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { mode, maxKeys, defaultProvider } = req.body;
    
    const newConfig: Partial<{
      mode: PoolMode;
      maxKeys: number;
      defaultProvider: AIProvider;
    }> = {};
    
    if (mode && ['SEQUENTIAL', 'FALLBACK', 'SIMULTANEOUS'].includes(mode)) {
      newConfig.mode = mode as PoolMode;
    }
    
    if (maxKeys && Number.isInteger(maxKeys) && maxKeys > 0) {
      newConfig.maxKeys = maxKeys;
    }
    
    if (defaultProvider && ['GEMINI', 'GLM', 'OPENAI', 'ANTHROPIC', 'DEEPSEEK'].includes(defaultProvider)) {
      newConfig.defaultProvider = defaultProvider as AIProvider;
    }
    
    await aiKeyPool.setConfig(newConfig);
    
    res.json({
      success: true,
      message: 'Configuração atualizada',
      config: aiKeyPool.getConfig()
    });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// STATUS DO POOL
// =============================================================================

router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = getPoolStatus();
    
    res.json({
      success: true,
      pool: status,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// ADICIONAR CHAVE AO POOL
// =============================================================================

router.post('/keys', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { provider, key, model, priority, tier, tokenLimit } = req.body;
    
    if (!provider || !key) {
      return res.status(400).json({ error: 'Provider e key são obrigatórios' });
    }
    
    // Testar chave antes de adicionar
    console.log(`[AI-POOL] Testando nova chave ${provider}...`);
    const testResult = await testAIConnection(provider as AIProvider, key, model);
    
    if (!testResult.success) {
      return res.status(400).json({ 
        error: `Chave inválida para ${provider}`,
        details: testResult.error 
      });
    }
    
    // Salvar no banco
    const newKey = await prisma.aiKey.create({
      data: {
        provider,
        key,
        model: model || null,
        priority: priority || 0,
        tier: tier || 'BASIC',
        status: 'active',
        tokenLimit: tokenLimit || 1000000,
        tokensUsed: 0,
        requestLimit: 10000,
        requestsUsed: 0,
        usageCount: 0,
        totalRequests: 0,
        totalTokens: 0,
        errorCount: 0,
        weight: 1,
        lastUsed: new Date()
      }
    });
    
    // Recarregar pool
    await reloadPool();
    
    console.log(`[AI-POOL] ✅ Nova chave adicionada: ${newKey.id.substring(0, 8)}... (${provider})`);
    
    res.json({
      success: true,
      key: {
        id: newKey.id,
        provider: newKey.provider,
        model: newKey.model,
        tier: newKey.tier,
        status: newKey.status,
        latency: testResult.latency
      }
    });
    
  } catch (error: any) {
    console.error('[AI-POOL] Erro ao adicionar chave:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// ADICIONAR MÚLTIPLAS CHAVES (BULK) - Para as 30 chaves GLM!
// =============================================================================

router.post('/keys/bulk', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { keys } = req.body; // Array de { provider, key, model }
    
    if (!Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: 'Array de chaves é obrigatório' });
    }
    
    const results = {
      added: 0,
      failed: 0,
      errors: [] as string[]
    };
    
    for (const keyData of keys) {
      try {
        const { provider, key, model } = keyData;
        
        if (!provider || !key) {
          results.failed++;
          results.errors.push(`Chave inválida: ${JSON.stringify(keyData)}`);
          continue;
        }
        
        // Verificar se já existe
        const existing = await prisma.aiKey.findUnique({
          where: { key }
        });
        
        if (existing) {
          results.failed++;
          results.errors.push(`Chave já existe: ${key.substring(0, 10)}...`);
          continue;
        }
        
        // Criar no banco
        await prisma.aiKey.create({
          data: {
            provider,
            key,
            model: model || null,
            priority: 0,
            tier: 'BASIC',
            status: 'active',
            tokenLimit: 1000000,
            tokensUsed: 0,
            requestLimit: 10000,
            requestsUsed: 0,
            usageCount: 0,
            totalRequests: 0,
            totalTokens: 0,
            errorCount: 0,
            weight: 1,
            lastUsed: new Date()
          }
        });
        
        results.added++;
        
      } catch (error: any) {
        results.failed++;
        results.errors.push(error.message);
      }
    }
    
    // Recarregar pool
    await reloadPool();
    
    console.log(`[AI-POOL] ✅ Bulk add: ${results.added} adicionadas, ${results.failed} falharam`);
    
    res.json({
      success: true,
      results,
      pool: getPoolStatus()
    });
    
  } catch (error: any) {
    console.error('[AI-POOL] Erro no bulk add:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// LISTAR CHAVES
// =============================================================================

router.get('/keys', async (req: Request, res: Response) => {
  try {
    const keys = await prisma.aiKey.findMany({
      select: {
        id: true,
        provider: true,
        model: true,
        tier: true,
        status: true,
        tokenLimit: true,
        tokensUsed: true,
        requestLimit: true,
        requestsUsed: true,
        usageCount: true,
        errorCount: true,
        lastUsed: true,
        priority: true,
        weight: true,
        // Não retornar a key completa por segurança
        key: {
          select: {
            // Apenas primeiros e últimos caracteres
          }
        }
      },
      orderBy: [
        { provider: 'asc' },
        { priority: 'desc' }
      ]
    });
    
    // Mascarar chaves
    const maskedKeys = keys.map(k => ({
      ...k,
      keyMasked: '***' // Não mostrar a chave
    }));
    
    res.json({
      success: true,
      keys: maskedKeys,
      total: keys.length,
      active: keys.filter(k => k.status === 'active').length
    });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// REMOVER CHAVE
// =============================================================================

router.delete('/keys/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.aiKey.delete({
      where: { id }
    });
    
    // Recarregar pool
    await reloadPool();
    
    res.json({
      success: true,
      message: 'Chave removida do pool'
    });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// TESTAR CHAVE ESPECÍFICA
// =============================================================================

router.post('/keys/:id/test', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const keyData = await prisma.aiKey.findUnique({
      where: { id }
    });
    
    if (!keyData) {
      return res.status(404).json({ error: 'Chave não encontrada' });
    }
    
    const result = await testAIConnection(
      keyData.provider as AIProvider,
      keyData.key,
      keyData.model || undefined
    );
    
    res.json({
      success: result.success,
      latency: result.latency,
      error: result.error
    });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// TESTAR TODAS AS CHAVES
// =============================================================================

router.post('/keys/test-all', requireAdmin, async (req: Request, res: Response) => {
  try {
    const keys = await prisma.aiKey.findMany();
    
    const results = {
      total: keys.length,
      working: 0,
      failed: 0,
      details: [] as any[]
    };
    
    for (const keyData of keys) {
      const result = await testAIConnection(
        keyData.provider as AIProvider,
        keyData.key,
        keyData.model || undefined
      );
      
      if (result.success) {
        results.working++;
        // Atualizar status se estava com erro
        if (keyData.status === 'error') {
          await prisma.aiKey.update({
            where: { id: keyData.id },
            data: { status: 'active', lastError: null }
          });
        }
      } else {
        results.failed++;
        // Marcar como erro
        await prisma.aiKey.update({
          where: { id: keyData.id },
          data: { status: 'error', lastError: result.error }
        });
      }
      
      results.details.push({
        id: keyData.id.substring(0, 8),
        provider: keyData.provider,
        success: result.success,
        latency: result.latency,
        error: result.error
      });
    }
    
    // Recarregar pool
    await reloadPool();
    
    res.json({
      success: true,
      results
    });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// RECARREGAR POOL
// =============================================================================

router.post('/reload', requireAdmin, async (req: Request, res: Response) => {
  try {
    await reloadPool();
    
    res.json({
      success: true,
      message: 'Pool recarregado',
      status: getPoolStatus()
    });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// TESTE DE PROCESSAMENTO
// =============================================================================

router.post('/test', async (req: Request, res: Response) => {
  try {
    const { message, provider } = req.body;
    
    const response = await processWithAI(
      [
        { role: 'system', content: 'Você é um assistente de atendimento via WhatsApp. Responda de forma breve e amigável.' },
        { role: 'user', content: message || 'Olá, tudo bem?' }
      ],
      provider as AIProvider,
      true  // Com humanização
    );
    
    res.json({
      success: true,
      response: response.content,
      provider: response.provider,
      model: response.model,
      tokensUsed: response.tokensUsed,
      latency: response.latency,
      keyId: response.keyId?.substring(0, 8)
    });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
