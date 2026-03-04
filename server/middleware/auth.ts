/**
 * MIDDLEWARE DE AUTENTICAÇÃO E AUTORIZAÇÃO - SaaSWPP AI
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { auditLog } from '../utils/permissions';

const prisma = new PrismaClient();

// JWT Secret - OBRIGATÓRIO
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('[AUTH] JWT_SECRET não configurado! Configure a variável de ambiente.');
}

// =============================================================================
// INTERFACES
// =============================================================================

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'RESELLER' | 'MERCHANT';
  status: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  merchantId?: string;
  resellerId?: string;
}

// =============================================================================
// MIDDLEWARE PRINCIPAL
// =============================================================================

/**
 * Middleware que exige autenticação JWT
 */
export function requireAuth(allowedRoles?: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // 1. Extrair token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token não fornecido' });
      }

      const token = authHeader.slice(7);

      // 2. Verificar token
      let decoded: any;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ error: 'Token inválido ou expirado' });
      }

      // 3. Buscar usuário baseado no role
      let user: AuthUser | null = null;

      if (decoded.role === 'ADMIN') {
        const admin = await prisma.admin.findUnique({
          where: { id: decoded.id }
        });
        if (admin) {
          user = {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            role: 'ADMIN',
            status: 'active'
          };
        }
      } else if (decoded.role === 'RESELLER') {
        const reseller = await prisma.reseller.findUnique({
          where: { id: decoded.id }
        });
        if (reseller) {
          user = {
            id: reseller.id,
            email: reseller.email,
            name: reseller.name,
            role: 'RESELLER',
            status: reseller.status
          };
        }
      } else if (decoded.role === 'MERCHANT') {
        const merchant = await prisma.merchant.findUnique({
          where: { id: decoded.id },
          include: { reseller: true }
        });
        if (merchant) {
          user = {
            id: merchant.id,
            email: merchant.email,
            name: merchant.name,
            role: 'MERCHANT',
            status: merchant.status
          };
          req.merchantId = merchant.id;
          if (merchant.resellerId) {
            req.resellerId = merchant.resellerId;
          }
        }
      }

      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      // 4. Verificar status
      if (user.status === 'suspended') {
        return res.status(403).json({ error: 'Conta suspensa', code: 'ACCOUNT_SUSPENDED' });
      }

      // 5. Verificar role
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // 6. Verificar impersonação (Admin acessando como Merchant/Reseller)
      const impersonateMerchant = req.headers['x-impersonate-merchant'] as string;
      const impersonateReseller = req.headers['x-impersonate-reseller'] as string;

      if (user.role === 'ADMIN') {
        if (impersonateMerchant) {
          // Registrar auditoria de impersonação
          await auditLog({
            adminId: user.id,
            merchantId: impersonateMerchant,
            action: 'ADMIN_IMPERSONATION',
            details: `Admin ${user.email} acessou como merchant ${impersonateMerchant}`,
            ipAddress: req.ip
          });

          const targetMerchant = await prisma.merchant.findUnique({
            where: { id: impersonateMerchant }
          });

          if (targetMerchant) {
            req.merchantId = impersonateMerchant;
            user = {
              ...user,
              role: 'MERCHANT',
              id: impersonateMerchant
            };
          }
        } else if (impersonateReseller) {
          await auditLog({
            adminId: user.id,
            resellerId: impersonateReseller,
            action: 'ADMIN_IMPERSONATION',
            details: `Admin ${user.email} acessou como reseller ${impersonateReseller}`,
            ipAddress: req.ip
          });

          const targetReseller = await prisma.reseller.findUnique({
            where: { id: impersonateReseller }
          });

          if (targetReseller) {
            req.resellerId = impersonateReseller;
            user = {
              ...user,
              role: 'RESELLER',
              id: impersonateReseller
            };
          }
        }
      }

      req.user = user;
      next();

    } catch (error) {
      console.error('[AUTH] Erro:', error);
      return res.status(500).json({ error: 'Erro interno de autenticação' });
    }
  };
}

/**
 * Middleware que exige papel específico
 */
export function requireRole(role: string) {
  return requireAuth([role]);
}

/**
 * Middleware que exige admin
 */
export function requireAdmin() {
  return requireAuth(['ADMIN']);
}

/**
 * Middleware que exige reseller ou admin
 */
export function requireReseller() {
  return requireAuth(['ADMIN', 'RESELLER']);
}

/**
 * Middleware que exige merchant (ou admin impersonando)
 */
export function requireMerchant() {
  return requireAuth(['ADMIN', 'RESELLER', 'MERCHANT']);
}

// =============================================================================
// MIDDLEWARE DE RATE LIMIT POR USUÁRIO
// =============================================================================

const userRequestCounts = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limit por usuário (diferente do rate limit por IP)
 */
export function userRateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();
    const userLimit = userRequestCounts.get(userId);

    if (!userLimit || now > userLimit.resetAt) {
      userRequestCounts.set(userId, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (userLimit.count >= maxRequests) {
      return res.status(429).json({
        error: 'Limite de requisições excedido',
        retryAfter: Math.ceil((userLimit.resetAt - now) / 1000)
      });
    }

    userLimit.count++;
    next();
  };
}

// =============================================================================
// UTILITÁRIOS DE TOKEN
// =============================================================================

/**
 * Gera token JWT
 */
export function generateToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Gera refresh token
 */
export function generateRefreshToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verifica refresh token
 */
export function verifyRefreshToken(token: string): { id: string; email: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type !== 'refresh') return null;
    return { id: decoded.id, email: decoded.email, role: decoded.role };
  } catch {
    return null;
  }
}
