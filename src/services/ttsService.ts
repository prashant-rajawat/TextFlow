import { Language, Voice, TTSRequest, TTSResponse, ApplicationError } from '../types/tts';
import { tokenManager } from './tokenManager';

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
      let message = data?.message;
      if (!message) {
        if (response.status === 503) {
          message = 'Text-to-Speech service is temporarily unavailable. Please try again.';
        } else if (response.status === 429) {
          message = 'Too many speech generation requests. Please try again later.';
        } else {
          message = `Speech generation failed (HTTP ${response.status}).`;
        }
      }

      const errorType = response.status === 400 ? 'validation' : response.status === 429 ? 'network' : 'api';
      throw {
        type: errorType,
        message,
        details: data?.details,
        statusCode: response.status,
      } as ApplicationError;
    }

    if (!data || !data.success) {
      throw {
        type: 'api',
        message: data?.message || 'Text-to-Speech service is temporarily unavailable. Please try again.',
      } as ApplicationError;
    }

    const rawAudioUrl = data.audioUrl || data.data?.audioUrl || '';
    const audioUrl = createAudioObjectUrl(rawAudioUrl);
    const durationSeconds = data.durationSeconds || data.data?.durationSeconds || Math.max(2, Math.round(request.text.length / 15));

    return {
      success: true,
      audioUrl,
      durationSeconds,
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
