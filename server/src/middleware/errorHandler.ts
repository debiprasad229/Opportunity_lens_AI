import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { SSRFError } from '../utils/ssrfGuard.js';
import { logger } from '../utils/logger.js';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid request payload',
      details: err.errors,
    });
  }

  if (err instanceof SSRFError) {
    return res.status(403).json({
      error: 'Forbidden Target',
      message: err.message,
    });
  }

  return res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred while executing research pipeline.',
  });
}
