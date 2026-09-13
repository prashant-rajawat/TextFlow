import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  timestamps: number[];
}

const requestsMap = new Map<string, RateLimitRecord>();

// Cleanup stale records every 2 minutes
const rateLimitCleanup = setInterval(() => {
  const now = Date.now();
  const windowMs = 60 * 1000;
  for (const [ip, record] of requestsMap.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    if (record.timestamps.length === 0) {
      requestsMap.delete(ip);
    }
  }
}, 2 * 60 * 1000);
if (rateLimitCleanup.unref) {
  rateLimitCleanup.unref();
}

/**
 * Rate limiting middleware for POST /api/tts endpoint.
 * Limits client IP to 20 requests per minute.
 */
export function ttsRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 20; // 20 requests per minute

  let record = requestsMap.get(clientIp);
  if (!record) {
    record = { timestamps: [] };
    requestsMap.set(clientIp, record);
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    res.status(429).json({
      success: false,
      message: 'Too many speech generation requests. Please try again later.',
    });
    return;
  }

  record.timestamps.push(now);
  next();
}
