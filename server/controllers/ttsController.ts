import { Request, Response, NextFunction } from 'express';
import { ttsService } from '../services/ttsService';
import { historyStore } from '../db/historyStore';
import { SUPPORTED_LANGUAGES, VOICE_CATALOG } from '../config/voices';

/**
 * GET /api/voices
 * Returns list of available voices, optionally filtered by language query param.
 */
export async function getVoicesHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const language = req.query.language as string | undefined;
    const voices = await ttsService.getVoices(language);
    res.status(200).json({
      success: true,
      voices,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/tts
 * Converts text into speech audio payload and saves history record for authenticated user.
 */
export async function generateSpeechHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { text, language, voice, voiceId, speed, pitch, volume, style } = req.body;
    const selectedVoiceId = voice || voiceId;

    if (!text || typeof text !== 'string' || text.trim() === '') {
      res.status(400).json({ success: false, message: 'Text input is required and cannot be empty.' });
      return;
    }

    if (text.length > 5000) {
      res.status(400).json({ success: false, message: 'Text exceeds maximum length of 5,000 characters.' });
      return;
    }

    if (!language || typeof language !== 'string') {
      res.status(400).json({ success: false, message: 'Language code is required.' });
      return;
    }

    const trimmedLang = language.trim();
    const isLangSupported = SUPPORTED_LANGUAGES.some((l) => l.code === trimmedLang);
    if (!isLangSupported) {
      res.status(400).json({ success: false, message: `Unsupported language: ${trimmedLang}` });
      return;
    }

    if (!selectedVoiceId || typeof selectedVoiceId !== 'string') {
      res.status(400).json({ success: false, message: 'Voice selection is required.' });
      return;
    }

    const selectedVoiceConfig = VOICE_CATALOG.find((v) => v.id === selectedVoiceId);
    if (!selectedVoiceConfig) {
      res.status(400).json({ success: false, message: `Invalid voice: ${selectedVoiceId}` });
      return;
    }

    if (selectedVoiceConfig.language !== trimmedLang) {
      res.status(400).json({
        success: false,
        message: `Voice '${selectedVoiceId}' is not compatible with language '${trimmedLang}'.`,
      });
      return;
    }

    // Validate optional customization parameters if provided
    let numSpeed: number | undefined;
    if (speed !== undefined) {
      if (typeof speed !== 'number' || isNaN(speed) || speed < 0.5 || speed > 2.0) {
        res.status(400).json({ success: false, message: 'Speed must be a number between 0.5 and 2.0.' });
        return;
      }
      numSpeed = speed;
    }

    let numPitch: number | undefined;
    if (pitch !== undefined) {
      if (typeof pitch !== 'number' || isNaN(pitch) || pitch < -20 || pitch > 20) {
        res.status(400).json({ success: false, message: 'Pitch must be a number between -20 and 20.' });
        return;
      }
      numPitch = pitch;
    }

    let numVolume: number | undefined;
    if (volume !== undefined) {
      if (typeof volume !== 'number' || isNaN(volume) || volume < 0 || volume > 100) {
        res.status(400).json({ success: false, message: 'Volume must be a number between 0 and 100.' });
        return;
      }
      numVolume = volume;
    }

    let strStyle: string | undefined;
    if (style !== undefined) {
      if (typeof style !== 'string') {
        res.status(400).json({ success: false, message: 'Style must be a string.' });
        return;
      }
      strStyle = style;
    }

    const result = await ttsService.generateSpeech({
      text: text.trim(),
      language: trimmedLang,
      voiceId: selectedVoiceId,
      speed: numSpeed,
      pitch: numPitch,
      volume: numVolume,
      style: strStyle,
    });

    let historyRecord = null;

    // Save history if user is authenticated
    if (req.user && req.user.id) {
      try {
        historyRecord = await historyStore.createHistoryRecord({
          userId: req.user.id,
          text: text.trim(),
          language: trimmedLang,
          voice: selectedVoiceId,
          speed: numSpeed,
          pitch: numPitch,
          volume: numVolume,
          style: strStyle,
          audioUrl: result.audioUrl,
        });
      } catch (histErr) {
        // Log history persistence error safely without failing the TTS generation response
        console.error('Failed to save speech history record:', histErr);
      }
    }

    res.status(200).json({
      success: true,
      audioUrl: result.audioUrl,
      durationSeconds: result.durationSeconds,
      format: result.format,
      data: result,
      history: historyRecord,
    });
  } catch (error) {
    next(error);
  }
}
