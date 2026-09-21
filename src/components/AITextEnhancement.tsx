import React, { useState, useRef } from 'react';
import {
  Sparkles,
  CheckCheck,
  RefreshCw,
  FileText,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { AIEnhanceOperation } from '../types/ai';

interface AITextEnhancementProps {
  onEnhance: (operation: AIEnhanceOperation) => Promise<void>;
  isEnhancing: boolean;
  activeOperation: AIEnhanceOperation | null;
  disabled?: boolean;
  hasText: boolean;
  isOverLimit?: boolean;
}

export const AITextEnhancement: React.FC<AITextEnhancementProps> = ({
  onEnhance,
  isEnhancing,
  activeOperation,
  disabled = false,
  hasText,
  isOverLimit = false,
}) => {
  // Local request lock ref to guard against double-clicks
  const isLockedRef = useRef<boolean>(false);

  const handleActionClick = async (operation: AIEnhanceOperation) => {
    if (isLockedRef.current || isEnhancing || disabled || !hasText || isOverLimit) {
      return;
    }

    try {
      isLockedRef.current = true;
      await onEnhance(operation);
    } finally {
      isLockedRef.current = false;
    }
  };

  const isButtonsDisabled = isEnhancing || disabled || !hasText || isOverLimit;

  return (
    <div className="w-full rounded-2xl border border-[#DCEBDD] bg-white p-4 sm:p-5 space-y-3.5 shadow-sm transition-all">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[#DCEBDD]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#5FBF6B] text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#18301D] flex items-center gap-1.5">
              AI Text Enhancement
            </h3>
            <p className="text-xs text-[#647568]">
              Improve your text before converting it to speech.
            </p>
          </div>
        </div>

        {isEnhancing && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2F7D3F] px-2.5 py-1 rounded-full bg-[#EAF7EC] border border-[#DCEBDD] animate-pulse self-start sm:self-auto">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5FBF6B]" />
            <span>
              {activeOperation === 'grammar'
                ? 'Improving text...'
                : activeOperation === 'rewrite'
                ? 'Rewriting...'
                : activeOperation === 'summarize'
                ? 'Summarizing...'
                : activeOperation === 'conversational'
                ? 'Making conversational...'
                : 'Enhancing text...'}
            </span>
          </div>
        )}
      </div>

      {/* Responsive Enhancement Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* 1. Improve Grammar */}
        <button
          type="button"
          onClick={() => handleActionClick('grammar')}
          disabled={isButtonsDisabled}
          aria-label="Improve grammar, spelling, and punctuation"
          className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all select-none min-h-[44px] ${
            activeOperation === 'grammar' && isEnhancing
              ? 'bg-[#5FBF6B] text-white border-[#5FBF6B] shadow-sm ring-2 ring-[#5FBF6B]/30'
              : 'bg-white hover:bg-[#EAF7EC] text-[#18301D] hover:text-[#2F7D3F] border-[#DCEBDD] hover:border-[#8BCF8B] shadow-xs'
          } ${
            isButtonsDisabled && !(activeOperation === 'grammar' && isEnhancing)
              ? 'opacity-60 cursor-not-allowed hover:bg-white hover:text-[#18301D] hover:border-[#DCEBDD]'
              : 'cursor-pointer active:scale-[0.98]'
          }`}
        >
          {activeOperation === 'grammar' && isEnhancing ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-white" />
          ) : (
            <CheckCheck className="w-4 h-4 text-[#5FBF6B] shrink-0" />
          )}
          <span>
            {activeOperation === 'grammar' && isEnhancing
              ? 'Improving text...'
              : 'Improve Grammar'}
          </span>
        </button>

        {/* 2. Rewrite */}
        <button
          type="button"
          onClick={() => handleActionClick('rewrite')}
          disabled={isButtonsDisabled}
          aria-label="Rewrite text for clarity and structure"
          className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all select-none min-h-[44px] ${
            activeOperation === 'rewrite' && isEnhancing
              ? 'bg-[#5FBF6B] text-white border-[#5FBF6B] shadow-sm ring-2 ring-[#5FBF6B]/30'
              : 'bg-white hover:bg-[#EAF7EC] text-[#18301D] hover:text-[#2F7D3F] border-[#DCEBDD] hover:border-[#8BCF8B] shadow-xs'
          } ${
            isButtonsDisabled && !(activeOperation === 'rewrite' && isEnhancing)
              ? 'opacity-60 cursor-not-allowed hover:bg-white hover:text-[#18301D] hover:border-[#DCEBDD]'
              : 'cursor-pointer active:scale-[0.98]'
          }`}
        >
          {activeOperation === 'rewrite' && isEnhancing ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-white" />
          ) : (
            <RefreshCw className="w-4 h-4 text-[#5FBF6B] shrink-0" />
          )}
          <span>
            {activeOperation === 'rewrite' && isEnhancing
              ? 'Rewriting...'
              : 'Rewrite'}
          </span>
        </button>

        {/* 3. Summarize */}
        <button
          type="button"
          onClick={() => handleActionClick('summarize')}
          disabled={isButtonsDisabled}
          aria-label="Summarize text concisely"
          className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all select-none min-h-[44px] ${
            activeOperation === 'summarize' && isEnhancing
              ? 'bg-[#5FBF6B] text-white border-[#5FBF6B] shadow-sm ring-2 ring-[#5FBF6B]/30'
              : 'bg-white hover:bg-[#EAF7EC] text-[#18301D] hover:text-[#2F7D3F] border-[#DCEBDD] hover:border-[#8BCF8B] shadow-xs'
          } ${
            isButtonsDisabled && !(activeOperation === 'summarize' && isEnhancing)
              ? 'opacity-60 cursor-not-allowed hover:bg-white hover:text-[#18301D] hover:border-[#DCEBDD]'
              : 'cursor-pointer active:scale-[0.98]'
          }`}
        >
          {activeOperation === 'summarize' && isEnhancing ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-white" />
          ) : (
            <FileText className="w-4 h-4 text-[#5FBF6B] shrink-0" />
          )}
          <span>
            {activeOperation === 'summarize' && isEnhancing
              ? 'Summarizing...'
              : 'Summarize'}
          </span>
        </button>

        {/* 4. Make Conversational */}
        <button
          type="button"
          onClick={() => handleActionClick('conversational')}
          disabled={isButtonsDisabled}
          aria-label="Make text conversational and natural when spoken"
          className={`flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all select-none min-h-[44px] ${
            activeOperation === 'conversational' && isEnhancing
              ? 'bg-[#5FBF6B] text-white border-[#5FBF6B] shadow-sm ring-2 ring-[#5FBF6B]/30'
              : 'bg-white hover:bg-[#EAF7EC] text-[#18301D] hover:text-[#2F7D3F] border-[#DCEBDD] hover:border-[#8BCF8B] shadow-xs'
          } ${
            isButtonsDisabled && !(activeOperation === 'conversational' && isEnhancing)
              ? 'opacity-60 cursor-not-allowed hover:bg-white hover:text-[#18301D] hover:border-[#DCEBDD]'
              : 'cursor-pointer active:scale-[0.98]'
          }`}
        >
          {activeOperation === 'conversational' && isEnhancing ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-white" />
          ) : (
            <MessageSquare className="w-4 h-4 text-[#5FBF6B] shrink-0" />
          )}
          <span>
            {activeOperation === 'conversational' && isEnhancing
              ? 'Making conversational...'
              : 'Make Conversational'}
          </span>
        </button>
      </div>
    </div>
  );
};

