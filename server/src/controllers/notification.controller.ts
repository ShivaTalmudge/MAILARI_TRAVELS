import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/response';
import { getPaginationParams } from '../utils/helpers';

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
  const { skip, take, page, limit } = getPaginationParams(req.query as { page?: string; limit?: string });
  const userId = req.user!.userId;
  const { unreadOnly } = req.query as { unreadOnly?: string };

  const where = { userId, ...(unreadOnly === 'true' ? { isRead: false } : {}) };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  sendSuccess(res, { notifications, unreadCount }, 'Notifications fetched', 200, { total, page, limit, totalPages: Math.ceil(total / limit) });
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  await prisma.notification.updateMany({
    where: { id, userId: req.user!.userId },
    data: { isRead: true },
  });
  sendSuccess(res, null, 'Notification marked as read');
};

export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, isRead: false },
    data: { isRead: true },
  });
  sendSuccess(res, null, 'All notifications marked as read');
};
