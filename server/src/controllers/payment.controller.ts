import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendCreated, sendNotFound, sendError } from '../utils/response';
import { generatePaymentNumber, createAuditLog, getPaginationParams } from '../utils/helpers';
import { createNotification } from '../services/notification.service';
import { PaymentStatus, NotificationType, Role } from '@prisma/client';

export const getPayments = async (req: Request, res: Response): Promise<void> => {
  const { skip, take, page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
  const { status, bookingId } = req.query as Record<string, string | undefined>;

  let where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (bookingId) where.bookingId = bookingId;

  if (req.user?.role === Role.CUSTOMER) {
    const profile = await prisma.customerProfile.findUnique({ where: { userId: req.user.userId } });
    if (profile) where.booking = { customerId: profile.id };
  }

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      include: { booking: { select: { bookingNumber: true, totalAmount: true, customer: { select: { fullName: true } } } } },
    }),
    prisma.payment.count({ where }),
  ]);

  sendSuccess(res, payments, 'Payments fetched', 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
};

export const createPayment = async (req: Request, res: Response): Promise<void> => {
  const { bookingId, amount, paymentMethod, transactionRef, notes, paymentDate } = req.body;

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { customer: { include: { user: true } } } });
  if (!booking) { sendNotFound(res, 'Booking not found'); return; }

  const paymentNumber = await generatePaymentNumber();

  const payment = await prisma.payment.create({
    data: {
      paymentNumber,
      bookingId,
      amount: parseFloat(amount),
      paymentMethod,
      status: PaymentStatus.PAID,
      transactionRef,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      notes,
    },
  });

  // Update booking paid amount and payment status
  const totalPaid = Number(booking.paidAmount || 0) + parseFloat(amount);
  const newPaymentStatus = totalPaid >= Number(booking.totalAmount) ? PaymentStatus.PAID : PaymentStatus.PARTIALLY_PAID;

  await prisma.booking.update({
    where: { id: bookingId },
    data: { paidAmount: totalPaid, paymentStatus: newPaymentStatus },
  });

  await createNotification(booking.customer.userId, NotificationType.PAYMENT_RECEIVED, 'Payment Received', `Payment of ₹${amount} received for booking ${booking.bookingNumber}.`, 'Payment', payment.id);

  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'CREATE', entity: 'Payment', entityId: payment.id, description: `Payment ${paymentNumber} of ₹${amount} recorded for booking ${booking.bookingNumber}`, ipAddress: req.ip });
  sendCreated(res, payment, 'Payment recorded successfully');
};

export const getPaymentById = async (req: Request, res: Response): Promise<void> => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: { booking: { include: { customer: true } } },
  });
  if (!payment) { sendNotFound(res, 'Payment not found'); return; }
  sendSuccess(res, payment);
};

export const updatePaymentStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;

  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) { sendNotFound(res, 'Payment not found'); return; }

  await prisma.payment.update({ where: { id }, data: { status: status as PaymentStatus } });
  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'STATUS_CHANGE', entity: 'Payment', entityId: id, description: `Payment status changed to ${status}` });
  sendSuccess(res, null, 'Payment status updated');
};
