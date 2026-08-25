import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db';
import { v4 as uuidv4 } from 'uuid';

export const requireIdempotency = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (!idempotencyKey) {
    next();
    return;
  }

  const userId = req.user?.userId || 'guest';
  const requestMethod = req.method;
  const requestPath = req.originalUrl;

  try {
    const [[existingKey]]: any = await pool.execute(
      'SELECT * FROM idempotency_keys WHERE idempotencyKey = ? AND userId = ?',
      [idempotencyKey, userId]
    );

    if (existingKey) {
      if (existingKey.responseStatus) {
        // Return cached response
        res.status(existingKey.responseStatus).json(existingKey.responseBody);
        return;
      } else {
        // Request is still processing
        res.status(409).json({ success: false, message: 'Duplicate request in progress. Please wait.' });
        return;
      }
    }

    // Create a new lock record
    const id = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.execute(
      `INSERT INTO idempotency_keys (id, idempotencyKey, userId, requestPath, requestMethod, lockedAt, expiresAt)
       VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
      [id, idempotencyKey, userId, requestPath, requestMethod, expiresAt]
    );

    // Override res.json to capture response
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      const status = res.statusCode;
      // We asynchronously update the record so it doesn't block response
      pool.execute(
        'UPDATE idempotency_keys SET responseStatus = ?, responseBody = ?, lockedAt = NULL WHERE id = ?',
        [status, JSON.stringify(body), id]
      ).catch(err => console.error('Failed to update idempotency key:', err));
      
      return originalJson(body);
    };

    next();
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(409).json({ success: false, message: 'Duplicate request in progress. Please wait.' });
      return;
    }
    console.error('Idempotency error:', error);
    next(error);
  }
};
