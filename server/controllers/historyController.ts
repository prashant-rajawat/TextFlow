import { Request, Response, NextFunction } from 'express';
import { historyStore } from '../db/historyStore';

/**
 * GET /api/history
 * Returns paginated speech history for the authenticated user.
 */
export async function getHistoryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 20);
    const search = (req.query.search as string) || '';

    const result = await historyStore.getHistoryByUserId(req.user.id, {
      page,
      limit,
      search,
    });

    res.status(200).json({
      success: true,
      history: result.history,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/history/:id
 * Returns single speech history item belonging to authenticated user.
 */
export async function getHistoryItemHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    const item = await historyStore.getHistoryItemById(id, req.user.id);

    if (!item) {
      res.status(404).json({ success: false, message: 'History item not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      historyItem: item,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/history/:id
 * Deletes a single speech history item belonging to authenticated user.
 */
export async function deleteHistoryItemHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    const success = await historyStore.deleteHistoryItem(id, req.user.id);

    if (!success) {
      res.status(404).json({ success: false, message: 'History item not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'History item deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/history/:id/favorite
 * Toggles or sets favorite status for a speech history item.
 */
export async function toggleFavoriteHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const { id } = req.params;
    const { isFavorite } = req.body;

    // Strict boolean type validation (reject string "true", number 1, etc.)
    if (typeof isFavorite !== 'boolean') {
      res.status(400).json({ success: false, message: 'isFavorite must be a boolean.' });
      return;
    }

    const updated = await historyStore.toggleFavorite(id, req.user.id, isFavorite);

    if (!updated) {
      res.status(404).json({ success: false, message: 'History item not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Favorite updated successfully.',
      isFavorite: updated.isFavorite,
      historyItem: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/favorites
 * Returns paginated list of favorited speech items for the authenticated user.
 */
export async function getFavoritesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = Math.min(50, parseInt(req.query.limit as string, 10) || 20);
    const language = (req.query.language as string) || '';
    const voice = (req.query.voice as string) || '';

    const result = await historyStore.getFavoritesByUserId(req.user.id, {
      page,
      limit,
      language,
      voice,
    });

    res.status(200).json({
      success: true,
      favorites: result.favorites,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/history
 * Clears all speech history belonging to authenticated user.
 */
export async function clearAllHistoryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    const deletedCount = await historyStore.clearHistoryByUserId(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Speech history cleared successfully.',
      count: deletedCount,
    });
  } catch (error) {
    next(error);
  }
}
