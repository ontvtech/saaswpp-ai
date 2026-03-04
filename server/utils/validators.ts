/**
 * VALIDADORES - Zod Schemas
 */

import { z } from 'zod';

// =============================================================================
// AUTH VALIDATORS
// =============================================================================

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres')
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(100, 'Nome muito longo'),
  email: z.string().email('E-mail inválido'),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  planId: z.string().uuid('Plano inválido').optional(),
  code: z.string().optional()
});

// =============================================================================
// PLAN VALIDATORS
// =============================================================================

export const createPlanSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(50, 'Nome muito longo'),
  description: z.string().max(500, 'Descrição muito longa').optional(),
  price: z.number().positive('Preço deve ser positivo'),
  type: z.enum(['MERCHANT', 'RESELLER'], { errorMap: () => 'Tipo inválido' }),
  maxTenants: z.number().int().min(0).max(10000).default(0),
  maxMessages: z.number().int().min(0).max(10000000).default(1000),
  tokenLimit: z.number().int().min(0).max(1000000000).default(50000),
  instanceLimit: z.number().int().min(1).max(100).default(1),
  modules: z.object({
    ESSENTIAL: z.boolean().default(true),
    SALES_PRO: z.boolean().default(false),
    PREDICTIVE: z.boolean().default(false),
    ELITE: z.boolean().default(false)
  }).optional()
});

export const updatePlanSchema = createPlanSchema.partial();

// =============================================================================
// MERCHANT VALIDATORS
// =============================================================================

export const createMerchantSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(100),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'Senha muito curta').optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Telefone inválido').optional(),
  planId: z.string().uuid('Plano inválido'),
  nicheId: z.string().uuid('Nicho inválido').optional(),
  resellerId: z.string().uuid('Revendedor inválido').optional()
});

export const updateMerchantSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  nicheId: z.string().uuid().optional(),
  aiConfig: z.object({
    name: z.string().max(50).optional(),
    tone: z.enum(['formal', 'informal', 'empathetic', 'sales']).optional(),
    prompt: z.string().max(5000).optional()
  }).optional()
});

// =============================================================================
// AI KEY VALIDATORS
// =============================================================================

export const createAIKeySchema = z.object({
  key: z.string().min(10, 'Chave muito curta'),
  provider: z.enum(['GEMINI', 'OPENAI', 'ANTHROPIC', 'DEEPSEEK']),
  tier: z.enum(['BASIC', 'PREMIUM', 'ENTERPRISE']),
  tokenLimit: z.number().int().positive().default(1000000),
  priority: z.number().int().min(0).max(100).default(0),
  weight: z.number().int().min(1).max(100).default(1)
});

// =============================================================================
// WEBHOOK VALIDATORS
// =============================================================================

export const evolutionWebhookSchema = z.object({
  event: z.string(),
  instance: z.string(),
  data: z.any()
});

export const stripeWebhookSchema = z.object({
  type: z.string(),
  data: z.object({
    object: z.any()
  })
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function validate<T>(schema: z.ZodSchema<T>, data: unknown): 
  { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { 
    success: false, 
    errors: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`)
  };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^\+?[1-9]\d{1,14}$/.test(phone.replace(/\D/g, ''));
}

export function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}
