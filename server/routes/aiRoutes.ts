import { Router } from 'express';
import { enhanceTextHandler } from '../controllers/aiController';
import { requireAuth } from '../middleware/auth';
import { userAIThrottler } from '../middleware/userAIThrottler';

const router = Router();

// POST /api/ai/enhance (Protected - Requires verified Supabase/JWT authentication)
router.post('/enhance', requireAuth, userAIThrottler, enhanceTextHandler);

export default router;
