import { Request, Response } from 'express';
import { pool } from '../config/db';
import { sendSuccess, sendCreated, sendNotFound, sendError } from '../utils/response';
import { generateTicketNumber, getPaginationParams, createAuditLog } from '../utils/helpers';
import { TicketStatus, Role } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const getTickets = async (req: Request, res: Response): Promise<void> => {
  const { skip, take, page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
  const { status } = req.query as { status?: string };
  const userId = req.user!.userId;

  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    if (req.user?.role !== Role.ADMIN) { whereClause += ' AND t.userId = ?'; params.push(userId); }
    if (status) { whereClause += ' AND t.status = ?'; params.push(status); }

    const [[{ total }]]: any = await pool.execute(`SELECT COUNT(*) as total FROM support_tickets t ${whereClause}`, params);
    
    params.push(take, skip);
    const [ticketsRaw]: any = await pool.execute(`SELECT t.* FROM support_tickets t ${whereClause} ORDER BY t.updatedAt DESC LIMIT ? OFFSET ?`, params);
    
    const tickets = [];
    for (const t of ticketsRaw) {
      const [messages]: any = await pool.execute('SELECT * FROM support_messages WHERE ticketId = ? ORDER BY createdAt DESC LIMIT 1', [t.id]);
      tickets.push({ ...t, user: { id: t.userId }, messages });
    }

    sendSuccess(res, tickets, 'Tickets fetched', 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
};

export const createTicket = async (req: Request, res: Response): Promise<void> => {
  const { category, subject, message } = req.body;
  const userId = req.user!.userId;
  
  try {
    const ticketNumber = await generateTicketNumber();
    const ticketId = uuidv4();
    const msgId = uuidv4();

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO support_tickets (id, ticketNumber, userId, category, subject, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 'OPEN', NOW(), NOW())`,
        [ticketId, ticketNumber, userId, category, subject]
      );
      await connection.execute(
        `INSERT INTO support_messages (id, ticketId, senderId, senderRole, message, isInternal, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, false, NOW(), NOW())`,
        [msgId, ticketId, userId, req.user!.role, message]
      );
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
    
    const [[ticket]]: any = await pool.execute('SELECT * FROM support_tickets WHERE id = ?', [ticketId]);
    const [messages]: any = await pool.execute('SELECT * FROM support_messages WHERE ticketId = ?', [ticketId]);
    sendCreated(res, { ...ticket, messages }, `Support ticket ${ticketNumber} created`);
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
};

export const getTicketById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const [[ticket]]: any = await pool.execute('SELECT * FROM support_tickets WHERE id = ?', [id]);
    if (!ticket) { sendNotFound(res, 'Ticket not found'); return; }
    if (req.user?.role !== Role.ADMIN && ticket.userId !== req.user?.userId) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const [messages]: any = await pool.execute('SELECT * FROM support_messages WHERE ticketId = ? ORDER BY createdAt ASC', [id]);
    sendSuccess(res, { ...ticket, messages });
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
};

export const addMessage = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { message, isInternal } = req.body;

  try {
    const [[ticket]]: any = await pool.execute('SELECT userId FROM support_tickets WHERE id = ?', [id]);
    if (!ticket) { sendNotFound(res, 'Ticket not found'); return; }
    if (req.user?.role !== Role.ADMIN && ticket.userId !== req.user?.userId) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }

    const msgId = uuidv4();
    const newStatus = req.user?.role === Role.ADMIN ? 'IN_PROGRESS' : 'WAITING_FOR_CUSTOMER';

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO support_messages (id, ticketId, senderId, senderRole, message, isInternal, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [msgId, id, req.user!.userId, req.user!.role, message, Boolean(isInternal)]
      );
      await connection.execute('UPDATE support_tickets SET status = ?, updatedAt = NOW() WHERE id = ?', [newStatus, id]);
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    const [[msg]]: any = await pool.execute('SELECT * FROM support_messages WHERE id = ?', [msgId]);
    sendCreated(res, msg, 'Message added');
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
};

export const updateTicketStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.execute('UPDATE support_tickets SET status = ?, closedAt = ?, updatedAt = NOW() WHERE id = ?', [status, status === 'CLOSED' ? new Date() : null, id]);
    sendSuccess(res, null, 'Ticket status updated');
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
};
