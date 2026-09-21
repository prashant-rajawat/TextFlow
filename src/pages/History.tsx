import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  VolumeX,
  Heart,
  Calendar,
  FileAudio,
  MoreVertical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SpeechHistoryItem, HistoryPagination } from '../types/history';
import {
  getHistoryApi,
  deleteHistoryItemApi,
  clearAllHistoryApi,
  toggleFavoriteApi,
  getAudioSignedUrlApi,
  downloadHistoryAudioApi,
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
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded text map for long text toggle
  const [expandedTextIds, setExpandedTextIds] = useState<Record<string, boolean>>({});

  // Active audio player state
  const [activeAudioId, setActiveAudioId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Cache durations of audio items
  const [durationsMap, setDurationsMap] = useState<Record<string, number>>({});

  // Three-dot more menu state
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
        audioElementRef.current = null;
      }
    };
  }, []);

  // Play/Pause handler for history items
  const handleTogglePlay = async (item: SpeechHistoryItem) => {
    if (activeAudioId === item.id) {
      if (isPlaying && audioElementRef.current) {
        audioElementRef.current.pause();
        setIsPlaying(false);
      } else if (audioElementRef.current) {
        audioElementRef.current.play().catch(console.error);
        setIsPlaying(true);
      }
      return;
    }

    // Pause previous audio
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
    }

    const playWithUrl = async (url: string, isRetry: boolean = false) => {
      const newAudio = new Audio(url);
      audioElementRef.current = newAudio;
      newAudio.volume = isMuted ? 0 : volume;

      newAudio.ontimeupdate = () => {
        setCurrentTime(newAudio.currentTime);
      };

      newAudio.onloadedmetadata = () => {
        const itemDur = newAudio.duration || 0;
        setDuration(itemDur);
        if (itemDur > 0) {
          setDurationsMap((prev) => ({ ...prev, [item.id]: itemDur }));
        }
      };

      newAudio.onended = () => {
        setIsPlaying(false);
        setActiveAudioId(null);
        setCurrentTime(0);
      };

      newAudio.onerror = async () => {
        if (!isRetry && item.id) {
          try {
            const freshUrl = await getAudioSignedUrlApi(item.id);
            if (freshUrl) {
              setHistoryItems((prev) =>
                prev.map((i) => (i.id === item.id ? { ...i, audioUrl: freshUrl } : i))
              );
              await playWithUrl(freshUrl, true);
              return;
            }
          } catch (e) {
            console.error('Failed to get fresh signed URL on error retry:', e);
          }
        }
        setIsPlaying(false);
        setActiveAudioId(null);
        showToast('Unable to play audio. The source may be expired.');
      };

      try {
        await newAudio.play();
        setActiveAudioId(item.id);
        setIsPlaying(true);
      } catch (err) {
        if (!isRetry && item.id) {
          try {
            const freshUrl = await getAudioSignedUrlApi(item.id);
            if (freshUrl) {
              setHistoryItems((prev) =>
                prev.map((i) => (i.id === item.id ? { ...i, audioUrl: freshUrl } : i))
              );
              await playWithUrl(freshUrl, true);
              return;
            }
          } catch (e) {
            console.error('Failed to get fresh signed URL on catch retry:', e);
          }
        }
        console.error('Audio playback error:', err);
        showToast('Audio playback failed.');
        setIsPlaying(false);
        setActiveAudioId(null);
      }
    };

    if (item.audioUrl) {
      await playWithUrl(item.audioUrl);
    } else {
      showToast('Audio recording is not available.');
    }
  };

  // Handle Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(e.target.value);
    setCurrentTime(seekTime);
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = seekTime;
    }
  };

  // Handle Volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioElementRef.current) {
      audioElementRef.current.volume = val;
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (audioElementRef.current) {
        audioElementRef.current.volume = volume || 1;
      }
    } else {
      setIsMuted(true);
      if (audioElementRef.current) {
        audioElementRef.current.volume = 0;
      }
    }
  };

  // Download handler
  const handleDownload = async (item: SpeechHistoryItem) => {
    try {
      // If local blob or data URL, download directly
      if (item.audioUrl && (item.audioUrl.startsWith('blob:') || item.audioUrl.startsWith('data:'))) {
        const link = document.createElement('a');
        link.href = item.audioUrl;
        link.download = `textflow-${item.id}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Download started');
        return;
      }

      await downloadHistoryAudioApi(item.id, `textflow-${item.id}.mp3`);
      showToast('Download started');
    } catch (err: any) {
      console.error('Download error via API, attempting direct URL download:', err);
      try {
        let downloadUrl = item.audioUrl;
        if (!downloadUrl || downloadUrl.startsWith('data:')) {
          downloadUrl = await getAudioSignedUrlApi(item.id);
        }
        const response = await fetch(downloadUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `textflow-${item.id}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
        showToast('Download started');
      } catch (fallbackErr: any) {
        showToast(fallbackErr.message || 'Failed to download audio file.');
      }
    }
  };

  // Single Item Delete
  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeletingItem(true);
    try {
      await deleteHistoryItemApi(itemToDelete.id);

      // Stop playing if current item is deleted
      if (activeAudioId === itemToDelete.id && audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
        audioElementRef.current = null;
        setActiveAudioId(null);
        setIsPlaying(false);
      }

      setItemToDelete(null);
      showToast('Recording deleted');

      // Refresh records
      if (historyItems.length === 1 && pagination.page > 1) {
        loadHistory(pagination.page - 1, searchQuery);
      } else {
        loadHistory(pagination.page, searchQuery);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete history item.');
    } finally {
      setIsDeletingItem(false);
    }
  };

  // Clear All History
  const confirmClearAll = async () => {
    setIsClearingAll(true);
    try {
      await clearAllHistoryApi();

      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
        audioElementRef.current = null;
        setActiveAudioId(null);
        setIsPlaying(false);
      }

      setIsClearAllModalOpen(false);
      showToast('All speech history cleared');
      loadHistory(1, '');
    } catch (err: any) {
      showToast(err.message || 'Failed to clear history.');
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
        date: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
        time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      };
    } catch {
      return { date: 'Recent', time: '' };
    }
  };

  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec) || !isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Extract unique languages for filter dropdown
  const uniqueLanguages = useMemo(() => {
    const langs = new Set<string>();
    historyItems.forEach((item) => {
      if (item.language) langs.add(item.language);
    });
    return Array.from(langs).sort();
  }, [historyItems]);

  // Client-side filter by language if selected
  const displayedItems = useMemo(() => {
    if (selectedLanguage === 'all') return historyItems;
    return historyItems.filter((i) => i.language.toLowerCase() === selectedLanguage.toLowerCase());
  }, [historyItems, selectedLanguage]);

  // Summary Metrics calculations
  const summaryMetrics = useMemo(() => {
    const totalRecordings = pagination.total || historyItems.length;
    const favoritesCount = historyItems.filter((i) => i.isFavorite).length;

    let latestDateStr = 'No recordings';
    let latestTimeStr = '';
    if (historyItems.length > 0 && historyItems[0].createdAt) {
      const formatted = formatDate(historyItems[0].createdAt);
      latestDateStr = formatted.date;
      latestTimeStr = formatted.time;
    }

    // Total Duration from cached durations
    let totalSec = 0;
    let hasKnownDuration = false;
    (Object.values(durationsMap) as number[]).forEach((d) => {
      if (typeof d === 'number' && d > 0) {
        totalSec += d;
        hasKnownDuration = true;
      }
    });

    let durationLabel = '—';
    if (hasKnownDuration && totalSec > 0) {
      const m = Math.floor(totalSec / 60);
      const s = Math.floor(totalSec % 60);
      durationLabel = m > 0 ? `${m}m ${s}s` : `${s}s`;
    } else if (totalRecordings > 0) {
      durationLabel = 'Calculated on play';
    }

    return {
      totalRecordings,
      favoritesCount,
      latestDateStr,
      latestTimeStr,
      durationLabel,
    };
  }, [historyItems, pagination.total, durationsMap]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 bg-white min-h-[calc(100vh-72px)] text-[#17301D]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#145C2A] text-white text-xs font-semibold shadow-lg border border-[#DCEBDD] animate-in fade-in slide-in-from-bottom-3 duration-200 flex items-center gap-2">
          <Heart className="w-3.5 h-3.5 fill-white text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#DCEBDD]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#EAF7EC] text-[#145C2A] flex items-center justify-center shrink-0 shadow-xs">
            <HistoryIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17301D]">
                Speech History
              </h1>
              {pagination.total > 0 && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F2FAF3] text-[#145C2A] font-semibold border border-[#DCEBDD]">
                  {pagination.total}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#5F7265] mt-0.5">
              Access and re-play your previously generated speech recordings
            </p>
          </div>
        </div>

        {/* Search & Language Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#89968D] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your history..."
              aria-label="Search your history"
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-[#DCEBDD] bg-[#F7FBF8] text-[#17301D] placeholder-[#89968D] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#4CAF50] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#89968D] hover:text-[#17301D] p-0.5 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Language Filter */}
          <div className="relative">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              aria-label="Filter by language"
              className="w-full sm:w-auto appearance-none pl-3.5 pr-8 py-2 rounded-xl border border-[#DCEBDD] bg-[#F7FBF8] text-[#17301D] text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4CAF50] cursor-pointer"
            >
              <option value="all">All Languages</option>
              {uniqueLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#89968D] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Clear All History Button */}
          {pagination.total > 0 && (
            <button
              type="button"
              onClick={() => setIsClearAllModalOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-[#E05252]/30 bg-white hover:bg-red-50 text-[#E05252] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shrink-0 shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* CARD 1: Total Recordings */}
        <div className="bg-white p-4 sm:p-5 rounded-[18px] border border-[#DCEBDD] shadow-[0_2px_8px_rgba(20,92,42,0.03)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5F7265]">Total Recordings</span>
            <div className="w-8 h-8 rounded-lg bg-[#EAF7EC] text-[#145C2A] flex items-center justify-center">
              <FileAudio className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#17301D]">
              {summaryMetrics.totalRecordings}
            </div>
            <p className="text-[11px] text-[#89968D]">Your generated speeches</p>
          </div>
        </div>

        {/* CARD 2: Latest Recording */}
        <div className="bg-white p-4 sm:p-5 rounded-[18px] border border-[#DCEBDD] shadow-[0_2px_8px_rgba(20,92,42,0.03)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5F7265]">Latest Recording</span>
            <div className="w-8 h-8 rounded-lg bg-[#EAF7EC] text-[#145C2A] flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-sm sm:text-base font-bold text-[#17301D] truncate">
              {summaryMetrics.latestDateStr}
            </div>
            <p className="text-[11px] text-[#89968D]">
              {summaryMetrics.latestTimeStr ? `At ${summaryMetrics.latestTimeStr}` : 'Most recent activity'}
            </p>
          </div>
        </div>

        {/* CARD 3: Total Duration */}
        <div className="bg-white p-4 sm:p-5 rounded-[18px] border border-[#DCEBDD] shadow-[0_2px_8px_rgba(20,92,42,0.03)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5F7265]">Total Duration</span>
            <div className="w-8 h-8 rounded-lg bg-[#EAF7EC] text-[#145C2A] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-bold text-[#17301D]">
              {summaryMetrics.durationLabel}
            </div>
            <p className="text-[11px] text-[#89968D]">Across all recordings</p>
          </div>
        </div>

        {/* CARD 4: Favorites */}
        <div className="bg-white p-4 sm:p-5 rounded-[18px] border border-[#DCEBDD] shadow-[0_2px_8px_rgba(20,92,42,0.03)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5F7265]">Favorites</span>
            <div className="w-8 h-8 rounded-lg bg-[#EAF7EC] text-[#145C2A] flex items-center justify-center">
              <Heart className="w-4 h-4 fill-[#4CAF50] text-[#4CAF50]" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#17301D]">
              {summaryMetrics.favoritesCount}
            </div>
            <p className="text-[11px] text-[#89968D]">Saved recordings</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        /* Professional Skeleton Loading State */
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 sm:p-6 rounded-[18px] border border-[#DCEBDD] bg-[#F7FBF8] animate-pulse space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#EAF7EC]"></div>
                <div className="h-4 bg-[#EAF7EC] rounded-md w-3/4"></div>
              </div>
              <div className="h-3 bg-[#EAF7EC] rounded-md w-1/2"></div>
              <div className="h-14 bg-white rounded-xl border border-[#DCEBDD]"></div>
              <div className="flex gap-2">
                <div className="h-7 bg-[#EAF7EC] rounded-lg w-20"></div>
                <div className="h-7 bg-[#EAF7EC] rounded-lg w-24"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div className="p-8 rounded-2xl border border-red-200 bg-red-50 text-center space-y-4 max-w-md mx-auto">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-red-900">Unable to load speech history</h3>
            <p className="text-xs text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => loadHistory(pagination.page, searchQuery)}
            className="px-4 py-2 rounded-xl bg-[#4CAF50] hover:bg-[#3d9140] text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : displayedItems.length === 0 ? (
        /* Clean Premium Empty State */
        <div className="p-12 sm:p-16 rounded-2xl border border-dashed border-[#DCEBDD] bg-[#F7FBF8] text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-full bg-[#EAF7EC] text-[#145C2A] mx-auto flex items-center justify-center shadow-xs">
            <Volume2 className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-[#17301D]">
              {searchQuery || selectedLanguage !== 'all' ? 'No Matching Speech History' : 'No Speech History Yet'}
            </h3>
            <p className="text-xs sm:text-sm text-[#5F7265] max-w-sm mx-auto">
              {searchQuery || selectedLanguage !== 'all'
                ? 'Try adjusting your search query or language filter to find your recordings.'
                : 'Generate your first speech recording and it will appear here.'}
            </p>
          </div>
          <div className="pt-2">
            {searchQuery || selectedLanguage !== 'all' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedLanguage('all');
                }}
                className="px-4 py-2 rounded-xl border border-[#DCEBDD] bg-white hover:bg-[#EAF7EC] text-[#145C2A] font-semibold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onNavigateStudio}
                className="px-5 py-2.5 rounded-xl bg-[#4CAF50] hover:bg-[#3d9140] text-white font-semibold text-xs inline-flex items-center gap-2 shadow-sm transition-all active:scale-[0.98]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Speech</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* History Records List */
        <div className="space-y-4 sm:space-y-5">
          {displayedItems.map((item, index) => {
            const isLong = item.text.length > 140;
            const isExpanded = !!expandedTextIds[item.id];
            const displayFormatted = formatDate(item.createdAt);
            const isThisPlaying = activeAudioId === item.id && isPlaying;
            const isThisActive = activeAudioId === item.id;
            const recordNumber = (pagination.page - 1) * pagination.limit + index + 1;
            const currentItemDuration = durationsMap[item.id] || duration;

            return (
              <div
                key={item.id}
                className="p-5 sm:p-6 rounded-[18px] border border-[#DCEBDD] bg-white shadow-[0_2px_8px_rgba(20,92,42,0.03)] hover:border-[#4CAF50]/60 transition-all space-y-4 relative"
              >
                {/* Top Section: Index, Text Preview & Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-[#EAF7EC] text-[#145C2A] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {recordNumber}
                    </span>
                    <div className="space-y-1 flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-medium text-[#17301D] leading-relaxed break-words">
                        {isLong && !isExpanded ? `${item.text.slice(0, 140)}...` : item.text}
                      </p>
                      {isLong && (
                        <button
                          type="button"
                          onClick={() => toggleExpandText(item.id)}
                          className="text-xs font-semibold text-[#145C2A] hover:text-[#4CAF50] inline-flex items-center gap-1 focus:outline-none transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <span>Hide full text</span>
                              <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              <span>Show full text</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Favorite & Three-dot More Menu */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleFavorite(item)}
                      aria-label={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      className={`p-2 rounded-xl transition-colors ${
                        item.isFavorite
                          ? 'text-[#4CAF50] hover:bg-[#EAF7EC]'
                          : 'text-[#89968D] hover:text-[#4CAF50] hover:bg-[#F2FAF3]'
                      }`}
                      title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          item.isFavorite ? 'fill-[#4CAF50] text-[#4CAF50]' : 'text-[#89968D]'
                        }`}
                      />
                    </button>

                    {/* Three-dot Dropdown */}
                    <div className="relative" ref={activeMenuId === item.id ? menuRef : null}>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveMenuId(activeMenuId === item.id ? null : item.id)
                        }
                        aria-label="More options"
                        className="p-2 rounded-xl text-[#89968D] hover:text-[#17301D] hover:bg-[#F2FAF3] transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === item.id && (
                        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-[#DCEBDD] py-1 z-30 animate-in fade-in zoom-in-95 text-xs font-medium">
                          <button
                            type="button"
                            onClick={() => {
                              handleTogglePlay(item);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3.5 py-2 text-left text-[#17301D] hover:bg-[#F2FAF3] flex items-center gap-2 transition-colors"
                          >
                            {isThisPlaying ? (
                              <>
                                <Pause className="w-3.5 h-3.5 text-[#145C2A]" />
                                <span>Pause audio</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 text-[#145C2A]" />
                                <span>Play audio</span>
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleDownload(item);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3.5 py-2 text-left text-[#17301D] hover:bg-[#F2FAF3] flex items-center gap-2 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5 text-[#145C2A]" />
                            <span>Download audio</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleToggleFavorite(item);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3.5 py-2 text-left text-[#17301D] hover:bg-[#F2FAF3] flex items-center gap-2 transition-colors"
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                item.isFavorite ? 'fill-[#4CAF50] text-[#4CAF50]' : 'text-[#89968D]'
                              }`}
                            />
                            <span>{item.isFavorite ? 'Remove favorite' : 'Add to favorite'}</span>
                          </button>
                          <div className="my-1 border-t border-[#DCEBDD]"></div>
                          <button
                            type="button"
                            onClick={() => {
                              setItemToDelete(item);
                              setActiveMenuId(null);
                            }}
                            className="w-full px-3.5 py-2 text-left text-[#E05252] hover:bg-red-50 flex items-center gap-2 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete recording</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modern Compact Audio Player Component Inside Card */}
                <div className="bg-[#F7FBF8] rounded-xl p-3.5 sm:p-4 border border-[#DCEBDD] flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                  {/* Big Circular Green Play Button */}
                  <button
                    type="button"
                    onClick={() => handleTogglePlay(item)}
                    aria-label={isThisPlaying ? 'Pause audio' : 'Play audio'}
                    className="w-11 h-11 rounded-full bg-[#4CAF50] hover:bg-[#3d9140] text-white flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95 cursor-pointer"
                  >
                    {isThisPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>

                  {/* Scrubber & Timers */}
                  <div className="flex-1 w-full space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono font-medium text-[#5F7265]">
                      <span>{isThisActive ? formatSeconds(currentTime) : '0:00'}</span>
                      <span>
                        {isThisActive && currentItemDuration > 0
                          ? formatSeconds(currentItemDuration)
                          : durationsMap[item.id]
                          ? formatSeconds(durationsMap[item.id])
                          : '0:00'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={isThisActive && currentItemDuration > 0 ? currentItemDuration : 100}
                      value={isThisActive ? currentTime : 0}
                      onChange={handleSeek}
                      disabled={!isThisActive}
                      aria-label="Audio timeline progress"
                      className="w-full h-1.5 bg-[#DCEBDD] rounded-lg appearance-none cursor-pointer accent-[#4CAF50] disabled:opacity-40"
                    />
                  </div>

                  {/* Volume Slider & Actions */}
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start pt-1 sm:pt-0 border-t sm:border-t-0 border-[#DCEBDD]">
                    {/* Volume Controls */}
                    <div className="flex items-center gap-1.5 text-[#5F7265]">
                      <button
                        type="button"
                        onClick={toggleMute}
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                        className="p-1 rounded-lg hover:text-[#17301D] transition-colors"
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-4 h-4 text-[#89968D]" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        aria-label="Volume level"
                        className="w-16 sm:w-20 h-1.5 bg-[#DCEBDD] rounded-lg appearance-none cursor-pointer accent-[#4CAF50]"
                      />
                    </div>

                    {/* Download & Delete Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownload(item)}
                        className="border border-[#4CAF50] text-[#145C2A] bg-white hover:bg-[#EAF7EC] text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        title="Download audio file"
                      >
                        <Download className="w-3.5 h-3.5 text-[#145C2A]" />
                        <span className="hidden sm:inline">Download</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setItemToDelete(item)}
                        className="border border-[#E05252]/30 text-[#E05252] bg-white hover:bg-red-50 text-xs font-semibold p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                        title="Delete recording"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Metadata Badges & Timestamp */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 border-t border-[#DCEBDD] text-xs">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {/* Language Badge */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F2FAF3] text-[#5F7265] text-xs font-medium border border-[#DCEBDD]">
                      <Globe className="w-3 h-3 text-[#145C2A]" />
                      <span>{item.language}</span>
                    </span>

                    {/* Voice Badge */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F2FAF3] text-[#5F7265] text-xs font-medium border border-[#DCEBDD]">
                      <Mic className="w-3 h-3 text-[#145C2A]" />
                      <span>{item.voice}</span>
                    </span>

                    {/* Speed Badge */}
                    {typeof item.speed === 'number' && item.speed !== 1.0 && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F2FAF3] text-[#5F7265] font-mono text-xs font-medium border border-[#DCEBDD]">
                        <span>◷ {item.speed}x</span>
                      </span>
                    )}

                    {/* Style Badge */}
                    {item.style && item.style !== 'default' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F2FAF3] text-[#5F7265] text-xs font-medium border border-[#DCEBDD]">
                        <span>🎚 {item.style}</span>
                      </span>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 text-[11px] text-[#89968D]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {displayFormatted.date} • {displayFormatted.time}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination Bar */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#DCEBDD] text-xs">
              <span className="text-[#5F7265]">
                Showing{' '}
                <span className="font-semibold text-[#17301D]">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-[#17301D]">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of <span className="font-semibold text-[#17301D]">{pagination.total}</span> recordings
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                  }
                  className="px-3.5 py-1.5 rounded-xl border border-[#DCEBDD] bg-white text-[#17301D] font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 hover:bg-[#F2FAF3] transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <span className="px-3 py-1.5 rounded-xl bg-[#EAF7EC] text-[#145C2A] font-bold">
                  {pagination.page}
                </span>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(pagination.totalPages, prev.page + 1),
                    }))
                  }
                  className="px-3.5 py-1.5 rounded-xl border border-[#DCEBDD] bg-white text-[#17301D] font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 hover:bg-[#F2FAF3] transition-colors"
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#DCEBDD] rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[#17301D]">Delete this speech recording?</h3>
              <p className="text-xs text-[#5F7265] leading-relaxed">
                This recording will be permanently removed from your speech history. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5F7265] hover:bg-[#F2FAF3] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingItem}
                onClick={confirmDeleteItem}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#E05252] hover:bg-red-700 text-white shadow-xs transition-colors disabled:opacity-50"
              >
                {isDeletingItem ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#DCEBDD] rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#17301D]">Clear all speech history?</h3>
              <p className="text-xs text-[#5F7265] leading-relaxed">
                Are you sure you want to delete all recorded speech history? All your saved audio recordings will be permanently removed.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isClearingAll}
                onClick={() => setIsClearAllModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5F7265] hover:bg-[#F2FAF3] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearingAll}
                onClick={confirmClearAll}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#E05252] hover:bg-red-700 text-white shadow-xs transition-colors disabled:opacity-50"
              >
                {isClearingAll ? 'Clearing...' : 'Clear All History'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

