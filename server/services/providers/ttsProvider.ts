import { VoiceOption, TTSGenerationRequest, TTSGenerationResult } from '../../types';

export interface ITTSProvider {
  name: string;
  isConfigured(): boolean;
  getVoices(language?: string): Promise<VoiceOption[]>;
  generateSpeech(request: TTSGenerationRequest): Promise<TTSGenerationResult>;
}
