import React from 'react';
import { X, Mic, Cpu, Globe, Shield, Sparkles } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 id="about-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                About TextFlow
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Next-Gen Text-to-Speech Platform</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            <strong>TextFlow</strong> turns written text into natural, lifelike audio in seconds. Built for creator workflows, accessibility, and multi-lingual voice synthesis.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100 text-xs">
                <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Multi-Lingual
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Support for English, Hindi, Gujarati, Marathi, Spanish, French, German, and more.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100 text-xs">
                <Cpu className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Natural Voices
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                High-definition male and female voice models fine-tuned for clarity.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>Built with React, TypeScript, Express, and Tailwind CSS.</span>
          </div>
        </div>

        <div className="pt-2 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
