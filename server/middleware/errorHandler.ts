import { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
  details?: any;
}

/**
 * Centralized Express Error Handling Middleware.
 * Catches unhandled errors and body-parser syntax failures safely.
 */
export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const statusCode = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  // Handle JSON parsing errors (e.g. malformed JSON request body)
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      message: 'Invalid JSON request payload',
    });
    return;
  }

  // Handle payload size limit errors
  if (err.type === 'entity.too.large') {
    res.status(413).json({
      success: false,
      message: 'Request payload exceeds allowable limit (100kb maximum)',
    });
    return;
  }

  const response = {
    success: false,
    message: err.message || 'Internal server error',
    ...(isProd ? {} : { stack: err.stack, details: err.details }),
  };

  res.status(statusCode).json(response);
};
