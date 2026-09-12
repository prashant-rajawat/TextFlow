import React from 'react';
import { Sliders, RotateCcw, Volume2, Gauge, Music, Sparkles } from 'lucide-react';
import { Voice, VoiceSettingsState } from '../types/tts';

interface VoiceSettingsProps {
  settings: VoiceSettingsState;
  onChange: (newSettings: VoiceSettingsState) => void;
  selectedVoice?: Voice | null;
  disabled?: boolean;
}

export const VoiceSettings: React.FC<VoiceSettingsProps> = ({
  settings,
  onChange,
  selectedVoice,
  disabled = false,
}) => {
  // Voice capabilities checking
  const isSpeedSupported = selectedVoice?.capabilities ? selectedVoice.capabilities.speed : true;
  const isPitchSupported = selectedVoice?.capabilities ? selectedVoice.capabilities.pitch : true;
  const isVolumeSupported = selectedVoice?.capabilities ? selectedVoice.capabilities.volume : true;
  const isStyleSupported = selectedVoice?.capabilities ? selectedVoice.capabilities.style : false;
  const supportedStyles = selectedVoice?.supportedStyles || [];

  const handleReset = () => {
    onChange({
      speed: 1.0,
      pitch: 0,
      volume: 100,
      style: 'default',
    });
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...settings,
      speed: parseFloat(e.target.value),
    });
  };

  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...settings,
      pitch: parseInt(e.target.value, 10),
    });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...settings,
      volume: parseInt(e.target.value, 10),
    });
  };

  const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...settings,
      style: e.target.value,
    });
  };

  const speedPresets = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const volumePresets = [0, 25, 50, 75, 100];
  const pitchPresets = [
    { label: 'Lower', value: -20 },
    { label: 'Default', value: 0 },
    { label: 'Higher', value: 20 },
  ];

  const isAtDefaults =
    settings.speed === 1.0 &&
    settings.pitch === 0 &&
    settings.volume === 100 &&
    (settings.style === 'default' || !settings.style);

  return (
    <div className="w-full bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 sm:p-5 space-y-4 transition-all">
      {/* Header & Reset Button */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Voice Settings
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fine-tune speed, pitch, volume, and styles according to voice capabilities.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleReset}
          disabled={disabled || isAtDefaults}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          aria-label="Reset voice settings to defaults"
          title="Reset to provider defaults (1x Speed, 0 Pitch, 100% Volume)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Sliders & Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
        {/* Speaking Speed */}
        <div className={`space-y-2 ${!isSpeedSupported ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between">
            <label
              htmlFor="speed-slider"
              className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5"
            >
              <Gauge className="w-3.5 h-3.5 text-indigo-500" />
              Speaking Speed
            </label>
            <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50">
              {settings.speed.toFixed(2)}x
            </span>
          </div>

          <input
            id="speed-slider"
            type="range"
            min="0.5"
            max="2.0"
            step="0.05"
            value={settings.speed}
            onChange={handleSpeedChange}
            disabled={disabled || !isSpeedSupported}
            aria-label="Speaking Speed"
            aria-valuenow={settings.speed}
            aria-valuemin={0.5}
            aria-valuemax={2.0}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {!isSpeedSupported ? (
            <p className="text-[11px] text-amber-500/90 dark:text-amber-400/90 italic">
              Speaking speed is not supported by this voice.
            </p>
          ) : (
            /* Speed Presets */
            <div className="flex items-center justify-between gap-1 pt-0.5">
              {speedPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onChange({ ...settings, speed: preset })}
                  disabled={disabled}
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded transition-colors ${
                    Math.abs(settings.speed - preset) < 0.02
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-200/60 dark:bg-slate-800/60'
                  }`}
                >
                  {preset}x
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pitch */}
        <div className={`space-y-2 ${!isPitchSupported ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between">
            <label
              htmlFor="pitch-slider"
              className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5"
            >
              <Music className="w-3.5 h-3.5 text-indigo-500" />
              Pitch
            </label>
            <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50">
              {settings.pitch > 0 ? `+${settings.pitch}` : settings.pitch}
            </span>
          </div>

          <input
            id="pitch-slider"
            type="range"
            min="-20"
            max="20"
            step="1"
            value={settings.pitch}
            onChange={handlePitchChange}
            disabled={disabled || !isPitchSupported}
            aria-label="Pitch"
            aria-valuenow={settings.pitch}
            aria-valuemin={-20}
            aria-valuemax={20}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {!isPitchSupported ? (
            <p className="text-[11px] text-amber-500/90 dark:text-amber-400/90 italic">
              Pitch adjustment is not supported by this voice.
            </p>
          ) : (
            <div className="flex items-center justify-between gap-1 pt-0.5">
              {pitchPresets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onChange({ ...settings, pitch: preset.value })}
                  disabled={disabled}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors ${
                    settings.pitch === preset.value
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-200/60 dark:bg-slate-800/60'
                  }`}
                >
                  {preset.label} ({preset.value > 0 ? `+${preset.value}` : preset.value})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Volume */}
        <div className={`space-y-2 ${!isVolumeSupported ? 'opacity-60' : ''}`}>
          <div className="flex items-center justify-between">
            <label
              htmlFor="volume-slider"
              className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5"
            >
              <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
              Volume
            </label>
            <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50">
              {settings.volume}%
            </span>
          </div>

          <input
            id="volume-slider"
            type="range"
            min="0"
            max="100"
            step="5"
            value={settings.volume}
            onChange={handleVolumeChange}
            disabled={disabled || !isVolumeSupported}
            aria-label="Volume"
            aria-valuenow={settings.volume}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:accent-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />

          {!isVolumeSupported ? (
            <p className="text-[11px] text-amber-500/90 dark:text-amber-400/90 italic">
              Volume adjustment is not supported by this voice.
            </p>
          ) : (
            <div className="flex items-center justify-between gap-1 pt-0.5">
              {volumePresets.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => onChange({ ...settings, volume: pct })}
                  disabled={disabled}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded transition-colors ${
                    settings.volume === pct
                      ? 'bg-indigo-600 text-white dark:bg-indigo-500 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-200/60 dark:bg-slate-800/60'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Voice Style */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="style-select"
              className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Voice Style
            </label>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {isStyleSupported ? 'Available' : 'Unsupported'}
            </span>
          </div>

          <select
            id="style-select"
            value={isStyleSupported ? settings.style : 'default'}
            onChange={handleStyleChange}
            disabled={disabled || !isStyleSupported}
            className={`w-full appearance-none px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors ${
              !isStyleSupported
                ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-80'
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 cursor-pointer'
            }`}
            aria-label="Voice Style"
          >
            <option value="default">Default</option>
            {isStyleSupported &&
              supportedStyles.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
          </select>

          {!isStyleSupported && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
              Voice style is not supported by this voice.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

