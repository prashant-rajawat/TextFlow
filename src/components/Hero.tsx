import React from 'react';
import { AudioWaveform, Sparkles, Wand2 } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="text-center pt-8 pb-6 px-4 max-w-3xl mx-auto space-y-4">
      {/* Decorative Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60 shadow-xs">
        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        <span>Production-Ready TTS Engine</span>
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
      </div>

      {/* Main Title */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-slate-50 tracking-tight leading-tight">
        Turn Your Text Into <br className="hidden sm:inline" />
        <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-700 bg-clip-text text-transparent">
          Natural Speech
        </span>
      </h1>

      {/* Supporting Description */}
      <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
        Convert written text into clear, natural-sounding speech in seconds. Choose your language and voice, then listen or download the generated audio.
      </p>

      {/* Audio Visual Accent */}
      <div className="flex items-center justify-center gap-1.5 text-indigo-500/80 dark:text-indigo-400/80 pt-1">
        <AudioWaveform className="w-6 h-6" />
        <div className="flex items-center gap-1">
          <span className="w-1 h-3 bg-indigo-500/40 rounded-full"></span>
          <span className="w-1 h-5 bg-indigo-500/70 rounded-full"></span>
          <span className="w-1 h-8 bg-indigo-600 rounded-full"></span>
          <span className="w-1 h-4 bg-indigo-500/70 rounded-full"></span>
          <span className="w-1 h-6 bg-indigo-500/50 rounded-full"></span>
        </div>
      </div>
    </section>
  );
};
