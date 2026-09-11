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

export interface VoiceOption {
  id: string;
  name: string;
  language: string;
  gender: 'Male' | 'Female';
  provider?: string;
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
