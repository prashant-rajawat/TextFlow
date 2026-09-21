import { Language, Voice, TTSRequest, TTSResponse, ApplicationError } from '../types/tts';
import { tokenManager } from './tokenManager';
import { getSupabaseClient } from '../lib/supabase';

// Supported initial languages specification
export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'મરાઠી' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch' },
];

// Fallback voice list if backend is initializing
const DEFAULT_CAPS = { speed: true, pitch: true, volume: true, style: false };
const PROVIDER_NAME = 'Google Cloud Text-to-Speech';

export const MOCK_VOICES: Voice[] = [
  { id: 'en-US-female-1', name: 'English Female', language: 'en-US', gender: 'Female', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPS },
  { id: 'en-US-male-1', name: 'English Male', language: 'en-US', gender: 'Male', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPS },
  { id: 'hi-IN-female-1', name: 'Hindi Female', language: 'hi-IN', gender: 'Female', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPS },
  { id: 'hi-IN-male-1', name: 'Hindi Male', language: 'hi-IN', gender: 'Male', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPS },
  { id: 'gu-IN-female-1', name: 'Gujarati Female', language: 'gu-IN', gender: 'Female', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPS },
  { id: 'gu-IN-male-1', name: 'Gujarati Male', language: 'gu-IN', gender: 'Male', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPS },
  { id: 'mr-IN-female-1', name: 'Marathi Female', language: 'mr-IN', gender: 'Female', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPS },
  { id: 'mr-IN-male-1', name: 'Marathi Male', language: 'mr-IN', gender: 'Male', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPS },
  { id: 'es-ES-female-1', name: 'Spanish Female', language: 'es-ES', gender: 'Female', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPS },
  { id: 'es-ES-male-1', name: 'Spanish Male', language: 'es-ES', gender: 'Male', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPS },
  { id: 'fr-FR-female-1', name: 'French Female', language: 'fr-FR', gender: 'Female', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPS },
  { id: 'fr-FR-male-1', name: 'French Male', language: 'fr-FR', gender: 'Male', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPS },
  { id: 'de-DE-female-1', name: 'German Female', language: 'de-DE', gender: 'Female', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPS },
  { id: 'de-DE-male-1', name: 'German Male', language: 'de-DE', gender: 'Male', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPS },
];

/**
 * Helper to retrieve API base URL safely from environment.
 * Defaults to relative '/api' route.
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.replace(/\/$/, '');
  }
  return '/api';
}

// Session-level memory cache for fetched voices
const voicesCache = new Map<string, Voice[]>();

/**
 * Fetch available voices from backend GET /api/voices.
 */
export async function getVoices(languageCode?: string): Promise<Voice[]> {
  const cacheKey = languageCode || '__all__';
  if (voicesCache.has(cacheKey)) {
    return voicesCache.get(cacheKey)!;
  }

  const baseUrl = getApiBaseUrl();
  try {
    const url = languageCode ? `${baseUrl}/voices?language=${encodeURIComponent(languageCode)}` : `${baseUrl}/voices`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.success && Array.isArray(data.voices)) {
        voicesCache.set(cacheKey, data.voices);
        return data.voices;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch voices from backend API, falling back to local list:', err);
  }

  // Fallback to local catalog if endpoint unreachable
  let fallbackList = MOCK_VOICES;
  if (languageCode) {
    const filtered = MOCK_VOICES.filter((v) => v.language === languageCode);
    if (filtered.length > 0) fallbackList = filtered;
  }
  voicesCache.set(cacheKey, fallbackList);
  return fallbackList;
}

/**
 * Converts a base64 audio data URL to a Blob object URL for memory efficiency and smooth playback.
 */
export function createAudioObjectUrl(rawAudioUrl: string): string {
  if (!rawAudioUrl || !rawAudioUrl.startsWith('data:')) {
    return rawAudioUrl;
  }
  try {
    const parts = rawAudioUrl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'audio/mp3';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn('Failed to convert base64 audio to Blob URL, using raw data URL:', err);
    return rawAudioUrl;
  }
}

/**
 * Safely revokes a Blob object URL if it was generated by URL.createObjectURL.
 */
export function revokeAudioObjectUrl(url: string | null | undefined): void {
  if (url && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore revocation errors
    }
  }
}

/**
 * Generate Speech request via POST /api/tts.
 */
export async function generateSpeech(request: TTSRequest): Promise<TTSResponse> {
  const baseUrl = getApiBaseUrl();

  try {
    const authHeaders = await tokenManager.getAuthHeadersAsync({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    });

    const response = await fetch(`${baseUrl}/tts`, {
      method: 'POST',
      headers: authHeaders,
      credentials: 'include',
      body: JSON.stringify({
        text: request.text,
        language: request.language,
        voice: request.voiceId,
        voiceId: request.voiceId,
        speed: request.speed,
        pitch: request.pitch,
        volume: request.volume,
        style: request.style,
      }),
    });


    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorCode = data?.code || data?.error?.code;
      let message = data?.message || data?.error?.message;
      const retryAfter = data?.retryAfter;

      if (response.status === 429 || errorCode === 'TTS_QUOTA_EXCEEDED' || errorCode === 'TTS_DAILY_QUOTA_EXCEEDED') {
        if (errorCode === 'TTS_RATE_LIMITED') {
          message = 'Gemini is temporarily rate limited. Please wait a moment before trying again.';
        } else if (errorCode === 'TTS_REQUEST_THROTTLED') {
          message = message || 'Please wait a moment before generating another speech.';
        } else {
          message = 'Gemini TTS daily quota has been reached. Please try again after the quota resets.';
        }
      } else if (!message) {
        if (response.status === 503) {
          message = 'Text-to-Speech service is temporarily unavailable. Please try again later.';
        } else if (response.status === 401) {
          message = 'Text-to-Speech authentication failed. Please check your API configuration.';
        } else if (response.status === 403) {
          message = 'Text-to-Speech permission denied. Please verify your API permissions.';
        } else if (response.status === 404) {
          message = 'Requested Text-to-Speech model was not found.';
        } else if (response.status === 408 || response.status === 504) {
          message = 'Text-to-Speech request timed out. Please try again.';
        } else {
          message = `Speech generation failed (HTTP ${response.status}).`;
        }
      }

      // Sanitize if message is JSON string
      if (typeof message === 'string' && message.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(message);
          message = parsed?.error?.message || parsed?.message || message;
        } catch {
          // ignore
        }
      }

      // Ensure no raw URLs, internal quota metric strings, or JSON leak to frontend display
      if (typeof message === 'string') {
        if (
          message.includes('generativelanguage.googleapis.com') ||
          message.includes('QuotaFailure') ||
          message.includes('quotaMetric') ||
          message.includes('free_tier_requests') ||
          message.includes('RESOURCE_EXHAUSTED') ||
          message.includes('project quota')
        ) {
          message = 'Gemini TTS daily quota has been reached. Please try again after the quota resets.';
        }
      }

      const errorType = response.status === 400 ? 'validation' : 'api';
      throw {
        type: errorType,
        code: errorCode,
        message,
        details: typeof data?.details === 'string' ? data.details : undefined,
        statusCode: response.status,
        retryAfter,
      } as ApplicationError;
    }

    if (!data || !data.success) {
      throw {
        type: 'api',
        message: data?.message || 'Text-to-Speech service is temporarily unavailable. Please try again.',
      } as ApplicationError;
    }

    const rawAudioUrl = data.audioUrl || data.data?.audioUrl || '';
    let finalAudioUrl = rawAudioUrl;
    let audioStoragePath: string | undefined = undefined;
    let isSecurelyStored = false;

    const supabase = getSupabaseClient();
    if (supabase && finalAudioUrl.startsWith('data:')) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;

        if (userId) {
          const historyId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = (Math.random() * 16) | 0;
                const v = c === 'x' ? r : (r & 0x3) | 0x8;
                return v.toString(16);
              });

          const parts = finalAudioUrl.split(',');
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'audio/mp3';
          const bstr = atob(parts[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const audioBlob = new Blob([u8arr], { type: mimeType });
          const extension = mimeType.includes('wav') ? 'wav' : 'mp3';

          audioStoragePath = `audio/${userId}/${historyId}/generated-audio.${extension}`;

          const { error: uploadError } = await supabase.storage
            .from('textflow-audio')
            .upload(audioStoragePath, audioBlob, {
              contentType: mimeType,
              upsert: true,
            });

          if (uploadError) {
            console.error('[Browser Storage Upload Error]:', uploadError);
            throw {
              type: 'api',
              code: 'AUDIO_STORAGE_UPLOAD_FAILED',
              message: "Speech was generated, but we couldn't securely save the audio. Please try again.",
            };
          }

          const { error: dbError } = await supabase.from('speech_history').insert({
            id: historyId,
            user_id: userId,
            text: request.text,
            language: request.language,
            voice: request.voiceId,
            speed: request.speed,
            pitch: request.pitch,
            volume: request.volume,
            style: request.style,
            audio_storage_path: audioStoragePath,
            is_favorite: false,
            created_at: new Date().toISOString(),
          });

          if (dbError) {
            console.error('[Browser History DB Insert Error]:', dbError);
            await supabase.storage.from('textflow-audio').remove([audioStoragePath]).catch(() => {});
            throw {
              type: 'api',
              code: 'AUDIO_STORAGE_UPLOAD_FAILED',
              message: "Speech was generated, but we couldn't securely save the audio record. Please try again.",
            };
          }

          const { data: signedData } = await supabase.storage
            .from('textflow-audio')
            .createSignedUrl(audioStoragePath, 3600);

          if (signedData?.signedUrl) {
            finalAudioUrl = signedData.signedUrl;
            isSecurelyStored = true;
          }
        }
      } catch (clientStorageErr: any) {
        if (clientStorageErr.type && clientStorageErr.message) {
          throw clientStorageErr;
        }
        throw {
          type: 'api',
          code: 'AUDIO_STORAGE_UPLOAD_FAILED',
          message: "Speech was generated, but we couldn't securely save the audio. Please try again.",
        };
      }
    }

    const audioUrl = createAudioObjectUrl(finalAudioUrl);
    const durationSeconds = data.durationSeconds || data.data?.durationSeconds || Math.max(2, Math.round(request.text.length / 15));

    return {
      success: true,
      audioUrl,
      audioStoragePath,
      isSecurelyStored,
      storageStatus: isSecurelyStored ? 'saved' : 'unconfigured',
      durationSeconds,
      format: data.format,
    };
  } catch (err: any) {
    if (err.type && err.message) {
      throw err;
    }
    throw {
      type: 'network',
      message: 'Unable to connect to the server. Please check your connection and try again.',
    } as ApplicationError;
  }
}
