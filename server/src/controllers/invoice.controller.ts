import { Request, Response } from 'express';
import { pool } from '../config/db';
import { sendSuccess, sendCreated, sendNotFound, sendError } from '../utils/response';
import { generateInvoiceNumber, createAuditLog, getPaginationParams } from '../utils/helpers';
import { createNotification, sendInvoiceNotification, sendInvoiceGeneratedEmail } from '../services/notification.service';
import { NotificationType, Role } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const getInvoices = async (req: Request, res: Response): Promise<void> => {
  const { skip, take, page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
  
  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (req.user?.role === Role.CUSTOMER) {
      const [[profile]]: any = await pool.execute('SELECT id FROM customer_profiles WHERE userId = ?', [req.user.userId]);
      if (profile) {
        whereClause += ' AND b.customerId = ?';
        params.push(profile.id);
      }
    }

    const [[{ total }]]: any = await pool.execute(
      `SELECT COUNT(*) as total FROM invoices i LEFT JOIN bookings b ON i.bookingId = b.id ${whereClause}`, params
    );

    params.push(take, skip);
    const [invoicesRaw]: any = await pool.execute(
      `SELECT i.*, b.bookingNumber, c.fullName as customerName
       FROM invoices i
       LEFT JOIN bookings b ON i.bookingId = b.id
       LEFT JOIN customer_profiles c ON b.customerId = c.id
       ${whereClause} ORDER BY i.createdAt DESC LIMIT ? OFFSET ?`,
      params
    );

    const invoices = invoicesRaw.map((i: any) => ({
      ...i,
      booking: i.bookingNumber ? { bookingNumber: i.bookingNumber, customer: i.customerName ? { fullName: i.customerName } : null } : null
    }));

    sendSuccess(res, invoices, 'Invoices fetched', 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const generateInvoice = async (req: Request, res: Response): Promise<void> => {
  const { bookingId } = req.body;

  try {
    const [[booking]]: any = await pool.execute(
      `SELECT b.*, c.userId as customerUserId, u.mobile as customerMobile, u.email as customerEmail, c.fullName as customerName
       FROM bookings b LEFT JOIN customer_profiles c ON b.customerId = c.id LEFT JOIN users u ON c.userId = u.id WHERE b.id = ?`, [bookingId]
    );
    if (!booking) { sendNotFound(res, 'Booking not found'); return; }

    const [[existing]]: any = await pool.execute('SELECT id FROM invoices WHERE bookingId = ?', [bookingId]);
    if (existing) { sendError(res, 'Invoice already exists for this booking.', 409); return; }

    const invoiceNumber = await generateInvoiceNumber();

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

    const [[taxConfig]]: any = await pool.execute('SELECT * FROM tax_configs WHERE isActive = true AND isDefault = true');
    const subtotal = Number(booking.subtotal);
    const cgst = subtotal * (Number(taxConfig?.cgstRate || 0) / 100);
    const sgst = subtotal * (Number(taxConfig?.sgstRate || 0) / 100);
    const igst = subtotal * (Number(taxConfig?.igstRate || 0) / 100);
    const taxTotal = cgst + sgst + igst;

    const invoiceId = uuidv4();
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute(
        `INSERT INTO invoices (id, invoiceNumber, bookingId, subtotal, cgst, sgst, igst, taxTotal, discount, totalAmount, paymentStatus, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [invoiceId, invoiceNumber, bookingId, subtotal, cgst, sgst, igst, taxTotal, booking.discount, booking.totalAmount, booking.paymentStatus]
      );

      for (const item of items) {
        await connection.execute(
          `INSERT INTO invoice_items (id, invoiceId, description, quantity, unitPrice, amount, sortOrder, createdAt, updatedAt) VALUES (UUID(), ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [invoiceId, item.description, item.quantity, item.unitPrice, item.amount, item.sortOrder]
        );
      }
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    if (booking.customerUserId) {
      await createNotification(booking.customerUserId, NotificationType.INVOICE_GENERATED, 'Invoice Generated', `Invoice ${invoiceNumber} has been generated for your booking ${booking.bookingNumber}.`, 'Invoice', invoiceId);
      if (booking.customerMobile) await sendInvoiceNotification(booking.customerMobile, booking.customerName || 'Customer', invoiceNumber, `₹${Number(booking.totalAmount).toLocaleString('en-IN')}`, invoiceId);
      if (booking.customerEmail) await sendInvoiceGeneratedEmail(booking.customerEmail, booking.customerName || 'Customer', invoiceNumber, booking.bookingNumber, invoiceId);
    }
    await createAuditLog({ userId: req.user!.userId, userRole: req.user!.role, action: 'CREATE', entity: 'Invoice', entityId: invoiceId, description: `Invoice ${invoiceNumber} generated for booking ${booking.bookingNumber}`, ipAddress: req.ip });
    
    const [[invoice]]: any = await pool.execute('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
    sendCreated(res, invoice, 'Invoice generated successfully');
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const getInvoiceById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const [[invoice]]: any = await pool.execute('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!invoice) { sendNotFound(res, 'Invoice not found'); return; }

    const [items]: any = await pool.execute('SELECT * FROM invoice_items WHERE invoiceId = ? ORDER BY sortOrder ASC', [id]);
    
    const [[bookingRaw]]: any = await pool.execute(
      `SELECT b.*, c.userId as customerUserId, c.fullName as customerName, u.mobile as customerMobile, u.email as customerEmail,
              d.fullName as driverName, d.licenceNumber as driverLicence,
              v.registrationNumber, v.make, v.model, vt.name as vehicleTypeName
       FROM bookings b
       LEFT JOIN customer_profiles c ON b.customerId = c.id
       LEFT JOIN users u ON c.userId = u.id
       LEFT JOIN driver_profiles d ON b.driverId = d.id
       LEFT JOIN vehicles v ON b.vehicleId = v.id
       LEFT JOIN vehicle_types vt ON b.vehicleTypeId = vt.id
       WHERE b.id = ?`, [invoice.bookingId]
    );

    if (req.user?.role === Role.CUSTOMER && bookingRaw.customerUserId !== req.user.userId) {
      res.status(403).json({ success: false, message: 'Forbidden' }); return;
    }

    invoice.items = items;
    invoice.booking = bookingRaw ? {
      ...bookingRaw,
      customer: bookingRaw.customerName ? { fullName: bookingRaw.customerName, user: { mobile: bookingRaw.customerMobile, email: bookingRaw.customerEmail } } : null,
      driver: bookingRaw.driverName ? { fullName: bookingRaw.driverName, licenceNumber: bookingRaw.driverLicence } : null,
      vehicle: bookingRaw.registrationNumber ? { registrationNumber: bookingRaw.registrationNumber, make: bookingRaw.make, model: bookingRaw.model, vehicleType: bookingRaw.vehicleTypeName ? { name: bookingRaw.vehicleTypeName } : null } : null
    } : null;

    sendSuccess(res, invoice);
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};
