import { Request, Response, NextFunction } from 'express';
import { authService, SafeUser } from '../services/authService';
import { userStore } from '../db/userStore';
import { serverSupabaseAuth } from '../services/supabase/auth';
import { getUserSupabaseClient } from '../services/supabase/client';

// Extend Express Request interface to include authenticated user and verified token
declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
      token?: string;
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

    // 3. Supabase Auth token verification (preferred for Supabase-connected app)
    if (serverSupabaseAuth.isConfigured()) {
      const supabaseUser = await serverSupabaseAuth.verifyToken(token);
      if (supabaseUser) {
        let name =
          supabaseUser.user_metadata?.full_name ||
          supabaseUser.user_metadata?.name ||
          supabaseUser.email.split('@')[0];

        // Retrieve latest name from profiles table if available
        try {
          const userClient = getUserSupabaseClient(token);
          if (userClient) {
            const { data: profile } = await userClient
              .from('profiles')
              .select('full_name')
              .eq('id', supabaseUser.id)
              .maybeSingle();
            if (profile?.full_name) {
              name = profile.full_name;
            }
          }
        } catch {
          // Fallback to metadata name
        }

        req.user = {
          id: supabaseUser.id,
          name,
          email: supabaseUser.email,
          createdAt: supabaseUser.created_at || new Date().toISOString(),
        };
        req.token = token;
        next();
        return;
      }
    }

    // 4. Fallback to local JWT token verification
    const decoded = authService.verifyToken(token);
    if (decoded) {
      const user = await userStore.findById(decoded.id);
      if (user) {
        req.user = authService.getSafeUser(user);
        req.token = token;
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

