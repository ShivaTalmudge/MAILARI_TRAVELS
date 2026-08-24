import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/db';
import { sendSuccess, sendCreated, sendNotFound, sendError } from '../utils/response';
import { createAuditLog } from '../utils/helpers';
import { saveImageBuffer } from '../middleware/upload';

// Any authenticated role may read the active config — a driver needs it to
// display the QR, a customer may want to see the UPI ID/instructions too.
// Returns null (not a 404) when nothing is configured, so the frontend can
// show "Payment QR has not been configured. Please contact Admin." instead
// of a broken/placeholder image.
export const getActiveConfig = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [[config]]: any = await pool.execute(
      'SELECT id, displayName, upiId, qrImageUrl, instructions, updatedAt FROM payment_qr_configs WHERE isActive = true ORDER BY updatedAt DESC LIMIT 1'
    );
    sendSuccess(res, config || null);
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

// Admin-only: full history, most recent first — old (inactive) rows are
// never deleted, which is what gives this its audit trail.
export const listConfigs = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows]: any = await pool.execute(
      `SELECT c.*, cu.email as createdByEmail, uu.email as updatedByEmail
       FROM payment_qr_configs c
       LEFT JOIN users cu ON c.createdBy = cu.id
       LEFT JOIN users uu ON c.updatedBy = uu.id
       ORDER BY c.createdAt DESC`
    );
    sendSuccess(res, rows);
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};

export const createConfig = async (req: Request, res: Response): Promise<void> => {
  const { displayName, upiId, instructions } = req.body;
  const file = (req as any).file as Express.Multer.File | undefined;

  try {
    if (!displayName || !upiId) { sendError(res, 'displayName and upiId are required.', 400); return; }
    if (!file) { sendError(res, 'A QR image file is required.', 400); return; }

    const qrImageUrl = await saveImageBuffer(file.buffer, 'qr');

    const id = uuidv4();
    let previousActive: { id: string; upiId: string; qrImageUrl: string } | null = null;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[locked]]: any = await connection.execute('SELECT id, upiId, qrImageUrl FROM payment_qr_configs WHERE isActive = true LIMIT 1 FOR UPDATE');
      previousActive = locked || null;
      if (previousActive) {
        await connection.execute('UPDATE payment_qr_configs SET isActive = false, updatedBy = ?, updatedAt = NOW() WHERE id = ?', [req.user!.userId, previousActive.id]);
      }
      await connection.execute(
        `INSERT INTO payment_qr_configs (id, displayName, upiId, qrImageUrl, instructions, isActive, createdBy, updatedBy, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, true, ?, ?, NOW(), NOW())`,
        [id, displayName, upiId, qrImageUrl, instructions || null, req.user!.userId, req.user!.userId]
      );
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    await createAuditLog({
      userId: req.user!.userId, userRole: req.user!.role,
      action: 'PAYMENT_QR_UPDATED', entity: 'PaymentQrConfig', entityId: id,
      description: `Payment QR replaced (UPI: ${upiId})`,
      metadata: {
        oldUpiId: previousActive?.upiId || null, newUpiId: upiId,
        oldQrImageUrl: previousActive?.qrImageUrl || null, newQrImageUrl: qrImageUrl,
      },
      ipAddress: req.ip,
    });

    const [[created]]: any = await pool.execute('SELECT * FROM payment_qr_configs WHERE id = ?', [id]);
    sendCreated(res, created, 'Payment QR updated');
  } catch (err: any) {
    console.error(err);
    sendError(res, err.message || 'Internal server error');
  }
};

export const setActive = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const isActive = req.path.endsWith('/activate');

  try {
    const [[target]]: any = await pool.execute('SELECT * FROM payment_qr_configs WHERE id = ?', [id]);
    if (!target) { sendNotFound(res, 'Payment QR config not found'); return; }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      if (isActive) {
        await connection.execute('UPDATE payment_qr_configs SET isActive = false, updatedBy = ?, updatedAt = NOW() WHERE isActive = true AND id != ?', [req.user!.userId, id]);
      }
      await connection.execute('UPDATE payment_qr_configs SET isActive = ?, updatedBy = ?, updatedAt = NOW() WHERE id = ?', [isActive, req.user!.userId, id]);
      await connection.commit();
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }

    await createAuditLog({
      userId: req.user!.userId, userRole: req.user!.role,
      action: isActive ? 'PAYMENT_QR_ACTIVATED' : 'PAYMENT_QR_DEACTIVATED', entity: 'PaymentQrConfig', entityId: id,
      description: `Payment QR (${target.displayName}) ${isActive ? 'activated' : 'deactivated'}`,
      ipAddress: req.ip,
    });

    sendSuccess(res, null, `Payment QR ${isActive ? 'activated' : 'deactivated'}`);
  } catch (err) {
    console.error(err);
    sendError(res, 'Internal server error');
  }
};
