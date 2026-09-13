import { Request, Response, NextFunction } from 'express';
import { usageStore } from '../db/usageStore';

/**
 * GET /api/usage
 * Returns current daily and monthly usage summary, limits, and recent usage history
 * for the authenticated user.
 */
export async function getUsageHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Authentication required to view usage information.',
      });
      return;
    }

    const summary = await usageStore.getUsageSummary(req.user.id, req.token);

    res.status(200).json(summary);
  } catch (error) {
    next(error);
  }
}
