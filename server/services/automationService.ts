/**
 * SERVIÇO DE AUTOMAÇÃO - SaaSWPP AI
 * Versão: 2.0.0
 * 
 * Jobs automatizados:
 * - Verificação de trials expirados
 * - Verificação de grace periods
 * - Lembretes de agendamentos
 * - Reativação de leads frios
 * - Aniversariantes
 * - Reset de quotas mensais
 */

import { PrismaClient } from '@prisma/client';
import { sendMessage } from './whatsappService';
import { auditLog } from '../utils/permissions';

const prisma = new PrismaClient();

// =============================================================================
// CONFIGURAÇÕES
// =============================================================================

const CONFIG = {
  // Grace Period
  GRACE_PERIOD_FIRST_WARNING_DAYS: 3,  // Aviso com 3 dias restantes
  GRACE_PERIOD_FINAL_WARNING_DAYS: 1,  // Aviso final com 1 dia restante

  // Trial
  TRIAL_WARNING_DAYS: 1,  // Aviso 1 dia antes de expirar

  // Agendamentos
  APPOINTMENT_REMINDER_24H: true,
  APPOINTMENT_REMINDER_2H: true,

  // Leads
  COLD_LEAD_DAYS: 30,       // Dias sem interação para considerar frio
  BIRTHDAY_CHECK_HOUR: 9,   // Hora para verificar aniversariantes

  // Quotas
  QUOTA_RESET_DAY: 1,       // Dia do mês para resetar quotas
};

// =============================================================================
// JOB 1: VERIFICAR TRIALS EXPIRADOS
// =============================================================================

export async function checkExpiredTrials(): Promise<{
  expired: number;
  warned: number;
  errors: string[];
}> {
  console.log('[AUTOMATION] Verificando trials expirados...');
  
  const now = new Date();
  const errors: string[] = [];
  let expired = 0;
  let warned = 0;

  try {
    // 1. Trials expirados - suspender
    const expiredMerchants = await prisma.merchant.findMany({
      where: {
        status: 'trial',
        trialEndsAt: { lt: now }
      }
    });

    for (const merchant of expiredMerchants) {
      try {
        // Iniciar grace period em vez de suspender direto
        const gracePeriodEnds = new Date(now);
        gracePeriodEnds.setDate(gracePeriodEnds.getDate() + 5);

        await prisma.merchant.update({
          where: { id: merchant.id },
          data: {
            status: 'grace_period',
            gracePeriodEndsAt: gracePeriodEnds
          } as any
        });

        await auditLog({
          merchantId: merchant.id,
          action: 'TRIAL_EXPIRED',
          details: `Trial expirado. Grace period iniciado até ${gracePeriodEnds.toISOString()}`
        });

        expired++;
        console.log(`[AUTOMATION] Trial expirado: ${merchant.id}`);
      } catch (err: any) {
        errors.push(`Erro ao processar trial expirado ${merchant.id}: ${err.message}`);
      }
    }

    // 2. Trials prestes a expirar - avisar
    const warningDate = new Date(now);
    warningDate.setDate(warningDate.getDate() + CONFIG.TRIAL_WARNING_DAYS);
    warningDate.setHours(23, 59, 59, 999);

    const trialsToWarn = await prisma.merchant.findMany({
      where: {
        status: 'trial',
        trialEndsAt: {
          gt: now,
          lt: warningDate
        }
      }
    });

    for (const merchant of trialsToWarn) {
      try {
        // Enviar notificação (email/WhatsApp)
        console.log(`[AUTOMATION] Aviso de trial expirando: ${merchant.id}`);
        
        await auditLog({
          merchantId: merchant.id,
          action: 'TRIAL_EXPIRING_WARNING',
          details: `Aviso enviado: trial expira em ${CONFIG.TRIAL_WARNING_DAYS} dia(s)`
        });

        warned++;
      } catch (err: any) {
        errors.push(`Erro ao avisar trial ${merchant.id}: ${err.message}`);
      }
    }

  } catch (err: any) {
    errors.push(`Erro geral: ${err.message}`);
  }

  console.log(`[AUTOMATION] Trials: ${expired} expirados, ${warned} avisados`);
  return { expired, warned, errors };
}

// =============================================================================
// JOB 2: VERIFICAR GRACE PERIODS
// =============================================================================

export async function checkGracePeriods(): Promise<{
  suspended: number;
  warned: number;
  errors: string[];
}> {
  console.log('[AUTOMATION] Verificando grace periods...');
  
  const now = new Date();
  const errors: string[] = [];
  let suspended = 0;
  let warned = 0;

  try {
    // 1. Grace periods expirados - suspender
    const expiredGrace = await prisma.merchant.findMany({
      where: {
        status: 'grace_period',
        gracePeriodEndsAt: { lt: now }
      }
    });

    for (const merchant of expiredGrace) {
      try {
        // Deletar instância Evolution
        if (merchant.evolutionInstance) {
          await deleteEvolutionInstance(merchant.evolutionInstance);
        }

        // Suspender
        await prisma.merchant.update({
          where: { id: merchant.id },
          data: {
            status: 'suspended',
            evolutionInstance: null
          }
        });

        await auditLog({
          merchantId: merchant.id,
          action: 'GRACE_PERIOD_EXPIRED',
          details: 'Conta suspensa após grace period expirado'
        });

        suspended++;
        console.log(`[AUTOMATION] Suspenso por grace period: ${merchant.id}`);
      } catch (err: any) {
        errors.push(`Erro ao suspender ${merchant.id}: ${err.message}`);
      }
    }

    // 2. Avisos de grace period
    const firstWarningDate = new Date(now);
    firstWarningDate.setDate(firstWarningDate.getDate() + CONFIG.GRACE_PERIOD_FIRST_WARNING_DAYS);

    const finalWarningDate = new Date(now);
    finalWarningDate.setDate(finalWarningDate.getDate() + CONFIG.GRACE_PERIOD_FINAL_WARNING_DAYS);

    // Primeiro aviso (3 dias)
    const firstWarnings = await prisma.merchant.findMany({
      where: {
        status: 'grace_period',
        gracePeriodEndsAt: {
          gt: now,
          lt: firstWarningDate
        }
      }
    });

    // Aviso final (1 dia)
    const finalWarnings = await prisma.merchant.findMany({
      where: {
        status: 'grace_period',
        gracePeriodEndsAt: {
          gt: now,
          lt: finalWarningDate
        }
      }
    });

    for (const merchant of [...firstWarnings, ...finalWarnings]) {
      try {
        const daysRemaining = Math.ceil(
          ((merchant.gracePeriodEndsAt?.getTime() || 0) - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        console.log(`[AUTOMATION] Aviso grace period (${daysRemaining} dias): ${merchant.id}`);
        
        await auditLog({
          merchantId: merchant.id,
          action: 'GRACE_PERIOD_WARNING',
          details: `Aviso: ${daysRemaining} dia(s) restante(s)`
        });

        warned++;
      } catch (err: any) {
        errors.push(`Erro ao avisar ${merchant.id}: ${err.message}`);
      }
    }

  } catch (err: any) {
    errors.push(`Erro geral: ${err.message}`);
  }

  console.log(`[AUTOMATION] Grace Periods: ${suspended} suspensos, ${warned} avisados`);
  return { suspended, warned, errors };
}

// =============================================================================
// JOB 3: LEMBRETES DE AGENDAMENTOS
// =============================================================================

export async function sendAppointmentReminders(): Promise<{
  reminders24h: number;
  reminders2h: number;
  errors: string[];
}> {
  console.log('[AUTOMATION] Enviando lembretes de agendamento...');
  
  const now = new Date();
  const errors: string[] = [];
  let reminders24h = 0;
  let reminders2h = 0;

  try {
    // Lembretes 24h
    if (CONFIG.APPOINTMENT_REMINDER_24H) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59, 999);

      const appointments24h = await prisma.appointment.findMany({
        where: {
          status: 'confirmed',
          date: { gte: tomorrow, lt: tomorrowEnd },
          reminderSent24h: false
        }
      });

      for (const appointment of appointments24h) {
        try {
          await sendMessage({
            merchantId: appointment.merchantId,
            to: appointment.clientPhone,
            text: `Olá ${appointment.clientName}! Lembrete: você tem um agendamento amanhã às ${appointment.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} para ${appointment.service}.`
          });

          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { reminderSent24h: true }
          });

          reminders24h++;
        } catch (err: any) {
          errors.push(`Erro ao enviar lembrete 24h ${appointment.id}: ${err.message}`);
        }
      }
    }

    // Lembretes 2h
    if (CONFIG.APPOINTMENT_REMINDER_2H) {
      const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const in2HoursEnd = new Date(in2Hours.getTime() + 30 * 60 * 1000); // Janela de 30 min

      const appointments2h = await prisma.appointment.findMany({
        where: {
          status: 'confirmed',
          date: { gte: in2Hours, lt: in2HoursEnd },
          reminderSent2h: false
        }
      });

      for (const appointment of appointments2h) {
        try {
          await sendMessage({
            merchantId: appointment.merchantId,
            to: appointment.clientPhone,
            text: `Olá ${appointment.clientName}! Seu agendamento é em aproximadamente 2 horas (${appointment.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}). Esperamos você!`
          });

          await prisma.appointment.update({
            where: { id: appointment.id },
            data: { reminderSent2h: true }
          });

          reminders2h++;
        } catch (err: any) {
          errors.push(`Erro ao enviar lembrete 2h ${appointment.id}: ${err.message}`);
        }
      }
    }

  } catch (err: any) {
    errors.push(`Erro geral: ${err.message}`);
  }

  console.log(`[AUTOMATION] Lembretes: ${reminders24h} (24h), ${reminders2h} (2h)`);
  return { reminders24h, reminders2h, errors };
}

// =============================================================================
// JOB 4: REATIVAÇÃO DE LEADS FRIOS
// =============================================================================

export async function reactivateColdLeads(): Promise<{
  contacted: number;
  errors: string[];
}> {
  console.log('[AUTOMATION] Reativando leads frios...');
  
  const errors: string[] = [];
  let contacted = 0;

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - CONFIG.COLD_LEAD_DAYS);

    // Buscar merchants com módulo PREDICTIVE ativo
    const merchantsWithPredictive = await prisma.merchant.findMany({
      where: {
        status: 'active',
        activeModules: { has: 'PREDICTIVE' }
      }
    });

    for (const merchant of merchantsWithPredictive) {
      try {
        // Encontrar clientes sem interação há X dias
        const coldLeads = await prisma.interactionLog.groupBy({
          by: ['sender'],
          where: {
            merchantId: merchant.id,
            createdAt: { lt: cutoffDate }
          },
          _max: { createdAt: true }
        });

        // Limitar a 10 leads por dia por merchant
        const leadsToContact = coldLeads.slice(0, 10);

        for (const lead of leadsToContact) {
          // Verificar se não foi contatado recentemente
          const recentContact = await prisma.interactionLog.findFirst({
            where: {
              merchantId: merchant.id,
              sender: lead.sender,
              question: '[COLD_LEAD_REACTIVATION]',
              createdAt: { gte: cutoffDate }
            }
          });

          if (!recentContact) {
            // Enviar mensagem de reativação
            const aiConfig = merchant.aiConfig as any || {};
            const businessName = aiConfig.name || merchant.name;

            await sendMessage({
              merchantId: merchant.id,
              to: lead.sender,
              text: `Oi! Faz um tempinho que não conversamos. Aqui na ${businessName} sentimos sua falta! Temos novidades e promoções especiais para você. Posso te contar mais?`
            });

            // Registrar contato
            await prisma.interactionLog.create({
              data: {
                merchantId: merchant.id,
                sender: lead.sender,
                question: '[COLD_LEAD_REACTIVATION]',
                answer: 'Mensagem de reativação enviada',
                tokensUsed: 0
              }
            });

            contacted++;
          }
        }
      } catch (err: any) {
        errors.push(`Erro ao processar merchant ${merchant.id}: ${err.message}`);
      }
    }

  } catch (err: any) {
    errors.push(`Erro geral: ${err.message}`);
  }

  console.log(`[AUTOMATION] Leads frios contatados: ${contacted}`);
  return { contacted, errors };
}

// =============================================================================
// JOB 5: VERIFICAR ANIVERSARIANTES
// =============================================================================

export async function checkBirthdays(): Promise<{
  contacted: number;
  errors: string[];
}> {
  console.log('[AUTOMATION] Verificando aniversariantes...');
  
  const errors: string[] = [];
  let contacted = 0;

  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Buscar merchants com módulo PREDICTIVE
    const merchantsWithPredictive = await prisma.merchant.findMany({
      where: {
        status: 'active',
        activeModules: { has: 'PREDICTIVE' }
      }
    });

    for (const merchant of merchantsWithPredictive) {
      try {
        // Buscar clientes que fazem aniversário hoje
        // Assumindo que temos uma tabela de clientes ou dados no knowledge base
        // Por ora, apenas log
        
        console.log(`[AUTOMATION] Verificando aniversariantes para ${merchant.id}`);
        
        // TODO: Implementar busca de aniversariantes quando tiver tabela de clientes
        
      } catch (err: any) {
        errors.push(`Erro ao processar merchant ${merchant.id}: ${err.message}`);
      }
    }

  } catch (err: any) {
    errors.push(`Erro geral: ${err.message}`);
  }

  console.log(`[AUTOMATION] Aniversariantes contatados: ${contacted}`);
  return { contacted, errors };
}

// =============================================================================
// JOB 6: RESET DE QUOTAS MENSAIS
// =============================================================================

export async function resetMonthlyQuotas(): Promise<{
  reset: number;
  errors: string[];
}> {
  console.log('[AUTOMATION] Resetando quotas mensais...');
  
  const now = new Date();
  const errors: string[] = [];
  let reset = 0;

  // Só executar no dia configurado
  if (now.getDate() !== CONFIG.QUOTA_RESET_DAY) {
    console.log(`[AUTOMATION] Hoje não é dia ${CONFIG.QUOTA_RESET_DAY}. Pulando reset.`);
    return { reset: 0, errors: [] };
  }

  try {
    // Resetar tokenUsage de todos os merchants ativos
    const result = await prisma.merchant.updateMany({
      where: {
        status: { in: ['active', 'trial', 'grace_period'] }
      },
      data: {
        tokenUsage: 0
      }
    });

    reset = result.count;

    await auditLog({
      action: 'MONTHLY_QUOTA_RESET',
      details: `${reset} merchants tiveram quotas resetadas`
    });

  } catch (err: any) {
    errors.push(`Erro geral: ${err.message}`);
  }

  console.log(`[AUTOMATION] Quotas resetadas: ${reset}`);
  return { reset, errors };
}

// =============================================================================
// JOB 7: LIMPEZA DE SESSÕES ANTIGAS
// =============================================================================

export async function cleanupOldSessions(): Promise<{
  deleted: number;
  errors: string[];
}> {
  console.log('[AUTOMATION] Limpando sessões antigas...');
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);

  const errors: string[] = [];
  let deleted = 0;

  try {
    // Deletar sessões antigas pausadas
    const result = await prisma.chatSession.deleteMany({
      where: {
        state: 'PAUSED',
        updatedAt: { lt: cutoffDate }
      }
    });

    deleted = result.count;

  } catch (err: any) {
    errors.push(`Erro: ${err.message}`);
  }

  console.log(`[AUTOMATION] Sessões deletadas: ${deleted}`);
  return { deleted, errors };
}

// =============================================================================
// FUNÇÃO AUXILIAR
// =============================================================================

async function deleteEvolutionInstance(instanceName: string): Promise<void> {
  const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';
  const apiKey = process.env.EVOLUTION_API_KEY;

  if (!instanceName || !apiKey) return;

  try {
    await fetch(`${evolutionUrl}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: { 'apikey': apiKey }
    });
  } catch (error) {
    console.error(`[EVOLUTION] Erro ao deletar instância ${instanceName}:`, error);
  }
}

// =============================================================================
// EXPORTAÇÃO PRINCIPAL
// =============================================================================

export const AutomationService = {
  checkExpiredTrials,
  checkGracePeriods,
  sendAppointmentReminders,
  reactivateColdLeads,
  checkBirthdays,
  resetMonthlyQuotas,
  cleanupOldSessions
};

export default AutomationService;
