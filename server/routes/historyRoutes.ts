import { Router } from 'express';
import {
  getHistoryHandler,
  getHistoryItemHandler,
  deleteHistoryItemHandler,
  clearAllHistoryHandler,
  toggleFavoriteHandler,
  getFavoritesHandler,
} from '../controllers/historyController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/history (Paginated history for authenticated user)
router.get('/history', requireAuth, getHistoryHandler);

// GET /api/favorites (Paginated favorites for authenticated user)
router.get('/favorites', requireAuth, getFavoritesHandler);

// GET /api/history/:id (Single history record belonging to authenticated user)
router.get('/history/:id', requireAuth, getHistoryItemHandler);

// PATCH /api/history/:id/favorite (Toggle favorite status for history item)
router.patch('/history/:id/favorite', requireAuth, toggleFavoriteHandler);

// DELETE /api/history/:id (Delete single history record belonging to authenticated user)
router.delete('/history/:id', requireAuth, deleteHistoryItemHandler);

// DELETE /api/history (Clear all history belonging to authenticated user)
router.delete('/history', requireAuth, clearAllHistoryHandler);

export default router;
