import { Request, Response, NextFunction } from 'express';
import { authService, SafeUser } from '../services/authService';
import { userStore } from '../db/userStore';
import { serverSupabaseAuth } from '../services/supabase/auth';

// Extend Express Request interface to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined;

    // 1. Check Authorization Bearer header first
    if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    // 2. Check cookies for token as secondary fallback
    if (!token && req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
      return;
    }

    // 3. Verify local JWT token first
    const decoded = authService.verifyToken(token);
    if (decoded) {
      const user = await userStore.findById(decoded.id);
      if (user) {
        req.user = authService.getSafeUser(user);
        next();
        return;
      }
    }

    // 4. Fallback to Supabase Auth token verification if configured
    if (serverSupabaseAuth.isConfigured()) {
      const supabaseUser = await serverSupabaseAuth.verifyToken(token);
      if (supabaseUser) {
        req.user = {
          id: supabaseUser.id,
          name: supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
          email: supabaseUser.email,
          createdAt: new Date().toISOString(),
        };
        next();
        return;
      }
    }

    res.status(401).json({
      success: false,
      message: 'Your authentication session has expired or is invalid. Please log in again.',
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed. Please log in again.',
    });
  }
}
