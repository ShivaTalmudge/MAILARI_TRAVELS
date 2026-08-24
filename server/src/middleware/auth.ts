import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractToken, JwtPayload } from '../utils/jwt';
import { prisma } from '../config/prisma';
import { sendUnauthorized } from '../utils/response';
import { Role, UserStatus } from '@prisma/client';

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

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, status: true, role: true },
    });

    if (!user) {
      sendUnauthorized(res, 'User account not found.');
      return;
    }

    if (user.status === UserStatus.INACTIVE || user.status === UserStatus.SUSPENDED) {
      sendUnauthorized(res, 'Your account has been disabled. Please contact support.');
      return;
    }

    // Always derive role from DB, never trust the token's role claim alone
    req.user = { ...payload, role: user.role, status: user.status };
    next();
  } catch {
    sendUnauthorized(res, 'Invalid or expired session. Please log in again.');
  }
};

export const authorize = (...roles: Role[]) => {
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
