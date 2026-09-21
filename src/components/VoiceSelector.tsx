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
        className="text-xs font-semibold uppercase tracking-wider text-[#65756A] flex items-center gap-1.5"
      >
        <Mic className="w-3.5 h-3.5 text-[#58B957]" />
        Voice
      </label>

      <div className="relative">
        <select
          id="voice-select"
          value={selectedVoiceId}
          onChange={(e) => onVoiceChange(e.target.value)}
          disabled={disabled || isLoading || voices.length === 0}
          className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-lg border border-[#DDEBDD] bg-white text-[#17301D] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#58B957]/20 focus:border-[#58B957] shadow-xs transition-colors cursor-pointer disabled:bg-[#F7FBF7] disabled:cursor-not-allowed"
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

        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#8A978E]">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

