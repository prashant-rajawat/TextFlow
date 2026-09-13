import { Router } from 'express';
import { getVoicesHandler, generateSpeechHandler } from '../controllers/ttsController';
import { validateTTSRequest } from '../middleware/validateTTSRequest';
import { ttsRateLimiter } from '../middleware/rateLimiter';
import { userTTSThrottler } from '../middleware/userThrottler';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/voices (Public/authenticated)
router.get('/voices', getVoicesHandler);

// POST /api/tts (Protected - Requires valid auth session)
router.post('/tts', requireAuth, userTTSThrottler, ttsRateLimiter, validateTTSRequest, generateSpeechHandler);

export default router;
