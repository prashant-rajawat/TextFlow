import React from 'react';
import { Sparkles, Check, X, AlertTriangle, ArrowRight, ArrowDown } from 'lucide-react';
import { AIEnhanceReviewData } from '../types/ai';

interface AIEnhanceReviewModalProps {
  reviewData: AIEnhanceReviewData | null;
  onApply: () => void;
  onDiscard: () => void;
}

const OPERATION_LABELS: Record<string, string> = {
  grammar: 'Grammar Improvement',
  rewrite: 'Rewritten Version',
  summarize: 'Concise Summary',
  conversational: 'Conversational Version',
};

export const AIEnhanceReviewModal: React.FC<AIEnhanceReviewModalProps> = ({
  reviewData,
  onApply,
  onDiscard,
}) => {
  if (!reviewData) return null;

  const isOverLimit = reviewData.enhancedCharCount > 5000;
  const charDiff = reviewData.enhancedCharCount - reviewData.originalCharCount;
  const wordDiff = reviewData.enhancedWordCount - reviewData.originalWordCount;
  const operationTitle = OPERATION_LABELS[reviewData.operation] || 'Enhanced Text';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-review-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 id="ai-review-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                Review {operationTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Compare the AI enhancement with your original text before applying changes.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onDiscard}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close review dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Over-limit Warning Banner if > 5000 chars */}
          {isOverLimit && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex items-start gap-3 text-amber-900 dark:text-amber-200 text-xs leading-relaxed"
            >
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">
                  The enhanced text exceeds the 5,000-character limit. Please shorten it before generating speech.
                </p>
                <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/90">
                  You can apply this text and manually edit it in the text editor to shorten it.
                </p>
              </div>
            </div>
          )}

          {/* Comparison Panels */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original Text Panel */}
            <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-100/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Original Text
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {reviewData.originalCharCount} chars · {reviewData.originalWordCount} words
                </span>
              </div>
              <div className="p-4 text-xs sm:text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[260px] overflow-y-auto select-text font-normal">
                {reviewData.originalText}
              </div>
            </div>

            {/* Enhanced Text Panel */}
            <div className="flex flex-col rounded-xl border border-indigo-200/90 dark:border-indigo-900/60 bg-indigo-50/20 dark:bg-indigo-950/20 overflow-hidden">
              <div className="px-4 py-2.5 bg-indigo-100/60 dark:bg-indigo-900/40 border-b border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Enhanced Text
                </span>
                <span className={`font-medium ${isOverLimit ? 'text-red-600 dark:text-red-400 font-bold' : 'text-indigo-700 dark:text-indigo-300'}`}>
                  {reviewData.enhancedCharCount} chars · {reviewData.enhancedWordCount} words
                  {charDiff !== 0 && (
                    <span className="ml-1 text-slate-500 dark:text-slate-400">
                      ({charDiff > 0 ? `+${charDiff}` : charDiff})
                    </span>
                  )}
                </span>
              </div>
              <div className="p-4 text-xs sm:text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap leading-relaxed max-h-[260px] overflow-y-auto select-text font-normal">
                {reviewData.enhancedText}
              </div>
            </div>
          </div>

          {/* Quick Metrics Comparison Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-100/60 dark:bg-slate-800/40 rounded-lg text-xs text-slate-600 dark:text-slate-400">
            <span className="font-medium">Summary of Changes:</span>
            <div className="flex items-center gap-4">
              <span>
                Length:{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {charDiff > 0 ? `+${charDiff} chars` : charDiff < 0 ? `${charDiff} chars` : 'Same length'}
                </strong>
              </span>
              <span>
                Word count:{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {wordDiff > 0 ? `+${wordDiff} words` : wordDiff < 0 ? `${wordDiff} words` : 'Same word count'}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onDiscard}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <X className="w-4 h-4" />
            Keep Original
          </button>

          <button
            type="button"
            onClick={onApply}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <Check className="w-4 h-4" />
            Use Enhanced Text
          </button>
        </div>
      </div>
    </div>
  );
};
