import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractToken, JwtPayload } from '../utils/jwt';
import { pool } from '../config/db';
import { sendUnauthorized } from '../utils/response';
import { Role, UserStatus } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { status: UserStatus };
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = extractToken(req.headers.authorization) || req.cookies?.token;

  if (!token) {
    sendUnauthorized(res, 'Authentication required. Please log in.');
    return;
  }

  try {
    const payload = verifyToken(token);

    const [rows]: any = await pool.execute('SELECT id, status, role FROM users WHERE id = ?', [payload.userId]);
    
    if (rows.length === 0) {
      sendUnauthorized(res, 'User account not found.');
      return;
    }
    
    const user = rows[0];

    if (user.status === UserStatus.INACTIVE || user.status === UserStatus.SUSPENDED) {
      sendUnauthorized(res, 'Your account has been disabled. Please contact support.');
      return;
    }

    req.user = { ...payload, role: user.role as Role, status: user.status as UserStatus };
    next();
  } catch {
    sendUnauthorized(res, 'Invalid or expired session. Please log in again.');
  }
};

export const authorize = (...roles: (Role | string)[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to perform this action.',
      });
      return;
    }

    next();
  };
};
