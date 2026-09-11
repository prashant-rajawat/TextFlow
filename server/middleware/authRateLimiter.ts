import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  timestamps: number[];
}

const authRequestsMap = new Map<string, RateLimitRecord>();

// Cleanup stale auth rate limit records every 5 minutes
setInterval(() => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minute window
  for (const [ip, record] of authRequestsMap.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    if (record.timestamps.length === 0) {
      authRequestsMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * Strict rate limiter for registration and login endpoints.
 * Allows max 15 auth attempts per 15-minute window per IP.
 */
export function authRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 15;

  let record = authRequestsMap.get(clientIp);
  if (!record) {
    record = { timestamps: [] };
    authRequestsMap.set(clientIp, record);
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxAttempts) {
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again later.',
    });
    return;
  }

  record.timestamps.push(now);
  next();
}
