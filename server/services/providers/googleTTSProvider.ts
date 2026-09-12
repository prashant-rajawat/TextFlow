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
    const ttsApiKey = process.env.TTS_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!ttsApiKey && !geminiApiKey) {
      const err: any = new Error('Text-to-Speech service is temporarily unavailable. Please try again.');
      err.statusCode = 503;
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
      try {
        const ai = new GoogleGenAI({
          apiKey: geminiApiKey.trim(),
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        // Select prebuilt voice based on gender
        const prebuiltVoiceName = gender === 'Male' ? 'Puck' : 'Kore';

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

        if (rawBase64Pcm) {
          let pcm = Buffer.from(rawBase64Pcm, 'base64');
          
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
        }
      } catch (geminiError: any) {
        console.error('[Gemini TTS] Synthesis error:', geminiError?.message || geminiError);
      }
    }

    const providerErr: any = new Error('Text-to-Speech service is temporarily unavailable. Please try again.');
    providerErr.statusCode = 503;
    throw providerErr;
  }
}
