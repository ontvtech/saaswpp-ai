/**
 * POOL DE CHAVES IA - SaaSWPP AI
 * Versão: 2.0.0
 * 
 * Implementa as três estratégias de gerenciamento de chaves:
 * 1. ROTAÇÃO: Usa uma chave por vez, troca ao atingir limite
 * 2. BALANCEAMENTO: Distribui requisições entre todas as ativas
 * 3. FAILOVER: Usa primária, secundárias apenas em caso de falha
 */

import { PrismaClient } from '@prisma/client';
import type { PoolStrategy, KeyStatus, AIProvider, AIKey, PoolConfig } from '../types';

const prisma = new PrismaClient();

// =============================================================================
// CONFIGURAÇÃO PADRÃO
// =============================================================================

const DEFAULT_POOL_CONFIG: PoolConfig = {
  strategy: 'rotation',
  threshold: 90,        // Troca de chave ao atingir 90%
  maxErrors: 3,         // Pausa chave após 3 erros consecutivos
  retryDelay: 60000,    // 1 minuto antes de tentar chave com erro
  simultaneous: 5,      // 5 chaves simultâneas no load_balance
};

// =============================================================================
// CLASSE PRINCIPAL DO POOL
// =============================================================================

export class AIKeyPool {
  private config: PoolConfig;
  private currentIndex: number = 0;
  private lastRotation: Date = new Date();
  private errorCounts: Map<string, number> = new Map();

  constructor(config?: Partial<PoolConfig>) {
    this.config = { ...DEFAULT_POOL_CONFIG, ...config };
  }

  /**
   * Obtém a melhor chave baseada na estratégia configurada
   */
  async getKey(strategy?: PoolStrategy): Promise<string | null> {
    const activeStrategy = strategy || this.config.strategy;

    switch (activeStrategy) {
      case 'rotation':
        return this.getRotationKey();
      case 'load_balance':
        return this.getLoadBalanceKey();
      case 'failover':
        return this.getFailoverKey();
      default:
        return this.getRotationKey();
    }
  }

  /**
   * ESTRATÉGIA 1: ROTAÇÃO SEQUENCIAL
   * Usa uma chave por vez, troca quando atinge o threshold
   */
  private async getRotationKey(): Promise<string | null> {
    const keys = await this.getActiveKeys();
    if (keys.length === 0) return this.getFallbackKey();

    // Verifica se a chave atual está perto do limite
    const currentKey = keys[this.currentIndex % keys.length];
    const usagePercent = (currentKey.usageCount / this.getLimitForKey(currentKey)) * 100;

    if (usagePercent >= this.config.threshold) {
      // Troca para a próxima chave
      this.currentIndex = (this.currentIndex + 1) % keys.length;
      this.lastRotation = new Date();
      console.log(`[POOL] Rotacionando chave: ${currentKey.id} -> ${keys[this.currentIndex].id}`);
    }

    const selectedKey = keys[this.currentIndex % keys.length];
    await this.recordUsage(selectedKey.id);
    return selectedKey.key;
  }

  /**
   * ESTRATÉGIA 2: BALANCEAMENTO DE CARGA
   * Distribui requisições entre as chaves ativas proporcionalmente
   */
  private async getLoadBalanceKey(): Promise<string | null> {
    const keys = await this.getActiveKeys();
    if (keys.length === 0) return this.getFallbackKey();

    // Ordena por menor uso
    const sortedKeys = keys.sort((a, b) => {
      const usageA = a.usageCount / this.getLimitForKey(a);
      const usageB = b.usageCount / this.getLimitForKey(b);
      return usageA - usageB;
    });

    // Seleciona as N chaves menos usadas (simultâneas)
    const availableKeys = sortedKeys.slice(0, Math.min(this.config.simultaneous, sortedKeys.length));
    
    // Escolhe aleatoriamente entre as disponíveis (com peso)
    const selectedKey = this.selectWeighted(availableKeys);
    await this.recordUsage(selectedKey.id);
    return selectedKey.key;
  }

  /**
   * ESTRATÉGIA 3: FAILOVER (ALTA DISPONIBILIDADE)
   * Usa chave primária, secundárias apenas em caso de falha
   */
  private async getFailoverKey(): Promise<string | null> {
    const keys = await this.getActiveKeys();
    if (keys.length === 0) return this.getFallbackKey();

    // Ordena por prioridade (maior primeiro)
    const sortedKeys = keys.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const key of sortedKeys) {
      // Verifica se não está pausada por erro
      if (this.isKeyAvailable(key)) {
        const usagePercent = (key.usageCount / this.getLimitForKey(key)) * 100;
        
        // Se a chave principal está ok, usa ela
        if (usagePercent < this.config.threshold) {
          await this.recordUsage(key.id);
          return key.key;
        }
      }
    }

    // Se todas as chaves falharam, retorna fallback
    return this.getFallbackKey();
  }

  // =============================================================================
  // MÉTODOS AUXILIARES
  // =============================================================================

  /**
   * Obtém todas as chaves ativas do banco
   */
  private async getActiveKeys(): Promise<any[]> {
    try {
      const keys = await prisma.aiKey.findMany({
        where: { status: 'active' },
        orderBy: { lastUsed: 'asc' }
      });
      return keys;
    } catch (error) {
      console.error('[POOL] Erro ao buscar chaves:', error);
      return [];
    }
  }

  /**
   * Chave de fallback (variável de ambiente)
   */
  private getFallbackKey(): string | null {
    const fallbackKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (fallbackKey) {
      console.warn('[POOL] Usando chave de fallback (env)');
    }
    return fallbackKey || null;
  }

  /**
   * Limite de uso para uma chave
   */
  private getLimitForKey(key: any): number {
    // Limite padrão por tier
    const tierLimits: Record<string, number> = {
      'BASIC': 1000000,      // 1M tokens
      'PREMIUM': 5000000,    // 5M tokens
      'ENTERPRISE': 50000000 // 50M tokens
    };
    return tierLimits[key.tier] || 1000000;
  }

  /**
   * Verifica se uma chave está disponível
   */
  private isKeyAvailable(key: any): boolean {
    const errors = this.errorCounts.get(key.id) || 0;
    if (errors >= this.config.maxErrors) {
      // Verifica se já passou tempo suficiente para tentar novamente
      const timeSinceLastError = Date.now() - (key.lastUsed?.getTime() || 0);
      return timeSinceLastError > this.config.retryDelay;
    }
    return true;
  }

  /**
   * Seleciona uma chave com peso (para load_balance)
   */
  private selectWeighted(keys: any[]): any {
    // Quanto menos usada, maior o peso
    const weights = keys.map(k => {
      const usage = k.usageCount / this.getLimitForKey(k);
      return 1 - usage; // Inverso do uso
    });

    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < keys.length; i++) {
      random -= weights[i];
      if (random <= 0) return keys[i];
    }

    return keys[0];
  }

  /**
   * Registra uso de uma chave
   */
  private async recordUsage(keyId: string): Promise<void> {
    try {
      await prisma.aiKey.update({
        where: { id: keyId },
        data: {
          usageCount: { increment: 1 },
          lastUsed: new Date()
        }
      });
    } catch (error) {
      console.error('[POOL] Erro ao registrar uso:', error);
    }
  }

  /**
   * Registra erro em uma chave
   */
  async recordError(keyId: string, error: string): Promise<void> {
    const currentErrors = this.errorCounts.get(keyId) || 0;
    this.errorCounts.set(keyId, currentErrors + 1);

    console.error(`[POOL] Erro na chave ${keyId}: ${error} (${currentErrors + 1} erros)`);

    // Se atingiu máximo de erros, pausa a chave
    if (currentErrors + 1 >= this.config.maxErrors) {
      await this.pauseKey(keyId, error);
    }
  }

  /**
   * Pausa uma chave
   */
  private async pauseKey(keyId: string, reason: string): Promise<void> {
    try {
      await prisma.aiKey.update({
        where: { id: keyId },
        data: {
          status: 'paused',
          lastError: reason
        }
      });
      console.warn(`[POOL] Chave ${keyId} pausada: ${reason}`);
    } catch (error) {
      console.error('[POOL] Erro ao pausar chave:', error);
    }
  }

  /**
   * Reseta contador de erros de uma chave
   */
  async resetErrors(keyId: string): Promise<void> {
    this.errorCounts.delete(keyId);
    try {
      await prisma.aiKey.update({
        where: { id: keyId },
        data: {
          status: 'active',
          lastError: null
        }
      });
    } catch (error) {
      console.error('[POOL] Erro ao resetar erros:', error);
    }
  }

  /**
   * Estatísticas do pool
   */
  async getStats(): Promise<{
    totalKeys: number;
    activeKeys: number;
    pausedKeys: number;
    totalUsage: number;
    strategy: PoolStrategy;
    recommendedAction: string;
  }> {
    const keys = await prisma.aiKey.findMany();
    const activeKeys = keys.filter(k => k.status === 'active');
    const pausedKeys = keys.filter(k => k.status === 'paused');
    const totalUsage = keys.reduce((sum, k) => sum + (k.usageCount || 0), 0);

    let recommendedAction = 'Nenhuma ação necessária';
    if (activeKeys.length === 0) {
      recommendedAction = 'URGENTE: Adicione chaves de API ao pool';
    } else if (activeKeys.length < 3) {
      recommendedAction = 'Recomendado: Adicione mais chaves para redundância';
    } else if (pausedKeys.length > activeKeys.length) {
      recommendedAction = 'Atenção: Muitas chaves pausadas. Verifique erros.';
    }

    return {
      totalKeys: keys.length,
      activeKeys: activeKeys.length,
      pausedKeys: pausedKeys.length,
      totalUsage,
      strategy: this.config.strategy,
      recommendedAction
    };
  }

  /**
   * Atualiza estratégia
   */
  setStrategy(strategy: PoolStrategy): void {
    this.config.strategy = strategy;
    console.log(`[POOL] Estratégia alterada para: ${strategy}`);
  }

  /**
   * Atualiza configuração
   */
  updateConfig(config: Partial<PoolConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('[POOL] Configuração atualizada:', this.config);
  }
}

// =============================================================================
// INSTÂNCIA GLOBAL
// =============================================================================

export const aiKeyPool = new AIKeyPool();

/**
 * Função simplificada para obter chave
 */
export async function getAIKey(strategy?: PoolStrategy): Promise<string | null> {
  return aiKeyPool.getKey(strategy);
}

/**
 * Função simplificada para registrar erro
 */
export async function recordKeyError(keyId: string, error: string): Promise<void> {
  return aiKeyPool.recordError(keyId, error);
}

export default aiKeyPool;
