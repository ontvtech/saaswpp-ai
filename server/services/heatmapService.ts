/**
 * SERVIÇO DE HEATMAP DE HORÁRIOS - SaaSWPP AI
 * 
 * Analisa quando os clientes mais enviam mensagens
 * Gera dados para visualização de heatmap
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// TIPOS
// =============================================================================

export interface HeatmapData {
  hour: number;        // 0-23
  day: number;         // 0-6 (domingo=0)
  count: number;       // Quantidade de mensagens
  percentage: number;  // Percentual do total
}

export interface HeatmapStats {
  peakHour: number;
  peakDay: number;
  peakDayName: string;
  totalMessages: number;
  averagePerHour: number;
  heatmap: HeatmapData[];
}

export interface HourlyStats {
  hour: number;
  count: number;
  percentage: number;
}

export interface DailyStats {
  day: number;
  dayName: string;
  count: number;
  percentage: number;
}

// =============================================================================
// CONSTANTES
// =============================================================================

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAY_NAMES_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// =============================================================================
// FUNÇÕES DE ANÁLISE
// =============================================================================

/**
 * Gera dados do heatmap para um merchant
 */
export async function generateHeatmap(
  merchantId: string,
  daysBack: number = 30
): Promise<HeatmapStats> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);
  startDate.setHours(0, 0, 0, 0);

  // Buscar todas as interações no período
  const interactions = await prisma.interactionLog.findMany({
    where: {
      merchantId,
      createdAt: { gte: startDate }
    },
    select: {
      createdAt: true
    }
  });

  // Inicializar grid 24x7
  const grid: Map<string, number> = new Map();
  for (let hour = 0; hour < 24; hour++) {
    for (let day = 0; day < 7; day++) {
      grid.set(`${hour}-${day}`, 0);
    }
  }

  // Contar mensagens por hora/dia
  for (const interaction of interactions) {
    const hour = interaction.createdAt.getHours();
    const day = interaction.createdAt.getDay();
    const key = `${hour}-${day}`;
    grid.set(key, (grid.get(key) || 0) + 1);
  }

  // Encontrar máximo para calcular percentuais
  let maxCount = 0;
  let totalMessages = 0;
  grid.forEach(count => {
    maxCount = Math.max(maxCount, count);
    totalMessages += count;
  });

  // Converter para array
  const heatmap: HeatmapData[] = [];
  let peakHour = 0;
  let peakDay = 0;
  let peakCount = 0;

  grid.forEach((count, key) => {
    const [hour, day] = key.split('-').map(Number);
    const percentage = totalMessages > 0 ? (count / totalMessages) * 100 : 0;
    
    heatmap.push({ hour, day, count, percentage });

    if (count > peakCount) {
      peakCount = count;
      peakHour = hour;
      peakDay = day;
    }
  });

  return {
    peakHour,
    peakDay,
    peakDayName: DAY_NAMES_FULL[peakDay],
    totalMessages,
    averagePerHour: totalMessages / (24 * 7),
    heatmap
  };
}

/**
 * Estatísticas por hora
 */
export async function getHourlyStats(
  merchantId: string,
  daysBack: number = 30
): Promise<HourlyStats[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const interactions = await prisma.interactionLog.findMany({
    where: {
      merchantId,
      createdAt: { gte: startDate }
    },
    select: { createdAt: true }
  });

  // Contar por hora
  const hourCounts: number[] = new Array(24).fill(0);
  for (const interaction of interactions) {
    const hour = interaction.createdAt.getHours();
    hourCounts[hour]++;
  }

  const total = interactions.length;
  const stats: HourlyStats[] = hourCounts.map((count, hour) => ({
    hour,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0
  }));

  return stats;
}

/**
 * Estatísticas por dia da semana
 */
export async function getDailyStats(
  merchantId: string,
  daysBack: number = 30
): Promise<DailyStats[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const interactions = await prisma.interactionLog.findMany({
    where: {
      merchantId,
      createdAt: { gte: startDate }
    },
    select: { createdAt: true }
  });

  // Contar por dia
  const dayCounts: number[] = new Array(7).fill(0);
  for (const interaction of interactions) {
    const day = interaction.createdAt.getDay();
    dayCounts[day]++;
  }

  const total = interactions.length;
  const stats: DailyStats[] = dayCounts.map((count, day) => ({
    day,
    dayName: DAY_NAMES[day],
    count,
    percentage: total > 0 ? (count / total) * 100 : 0
  }));

  return stats;
}

/**
 * Detecta horários de pico automaticamente
 */
export async function detectPeakHours(
  merchantId: string,
  threshold: number = 0.05 // 5% do total
): Promise<Array<{ hour: number; day: number; dayName: string; count: number }>> {
  const heatmap = await generateHeatmap(merchantId);
  
  const peaks = heatmap.heatmap
    .filter(h => h.percentage >= threshold * 100)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(h => ({
      hour: h.hour,
      day: h.day,
      dayName: DAY_NAMES[h.day],
      count: h.count
    }));

  return peaks;
}

/**
 * Recomenda horários para atendimento humano adicional
 */
export async function recommendHumanHours(
  merchantId: string
): Promise<Array<{ hour: number; reason: string }>> {
  const hourlyStats = await getHourlyStats(merchantId);
  
  // Encontrar horas com alto volume
  const highVolume = hourlyStats
    .filter(h => h.percentage >= 8)
    .sort((a, b) => b.percentage - a.percentage);

  // Encontrar horas com baixo volume (IA cuida sozinha)
  const lowVolume = hourlyStats
    .filter(h => h.percentage <= 2 && h.hour >= 8 && h.hour <= 20)
    .sort((a, b) => a.percentage - b.percentage);

  const recommendations: Array<{ hour: number; reason: string }> = [];

  // Horas que precisam de humano
  for (const h of highVolume.slice(0, 3)) {
    recommendations.push({
      hour: h.hour,
      reason: `Alto volume: ${h.count} mensagens (${h.percentage.toFixed(1)}%)`
    });
  }

  // Horas que IA cuida bem sozinha
  for (const h of lowVolume.slice(0, 2)) {
    recommendations.push({
      hour: h.hour,
      reason: `Baixo volume: IA atende sozinha (${h.percentage.toFixed(1)}%)`
    });
  }

  return recommendations;
}

/**
 * Compara período atual com período anterior
 */
export async function comparePeriods(
  merchantId: string,
  daysCurrent: number = 7,
  daysPrevious: number = 7
): Promise<{
  current: HeatmapStats;
  previous: HeatmapStats;
  change: {
    totalMessages: number;
    percentage: number;
  };
}> {
  const current = await generateHeatmap(merchantId, daysCurrent);
  const previous = await generateHeatmap(merchantId, daysCurrent + daysPrevious);

  // Recalcular previous para o período correto
  const previousStart = new Date();
  previousStart.setDate(previousStart.getDate() - daysCurrent - daysPrevious);
  const previousEnd = new Date();
  previousEnd.setDate(previousEnd.getDate() - daysCurrent);

  const previousInteractions = await prisma.interactionLog.count({
    where: {
      merchantId,
      createdAt: {
        gte: previousStart,
        lt: previousEnd
      }
    }
  });

  const change = {
    totalMessages: current.totalMessages - previousInteractions,
    percentage: previousInteractions > 0 
      ? ((current.totalMessages - previousInteractions) / previousInteractions) * 100 
      : 0
  };

  return { current, previous: { ...previous, totalMessages: previousInteractions }, change };
}

export default {
  generateHeatmap,
  getHourlyStats,
  getDailyStats,
  detectPeakHours,
  recommendHumanHours,
  comparePeriods,
  DAY_NAMES,
  DAY_NAMES_FULL
};
