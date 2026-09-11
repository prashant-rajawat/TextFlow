import React, { useState, useEffect, useCallback } from 'react';
import {
  Star,
  Search,
  Play,
  Pause,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  Clock,
  Globe,
  Mic,
  Volume2,
  X,
  Filter,
} from 'lucide-react';
import { FavoriteItem } from '../types/favorite';
import { HistoryPagination } from '../types/history';
import { getFavoritesApi, toggleFavoriteApi } from '../services/historyService';

interface FavoritesPageProps {
  onNavigateStudio: () => void;
}

export const FavoritesPage: React.FC<FavoritesPageProps> = ({ onNavigateStudio }) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [pagination, setPagination] = useState<HistoryPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [languageFilter, setLanguageFilter] = useState('');
  const [voiceFilter, setVoiceFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded text map
  const [expandedTextIds, setExpandedTextIds] = useState<Record<string, boolean>>({});

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active audio player
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadFavorites = useCallback(async (pageToLoad: number, lang: string, voice: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getFavoritesApi(pageToLoad, 10, lang, voice);
      setFavorites(data.favorites || []);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || 'Unable to load your favorites.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites(pagination.page, languageFilter, voiceFilter);
  }, [loadFavorites, pagination.page, languageFilter, voiceFilter]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  // Handle Play/Pause
  const handleTogglePlay = (item: FavoriteItem) => {
    if (activeAudioId === item.id) {
      if (isPlaying && audioElement) {
        audioElement.pause();
        setIsPlaying(false);
      } else if (audioElement) {
        audioElement.play().catch(console.error);
        setIsPlaying(true);
      }
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const newAudio = new Audio(item.audioUrl);
    newAudio.onended = () => {
      setIsPlaying(false);
      setActiveAudioId(null);
    };
    newAudio.onerror = () => {
      setIsPlaying(false);
      setActiveAudioId(null);
      showToast('This audio is no longer available.');
    };

    newAudio
      .play()
      .then(() => {
        setAudioElement(newAudio);
        setActiveAudioId(item.id);
        setIsPlaying(true);
      })
      .catch((err) => {
        console.error('Audio playback error:', err);
        showToast('This audio is no longer available.');
      });
  };

  // Handle Download
  const handleDownload = async (item: FavoriteItem) => {
    try {
      let downloadUrl = item.audioUrl;
      let blobToRevoke: string | null = null;

      if (!downloadUrl.startsWith('data:') && !downloadUrl.startsWith('blob:')) {
        const response = await fetch(downloadUrl);
        const blob = await response.blob();
        downloadUrl = URL.createObjectURL(blob);
        blobToRevoke = downloadUrl;
      }

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `textflow-favorite-${item.id}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      if (blobToRevoke) {
        setTimeout(() => URL.revokeObjectURL(blobToRevoke!), 5000);
      }
    } catch (err) {
      console.error('Download error:', err);
      window.open(item.audioUrl, '_blank');
    }
  };

  // Remove from Favorites
  const handleRemoveFavorite = async (item: FavoriteItem) => {
    // Optimistic removal from list
    setFavorites((prev) => prev.filter((f) => f.id !== item.id));
    setPagination((prev) => ({
      ...prev,
      total: Math.max(0, prev.total - 1),
    }));

    try {
      await toggleFavoriteApi(item.id, false);
      showToast('Removed from favorites');

      // Stop audio if playing
      if (activeAudioId === item.id && audioElement) {
        audioElement.pause();
        setActiveAudioId(null);
        setIsPlaying(false);
      }
    } catch (err: any) {
      // Revert if API fails
      setFavorites((prev) => [item, ...prev]);
      setPagination((prev) => ({ ...prev, total: prev.total + 1 }));
      showToast(err.message || 'Failed to remove favorite.');
    }
  };

  const toggleExpandText = (id: string) => {
    setExpandedTextIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return {
        date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      };
    } catch {
      return { date: 'Recent', time: '' };
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 space-y-6 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold shadow-lg border border-slate-700/50 dark:border-slate-200/50 animate-in fade-in slide-in-from-bottom-3 duration-200 flex items-center gap-2">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Filter Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center font-bold">
              <Star className="w-4 h-4 fill-current" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Favorites
              {pagination.total > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
                  {pagination.total}
                </span>
              )}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Quickly access your starred speech audio recordings
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-44">
            <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              placeholder="Filter language..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            {languageFilter && (
              <button
                type="button"
                onClick={() => setLanguageFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="relative flex-1 sm:w-44">
            <Mic className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={voiceFilter}
              onChange={(e) => setVoiceFilter(e.target.value)}
              placeholder="Filter voice..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            {voiceFilter && (
              <button
                type="button"
                onClick={() => setVoiceFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse space-y-3"
            >
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-3/4"></div>
              <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded-md w-1/2"></div>
              <div className="flex gap-2 pt-2">
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-24"></div>
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-24"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 text-center space-y-4 max-w-md mx-auto">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-red-900 dark:text-red-200">Unable to load your favorites.</h3>
            <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => loadFavorites(pagination.page, languageFilter, voiceFilter)}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : favorites.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-center space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 dark:text-amber-400 mx-auto flex items-center justify-center">
            <Star className="w-6 h-6 fill-current" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">No Favorites Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Star your favorite generated speech to find it quickly here.
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateStudio}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs inline-flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Speech</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {favorites.map((item) => {
            const isLong = item.text.length > 120;
            const isExpanded = !!expandedTextIds[item.id];
            const displayFormatted = formatDate(item.createdAt);
            const isThisPlaying = activeAudioId === item.id && isPlaying;

            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:border-amber-200 dark:hover:border-amber-900/50 transition-all space-y-4"
              >
                {/* Text Content */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed break-words flex-1">
                      {isLong && !isExpanded ? `${item.text.slice(0, 120)}...` : item.text}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemoveFavorite(item)}
                      aria-label="Remove from favorites"
                      className="p-1.5 rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors shrink-0"
                      title="Remove from favorites"
                    >
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    </button>
                  </div>
                  {isLong && (
                    <button
                      type="button"
                      onClick={() => toggleExpandText(item.id)}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none"
                    >
                      {isExpanded ? 'Show less' : 'Show full text'}
                    </button>
                  )}
                </div>

                {/* Metadata Badges */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold text-[11px] text-slate-700 dark:text-slate-300">
                      <Globe className="w-3 h-3 text-indigo-500" />
                      {item.language}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-semibold text-[11px] text-slate-700 dark:text-slate-300">
                      <Mic className="w-3 h-3 text-indigo-500" />
                      {item.voice}
                    </span>
                    {typeof item.speed === 'number' && item.speed !== 1.0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 font-mono text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                        {item.speed}x speed
                      </span>
                    )}
                    {typeof item.pitch === 'number' && item.pitch !== 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 font-mono text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                        pitch {item.pitch > 0 ? `+${item.pitch}` : item.pitch}
                      </span>
                    )}
                    {typeof item.volume === 'number' && item.volume !== 100 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 font-mono text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                        vol {item.volume}%
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 ml-1">
                      <Clock className="w-3 h-3" />
                      {displayFormatted.date} • {displayFormatted.time}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTogglePlay(item)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isThisPlaying
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
                      }`}
                    >
                      {isThisPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownload(item)}
                      className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Download Audio"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination Bar */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
