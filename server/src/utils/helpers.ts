import { pool } from '../config/db';
import { Role } from '../types';

interface AuditData {
  userId?: string;
  userRole?: Role;
  action: string;
  entity: string;
  entityId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export const createAuditLog = async (data: AuditData): Promise<void> => {
  try {
    const { v4: uuidv4 } = await import('uuid');
    const id = uuidv4();
    await pool.execute(
      `INSERT INTO audit_logs (id, userId, userRole, action, entity, entityId, description, metadata, ipAddress, userAgent, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id, 
        data.userId || null, 
        data.userRole || null, 
        data.action, 
        data.entity, 
        data.entityId || null, 
        data.description, 
        data.metadata ? JSON.stringify(data.metadata) : null, 
        data.ipAddress || null, 
        data.userAgent || null
      ]
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};

const randomSuffix = (): string => Math.random().toString(36).substring(2, 6).toUpperCase();

export const generateBookingNumber = async (): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const [rows]: any = await pool.execute('SELECT COUNT(*) as count FROM bookings');
  const count = rows[0].count;
  const seq = String(count + 1).padStart(4, '0');
  
  return `MT-${year}${month}-${seq}-${randomSuffix()}`;
};

export const generateInvoiceNumber = async (): Promise<string> => {
  const [settings]: any = await pool.execute('SELECT value FROM system_settings WHERE `key` = ?', ['invoice_prefix']);
  const prefix = settings.length > 0 ? settings[0].value : 'INV';
  
  const [rows]: any = await pool.execute('SELECT COUNT(*) as count FROM invoices');
  const count = rows[0].count;
  const year = new Date().getFullYear().toString().slice(-2);
  
  return `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
};

export const generatePaymentNumber = async (): Promise<string> => {
  const [rows]: any = await pool.execute('SELECT COUNT(*) as count FROM payments');
  const count = rows[0].count;
  return `PAY-${Date.now()}-${String(count + 1).padStart(4, '0')}`;
};

export const generateTicketNumber = async (): Promise<string> => {
  const [rows]: any = await pool.execute('SELECT COUNT(*) as count FROM support_tickets');
  const count = rows[0].count;
  return `TKT-${String(count + 1).padStart(5, '0')}`;
};

export const getPaginationParams = (query: { page?: string; limit?: string }): { skip: number; take: number; page: number; limit: number } => {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
  return { skip: (page - 1) * limit, take: limit, page, limit };
};
