import { ITTSProvider } from './providers/ttsProvider';
import { GoogleTTSProvider } from './providers/googleTTSProvider';
import { VoiceOption, TTSGenerationRequest, TTSGenerationResult } from '../types';
import { SUPPORTED_LANGUAGES, VOICE_CATALOG } from '../config/voices';

export class TTSService {
  private provider: ITTSProvider;

  constructor(provider?: ITTSProvider) {
    // Default to Google Cloud TTS provider
    this.provider = provider || new GoogleTTSProvider();
  }

  public getProviderName(): string {
    return this.provider.name;
  }

  public isProviderConfigured(): boolean {
    return this.provider.isConfigured();
  }

  public async getVoices(language?: string): Promise<VoiceOption[]> {
    if (language) {
      const isLangSupported = SUPPORTED_LANGUAGES.some((l) => l.code === language);
      if (!isLangSupported) {
        const err: any = new Error('Unsupported language.');
        err.statusCode = 400;
        throw err;
      }
    }
    return this.provider.getVoices(language);
  }

  public async generateSpeech(request: TTSGenerationRequest): Promise<TTSGenerationResult> {
    if (!this.provider.isConfigured()) {
      const err: any = new Error('Text-to-Speech service is not configured.');
      err.statusCode = 503;
      throw err;
    }

    try {
      return await this.provider.generateSpeech(request);
    } catch (error: any) {
      if (error.statusCode) {
        throw error;
      }
      const err: any = new Error('Text-to-Speech service is temporarily unavailable.');
      err.statusCode = 503;
      throw err;
    }
  }
}

export const ttsService = new TTSService();
