export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
}

export interface VoiceCapabilities {
  speed: boolean;
  pitch: boolean;
  volume: boolean;
  style: boolean;
}

export interface VoiceConfig {
  id: string;
  name: string;
  language: string;
  gender: 'Male' | 'Female';
  provider: string;
  supportedStyles: string[];
  capabilities: VoiceCapabilities;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch' },
];

const DEFAULT_CAPABILITIES: VoiceCapabilities = {
  speed: true,
  pitch: true,
  volume: true,
  style: false, // Standard voices do not support custom voice styles in this provider
};

const PROVIDER_NAME = 'Google Cloud Text-to-Speech';

export const VOICE_CATALOG: VoiceConfig[] = [
  { id: 'en-US-female-1', name: 'English Female', language: 'en-US', gender: 'Female', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPABILITIES },
  { id: 'en-US-male-1', name: 'English Male', language: 'en-US', gender: 'Male', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPABILITIES },
  { id: 'hi-IN-female-1', name: 'Hindi Female', language: 'hi-IN', gender: 'Female', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPABILITIES },
  { id: 'hi-IN-male-1', name: 'Hindi Male', language: 'hi-IN', gender: 'Male', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPABILITIES },
  { id: 'gu-IN-female-1', name: 'Gujarati Female', language: 'gu-IN', gender: 'Female', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPABILITIES },
  { id: 'gu-IN-male-1', name: 'Gujarati Male', language: 'gu-IN', gender: 'Male', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPABILITIES },
  { id: 'mr-IN-female-1', name: 'Marathi Female', language: 'mr-IN', gender: 'Female', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPABILITIES },
  { id: 'mr-IN-male-1', name: 'Marathi Male', language: 'mr-IN', gender: 'Male', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPABILITIES },
  { id: 'es-ES-female-1', name: 'Spanish Female', language: 'es-ES', gender: 'Female', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPABILITIES },
  { id: 'es-ES-male-1', name: 'Spanish Male', language: 'es-ES', gender: 'Male', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPABILITIES },
  { id: 'fr-FR-female-1', name: 'French Female', language: 'fr-FR', gender: 'Female', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPABILITIES },
  { id: 'fr-FR-male-1', name: 'French Male', language: 'fr-FR', gender: 'Male', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPABILITIES },
  { id: 'de-DE-female-1', name: 'German Female', language: 'de-DE', gender: 'Female', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPABILITIES },
  { id: 'de-DE-male-1', name: 'German Male', language: 'de-DE', gender: 'Male', provider: PROVIDER_NAME, supportedStyles: [], capabilities: DEFAULT_CAPABILITIES },
];
