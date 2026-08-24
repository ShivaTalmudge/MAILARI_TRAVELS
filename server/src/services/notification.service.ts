import { pool } from '../config/db';
import { NotificationType } from '../types';
import { config } from '../config/env';
import { v4 as uuidv4 } from 'uuid';

export const createNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  entityType?: string,
  entityId?: string
): Promise<void> => {
  const id = uuidv4();
  await pool.execute(
    'INSERT INTO notifications (id, userId, type, title, message, entityType, entityId, isRead, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, false, NOW(), NOW())',
    [id, userId, type, title, message, entityType || null, entityId || null]
  );
};

export const createBulkNotifications = async (
  userIds: string[],
  type: NotificationType,
  title: string,
  message: string,
  entityType?: string,
  entityId?: string
): Promise<void> => {
  if (userIds.length === 0) return;
  const values = userIds.map(userId => [uuidv4(), userId, type, title, message, entityType || null, entityId || null]);
  const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?, ?, false, NOW(), NOW())').join(', ');
  await pool.execute(
    `INSERT INTO notifications (id, userId, type, title, message, entityType, entityId, isRead, createdAt, updatedAt) VALUES ${placeholders}`,
    values.flat()
  );
};

interface WhatsAppMessage {
  to: string;
  templateName: string;
  variables: string[];
}

const sendWhatsApp = async (msg: WhatsAppMessage): Promise<void> => {
  if (!config.whatsappApiUrl || !config.whatsappApiToken) {
    console.log(`[WhatsApp MOCK] To: ${msg.to} | Template: ${msg.templateName} | Vars: ${msg.variables.join(', ')}`);
    return;
  }
  try {
    const response = await fetch(config.whatsappApiUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${config.whatsappApiToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: config.whatsappFromNumber, to: `91${msg.to}`, type: 'template',
        template: { name: msg.templateName, language: { code: 'en' }, components: [{ type: 'body', parameters: msg.variables.map(v => ({ type: 'text', text: v })) }] },
      }),
    });
    if (!response.ok) console.error('[WhatsApp] Failed to send message:', await response.text());
  } catch (err) {
    console.error('[WhatsApp] API error:', err);
  }
};

export const sendBookingConfirmation = async (mobile: string, bookingNumber: string, customerName: string): Promise<void> => {
  await sendWhatsApp({ to: mobile, templateName: 'booking_confirmation', variables: [customerName, bookingNumber] });
};

export const sendDriverAssignment = async (mobile: string, customerName: string, driverName: string, vehicleReg: string): Promise<void> => {
  await sendWhatsApp({ to: mobile, templateName: 'driver_assignment', variables: [customerName, driverName, vehicleReg] });
};

export const sendTripReminder = async (mobile: string, customerName: string, pickupTime: string, pickupLocation: string): Promise<void> => {
  await sendWhatsApp({ to: mobile, templateName: 'trip_reminder', variables: [customerName, pickupTime, pickupLocation] });
};

export const sendInvoiceNotification = async (mobile: string, customerName: string, invoiceNumber: string, amount: string): Promise<void> => {
  await sendWhatsApp({ to: mobile, templateName: 'invoice_generated', variables: [customerName, invoiceNumber, amount] });
};

export const sendPaymentConfirmation = async (mobile: string, customerName: string, amount: string, bookingNumber: string): Promise<void> => {
  await sendWhatsApp({ to: mobile, templateName: 'payment_confirmation', variables: [customerName, amount, bookingNumber] });
};

export const sendBookingCancellation = async (mobile: string, customerName: string, bookingNumber: string): Promise<void> => {
  await sendWhatsApp({ to: mobile, templateName: 'booking_cancellation', variables: [customerName, bookingNumber] });
};
