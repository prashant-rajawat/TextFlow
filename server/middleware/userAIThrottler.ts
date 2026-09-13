import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface UserAIThrottleRecord {
  isInFlight: boolean;
  activeFingerprint: string | null;
  lastCompletedAt: number;
}

const aiThrottleMap = new Map<string, UserAIThrottleRecord>();

// Cleanup stale records every 5 minutes
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  const maxIdleAgeMs = 10 * 60 * 1000;
  for (const [userId, record] of aiThrottleMap.entries()) {
    if (!record.isInFlight && now - record.lastCompletedAt > maxIdleAgeMs) {
      aiThrottleMap.delete(userId);
    }
  }
}, 5 * 60 * 1000);
if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

function createAIFingerprint(userId: string, body: any): string {
  const normalized = {
    userId,
    text: (body?.text || '').trim(),
    operation: (body?.operation || '').trim(),
    language: (body?.language || '').trim(),
  };

  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex').slice(0, 16);
}

/**
 * Server-side user throttle middleware for POST /api/ai/enhance.
 * Enforces single in-flight AI request per user and duplicate protection.
 */
export function userAIThrottler(req: Request, res: Response, next: NextFunction): void {
  const userId = req.user?.id || (req.headers['x-forwarded-for'] as string) || req.ip || 'anonymous';
  const now = Date.now();

  let record = aiThrottleMap.get(userId);
  if (!record) {
    record = {
      isInFlight: false,
      activeFingerprint: null,
      lastCompletedAt: 0,
    };
    aiThrottleMap.set(userId, record);
  }

  const fingerprint = createAIFingerprint(userId, req.body);

  if (record.isInFlight) {
    const isDuplicate = record.activeFingerprint === fingerprint;
    const retryAfter = 3;
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({
      success: false,
      code: 'AI_RATE_LIMITED',
      message: isDuplicate
        ? 'AI enhancement is already in progress. Please wait for it to complete.'
        : 'Please wait a moment before sending another AI enhancement request.',
      retryAfter,
      error: {
        code: 'AI_RATE_LIMITED',
        message: isDuplicate
          ? 'AI enhancement is already in progress. Please wait for it to complete.'
          : 'Please wait a moment before sending another AI enhancement request.',
      },
    });
    return;
  }

  // Lock in-flight state
  record.isInFlight = true;
  record.activeFingerprint = fingerprint;

  const cleanup = () => {
    if (record) {
      record.isInFlight = false;
      record.activeFingerprint = null;
      record.lastCompletedAt = Date.now();
    }
  };

  res.once('finish', cleanup);
  res.once('close', cleanup);

  next();
}
