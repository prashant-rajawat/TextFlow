import React from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { Language } from '../types/tts';
import { SUPPORTED_LANGUAGES } from '../services/ttsService';

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageChange: (code: string) => void;
  languages?: Language[];
  disabled?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
  languages = SUPPORTED_LANGUAGES,
  disabled = false,
}) => {
  return (
    <div className="w-full space-y-1.5">
      <label
        htmlFor="language-select"
        className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
      >
        <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        Language
      </label>

      <div className="relative">
        <select
          id="language-select"
          value={selectedLanguage}
          onChange={(e) => onLanguageChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none px-3.5 py-2.5 pr-10 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs transition-colors cursor-pointer disabled:bg-slate-50 dark:disabled:bg-slate-950 disabled:cursor-not-allowed"
          aria-label="Select speech language"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name} ({lang.nativeName})
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
