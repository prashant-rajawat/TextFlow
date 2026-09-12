import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import { userStore } from '../db/userStore';
import { getUserSupabaseClient } from '../services/supabase/client';

const COOKIE_NAME = 'auth_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function setAuthCookie(res: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.APP_URL?.startsWith('https');
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: Boolean(isProduction),
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

function clearAuthCookie(res: Response): void {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.APP_URL?.startsWith('https');
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: Boolean(isProduction),
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });
}

/**
 * POST /api/auth/register
 */
export async function registerHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, email, password, confirmPassword } = req.body || {};

    // 1. Validate fields
    const nameErr = authService.validateName(name);
    if (nameErr) {
      res.status(400).json({ success: false, message: nameErr });
      return;
    }

    const emailErr = authService.validateEmail(email);
    if (emailErr) {
      res.status(400).json({ success: false, message: emailErr });
      return;
    }

    const passwordErr = authService.validatePassword(password);
    if (passwordErr) {
      res.status(400).json({ success: false, message: passwordErr });
      return;
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      res.status(400).json({ success: false, message: 'Passwords do not match.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Check for duplicate account
    const existing = await userStore.findByEmail(normalizedEmail);
    if (existing) {
      res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
      return;
    }

    // 3. Hash password & create user record
    const passwordHash = await authService.hashPassword(password);
    const user = await userStore.createUser({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    const safeUser = authService.getSafeUser(user);

    // 4. Generate token & set HTTP-only cookie
    const token = authService.generateToken(safeUser);
    setAuthCookie(res, token);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: safeUser,
      token,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 */
export async function loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body || {};

    const emailErr = authService.validateEmail(email);
    if (emailErr) {
      res.status(400).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      res.status(400).json({ success: false, message: 'Invalid email or password.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await userStore.findByEmail(normalizedEmail);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    const isMatch = await authService.comparePassword(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    const safeUser = authService.getSafeUser(user);
    const token = authService.generateToken(safeUser);
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      user: safeUser,
      token,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 */
export async function getMeHandler(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.',
    });
    return;
  }

  let userProfile = null;
  if (req.token) {
    const supabase = getUserSupabaseClient(req.token);
    if (supabase) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', req.user.id)
          .maybeSingle();

        if (profile) {
          userProfile = profile;
          if (profile.full_name) {
            req.user.name = profile.full_name;
          }
        }
      } catch (err) {
        console.warn('[authController] Failed to query user profile:', err);
      }
    }
  }

  res.status(200).json({
    success: true,
    user: req.user,
    profile: userProfile,
  });
}


/**
 * POST /api/auth/logout
 */
export async function logoutHandler(req: Request, res: Response): Promise<void> {
  clearAuthCookie(res);
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
}
