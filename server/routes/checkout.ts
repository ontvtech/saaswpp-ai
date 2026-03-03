/**
 * ROTAS DE CHECKOUT - SaaSWPP AI
 * Checkout com coleta de CPF/CNPJ e integração Stripe
 */

import express, { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import bcrypt from 'bcryptjs';
import { auditLog } from '../utils/permissions';
import { generateVerificationCode, validateCPF, validateCNPJ } from '../utils/validators';
import NotificationService from '../services/notificationService';

const prisma = new PrismaClient();
const router = express.Router();

// =============================================================================
// VALIDADORES DE DOCUMENTO
// =============================================================================

/**
 * Valida CPF
 */
export function validateCPF(cpf: string): boolean {
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11) return false;
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  // Validar dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[10])) return false;
  
  return true;
}

/**
 * Valida CNPJ
 */
export function validateCNPJ(cnpj: string): boolean {
  const numbers = cnpj.replace(/\D/g, '');
  if (numbers.length !== 14) return false;
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  // Validar dígitos verificadores
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(numbers[12])) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(numbers[13])) return false;
  
  return true;
}

// =============================================================================
// ROTA: CRIAR SESSÃO DE CHECKOUT (PAGO)
// =============================================================================

router.post('/create-session', async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      email, 
      password, 
      phone, 
      documentType, 
      documentNumber, 
      planId 
    } = req.body;

    // Validações básicas
    if (!name || !email || !password || !phone || !documentType || !documentNumber) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    // Validar documento
    const cleanDocument = documentNumber.replace(/\D/g, '');
    const isValid = documentType === 'CPF' 
      ? validateCPF(cleanDocument) 
      : validateCNPJ(cleanDocument);

    if (!isValid) {
      return res.status(400).json({ 
        error: `${documentType} inválido. Verifique os números.` 
      });
    }

    // Validar telefone
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return res.status(400).json({ error: 'Telefone inválido.' });
    }

    // Verificar se email já existe
    const existing = await prisma.merchant.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'E-mail já cadastrado.' });
    }

    // Buscar plano
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      return res.status(404).json({ error: 'Plano não encontrado.' });
    }

    // Verificar se é trial ou pago
    if (planId === 'trial' || plan.price === 0) {
      // Trial gratuito - criar conta direto
      return res.json({ trial: true });
    }

    // Buscar configuração do Stripe
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

    // Criar ou buscar cliente
    let customer = await stripe.customers.list({ email, limit: 1 });
    let customerId = customer.data.length > 0 ? customer.data[0].id : null;

    if (!customerId) {
      const newCustomer = await stripe.customers.create({ 
        email,
        name,
        phone: `+55${cleanPhone}`,
        metadata: {
          documentType,
          documentNumber: cleanDocument
        }
      });
      customerId = newCustomer.id;
    }

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: `Plano ${plan.name}`,
            description: plan.description || `Assinatura mensal do plano ${plan.name}`,
          },
          unit_amount: Math.round(plan.price * 100),
          recurring: { interval: 'month' }
        },
        quantity: 1,
      }],
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/register/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/checkout?plan=${planId}`,
      metadata: {
        name,
        email,
        phone: cleanPhone,
        documentType,
        documentNumber: cleanDocument,
        planId: plan.id
      },
      custom_text: {
        submit: {
          message: 'Ao confirmar, você concorda com nossos termos de uso e política de privacidade.'
        }
      },
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto',
        name: 'auto'
      }
    });

    // Log
    await auditLog({
      action: 'CHECKOUT_SESSION_CREATED',
      details: `Sessão criada para ${email} - Plano: ${plan.name}`
    });

    res.json({ url: session.url });

  } catch (error: any) {
    console.error('[CHECKOUT] Erro:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// ROTA: REGISTRO DE TRIAL GRATUITO (COM DOCUMENTO)
// =============================================================================

router.post('/trial-register', async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      email, 
      password, 
      phone, 
      documentType, 
      documentNumber 
    } = req.body;

    // Validações
    if (!name || !email || !password || !phone || !documentType || !documentNumber) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    // Validar documento
    const cleanDocument = documentNumber.replace(/\D/g, '');
    const isValid = documentType === 'CPF' 
      ? validateCPF(cleanDocument) 
      : validateCNPJ(cleanDocument);

    if (!isValid) {
      return res.status(400).json({ 
        error: `${documentType} inválido.` 
      });
    }

    // Validar telefone
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return res.status(400).json({ error: 'Telefone inválido.' });
    }

    // Verificar se email já existe
    const existing = await prisma.merchant.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'E-mail já cadastrado.' });
    }

    // Verificar se documento já existe
    const existingDoc = await prisma.merchant.findFirst({
      where: { documentNumber: cleanDocument }
    });
    if (existingDoc) {
      return res.status(400).json({ error: 'Documento já cadastrado.' });
    }

    // Buscar configuração global
    const config = await prisma.globalConfig.findUnique({
      where: { id: 'singleton' }
    });

    if (!config?.trial_enabled) {
      return res.status(400).json({ error: 'Período de trial desativado.' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);
    const verificationCode = generateVerificationCode(6);

    // Calcular fim do trial
    const trialDays = config.trial_default_days || 7;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    // Buscar plano padrão (Start)
    const defaultPlan = await prisma.plan.findFirst({
      where: { name: 'Start' }
    });

    // Criar merchant
    const merchant = await prisma.merchant.create({
      data: {
        name,
        email,
        password: hashedPassword,
        documentType,
        documentNumber: cleanDocument,
        phoneNumber: cleanPhone,
        verificationCode,
        status: 'trial',
        tokenQuota: 50000,
        trialEndsAt,
        planId: defaultPlan?.id
      }
    });

    // Enviar código de verificação via WhatsApp
    // TODO: Integrar com serviço de WhatsApp

    // Log
    await auditLog({
      merchantId: merchant.id,
      action: 'TRIAL_REGISTER_WITH_DOC',
      details: `Trial registrado: ${email} - ${documentType}: ${cleanDocument}`
    });

    res.json({ 
      success: true, 
      merchantId: merchant.id,
      message: 'Registro realizado! Verifique seu WhatsApp para ativar.'
    });

  } catch (error: any) {
    console.error('[CHECKOUT] Erro no trial:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// ROTA: VERIFICAR CHECKOUT (APÓS PAGAMENTO)
// =============================================================================

router.get('/verify-session', async (req: Request, res: Response) => {
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
      return res.status(500).json({ error: 'Gateway não configurado.' });
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2025-02-24-preview' as any
    });

    const session = await stripe.checkout.sessions.retrieve(String(session_id));

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ 
        error: 'Pagamento não confirmado.',
        status: session.payment_status 
      });
    }

    // Dados do metadata
    const { name, email, phone, documentType, documentNumber, planId } = session.metadata || {};

    if (!email || !planId) {
      return res.status(400).json({ error: 'Dados da sessão incompletos.' });
    }

    // Verificar se já existe
    let merchant = await prisma.merchant.findUnique({ where: { email } });

    if (!merchant) {
      // Criar novo merchant
      const plan = await prisma.plan.findUnique({ where: { id: planId } });
      const hashedPassword = await bcrypt.hash(Math.random().toString(36), 12);
      const verificationCode = generateVerificationCode(6);

      merchant = await prisma.merchant.create({
        data: {
          name: name || email.split('@')[0],
          email,
          password: hashedPassword,
          documentType,
          documentNumber,
          phoneNumber: phone,
          verificationCode,
          status: 'active',
          stripeCustomerId: session.customer as string,
          stripeCheckoutSession: session_id,
          subscriptionId: session.subscription as string,
          planId: plan?.id,
          tokenQuota: plan?.tokenLimit || 50000
        }
      });

      // Notificar revendedor (se houver)
      // TODO: Buscar revendedor associado e enviar notificação

    } else {
      // Atualizar merchant existente
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: {
          status: 'active',
          stripeCustomerId: session.customer as string,
          stripeCheckoutSession: session_id,
          subscriptionId: session.subscription as string,
          planId,
          documentType,
          documentNumber,
          phoneNumber: phone
        }
      });
    }

    // Log
    await auditLog({
      merchantId: merchant.id,
      action: 'CHECKOUT_PAYMENT_CONFIRMED',
      details: `Pagamento confirmado via Stripe - Session: ${session_id}`
    });

    res.json({ 
      success: true, 
      merchantId: merchant.id,
      status: 'active'
    });

  } catch (error: any) {
    console.error('[CHECKOUT] Erro na verificação:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// ROTA: VERIFICAR DOCUMENTO
// =============================================================================

router.post('/validate-document', async (req: Request, res: Response) => {
  try {
    const { documentType, documentNumber } = req.body;
    
    const cleanDocument = documentNumber.replace(/\D/g, '');
    const isValid = documentType === 'CPF' 
      ? validateCPF(cleanDocument) 
      : validateCNPJ(cleanDocument);

    if (!isValid) {
      return res.json({ 
        valid: false, 
        error: `${documentType} inválido.` 
      });
    }

    // Verificar se já existe no banco
    const existing = await prisma.merchant.findFirst({
      where: { documentNumber: cleanDocument }
    });

    if (existing) {
      return res.json({ 
        valid: false, 
        error: 'Documento já cadastrado.' 
      });
    }

    res.json({ valid: true });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =============================================================================
// EXPORT
// =============================================================================

export { router as checkoutRoutes };
