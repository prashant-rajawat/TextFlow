import { Request, Response } from 'express';

/**
 * 404 Handler for API endpoints.
 * Catches unmatched /api/* routes and returns a predictable JSON error.
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
  });
};
