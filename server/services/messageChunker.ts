/**
 * MESSAGE CHUNKER - SaaSWPP AI
 * Divide a resposta da IA em múltiplas mensagens para parecer humano
 * 
 * FLUXO:
 * 1. IA gera 1 resposta completa (ex: 500 caracteres)
 * 2. Chunker divide em 3-5 mensagens menores
 * 3. Cada pedaço é enviado com delay de 2-8 segundos
 * 
 * BENEFÍCIOS:
 * - Parece digitação humana
 * - Não trava o sistema (1 chamada API)
 * - Evita bans do WhatsApp
 */

// =============================================================================
// CONFIGURAÇÕES
// =============================================================================

const CHUNK_CONFIG = {
  minChunkSize: 30,        // Mínimo de caracteres por pedaço
  maxChunkSize: 200,       // Máximo de caracteres por pedaço
  idealChunks: {           // Número ideal de pedaços por tamanho
    small: 2,              // < 100 chars → 2 pedaços
    medium: 3,             // 100-300 chars → 3 pedaços
    large: 4,              // 300-500 chars → 4 pedaços
    xlarge: 5              // > 500 chars → 5 pedaços
  },
  delayBetween: {          // Delay entre cada envio
    min: 2000,             // 2 segundos
    max: 8000              // 8 segundos
  }
};

// Delimitadores naturais para dividir texto
const SPLIT_DELIMITERS = [
  /\.\s+/g,                // Ponto seguido de espaço
  /\!\s+/g,                // Exclamação seguida de espaço
  /\?\s+/g,                // Interrogação seguida de espaço
  /\:\s+/g,                // Dois pontos seguido de espaço
  /\n/g,                   // Quebra de linha
  /;\s+/g,                 // Ponto e vírgula
];

// =============================================================================
// TIPOS
// =============================================================================

export interface MessageChunk {
  text: string;
  delay: number;           // Delay antes de enviar este pedaço
  index: number;
  total: number;
}

export interface ChunkResult {
  chunks: MessageChunk[];
  originalText: string;
  totalDelay: number;      // Tempo total para enviar todos os pedaços
}

// =============================================================================
// FUNÇÕES PRINCIPAIS
// =============================================================================

/**
 * Divide uma resposta completa em múltiplas mensagens
 */
export function chunkMessage(text: string): ChunkResult {
  if (!text || text.trim().length === 0) {
    return {
      chunks: [],
      originalText: text,
      totalDelay: 0
    };
  }

  // Se a mensagem é muito curta, não divide
  if (text.length < CHUNK_CONFIG.minChunkSize * 2) {
    return {
      chunks: [{
        text: text.trim(),
        delay: getHumanDelay(),
        index: 0,
        total: 1
      }],
      originalText: text,
      totalDelay: 0
    };
  }

  // Determinar número de chunks
  const numChunks = getIdealChunkCount(text.length);
  
  // Dividir o texto
  const rawChunks = splitTextSmart(text, numChunks);
  
  // Adicionar delays progressivos
  const chunks: MessageChunk[] = [];
  let totalDelay = 0;

  for (let i = 0; i < rawChunks.length; i++) {
    const delay = i === 0 ? 0 : getHumanDelay();
    totalDelay += delay;
    
    chunks.push({
      text: rawChunks[i].trim(),
      delay,
      index: i,
      total: rawChunks.length
    });
  }

  return {
    chunks,
    originalText: text,
    totalDelay
  };
}

/**
 * Determina o número ideal de pedaços baseado no tamanho
 */
function getIdealChunkCount(textLength: number): number {
  if (textLength < 100) return CHUNK_CONFIG.idealChunks.small;
  if (textLength < 300) return CHUNK_CONFIG.idealChunks.medium;
  if (textLength < 500) return CHUNK_CONFIG.idealChunks.large;
  return CHUNK_CONFIG.idealChunks.xlarge;
}

/**
 * Divide o texto de forma inteligente (respeitando pontuação)
 */
function splitTextSmart(text: string, numChunks: number): string[] {
  // Tentar dividir por pontuação primeiro
  const sentences = splitByDelimiters(text);
  
  if (sentences.length >= numChunks) {
    // Temos frases suficientes, agrupar proporcionalmente
    return groupSentences(sentences, numChunks);
  }
  
  // Se não há pontuação suficiente, dividir por tamanho
  return splitBySize(text, numChunks);
}

/**
 * Divide texto usando delimitadores naturais
 */
function splitByDelimiters(text: string): string[] {
  let result = [text];
  
  for (const delimiter of SPLIT_DELIMITERS) {
    const newResult: string[] = [];
    for (const segment of result) {
      const parts = segment.split(delimiter);
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].trim()) {
          // Adicionar o delimitador de volta (exceto último)
          newResult.push(parts[i] + (i < parts.length - 1 ? delimiter.source.replace('\\s+', ' ').replace(/\\/g, '') : ''));
        }
      }
    }
    result = newResult;
  }
  
  return result.filter(s => s.trim().length > 0);
}

/**
 * Agrupa frases em chunks平衡ados
 */
function groupSentences(sentences: string[], numChunks: number): string[] {
  const chunks: string[] = [];
  const sentencesPerChunk = Math.ceil(sentences.length / numChunks);
  
  for (let i = 0; i < sentences.length; i += sentencesPerChunk) {
    const chunk = sentences.slice(i, i + sentencesPerChunk).join(' ').trim();
    if (chunk) chunks.push(chunk);
  }
  
  return chunks;
}

/**
 * Divide por tamanho quando não há pontuação suficiente
 */
function splitBySize(text: string, numChunks: number): string[] {
  const chunkSize = Math.ceil(text.length / numChunks);
  const chunks: string[] = [];
  
  for (let i = 0; i < text.length; i += chunkSize) {
    // Tentar não cortar palavras no meio
    let end = Math.min(i + chunkSize, text.length);
    
    // Procurar espaço mais próximo para cortar
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(' ', end);
      if (lastSpace > i + chunkSize / 2) {
        end = lastSpace;
      }
    }
    
    chunks.push(text.slice(i, end).trim());
  }
  
  return chunks.filter(c => c.length > 0);
}

/**
 * Gera delay humanizado (2-8 segundos)
 */
function getHumanDelay(): number {
  const { min, max } = CHUNK_CONFIG.delayBetween;
  
  // Distribuição mais natural
  const base = Math.random() + Math.random();
  const normalized = base / 2;
  
  let delay = Math.floor(min + normalized * (max - min));
  
  // 15% de chance de delay extra longo (pensando)
  if (Math.random() < 0.15) {
    delay += Math.floor(Math.random() * 3000); // +0-3 segundos
  }
  
  return delay;
}

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Simula digitação humana (para usar antes de enviar)
 */
export function simulateTyping(textLength: number): number {
  // Média: 1 caractere a cada 50ms (ser humano médio)
  // Mas somos mais rápidos para não deixar o cliente esperando
  const typingSpeed = 30; // ms por caractere
  const minDelay = 1000;
  const maxDelay = 5000;
  
  const calculatedDelay = textLength * typingSpeed;
  
  return Math.min(Math.max(calculatedDelay, minDelay), maxDelay);
}

/**
 * Adiciona variação casual ao texto (para parecer mais humano)
 */
export function addCasualVariation(text: string): string {
  // 10% chance de adicionar "hmm" no início
  if (Math.random() < 0.1 && !text.startsWith('Olá') && !text.startsWith('Oi')) {
    text = `Hmm, ${text.toLowerCase()}`;
  }
  
  return text;
}

// =============================================================================
// EXPORT DEFAULT
// =============================================================================

export default {
  chunkMessage,
  simulateTyping,
  addCasualVariation,
  CHUNK_CONFIG
};
