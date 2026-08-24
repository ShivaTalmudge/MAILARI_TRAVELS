import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess, sendCreated, sendNotFound, sendError } from '../utils/response';
import { generateInvoiceNumber, createAuditLog, getPaginationParams } from '../utils/helpers';
import { createNotification } from '../services/notification.service';
import { NotificationType, Role } from '@prisma/client';

export const getInvoices = async (req: Request, res: Response): Promise<void> => {
  const { skip, take, page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
  let where: Record<string, unknown> = {};

  if (req.user?.role === Role.CUSTOMER) {
    const profile = await prisma.customerProfile.findUnique({ where: { userId: req.user.userId } });
    if (profile) where.booking = { customerId: profile.id };
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      include: { booking: { select: { bookingNumber: true, customer: { select: { fullName: true } } } } },
    }),
    prisma.invoice.count({ where }),
  ]);

  sendSuccess(res, invoices, 'Invoices fetched', 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
};

export const generateInvoice = async (req: Request, res: Response): Promise<void> => {
  const { bookingId } = req.body;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: { include: { user: true } },
      driver: true,
      vehicle: { include: { vehicleType: true } },
      vehicleType: true,
    },
  });
  if (!booking) { sendNotFound(res, 'Booking not found'); return; }

  // Check no existing invoice
  const existing = await prisma.invoice.findUnique({ where: { bookingId } });
  if (existing) { sendError(res, 'Invoice already exists for this booking.', 409); return; }

  const invoiceNumber = await generateInvoiceNumber();

  // Build line items
  const items = [];
  if (Number(booking.baseFare) > 0) items.push({ description: 'Base Fare', quantity: 1, unitPrice: booking.baseFare, amount: booking.baseFare, sortOrder: 1 });
  if (Number(booking.distanceCharges) > 0) items.push({ description: `Distance Charges (${booking.estimatedDistance || 0} km)`, quantity: 1, unitPrice: booking.distanceCharges, amount: booking.distanceCharges, sortOrder: 2 });
  if (Number(booking.driverAllowance) > 0) items.push({ description: 'Driver Allowance', quantity: 1, unitPrice: booking.driverAllowance, amount: booking.driverAllowance, sortOrder: 3 });
  if (Number(booking.nightCharges) > 0) items.push({ description: 'Night Charges', quantity: 1, unitPrice: booking.nightCharges, amount: booking.nightCharges, sortOrder: 4 });
  if (Number(booking.airportCharges) > 0) items.push({ description: 'Airport Surcharge', quantity: 1, unitPrice: booking.airportCharges, amount: booking.airportCharges, sortOrder: 5 });
  if (Number(booking.statePermitCharges) > 0) items.push({ description: 'State Permit Charges', quantity: 1, unitPrice: booking.statePermitCharges, amount: booking.statePermitCharges, sortOrder: 6 });
  if (Number(booking.tollCharges) > 0) items.push({ description: 'Toll Charges', quantity: 1, unitPrice: booking.tollCharges, amount: booking.tollCharges, sortOrder: 7 });
  if (Number(booking.parkingCharges) > 0) items.push({ description: 'Parking Charges', quantity: 1, unitPrice: booking.parkingCharges, amount: booking.parkingCharges, sortOrder: 8 });
  if (Number(booking.extraCharges) > 0) items.push({ description: 'Additional Charges', quantity: 1, unitPrice: booking.extraCharges, amount: booking.extraCharges, sortOrder: 9 });

  // Get tax config
  const taxConfig = await prisma.taxConfig.findFirst({ where: { isActive: true, isDefault: true } });
  const subtotal = Number(booking.subtotal);
  const cgst = subtotal * (Number(taxConfig?.cgstRate || 0) / 100);
  const sgst = subtotal * (Number(taxConfig?.sgstRate || 0) / 100);
  const igst = subtotal * (Number(taxConfig?.igstRate || 0) / 100);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      bookingId,
      subtotal,
      cgst,
      sgst,
      igst,
      taxTotal: cgst + sgst + igst,
      discount: booking.discount,
      totalAmount: booking.totalAmount,
      paymentStatus: booking.paymentStatus,
      items: { create: items },
    },
    include: { items: true, booking: { include: { customer: { include: { user: true } }, vehicle: { include: { vehicleType: true } }, driver: true } } },
  });

  await createNotification(booking.customer.userId, NotificationType.INVOICE_GENERATED, 'Invoice Generated', `Invoice ${invoiceNumber} has been generated for your booking ${booking.bookingNumber}.`, 'Invoice', invoice.id);

  await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'CREATE', entity: 'Invoice', entityId: invoice.id, description: `Invoice ${invoiceNumber} generated for booking ${booking.bookingNumber}`, ipAddress: req.ip });
  sendCreated(res, invoice, 'Invoice generated successfully');
};

export const getInvoiceById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: 'asc' } },
      booking: {
        include: {
          customer: { include: { user: { select: { mobile: true, email: true } } } },
          driver: { select: { fullName: true, licenceNumber: true } },
          vehicle: { include: { vehicleType: true } },
        },
      },
    },
  });
  if (!invoice) { sendNotFound(res, 'Invoice not found'); return; }

  if (req.user?.role === Role.CUSTOMER) {
    const profile = await prisma.customerProfile.findUnique({ where: { userId: req.user.userId } });
    if (invoice.booking.customerId !== profile?.id) { res.status(403).json({ success: false, message: 'Forbidden' }); return; }
  }

  sendSuccess(res, invoice);
};
