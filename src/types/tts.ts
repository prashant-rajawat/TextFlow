export interface Language {
  code: string;
  name: string;
  nativeName?: string;
}

export interface VoiceCapabilities {
  speed: boolean;
  pitch: boolean;
  volume: boolean;
  style: boolean;
}

export interface Voice {
  id: string;
  name: string;
  language: string; // e.g. "en-US", "hi-IN"
  gender: 'Male' | 'Female';
  provider?: string;
  supportedStyles?: string[];
  capabilities?: VoiceCapabilities;
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
  audioStoragePath?: string;
  isSecurelyStored?: boolean;
  storageStatus?: string;
  durationSeconds?: number;
  format?: string;
  code?: string;
  error?: string;
  retryAfter?: number;
}

export interface AudioResult {
  audioUrl: string;
  audioStoragePath?: string;
  isSecurelyStored?: boolean;
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
  code?: string;
  message: string;
  details?: string;
  statusCode?: number;
  retryAfter?: number;
}

export type AppState = 'idle' | 'loading' | 'success' | 'error';

export type SupportedDocType = 'txt' | 'pdf' | 'docx';

export interface ExtractedDocInfo {
  fileName: string;
  fileType: SupportedDocType;
  characterCount: number;
  wordCount: number;
  rawText?: string;
  isTruncated?: boolean;
}

export interface FileExtractionResponse {
  success: boolean;
  fileName?: string;
  fileType?: SupportedDocType;
  characterCount?: number;
  wordCount?: number;
  text?: string;
  code?: string;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}
