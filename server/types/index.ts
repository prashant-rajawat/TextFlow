export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  timestamp?: string;
}

export interface ApiErrorResponse {
  success: boolean;
  message: string;
  details?: any;
}

export interface VoiceCapabilities {
  speed: boolean;
  pitch: boolean;
  volume: boolean;
  style: boolean;
}

export interface VoiceOption {
  id: string;
  name: string;
  language: string;
  gender: 'Male' | 'Female';
  provider?: string;
  supportedStyles?: string[];
  capabilities?: VoiceCapabilities;
}

export interface TTSGenerationRequest {
  text: string;
  language: string;
  voice?: string;
  voiceId?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  style?: string;
}

export interface TTSGenerationResult {
  audioUrl: string;
  format: string;
  durationSeconds: number;
}
