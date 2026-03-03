/**
 * Grace Period Service
 * 
 * Sistema de Janela de Suspensão Ativa
 * - 5 dias de grace period com sistema funcionando
 * - 1 mensagem por dia avisando
 * - 48h finais após o 5° dia
 * - Suspensão automática se não pagar
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mensagens padrão (usadas se não configuradas no GlobalConfig)
const DEFAULT_MESSAGES = {
  day1: `⚠️ *Pagamento não processado*

Olá {nome}! Tivemos um problema com seu pagamento.
Nenhuma ação é necessária agora - vamos tentar novamente.

Seu sistema continua funcionando normalmente. 💚

*Equipe {platformName}*`,

  day2: `⚠️ *Lembrete de Pagamento*

Oi {nome}, seu pagamento ainda está pendente.
Você tem {diasRestantes} dias para regularizar sem interrupções.

Acesse: {platformUrl}/minha-conta

*Equipe {platformName}*`,

  day3: `⚠️ *3° Aviso - Pagamento Pendente*

{nome}, restam {diasRestantes} dias para regularizar seu pagamento.
Não queremos que você fique sem o sistema!

Precisa de ajuda? Responda esta mensagem.

*Equipe {platformName}*`,

  day4: `⚠️ *URGENTE: Pagamento Pendente*

{nome}, apenas {diasRestantes} dias restantes!
Sua conta pode ser suspensa se não regularizar.

Formas de pagamento: {platformUrl}/minha-conta

*Equipe {platformName}*`,

  day5: `🚨 *ÚLTIMO AVISO - 48 HORAS*

{nome}, este é seu último aviso!

Você tem apenas **{horasFinais} horas** para regularizar seu pagamento.
Após isso, sua conta será suspensa automaticamente.

Não perca seus dados e configurações!

*Equipe {platformName}*`,

  suspended: `❌ *Conta Suspensa*

{nome}, sua conta foi suspensa por inadimplência.

Para reativar, acesse: {platformUrl}/minha-conta
Ou responda esta mensagem para falar com suporte.

Estamos aqui para ajudar! 💚

*Equipe {platformName}*`
};

interface GracePeriodConfig {
  platformName: string;
  platformUrl: string;
  gracePeriodDays: number;
  gracePeriodFinalHours: number;
  messages: {
    day1: string;
    day2: string;
    day3: string;
    day4: string;
    day5: string;
    suspended: string;
  };
}

/**
 * Busca configuração do grace period
 * URL é detectada automaticamente via ENV (PLATFORM_URL)
 */
export async function getGracePeriodConfig(): Promise<GracePeriodConfig> {
  const config = await prisma.globalConfig.findUnique({
    where: { id: 'singleton' }
  });

  // URL automática - prioriza ENV, fallback para saaswpp.work
  const platformUrl = process.env.PLATFORM_URL || 
                      process.env.NEXT_PUBLIC_APP_URL || 
                      'https://saaswpp.work';

  return {
    platformName: config?.platformName || process.env.PLATFORM_NAME || 'SaaSWPP',
    platformUrl,
    gracePeriodDays: config?.gracePeriodDays || 5,
    gracePeriodFinalHours: config?.gracePeriodFinalHours || 48,
    messages: {
      day1: config?.graceMessageDay1 || DEFAULT_MESSAGES.day1,
      day2: config?.graceMessageDay2 || DEFAULT_MESSAGES.day2,
      day3: config?.graceMessageDay3 || DEFAULT_MESSAGES.day3,
      day4: config?.graceMessageDay4 || DEFAULT_MESSAGES.day4,
      day5: config?.graceMessageDay5 || DEFAULT_MESSAGES.day5,
      suspended: config?.graceMessageSuspended || DEFAULT_MESSAGES.suspended,
    }
  };
}

/**
 * Processa template de mensagem
 */
function processTemplate(template: string, vars: Record<string, string | number>): string {
  let message = template;
  for (const [key, value] of Object.entries(vars)) {
    message = message.replace(new RegExp(`{${key}}`, 'g'), String(value));
  }
  return message;
}

/**
 * Calcula qual dia do grace period estamos
 * Retorna: 1-5 (dias do grace), 6 (48h finais), 7+ (suspensão)
 */
export function calculateGraceDay(gracePeriodEndsAt: Date, gracePeriodDays: number): {
  day: number;
  diasRestantes: number;
  horasFinais: number;
  shouldSuspend: boolean;
} {
  const now = new Date();
  const graceStart = new Date(gracePeriodEndsAt);
  graceStart.setDate(graceStart.getDate() - gracePeriodDays); // Início do grace

  const diffMs = gracePeriodEndsAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  // Dias dentro do grace period (1-5)
  const daysSinceStart = Math.floor((now.getTime() - graceStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  return {
    day: daysSinceStart,
    diasRestantes: Math.max(0, diffDays),
    horasFinais: Math.max(0, diffHours),
    shouldSuspend: now >= gracePeriodEndsAt
  };
}

/**
 * Gera mensagem para o dia específico do grace period
 */
export async function generateGraceMessage(
  userName: string,
  day: number,
  diasRestantes: number,
  horasFinais: number
): Promise<string> {
  const config = await getGracePeriodConfig();
  
  const vars = {
    nome: userName,
    platformName: config.platformName,
    platformUrl: config.platformUrl,
    diasRestantes,
    horasFinais: config.gracePeriodFinalHours,
    diasTotal: config.gracePeriodDays,
  };

  switch (day) {
    case 1:
      return processTemplate(config.messages.day1, vars);
    case 2:
      return processTemplate(config.messages.day2, vars);
    case 3:
      return processTemplate(config.messages.day3, vars);
    case 4:
      return processTemplate(config.messages.day4, vars);
    case 5:
      return processTemplate(config.messages.day5, vars);
    default:
      return processTemplate(config.messages.day5, vars);
  }
}

/**
 * Gera mensagem de suspensão
 */
export async function generateSuspendedMessage(userName: string): Promise<string> {
  const config = await getGracePeriodConfig();
  
  return processTemplate(config.messages.suspended, {
    nome: userName,
    platformName: config.platformName,
    platformUrl: config.platformUrl,
  });
}

/**
 * Entra em grace period
 * Chamado quando pagamento falha
 */
export async function enterGracePeriod(
  entityType: 'RESELLER' | 'MERCHANT',
  entityId: string
): Promise<void> {
  const config = await getGracePeriodConfig();
  const graceEndsAt = new Date();
  graceEndsAt.setDate(graceEndsAt.getDate() + config.gracePeriodDays);
  // Adiciona as horas finais
  graceEndsAt.setHours(graceEndsAt.getHours() + config.gracePeriodFinalHours / 24);

  if (entityType === 'RESELLER') {
    await prisma.reseller.update({
      where: { id: entityId },
      data: {
        status: 'grace_period',
        gracePeriodEndsAt: graceEndsAt,
      }
    });
  } else {
    await prisma.merchant.update({
      where: { id: entityId },
      data: {
        status: 'grace_period',
        gracePeriodEndsAt: graceEndsAt,
      }
    });
  }

  console.log(`[GRACE] ${entityType} ${entityId} entrou em grace period até ${graceEndsAt.toISOString()}`);
}

/**
 * Sai do grace period (pagamento realizado)
 */
export async function exitGracePeriod(
  entityType: 'RESELLER' | 'MERCHANT',
  entityId: string
): Promise<void> {
  if (entityType === 'RESELLER') {
    await prisma.reseller.update({
      where: { id: entityId },
      data: {
        status: 'active',
        gracePeriodEndsAt: null,
      }
    });
  } else {
    await prisma.merchant.update({
      where: { id: entityId },
      data: {
        status: 'active',
        gracePeriodEndsAt: null,
      }
    });
  }

  console.log(`[GRACE] ${entityType} ${entityId} saiu do grace period - pagamento confirmado`);
}

/**
 * Suspende conta
 */
export async function suspendAccount(
  entityType: 'RESELLER' | 'MERCHANT',
  entityId: string
): Promise<void> {
  if (entityType === 'RESELLER') {
    await prisma.reseller.update({
      where: { id: entityId },
      data: {
        status: 'suspended',
        gracePeriodEndsAt: null,
      }
    });
  } else {
    await prisma.merchant.update({
      where: { id: entityId },
      data: {
        status: 'suspended',
        gracePeriodEndsAt: null,
      }
    });
  }

  console.log(`[GRACE] ${entityType} ${entityId} SUSPENSO por inadimplência`);
}

/**
 * Job diário do grace period
 * Deve ser executado 1x por dia (cron)
 */
export async function runGracePeriodJob(): Promise<{
  processed: number;
  suspended: number;
  messages: Array<{ type: string; id: string; day: number; phone: string }>;
}> {
  const config = await getGracePeriodConfig();
  const now = new Date();
  
  const result = {
    processed: 0,
    suspended: 0,
    messages: [] as Array<{ type: string; id: string; day: number; phone: string }>,
  };

  // Buscar Revendedores em grace period
  const resellersInGrace = await prisma.reseller.findMany({
    where: {
      status: 'grace_period',
      gracePeriodEndsAt: { not: null },
    }
  });

  for (const reseller of resellersInGrace) {
    result.processed++;
    
    const { day, shouldSuspend } = calculateGraceDay(
      reseller.gracePeriodEndsAt!,
      config.gracePeriodDays
    );

    if (shouldSuspend) {
      // Suspender
      await suspendAccount('RESELLER', reseller.id);
      result.suspended++;
      
      // Enviar mensagem de suspensão
      if (reseller.whatsappNumber) {
        result.messages.push({
          type: 'RESELLER',
          id: reseller.id,
          day: -1, // Suspenso
          phone: reseller.whatsappNumber,
        });
      }
    } else {
      // Enviar mensagem do dia
      if (reseller.whatsappNumber && day >= 1 && day <= 5) {
        result.messages.push({
          type: 'RESELLER',
          id: reseller.id,
          day,
          phone: reseller.whatsappNumber,
        });
      }
    }
  }

  // Buscar Lojistas em grace period
  const merchantsInGrace = await prisma.merchant.findMany({
    where: {
      status: 'grace_period',
      gracePeriodEndsAt: { not: null },
    }
  });

  for (const merchant of merchantsInGrace) {
    result.processed++;
    
    const { day, shouldSuspend } = calculateGraceDay(
      merchant.gracePeriodEndsAt!,
      config.gracePeriodDays
    );

    if (shouldSuspend) {
      // Suspender
      await suspendAccount('MERCHANT', merchant.id);
      result.suspended++;
      
      // Enviar mensagem de suspensão
      if (merchant.phoneNumber) {
        result.messages.push({
          type: 'MERCHANT',
          id: merchant.id,
          day: -1, // Suspenso
          phone: merchant.phoneNumber,
        });
      }
    } else {
      // Enviar mensagem do dia
      if (merchant.phoneNumber && day >= 1 && day <= 5) {
        result.messages.push({
          type: 'MERCHANT',
          id: merchant.id,
          day,
          phone: merchant.phoneNumber,
        });
      }
    }
  }

  console.log(`[GRACE JOB] Processados: ${result.processed}, Suspensos: ${result.suspended}, Mensagens: ${result.messages.length}`);
  
  return result;
}

/**
 * Retorna lista de contas em grace period para o dashboard
 */
export async function getGracePeriodOverview() {
  const config = await getGracePeriodConfig();
  
  const [resellers, merchants] = await Promise.all([
    prisma.reseller.findMany({
      where: { status: 'grace_period' },
      select: {
        id: true,
        name: true,
        email: true,
        whatsappNumber: true,
        gracePeriodEndsAt: true,
      }
    }),
    prisma.merchant.findMany({
      where: { status: 'grace_period' },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        gracePeriodEndsAt: true,
        reseller: {
          select: { name: true }
        }
      }
    })
  ]);

  const resellersWithDays = resellers.map(r => ({
    ...r,
    type: 'RESELLER' as const,
    daysRemaining: r.gracePeriodEndsAt 
      ? Math.ceil((r.gracePeriodEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0,
  }));

  const merchantsWithDays = merchants.map(m => ({
    ...m,
    type: 'MERCHANT' as const,
    daysRemaining: m.gracePeriodEndsAt 
      ? Math.ceil((m.gracePeriodEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0,
  }));

  return {
    config,
    resellers: resellersWithDays,
    merchants: merchantsWithDays,
    total: resellers.length + merchants.length,
  };
}
