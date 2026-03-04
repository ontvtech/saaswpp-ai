/**
 * POOL DE CHAVES AI - SaaSWPP AI
 * Sistema de rotação com múltiplas chaves
 * 
 * MODOS DE OPERAÇÃO:
 * - SEQUENTIAL: Usa uma chave por vez, em ordem (K1 → K2 → K3 → K1...)
 * - FALLBACK: Usa uma chave principal, se falhar tenta a próxima
 * - SIMULTANEOUS: Usa todas as chaves ao mesmo tempo (máxima capacidade)
 * 
 * HUMANIZAÇÃO:
 * - Delay aleatório + variação de respostas
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// TIPOS
// =============================================================================

export type AIProvider = 'GEMINI' | 'OPENAI' | 'ANTHROPIC' | 'GLM' | 'DEEPSEEK';
export type PoolMode = 'SEQUENTIAL' | 'FALLBACK' | 'SIMULTANEOUS';

export interface PoolKey {
  id: string;
  provider: AIProvider;
  key: string;
  model?: string;
  status: 'active' | 'exhausted' | 'error' | 'paused';
  lastUsed: Date;
  usageCount: number;
  currentConcurrency: number;
  maxConcurrency: number;
  priority: number;
  weight: number;
}

export interface PoolConfig {
  mode: PoolMode;
  maxKeys: number;
  defaultProvider: AIProvider;
}

export interface HumanizationConfig {
  minDelay: number;
  maxDelay: number;
  variationEnabled: boolean;
  typingIndicator: boolean;
}

// =============================================================================
// CONFIGURAÇÃO DE HUMANIZAÇÃO
// =============================================================================

const HUMANIZATION: HumanizationConfig = {
  minDelay: 1200,
  maxDelay: 3500,
  variationEnabled: true,
  typingIndicator: true
};

// =============================================================================
// POOL DE CHAVES - CLASSE PRINCIPAL
// =============================================================================

export class AIKeyPool {
  private keys: Map<string, PoolKey> = new Map();
  private config: PoolConfig = {
    mode: 'SIMULTANEOUS',
    maxKeys: 100,
    defaultProvider: 'GLM'
  };
  private roundRobinIndex: number = 0;
  
  constructor() {
    this.loadConfig();
    this.loadKeys();
  }

  /**
   * Carrega configuração do banco
   */
  async loadConfig() {
    try {
      const globalConfig = await prisma.globalConfig.findUnique({
        where: { id: 'singleton' }
      });
      
      if (globalConfig) {
        this.config = {
          mode: (globalConfig.aiPoolMode as PoolMode) || 'SIMULTANEOUS',
          maxKeys: globalConfig.aiPoolMaxKeys || 100,
          defaultProvider: (globalConfig.aiPoolDefaultProvider as AIProvider) || 'GLM'
        };
        console.log(`[AI-POOL] Config: modo=${this.config.mode}, max=${this.config.maxKeys}, provider=${this.config.defaultProvider}`);
      }
    } catch (error) {
      console.error('[AI-POOL] Erro ao carregar config:', error);
    }
  }

  /**
   * Atualiza configuração do pool
   */
  async setConfig(newConfig: Partial<PoolConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    await prisma.globalConfig.update({
      where: { id: 'singleton' },
      data: {
        aiPoolMode: this.config.mode,
        aiPoolMaxKeys: this.config.maxKeys,
        aiPoolDefaultProvider: this.config.defaultProvider
      }
    });
    
    console.log(`[AI-POOL] Config atualizada:`, this.config);
  }

  /**
   * Retorna configuração atual
   */
  getConfig(): PoolConfig {
    return { ...this.config };
  }

  /**
   * Carrega chaves do banco de dados
   */
  async loadKeys() {
    try {
      const dbKeys = await prisma.aiKey.findMany({
        where: { status: 'active' },
        orderBy: { priority: 'desc' }
      });

      this.keys.clear();

      for (const dbKey of dbKeys) {
        this.keys.set(dbKey.id, {
          id: dbKey.id,
          provider: dbKey.provider as AIProvider,
          key: dbKey.key,
          model: dbKey.model || undefined,
          status: 'active',
          lastUsed: dbKey.lastUsed,
          usageCount: dbKey.usageCount,
          currentConcurrency: 0,
          maxConcurrency: this.getMaxConcurrency(dbKey.provider),
          priority: dbKey.priority,
          weight: dbKey.weight
        });
      }

      console.log(`[AI-POOL] ${this.keys.size} chaves carregadas (modo: ${this.config.mode})`);
    } catch (error) {
      console.error('[AI-POOL] Erro ao carregar chaves:', error);
    }
  }

  /**
   * Define concorrência máxima por provider
   */
  private getMaxConcurrency(provider: string): number {
    switch (provider) {
      case 'GLM': return 1;           // GLM gratuito = 1 concorrência
      case 'GEMINI': return 15;       // Gemini free = 15 concorrência
      case 'OPENAI': return 10;
      case 'ANTHROPIC': return 10;
      case 'DEEPSEEK': return 10;
      default: return 5;
    }
  }

  /**
   * Obtém a próxima chave disponível (baseado no modo)
   */
  async getNextKey(preferredProvider?: AIProvider): Promise<PoolKey | null> {
    const activeKeys = Array.from(this.keys.values())
      .filter(k => k.status === 'active')
      .filter(k => preferredProvider ? k.provider === preferredProvider : true);

    if (activeKeys.length === 0) {
      console.warn('[AI-POOL] Nenhuma chave disponível!');
      return null;
    }

    let selectedKey: PoolKey | null = null;

    switch (this.config.mode) {
      case 'SEQUENTIAL':
        selectedKey = this.getNextSequential(activeKeys);
        break;
      case 'FALLBACK':
        selectedKey = this.getNextFallback(activeKeys);
        break;
      case 'SIMULTANEOUS':
        selectedKey = this.getNextSimultaneous(activeKeys);
        break;
      default:
        selectedKey = this.getNextSimultaneous(activeKeys);
    }

    if (selectedKey) {
      selectedKey.currentConcurrency++;
      selectedKey.lastUsed = new Date();
      selectedKey.usageCount++;
      this.updateKeyStats(selectedKey);
      
      console.log(`[AI-POOL] Chave selecionada [${this.config.mode}]: ${selectedKey.id.substring(0, 8)}... (${selectedKey.provider}) [${selectedKey.currentConcurrency}/${selectedKey.maxConcurrency}]`);
    }

    return selectedKey;
  }

  /**
   * MODO SEQUENTIAL: Usa chaves em ordem, uma por vez
   * K1 → K2 → K3 → K1... (só usa a próxima quando a anterior liberar)
   */
  private getNextSequential(keys: PoolKey[]): PoolKey | null {
    // Filtrar apenas chaves livres
    const freeKeys = keys.filter(k => k.currentConcurrency < k.maxConcurrency);
    if (freeKeys.length === 0) return null;

    // Round Robin simples
    this.roundRobinIndex = (this.roundRobinIndex + 1) % freeKeys.length;
    return freeKeys[this.roundRobinIndex];
  }

  /**
   * MODO FALLBACK: Usa a principal, se falhar tenta a próxima
   * Prioriza por campo priority, usa próxima se error
   */
  private getNextFallback(keys: PoolKey[]): PoolKey | null {
    // Ordenar por prioridade (maior primeiro)
    const sorted = [...keys].sort((a, b) => b.priority - a.priority);

    // Pegar a primeira chave ativa e livre
    for (const key of sorted) {
      if (key.status === 'active' && key.currentConcurrency < key.maxConcurrency) {
        return key;
      }
    }

    return null;
  }

  /**
   * MODO SIMULTANEOUS: Usa todas ao mesmo tempo
   * Distribui carga entre todas as chaves disponíveis
   */
  private getNextSimultaneous(keys: PoolKey[]): PoolKey | null {
    // Filtrar chaves livres
    const freeKeys = keys.filter(k => k.currentConcurrency < k.maxConcurrency);
    if (freeKeys.length === 0) return null;

    // Escolher a menos usada (load balancing)
    const leastUsed = freeKeys.reduce((prev, curr) => 
      curr.usageCount < prev.usageCount ? curr : prev
    );

    return leastUsed;
  }

  /**
   * Libera uma chave após uso
   */
  releaseKey(keyId: string) {
    const key = this.keys.get(keyId);
    if (key && key.currentConcurrency > 0) {
      key.currentConcurrency--;
      console.log(`[AI-POOL] Chave liberada: ${keyId.substring(0, 8)}... [${key.currentConcurrency}/${key.maxConcurrency}]`);
    }
  }

  /**
   * Marca chave como erro (para modo FALLBACK)
   */
  async markKeyError(keyId: string, error?: string) {
    const key = this.keys.get(keyId);
    if (key) {
      key.currentConcurrency = 0;
      key.status = 'error';
      
      // Atualizar no banco
      await prisma.aiKey.update({
        where: { id: keyId },
        data: {
          status: 'error',
          lastError: error,
          errorCount: { increment: 1 }
        }
      });
      
      console.error(`[AI-POOL] Chave com erro: ${keyId.substring(0, 8)}... - ${error}`);
      
      // Reativar após 5 minutos
      setTimeout(async () => {
        const k = this.keys.get(keyId);
        if (k) {
          k.status = 'active';
          await prisma.aiKey.update({
            where: { id: keyId },
            data: { status: 'active' }
          });
          console.log(`[AI-POOL] Chave reativada: ${keyId.substring(0, 8)}...`);
        }
      }, 5 * 60 * 1000);
    }
  }

  /**
   * Adiciona nova chave ao pool
   */
  async addKey(data: {
    key: string;
    provider: AIProvider;
    model?: string;
    priority?: number;
    weight?: number;
  }): Promise<PoolKey> {
    // Verificar limite
    if (this.keys.size >= this.config.maxKeys) {
      throw new Error(`Limite de ${this.config.maxKeys} chaves atingido`);
    }

    // Criar no banco
    const dbKey = await prisma.aiKey.create({
      data: {
        key: data.key,
        provider: data.provider,
        model: data.model,
        priority: data.priority || 0,
        weight: data.weight || 1,
        status: 'active'
      }
    });

    // Adicionar ao pool
    const poolKey: PoolKey = {
      id: dbKey.id,
      provider: dbKey.provider as AIProvider,
      key: dbKey.key,
      model: dbKey.model || undefined,
      status: 'active',
      lastUsed: new Date(),
      usageCount: 0,
      currentConcurrency: 0,
      maxConcurrency: this.getMaxConcurrency(dbKey.provider),
      priority: dbKey.priority,
      weight: dbKey.weight
    };

    this.keys.set(poolKey.id, poolKey);
    console.log(`[AI-POOL] Chave adicionada: ${poolKey.id.substring(0, 8)}... (${poolKey.provider})`);

    return poolKey;
  }

  /**
   * Remove chave do pool
   */
  async removeKey(keyId: string) {
    await prisma.aiKey.delete({ where: { id: keyId } });
    this.keys.delete(keyId);
    console.log(`[AI-POOL] Chave removida: ${keyId.substring(0, 8)}...`);
  }

  /**
   * Atualiza estatísticas no banco
   */
  private async updateKeyStats(key: PoolKey) {
    try {
      await prisma.aiKey.update({
        where: { id: key.id },
        data: {
          lastUsed: key.lastUsed,
          usageCount: key.usageCount
        }
      });
    } catch (error) {
      console.error('[AI-POOL] Erro ao atualizar stats:', error);
    }
  }

  /**
   * Retorna status completo do pool
   */
  getStatus() {
    const total = this.keys.size;
    const active = Array.from(this.keys.values()).filter(k => k.status === 'active').length;
    const available = Array.from(this.keys.values())
      .filter(k => k.status === 'active' && k.currentConcurrency < k.maxConcurrency).length;
    
    const byProvider = {
      GLM: Array.from(this.keys.values()).filter(k => k.provider === 'GLM' && k.status === 'active').length,
      GEMINI: Array.from(this.keys.values()).filter(k => k.provider === 'GEMINI' && k.status === 'active').length,
      OPENAI: Array.from(this.keys.values()).filter(k => k.provider === 'OPENAI' && k.status === 'active').length,
      ANTHROPIC: Array.from(this.keys.values()).filter(k => k.provider === 'ANTHROPIC' && k.status === 'active').length,
      DEEPSEEK: Array.from(this.keys.values()).filter(k => k.provider === 'DEEPSEEK' && k.status === 'active').length,
    };

    const totalConcurrency = Array.from(this.keys.values())
      .reduce((sum, k) => sum + k.currentConcurrency, 0);

    const maxSimultaneous = Array.from(this.keys.values())
      .reduce((sum, k) => sum + k.maxConcurrency, 0);

    return {
      config: this.config,
      total,
      active,
      available,
      currentConcurrency: totalConcurrency,
      maxSimultaneous,
      byProvider
    };
  }

  /**
   * Lista todas as chaves
   */
  listKeys(): PoolKey[] {
    return Array.from(this.keys.values());
  }

  /**
   * Recarrega chaves e config do banco
   */
  async reload() {
    await this.loadConfig();
    await this.loadKeys();
  }
}

// =============================================================================
// DELAY HUMANIZADO
// =============================================================================

export function getHumanDelay(): number {
  const { minDelay, maxDelay } = HUMANIZATION;
  const base = Math.random() + Math.random();
  const normalized = base / 2;
  const delay = Math.floor(minDelay + normalized * (maxDelay - minDelay));
  const extraDelay = Math.random() < 0.1 ? Math.random() * 2000 : 0;
  return delay + extraDelay;
}

export async function humanDelay(): Promise<void> {
  const delay = getHumanDelay();
  console.log(`[HUMAN] Aguardando ${delay}ms...`);
  await new Promise(resolve => setTimeout(resolve, delay));
}

// =============================================================================
// VARIAÇÃO DE RESPOSTAS
// =============================================================================

const RESPONSE_VARIATIONS = {
  saudacoes: ['Olá! 👋', 'Oi, tudo bem?', 'Olá, como posso ajudar?', 'Oi! Tudo certo por aí?', 'E aí! Tudo bem?'],
  confirmacoes: ['Perfeito!', 'Combinado!', 'Beleza!', 'Show!', 'Tranquilo!', 'Sem problemas!'],
  despedidas: ['Até mais! 👋', 'Qualquer coisa, é só chamar!', 'Tamo junto!', 'Até a próxima!', 'Foi um prazer ajudar!'],
  agradecimentos: ['Obrigado!', 'Valeu!', 'Brigadão!', 'Agradeço!'],
  pensamentos: ['Deixa eu verificar isso...', 'Hmm, deixa eu pensar...', 'Só um momento...', 'Consultando aqui...'],
  erros: ['Ops, algo deu errado. Pode tentar de novo?', 'Desculpa, tive um probleminha. Vamos tentar novamente?', 'Houve um erro, mas já estamos resolvendo!']
};

export function addHumanVariation(response: string): string {
  if (!HUMANIZATION.variationEnabled) return response;

  if (Math.random() < 0.3) {
    const randomPrefix = RESPONSE_VARIATIONS.pensamentos[Math.floor(Math.random() * RESPONSE_VARIATIONS.pensamentos.length)];
    response = `${randomPrefix}\n\n${response}`;
  }

  if (Math.random() < 0.2) {
    const emojis = ['✨', '👍', '😊', '🎯', '💡', '🚀'];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    response = `${response} ${randomEmoji}`;
  }

  return response;
}

export function getGreeting(): string {
  return RESPONSE_VARIATIONS.saudacoes[Math.floor(Math.random() * RESPONSE_VARIATIONS.saudacoes.length)];
}

export function getConfirmation(): string {
  return RESPONSE_VARIATIONS.confirmacoes[Math.floor(Math.random() * RESPONSE_VARIATIONS.confirmacoes.length)];
}

// =============================================================================
// INSTÂNCIA GLOBAL DO POOL
// =============================================================================

export const aiKeyPool = new AIKeyPool();

// Inicializar pool na primeira importação
setTimeout(() => {
  aiKeyPool.loadConfig();
  aiKeyPool.loadKeys();
}, 1000);

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  AIKeyPool,
  aiKeyPool,
  getHumanDelay,
  humanDelay,
  addHumanVariation,
  getGreeting,
  getConfirmation,
  HUMANIZATION
};
