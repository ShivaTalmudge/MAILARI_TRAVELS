import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendCreated, sendNotFound } from '../utils/response';
import { generateTicketNumber, getPaginationParams, createAuditLog } from '../utils/helpers';
import { TicketStatus, Role } from '@prisma/client';

export const getTickets = async (req: Request, res: Response): Promise<void> => {
  const { skip, take, page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
  const { status } = req.query as { status?: string };
  const userId = req.user!.userId;

  const where = {
    ...(req.user?.role !== Role.ADMIN ? { userId } : {}),
    ...(status ? { status: status as TicketStatus } : {}),
  };

  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where, skip, take,
      orderBy: { updatedAt: 'desc' },
      include: { user: { select: { id: true } }, messages: { take: 1, orderBy: { createdAt: 'desc' } } },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  sendSuccess(res, tickets, 'Tickets fetched', 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
};

export const createTicket = async (req: Request, res: Response): Promise<void> => {
  const { category, subject, message } = req.body;
  const userId = req.user!.userId;

  const ticketNumber = await generateTicketNumber();

  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNumber, userId, category, subject,
      messages: { create: { senderId: userId, senderRole: req.user!.role, message } },
    },
    include: { messages: true },
  });

  sendCreated(res, ticket, `Support ticket ${ticketNumber} created`);
};

export const getTicketById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!ticket) { sendNotFound(res, 'Ticket not found'); return; }

  if (req.user?.role !== Role.ADMIN && ticket.userId !== req.user?.userId) {
    res.status(403).json({ success: false, message: 'Forbidden' }); return;
  }

  sendSuccess(res, ticket);
};

export const addMessage = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { message, isInternal } = req.body;

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) { sendNotFound(res, 'Ticket not found'); return; }

  if (req.user?.role !== Role.ADMIN && ticket.userId !== req.user?.userId) {
    res.status(403).json({ success: false, message: 'Forbidden' }); return;
  }

  const msg = await prisma.supportMessage.create({
    data: { ticketId: id, senderId: req.user!.userId, senderRole: req.user!.role, message, isInternal: Boolean(isInternal) },
  });

  // Update ticket status
  const newStatus = req.user?.role === Role.ADMIN ? TicketStatus.IN_PROGRESS : TicketStatus.WAITING_FOR_CUSTOMER;
  await prisma.supportTicket.update({ where: { id }, data: { status: newStatus } });

  sendCreated(res, msg, 'Message added');
};

export const updateTicketStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  await prisma.supportTicket.update({
    where: { id },
    data: { status: status as TicketStatus, closedAt: status === TicketStatus.CLOSED ? new Date() : undefined },
  });

  sendSuccess(res, null, 'Ticket status updated');
};
