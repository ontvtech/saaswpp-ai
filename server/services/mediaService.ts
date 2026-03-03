/**
 * SERVIÇO DE ENVIO DE MÍDIA - SaaSWPP AI
 * 
 * Envia imagens, vídeos, áudios e documentos via WhatsApp
 */

import { PrismaClient } from '@prisma/client';
import { uploadToStorage, deleteFromStorage } from './storageService';

const prisma = new PrismaClient();

// =============================================================================
// TIPOS
// =============================================================================

export type MediaType = 'image' | 'video' | 'audio' | 'document';

export interface MediaFile {
  id: string;
  merchantId: string;
  type: MediaType;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  createdAt: Date;
}

export interface SendMediaOptions {
  type: MediaType;
  to: string;
  mediaUrl?: string;    // URL externa ou já hospedada
  base64?: string;      // Base64 para upload
  filename?: string;    // Nome do arquivo
  caption?: string;     // Legenda
  mimeType?: string;
}

export interface SendMediaResult {
  success: boolean;
  messageId?: string;
  mediaId?: string;
  error?: string;
}

// =============================================================================
// ENVIO DE MÍDIA
// =============================================================================

/**
 * Envia mídia via Evolution API
 */
export async function sendMedia(
  merchantId: string,
  options: SendMediaOptions
): Promise<SendMediaResult> {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId }
    });

    if (!merchant?.evolutionInstance) {
      return { success: false, error: 'Instância não configurada' };
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';
    const apiKey = process.env.EVOLUTION_API_KEY;

    // Se passou base64, fazer upload primeiro
    let mediaUrl = options.mediaUrl;
    if (options.base64 && !mediaUrl) {
      const uploadResult = await uploadToStorage(options.base64, options.filename || 'media');
      if (!uploadResult.success) {
        return { success: false, error: 'Erro ao fazer upload da mídia' };
      }
      mediaUrl = uploadResult.url;
    }

    if (!mediaUrl) {
      return { success: false, error: 'URL ou base64 da mídia é obrigatório' };
    }

    // Montar payload conforme tipo
    let payload: any = {
      number: options.to,
      options: {
        delay: 1000,
        presence: 'composing'
      }
    };

    switch (options.type) {
      case 'image':
        payload.imageMessage = {
          url: mediaUrl,
          caption: options.caption
        };
        break;

      case 'video':
        payload.videoMessage = {
          url: mediaUrl,
          caption: options.caption,
          gifPlayback: false
        };
        break;

      case 'audio':
        payload.audioMessage = {
          url: mediaUrl,
          ptt: true // Envia como áudio do WhatsApp (PTT)
        };
        break;

      case 'document':
        payload.documentMessage = {
          url: mediaUrl,
          fileName: options.filename || 'documento.pdf',
          caption: options.caption
        };
        break;
    }

    // Enviar via Evolution API
    const endpoint = getEndpointForType(options.type);
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
      console.error('[MEDIA] Erro Evolution:', error);
      return { success: false, error };
    }

    const data = await response.json();

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        merchantId,
        action: 'MEDIA_SENT',
        details: JSON.stringify({
          to: options.to,
          type: options.type,
          caption: options.caption
        })
      }
    });

    return {
      success: true,
      messageId: data.key?.id,
      mediaId: data.mediaId
    };

  } catch (error: any) {
    console.error('[MEDIA] Erro:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Envia múltiplas imagens como álbum
 */
export async function sendImageAlbum(
  merchantId: string,
  to: string,
  images: Array<{ url: string; caption?: string }>
): Promise<SendMediaResult[]> {
  const results: SendMediaResult[] = [];

  for (const image of images) {
    const result = await sendMedia(merchantId, {
      type: 'image',
      to,
      mediaUrl: image.url,
      caption: image.caption
    });
    results.push(result);

    // Delay entre envios
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}

/**
 * Envia PDF com capa
 */
export async function sendDocumentWithPreview(
  merchantId: string,
  to: string,
  documentUrl: string,
  filename: string,
  thumbnailUrl?: string
): Promise<SendMediaResult> {
  return sendMedia(merchantId, {
    type: 'document',
    to,
    mediaUrl: documentUrl,
    filename,
    caption: thumbnailUrl ? `📄 ${filename}` : undefined
  });
}

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

function getEndpointForType(type: MediaType): string {
  switch (type) {
    case 'image':
      return 'sendImage';
    case 'video':
      return 'sendVideo';
    case 'audio':
      return 'sendAudio';
    case 'document':
      return 'sendDocument';
    default:
      return 'sendMedia';
  }
}

/**
 * Valida tipo de arquivo
 */
export function validateFileType(
  mimeType: string,
  allowedTypes: MediaType[]
): boolean {
  const typeMap: Record<MediaType, string[]> = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/3gp', 'video/webm'],
    audio: ['audio/mp3', 'audio/ogg', 'audio/mpeg', 'audio/wav'],
    document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  };

  for (const type of allowedTypes) {
    if (typeMap[type]?.includes(mimeType)) {
      return true;
    }
  }

  return false;
}

/**
 * Detecta tipo de mídia pelo MIME type
 */
export function detectMediaType(mimeType: string): MediaType | null {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf' || mimeType.includes('document')) return 'document';
  return null;
}

export default {
  sendMedia,
  sendImageAlbum,
  sendDocumentWithPreview,
  validateFileType,
  detectMediaType
};
