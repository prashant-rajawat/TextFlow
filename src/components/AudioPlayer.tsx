import React, { useRef, useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Pause, Music, Info, CheckCircle2, ShieldCheck } from 'lucide-react';
import { DownloadButton } from './DownloadButton';
import { AudioResult } from '../types/tts';

interface AudioPlayerProps {
  result: AudioResult | null;
  isLoading?: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ result, isLoading = false }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Reset player state when result changes
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, [result?.audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current || !result?.audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || result?.durationSeconds || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.muted = false;
      setIsMuted(false);
    } else {
      audioRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Empty state when no audio result is present
  if (!result && !isLoading) {
    return (
      <div className="w-full bg-[#F6FBF7] border border-dashed border-[#DCEBDD] rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-[#EAF7EC] flex items-center justify-center text-[#5FBF6B]">
          <Music className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[#18301D]">
            Generated Audio Player
          </h3>
          <p className="text-sm text-[#647568] mt-1 max-w-sm">
            Your generated speech audio will appear here after clicking "Generate Speech".
          </p>
        </div>
      </div>
    );
  }

  // Loading skeleton state
  if (isLoading) {
    return (
      <div className="w-full bg-white border border-[#DCEBDD] rounded-2xl p-6 shadow-xs space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 bg-[#F6FBF7] rounded"></div>
          <div className="h-8 w-28 bg-[#F6FBF7] rounded"></div>
        </div>
        <div className="h-12 bg-[#F6FBF7] rounded-xl"></div>
      </div>
    );
  }

  const hasRealAudioUrl = Boolean(result?.audioUrl && result.audioUrl.trim() !== '');

  return (
    <div className="w-full bg-white border border-[#DCEBDD] rounded-2xl p-6 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#DCEBDD]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-[#18301D]">
              Generated Audio
            </h3>
            {result?.isSecurelyStored || result?.audioStoragePath ? (
              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium bg-[#EAF7EC] text-[#2F7D3F] border border-[#DCEBDD]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#5FBF6B]" />
                Securely Stored
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-[#EAF7EC] text-[#2F7D3F] border border-[#DCEBDD]">
                <CheckCircle2 className="w-3 h-3 text-[#5FBF6B]" />
                Audio Ready
              </span>
            )}
          </div>
          <p className="text-xs text-[#647568] mt-0.5">
            Voice: <span className="font-medium text-[#18301D]">{result?.voiceName}</span> ({result?.languageName})
          </p>
        </div>

        <DownloadButton
          audioUrl={result?.audioUrl}
          filename={`speech-${result?.languageName.toLowerCase() || 'audio'}.mp3`}
          disabled={!hasRealAudioUrl}
        />
      </div>

      {hasRealAudioUrl ? (
        <div className="space-y-3">
          <audio
            ref={audioRef}
            src={result?.audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />

          <div className="flex items-center gap-4 bg-[#F6FBF7] p-4 rounded-xl border border-[#DCEBDD]">
            <button
              type="button"
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-[#5FBF6B] hover:bg-[#2F7D3F] text-white flex items-center justify-center shadow-sm transition-transform active:scale-95 shrink-0 focus:outline-none focus:ring-2 focus:ring-[#5FBF6B]"
              aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <div className="flex-1 space-y-1">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-[#DCEBDD] rounded-lg appearance-none cursor-pointer accent-[#5FBF6B]"
                aria-label="Seek time slider"
              />
              <div className="flex justify-between text-xs text-[#647568] font-mono">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleMute}
                className="text-[#647568] hover:text-[#18301D]"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1.5 bg-[#DCEBDD] rounded-lg appearance-none cursor-pointer accent-[#5FBF6B]"
                aria-label="Volume slider"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#EAF7EC] border border-[#DCEBDD] rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-[#5FBF6B] shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-semibold text-[#18301D]">
              Frontend Ready for Express Backend Stream
            </p>
            <p className="text-[#647568] text-xs leading-relaxed">
              The interface component hierarchy, state machine, and service wrappers are verified. Connecting to <code className="bg-white px-1 py-0.5 rounded text-[#2F7D3F] border border-[#DCEBDD]">POST /api/tts</code> in the next phase will stream audio binary directly into this media controller.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

