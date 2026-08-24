import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { sendSuccess } from '../utils/response';
import { createAuditLog } from '../utils/helpers';

export const getSettings = async (_req: Request, res: Response): Promise<void> => {
  const settings = await prisma.systemSetting.findMany({ orderBy: [{ category: 'asc' }, { label: 'asc' }] });
  // Group by category
  const grouped = settings.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = {};
    acc[s.category][s.key] = { value: s.value, label: s.label, description: s.description };
    return acc;
  }, {} as Record<string, Record<string, { value: string; label: string; description?: string | null }>>);
  sendSuccess(res, grouped);
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  const updates = req.body as Record<string, string>;

  const ops = Object.entries(updates).map(([key, value]) =>
    prisma.systemSetting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value), label: key, category: 'general' },
    })
  );

  await Promise.all(ops);

  await createAuditLog({
    userId: req.user!.userId, userRole: req.user!.role,
    action: 'UPDATE', entity: 'SystemSettings', entityId: 'settings',
    description: `Settings updated: ${Object.keys(updates).join(', ')}`,
    ipAddress: req.ip,
  });

  sendSuccess(res, null, 'Settings updated successfully');
};

export const getPublicSettings = async (_req: Request, res: Response): Promise<void> => {
  const publicKeys = ['company_name', 'company_phone', 'company_email', 'company_address', 'company_city', 'company_state'];
  const settings = await prisma.systemSetting.findMany({ where: { key: { in: publicKeys } } });
  const result = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
  sendSuccess(res, result);
};
