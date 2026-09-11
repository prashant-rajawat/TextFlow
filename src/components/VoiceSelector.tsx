import React from 'react';
import { Mic, ChevronDown } from 'lucide-react';
import { Voice } from '../types/tts';

interface VoiceSelectorProps {
  selectedVoiceId: string;
  onVoiceChange: (voiceId: string) => void;
  voices: Voice[];
  disabled?: boolean;
  isLoading?: boolean;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  selectedVoiceId,
  onVoiceChange,
  voices,
  disabled = false,
  isLoading = false,
}) => {
  return (
    <div className="w-full space-y-1.5">
      <label
        htmlFor="voice-select"
        className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
      >
        <Mic className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        Voice
      </label>

      <div className="relative">
        <select
          id="voice-select"
          value={selectedVoiceId}
          onChange={(e) => onVoiceChange(e.target.value)}
          disabled={disabled || isLoading || voices.length === 0}
          className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs transition-colors cursor-pointer disabled:bg-slate-50 dark:disabled:bg-slate-950 disabled:cursor-not-allowed"
          aria-label="Select speech voice"
        >
          {voices.length === 0 ? (
            <option value="">No voices available</option>
          ) : (
            voices.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name} ({voice.gender})
              </option>
            ))
          )}
        </select>

        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
