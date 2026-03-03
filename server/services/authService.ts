/**
 * SERVIÇO DE AUTENTICAÇÃO E RECUPERAÇÃO DE SENHA - SaaSWPP AI
 * 
 * Login real, registro, recuperação de senha via email/WhatsApp
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// =============================================================================
// TIPOS
// =============================================================================

export interface LoginResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'reseller' | 'merchant';
  };
  token?: string;
  error?: string;
}

export interface RegisterResult {
  success: boolean;
  userId?: string;
  error?: string;
}

export interface ResetResult {
  success: boolean;
  message?: string;
  error?: string;
}

// =============================================================================
// CONFIGURAÇÃO
// =============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'saaswpp-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const RESET_TOKEN_EXPIRES_HOURS = 1;

// =============================================================================
// LOGIN
// =============================================================================

/**
 * Login de Admin
 */
export async function loginAdmin(email: string, password: string): Promise<LoginResult> {
  try {
    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!admin) {
      return { success: false, error: 'Email não encontrado' };
    }

    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return { success: false, error: 'Senha incorreta' };
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'admin' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      success: true,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: 'admin'
      },
      token
    };

  } catch (error: any) {
    console.error('[AUTH] Erro no login admin:', error);
    return { success: false, error: 'Erro interno do servidor' };
  }
}

/**
 * Login de Reseller
 */
export async function loginReseller(email: string, password: string): Promise<LoginResult> {
  try {
    const reseller = await prisma.reseller.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!reseller) {
      return { success: false, error: 'Email não encontrado' };
    }

    if (reseller.status === 'suspended') {
      return { success: false, error: 'Conta suspensa. Entre em contato com o suporte.' };
    }

    const isValidPassword = await bcrypt.compare(password, reseller.password);
    if (!isValidPassword) {
      return { success: false, error: 'Senha incorreta' };
    }

    const token = jwt.sign(
      { id: reseller.id, email: reseller.email, role: 'reseller' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      success: true,
      user: {
        id: reseller.id,
        email: reseller.email,
        name: reseller.name,
        role: 'reseller'
      },
      token
    };

  } catch (error: any) {
    console.error('[AUTH] Erro no login reseller:', error);
    return { success: false, error: 'Erro interno do servidor' };
  }
}

/**
 * Login de Merchant
 */
export async function loginMerchant(email: string, password: string): Promise<LoginResult> {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { email: email.toLowerCase() },
      include: { plan: true, reseller: true }
    });

    if (!merchant) {
      return { success: false, error: 'Email não encontrado' };
    }

    if (merchant.status === 'suspended') {
      return { success: false, error: 'Conta suspensa. Regularize sua situação.' };
    }

    // Verificar trial expirado
    if (merchant.status === 'trial' && merchant.trialEndsAt && new Date() > merchant.trialEndsAt) {
      return { success: false, error: 'Período de trial expirado. Efetue o pagamento para continuar.' };
    }

    // Verificar se tem senha
    if (!merchant.password) {
      return { success: false, error: 'Conta não configurada. Verifique seu email.' };
    }

    const isValidPassword = await bcrypt.compare(password, merchant.password);
    if (!isValidPassword) {
      return { success: false, error: 'Senha incorreta' };
    }

    const token = jwt.sign(
      { 
        id: merchant.id, 
        email: merchant.email, 
        role: 'merchant',
        merchantId: merchant.id 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return {
      success: true,
      user: {
        id: merchant.id,
        email: merchant.email,
        name: merchant.name,
        role: 'merchant'
      },
      token
    };

  } catch (error: any) {
    console.error('[AUTH] Erro no login merchant:', error);
    return { success: false, error: 'Erro interno do servidor' };
  }
}

// =============================================================================
// RECUPERAÇÃO DE SENHA
// =============================================================================

/**
 * Solicita recuperação de senha
 */
export async function requestPasswordReset(email: string, userType: 'admin' | 'reseller' | 'merchant'): Promise<ResetResult> {
  try {
    // Verificar se usuário existe
    let user: { id: string; email: string; name: string } | null = null;

    switch (userType) {
      case 'admin':
        user = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
        break;
      case 'reseller':
        user = await prisma.reseller.findUnique({ where: { email: email.toLowerCase() } });
        break;
      case 'merchant':
        user = await prisma.merchant.findUnique({ where: { email: email.toLowerCase() } });
        break;
    }

    if (!user) {
      // Por segurança, não informamos se o email existe ou não
      return { 
        success: true, 
        message: 'Se o email existir, você receberá instruções para redefinir sua senha.' 
      };
    }

    // Gerar token único
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + RESET_TOKEN_EXPIRES_HOURS);

    // Salvar token no banco
    await prisma.passwordReset.create({
      data: {
        email: email.toLowerCase(),
        token: resetToken,
        userType,
        expiresAt
      }
    });

    // Construir link de recuperação
    const platformUrl = process.env.PLATFORM_URL || 'https://saaswpp.work';
    const resetLink = `${platformUrl}/reset-password?token=${resetToken}&type=${userType}`;

    // Enviar email (implementação real com serviço de email)
    await sendResetEmail(email, user.name, resetLink);

    // Se tiver WhatsApp configurado, enviar também
    // await sendResetWhatsApp(phone, resetLink);

    return { 
      success: true, 
      message: 'Se o email existir, você receberá instruções para redefinir sua senha.' 
    };

  } catch (error: any) {
    console.error('[AUTH] Erro ao solicitar reset:', error);
    return { success: false, error: 'Erro ao processar solicitação' };
  }
}

/**
 * Valida token de recuperação
 */
export async function validateResetToken(token: string): Promise<{ valid: boolean; email?: string; userType?: string }> {
  try {
    const reset = await prisma.passwordReset.findUnique({
      where: { token }
    });

    if (!reset) {
      return { valid: false };
    }

    if (reset.used) {
      return { valid: false };
    }

    if (new Date() > reset.expiresAt) {
      return { valid: false };
    }

    return { 
      valid: true, 
      email: reset.email, 
      userType: reset.userType 
    };

  } catch (error) {
    return { valid: false };
  }
}

/**
 * Redefine a senha com token
 */
export async function resetPassword(
  token: string, 
  newPassword: string
): Promise<ResetResult> {
  try {
    // Validar token
    const validation = await validateResetToken(token);
    if (!validation.valid || !validation.email || !validation.userType) {
      return { success: false, error: 'Token inválido ou expirado' };
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Atualizar senha conforme tipo de usuário
    switch (validation.userType) {
      case 'admin':
        await prisma.admin.update({
          where: { email: validation.email },
          data: { password: hashedPassword }
        });
        break;
      case 'reseller':
        await prisma.reseller.update({
          where: { email: validation.email },
          data: { password: hashedPassword }
        });
        break;
      case 'merchant':
        await prisma.merchant.update({
          where: { email: validation.email },
          data: { password: hashedPassword }
        });
        break;
    }

    // Marcar token como usado
    await prisma.passwordReset.update({
      where: { token },
      data: { used: true }
    });

    return { success: true, message: 'Senha alterada com sucesso!' };

  } catch (error: any) {
    console.error('[AUTH] Erro ao redefinir senha:', error);
    return { success: false, error: 'Erro ao redefinir senha' };
  }
}

// =============================================================================
// REGISTRO
// =============================================================================

/**
 * Registro de novo Merchant (via trial ou checkout)
 */
export async function registerMerchant(params: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  resellerId?: string;
  planId?: string;
}): Promise<RegisterResult> {
  try {
    // Verificar se email já existe
    const existing = await prisma.merchant.findUnique({
      where: { email: params.email.toLowerCase() }
    });

    if (existing) {
      return { success: false, error: 'Este email já está cadastrado' };
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(params.password, 12);

    // Criar merchant
    const merchant = await prisma.merchant.create({
      data: {
        name: params.name,
        email: params.email.toLowerCase(),
        password: hashedPassword,
        phoneNumber: params.phone,
        resellerId: params.resellerId,
        planId: params.planId,
        status: 'trial',
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
        activeModules: ['ESSENTIAL']
      }
    });

    return { success: true, userId: merchant.id };

  } catch (error: any) {
    console.error('[AUTH] Erro no registro:', error);
    return { success: false, error: 'Erro ao criar conta' };
  }
}

/**
 * Registro de novo Reseller (via admin)
 */
export async function registerReseller(params: {
  name: string;
  email: string;
  password: string;
  maxTenants?: number;
}): Promise<RegisterResult> {
  try {
    const existing = await prisma.reseller.findUnique({
      where: { email: params.email.toLowerCase() }
    });

    if (existing) {
      return { success: false, error: 'Este email já está cadastrado' };
    }

    const hashedPassword = await bcrypt.hash(params.password, 12);

    const reseller = await prisma.reseller.create({
      data: {
        name: params.name,
        email: params.email.toLowerCase(),
        password: hashedPassword,
        maxTenants: params.maxTenants || 10,
        status: 'trial',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 dias
        allowedModules: ['ESSENTIAL', 'SALES_PRO', 'PREDICTIVE', 'ELITE', 'NINJA']
      }
    });

    return { success: true, userId: reseller.id };

  } catch (error: any) {
    console.error('[AUTH] Erro no registro reseller:', error);
    return { success: false, error: 'Erro ao criar conta' };
  }
}

// =============================================================================
// VERIFICAÇÃO DE TOKEN
// =============================================================================

/**
 * Verifica e decodifica JWT
 */
export function verifyToken(token: string): { 
  valid: boolean; 
  decoded?: { 
    id: string; 
    email: string; 
    role: string;
    merchantId?: string;
  } 
} {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return { valid: true, decoded };
  } catch {
    return { valid: false };
  }
}

// =============================================================================
// ENVIO DE EMAIL (Placeholder - conectar com serviço real)
// =============================================================================

async function sendResetEmail(email: string, name: string, resetLink: string): Promise<void> {
  // Em produção, conectar com:
  // - SendGrid
  // - AWS SES
  // - Resend
  // - Mailgun
  
  console.log(`[EMAIL] Enviando email de reset para ${email}`);
  console.log(`[EMAIL] Link: ${resetLink}`);
  
  // Por enquanto, log apenas
  // TODO: Implementar envio real de email
}

export default {
  loginAdmin,
  loginReseller,
  loginMerchant,
  requestPasswordReset,
  validateResetToken,
  resetPassword,
  registerMerchant,
  registerReseller,
  verifyToken
};
