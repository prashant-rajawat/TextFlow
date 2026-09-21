import React from 'react';
import { AudioWaveform, Sparkles } from 'lucide-react';

export const Hero: React.FC = () => {
  return (
    <section className="text-center pt-8 pb-6 px-4 max-w-3xl mx-auto space-y-4">
      {/* Decorative Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#EEF9EF] text-[#176B2C] border border-[#DDEBDD] shadow-xs">
        <Sparkles className="w-3.5 h-3.5 text-[#58B957]" />
        <span>Production-Ready TTS Engine</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#58B957] animate-pulse"></span>
      </div>

      {/* Main Title */}
      <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#17301D] tracking-tight leading-tight">
        Turn Your Text Into <br className="hidden sm:inline" />
        <span className="text-[#176B2C]">
          Natural Speech.
        </span>
      </h1>

      {/* Supporting Description */}
      <p className="text-base sm:text-lg text-[#65756A] leading-relaxed max-w-2xl mx-auto">
        Create realistic, high-quality voiceovers in seconds with the power of AI. Choose your language and voice, then listen or download the generated audio.
      </p>

      {/* Audio Visual Accent */}
      <div className="flex items-center justify-center gap-1.5 text-[#58B957] pt-1">
        <AudioWaveform className="w-6 h-6" />
        <div className="flex items-center gap-1">
          <span className="w-1 h-3 bg-[#58B957]/40 rounded-full"></span>
          <span className="w-1 h-5 bg-[#58B957]/70 rounded-full"></span>
          <span className="w-1 h-8 bg-[#58B957] rounded-full"></span>
          <span className="w-1 h-4 bg-[#58B957]/70 rounded-full"></span>
          <span className="w-1 h-6 bg-[#58B957]/50 rounded-full"></span>
        </div>
      </div>
    </section>
  );
};


