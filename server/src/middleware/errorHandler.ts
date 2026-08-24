import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';
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

  // File upload validation (wrong type, too large) — a client error, not a server fault
  if (err instanceof MulterError || /Only PNG, JPEG, or WEBP/.test(err.message)) {
    res.status(400).json({ success: false, message: err.message });
    return;
  }

  // mysql2 unique constraint violation
  if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
    res.status(409).json({
      success: false,
      message: 'A record with this value already exists.',
    });
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
