import { Router } from 'express';
import { getUsageHandler } from '../controllers/usageController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/usage (Protected - Requires authenticated user session)
router.get('/usage', requireAuth, getUsageHandler);

export default router;
