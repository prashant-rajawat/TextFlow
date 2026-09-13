import React from 'react';
import { Volume2, Loader2, Sparkles } from 'lucide-react';

interface GenerateButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  cooldownSeconds?: number;
}

export const GenerateButton: React.FC<GenerateButtonProps> = ({
  onClick,
  isLoading = false,
  disabled = false,
  cooldownSeconds = 0,
}) => {
  const isCooldownActive = cooldownSeconds > 0;
  const isButtonDisabled = disabled || isLoading || isCooldownActive;

  return (
    <button
      id="generate-speech-button"
      type="button"
      onClick={onClick}
      disabled={isButtonDisabled}
      aria-busy={isLoading}
      className={`w-full sm:w-auto min-w-[200px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white text-base shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
        isButtonDisabled
          ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-500 cursor-not-allowed shadow-none'
          : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 hover:shadow-lg hover:-translate-y-0.5'
      }`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Generating speech...</span>
        </>
      ) : isCooldownActive ? (
        <>
          <Volume2 className="w-5 h-5 opacity-60" />
          <span>Generate Speech ({cooldownSeconds}s)</span>
        </>
      ) : (
        <>
          <Volume2 className="w-5 h-5" />
          <span>Generate Speech</span>
          <Sparkles className="w-4 h-4 opacity-80" />
        </>
      )}
    </button>
  );
};
