import { ITTSProvider } from './ttsProvider';
import { VoiceOption, TTSGenerationRequest, TTSGenerationResult } from '../../types';
import { VOICE_CATALOG, VoiceConfig } from '../../config/voices';
import { GoogleGenAI } from '@google/genai';

export class GoogleTTSProvider implements ITTSProvider {
  public name = 'Google Cloud Text-to-Speech';

  private getApiKey(): string | undefined {
    return process.env.TTS_API_KEY || process.env.GEMINI_API_KEY;
  }

  public isConfigured(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.trim() !== '');
  }

  public async getVoices(language?: string): Promise<VoiceOption[]> {
    if (language) {
      return VOICE_CATALOG.filter((v) => v.language === language);
    }
    return VOICE_CATALOG;
  }

  public async generateSpeech(request: TTSGenerationRequest): Promise<TTSGenerationResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      const err: any = new Error('Text-to-Speech service is not configured.');
      err.statusCode = 503;
      throw err;
    }

    const voiceId = request.voice || request.voiceId || '';
    const selectedVoice = VOICE_CATALOG.find((v) => v.id === voiceId);
    const gender = selectedVoice ? selectedVoice.gender : 'Female';

    // 1. Try Google Cloud Text-to-Speech REST API
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout

      const speakingRate = typeof request.speed === 'number' ? Math.max(0.5, Math.min(2.0, request.speed)) : 1.0;
      const pitch = typeof request.pitch === 'number' ? Math.max(-20.0, Math.min(20.0, request.pitch)) : 0.0;
      let volumeGainDb = 0.0;
      if (typeof request.volume === 'number' && request.volume < 100) {
        const volFraction = Math.max(0.001, request.volume / 100);
        volumeGainDb = Math.max(-96.0, Math.min(16.0, 20 * Math.log10(volFraction)));
      }

      const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
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
          const estimatedDuration = Math.max(2, Math.round(request.text.length / 15));
          return {
            audioUrl: `data:audio/mp3;base64,${data.audioContent}`,
            format: 'mp3',
            durationSeconds: estimatedDuration,
          };
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        const timeoutErr: any = new Error('Text-to-Speech service is temporarily unavailable.');
        timeoutErr.statusCode = 503;
        throw timeoutErr;
      }
      // Continue to fallback
    }

    // 2. Fallback to Gemini Multimodal Audio Synthesis if TTS REST API is disabled
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Synthesize spoken audio for the following text. Do not add intro or commentary. Speak only the exact text provided in clear natural ${gender} voice in ${request.language}:\n\n"${request.text}"`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'audio/mp3',
        },
      });

      if (response && response.candidates && response.candidates[0]) {
        const parts = response.candidates[0].content?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              const mime = part.inlineData.mimeType || 'audio/mp3';
              const duration = Math.max(2, Math.round(request.text.length / 15));
              return {
                audioUrl: `data:${mime};base64,${part.inlineData.data}`,
                format: mime.includes('wav') ? 'wav' : 'mp3',
                durationSeconds: duration,
              };
            }
          }
        }
      }
    } catch (e: any) {
      console.error('Gemini Audio fallback error:', e?.message || e);
    }

    const providerErr: any = new Error('Text-to-Speech service is temporarily unavailable.');
    providerErr.statusCode = 503;
    throw providerErr;
  }
}
