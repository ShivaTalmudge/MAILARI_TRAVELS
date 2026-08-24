import { Request, Response } from 'express';
import { pool } from '../config/db';
import { sendSuccess, sendCreated, sendNotFound, sendError } from '../utils/response';
import { generatePaymentNumber, createAuditLog, getPaginationParams } from '../utils/helpers';
import { createNotification } from '../services/notification.service';
import { PaymentStatus, NotificationType, Role } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const getPayments = async (req: Request, res: Response): Promise<void> => {
  const { skip, take, page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
  const { status, bookingId } = req.query as Record<string, string | undefined>;

  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    if (status) { whereClause += ' AND p.status = ?'; params.push(status); }
    if (bookingId) { whereClause += ' AND p.bookingId = ?'; params.push(bookingId); }

    if (req.user?.role === Role.CUSTOMER) {
      const [[profile]]: any = await pool.execute('SELECT id FROM customer_profiles WHERE userId = ?', [req.user.userId]);
      if (profile) { whereClause += ' AND b.customerId = ?'; params.push(profile.id); }
    }

    const [[{ total }]]: any = await pool.execute(`SELECT COUNT(*) as total FROM payments p LEFT JOIN bookings b ON p.bookingId = b.id ${whereClause}`, params);

    params.push(take, skip);
    const [paymentsRaw]: any = await pool.execute(
      `SELECT p.*, b.bookingNumber, b.totalAmount, c.fullName as customerName
       FROM payments p LEFT JOIN bookings b ON p.bookingId = b.id LEFT JOIN customer_profiles c ON b.customerId = c.id
       ${whereClause} ORDER BY p.createdAt DESC LIMIT ? OFFSET ?`, params
    );

    const payments = paymentsRaw.map((p: any) => ({
      ...p, booking: p.bookingNumber ? { bookingNumber: p.bookingNumber, totalAmount: p.totalAmount, customer: p.customerName ? { fullName: p.customerName } : null } : null
    }));

    sendSuccess(res, payments, 'Payments fetched', 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const createPayment = async (req: Request, res: Response): Promise<void> => {
  const { bookingId, amount, paymentMethod, transactionRef, notes, paymentDate } = req.body;

  try {
    const [[booking]]: any = await pool.execute(`SELECT b.*, c.userId as customerUserId FROM bookings b LEFT JOIN customer_profiles c ON b.customerId = c.id WHERE b.id = ?`, [bookingId]);
    if (!booking) { sendNotFound(res, 'Booking not found'); return; }

    const paymentNumber = await generatePaymentNumber();
    const paymentId = uuidv4();
    const amt = parseFloat(amount);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO payments (id, paymentNumber, bookingId, amount, paymentMethod, status, transactionRef, paymentDate, notes, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [paymentId, paymentNumber, bookingId, amt, paymentMethod, PaymentStatus.PAID, transactionRef || null, paymentDate ? new Date(paymentDate) : new Date(), notes || null]
      );

      const totalPaid = Number(booking.paidAmount || 0) + amt;
      const newPaymentStatus = totalPaid >= Number(booking.totalAmount) ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID;
      await connection.execute('UPDATE bookings SET paidAmount = ?, paymentStatus = ? WHERE id = ?', [totalPaid, newPaymentStatus, bookingId]);
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    if (booking.customerUserId) await createNotification(booking.customerUserId, NotificationType.PAYMENT_RECEIVED, 'Payment Received', `Payment of ₹${amount} received for booking ${booking.bookingNumber}.`, 'Payment', paymentId);
    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'CREATE', entity: 'Payment', entityId: paymentId, description: `Payment ${paymentNumber} of ₹${amount} recorded for booking ${booking.bookingNumber}`, ipAddress: req.ip });
    
    const [[payment]]: any = await pool.execute('SELECT * FROM payments WHERE id = ?', [paymentId]);
    sendCreated(res, payment, 'Payment recorded successfully');
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const getPaymentById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const [[payment]]: any = await pool.execute('SELECT * FROM payments WHERE id = ?', [id]);
    if (!payment) { sendNotFound(res, 'Payment not found'); return; }
    
    const [[booking]]: any = await pool.execute(`SELECT b.*, c.fullName as customerName FROM bookings b LEFT JOIN customer_profiles c ON b.customerId = c.id WHERE b.id = ?`, [payment.bookingId]);
    payment.booking = booking ? { ...booking, customer: booking.customerName ? { fullName: booking.customerName } : null } : null;
    
    sendSuccess(res, payment);
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const updatePaymentStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const [[payment]]: any = await pool.execute('SELECT id FROM payments WHERE id = ?', [id]);
    if (!payment) { sendNotFound(res, 'Payment not found'); return; }

    await pool.execute('UPDATE payments SET status = ? WHERE id = ?', [status, id]);
    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'STATUS_CHANGE', entity: 'Payment', entityId: id, description: `Payment status changed to ${status}` });
    sendSuccess(res, null, 'Payment status updated');
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};
