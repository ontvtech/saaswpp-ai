/**
 * SERVIÇO DE MENSAGENS INTERATIVAS - SaaSWPP AI
 * 
 * Suporta:
 * - Botões de resposta rápida
 * - Listas de opções
 * - Produtos com botões
 * 
 * Usa Evolution API para enviar mensagens interativas
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// TIPOS
// =============================================================================

export interface InteractiveButton {
  id: string;
  text: string;
}

export interface InteractiveSection {
  title: string;
  rows: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
}

export interface InteractiveMessage {
  type: 'button' | 'list' | 'product';
  header?: {
    type: 'text' | 'image' | 'video';
    text?: string;
    image?: string;
    video?: string;
  };
  body: string;
  footer?: string;
  buttons?: InteractiveButton[];
  sections?: InteractiveSection[];
}

// =============================================================================
// ENVIO DE MENSAGENS INTERATIVAS
// =============================================================================

/**
 * Envia mensagem com botões
 */
export async function sendButtonMessage(
  merchantId: string,
  to: string,
  message: InteractiveMessage
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    });

    if (!merchant?.evolutionInstance) {
      return { success: false, error: 'Instância não configurada' };
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';
    const apiKey = process.env.EVOLUTION_API_KEY;

    // Montar payload conforme tipo
    let payload: any = {};

    if (message.type === 'button') {
      payload = {
        number: to,
        buttonMessage: {
          text: message.body,
          buttons: message.buttons?.map(btn => ({
            buttonId: btn.id,
            buttonText: { displayText: btn.text },
            type: 1
          })),
          header: message.header ? {
            type: message.header.type,
            text: message.header.text,
            image: message.header.image ? { url: message.header.image } : undefined
          } : undefined,
          footerText: message.footer
        }
      };
    } else if (message.type === 'list') {
      payload = {
        number: to,
        listMessage: {
          text: message.body,
          buttonText: 'Ver opções',
          sections: message.sections?.map(section => ({
            title: section.title,
            rows: section.rows.map(row => ({
              title: row.title,
              description: row.description || '',
              rowId: row.id
            }))
          })),
          title: message.header?.text || 'Menu',
          description: message.body,
          footerText: message.footer
        }
      };
    }

    // Enviar via Evolution API
    const endpoint = message.type === 'button' ? 'sendButton' : 'sendListMessage';
    const response = await fetch(
      `${evolutionUrl}/message/${endpoint}/${merchant.evolutionInstance}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey || ''
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[INTERACTIVE] Erro Evolution:', error);
      return { success: false, error };
    }

    const data = await response.json();
    
    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        merchantId,
        action: 'INTERACTIVE_MESSAGE_SENT',
        details: JSON.stringify({
          to,
          type: message.type,
          buttons: message.buttons?.length || message.sections?.length
        })
      }
    });

    return { 
      success: true, 
      messageId: data.key?.id || data.messageId 
    };

  } catch (error: any) {
    console.error('[INTERACTIVE] Erro:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Envia lista de horários disponíveis
 */
export async function sendAvailableSlots(
  merchantId: string,
  to: string,
  date: Date,
  slots: string[]
): Promise<{ success: boolean; error?: string }> {
  const message: InteractiveMessage = {
    type: 'list',
    header: { type: 'text', text: '📅 Horários Disponíveis' },
    body: `Escolha um horário para ${date.toLocaleDateString('pt-BR')}:`,
    footer: 'Clique em um horário para agendar',
    sections: [{
      title: 'Horários',
      rows: slots.map(slot => ({
        id: `slot_${slot.replace(':', '')}`,
        title: slot,
        description: 'Disponível'
      }))
    }]
  };

  return sendButtonMessage(merchantId, to, message);
}

/**
 * Envia menu de opções principal
 */
export async function sendMainMenu(
  merchantId: string,
  to: string,
  businessName: string
): Promise<{ success: boolean; error?: string }> {
  const message: InteractiveMessage = {
    type: 'list',
    header: { type: 'text', text: `👋 ${businessName}` },
    body: 'Como posso ajudar você hoje?',
    footer: 'Respondo em segundos!',
    sections: [
      {
        title: 'Atendimento',
        rows: [
          { id: 'opt_schedule', title: '📅 Agendar horário', description: 'Ver horários disponíveis' },
          { id: 'opt_products', title: '🛒 Ver produtos', description: 'Catálogo completo' },
          { id: 'opt_price', title: '💰 Consultar preço', description: 'Solicitar orçamento' }
        ]
      },
      {
        title: 'Informações',
        rows: [
          { id: 'opt_hours', title: '🕐 Horário de funcionamento', description: 'Quando atendemos' },
          { id: 'opt_location', title: '📍 Localização', description: 'Endereço e mapa' },
          { id: 'opt_talk_human', title: '👤 Falar com atendente', description: 'Transferir para humano' }
        ]
      }
    ]
  };

  return sendButtonMessage(merchantId, to, message);
}

/**
 * Envia confirmação com botões Sim/Não
 */
export async function sendConfirmation(
  merchantId: string,
  to: string,
  question: string
): Promise<{ success: boolean; error?: string }> {
  const message: InteractiveMessage = {
    type: 'button',
    body: question,
    footer: 'Escolha uma opção',
    buttons: [
      { id: 'confirm_yes', text: '✅ Sim' },
      { id: 'confirm_no', text: '❌ Não' }
    ]
  };

  return sendButtonMessage(merchantId, to, message);
}

/**
 * Processa resposta de botão/lista (chegou via webhook)
 */
export async function handleInteractiveResponse(
  merchantId: string,
  from: string,
  selectedId: string,
  selectedText: string
): Promise<void> {
  console.log(`[INTERACTIVE] Resposta recebida: ${selectedId} - ${selectedText}`);

  // Log da interação
  await prisma.auditLog.create({
    data: {
      merchantId,
      action: 'INTERACTIVE_RESPONSE',
      details: JSON.stringify({
        from,
        selectedId,
        selectedText
      })
    }
  });

  // Aqui você pode adicionar lógica específica
  // Por exemplo, se selectedId começar com 'slot_', é um agendamento
  // Se for 'opt_schedule', abre o fluxo de agendamento
}

export default {
  sendButtonMessage,
  sendAvailableSlots,
  sendMainMenu,
  sendConfirmation,
  handleInteractiveResponse
};
