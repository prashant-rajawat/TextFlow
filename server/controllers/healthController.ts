import { Request, Response, NextFunction } from 'express';

/**
 * Controller to handle API health check request.
 * GET /api/health
 */
export const getHealthStatus = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const responsePayload = {
      success: true,
      message: 'Text-to-Speech API server is running',
      timestamp: new Date().toISOString(),
    };

    res.status(200).json(responsePayload);
  } catch (error) {
    next(error);
  }
};
