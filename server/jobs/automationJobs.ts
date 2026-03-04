/**
 * JOBS DE AUTOMAÇÃO - SaaSWPP AI
 * Versão: 2.0.0
 * 
 * Agendamento de jobs periódicos:
 * - Trials: Verificação horária
 * - Grace Period: Verificação a cada 6 horas
 * - Agendamentos: Lembretes a cada 15 minutos
 * - Leads: Reativação semanal
 * - Quotas: Reset mensal
 * - Limpeza: Diária
 */

import { Queue, FlowProducer } from 'bullmq';

// =============================================================================
// CONFIGURAÇÃO DA FILA
// =============================================================================

export const automationQueue = new Queue('automation', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000
    },
    removeOnComplete: {
      count: 100,  // Manter últimos 100 jobs completados
      age: 7 * 24 * 3600  // Por 7 dias
    },
    removeOnFail: {
      count: 50,   // Manter últimos 50 jobs falhos
      age: 30 * 24 * 3600  // Por 30 dias
    }
  }
});

// =============================================================================
// TIPOS DE JOBS
// =============================================================================

export const JOB_TYPES = {
  // Críticos - Execução frequente
  CHECK_EXPIRED_TRIALS: 'check-expired-trials',
  CHECK_GRACE_PERIOD: 'check-grace-period',
  SEND_APPOINTMENT_REMINDERS: 'send-appointment-reminders',

  // Diários
  CLEAN_OLD_SESSIONS: 'cleanup-old-sessions',
  CHECK_BIRTHDAYS: 'check-birthdays',
  HEALTH_CHECK: 'health-check',

  // Semanais
  REACTIVATE_COLD_LEADS: 'reactivate-cold-leads',

  // Mensais
  RESET_MONTHLY_QUOTAS: 'reset-monthly-quotas'
} as const;

// =============================================================================
// INTERVALOS
// =============================================================================

const INTERVALS = {
  HOURLY: 60 * 60 * 1000,           // 1 hora
  EVERY_6H: 6 * 60 * 60 * 1000,     // 6 horas
  EVERY_15M: 15 * 60 * 1000,        // 15 minutos
  DAILY: 24 * 60 * 60 * 1000,       // 24 horas
  WEEKLY: 7 * 24 * 60 * 60 * 1000,  // 7 dias
  MONTHLY: 30 * 24 * 60 * 60 * 1000 // 30 dias (aproximado)
};

// =============================================================================
// AGENDAMENTO
// =============================================================================

export async function scheduleJobs() {
  console.log('[SCHEDULER] Agendando jobs de automação...');

  try {
    // Limpar agendamentos anteriores
    await automationQueue.obliterate({ force: true });
    console.log('[SCHEDULER] Jobs anteriores removidos');

    // 1. Verificação de Trials (a cada hora)
    await automationQueue.add(
      JOB_TYPES.CHECK_EXPIRED_TRIALS,
      { reason: 'Verificar trials expirados' },
      {
        repeat: { every: INTERVALS.HOURLY },
        priority: 1
      }
    );

    // 2. Verificação de Grace Period (a cada 6 horas)
    await automationQueue.add(
      JOB_TYPES.CHECK_GRACE_PERIOD,
      { reason: 'Verificar grace periods expirados' },
      {
        repeat: { every: INTERVALS.EVERY_6H },
        priority: 1
      }
    );

    // 3. Lembretes de Agendamento (a cada 15 minutos)
    await automationQueue.add(
      JOB_TYPES.SEND_APPOINTMENT_REMINDERS,
      { reason: 'Enviar lembretes de agendamento' },
      {
        repeat: { every: INTERVALS.EVERY_15M },
        priority: 2
      }
    );

    // 4. Limpeza de Sessões (diariamente às 3h)
    await automationQueue.add(
      JOB_TYPES.CLEAN_OLD_SESSIONS,
      { reason: 'Limpar sessões antigas' },
      {
        repeat: { 
          pattern: '0 3 * * *'  // Cron: 3h da manhã todos os dias
        },
        priority: 5
      }
    );

    // 5. Verificação de Aniversariantes (diariamente às 9h)
    await automationQueue.add(
      JOB_TYPES.CHECK_BIRTHDAYS,
      { reason: 'Verificar aniversariantes do dia' },
      {
        repeat: {
          pattern: '0 9 * * *'  // Cron: 9h da manhã
        },
        priority: 3
      }
    );

    // 6. Reativação de Leads Frios (semanalmente, segunda às 10h)
    await automationQueue.add(
      JOB_TYPES.REACTIVATE_COLD_LEADS,
      { reason: 'Reativar leads frios' },
      {
        repeat: {
          pattern: '0 10 * * 1'  // Cron: Toda segunda às 10h
        },
        priority: 4
      }
    );

    // 7. Reset de Quotas (dia 1 de cada mês à meia-noite)
    await automationQueue.add(
      JOB_TYPES.RESET_MONTHLY_QUOTAS,
      { reason: 'Resetar quotas mensais' },
      {
        repeat: {
          pattern: '0 0 1 * *'  // Cron: Dia 1 à meia-noite
        },
        priority: 1
      }
    );

    // 8. Health Check (a cada 5 minutos)
    await automationQueue.add(
      JOB_TYPES.HEALTH_CHECK,
      { reason: 'Verificar saúde do sistema' },
      {
        repeat: { every: 5 * 60 * 1000 },
        priority: 10
      }
    );

    console.log('[SCHEDULER] ✓ Todos os jobs agendados com sucesso');

  } catch (error) {
    console.error('[SCHEDULER] Erro ao agendar jobs:', error);
    throw error;
  }
}

// =============================================================================
// JOBS MANUAIS
// =============================================================================

export async function triggerJobNow(jobType: string, data?: any) {
  const job = await automationQueue.add(jobType, data || {}, {
    priority: 0  // Alta prioridade
  });
  
  console.log(`[SCHEDULER] Job ${jobType} adicionado manualmente (ID: ${job.id})`);
  return job.id;
}

// =============================================================================
// STATUS DA FILA
// =============================================================================

export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    automationQueue.getWaitingCount(),
    automationQueue.getActiveCount(),
    automationQueue.getCompletedCount(),
    automationQueue.getFailedCount(),
    automationQueue.getDelayedCount()
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed
  };
}

// =============================================================================
// EXPORTAÇÃO
// =============================================================================

export default {
  automationQueue,
  JOB_TYPES,
  scheduleJobs,
  triggerJobNow,
  getQueueStats
};
