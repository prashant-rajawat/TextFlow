import { Request, Response, NextFunction } from 'express';
import { aiEnhanceService, AIEnhanceOperation } from '../services/aiEnhanceService';
import { usageStore } from '../db/usageStore';

export async function enhanceTextHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  let reservedUsage = false;

  try {
    const { text, operation, language } = req.body;

    // 1. Verify user authentication (middleware already guarantees req.user)
    if (!req.user || !req.user.id) {
      res.status(401).json({
        success: false,
        code: 'AI_UNAUTHORIZED',
        message: 'Authentication required. Please log in to use AI Text Enhancement.',
        error: {
          code: 'AI_UNAUTHORIZED',
          message: 'Authentication required. Please log in to use AI Text Enhancement.',
        },
      });
      return;
    }

    // 2. Validate input text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({
        success: false,
        code: 'AI_INVALID_REQUEST',
        message: 'Please provide text to enhance.',
        error: {
          code: 'AI_INVALID_REQUEST',
          message: 'Please provide text to enhance.',
        },
      });
      return;
    }

    if (text.length > 5000) {
      res.status(400).json({
        success: false,
        code: 'AI_INVALID_REQUEST',
        message: 'The text exceeds the maximum limit of 5,000 characters.',
        error: {
          code: 'AI_INVALID_REQUEST',
          message: 'The text exceeds the maximum limit of 5,000 characters.',
        },
      });
      return;
    }

    // 3. Validate operation
    const allowedOps: AIEnhanceOperation[] = ['grammar', 'rewrite', 'summarize', 'conversational'];
    if (!operation || !allowedOps.includes(operation as AIEnhanceOperation)) {
      res.status(400).json({
        success: false,
        code: 'AI_INVALID_REQUEST',
        message: 'Invalid operation. Supported operations are: grammar, rewrite, summarize, conversational.',
        error: {
          code: 'AI_INVALID_REQUEST',
          message: 'Invalid operation. Supported operations are: grammar, rewrite, summarize, conversational.',
        },
      });
      return;
    }

    // 4. Check & Atomically Reserve AI Enhancement Usage
    const usageResult = await usageStore.incrementAIUsage(req.user.id, req.token);
    if (!usageResult.allowed) {
      res.status(429).json({
        success: false,
        code: 'AI_DAILY_LIMIT_REACHED',
        message: 'You have reached your daily TextFlow AI enhancement limit. Please try again tomorrow.',
        error: {
          code: 'AI_DAILY_LIMIT_REACHED',
          message: 'You have reached your daily TextFlow AI enhancement limit. Please try again tomorrow.',
        },
      });
      return;
    }

    reservedUsage = true;

    // 5. Perform AI text enhancement
    const result = await aiEnhanceService.enhanceText({
      text: text.trim(),
      operation: operation as AIEnhanceOperation,
      language: typeof language === 'string' ? language : undefined,
    });

    res.status(200).json({
      success: true,
      operation: result.operation,
      originalText: result.originalText,
      enhancedText: result.enhancedText,
    });
  } catch (error: any) {
    if (reservedUsage && req.user?.id) {
      await usageStore.rollbackAIUsage(req.user.id, req.token).catch(() => {});
    }
    next(error);
  }
}
