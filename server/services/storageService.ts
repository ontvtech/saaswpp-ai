/**
 * SERVIÇO DE STORAGE - SaaSWPP AI
 * 
 * Upload e gerenciamento de arquivos (mídia, documentos)
 * Suporta armazenamento local e cloud (S3, etc)
 */

import fs from 'fs';
import path from 'path';

// =============================================================================
// TIPOS
// =============================================================================

export interface UploadResult {
  success: boolean;
  url?: string;
  filename?: string;
  error?: string;
}

export interface FileInfo {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

// =============================================================================
// CONFIGURAÇÃO
// =============================================================================

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
const ALLOWED_MIME_TYPES = [
  // Imagens
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Vídeos
  'video/mp4',
  'video/3gp',
  'video/webm',
  // Áudios
  'audio/mp3',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  // Documentos
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// =============================================================================
// FUNÇÕES DE UPLOAD
// =============================================================================

/**
 * Faz upload de arquivo base64
 */
export async function uploadToStorage(
  base64Data: string,
  filename?: string
): Promise<UploadResult> {
  try {
    // Extrair dados do base64
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    
    let mimeType: string;
    let data: string;
    
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      data = matches[2];
    } else {
      // Assume que é apenas o base64 sem header
      mimeType = 'application/octet-stream';
      data = base64Data;
    }

    // Validar tipo
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return { success: false, error: `Tipo de arquivo não permitido: ${mimeType}` };
    }

    // Validar tamanho
    const sizeInBytes = (data.length * 3) / 4;
    if (sizeInBytes > MAX_FILE_SIZE) {
      return { 
        success: false, 
        error: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      };
    }

    // Gerar nome único
    const ext = getExtensionFromMime(mimeType);
    const uniqueFilename = filename 
      ? `${Date.now()}_${sanitizeFilename(filename)}`
      : `${Date.now()}_${generateRandomId()}.${ext}`;

    // Criar diretório se não existir
    const uploadPath = path.join(UPLOAD_DIR, getCurrentDatePath());
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    // Salvar arquivo
    const filePath = path.join(uploadPath, uniqueFilename);
    const buffer = Buffer.from(data, 'base64');
    
    await fs.promises.writeFile(filePath, buffer);

    // Construir URL
    const baseUrl = process.env.PLATFORM_URL || 'https://saaswpp.work';
    const relativePath = path.join(getCurrentDatePath(), uniqueFilename);
    const url = `${baseUrl}/uploads/${relativePath}`;

    return {
      success: true,
      url,
      filename: uniqueFilename
    };

  } catch (error: any) {
    console.error('[STORAGE] Erro no upload:', error);
    return { success: false, error: 'Erro ao fazer upload do arquivo' };
  }
}

/**
 * Deleta arquivo do storage
 */
export async function deleteFromStorage(fileUrl: string): Promise<{ success: boolean }> {
  try {
    // Extrair caminho do arquivo da URL
    const baseUrl = process.env.PLATFORM_URL || 'https://saaswpp.work';
    const relativePath = fileUrl.replace(`${baseUrl}/uploads/`, '');
    const filePath = path.join(UPLOAD_DIR, relativePath);

    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }

    return { success: true };

  } catch (error: any) {
    console.error('[STORAGE] Erro ao deletar:', error);
    return { success: false };
  }
}

/**
 * Busca informações do arquivo
 */
export async function getFileInfo(filename: string): Promise<FileInfo | null> {
  try {
    const filePath = path.join(UPLOAD_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const stats = await fs.promises.stat(filePath);
    const baseUrl = process.env.PLATFORM_URL || 'https://saaswpp.work';

    return {
      filename,
      originalName: filename,
      mimeType: getMimeFromExtension(path.extname(filename)),
      size: stats.size,
      url: `${baseUrl}/uploads/${filename}`
    };

  } catch (error) {
    return null;
  }
}

/**
 * Lista arquivos de um merchant
 */
export async function listMerchantFiles(
  merchantId: string,
  type?: 'image' | 'video' | 'audio' | 'document'
): Promise<FileInfo[]> {
  try {
    const merchantPath = path.join(UPLOAD_DIR, merchantId);
    
    if (!fs.existsSync(merchantPath)) {
      return [];
    }

    const files = await fs.promises.readdir(merchantPath);
    const fileInfos: FileInfo[] = [];

    for (const file of files) {
      const info = await getFileInfo(path.join(merchantId, file));
      if (info) {
        // Filtrar por tipo se especificado
        if (type) {
          const fileType = getFileType(info.mimeType);
          if (fileType !== type) continue;
        }
        fileInfos.push(info);
      }
    }

    return fileInfos;

  } catch (error) {
    return [];
  }
}

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

function getExtensionFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/3gp': '3gp',
    'video/webm': 'webm',
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
  };
  return map[mimeType] || 'bin';
}

function getMimeFromExtension(ext: string): string {
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.3gp': 'video/3gp',
    '.webm': 'video/webm',
    '.mp3': 'audio/mp3',
    '.ogg': 'audio/ogg',
    '.wav': 'audio/wav',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

function getFileType(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
}

function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 100);
}

function generateRandomId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function getCurrentDatePath(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}/${month}`;
}

export default {
  uploadToStorage,
  deleteFromStorage,
  getFileInfo,
  listMerchantFiles
};
