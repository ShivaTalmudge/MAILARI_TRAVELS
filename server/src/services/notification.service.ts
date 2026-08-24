import { pool } from '../config/db';
import { NotificationType } from '../types';
import { config } from '../config/env';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from './email.service';

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

interface DeliveryLog {
  channel: 'WHATSAPP' | 'EMAIL';
  recipient: string;
  templateName: string;
  status: 'SENT' | 'FAILED' | 'UNAVAILABLE';
  providerId?: string;
  errorMessage?: string;
  entityType?: string;
  entityId?: string;
}

// Never lets a logging failure take down the caller — delivery tracking is
// observability, not a business-critical write.
const logDelivery = async (d: DeliveryLog): Promise<void> => {
  try {
    await pool.execute(
      `INSERT INTO notification_deliveries (id, channel, recipient, templateName, status, providerId, errorMessage, attemptCount, entityType, entityId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, NOW())`,
      [uuidv4(), d.channel, d.recipient, d.templateName, d.status, d.providerId || null, d.errorMessage || null, d.entityType || null, d.entityId || null]
    );
  } catch (err) {
    console.error('Failed to write notification delivery log:', err);
  }
};

interface WhatsAppMessage {
  to: string;
  templateName: string;
  variables: string[];
  entityType?: string;
  entityId?: string;
}

const sendWhatsApp = async (msg: WhatsAppMessage): Promise<void> => {
  if (!config.whatsappApiUrl || !config.whatsappApiToken) {
    console.log(`[WhatsApp UNAVAILABLE] To: ${msg.to} | Template: ${msg.templateName} | Vars: ${msg.variables.join(', ')}`);
    await logDelivery({ channel: 'WHATSAPP', recipient: msg.to, templateName: msg.templateName, status: 'UNAVAILABLE', errorMessage: 'WhatsApp provider is not configured', entityType: msg.entityType, entityId: msg.entityId });
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
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WhatsApp] Failed to send message:', errorText);
      await logDelivery({ channel: 'WHATSAPP', recipient: msg.to, templateName: msg.templateName, status: 'FAILED', errorMessage: errorText.slice(0, 500), entityType: msg.entityType, entityId: msg.entityId });
      return;
    }
    const data: any = await response.json().catch(() => ({}));
    await logDelivery({ channel: 'WHATSAPP', recipient: msg.to, templateName: msg.templateName, status: 'SENT', providerId: data?.messages?.[0]?.id, entityType: msg.entityType, entityId: msg.entityId });
  } catch (err: any) {
    console.error('[WhatsApp] API error:', err);
    await logDelivery({ channel: 'WHATSAPP', recipient: msg.to, templateName: msg.templateName, status: 'FAILED', errorMessage: err?.message || String(err), entityType: msg.entityType, entityId: msg.entityId });
  }
};

const sendTrackedEmail = async (to: string, subject: string, html: string, templateName: string, entityType?: string, entityId?: string): Promise<void> => {
  const result = await sendEmail(to, subject, html);
  await logDelivery({ channel: 'EMAIL', recipient: to, templateName, status: result.status, providerId: result.providerId, errorMessage: result.errorMessage, entityType, entityId });
};

export const sendBookingConfirmation = async (mobile: string, bookingNumber: string, customerName: string, entityId?: string): Promise<void> => {
  await sendWhatsApp({ to: mobile, templateName: 'booking_confirmation', variables: [customerName, bookingNumber], entityType: 'Booking', entityId });
};

export const sendDriverAssignment = async (mobile: string, customerName: string, driverName: string, vehicleReg: string, entityId?: string): Promise<void> => {
  await sendWhatsApp({ to: mobile, templateName: 'driver_assignment', variables: [customerName, driverName, vehicleReg], entityType: 'Booking', entityId });
};

export const sendTripReminder = async (mobile: string, customerName: string, pickupTime: string, pickupLocation: string, entityId?: string): Promise<void> => {
  await sendWhatsApp({ to: mobile, templateName: 'trip_reminder', variables: [customerName, pickupTime, pickupLocation], entityType: 'Booking', entityId });
};

export const sendInvoiceNotification = async (mobile: string, customerName: string, invoiceNumber: string, amount: string, entityId?: string): Promise<void> => {
  await sendWhatsApp({ to: mobile, templateName: 'invoice_generated', variables: [customerName, invoiceNumber, amount], entityType: 'Invoice', entityId });
};

export const sendPaymentConfirmation = async (mobile: string, customerName: string, amount: string, bookingNumber: string, entityId?: string): Promise<void> => {
  await sendWhatsApp({ to: mobile, templateName: 'payment_confirmation', variables: [customerName, amount, bookingNumber], entityType: 'Payment', entityId });
};

export const sendBookingCancellation = async (mobile: string, customerName: string, bookingNumber: string, entityId?: string): Promise<void> => {
  await sendWhatsApp({ to: mobile, templateName: 'booking_cancellation', variables: [customerName, bookingNumber], entityType: 'Booking', entityId });
};

export const sendBookingReceivedEmail = async (email: string, name: string, bookingNumber: string, details: { pickupDate: string; pickupTime: string; pickupLocation: string }, entityId?: string): Promise<void> => {
  const { templates } = await import('./email.templates');
  await sendTrackedEmail(email, `Booking Request Received — ${bookingNumber}`, templates.bookingReceived(name, bookingNumber, details, config.clientUrl), 'bookingReceived', 'Booking', entityId);
};

export const sendBookingConfirmedEmail = async (email: string, name: string, bookingNumber: string, amount: string, entityId?: string): Promise<void> => {
  const { templates } = await import('./email.templates');
  await sendTrackedEmail(email, `Booking Confirmed — ${bookingNumber}`, templates.bookingConfirmed(name, bookingNumber, amount, config.clientUrl), 'bookingConfirmed', 'Booking', entityId);
};

export const sendPaymentReceivedEmail = async (email: string, name: string, bookingNumber: string, amount: string, receipt: string, entityId?: string): Promise<void> => {
  const { templates } = await import('./email.templates');
  await sendTrackedEmail(email, `Payment Received — ${bookingNumber}`, templates.paymentReceived(name, bookingNumber, amount, receipt), 'paymentReceived', 'Payment', entityId);
};

export const sendInvoiceGeneratedEmail = async (email: string, name: string, invoiceNumber: string, bookingNumber: string, entityId?: string): Promise<void> => {
  const { templates } = await import('./email.templates');
  await sendTrackedEmail(email, `Your Invoice ${invoiceNumber} is Ready`, templates.invoiceGenerated(name, invoiceNumber, bookingNumber, config.clientUrl), 'invoiceGenerated', 'Invoice', entityId);
};
