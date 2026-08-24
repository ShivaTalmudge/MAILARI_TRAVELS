import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config/env';

let transporter: Transporter | null = null;
let initialized = false;

function getTransporter(): Transporter | null {
  if (initialized) return transporter;
  initialized = true;

  if (!config.smtpHost || !config.smtpUser || !config.smtpPass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: { user: config.smtpUser, pass: config.smtpPass },
  });
  return transporter;
}

export interface EmailSendResult {
  status: 'SENT' | 'FAILED' | 'UNAVAILABLE';
  providerId?: string;
  errorMessage?: string;
}

/**
 * Sends an email if SMTP is configured. If it isn't, this honestly reports
 * `UNAVAILABLE` rather than pretending the email went out — callers should
 * log that to notification_deliveries, not treat it as success.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<EmailSendResult> {
  const t = getTransporter();
  if (!t) {
    return { status: 'UNAVAILABLE', errorMessage: 'SMTP is not configured' };
  }

  try {
    const info = await t.sendMail({ from: config.smtpFrom, to, subject, html });
    return { status: 'SENT', providerId: info.messageId };
  } catch (err: any) {
    console.error('[Email] Send failed:', err);
    return { status: 'FAILED', errorMessage: err?.message || String(err) };
  }
}
