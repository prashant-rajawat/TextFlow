import { Request, Response, NextFunction } from 'express';
import { SUPPORTED_LANGUAGES, VOICE_CATALOG } from '../config/voices';

export function validateTTSRequest(req: Request, res: Response, next: NextFunction): void {
  // 1. Content-Type Validation
  if (!req.is('application/json')) {
    res.status(400).json({
      success: false,
      message: 'Invalid Content-Type. Expected application/json.',
    });
    return;
  }

  const { text, language, voice, voiceId } = req.body || {};
  const requestedVoice = voice || voiceId;

  // 2. Text Validation
  if (text === undefined || text === null || typeof text !== 'string' || text.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Text is required.',
    });
    return;
  }

  if (text.length > 5000) {
    res.status(400).json({
      success: false,
      message: 'Text exceeds the maximum limit of 5,000 characters.',
    });
    return;
  }

  // 3. Language Validation
  if (!language || typeof language !== 'string' || language.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Language is required.',
    });
    return;
  }

  const isLanguageSupported = SUPPORTED_LANGUAGES.some((l) => l.code === language);
  if (!isLanguageSupported) {
    res.status(400).json({
      success: false,
      message: 'Unsupported language.',
    });
    return;
  }

  // 4. Voice Validation
  if (!requestedVoice || typeof requestedVoice !== 'string' || requestedVoice.trim().length === 0) {
    res.status(400).json({
      success: false,
      message: 'Voice is required.',
    });
    return;
  }

  const foundVoice = VOICE_CATALOG.find((v) => v.id === requestedVoice);
  if (!foundVoice) {
    res.status(400).json({
      success: false,
      message: 'Invalid voice.',
    });
    return;
  }

  // 5. Voice-Language Compatibility Validation
  if (foundVoice.language !== language) {
    res.status(400).json({
      success: false,
      message: `Selected voice '${requestedVoice}' is not compatible with language '${language}'.`,
    });
    return;
  }

  next();
}
