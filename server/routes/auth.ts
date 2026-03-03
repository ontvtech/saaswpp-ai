/**
 * ROTAS DE AUTENTICAÇÃO - SaaSWPP AI
 * Versão segura sem credenciais hardcoded
 */

import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { 
  loginSchema, 
  registerMerchantSchema, 
  beta10RegisterSchema, 
  verifyCodeSchema,
  trialValidateSchema,
  validateOrThrow,
  emailSchema
} from '../utils/validators';
import { auditLog } from '../utils/permissions';
import { generateSecurePassword, generateVerificationCode } from '../utils/security';

const prisma = new PrismaClient();

// JWT Secret - OBRIGATÓRIO via environment
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('[AUTH] JWT_SECRET não configurado! Configure a variável de ambiente.');
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const router = express.Router();

// =============================================================================
// INTERFACES
// =============================================================================

interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  merchant?: {
    id: string;
    name: string;
    plan: any;
    niche: any;
    tokenQuota: number;
    tokenUsage: number;
  };
}

// =============================================================================
// MIDDLEWARE DE AUTENTICAÇÃO
// =============================================================================

/**
 * Middleware para verificar JWT e Role
 */
export const requireAuth = (roles: string[] = []) => {
  return async (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido', code: 'NO_TOKEN' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      req.user = decoded;

      // Admin Impersonation Support
      if (decoded.role === 'ADMIN') {
        const impersonateMerchantId = req.headers['x-impersonate-merchant'];
        const impersonateResellerId = req.headers['x-impersonate-reseller'];
        
        if (impersonateMerchantId) {
          // Verificar se o merchant existe
          const merchant = await prisma.merchant.findUnique({
            where: { id: impersonateMerchantId }
          });
          if (merchant) {
            req.user.impersonatedMerchantId = impersonateMerchantId;
            await auditLog({
              adminId: decoded.id,
              merchantId: impersonateMerchantId,
              action: 'ADMIN_IMPERSONATION',
              details: `Admin ${decoded.email} acessou como merchant ${impersonateMerchantId}`,
              ipAddress: req.ip
            });
          }
        }
        if (impersonateResellerId) {
          const reseller = await prisma.reseller.findUnique({
            where: { id: impersonateResellerId }
          });
          if (reseller) {
            req.user.impersonatedResellerId = impersonateResellerId;
            await auditLog({
              adminId: decoded.id,
              resellerId: impersonateResellerId,
              action: 'ADMIN_IMPERSONATION',
              details: `Admin ${decoded.email} acessou como reseller ${impersonateResellerId}`,
              ipAddress: req.ip
            });
          }
        }
      }

      // Verificar roles
      if (roles.length > 0 && !roles.includes(decoded.role)) {
        return res.status(403).json({ 
          error: 'Acesso negado. Permissões insuficientes.', 
          code: 'FORBIDDEN' 
        });
      }

      next();
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
      }
      return res.status(401).json({ error: 'Token inválido', code: 'INVALID_TOKEN' });
    }
  };
};

// =============================================================================
// ROTAS DE AUTENTICAÇÃO
// =============================================================================

/**
 * POST /login
 * Autenticação de usuário
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validar entrada
    const { email, password } = validateOrThrow(loginSchema, req.body);

    // 1. Verificar Admin (buscar no banco de dados)
    const admin = await prisma.admin.findUnique({
      where: { email }
    });
    
    if (admin) {
      const passwordMatch = await bcrypt.compare(password, admin.password);
      if (passwordMatch) {
        const token = jwt.sign(
          { id: admin.id, email: admin.email, role: 'ADMIN' },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );

        await auditLog({
          adminId: admin.id,
          action: 'LOGIN',
          details: 'Login de admin realizado',
          ipAddress: req.ip
        });

        return res.json({
          token,
          user: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: 'ADMIN'
          }
        });
      }
    }

    // 2. Verificar Merchant
    const merchant = await prisma.merchant.findUnique({
      where: { email },
      include: { plan: true, niche: true }
    });

    if (merchant && merchant.password) {
      const passwordMatch = await bcrypt.compare(password, merchant.password);
      if (passwordMatch) {
        // Verificar status da conta
        if (merchant.status === 'suspended') {
          return res.status(403).json({
            error: 'Conta suspensa. Entre em contato com o suporte.',
            code: 'ACCOUNT_SUSPENDED'
          });
        }

        const token = jwt.sign(
          { id: merchant.id, email: merchant.email, role: 'MERCHANT' },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );

        await auditLog({
          merchantId: merchant.id,
          action: 'LOGIN',
          details: 'Login de merchant realizado',
          ipAddress: req.ip
        });

        return res.json({
          token,
          user: {
            id: merchant.id,
            email: merchant.email,
            name: merchant.name,
            role: 'MERCHANT'
          },
          merchant: {
            id: merchant.id,
            name: merchant.name,
            plan: merchant.plan,
            niche: merchant.niche,
            tokenQuota: merchant.tokenQuota,
            tokenUsage: merchant.tokenUsage
          }
        });
      }
    }

    // 3. Verificar Reseller
    const reseller = await prisma.reseller.findUnique({
      where: { email }
    });

    if (reseller) {
      const passwordMatch = await bcrypt.compare(password, reseller.password);
      if (passwordMatch) {
        if (reseller.status === 'suspended') {
          return res.status(403).json({
            error: 'Conta suspensa. Entre em contato com o suporte.',
            code: 'ACCOUNT_SUSPENDED'
          });
        }

        const token = jwt.sign(
          { id: reseller.id, email: reseller.email, role: 'RESELLER' },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );

        await auditLog({
          resellerId: reseller.id,
          action: 'LOGIN',
          details: 'Login de reseller realizado',
          ipAddress: req.ip
        });

        return res.json({
          token,
          user: {
            id: reseller.id,
            email: reseller.email,
            name: reseller.name,
            role: 'RESELLER'
          }
        });
      }
    }

    // Nenhum usuário encontrado ou senha incorreta
    await auditLog({
      action: 'LOGIN_FAILED',
      details: `Tentativa de login falhou para ${email}`,
      ipAddress: req.ip
    });

    return res.status(401).json({
      error: 'Credenciais inválidas',
      code: 'INVALID_CREDENTIALS'
    });

  } catch (error: any) {
    console.error('[AUTH] Erro no login:', error);
    
    if (error.message.startsWith('Erro de validação:')) {
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * GET /me
 * Retorna dados do usuário atual
 */
router.get('/me', requireAuth(), async (req: any, res: Response) => {
  try {
    const { id, role } = req.user;

    if (role === 'ADMIN') {
      const admin = await prisma.admin.findUnique({
        where: { id }
      });
      if (!admin) {
        return res.status(404).json({ error: 'Admin não encontrado' });
      }
      return res.json({
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: 'ADMIN'
        }
      });
    }

    if (role === 'MERCHANT') {
      const targetId = req.user.impersonatedMerchantId || id;
      const merchant = await prisma.merchant.findUnique({
        where: { id: targetId },
        include: { plan: true, niche: true }
      });
      
      if (!merchant) {
        return res.status(404).json({ error: 'Merchant não encontrado' });
      }
      
      return res.json({
        user: {
          id: merchant.id,
          name: merchant.name,
          email: merchant.email,
          role: 'MERCHANT'
        },
        merchant: {
          id: merchant.id,
          name: merchant.name,
          plan: merchant.plan,
          niche: merchant.niche,
          tokenQuota: merchant.tokenQuota,
          tokenUsage: merchant.tokenUsage,
          status: merchant.status
        }
      });
    }

    if (role === 'RESELLER') {
      const targetId = req.user.impersonatedResellerId || id;
      const reseller = await prisma.reseller.findUnique({
        where: { id: targetId },
        include: {
          _count: {
            select: { merchants: true }
          }
        }
      });
      
      if (!reseller) {
        return res.status(404).json({ error: 'Reseller não encontrado' });
      }
      
      return res.json({
        user: {
          id: reseller.id,
          name: reseller.name,
          email: reseller.email,
          role: 'RESELLER'
        },
        reseller: {
          id: reseller.id,
          name: reseller.name,
          maxTenants: reseller.maxTenants,
          activeTenants: reseller._count.merchants,
          status: reseller.status
        }
      });
    }

    return res.status(400).json({ error: 'Role inválido' });

  } catch (error: any) {
    console.error('[AUTH] Erro ao buscar usuário:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * POST /setup-intent
 * Cria SetupIntent do Stripe para validar cartão
 */
router.post('/setup-intent', async (req: Request, res: Response) => {
  try {
    const { email } = validateOrThrow(emailSchema, req.body.email ? { email: req.body.email } : { email: '' });
    
    // Buscar configuração do Stripe
    const config = await prisma.globalConfig.findUnique({
      where: { id: 'singleton' }
    });
    
    const stripeKey = config?.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return res.status(500).json({ error: 'Gateway de pagamento não configurado' });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-02-24-preview' as any
    });

    // Criar ou buscar cliente
    let customer = await stripe.customers.list({ email, limit: 1 });
    let customerId = customer.data.length > 0 ? customer.data[0].id : null;

    if (!customerId) {
      const newCustomer = await stripe.customers.create({ email });
      customerId = newCustomer.id;
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
    });

    res.json({ clientSecret: setupIntent.client_secret });

  } catch (error: any) {
    console.error('[AUTH] Erro no setup-intent:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /beta10/check
 * Verifica elegibilidade para beta-10
 */
router.get('/beta10/check', async (req: Request, res: Response) => {
  try {
    const config = await prisma.globalConfig.findUnique({
      where: { id: 'singleton' }
    });
    const count = await prisma.merchant.count();

    if (!config?.trial_enabled || count >= 10) {
      return res.json({
        eligible: false,
        reason: count >= 10 ? 'Limite de 10 lojistas atingido.' : 'Trial desativado.'
      });
    }

    res.json({ eligible: true, remaining: 10 - count });

  } catch (error: any) {
    console.error('[AUTH] Erro no beta10/check:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /beta10/register
 * Registro beta-10 com validação de cartão
 */
router.post('/beta10/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, paymentMethodId } = validateOrThrow(
      beta10RegisterSchema,
      req.body
    );

    // Verificar elegibilidade
    const config = await prisma.globalConfig.findUnique({
      where: { id: 'singleton' }
    });
    const count = await prisma.merchant.count();
    
    if (!config?.trial_enabled || count >= 10) {
      return res.status(403).json({ error: 'Inscrições Beta-10 encerradas.' });
    }

    // Verificar se email já existe
    const existing = await prisma.merchant.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'E-mail já cadastrado.' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationCode = generateVerificationCode(6);

    // Criar merchant
    const merchant = await prisma.merchant.create({
      data: {
        name,
        email,
        password: hashedPassword,
        stripePaymentMethod: paymentMethodId,
        verificationCode,
        status: 'pending_verification',
        plan: { connect: { name: 'Start' } }
      }
    });

    // Enviar email de verificação
    await sendVerificationEmail(email, verificationCode);

    // Enviar alerta WhatsApp
    await sendWhatsAppAlert(name, verificationCode);

    await auditLog({
      merchantId: merchant.id,
      action: 'BETA10_REGISTER',
      details: `Novo registro beta-10: ${email}`,
      ipAddress: req.ip
    });

    res.json({ success: true, merchantId: merchant.id });

  } catch (error: any) {
    console.error('[AUTH] Erro no beta10/register:', error);
    
    if (error.message.startsWith('Erro de validação:')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /verify-code
 * Verifica código de ativação
 */
router.post('/verify-code', async (req: Request, res: Response) => {
  try {
    const { email, code } = validateOrThrow(verifyCodeSchema, req.body);

    const merchant = await prisma.merchant.findUnique({ where: { email } });

    if (!merchant || merchant.verificationCode !== code) {
      return res.status(400).json({ error: 'Código inválido.' });
    }

    await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        status: 'active',
        verificationCode: null
      }
    });

    await auditLog({
      merchantId: merchant.id,
      action: 'EMAIL_VERIFIED',
      details: 'Email verificado com sucesso',
      ipAddress: req.ip
    });

    res.json({ success: true });

  } catch (error: any) {
    console.error('[AUTH] Erro no verify-code:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /trial/validate
 * Valida link de trial
 */
router.get('/trial/validate', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;

    if (!code) {
      const config = await prisma.globalConfig.findUnique({
        where: { id: 'singleton' }
      });
      if (config?.trial_enabled) {
        return res.json({
          days: config.trial_default_days || 7,
          tokenLimit: 50000,
          isDefault: true
        });
      }
      return res.status(400).json({
        error: 'Trial gratuito desativado. Você precisa de um código de convite.'
      });
    }

    const link = await prisma.trialLink.findUnique({
      where: { code: String(code) }
    });

    if (!link || link.used) {
      return res.status(400).json({ error: 'Link inválido ou já utilizado.' });
    }

    if (link.expiresAt && new Date() > link.expiresAt) {
      return res.status(400).json({ error: 'Link expirado.' });
    }

    res.json(link);

  } catch (error: any) {
    console.error('[AUTH] Erro no trial/validate:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /trial/register
 * Registro com trial
 */
router.post('/trial/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, code } = req.body;
    
    // Validar entrada básica
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
    }

    let days = 7;
    let tokenLimit = 50000;
    let linkId = null;

    if (code) {
      const link = await prisma.trialLink.findUnique({
        where: { code: String(code) }
      });

      if (!link || link.used) {
        return res.status(400).json({ error: 'Link inválido.' });
      }
      days = link.days;
      tokenLimit = link.tokenLimit;
      linkId = link.id;
    } else {
      const config = await prisma.globalConfig.findUnique({
        where: { id: 'singleton' }
      });
      if (!config?.trial_enabled) {
        return res.status(400).json({ error: 'Trial gratuito desativado.' });
      }
      days = config.trial_default_days || 7;
    }

    const existing = await prisma.merchant.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'E-mail já cadastrado.' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationCode = generateVerificationCode(6);

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + days);

    const merchant = await prisma.merchant.create({
      data: {
        name,
        email,
        password: hashedPassword,
        verificationCode,
        status: 'trial',
        tokenQuota: tokenLimit,
        trialEndsAt,
        plan: { connect: { name: 'Start' } }
      }
    });

    // Marcar link como usado
    if (linkId) {
      await prisma.trialLink.update({
        where: { id: linkId },
        data: { used: true, usedBy: merchant.id }
      });
    }

    await sendVerificationEmail(email, verificationCode);
    await sendWhatsAppAlert(name, verificationCode);

    await auditLog({
      merchantId: merchant.id,
      action: 'TRIAL_REGISTER',
      details: `Novo registro trial: ${email} (${days} dias)`,
      ipAddress: req.ip
    });

    res.json({ success: true, merchantId: merchant.id });

  } catch (error: any) {
    console.error('[AUTH] Erro no trial/register:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /plans
 * Lista planos disponíveis
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { type: 'MERCHANT' }
    });
    res.json(plans);
  } catch (error: any) {
    console.error('[AUTH] Erro ao buscar planos:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /checkout/session
 * Cria sessão de checkout do Stripe
 */
router.post('/checkout/session', async (req: Request, res: Response) => {
  try {
    const { planId, email } = req.body;
    
    if (!planId || !email) {
      return res.status(400).json({ error: 'planId e email são obrigatórios' });
    }

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return res.status(404).json({ error: 'Plano não encontrado.' });
    }

    const config = await prisma.globalConfig.findUnique({
      where: { id: 'singleton' }
    });
    const stripeKey = config?.stripeSecretKey || process.env.STRIPE_SECRET_KEY;

    if (!stripeKey) {
      return res.status(500).json({ error: 'Gateway de pagamento não configurado.' });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-02-24-preview' as any
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: plan.name,
            description: plan.description || '',
          },
          unit_amount: Math.round(plan.price * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/register/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/my-plan`,
      customer_email: email,
      metadata: {
        planId: plan.id,
        email: email
      }
    });

    res.json({ url: session.url });

  } catch (error: any) {
    console.error('[AUTH] Erro no checkout:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /checkout/verify
 * Verifica status do checkout
 */
router.get('/checkout/verify', async (req: Request, res: Response) => {
  try {
    const { session_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ error: 'Session ID é obrigatório' });
    }

    const config = await prisma.globalConfig.findUnique({
      where: { id: 'singleton' }
    });
    const stripeKey = config?.stripeSecretKey || process.env.STRIPE_SECRET_KEY;

    if (!stripeKey) {
      return res.status(500).json({ error: 'Gateway de pagamento não configurado.' });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-02-24-preview' as any
    });
    
    const session = await stripe.checkout.sessions.retrieve(String(session_id));

    if (session.payment_status === 'paid') {
      const { planId, email } = session.metadata || {};

      if (email && planId) {
        const merchant = await prisma.merchant.findUnique({ where: { email } });
        const plan = await prisma.plan.findUnique({ where: { id: planId } });

        if (merchant && plan) {
          await prisma.merchant.update({
            where: { id: merchant.id },
            data: {
              planId: plan.id,
              tokenQuota: plan.tokenLimit,
              status: 'active'
            }
          });

          await auditLog({
            merchantId: merchant.id,
            action: 'PAYMENT_CONFIRMED',
            details: `Pagamento confirmado para plano ${plan.name}`,
            ipAddress: req.ip
          });
        }
      }

      res.json({ success: true, status: session.payment_status });
    } else {
      res.status(400).json({ error: 'Pagamento não confirmado.' });
    }

  } catch (error: any) {
    console.error('[AUTH] Erro no checkout/verify:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// FUNÇÕES AUXILIARES
// =============================================================================

/**
 * Envia email de verificação
 */
async function sendVerificationEmail(email: string, code: string): Promise<void> {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: `"SaaSWpp" <${process.env.SMTP_FROM || 'noreply@saaswpp.com'}>`,
      to: email,
      subject: "Seu Código de Ativação",
      text: `Seu código de ativação é: ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Código de Ativação</h2>
          <p>Seu código de ativação é:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
            ${code}
          </div>
          <p style="color: #666; font-size: 12px;">Este código expira em 30 minutos.</p>
        </div>
      `
    });

    console.log(`[AUTH] Email de verificação enviado para ${email}`);
  } catch (error) {
    console.error('[AUTH] Erro ao enviar email:', error);
    throw error;
  }
}

/**
 * Envia alerta via WhatsApp
 */
async function sendWhatsAppAlert(name: string, code: string): Promise<void> {
  const evolutionUrl = process.env.EVOLUTION_API_URL || 'http://192.168.88.6:8080';
  const apiKey = process.env.EVOLUTION_API_KEY;
  const adminNumber = process.env.ADMIN_WHATSAPP;

  if (!apiKey || !adminNumber) {
    console.log('[AUTH] Alerta WhatsApp não configurado, pulando...');
    return;
  }

  try {
    await fetch(`${evolutionUrl}/message/sendText/MainInstance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey
      },
      body: JSON.stringify({
        number: adminNumber,
        text: `🚀 [NOVO CADASTRO]\nNome: ${name}\nCódigo: ${code}`
      })
    });
  } catch (e) {
    console.error("[AUTH] Falha ao enviar alerta WhatsApp", e);
  }
}

// =============================================================================
// EXPORT
// =============================================================================

export { router as authRoutes };
