/**
 * Grace Period Daily Job
 * 
 * Executado diariamente às 9:00 para:
 * 1. Enviar mensagens para contas em grace period
 * 2. Suspender contas que passaram do prazo
 * 
 * Integração com BullMQ para filas
 */

import { Queue, Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { 
  runGracePeriodJob, 
  generateGraceMessage, 
  generateSuspendedMessage,
  getGracePeriodConfig 
} from '../services/gracePeriodService';
import { sendWhatsAppMessage } from '../services/whatsappService';

const prisma = new PrismaClient();

// Fila de Grace Period
export const gracePeriodQueue = new Queue('grace-period', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

// Worker para processar jobs
export const gracePeriodWorker = new Worker(
  'grace-period',
  async (job: Job) => {
    console.log(`[GRACE JOB] Processando job ${job.id} - ${job.name}`);

    switch (job.name) {
      case 'daily-check':
        return await processDailyCheck();
      
      case 'send-message':
        return await processSendMessage(job.data);
      
      case 'suspend-account':
        return await processSuspendAccount(job.data);
      
      default:
        console.log(`[GRACE JOB] Job desconhecido: ${job.name}`);
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    concurrency: 5,
  }
);

/**
 * Job diário principal - verifica todas as contas em grace period
 */
async function processDailyCheck() {
  console.log('[GRACE JOB] Iniciando verificação diária...');
  
  const result = await runGracePeriodJob();
  
  // Enfileirar envio de mensagens
  for (const msg of result.messages) {
    await gracePeriodQueue.add('send-message', msg, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 },
    });
  }
  
  console.log(`[GRACE JOB] Verificação concluída: ${result.processed} processados, ${result.suspended} suspensos`);
  
  return result;
}

/**
 * Envia mensagem via WhatsApp
 */
async function processSendMessage(data: {
  type: 'RESELLER' | 'MERCHANT';
  id: string;
  day: number;
  phone: string;
}) {
  const { type, id, day, phone } = data;
  
  try {
    // Buscar dados do usuário
    let userName = '';
    let entityType = type;
    
    if (type === 'RESELLER') {
      const reseller = await prisma.reseller.findUnique({ where: { id } });
      if (!reseller) throw new Error('Revendedor não encontrado');
      userName = reseller.name;
    } else {
      const merchant = await prisma.merchant.findUnique({ where: { id } });
      if (!merchant) throw new Error('Lojista não encontrado');
      userName = merchant.name;
    }
    
    // Gerar mensagem
    let message: string;
    const config = await getGracePeriodConfig();
    
    if (day === -1) {
      // Mensagem de suspensão
      message = await generateSuspendedMessage(userName);
    } else {
      // Mensagem do dia
      message = await generateGraceMessage(userName, day, 0, config.gracePeriodFinalHours);
    }
    
    // Enviar via WhatsApp
    await sendWhatsAppMessage(phone, message, type === 'MERCHANT' ? id : undefined);
    
    // Registrar log
    await prisma.auditLog.create({
      data: {
        resellerId: type === 'RESELLER' ? id : undefined,
        merchantId: type === 'MERCHANT' ? id : undefined,
        action: 'GRACE_MESSAGE_SENT',
        details: `Mensagem dia ${day} enviada para ${phone}`
      }
    });
    
    console.log(`[GRACE JOB] Mensagem enviada para ${entityType} ${id} (${phone})`);
    
    return { success: true, phone, day };
  } catch (error: any) {
    console.error(`[GRACE JOB] Erro ao enviar mensagem:`, error.message);
    throw error;
  }
}

/**
 * Suspende conta
 */
async function processSuspendAccount(data: {
  type: 'RESELLER' | 'MERCHANT';
  id: string;
}) {
  const { type, id } = data;
  
  try {
    if (type === 'RESELLER') {
      await prisma.reseller.update({
        where: { id },
        data: { 
          status: 'suspended',
          gracePeriodEndsAt: null 
        }
      });
    } else {
      await prisma.merchant.update({
        where: { id },
        data: { 
          status: 'suspended',
          gracePeriodEndsAt: null 
        }
      });
    }
    
    await prisma.auditLog.create({
      data: {
        resellerId: type === 'RESELLER' ? id : undefined,
        merchantId: type === 'MERCHANT' ? id : undefined,
        action: 'ACCOUNT_SUSPENDED',
        details: 'Conta suspensa automaticamente por inadimplência'
      }
    });
    
    console.log(`[GRACE JOB] ${type} ${id} suspenso`);
    
    return { success: true, type, id };
  } catch (error: any) {
    console.error(`[GRACE JOB] Erro ao suspender:`, error.message);
    throw error;
  }
}

/**
 * Agendar job diário
 * Deve ser chamado na inicialização do servidor
 */
export async function scheduleGracePeriodJob() {
  // Agendar execução diária às 9:00
  const job = await gracePeriodQueue.add(
    'daily-check',
    {},
    {
      repeat: {
        pattern: '0 9 * * *', // Todo dia às 9:00
        tz: 'America/Sao_Paulo',
      },
      jobId: 'grace-period-daily',
    }
  );
  
  console.log(`[GRACE JOB] Job diário agendado: ${job.id}`);
  
  return job;
}

/**
 * Executar manualmente (para testes ou admin)
 */
export async function runGracePeriodNow() {
  const job = await gracePeriodQueue.add('daily-check', {}, {
    jobId: `manual-${Date.now()}`,
  });
  
  return job.id;
}

/**
 * Estatísticas da fila
 */
export async function getGracePeriodQueueStats() {
  const [waiting, active, completed, failed] = await Promise.all([
    gracePeriodQueue.getWaitingCount(),
    gracePeriodQueue.getActiveCount(),
    gracePeriodQueue.getCompletedCount(),
    gracePeriodQueue.getFailedCount(),
  ]);
  
  return { waiting, active, completed, failed };
}

// Eventos do worker
gracePeriodWorker.on('completed', (job) => {
  console.log(`[GRACE JOB] Job ${job.id} completado`);
});

gracePeriodWorker.on('failed', (job, err) => {
  console.error(`[GRACE JOB] Job ${job?.id} falhou:`, err.message);
});
