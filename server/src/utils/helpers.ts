import { prisma } from '../config/prisma';
import { Role } from '@prisma/client';

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
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        userRole: data.userRole,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        description: data.description,
        metadata: data.metadata as object,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  } catch (error) {
    // Audit logging should never crash the application
    console.error('Failed to write audit log:', error);
  }
};

const randomSuffix = (): string => Math.random().toString(36).substr(2, 4).toUpperCase();

export const generateBookingNumber = async (): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  // Use DB count + random suffix to avoid collisions under concurrent load
  const count = await prisma.booking.count();
  const seq = String(count + 1).padStart(4, '0');
  return `MT-${year}${month}-${seq}-${randomSuffix()}`;
};

export const generateInvoiceNumber = async (): Promise<string> => {
  const settings = await prisma.systemSetting.findUnique({ where: { key: 'invoice_prefix' } });
  const prefix = settings?.value || 'INV';
  const count = await prisma.invoice.count();
  const year = new Date().getFullYear().toString().slice(-2);
  return `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
};

export const generatePaymentNumber = async (): Promise<string> => {
  const count = await prisma.payment.count();
  return `PAY-${Date.now()}-${String(count + 1).padStart(4, '0')}`;
};

export const generateTicketNumber = async (): Promise<string> => {
  const count = await prisma.supportTicket.count();
  return `TKT-${String(count + 1).padStart(5, '0')}`;
};

export const getPaginationParams = (query: { page?: string; limit?: string }): { skip: number; take: number; page: number; limit: number } => {
  const page = Math.max(1, parseInt(query.page || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)));
  return { skip: (page - 1) * limit, take: limit, page, limit };
};
