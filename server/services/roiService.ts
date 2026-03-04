/**
 * SERVIÇO DE ROI DASHBOARD - SaaSWPP AI
 * 
 * Calcula e rastreia o retorno sobre investimento do lojista
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// TIPOS
// =============================================================================

export interface ROIMetrics {
  period: string;
  totalRevenue: number;       // Receita gerada pela IA
  totalConversations: number; // Total de conversas
  totalSales: number;         // Vendas fechadas
  totalAppointments: number;  // Agendamentos
  averageTicket: number;      // Ticket médio
  conversionRate: number;     // Taxa de conversão
  costPerConversation: number; // Custo por conversa
  roi: number;                // ROI em percentual
  platformCost: number;       // Custo da plataforma
}

export interface SalesTracking {
  id: string;
  merchantId: string;
  customerPhone: string;
  customerName?: string;
  product?: string;
  value: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  source: 'ai' | 'human';
  conversationId?: string;
  createdAt: Date;
  confirmedAt?: Date;
}

export interface DailyROI {
  date: string;
  revenue: number;
  conversations: number;
  sales: number;
}

// =============================================================================
// RASTREAMENTO DE VENDAS
// =============================================================================

/**
 * Registra uma venda/conversão
 */
export async function trackSale(params: {
  merchantId: string;
  customerPhone: string;
  customerName?: string;
  product?: string;
  value: number;
  source?: 'ai' | 'human';
  conversationId?: string;
}): Promise<SalesTracking> {
  const sale = await prisma.saleTracking.create({
    data: {
      merchantId: params.merchantId,
      customerPhone: params.customerPhone,
      customerName: params.customerName,
      product: params.product,
      value: params.value,
      status: 'pending',
      source: params.source || 'ai',
      conversationId: params.conversationId
    }
  });

  return sale as unknown as SalesTracking;
}

/**
 * Confirma uma venda
 */
export async function confirmSale(saleId: string): Promise<boolean> {
  try {
    await prisma.saleTracking.update({
      where: { id: saleId },
      data: {
        status: 'confirmed',
        confirmedAt: new Date()
      }
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Cancela uma venda
 */
export async function cancelSale(saleId: string): Promise<boolean> {
  try {
    await prisma.saleTracking.update({
      where: { id: saleId },
      data: { status: 'cancelled' }
    });
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// CÁLCULO DE ROI
// =============================================================================

/**
 * Calcula métricas de ROI para um período
 */
export async function calculateROI(
  merchantId: string,
  startDate: Date,
  endDate: Date,
  planPrice: number = 97
): Promise<ROIMetrics> {
  // Buscar vendas confirmadas no período
  const sales = await prisma.saleTracking.findMany({
    where: {
      merchantId,
      status: 'confirmed',
      confirmedAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  // Buscar conversas no período
  const conversations = await prisma.interactionLog.count({
    where: {
      merchantId,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  // Buscar agendamentos confirmados
  const appointments = await prisma.appointment.count({
    where: {
      merchantId,
      status: 'confirmed',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    }
  });

  // Calcular métricas
  const totalRevenue = sales.reduce((sum, s) => sum + (s.value || 0), 0);
  const totalSales = sales.length;
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
  const conversionRate = conversations > 0 ? (totalSales / conversations) * 100 : 0;
  const costPerConversation = conversations > 0 ? planPrice / conversations : 0;

  // Calcular dias no período
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const platformCost = (planPrice / 30) * daysDiff; // Proporcional ao período

  // ROI = ((Receita - Custo) / Custo) * 100
  const roi = platformCost > 0 ? ((totalRevenue - platformCost) / platformCost) * 100 : 0;

  return {
    period: `${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')}`,
    totalRevenue,
    totalConversations: conversations,
    totalSales,
    totalAppointments: appointments,
    averageTicket,
    conversionRate,
    costPerConversation,
    roi,
    platformCost
  };
}

/**
 * ROI do mês atual
 */
export async function getCurrentMonthROI(merchantId: string, planPrice: number): Promise<ROIMetrics> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  return calculateROI(merchantId, startOfMonth, endOfMonth, planPrice);
}

/**
 * ROI dos últimos N dias
 */
export async function getLastNDaysROI(merchantId: string, days: number, planPrice: number): Promise<ROIMetrics> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return calculateROI(merchantId, startDate, endDate, planPrice);
}

/**
 * ROI diário do período
 */
export async function getDailyROI(
  merchantId: string,
  startDate: Date,
  endDate: Date
): Promise<DailyROI[]> {
  const dailyData: DailyROI[] = [];

  // Buscar vendas
  const sales = await prisma.saleTracking.findMany({
    where: {
      merchantId,
      status: 'confirmed',
      confirmedAt: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      value: true,
      confirmedAt: true
    }
  });

  // Buscar conversas
  const conversations = await prisma.interactionLog.findMany({
    where: {
      merchantId,
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    },
    select: {
      createdAt: true
    }
  });

  // Agrupar por dia
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];

    // Vendas do dia
    const daySales = sales.filter(s => 
      s.confirmedAt?.toISOString().split('T')[0] === dateStr
    );

    // Conversas do dia
    const dayConversations = conversations.filter(c =>
      c.createdAt.toISOString().split('T')[0] === dateStr
    );

    dailyData.push({
      date: dateStr,
      revenue: daySales.reduce((sum, s) => sum + (s.value || 0), 0),
      conversations: dayConversations.length,
      sales: daySales.length
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dailyData;
}

// =============================================================================
// COMPARATIVOS
// =============================================================================

/**
 * Compara ROI entre períodos
 */
export async function compareROI(
  merchantId: string,
  planPrice: number
): Promise<{
  current: ROIMetrics;
  previous: ROIMetrics;
  change: {
    revenue: number;
    conversations: number;
    sales: number;
    roi: number;
  };
}> {
  const now = new Date();

  // Período atual (este mês)
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Período anterior (mês passado)
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const current = await calculateROI(merchantId, currentStart, currentEnd, planPrice);
  const previous = await calculateROI(merchantId, previousStart, previousEnd, planPrice);

  const change = {
    revenue: current.totalRevenue - previous.totalRevenue,
    conversations: current.totalConversations - previous.totalConversations,
    sales: current.totalSales - previous.totalSales,
    roi: current.roi - previous.roi
  };

  return { current, previous, change };
}

/**
 * Ranking de produtos mais vendidos
 */
export async function getTopProducts(
  merchantId: string,
  limit: number = 10
): Promise<Array<{ product: string; count: number; totalValue: number }>> {
  const sales = await prisma.saleTracking.findMany({
    where: {
      merchantId,
      status: 'confirmed',
      product: { not: null }
    },
    select: {
      product: true,
      value: true
    }
  });

  // Agrupar por produto
  const productMap = new Map<string, { count: number; totalValue: number }>();

  for (const sale of sales) {
    if (sale.product) {
      const existing = productMap.get(sale.product) || { count: 0, totalValue: 0 };
      productMap.set(sale.product, {
        count: existing.count + 1,
        totalValue: existing.totalValue + (sale.value || 0)
      });
    }
  }

  // Ordenar e limitar
  return Array.from(productMap.entries())
    .map(([product, data]) => ({
      product,
      ...data
    }))
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, limit);
}

export default {
  trackSale,
  confirmSale,
  cancelSale,
  calculateROI,
  getCurrentMonthROI,
  getLastNDaysROI,
  getDailyROI,
  compareROI,
  getTopProducts
};
