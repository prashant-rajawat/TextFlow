export interface Language {
  code: string;
  name: string;
  nativeName?: string;
}

export interface Voice {
  id: string;
  name: string;
  language: string; // e.g. "en-US", "hi-IN"
  gender: 'Male' | 'Female';
}

export interface VoiceSettingsState {
  speed: number;
  pitch: number;
  volume: number;
  style: string;
}

export interface TTSRequest {
  text: string;
  language: string;
  voiceId: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  style?: string;
}

export interface TTSResponse {
  success: boolean;
  audioUrl?: string;
  durationSeconds?: number;
  format?: string;
  error?: string;
}

export interface AudioResult {
  audioUrl: string;
  durationSeconds?: number;
  textSnippet: string;
  languageName: string;
  voiceName: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  style?: string;
  createdAt: Date;
}

export type ErrorType = 'validation' | 'api' | 'network' | 'general';

export interface ApplicationError {
  type: ErrorType;
  message: string;
  details?: string;
}

export type AppState = 'idle' | 'loading' | 'success' | 'error';
