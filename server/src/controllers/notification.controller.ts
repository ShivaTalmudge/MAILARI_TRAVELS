import { Request, Response } from 'express';
import { pool } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { getPaginationParams } from '../utils/helpers';

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  const { skip, take, page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
  const userId = req.user!.userId;
  const { unreadOnly } = req.query as { unreadOnly?: string };

  try {
    let whereClause = 'WHERE userId = ?';
    const params: any[] = [userId];
    if (unreadOnly === 'true') {
      whereClause += ' AND isRead = false';
    }

    const [[{ total }]]: any = await pool.execute(`SELECT COUNT(*) as total FROM notifications ${whereClause}`, params);
    const [[{ unreadCount }]]: any = await pool.execute('SELECT COUNT(*) as unreadCount FROM notifications WHERE userId = ? AND isRead = false', [userId]);

    params.push(take, skip);
    const [notifications]: any = await pool.execute(`SELECT * FROM notifications ${whereClause} ORDER BY createdAt DESC LIMIT ? OFFSET ?`, params);

    sendSuccess(res, { notifications, unreadCount }, 'Notifications fetched', 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await pool.execute('UPDATE notifications SET isRead = true WHERE id = ? AND userId = ?', [id, req.user!.userId]);
    sendSuccess(res, null, 'Notification marked as read');
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
};

export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.execute('UPDATE notifications SET isRead = true WHERE userId = ? AND isRead = false', [req.user!.userId]);
    sendSuccess(res, null, 'All notifications marked as read');
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
};
