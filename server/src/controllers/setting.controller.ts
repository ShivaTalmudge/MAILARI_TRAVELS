import { Request, Response } from 'express';
import { pool } from '../config/db';
import { sendSuccess, sendError } from '../utils/response';
import { createAuditLog } from '../utils/helpers';

export const getSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [settingsRaw]: any = await pool.execute('SELECT * FROM system_settings ORDER BY category ASC, label ASC');
    const grouped = settingsRaw.reduce((acc: any, s: any) => {
      if (!acc[s.category]) acc[s.category] = {};
      acc[s.category][s.key] = { value: s.value, label: s.label, description: s.description };
      return acc;
    }, {});
    sendSuccess(res, grouped);
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
};

export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  const updates = req.body as Record<string, string>;
  try {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const [key, value] of Object.entries(updates)) {
        const [[existing]]: any = await connection.execute('SELECT `key` FROM system_settings WHERE `key` = ?', [key]);
        if (existing) {
          await connection.execute('UPDATE system_settings SET value = ?, updatedAt = NOW() WHERE `key` = ?', [String(value), key]);
        } else {
          await connection.execute(
            'INSERT INTO system_settings (`key`, value, label, category, createdAt, updatedAt) VALUES (?, ?, ?, ?, NOW(), NOW())',
            [key, String(value), key, 'general']
          );
        }
      }
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    await createAuditLog({
      userId: req.user!.userId, userRole: req.user!.role,
      action: 'UPDATE', entity: 'SystemSettings', entityId: 'settings',
      description: `Settings updated: ${Object.keys(updates).join(', ')}`,
      ipAddress: req.ip,
    });
    sendSuccess(res, null, 'Settings updated successfully');
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
};

export const getPublicSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [settingsRaw]: any = await pool.execute(`SELECT \`key\`, value FROM system_settings WHERE \`key\` IN ('company_name', 'company_phone', 'company_email', 'company_address', 'company_city', 'company_state')`);
    const result = settingsRaw.reduce((acc: any, s: any) => ({ ...acc, [s.key]: s.value }), {});
    sendSuccess(res, result);
  } catch (err) {
    console.error(err); sendError(res, 'Internal server error');
  }
};
