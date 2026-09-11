import { Router } from 'express';
import {
  registerHandler,
  loginHandler,
  getMeHandler,
  logoutHandler,
} from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { authRateLimiter } from '../middleware/authRateLimiter';

const router = Router();

// POST /api/auth/register
router.post('/auth/register', authRateLimiter, registerHandler);

// POST /api/auth/login
router.post('/auth/login', authRateLimiter, loginHandler);

// GET /api/auth/me
router.get('/auth/me', requireAuth, getMeHandler);

// POST /api/auth/logout
router.post('/auth/logout', logoutHandler);

export default router;
