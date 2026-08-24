import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
  meta?: ApiResponse['meta']
): Response => {
  const response: ApiResponse<T> = { success: true, message, data };
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

export const sendCreated = <T>(res: Response, data: T, message = 'Created successfully'): Response => {
  return sendSuccess(res, data, message, 201);
};

export const sendError = (res: Response, message: string, statusCode = 400, errors?: unknown): Response => {
  return res.status(statusCode).json({ success: false, message, errors });
};

export const sendUnauthorized = (res: Response, message = 'Unauthorized'): Response => {
  return res.status(401).json({ success: false, message });
};

export const sendForbidden = (res: Response, message = 'Forbidden. You do not have permission to perform this action.'): Response => {
  return res.status(403).json({ success: false, message });
};

export const sendNotFound = (res: Response, message = 'Resource not found'): Response => {
  return res.status(404).json({ success: false, message });
};
