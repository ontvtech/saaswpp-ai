/**
 * ROTAS DE AUTENTICAÇÃO - SaaSWPP AI
 * 
 * Login, Registro, Recuperação de Senha
 */

import { Router, Response } from 'express';
import { 
  loginAdmin, 
  loginReseller, 
  loginMerchant,
  requestPasswordReset,
  validateResetToken,
  resetPassword,
  registerMerchant,
  registerReseller,
  verifyToken
} from '../services/authService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const authRoutes = Router();

// =============================================================================
// LOGIN
// =============================================================================

/**
 * POST /auth/login
 * Login unificado (detecta tipo de usuário)
 */
authRoutes.post('/login', async (req, res: Response) => {
  try {
    const { email, password, userType } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    let result;

    // Se especificou tipo, usar ele
    if (userType) {
      switch (userType) {
        case 'admin':
          result = await loginAdmin(email, password);
          break;
        case 'reseller':
          result = await loginReseller(email, password);
          break;
        case 'merchant':
          result = await loginMerchant(email, password);
          break;
        default:
          return res.status(400).json({ error: 'Tipo de usuário inválido' });
      }
    } else {
      // Tentar detectar automaticamente
      // 1. Verificar se é admin
      const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
      if (admin) {
        result = await loginAdmin(email, password);
      } else {
        // 2. Verificar se é reseller
        const reseller = await prisma.reseller.findUnique({ where: { email: email.toLowerCase() } });
        if (reseller) {
          result = await loginReseller(email, password);
        } else {
          // 3. Verificar se é merchant
          const merchant = await prisma.merchant.findUnique({ where: { email: email.toLowerCase() } });
          if (merchant) {
            result = await loginMerchant(email, password);
          } else {
            return res.status(401).json({ error: 'Email não encontrado' });
          }
        }
      }
    }

    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }

    res.json({
      success: true,
      user: result.user,
      token: result.token
    });

  } catch (error: any) {
    console.error('[AUTH] Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /auth/login/admin
 * Login específico de Admin
 */
authRoutes.post('/login/admin', async (req, res: Response) => {
  const { email, password } = req.body;
  const result = await loginAdmin(email, password);

  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }

  res.json({ success: true, user: result.user, token: result.token });
});

/**
 * POST /auth/login/reseller
 * Login específico de Reseller
 */
authRoutes.post('/login/reseller', async (req, res: Response) => {
  const { email, password } = req.body;
  const result = await loginReseller(email, password);

  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }

  res.json({ success: true, user: result.user, token: result.token });
});

/**
 * POST /auth/login/merchant
 * Login específico de Merchant
 */
authRoutes.post('/login/merchant', async (req, res: Response) => {
  const { email, password } = req.body;
  const result = await loginMerchant(email, password);

  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }

  res.json({ success: true, user: result.user, token: result.token });
});

// =============================================================================
// REGISTRO
// =============================================================================

/**
 * POST /auth/register/merchant
 * Registro de novo lojista (trial)
 */
authRoutes.post('/register/merchant', async (req, res: Response) => {
  try {
    const { name, email, password, phone, resellerId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    const result = await registerMerchant({
      name,
      email,
      password,
      phone,
      resellerId
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({ 
      success: true, 
      userId: result.userId,
      message: 'Conta criada com sucesso! Você tem 7 dias de trial.'
    });

  } catch (error: any) {
    console.error('[AUTH] Erro no registro:', error);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

/**
 * POST /auth/register/reseller
 * Registro de novo revendedor (via admin)
 */
authRoutes.post('/register/reseller', async (req: any, res: Response) => {
  try {
    // Apenas admin pode criar reseller
    if (req.user?.role !== 'admin' && req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { name, email, password, maxTenants } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    const result = await registerReseller({ name, email, password, maxTenants });

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.status(201).json({ 
      success: true, 
      userId: result.userId,
      message: 'Revendedor criado com sucesso!'
    });

  } catch (error: any) {
    console.error('[AUTH] Erro no registro:', error);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

// =============================================================================
// RECUPERAÇÃO DE SENHA
// =============================================================================

/**
 * POST /auth/forgot-password
 * Solicita recuperação de senha
 */
authRoutes.post('/forgot-password', async (req, res: Response) => {
  try {
    const { email, userType } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email é obrigatório' });
    }

    // Se não especificou tipo, tentar detectar
    let type = userType;
    if (!type) {
      const admin = await prisma.admin.findUnique({ where: { email: email.toLowerCase() } });
      if (admin) type = 'admin';
      else {
        const reseller = await prisma.reseller.findUnique({ where: { email: email.toLowerCase() } });
        if (reseller) type = 'reseller';
        else {
          const merchant = await prisma.merchant.findUnique({ where: { email: email.toLowerCase() } });
          if (merchant) type = 'merchant';
        }
      }
    }

    if (!type) {
      type = 'merchant'; // Default
    }

    const result = await requestPasswordReset(email, type as any);
    res.json(result);

  } catch (error: any) {
    console.error('[AUTH] Erro ao solicitar reset:', error);
    res.status(500).json({ error: 'Erro ao processar solicitação' });
  }
});

/**
 * GET /auth/reset-password/validate/:token
 * Valida token de recuperação
 */
authRoutes.get('/reset-password/validate/:token', async (req, res: Response) => {
  try {
    const { token } = req.params;
    const validation = await validateResetToken(token);

    if (!validation.valid) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Token inválido ou expirado' 
      });
    }

    res.json({ 
      valid: true, 
      email: validation.email,
      userType: validation.userType
    });

  } catch (error: any) {
    console.error('[AUTH] Erro ao validar token:', error);
    res.status(500).json({ error: 'Erro ao validar token' });
  }
});

/**
 * POST /auth/reset-password
 * Redefine a senha
 */
authRoutes.post('/reset-password', async (req, res: Response) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Token, nova senha e confirmação são obrigatórios' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'As senhas não conferem' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    const result = await resetPassword(token, newPassword);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, message: result.message });

  } catch (error: any) {
    console.error('[AUTH] Erro ao redefinir senha:', error);
    res.status(500).json({ error: 'Erro ao redefinir senha' });
  }
});

// =============================================================================
// VERIFICAÇÃO DE TOKEN
// =============================================================================

/**
 * POST /auth/verify
 * Verifica se token é válido
 */
authRoutes.post('/verify', async (req, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token é obrigatório' });
    }

    const validation = verifyToken(token);

    if (!validation.valid) {
      return res.status(401).json({ valid: false, error: 'Token inválido' });
    }

    res.json({ 
      valid: true, 
      user: validation.decoded 
    });

  } catch (error: any) {
    console.error('[AUTH] Erro ao verificar token:', error);
    res.status(500).json({ error: 'Erro ao verificar token' });
  }
});

/**
 * GET /auth/me
 * Retorna dados do usuário logado
 */
authRoutes.get('/me', async (req: any, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    const validation = verifyToken(token);

    if (!validation.valid || !validation.decoded) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    const { id, role } = validation.decoded;

    let user;
    switch (role) {
      case 'admin':
        user = await prisma.admin.findUnique({ 
          where: { id },
          select: { id: true, email: true, name: true }
        });
        break;
      case 'reseller':
        user = await prisma.reseller.findUnique({ 
          where: { id },
          select: { 
            id: true, 
            email: true, 
            name: true, 
            status: true,
            maxTenants: true,
            allowedModules: true,
            zeroTouchEnabled: true
          }
        });
        break;
      case 'merchant':
        user = await prisma.merchant.findUnique({ 
          where: { id },
          select: { 
            id: true, 
            email: true, 
            name: true, 
            status: true,
            activeModules: true,
            plan: { select: { name: true, price: true } }
          }
        });
        break;
    }

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ ...user, role });

  } catch (error: any) {
    console.error('[AUTH] Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * POST /auth/logout
 * Logout (invalida token no client)
 */
authRoutes.post('/logout', (req, res: Response) => {
  // JWT não pode ser invalidado do lado do servidor sem uma blacklist
  // O client deve apenas remover o token
  res.json({ success: true, message: 'Logout realizado com sucesso' });
});

export default authRoutes;
