import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/response';
import { getPaginationParams } from '../utils/helpers';

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  const { skip, take, page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
  const { entity, userId, action } = req.query as Record<string, string | undefined>;

  const where = {
    ...(entity ? { entity } : {}),
    ...(userId ? { userId } : {}),
    ...(action ? { action } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where, skip, take,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { mobile: true, email: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  sendSuccess(res, logs, 'Audit logs fetched', 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
};
