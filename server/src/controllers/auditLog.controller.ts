import { Request, Response } from 'express';
import { pool } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { getPaginationParams } from '../utils/helpers';

export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  const { skip, take, page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
  const { entity, userId, action } = req.query as Record<string, string | undefined>;

  try {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    if (entity) { whereClause += ' AND a.entity = ?'; params.push(entity); }
    if (userId) { whereClause += ' AND a.userId = ?'; params.push(userId); }
    if (action) { whereClause += ' AND a.action = ?'; params.push(action); }

    const [[{ total }]]: any = await pool.execute(`SELECT COUNT(*) as total FROM audit_logs a ${whereClause}`, params);
    
    params.push(take, skip);
    const [logsRaw]: any = await pool.execute(
      `SELECT a.*, u.mobile, u.email, u.role as urole FROM audit_logs a LEFT JOIN users u ON a.userId = u.id ${whereClause} ORDER BY a.createdAt DESC LIMIT ? OFFSET ?`, params
    );

    const logs = logsRaw.map((l: any) => ({
      ...l, user: l.userId ? { mobile: l.mobile, email: l.email, role: l.urole } : null
    }));

    sendSuccess(res, logs, 'Audit logs fetched', 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
};
