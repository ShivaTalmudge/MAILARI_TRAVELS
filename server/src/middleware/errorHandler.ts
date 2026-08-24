import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  // Operational errors: safe to expose message
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Prisma unique constraint
  if ((err as { code?: string }).code === 'P2002') {
    const fields = ((err as { meta?: { target?: string[] } }).meta?.target || []).join(', ');
    res.status(409).json({
      success: false,
      message: `A record with this ${fields} already exists.`,
    });
    return;
  }

  // Prisma record not found
  if ((err as { code?: string }).code === 'P2025') {
    res.status(404).json({ success: false, message: 'Record not found.' });
    return;
  }

  // Log unexpected errors
  console.error('Unhandled error:', err);

  // Hide details in production
  const message = config.nodeEnv === 'production'
    ? 'An unexpected error occurred. Please try again later.'
    : err.message;

  res.status(500).json({ success: false, message });
};
