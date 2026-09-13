import { ITTSProvider } from './ttsProvider';
import { VoiceOption, TTSGenerationRequest, TTSGenerationResult } from '../../types';
import { VOICE_CATALOG } from '../../config/voices';
import { GoogleGenAI, Modality } from '@google/genai';

function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): string {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for standard PCM)
  header.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]).toString('base64');
}

function adjustPcmSpeed(pcmBuffer: Buffer, speed?: number): Buffer {
  if (!speed || Math.abs(speed - 1.0) < 0.02) return pcmBuffer;
  const clampedSpeed = Math.max(0.5, Math.min(2.0, speed));
  const numSamples = Math.floor(pcmBuffer.length / 2);
  const newNumSamples = Math.floor(numSamples / clampedSpeed);
  const outBuffer = Buffer.alloc(newNumSamples * 2);

  for (let i = 0; i < newNumSamples; i++) {
    const origIndex = i * clampedSpeed;
    const baseIndex = Math.floor(origIndex);
    const fraction = origIndex - baseIndex;

    if (baseIndex >= numSamples - 1) {
      const val = pcmBuffer.readInt16LE((numSamples - 1) * 2);
      outBuffer.writeInt16LE(val, i * 2);
    } else {
      const s1 = pcmBuffer.readInt16LE(baseIndex * 2);
      const s2 = pcmBuffer.readInt16LE((baseIndex + 1) * 2);
      const interpolated = Math.round(s1 + (s2 - s1) * fraction);
      outBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, interpolated)), i * 2);
    }
  }
  return outBuffer;
}

function adjustPcmVolume(pcmBuffer: Buffer, volume?: number): Buffer {
  if (volume === undefined || volume >= 100) return pcmBuffer;
  const clampedVolume = Math.max(0, Math.min(100, volume));
  const numSamples = Math.floor(pcmBuffer.length / 2);
  const outBuffer = Buffer.alloc(pcmBuffer.length);
  const factor = clampedVolume / 100;

  for (let i = 0; i < numSamples; i++) {
    const s = pcmBuffer.readInt16LE(i * 2);
    const scaled = Math.round(s * factor);
    outBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, scaled)), i * 2);
  }
  return outBuffer;
}

export class GoogleTTSProvider implements ITTSProvider {
  public name = 'Google Cloud Text-to-Speech';

  private getApiKey(): string | undefined {
    return process.env.TTS_API_KEY || process.env.GEMINI_API_KEY;
  }

  public isConfigured(): boolean {
    const ttsKey = process.env.TTS_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    return Boolean((ttsKey && ttsKey.trim() !== '') || (geminiKey && geminiKey.trim() !== ''));
  }

  public async getVoices(language?: string): Promise<VoiceOption[]> {
    if (language) {
      return VOICE_CATALOG.filter((v) => v.language === language);
    }
    return VOICE_CATALOG;
  }

  public async generateSpeech(request: TTSGenerationRequest): Promise<TTSGenerationResult> {
    console.log('[TTS] Request started');

    const ttsApiKey = process.env.TTS_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!ttsApiKey && !geminiApiKey) {
      const err: any = new Error('Text-to-Speech service is temporarily unavailable. Please try again.');
      err.statusCode = 503;
      err.code = 'TTS_UNAVAILABLE';
      throw err;
    }

    const voiceId = request.voice || request.voiceId || '';
    const selectedVoice = VOICE_CATALOG.find((v) => v.id === voiceId);
    const gender = selectedVoice ? selectedVoice.gender : 'Female';

    const speakingRate = typeof request.speed === 'number' ? Math.max(0.5, Math.min(2.0, request.speed)) : 1.0;
    const pitch = typeof request.pitch === 'number' ? Math.max(-20.0, Math.min(20.0, request.pitch)) : 0.0;
    const volume = typeof request.volume === 'number' ? Math.max(0, Math.min(100, request.volume)) : 100;

    // 1. If a dedicated Google Cloud Text-to-Speech API key is provided, use Cloud TTS REST API
    if (ttsApiKey && ttsApiKey.trim() !== '') {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        let volumeGainDb = 0.0;
        if (volume < 100) {
          const volFraction = Math.max(0.001, volume / 100);
          volumeGainDb = Math.max(-96.0, Math.min(16.0, 20 * Math.log10(volFraction)));
        }

        const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${ttsApiKey.trim()}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            input: { text: request.text },
            voice: {
              languageCode: request.language,
              ssmlGender: gender.toUpperCase(),
            },
            audioConfig: {
              audioEncoding: 'MP3',
              speakingRate,
              pitch,
              volumeGainDb,
            },
          }),
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data && data.audioContent) {
            const estimatedDuration = Math.max(1, Math.round((request.text.length / 15) / speakingRate));
            return {
              audioUrl: `data:audio/mp3;base64,${data.audioContent}`,
              format: 'mp3',
              durationSeconds: estimatedDuration,
            };
          }
        } else {
          const errBody = await response.text();
          console.warn(`[Google Cloud TTS] REST call returned ${response.status}: ${errBody.slice(0, 300)}`);
        }
      } catch (cloudTtsError: any) {
        console.warn('[Google Cloud TTS] REST call failed:', cloudTtsError?.message || cloudTtsError);
      }
    }

    // 2. Gemini Text-to-Speech via official @google/genai SDK (gemini-3.1-flash-tts-preview)
    if (geminiApiKey && geminiApiKey.trim() !== '') {
      const ai = new GoogleGenAI({
        apiKey: geminiApiKey.trim(),
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Select prebuilt voice based on gender (Puck for male, Kore for female)
      const prebuiltVoiceName = gender === 'Male' ? 'Puck' : 'Kore';

      const MAX_ATTEMPTS = 3;
      let attempt = 0;
      let lastError: any = null;

      while (attempt < MAX_ATTEMPTS) {
        attempt++;
        console.log(`[TTS] Gemini TTS request (attempt ${attempt}/${MAX_ATTEMPTS}) | model: gemini-3.1-flash-tts-preview`);
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-tts-preview',
            contents: [{ parts: [{ text: request.text }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: prebuiltVoiceName },
                },
              },
            },
          });

          const part = response.candidates?.[0]?.content?.parts?.[0];
          const rawBase64Pcm = part?.inlineData?.data;

          if (!rawBase64Pcm || rawBase64Pcm.length === 0) {
            console.error('[TTS] Gemini TTS returned empty or invalid audio data payload');
            const invalidAudioErr: any = new Error('Text-to-Speech provider returned invalid or empty audio data.');
            invalidAudioErr.statusCode = 502;
            invalidAudioErr.code = 'TTS_INVALID_AUDIO';
            throw invalidAudioErr;
          }

          console.log('[TTS] Gemini TTS success | model: gemini-3.1-flash-tts-preview');
          let pcm = Buffer.from(rawBase64Pcm, 'base64');

          if (pcm.length === 0) {
            const invalidAudioErr: any = new Error('Text-to-Speech provider returned 0-byte audio buffer.');
            invalidAudioErr.statusCode = 502;
            invalidAudioErr.code = 'TTS_INVALID_AUDIO';
            throw invalidAudioErr;
          }

          // Apply volume scaling to PCM
          if (volume < 100) {
            pcm = adjustPcmVolume(pcm, volume);
          }

          // Apply speed resampling to PCM
          if (Math.abs(speakingRate - 1.0) >= 0.02) {
            pcm = adjustPcmSpeed(pcm, speakingRate);
          }

          const wavBase64 = pcmToWav(pcm, 24000, 1, 16);
          const durationSeconds = Math.max(1, Math.round((pcm.length / 2) / 24000));

          return {
            audioUrl: `data:audio/wav;base64,${wavBase64}`,
            format: 'wav',
            durationSeconds,
          };
        } catch (geminiError: any) {
          lastError = geminiError;
          const parsed = parseGeminiError(geminiError);
          const status = geminiError?.status || geminiError?.statusCode;
          const rawMsg = typeof geminiError?.message === 'string' ? geminiError.message : '';

          // 1. Permanent error: Daily quota exhaustion -> fail immediately without retrying
          if (parsed.isDailyQuotaExhausted) {
            console.warn('[TTS] HTTP 429 daily quota exhausted | category: TTS_DAILY_QUOTA_EXCEEDED | model: gemini-3.1-flash-tts-preview - failing cleanly without retrying');
            const quotaErr: any = new Error('Gemini TTS daily quota has been reached. Please try again after the quota resets.');
            quotaErr.statusCode = 429;
            quotaErr.code = 'TTS_DAILY_QUOTA_EXCEEDED';
            quotaErr.clientMessage = 'Gemini TTS daily quota has been reached. Please try again after the quota resets.';
            throw quotaErr;
          }

          // 2. Permanent error: Invalid request (400), Auth (401), Permission (403), Model not found (404), Invalid Audio (502) -> fail immediately
          const isPermanent =
            status === 400 ||
            status === 401 ||
            status === 403 ||
            status === 404 ||
            geminiError.code === 'TTS_INVALID_AUDIO' ||
            geminiError.code === 'INVALID_TTS_REQUEST' ||
            rawMsg.includes('INVALID_ARGUMENT') ||
            rawMsg.includes('UNAUTHENTICATED') ||
            rawMsg.includes('PERMISSION_DENIED') ||
            rawMsg.includes('NOT_FOUND');

          if (isPermanent) {
            handleNon429Error(geminiError);
          }

          // 3. Retryable error: Transient 429 rate limit, 408, 500, 502, 503, 504
          const isRetryable =
            parsed.is429 ||
            status === 408 ||
            status === 500 ||
            status === 502 ||
            status === 503 ||
            status === 504 ||
            rawMsg.includes('DEADLINE_EXCEEDED') ||
            rawMsg.toLowerCase().includes('timeout') ||
            rawMsg.includes('UNAVAILABLE') ||
            !status;

          if (isRetryable && attempt < MAX_ATTEMPTS) {
            // Exponential backoff with jitter: attempt 1 ~1s, attempt 2 ~2s, attempt 3 ~4s
            const baseDelayMs = Math.pow(2, attempt - 1) * 1000;
            const jitterMs = Math.floor(Math.random() * (baseDelayMs * 0.25));
            let waitMs = baseDelayMs + jitterMs;

            // Respect provider retry delay if reasonable
            if (attempt === 1 && parsed.retryDelayMs && parsed.retryDelayMs > 0 && parsed.retryDelayMs <= 5000) {
              waitMs = parsed.retryDelayMs;
            }

            console.warn(`[TTS] Transient error (${status || 'network'}). Retrying ${attempt + 1}/${MAX_ATTEMPTS} after ${waitMs}ms delay...`);
            await sleep(waitMs);
            continue;
          }

          // If retry limit reached for 429
          if (parsed.is429) {
            console.error(`[TTS] HTTP 429 rate limit exceeded after ${MAX_ATTEMPTS} attempts | category: TTS_RATE_LIMITED | model: gemini-3.1-flash-tts-preview`);
            const rateLimitErr: any = new Error('Gemini is temporarily rate limited. Please wait a moment before trying again.');
            rateLimitErr.statusCode = 429;
            rateLimitErr.code = 'TTS_RATE_LIMITED';
            rateLimitErr.clientMessage = 'Gemini is temporarily rate limited. Please wait a moment before trying again.';
            rateLimitErr.retryAfter = Math.min(15, Math.max(5, Math.round((parsed.retryDelayMs || 5000) / 1000)));
            throw rateLimitErr;
          }

          handleNon429Error(geminiError);
        }
      }

      if (lastError) {
        handleNon429Error(lastError);
      }
    }

    const providerErr: any = new Error('Text-to-Speech service is temporarily unavailable. Please try again later.');
    providerErr.statusCode = 503;
    providerErr.code = 'TTS_PROVIDER_UNAVAILABLE';
    throw providerErr;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseGeminiError(error: any): {
  is429: boolean;
  isDailyQuotaExhausted: boolean;
  retryDelayMs?: number;
} {
  const status = error?.status || error?.statusCode;
  const rawMsg = typeof error?.message === 'string' ? error.message : '';

  let is429 = status === 429;
  let isDailyQuotaExhausted = false;
  let retryDelayMs: number | undefined;

  let parsedBody: any = null;
  if (rawMsg.trim().startsWith('{')) {
    try {
      parsedBody = JSON.parse(rawMsg);
    } catch {
      // not JSON
    }
  }

  const errObj = parsedBody?.error || parsedBody || {};
  const code = errObj.code || status;
  const statusStr = errObj.status || '';
  const textMsg = (errObj.message || rawMsg || '').toLowerCase();

  if (
    code === 429 ||
    status === 429 ||
    statusStr === 'RESOURCE_EXHAUSTED' ||
    textMsg.includes('quota') ||
    textMsg.includes('429') ||
    textMsg.includes('resource_exhausted')
  ) {
    is429 = true;
  }

  if (
    textMsg.includes('free_tier_requests') ||
    textMsg.includes('perday') ||
    textMsg.includes('per_day') ||
    textMsg.includes('daily') ||
    textMsg.includes('monthly') ||
    textMsg.includes('project quota') ||
    textMsg.includes('quota exceeded for metric') ||
    textMsg.includes('plan and billing details') ||
    textMsg.includes('exceeded your current quota') ||
    textMsg.includes('generaterequestsperday')
  ) {
    isDailyQuotaExhausted = true;
  }

  const details = errObj.details || [];
  if (Array.isArray(details)) {
    for (const d of details) {
      if (d?.['@type']?.includes('QuotaFailure')) {
        isDailyQuotaExhausted = true;
      }
      if (d?.['@type']?.includes('RetryInfo') && d.retryDelay) {
        const m = String(d.retryDelay).match(/([\d.]+)s/);
        if (m) {
          retryDelayMs = Math.round(parseFloat(m[1]) * 1000);
        }
      }
    }
  }

  if (!retryDelayMs && rawMsg) {
    const m = rawMsg.match(/retry in ([\d.]+)s/i) || rawMsg.match(/retryDelay["']?\s*:\s*["']?([\d.]+)s/i);
    if (m) {
      retryDelayMs = Math.round(parseFloat(m[1]) * 1000);
    }
  }

  // Very long retry delays (>10s) indicate quota reset rather than short burst
  if (retryDelayMs && retryDelayMs > 10000) {
    isDailyQuotaExhausted = true;
  }

  return { is429, isDailyQuotaExhausted, retryDelayMs };
}

function handleNon429Error(err: any): never {
  const status = err?.status || err?.statusCode;
  const rawMsg = typeof err?.message === 'string' ? err.message : '';

  if (status === 400 || rawMsg.includes('INVALID_ARGUMENT')) {
    console.warn('[TTS] HTTP 400 | category: INVALID_TTS_REQUEST | model: gemini-3.1-flash-tts-preview');
    const error: any = new Error('Invalid Text-to-Speech request parameters.');
    error.statusCode = 400;
    error.code = 'INVALID_TTS_REQUEST';
    throw error;
  }

  if (status === 401 || rawMsg.includes('UNAUTHENTICATED')) {
    console.warn('[TTS] HTTP 401 | category: TTS_AUTHENTICATION_ERROR | model: gemini-3.1-flash-tts-preview');
    const error: any = new Error('Text-to-Speech authentication failed. Please check your API configuration.');
    error.statusCode = 401;
    error.code = 'TTS_AUTHENTICATION_ERROR';
    throw error;
  }

  if (status === 403 || rawMsg.includes('PERMISSION_DENIED')) {
    console.warn('[TTS] HTTP 403 | category: TTS_PERMISSION_ERROR | model: gemini-3.1-flash-tts-preview');
    const error: any = new Error('Text-to-Speech permission denied. Please verify your API permissions.');
    error.statusCode = 403;
    error.code = 'TTS_PERMISSION_ERROR';
    throw error;
  }

  if (status === 404 || rawMsg.includes('NOT_FOUND')) {
    console.warn('[TTS] HTTP 404 | category: TTS_MODEL_NOT_FOUND | model: gemini-3.1-flash-tts-preview');
    const error: any = new Error('Requested Text-to-Speech model was not found.');
    error.statusCode = 404;
    error.code = 'TTS_MODEL_NOT_FOUND';
    throw error;
  }

  if (status === 408 || status === 504 || rawMsg.includes('DEADLINE_EXCEEDED') || rawMsg.toLowerCase().includes('timeout')) {
    console.warn(`[TTS] HTTP ${status || 504} | category: TTS_TIMEOUT | model: gemini-3.1-flash-tts-preview`);
    const error: any = new Error('Text-to-Speech request timed out. Please try again.');
    error.statusCode = status === 408 ? 408 : 504;
    error.code = 'TTS_TIMEOUT';
    throw error;
  }

  if (status === 503 || rawMsg.includes('UNAVAILABLE')) {
    console.warn('[TTS] HTTP 503 | category: TTS_PROVIDER_UNAVAILABLE | model: gemini-3.1-flash-tts-preview');
    const error: any = new Error('Text-to-Speech service is temporarily unavailable. Please try again later.');
    error.statusCode = 503;
    error.code = 'TTS_PROVIDER_UNAVAILABLE';
    throw error;
  }

  console.warn(`[TTS] HTTP ${status || 500} | category: TTS_PROVIDER_ERROR | model: gemini-3.1-flash-tts-preview`);
  const error: any = new Error('Text-to-Speech provider encountered an error. Please try again.');
  error.statusCode = status && status >= 400 && status < 600 ? status : 500;
  error.code = 'TTS_PROVIDER_ERROR';
  throw error;
}
