import React, { useState, useEffect, useRef } from 'react';
import { TextInput } from '../components/TextInput';
import { LanguageSelector } from '../components/LanguageSelector';
import { VoiceSelector } from '../components/VoiceSelector';
import { VoiceSettings } from '../components/VoiceSettings';
import { GenerateButton } from '../components/GenerateButton';
import { AudioPlayer } from '../components/AudioPlayer';
import { ErrorMessage } from '../components/ErrorMessage';
import { SUPPORTED_LANGUAGES, getVoices, generateSpeech, revokeAudioObjectUrl } from '../services/ttsService';
import { ApplicationError, AudioResult, AppState, Voice, VoiceSettingsState } from '../types/tts';

export const Home: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en-US');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('en-US-female-1');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettingsState>({
    speed: 1.0,
    pitch: 0,
    volume: 100,
    style: 'default',
  });
  
  const [appState, setAppState] = useState<AppState>('idle');
  const [error, setError] = useState<ApplicationError | null>(null);
  const [audioResult, setAudioResult] = useState<AudioResult | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);

  // Clean up object URL on component unmount
  useEffect(() => {
    return () => {
      if (activeObjectUrlRef.current) {
        revokeAudioObjectUrl(activeObjectUrlRef.current);
      }
    };
  }, []);

  // Fetch available voices dynamically from backend API whenever language changes
  useEffect(() => {
    let isMounted = true;
    async function loadVoices() {
      try {
        const fetchedVoices = await getVoices(selectedLanguage);
        if (isMounted) {
          setVoices(fetchedVoices);
          if (fetchedVoices.length > 0) {
            const match = fetchedVoices.find((v) => v.id === selectedVoiceId);
            if (!match) {
              setSelectedVoiceId(fetchedVoices[0].id);
            }
          }
        }
      } catch (err) {
        console.warn('Error loading voices:', err);
      }
    }

    loadVoices();
    return () => {
      isMounted = false;
    };
  }, [selectedLanguage]);

  // Clear validation errors as user edits text
  const handleTextChange = (newText: string) => {
    setText(newText);
    if (error && error.type === 'validation') {
      setError(null);
    }
  };

  const validateInput = (): boolean => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError({
        type: 'validation',
        message: 'Please enter some text before generating speech.',
      });
      setAppState('error');
      return false;
    }

    if (text.length > 5000) {
      setError({
        type: 'validation',
        message: 'Your text exceeds the maximum limit of 5,000 characters.',
        details: `Current length is ${text.length} characters. Please shorten your text.`,
      });
      setAppState('error');
      return false;
    }

    setError(null);
    return true;
  };

  const handleGenerate = async () => {
    if (!validateInput()) return;

    setAppState('loading');
    setError(null);

    try {
      const currentLanguageObj = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);
      const currentVoiceObj = voices.find((v) => v.id === selectedVoiceId);

      const response = await generateSpeech({
        text: text.trim(),
        language: selectedLanguage,
        voiceId: selectedVoiceId,
        speed: voiceSettings.speed,
        pitch: voiceSettings.pitch,
        volume: voiceSettings.volume,
        style: voiceSettings.style,
      });

      if (!response.success) {
        throw new Error('Failed to generate speech');
      }

      // Revoke previous active object URL to prevent memory accumulation
      if (activeObjectUrlRef.current) {
        revokeAudioObjectUrl(activeObjectUrlRef.current);
      }
      activeObjectUrlRef.current = response.audioUrl || null;

      const snippet = text.trim().slice(0, 60) + (text.length > 60 ? '...' : '');

      setAudioResult({
        audioUrl: response.audioUrl || '',
        durationSeconds: response.durationSeconds,
        textSnippet: snippet,
        languageName: currentLanguageObj?.name || selectedLanguage,
        voiceName: currentVoiceObj?.name || 'Standard Voice',
        speed: voiceSettings.speed,
        pitch: voiceSettings.pitch,
        volume: voiceSettings.volume,
        style: voiceSettings.style,
        createdAt: new Date(),
      });

      setAppState('success');
    } catch (err: any) {
      setError({
        type: err.type || 'api',
        message: err.message || 'An error occurred while generating speech.',
        details: err.details,
      });
      setAppState('error');
    }
  };

  return (
    <div id="home" className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-16 space-y-8">
      {/* Primary Application Workspace Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none p-5 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Speech Studio
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Enter your script, configure voice parameters, and synthesize natural audio.
            </p>
          </div>
        </div>

        {/* Text Input Component */}
        <TextInput
          value={text}
          onChange={handleTextChange}
          maxLength={5000}
          disabled={appState === 'loading'}
          error={error?.type === 'validation' ? error.message : null}
        />

        {/* Validation or API Error Banner */}
        <ErrorMessage error={error} onDismiss={() => setError(null)} />

        {/* Controls Grid: Language & Voice Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <LanguageSelector
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
            disabled={appState === 'loading'}
          />

          <VoiceSelector
            selectedVoiceId={selectedVoiceId}
            onVoiceChange={setSelectedVoiceId}
            voices={voices}
            disabled={appState === 'loading'}
          />
        </div>

        {/* Voice Customization Settings */}
        <VoiceSettings
          settings={voiceSettings}
          onChange={setVoiceSettings}
          disabled={appState === 'loading'}
        />

        {/* Generate Button Container */}
        <div className="pt-2 flex justify-center sm:justify-end">
          <GenerateButton
            onClick={handleGenerate}
            isLoading={appState === 'loading'}
            disabled={text.trim().length === 0 || text.length > 5000}
          />
        </div>
      </div>

      {/* Generated Audio Section */}
      <AudioPlayer result={audioResult} isLoading={appState === 'loading'} />
    </div>
  );
};
