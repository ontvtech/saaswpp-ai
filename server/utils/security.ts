/**
 * SEGURANÇA - SaaSWPP AI
 * Criptografia, validação e proteção de dados
 */

import crypto from 'crypto';

// =============================================================================
// CRIPTOGRAFIA AES-256 (para chaves API)
// =============================================================================

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET;
const ALGORITHM = 'aes-256-gcm';

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  console.warn('[SECURITY] ENCRYPTION_KEY não configurada ou muito curta. Chaves API não serão criptografadas!');
}

/**
 * Criptografa um texto sensível
 */
export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) return text;
  
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Descriptografa um texto
 */
export function decrypt(encryptedData: string): string {
  if (!ENCRYPTION_KEY) return encryptedData;
  
  try {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[SECURITY] Erro ao descriptografar:', error);
    return encryptedData;
  }
}

// =============================================================================
// VALIDAÇÃO DE WEBHOOKS
// =============================================================================

/**
 * Valida assinatura HMAC do Stripe
 */
export function validateStripeSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  try {
    const elements = signature.split(',');
    const timestamp = elements.find(e => e.startsWith('t='))?.slice(2);
    const signatures = elements
      .filter(e => e.startsWith('v1='))
      .map(e => e.slice(3));
    
    if (!timestamp || signatures.length === 0) return false;
    
    // Verificar se não expirou (5 minutos)
    const timestampInt = parseInt(timestamp, 10);
    if (Math.abs(Date.now() - timestampInt * 1000) > 300000) {
      return false;
    }
    
    // Verificar assinatura
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');
    
    return signatures.some(sig => {
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      const sigBuffer = Buffer.from(sig, 'hex');
      return crypto.timingSafeEqual(expectedBuffer, sigBuffer);
    });
  } catch (error) {
    console.error('[SECURITY] Erro na validação Stripe:', error);
    return false;
  }
}

/**
 * Valida assinatura da Meta API (X-Hub-Signature-256)
 */
export function validateMetaSignature(
  payload: string | Buffer,
  signature: string,
  appSecret: string
): boolean {
  try {
    if (!signature || !signature.startsWith('sha256=')) return false;
    
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex');
    
    const sigBuffer = Buffer.from(signature.slice(7), 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (error) {
    console.error('[SECURITY] Erro na validação Meta:', error);
    return false;
  }
}

/**
 * Valida secret do Evolution Webhook
 */
export function validateEvolutionSecret(
  providedSecret: string | undefined,
  expectedSecret: string
): boolean {
  if (!expectedSecret) return true; // Se não configurado, permite
  if (!providedSecret) return false;
  
  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedSecret),
      Buffer.from(expectedSecret)
    );
  } catch {
    return false;
  }
}

// =============================================================================
// SANITIZAÇÃO E MÁSCARAS
// =============================================================================

/**
 * Sanitiza input para prevenir XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Máscara dados sensíveis para logs
 */
export function maskSensitive(data: string): string {
  if (data.length <= 4) return '****';
  return data.slice(0, 2) + '*'.repeat(data.length - 4) + data.slice(-2);
}

/**
 * Máscara telefone para logs
 */
export function maskPhone(phone: string): string {
  if (phone.length <= 8) return '****' + phone.slice(-4);
  return phone.slice(0, 4) + '****' + phone.slice(-4);
}

/**
 * Máscara email para logs
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '****@****';
  return local.slice(0, 2) + '***@' + domain;
}

/**
 * Máscara chave de API para logs
 */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return '********';
  return key.slice(0, 4) + '...' + key.slice(-4);
}

// =============================================================================
// GERAÇÃO DE SENHAS E TOKENS
// =============================================================================

/**
 * Gera senha aleatória segura
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const values = crypto.randomBytes(length);
  return Array.from(values)
    .map(v => charset[v % charset.length])
    .join('');
}

/**
 * Gera código de verificação numérico
 */
export function generateVerificationCode(length: number = 6): string {
  const charset = '0123456789';
  const values = crypto.randomBytes(length);
  return Array.from(values)
    .map(v => charset[v % charset.length])
    .join('');
}

/**
 * Gera token de trial único
 */
export function generateTrialCode(): string {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
}
