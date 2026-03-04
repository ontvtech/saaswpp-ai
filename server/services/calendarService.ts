/**
 * SERVIÇO DE SINCRONIZAÇÃO DE CALENDÁRIO - SaaSWPP AI
 * 
 * Sincroniza agendamentos com Google Calendar e Microsoft Outlook
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// TIPOS
// =============================================================================

export interface CalendarProvider {
  type: 'google' | 'outlook';
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  calendarId?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: Array<{ email: string; name?: string }>;
  reminders?: Array<{ minutes: number; method: 'email' | 'popup' }>;
}

export interface SyncResult {
  success: boolean;
  eventId?: string;
  eventUrl?: string;
  error?: string;
}

export interface CalendarConfig {
  merchantId: string;
  provider: 'google' | 'outlook';
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  calendarId: string;
  syncEnabled: boolean;
  autoConfirm: boolean;
  defaultDuration: number; // minutos
  workingHours: {
    start: string; // "09:00"
    end: string;   // "18:00"
    days: number[]; // [1,2,3,4,5] = seg-sex
  };
}

// =============================================================================
// INTEGRAÇÃO GOOGLE CALENDAR
// =============================================================================

/**
 * Cria evento no Google Calendar
 */
async function createGoogleEvent(
  config: CalendarConfig,
  event: CalendarEvent
): Promise<SyncResult> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${config.calendarId}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: event.title,
          description: event.description,
          start: {
            dateTime: event.start.toISOString(),
            timeZone: 'America/Sao_Paulo'
          },
          end: {
            dateTime: event.end.toISOString(),
            timeZone: 'America/Sao_Paulo'
          },
          location: event.location,
          attendees: event.attendees?.map(a => ({ email: a.email, displayName: a.name })),
          reminders: {
            useDefault: false,
            overrides: event.reminders?.map(r => ({
              minutes: r.minutes,
              method: r.method
            })) || [
              { minutes: 60, method: 'popup' },    // 1h antes
              { minutes: 1440, method: 'email' }   // 1 dia antes
            ]
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[CALENDAR] Erro Google:', error);
      
      // Se token expirado, tentar refresh
      if (response.status === 401) {
        return { success: false, error: 'TOKEN_EXPIRED' };
      }
      
      return { success: false, error };
    }

    const data = await response.json();
    
    return {
      success: true,
      eventId: data.id,
      eventUrl: data.htmlLink
    };

  } catch (error: any) {
    console.error('[CALENDAR] Erro:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Atualiza evento no Google Calendar
 */
async function updateGoogleEvent(
  config: CalendarConfig,
  eventId: string,
  event: CalendarEvent
): Promise<SyncResult> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${config.calendarId}/events/${eventId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: event.title,
          description: event.description,
          start: {
            dateTime: event.start.toISOString(),
            timeZone: 'America/Sao_Paulo'
          },
          end: {
            dateTime: event.end.toISOString(),
            timeZone: 'America/Sao_Paulo'
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const data = await response.json();
    
    return {
      success: true,
      eventId: data.id,
      eventUrl: data.htmlLink
    };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Deleta evento no Google Calendar
 */
async function deleteGoogleEvent(
  config: CalendarConfig,
  eventId: string
): Promise<SyncResult> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${config.calendarId}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`
        }
      }
    );

    if (!response.ok && response.status !== 204) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Busca horários disponíveis no Google Calendar
 */
async function getGoogleAvailableSlots(
  config: CalendarConfig,
  date: Date,
  durationMinutes: number
): Promise<string[]> {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(parseInt(config.workingHours.start.split(':')[0]), 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(parseInt(config.workingHours.end.split(':')[0]), 0, 0, 0);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/freeBusy`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          items: [{ id: config.calendarId }]
        })
      }
    );

    if (!response.ok) {
      return generateDefaultSlots(config);
    }

    const data = await response.json();
    const busyPeriods = data.calendars?.[config.calendarId]?.busy || [];

    // Gerar slots disponíveis
    const slots: string[] = [];
    let currentTime = new Date(startOfDay);

    while (currentTime < endOfDay) {
      const slotEnd = new Date(currentTime.getTime() + durationMinutes * 60000);
      
      // Verificar se está em período ocupado
      const isBusy = busyPeriods.some((busy: any) => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return (currentTime < busyEnd && slotEnd > busyStart);
      });

      if (!isBusy) {
        slots.push(currentTime.toLocaleTimeString('pt-BR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }));
      }

      currentTime = new Date(currentTime.getTime() + 30 * 60000); // Incremento de 30 min
    }

    return slots;

  } catch (error) {
    return generateDefaultSlots(config);
  }
}

// =============================================================================
// INTEGRAÇÃO MICROSOFT OUTLOOK
// =============================================================================

/**
 * Cria evento no Outlook
 */
async function createOutlookEvent(
  config: CalendarConfig,
  event: CalendarEvent
): Promise<SyncResult> {
  try {
    const response = await fetch(
      'https://graph.microsoft.com/v1.0/me/events',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject: event.title,
          body: {
            contentType: 'text',
            content: event.description || ''
          },
          start: {
            dateTime: event.start.toISOString(),
            timeZone: 'America/Sao_Paulo'
          },
          end: {
            dateTime: event.end.toISOString(),
            timeZone: 'America/Sao_Paulo'
          },
          location: event.location ? { displayName: event.location } : undefined,
          attendees: event.attendees?.map(a => ({
            emailAddress: { address: a.email, name: a.name || a.email }
          }))
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[CALENDAR] Erro Outlook:', error);
      return { success: false, error };
    }

    const data = await response.json();
    
    return {
      success: true,
      eventId: data.id,
      eventUrl: data.webLink
    };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =============================================================================
// FUNÇÕES PRINCIPAIS
// =============================================================================

/**
 * Sincroniza agendamento com calendário
 */
export async function syncAppointment(
  merchantId: string,
  appointment: {
    id: string;
    clientName: string;
    clientPhone: string;
    service: string;
    date: Date;
    duration: number;
    notes?: string;
  }
): Promise<SyncResult> {
  // Buscar configuração de calendário
  const config = await prisma.calendarConfig.findUnique({
    where: { merchantId }
  });

  if (!config || !config.syncEnabled) {
    return { success: false, error: 'Sincronização não configurada' };
  }

  const calendarConfig: CalendarConfig = {
    merchantId: config.merchantId,
    provider: config.provider as 'google' | 'outlook',
    accessToken: config.accessToken,
    refreshToken: config.refreshToken,
    expiresAt: config.expiresAt,
    calendarId: config.calendarId || 'primary',
    syncEnabled: config.syncEnabled,
    autoConfirm: config.autoConfirm,
    defaultDuration: config.defaultDuration,
    workingHours: config.workingHours as any
  };

  const event: CalendarEvent = {
    id: appointment.id,
    title: `${appointment.service} - ${appointment.clientName}`,
    description: `Cliente: ${appointment.clientName}\nTelefone: ${appointment.clientPhone}\n${appointment.notes || ''}`,
    start: appointment.date,
    end: new Date(appointment.date.getTime() + appointment.duration * 60000),
    reminders: [
      { minutes: 60, method: 'popup' },
      { minutes: 1440, method: 'email' }
    ]
  };

  let result: SyncResult;

  if (calendarConfig.provider === 'google') {
    result = await createGoogleEvent(calendarConfig, event);
  } else {
    result = await createOutlookEvent(calendarConfig, event);
  }

  // Salvar ID do evento no agendamento
  if (result.success && result.eventId) {
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { 
        externalEventId: result.eventId,
        externalEventUrl: result.eventUrl
      }
    });
  }

  return result;
}

/**
 * Cancela evento no calendário
 */
export async function cancelCalendarEvent(
  merchantId: string,
  externalEventId: string
): Promise<SyncResult> {
  const config = await prisma.calendarConfig.findUnique({
    where: { merchantId }
  });

  if (!config) {
    return { success: false, error: 'Configuração não encontrada' };
  }

  const calendarConfig: CalendarConfig = {
    merchantId: config.merchantId,
    provider: config.provider as 'google' | 'outlook',
    accessToken: config.accessToken,
    refreshToken: config.refreshToken,
    expiresAt: config.expiresAt,
    calendarId: config.calendarId || 'primary',
    syncEnabled: config.syncEnabled,
    autoConfirm: config.autoConfirm,
    defaultDuration: config.defaultDuration,
    workingHours: config.workingHours as any
  };

  if (calendarConfig.provider === 'google') {
    return deleteGoogleEvent(calendarConfig, externalEventId);
  }

  // Outlook - deletar evento
  try {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/events/${externalEventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${calendarConfig.accessToken}`
        }
      }
    );

    if (!response.ok && response.status !== 204) {
      const error = await response.text();
      return { success: false, error };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Busca horários disponíveis
 */
export async function getAvailableSlots(
  merchantId: string,
  date: Date,
  durationMinutes: number = 30
): Promise<string[]> {
  const config = await prisma.calendarConfig.findUnique({
    where: { merchantId }
  });

  if (!config) {
    return generateDefaultSlots({
      workingHours: {
        start: '09:00',
        end: '18:00',
        days: [1, 2, 3, 4, 5]
      }
    } as any, durationMinutes);
  }

  const calendarConfig: CalendarConfig = {
    merchantId: config.merchantId,
    provider: config.provider as 'google' | 'outlook',
    accessToken: config.accessToken,
    refreshToken: config.refreshToken,
    expiresAt: config.expiresAt,
    calendarId: config.calendarId || 'primary',
    syncEnabled: config.syncEnabled,
    autoConfirm: config.autoConfirm,
    defaultDuration: config.defaultDuration,
    workingHours: config.workingHours as any
  };

  if (calendarConfig.provider === 'google') {
    return getGoogleAvailableSlots(calendarConfig, date, durationMinutes);
  }

  // Outlook - implementação similar
  return generateDefaultSlots(calendarConfig, durationMinutes);
}

/**
 * Gera slots padrão (quando não tem conexão com calendário)
 */
function generateDefaultSlots(config: CalendarConfig, durationMinutes: number = 30): string[] {
  const slots: string[] = [];
  const [startHour] = config.workingHours.start.split(':').map(Number);
  const [endHour] = config.workingHours.end.split(':').map(Number);

  for (let hour = startHour; hour < endHour; hour++) {
    for (let min = 0; min < 60; min += 30) {
      slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }
  }

  return slots;
}

/**
 * Salva/Atualiza configuração de calendário
 */
export async function saveCalendarConfig(
  merchantId: string,
  config: Partial<CalendarConfig>
): Promise<void> {
  await prisma.calendarConfig.upsert({
    where: { merchantId },
    create: {
      merchantId,
      provider: config.provider || 'google',
      accessToken: config.accessToken || '',
      refreshToken: config.refreshToken || '',
      expiresAt: config.expiresAt || new Date(),
      calendarId: config.calendarId || 'primary',
      syncEnabled: config.syncEnabled ?? true,
      autoConfirm: config.autoConfirm ?? false,
      defaultDuration: config.defaultDuration || 30,
      workingHours: config.workingHours || {
        start: '09:00',
        end: '18:00',
        days: [1, 2, 3, 4, 5]
      }
    },
    update: {
      ...config
    }
  });
}

export default {
  syncAppointment,
  cancelCalendarEvent,
  getAvailableSlots,
  saveCalendarConfig
};
