import React from 'react';
import { X, FileText } from 'lucide-react';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  disabled?: boolean;
  error?: string | null;
}

export const TextInput: React.FC<TextInputProps> = ({
  value,
  onChange,
  maxLength = 5000,
  disabled = false,
  error = null,
}) => {
  const characterCount = value.length;
  
  // Calculate word count accurately ignoring multiple, leading, or trailing whitespace
  const trimmed = value.trim();
  const wordCount = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  
  const isOverLimit = characterCount > maxLength;

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor="tts-text-input"
          className="text-sm font-medium text-[#18301D] flex items-center gap-1.5"
        >
          <FileText className="w-4 h-4 text-[#5FBF6B]" />
          Text Content
        </label>
        
        {value.length > 0 && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-[#647568] hover:text-[#18301D] flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-[#F6FBF7] focus:outline-none focus:ring-2 focus:ring-[#5FBF6B]"
            aria-label="Clear input text"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      <div className="relative">
        <textarea
          id="tts-text-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter or paste your text here to convert into natural speech..."
          disabled={disabled}
          rows={6}
          aria-invalid={Boolean(error || isOverLimit)}
          aria-describedby="text-input-counter text-input-error"
          className={`w-full p-4 rounded-xl border text-[#18301D] bg-white placeholder:text-[#647568] text-base leading-relaxed resize-y min-h-[160px] max-h-[400px] transition-all duration-200 focus:outline-none focus:ring-2 ${
            error || isOverLimit
              ? 'border-red-400 focus:ring-red-400/30'
              : 'border-[#DCEBDD] focus:border-[#5FBF6B] focus:ring-[#5FBF6B]/20 shadow-xs'
          } ${disabled ? 'bg-[#F6FBF7] text-[#647568] cursor-not-allowed' : ''}`}
        />
      </div>

      <div
        id="text-input-counter"
        className="flex flex-wrap items-center justify-between text-xs text-[#647568] pt-1"
      >
        <div className="flex items-center gap-4">
          <span>
            Words: <strong className="font-semibold text-[#18301D]">{wordCount}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span>Characters:</span>
          <span
            className={`font-semibold ${
              isOverLimit
                ? 'text-red-600 font-bold'
                : characterCount > maxLength * 0.9
                ? 'text-amber-600'
                : 'text-[#18301D]'
            }`}
          >
            {characterCount}
          </span>
          <span>/ {maxLength}</span>
        </div>
      </div>
    </div>
  );
};

