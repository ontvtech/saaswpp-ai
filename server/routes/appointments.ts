/**
 * ROTAS DE AGENDAMENTOS - SaaSWPP AI
 * CRUD completo para agendamentos do lojista
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from './auth';
import { auditLog } from '../utils/permissions';

const prisma = new PrismaClient();
export const appointmentsRoutes = Router();

// Todas as rotas exigem autenticação
appointmentsRoutes.use(requireAuth(['MERCHANT', 'RESELLER', 'ADMIN']));

// =============================================================================
// GET /api/appointments - Lista agendamentos
// =============================================================================
appointmentsRoutes.get('/', async (req: any, res: Response) => {
  try {
    const merchantId = req.user.role === 'MERCHANT' ? req.user.id : req.query.merchantId;

    if (!merchantId) {
      // Retornar dados mock
      return res.json([
        { 
          id: '1', 
          clientName: 'João Silva', 
          clientPhone: '5511999999999',
          date: new Date(Date.now() + 86400000).toISOString(), // Amanhã
          duration: 30,
          service: 'Troca de Óleo',
          status: 'pending',
          notes: 'Cliente pediu óleo 5W30'
        },
        { 
          id: '2', 
          clientName: 'Maria Santos', 
          clientPhone: '5511888888888',
          date: new Date(Date.now() + 2 * 86400000).toISOString(), // Depois de amanhã
          duration: 60,
          service: 'Revisão Completa',
          status: 'confirmed',
          notes: ''
        },
      ]);
    }

    const appointments = await prisma.appointment.findMany({
      where: { merchantId },
      orderBy: { date: 'asc' }
    });

    res.json(appointments);

  } catch (error: any) {
    console.error('[APPOINTMENTS] Erro ao buscar:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamentos' });
  }
});

// =============================================================================
// POST /api/appointments - Cria novo agendamento
// =============================================================================
appointmentsRoutes.post('/', async (req: any, res: Response) => {
  try {
    const merchantId = req.user.role === 'MERCHANT' ? req.user.id : req.body.merchantId;
    const { clientName, clientPhone, date, duration, service, notes } = req.body;

    if (!merchantId) {
      return res.status(400).json({ error: 'merchantId é obrigatório' });
    }

    const appointment = await prisma.appointment.create({
      data: {
        merchantId,
        clientName,
        clientPhone,
        date: new Date(date),
        duration: duration || 30,
        service,
        notes,
        status: 'pending'
      }
    });

    await auditLog({
      merchantId,
      action: 'APPOINTMENT_CREATED',
      details: `Agendamento criado: ${clientName} - ${service}`
    });

    res.status(201).json(appointment);

  } catch (error: any) {
    console.error('[APPOINTMENTS] Erro ao criar:', error);
    res.status(500).json({ error: 'Erro ao criar agendamento' });
  }
});

// =============================================================================
// PUT /api/appointments/:id - Atualiza agendamento
// =============================================================================
appointmentsRoutes.put('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { clientName, clientPhone, date, duration, service, notes, status } = req.body;

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        clientName,
        clientPhone,
        date: date ? new Date(date) : undefined,
        duration,
        service,
        notes,
        status
      }
    });

    await auditLog({
      merchantId: appointment.merchantId,
      action: 'APPOINTMENT_UPDATED',
      details: `Agendamento atualizado: ${id}`
    });

    res.json(appointment);

  } catch (error: any) {
    console.error('[APPOINTMENTS] Erro ao atualizar:', error);
    res.status(500).json({ error: 'Erro ao atualizar agendamento' });
  }
});

// =============================================================================
// PATCH /api/appointments/:id/status - Atualiza status
// =============================================================================
appointmentsRoutes.patch('/:id/status', async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status }
    });

    await auditLog({
      merchantId: appointment.merchantId,
      action: 'APPOINTMENT_STATUS_CHANGED',
      details: `Status alterado para: ${status}`
    });

    res.json(appointment);

  } catch (error: any) {
    console.error('[APPOINTMENTS] Erro ao atualizar status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// =============================================================================
// DELETE /api/appointments/:id - Remove agendamento
// =============================================================================
appointmentsRoutes.delete('/:id', async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id }
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    await prisma.appointment.delete({
      where: { id }
    });

    await auditLog({
      merchantId: appointment.merchantId,
      action: 'APPOINTMENT_DELETED',
      details: `Agendamento removido: ${id}`
    });

    res.json({ success: true });

  } catch (error: any) {
    console.error('[APPOINTMENTS] Erro ao deletar:', error);
    res.status(500).json({ error: 'Erro ao deletar agendamento' });
  }
});

export default appointmentsRoutes;
