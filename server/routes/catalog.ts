/**
 * ROTAS DE CATÁLOGO - SaaSWPP AI
 * CRUD completo para produtos/serviços do lojista
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from './auth';
import { auditLog } from '../utils/permissions';

const prisma = new PrismaClient();
export const catalogRoutes = Router();

// Todas as rotas exigem autenticação
catalogRoutes.use(requireAuth(['MERCHANT', 'RESELLER', 'ADMIN']));

// =============================================================================
// GET /api/catalog - Lista itens do catálogo
// =============================================================================
catalogRoutes.get('/', async (req: any, res: Response) => {
  try {
    const merchantId = req.user.role === 'MERCHANT' ? req.user.id : req.query.merchantId;

    if (!merchantId) {
      // Retornar dados mock se não houver merchant
      return res.json([
        { id: '1', name: 'Troca de Óleo', category: 'Serviço', price: 150.00, stock: 999, description: 'Serviço completo com filtro' },
        { id: '2', name: 'Pneu Aro 14', category: 'Produto', price: 350.00, stock: 4, description: 'Pneu Goodyear' },
        { id: '3', name: 'Alinhamento 3D', category: 'Serviço', price: 120.00, stock: 999, description: 'Alinhamento computadorizado' },
        { id: '4', name: 'Bateria 60Ah', category: 'Produto', price: 450.00, stock: 12, description: 'Bateria Moura' },
      ]);
    }

    // Buscar catálogo do merchant (armazenado em aiConfig ou tabela separada)
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { aiConfig: true }
    });

    const catalog = (merchant?.aiConfig as any)?.catalog || [];
    res.json(catalog);

  } catch (error: any) {
    console.error('[CATALOG] Erro ao buscar:', error);
    res.status(500).json({ error: 'Erro ao buscar catálogo' });
  }
});

// =============================================================================
// POST /api/catalog - Cria novo item
// =============================================================================
catalogRoutes.post('/', async (req: any, res: Response) => {
  try {
    const merchantId = req.user.role === 'MERCHANT' ? req.user.id : req.body.merchantId;
    const { name, category, price, stock, description } = req.body;

    if (!merchantId) {
      return res.status(400).json({ error: 'merchantId é obrigatório' });
    }

    // Buscar aiConfig atual
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { aiConfig: true }
    });

    const aiConfig = (merchant?.aiConfig as any) || {};
    const catalog = aiConfig.catalog || [];

    const newItem = {
      id: Date.now().toString(),
      name,
      category,
      price: Number(price),
      stock: Number(stock),
      description,
      createdAt: new Date().toISOString()
    };

    // Adicionar ao catálogo
    catalog.push(newItem);

    // Salvar
    await prisma.merchant.update({
      where: { id: merchantId },
      data: { aiConfig: { ...aiConfig, catalog } }
    });

    await auditLog({
      merchantId,
      action: 'CATALOG_ITEM_CREATED',
      details: `Item criado: ${name}`
    });

    res.status(201).json(newItem);

  } catch (error: any) {
    console.error('[CATALOG] Erro ao criar:', error);
    res.status(500).json({ error: 'Erro ao criar item' });
  }
});

// =============================================================================
// PUT /api/catalog/:id - Atualiza item
// =============================================================================
catalogRoutes.put('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const merchantId = req.user.role === 'MERCHANT' ? req.user.id : req.body.merchantId;
    const { name, category, price, stock, description } = req.body;

    if (!merchantId) {
      return res.status(400).json({ error: 'merchantId é obrigatório' });
    }

    // Buscar aiConfig atual
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { aiConfig: true }
    });

    const aiConfig = (merchant?.aiConfig as any) || {};
    const catalog = aiConfig.catalog || [];

    // Encontrar e atualizar item
    const itemIndex = catalog.findIndex((item: any) => item.id === id);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    catalog[itemIndex] = {
      ...catalog[itemIndex],
      name,
      category,
      price: Number(price),
      stock: Number(stock),
      description,
      updatedAt: new Date().toISOString()
    };

    // Salvar
    await prisma.merchant.update({
      where: { id: merchantId },
      data: { aiConfig: { ...aiConfig, catalog } }
    });

    await auditLog({
      merchantId,
      action: 'CATALOG_ITEM_UPDATED',
      details: `Item atualizado: ${name}`
    });

    res.json(catalog[itemIndex]);

  } catch (error: any) {
    console.error('[CATALOG] Erro ao atualizar:', error);
    res.status(500).json({ error: 'Erro ao atualizar item' });
  }
});

// =============================================================================
// DELETE /api/catalog/:id - Remove item
// =============================================================================
catalogRoutes.delete('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const merchantId = req.user.role === 'MERCHANT' ? req.user.id : req.query.merchantId;

    if (!merchantId) {
      return res.status(400).json({ error: 'merchantId é obrigatório' });
    }

    // Buscar aiConfig atual
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { aiConfig: true }
    });

    const aiConfig = (merchant?.aiConfig as any) || {};
    const catalog = aiConfig.catalog || [];

    // Filtrar item
    const newCatalog = catalog.filter((item: any) => item.id !== id);

    if (newCatalog.length === catalog.length) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    // Salvar
    await prisma.merchant.update({
      where: { id: merchantId },
      data: { aiConfig: { ...aiConfig, catalog: newCatalog } }
    });

    await auditLog({
      merchantId,
      action: 'CATALOG_ITEM_DELETED',
      details: `Item removido: ${id}`
    });

    res.json({ success: true });

  } catch (error: any) {
    console.error('[CATALOG] Erro ao deletar:', error);
    res.status(500).json({ error: 'Erro ao deletar item' });
  }
});

export default catalogRoutes;
