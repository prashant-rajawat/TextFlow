import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface UserThrottleRecord {
  isInFlight: boolean;
  activeFingerprint: string | null;
  lastCompletedAt: number;
}

// In-memory map of user throttle states
const userThrottleMap = new Map<string, UserThrottleRecord>();

// Minimum cooldown interval in milliseconds between consecutive requests from the same user
const MIN_REQUEST_INTERVAL_MS = 1500;

// Periodic cleanup of stale user throttle records every 5 minutes
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  const maxIdleAgeMs = 10 * 60 * 1000;
  for (const [userId, record] of userThrottleMap.entries()) {
    if (!record.isInFlight && now - record.lastCompletedAt > maxIdleAgeMs) {
      userThrottleMap.delete(userId);
    }
  }
}, 5 * 60 * 1000);
if (cleanupTimer.unref) {
  cleanupTimer.unref();
}

/**
 * Generates a lightweight SHA-256 fingerprint from the request parameters.
 */
function createRequestFingerprint(userId: string, body: any): string {
  const normalized = {
    userId,
    text: (body?.text || '').trim(),
    language: (body?.language || '').trim(),
    voice: (body?.voice || body?.voiceId || '').trim(),
    speed: body?.speed ?? 1.0,
    pitch: body?.pitch ?? 0,
    volume: body?.volume ?? 100,
    style: (body?.style || 'default').trim(),
  };

  return crypto.createHash('sha256').update(JSON.stringify(normalized)).digest('hex').slice(0, 16);
}

/**
 * Server-side user throttle middleware for POST /api/tts.
 * Enforces:
 * 1. Single in-flight request per user.
 * 2. Deduplication of identical requests in-flight or submitted immediately.
 * 3. Short interval cooldown protection between requests per user.
 */
export function userTTSThrottler(req: Request, res: Response, next: NextFunction): void {
  const userId = req.user?.id || (req.headers['x-forwarded-for'] as string) || req.ip || 'anonymous';
  const now = Date.now();

  let record = userThrottleMap.get(userId);
  if (!record) {
    record = {
      isInFlight: false,
      activeFingerprint: null,
      lastCompletedAt: 0,
    };
    userThrottleMap.set(userId, record);
  }

  const fingerprint = createRequestFingerprint(userId, req.body);

  // 1. Check if user already has an active generation in-flight
  if (record.isInFlight) {
    const isDuplicate = record.activeFingerprint === fingerprint;
    const retryAfter = 3;
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({
      success: false,
      code: 'TTS_REQUEST_THROTTLED',
      message: isDuplicate
        ? 'Your speech generation is already in progress. Please wait for it to finish.'
        : 'Please wait a moment before generating another speech.',
      retryAfter,
      error: {
        code: 'TTS_REQUEST_THROTTLED',
        message: isDuplicate
          ? 'Your speech generation is already in progress. Please wait for it to finish.'
          : 'Please wait a moment before generating another speech.',
      },
    });
    return;
  }

  // 2. Check minimum request interval to prevent rapid spamming
  const timeSinceLastCompletion = now - record.lastCompletedAt;
  if (record.lastCompletedAt > 0 && timeSinceLastCompletion < MIN_REQUEST_INTERVAL_MS) {
    const remainingMs = MIN_REQUEST_INTERVAL_MS - timeSinceLastCompletion;
    const retryAfterSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({
      success: false,
      code: 'TTS_REQUEST_THROTTLED',
      message: 'Please wait a moment before generating another speech.',
      retryAfter: retryAfterSeconds,
      error: {
        code: 'TTS_REQUEST_THROTTLED',
        message: 'Please wait a moment before generating another speech.',
      },
    });
    return;
  }

  // Lock user in-flight state
  record.isInFlight = true;
  record.activeFingerprint = fingerprint;

  // Release lock on completion or client disconnect
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
