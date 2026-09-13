import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ttsService } from '../services/ttsService';
import { historyStore } from '../db/historyStore';
import { usageStore } from '../db/usageStore';
import { SUPPORTED_LANGUAGES, VOICE_CATALOG } from '../config/voices';
import {
  audioStorageService,
  detectAudioMimeAndExt,
  MAX_AUDIO_FILE_SIZE_BYTES,
} from '../services/supabase/storageService';

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
 * Converts text into speech audio payload, saves to Supabase Storage, and creates history record.
 * Enforces TextFlow application daily usage limits atomically.
 */
export async function generateSpeechHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  let reservedUsage = false;
  const trimmedText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';

  try {
    const { text, language, voice, voiceId, speed, pitch, volume, style } = req.body;
    const selectedVoiceId = voice || voiceId;

    if (!text || typeof text !== 'string' || text.trim() === '') {
      res.status(400).json({
        success: false,
        code: 'INVALID_TTS_REQUEST',
        message: 'Text input is required and cannot be empty.',
        error: {
          code: 'INVALID_TTS_REQUEST',
          message: 'Text input is required and cannot be empty.',
        },
      });
      return;
    }

    if (text.length > 5000) {
      res.status(400).json({
        success: false,
        code: 'INVALID_TTS_REQUEST',
        message: 'Text exceeds maximum length of 5,000 characters.',
        error: {
          code: 'INVALID_TTS_REQUEST',
          message: 'Text exceeds maximum length of 5,000 characters.',
        },
      });
      return;
    }

    if (!language || typeof language !== 'string') {
      res.status(400).json({
        success: false,
        code: 'INVALID_TTS_REQUEST',
        message: 'Language code is required.',
        error: {
          code: 'INVALID_TTS_REQUEST',
          message: 'Language code is required.',
        },
      });
      return;
    }

    const trimmedLang = language.trim();
    const isLangSupported = SUPPORTED_LANGUAGES.some((l) => l.code === trimmedLang);
    if (!isLangSupported) {
      res.status(400).json({
        success: false,
        code: 'INVALID_TTS_REQUEST',
        message: `Unsupported language: ${trimmedLang}`,
        error: {
          code: 'INVALID_TTS_REQUEST',
          message: `Unsupported language: ${trimmedLang}`,
        },
      });
      return;
    }

    if (!selectedVoiceId || typeof selectedVoiceId !== 'string') {
      res.status(400).json({
        success: false,
        code: 'INVALID_TTS_REQUEST',
        message: 'Voice selection is required.',
        error: {
          code: 'INVALID_TTS_REQUEST',
          message: 'Voice selection is required.',
        },
      });
      return;
    }

    const selectedVoiceConfig = VOICE_CATALOG.find((v) => v.id === selectedVoiceId);
    if (!selectedVoiceConfig) {
      res.status(400).json({
        success: false,
        code: 'INVALID_TTS_REQUEST',
        message: `Invalid voice: ${selectedVoiceId}`,
        error: {
          code: 'INVALID_TTS_REQUEST',
          message: `Invalid voice: ${selectedVoiceId}`,
        },
      });
      return;
    }

    if (selectedVoiceConfig.language !== trimmedLang) {
      res.status(400).json({
        success: false,
        code: 'INVALID_TTS_REQUEST',
        message: `Voice '${selectedVoiceId}' is not compatible with language '${trimmedLang}'.`,
        error: {
          code: 'INVALID_TTS_REQUEST',
          message: `Voice '${selectedVoiceId}' is not compatible with language '${trimmedLang}'.`,
        },
      });
      return;
    }

    // Validate optional customization parameters if provided
    let numSpeed: number | undefined;
    if (speed !== undefined) {
      if (typeof speed !== 'number' || isNaN(speed) || speed < 0.5 || speed > 2.0) {
        res.status(400).json({
          success: false,
          code: 'INVALID_TTS_REQUEST',
          message: 'Speed must be a number between 0.5 and 2.0.',
          error: {
            code: 'INVALID_TTS_REQUEST',
            message: 'Speed must be a number between 0.5 and 2.0.',
          },
        });
        return;
      }
      numSpeed = speed;
    }

    let numPitch: number | undefined;
    if (pitch !== undefined) {
      if (typeof pitch !== 'number' || isNaN(pitch) || pitch < -20 || pitch > 20) {
        res.status(400).json({
          success: false,
          code: 'INVALID_TTS_REQUEST',
          message: 'Pitch must be a number between -20 and 20.',
          error: {
            code: 'INVALID_TTS_REQUEST',
            message: 'Pitch must be a number between -20 and 20.',
          },
        });
        return;
      }
      numPitch = pitch;
    }

    let numVolume: number | undefined;
    if (volume !== undefined) {
      if (typeof volume !== 'number' || isNaN(volume) || volume < 0 || volume > 100) {
        res.status(400).json({
          success: false,
          code: 'INVALID_TTS_REQUEST',
          message: 'Volume must be a number between 0 and 100.',
          error: {
            code: 'INVALID_TTS_REQUEST',
            message: 'Volume must be a number between 0 and 100.',
          },
        });
        return;
      }
      numVolume = volume;
    }

    let strStyle: string | undefined;
    if (style !== undefined && style !== null && style !== '') {
      if (typeof style !== 'string') {
        res.status(400).json({
          success: false,
          code: 'INVALID_TTS_REQUEST',
          message: 'Style must be a string.',
          error: {
            code: 'INVALID_TTS_REQUEST',
            message: 'Style must be a string.',
          },
        });
        return;
      }
      const trimmedStyle = style.trim();
      if (trimmedStyle !== '' && trimmedStyle !== 'default') {
        if (!selectedVoiceConfig.capabilities?.style || (selectedVoiceConfig.supportedStyles && !selectedVoiceConfig.supportedStyles.includes(trimmedStyle))) {
          res.status(400).json({
            success: false,
            code: 'INVALID_TTS_REQUEST',
            message: `Voice style is not supported by voice '${selectedVoiceConfig.name}'.`,
            error: {
              code: 'INVALID_TTS_REQUEST',
              message: `Voice style is not supported by voice '${selectedVoiceConfig.name}'.`,
            },
          });
          return;
        }
        strStyle = trimmedStyle;
      }
    }

    // 1. Check & Atomically Reserve TextFlow Application Daily TTS Limit
    if (req.user && req.user.id) {
      const usageResult = await usageStore.incrementTTSUsage(
        req.user.id,
        trimmedText.length,
        0,
        req.token
      );

      if (!usageResult.allowed) {
        res.status(429).json({
          success: false,
          code: 'TTS_DAILY_LIMIT_REACHED',
          message: 'You have reached your daily TextFlow TTS limit. Please try again tomorrow.',
          error: {
            code: 'TTS_DAILY_LIMIT_REACHED',
            message: 'You have reached your daily TextFlow TTS limit. Please try again tomorrow.',
          },
        });
        return;
      }

      reservedUsage = true;
    }

    // 2. Synthesize audio via Gemini/TTS provider
    const result = await ttsService.generateSpeech({
      text: trimmedText,
      language: trimmedLang,
      voiceId: selectedVoiceId,
      speed: numSpeed,
      pitch: numPitch,
      volume: numVolume,
      style: strStyle,
    });

    if (!result || !result.audioUrl) {
      if (reservedUsage && req.user?.id) {
        await usageStore.rollbackTTSUsage(req.user.id, trimmedText.length, 0, req.token);
        reservedUsage = false;
      }
      res.status(500).json({
        success: false,
        code: 'TTS_GENERATION_FAILED',
        message: 'Failed to generate audio output.',
        error: {
          code: 'TTS_GENERATION_FAILED',
          message: 'Failed to generate audio output.',
        },
      });
      return;
    }

    let historyRecord = null;
    let finalAudioUrl = result.audioUrl;
    let audioStoragePath: string | null = null;
    let isSecurelyStored = false;

    // 3. If user is authenticated, execute transactional Supabase Storage workflow
    if (req.user && req.user.id) {
      const userId = req.user.id;
      const historyId = crypto.randomUUID();

      // Decode base64 audio payload to binary buffer
      let audioBuffer: Buffer;
      if (result.audioUrl.startsWith('data:')) {
        const base64Str = result.audioUrl.split(',')[1] || '';
        audioBuffer = Buffer.from(base64Str, 'base64');
      } else {
        audioBuffer = Buffer.from(result.audioUrl);
      }

      // Check audio file size limit
      if (audioBuffer.length > MAX_AUDIO_FILE_SIZE_BYTES) {
        if (reservedUsage) {
          await usageStore.rollbackTTSUsage(userId, trimmedText.length, 0, req.token);
          reservedUsage = false;
        }
        res.status(400).json({
          success: false,
          code: 'AUDIO_FILE_TOO_LARGE',
          message: 'Generated audio file exceeds maximum storage size limit (25 MB).',
          error: {
            code: 'AUDIO_FILE_TOO_LARGE',
            message: 'Generated audio file exceeds maximum storage size limit (25 MB).',
          },
        });
        return;
      }

      // Detect MIME type and extension
      const { mimeType, extension } = detectAudioMimeAndExt(result.audioUrl, audioBuffer);

      // STEP 1: Upload to Supabase Storage (audio/{user_id}/{history_id}.ext)
      try {
        const uploadResult = await audioStorageService.uploadAudio({
          userId,
          historyId,
          audioBuffer,
          mimeType,
          extension,
          token: req.token,
        });
        audioStoragePath = uploadResult.storagePath;
      } catch (uploadError: any) {
        console.error('[TTS Controller] Supabase Storage upload failed:', uploadError);
        if (reservedUsage) {
          await usageStore.rollbackTTSUsage(userId, trimmedText.length, 0, req.token);
          reservedUsage = false;
        }
        res.status(500).json({
          success: false,
          code: 'AUDIO_STORAGE_UPLOAD_FAILED',
          message: "Speech was generated, but we couldn't securely save the audio. Please try again.",
          error: {
            code: 'AUDIO_STORAGE_UPLOAD_FAILED',
            message: "Speech was generated, but we couldn't securely save the audio. Please try again.",
          },
        });
        return;
      }

      // STEP 2: Record stored audio bytes to usage records
      await usageStore.adjustAudioBytes(userId, audioBuffer.length, req.token);

      // STEP 3: Create speech_history database record
      try {
        historyRecord = await historyStore.createHistoryRecord(
          {
            id: historyId,
            userId,
            text: trimmedText,
            language: trimmedLang,
            voice: selectedVoiceId,
            speed: numSpeed,
            pitch: numPitch,
            volume: numVolume,
            style: strStyle,
            audioUrl: result.audioUrl, // Fallback data URL
            audioStoragePath: audioStoragePath || undefined,
          },
          req.token
        );
      } catch (dbError: any) {
        console.error('[TTS Controller] Speech history DB insertion failed:', dbError);
        // Rollback: delete the uploaded storage object to prevent orphan files
        if (audioStoragePath) {
          await audioStorageService.deleteAudioObject(audioStoragePath, req.token).catch(() => {});
          await usageStore.adjustAudioBytes(userId, -audioBuffer.length, req.token);
        }
        if (reservedUsage) {
          await usageStore.rollbackTTSUsage(userId, trimmedText.length, 0, req.token);
          reservedUsage = false;
        }
        res.status(500).json({
          success: false,
          code: 'AUDIO_STORAGE_UPLOAD_FAILED',
          message: "Speech was generated, but we couldn't securely save the audio record. Please try again.",
          error: {
            code: 'AUDIO_STORAGE_UPLOAD_FAILED',
            message: "Speech was generated, but we couldn't securely save the audio record. Please try again.",
          },
        });
        return;
      }

      // STEP 4: Generate short-lived signed URL for playback
      if (audioStoragePath) {
        const signedUrl = await audioStorageService.createSignedUrl(audioStoragePath, 3600, req.token);
        if (signedUrl) {
          finalAudioUrl = signedUrl;
          isSecurelyStored = true;
          if (historyRecord) {
            historyRecord.audioUrl = signedUrl;
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      audioUrl: finalAudioUrl,
      audioStoragePath: audioStoragePath || null,
      isSecurelyStored,
      storageStatus: isSecurelyStored ? 'saved' : 'unconfigured',
      durationSeconds: result.durationSeconds,
      format: result.format,
      data: {
        ...result,
        audioUrl: finalAudioUrl,
        audioStoragePath: audioStoragePath || null,
      },
      history: historyRecord,
    });
  } catch (error: any) {
    if (reservedUsage && req.user?.id) {
      await usageStore.rollbackTTSUsage(req.user.id, trimmedText.length, 0, req.token).catch(() => {});
    }
    next(error);
  }
}
