import React, { useState, useEffect, useCallback } from 'react';
import {
  History as HistoryIcon,
  Search,
  Trash2,
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
  X,
  Volume2,
  Star,
} from 'lucide-react';
import { SpeechHistoryItem, HistoryPagination } from '../types/history';
import {
  getHistoryApi,
  deleteHistoryItemApi,
  clearAllHistoryApi,
  toggleFavoriteApi,
} from '../services/historyService';

interface HistoryPageProps {
  onNavigateStudio: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onNavigateStudio }) => {
  const [historyItems, setHistoryItems] = useState<SpeechHistoryItem[]>([]);
  const [pagination, setPagination] = useState<HistoryPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded text map for long text toggle
  const [expandedTextIds, setExpandedTextIds] = useState<Record<string, boolean>>({});

  // Active audio player state
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Modals
  const [itemToDelete, setItemToDelete] = useState<SpeechHistoryItem | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleFavorite = async (item: SpeechHistoryItem) => {
    const nextFavoriteState = !item.isFavorite;

    // Optimistic UI update
    setHistoryItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isFavorite: nextFavoriteState } : i))
    );

    showToast(nextFavoriteState ? 'Added to favorites' : 'Removed from favorites');

    try {
      await toggleFavoriteApi(item.id, nextFavoriteState);
    } catch (err: any) {
      // Revert optimistic update on failure
      setHistoryItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isFavorite: item.isFavorite } : i))
      );
      showToast(err.message || 'Failed to update favorite.');
    }
  };

  const loadHistory = useCallback(async (pageToLoad: number, search: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getHistoryApi(pageToLoad, 10, search);
      setHistoryItems(data.history || []);
      setPagination(data.pagination);
    } catch (err: any) {
      setError(err.message || 'Unable to load your speech history.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory(pagination.page, searchQuery);
  }, [loadHistory, pagination.page, searchQuery]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
    };
  }, [audioElement]);

  // Play/Pause handler for history items
  const handleTogglePlay = (item: SpeechHistoryItem) => {
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

    // Pause previous audio
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
      alert('Unable to play audio. The audio source may be expired.');
    };

    newAudio.play().then(() => {
      setAudioElement(newAudio);
      setActiveAudioId(item.id);
      setIsPlaying(true);
    }).catch((err) => {
      console.error('Audio playback error:', err);
      alert('Audio playback failed.');
    });
  };

  // Download handler
  const handleDownload = async (item: SpeechHistoryItem) => {
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
      link.download = `textflow-history-${item.id}.mp3`;
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

  // Single Item Delete
  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeletingItem(true);
    try {
      await deleteHistoryItemApi(itemToDelete.id);
      
      // Stop playing if current item is deleted
      if (activeAudioId === itemToDelete.id && audioElement) {
        audioElement.pause();
        setActiveAudioId(null);
        setIsPlaying(false);
      }

      setItemToDelete(null);

      // Check if page becomes empty
      if (historyItems.length === 1 && pagination.page > 1) {
        loadHistory(pagination.page - 1, searchQuery);
      } else {
        loadHistory(pagination.page, searchQuery);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete history item.');
    } finally {
      setIsDeletingItem(false);
    }
  };

  // Clear All History
  const confirmClearAll = async () => {
    setIsClearingAll(true);
    try {
      await clearAllHistoryApi();

      if (audioElement) {
        audioElement.pause();
        setActiveAudioId(null);
        setIsPlaying(false);
      }

      setIsClearAllModalOpen(false);
      loadHistory(1, '');
    } catch (err: any) {
      alert(err.message || 'Failed to clear history.');
    } finally {
      setIsClearingAll(false);
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
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#17301D] text-white text-xs font-semibold shadow-lg border border-[#DDEBDD] animate-in fade-in slide-in-from-bottom-3 duration-200 flex items-center gap-2">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#DDEBDD]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EEF9EF] text-[#176B2C] flex items-center justify-center font-bold">
              <HistoryIcon className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-[#17301D] flex items-center gap-2">
              Speech History
              {pagination.total > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F7FBF7] text-[#17301D] font-semibold border border-[#DDEBDD]">
                  {pagination.total}
                </span>
              )}
            </h1>
          </div>
          <p className="text-xs text-[#65756A]">
            Access and re-play your previously generated speech recordings
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-[#8A978E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#DDEBDD] bg-white text-[#17301D] placeholder-[#8A978E] text-xs focus:outline-none focus:ring-2 focus:ring-[#58B957] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A978E] hover:text-[#17301D]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Clear All Button */}
          {pagination.total > 0 && (
            <button
              type="button"
              onClick={() => setIsClearAllModalOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-[#DDEBDD] bg-white animate-pulse space-y-3"
            >
              <div className="h-4 bg-[#F7FBF7] rounded-md w-3/4"></div>
              <div className="h-3 bg-[#F7FBF7] rounded-md w-1/2"></div>
              <div className="flex gap-2 pt-2">
                <div className="h-8 bg-[#F7FBF7] rounded-lg w-24"></div>
                <div className="h-8 bg-[#F7FBF7] rounded-lg w-24"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl border border-red-200 bg-red-50 text-center space-y-4 max-w-md mx-auto">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-red-900">Unable to load speech history</h3>
            <p className="text-xs text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => loadHistory(pagination.page, searchQuery)}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : historyItems.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-[#DDEBDD] bg-[#F7FBF7]/50 text-center space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-[#EEF9EF] text-[#176B2C] mx-auto flex items-center justify-center">
            <Volume2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#17301D]">No Speech History Yet</h3>
            <p className="text-xs text-[#65756A]">
              {searchQuery
                ? `No speech history matches "${searchQuery}".`
                : 'Generate your first speech recording and it will appear here.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateStudio}
            className="px-4 py-2.5 rounded-xl bg-[#58B957] hover:bg-[#3FA94D] text-white font-semibold text-xs inline-flex items-center gap-2 shadow-sm transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Speech</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {historyItems.map((item) => {
            const isLong = item.text.length > 120;
            const isExpanded = !!expandedTextIds[item.id];
            const displayFormatted = formatDate(item.createdAt);
            const isThisPlaying = activeAudioId === item.id && isPlaying;

            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl border border-[#DDEBDD] bg-white shadow-xs hover:border-[#58B957]/60 transition-all space-y-4"
              >
                {/* Text Content */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed break-words flex-1">
                      {isLong && !isExpanded ? `${item.text.slice(0, 120)}...` : item.text}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleToggleFavorite(item)}
                      aria-label={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                        item.isFavorite
                          ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                          : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          item.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400 hover:text-amber-400'
                        }`}
                      />
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
                    {item.style && item.style !== 'default' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 font-mono text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                        style: {item.style}
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

                    <button
                      type="button"
                      onClick={() => setItemToDelete(item)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Delete History Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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

      {/* Delete Item Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Delete this speech history?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This history item will be permanently removed from your account.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={confirmDeleteItem}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors disabled:opacity-50"
              >
                {isDeletingItem ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Clear all speech history?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to delete all recorded speech history? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isClearingAll}
                onClick={() => setIsClearAllModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearingAll}
                onClick={confirmClearAll}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors disabled:opacity-50"
              >
                {isClearingAll ? 'Clearing...' : 'Clear History'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
