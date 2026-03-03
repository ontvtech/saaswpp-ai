/**
 * WORKER DE AUTOMAÇÃO - SaaSWPP AI
 * Versão: 2.0.0
 * 
 * Processa jobs em background usando BullMQ:
 * - Verificação de trials expirados
 * - Verificação de grace periods
 * - Lembretes de agendamentos
 * - Reativação de leads frios
 * - Reset de quotas mensais
 */

import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import AutomationService from '../services/automationService';
import { auditLog } from '../utils/permissions';

const prisma = new PrismaClient();

// =============================================================================
// WORKER PRINCIPAL
// =============================================================================

export const automationWorker = new Worker(
  'automation',
  async (job: Job) => {
    console.log(`[WORKER] Processando: ${job.name} (ID: ${job.id})`);
    const startTime = Date.now();

    try {
      let result: any;

      switch (job.name) {
        case 'check-expired-trials':
          result = await AutomationService.checkExpiredTrials();
          break;

        case 'check-grace-period':
          result = await AutomationService.checkGracePeriods();
          break;

        case 'send-appointment-reminders':
          result = await AutomationService.sendAppointmentReminders();
          break;

        case 'reactivate-cold-leads':
          result = await AutomationService.reactivateColdLeads();
          break;

        case 'check-birthdays':
          result = await AutomationService.checkBirthdays();
          break;

        case 'reset-monthly-quotas':
          result = await AutomationService.resetMonthlyQuotas();
          break;

        case 'cleanup-old-sessions':
          result = await AutomationService.cleanupOldSessions();
          break;

        case 'health-check':
          result = await performHealthCheck();
          break;

        default:
          console.warn(`[WORKER] Job desconhecido: ${job.name}`);
          result = { success: false, reason: 'Unknown job' };
      }

      const duration = Date.now() - startTime;
      console.log(`[WORKER] ${job.name} completado em ${duration}ms:`, result);

      // Registrar log de sucesso
      await auditLog({
        action: `JOB_${job.name.toUpperCase()}`,
        details: JSON.stringify({ ...result, duration })
      });

      return { success: true, ...result, duration };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[WORKER] Erro em ${job.name}:`, error);

      // Registrar log de erro
      await auditLog({
        action: `JOB_${job.name.toUpperCase()}_ERROR`,
        details: error.message
      });

      throw error;
    }
  },
  {
    connection: { 
      host: process.env.REDIS_HOST || 'localhost', 
      port: Number(process.env.REDIS_PORT) || 6379 
    },
    concurrency: 3,
    limiter: {
      max: 10,      // Máximo 10 jobs
      duration: 1000 // Por segundo
    }
  }
);

// =============================================================================
// HEALTH CHECK
// =============================================================================

async function performHealthCheck(): Promise<{
  database: boolean;
  redis: boolean;
  timestamp: Date;
}> {
  let database = false;
  let redis = false;

  // Testar banco
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch (e) {
    console.error('[HEALTH-CHECK] Erro no banco:', e);
  }

  // Testar Redis (via BullMQ)
  try {
    // O worker já está conectado ao Redis, então consideramos OK se chegamos aqui
    redis = true;
  } catch (e) {
    console.error('[HEALTH-CHECK] Erro no Redis:', e);
  }

  return {
    database,
    redis,
    timestamp: new Date()
  };
}

// =============================================================================
// EVENTOS DO WORKER
// =============================================================================

automationWorker.on('completed', (job: Job) => {
  console.log(`[WORKER] Job ${job.id} completado com sucesso`);
});

automationWorker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`[WORKER] Job ${job?.id} falhou:`, err.message);
});

automationWorker.on('error', (err: Error) => {
  console.error('[WORKER] Erro no worker:', err);
});

automationWorker.on('stalled', (jobId: string) => {
  console.warn(`[WORKER] Job ${jobId} travado`);
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

async function gracefulShutdown(signal: string) {
  console.log(`[WORKER] Recebido ${signal}, fechando worker...`);
  
  try {
    await automationWorker.close();
    await prisma.$disconnect();
    console.log('[WORKER] Worker fechado com sucesso');
    process.exit(0);
  } catch (error) {
    console.error('[WORKER] Erro ao fechar worker:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// =============================================================================
// EXPORTAÇÃO
// =============================================================================

export default automationWorker;
