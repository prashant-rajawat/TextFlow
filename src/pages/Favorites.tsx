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
  Trash2,
  Calendar,
  FileText,
  Sparkles,
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

  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [voiceFilter, setVoiceFilter] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
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

    if (!item.audioUrl) {
      showToast('Audio URL is missing.');
      return;
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

      if (!downloadUrl) {
        showToast('Audio is not available for download.');
        return;
      }

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
      showToast('Audio downloaded successfully');
    } catch (err) {
      console.error('Download error:', err);
      if (item.audioUrl) {
        window.open(item.audioUrl, '_blank');
      }
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

  // Filter and sort favorites locally if search query is present
  const filteredFavorites = favorites.filter((item) => {
    if (!searchQuery.trim()) return true;
    return (
      item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.voice.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }).sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
  });

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8 bg-white text-[#17301D] min-h-screen">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#17301D] text-white text-xs font-semibold shadow-lg border border-[#DDEBDD] animate-in fade-in slide-in-from-bottom-3 duration-200 flex items-center gap-2">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero / Page Header */}
      <div className="rounded-2xl bg-[#F4FBF5] border border-[#DCEBDD] p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Title & Subtitle */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EEF9EF] text-[#176B2C] border border-[#DCEBDD] flex items-center justify-center shrink-0 shadow-xs">
              <Star className="w-6 h-6 fill-current text-amber-500" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#17301D]">
                Favorites
              </h1>
              <p className="text-xs sm:text-sm text-[#65756A] leading-relaxed">
                Quickly access your starred speech audio recordings
              </p>
            </div>
          </div>

          {/* Right Side: Search & Filters */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-[#8A978E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in favorites..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-[#DCEBDD] bg-white text-[#17301D] placeholder-[#8A978E] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#58B957] focus:border-[#58B957] transition-all shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A978E] hover:text-[#17301D]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Language Filter */}
            <div className="relative flex-1 sm:w-40">
              <Globe className="w-4 h-4 text-[#8A978E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                placeholder="All Languages"
                className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-[#DCEBDD] bg-white text-[#17301D] placeholder-[#8A978E] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#58B957] focus:border-[#58B957] transition-all shadow-xs"
              />
              {languageFilter && (
                <button
                  type="button"
                  onClick={() => setLanguageFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A978E] hover:text-[#17301D]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Voice Filter */}
            <div className="relative flex-1 sm:w-40">
              <Mic className="w-4 h-4 text-[#8A978E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={voiceFilter}
                onChange={(e) => setVoiceFilter(e.target.value)}
                placeholder="All Voices"
                className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-[#DCEBDD] bg-white text-[#17301D] placeholder-[#8A978E] text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#58B957] focus:border-[#58B957] transition-all shadow-xs"
              />
              {voiceFilter && (
                <button
                  type="button"
                  onClick={() => setVoiceFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A978E] hover:text-[#17301D]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recordings Count & Sort Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#DDEBDD]">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-[#17301D]">
            {pagination.total} Favorite Audio Recordings
          </h2>
        </div>

        {/* Sort Control */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-medium text-[#65756A]">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
            className="px-3 py-1.5 rounded-xl border border-[#DDEBDD] bg-white text-xs font-semibold text-[#17301D] focus:outline-none focus:ring-2 focus:ring-[#58B957] cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-6 rounded-2xl border border-[#DDEBDD] bg-white animate-pulse space-y-4 shadow-xs"
            >
              <div className="h-5 bg-[#F7FBF7] rounded-md w-3/4"></div>
              <div className="h-4 bg-[#F7FBF7] rounded-md w-1/2"></div>
              <div className="flex gap-2 pt-2">
                <div className="h-9 bg-[#F7FBF7] rounded-xl w-28"></div>
                <div className="h-9 bg-[#F7FBF7] rounded-xl w-28"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl border border-red-200 bg-red-50 text-center space-y-4 max-w-md mx-auto">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-red-900">Unable to load favorites</h3>
            <p className="text-xs text-red-700">{error}</p>
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
      ) : filteredFavorites.length === 0 ? (
        /* Beautiful White/Light-Green Empty State */
        <div className="p-12 sm:p-16 rounded-3xl border border-[#DDEBDD] bg-[#F3FAF4] text-center space-y-5 max-w-xl mx-auto relative overflow-hidden shadow-xs">
          {/* Subtle background leaf decorations */}
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-[#DFF2E1]/40 pointer-events-none"></div>
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#DFF2E1]/40 pointer-events-none"></div>

          <div className="w-16 h-16 rounded-2xl bg-[#EEF9EF] text-[#176B2C] border border-[#DDEBDD] mx-auto flex items-center justify-center shadow-xs relative z-10">
            <Star className="w-8 h-8 stroke-[1.75] text-amber-500" />
          </div>

          <div className="space-y-2 relative z-10">
            <h3 className="text-xl font-bold text-[#17301D]">No More Favorites</h3>
            <p className="text-xs sm:text-sm text-[#65756A] max-w-sm mx-auto leading-relaxed">
              {searchQuery
                ? `No favorite recordings match "${searchQuery}".`
                : 'You have viewed all your favorite audio recordings or have not starred any yet.'}
            </p>
          </div>

          <div className="pt-2 relative z-10">
            <button
              type="button"
              onClick={onNavigateStudio}
              className="px-5 py-3 rounded-xl bg-[#58B957] hover:bg-[#3FA94D] text-white font-semibold text-xs sm:text-sm inline-flex items-center gap-2 shadow-sm transition-all active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Speech</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFavorites.map((item) => {
            const isLong = item.text.length > 140;
            const isExpanded = !!expandedTextIds[item.id];
            const displayFormatted = formatDate(item.createdAt);
            const isThisPlaying = activeAudioId === item.id && isPlaying;
            const approxDuration = `~${Math.max(3, Math.round(item.text.length / 15))}s`;

            return (
              <div
                key={item.id}
                className="p-5 sm:p-6 rounded-[18px] border border-[#DDEBDD] bg-white shadow-xs hover:border-[#58B957]/60 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Left & Center: Icon + Content + Metadata */}
                <div className="flex items-start gap-4 flex-1">
                  {/* Large Circular Light-Green Audio/Music Icon */}
                  <div className="w-12 h-12 rounded-2xl bg-[#EEF9EF] text-[#176B2C] border border-[#DDEBDD] flex items-center justify-center shrink-0 shadow-xs">
                    <Volume2 className="w-6 h-6" />
                  </div>

                  <div className="space-y-3 flex-1 min-w-0">
                    {/* Text Preview / Title */}
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[#17301D] leading-relaxed break-words">
                        {isLong && !isExpanded ? `${item.text.slice(0, 140)}...` : item.text}
                      </p>
                      {isLong && (
                        <button
                          type="button"
                          onClick={() => toggleExpandText(item.id)}
                          className="text-xs font-semibold text-[#176B2C] hover:underline focus:outline-none"
                        >
                          {isExpanded ? 'Show less' : 'Show full text'}
                        </button>
                      )}
                    </div>

                    {/* Small Metadata Pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF9EF] border border-[#DDEBDD] text-xs font-semibold text-[#176B2C]">
                        <Globe className="w-3 h-3 text-[#58B957]" />
                        {item.language}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF9EF] border border-[#DDEBDD] text-xs font-semibold text-[#176B2C]">
                        <Mic className="w-3 h-3 text-[#58B957]" />
                        {item.voice}
                      </span>
                      {item.style && item.style !== 'default' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF9EF] border border-[#DDEBDD] text-xs font-semibold text-[#176B2C]">
                          <Sparkles className="w-3 h-3 text-[#58B957]" />
                          {item.style}
                        </span>
                      )}
                    </div>

                    {/* Metadata Section: Date, Characters, Duration */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#65756A] pt-1">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#8A978E]" />
                        {displayFormatted.date}, {displayFormatted.time}
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#8A978E]" />
                        {item.text.length} characters
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#8A978E]" />
                        {approxDuration}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Far Right Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-[#DDEBDD] shrink-0 justify-end">
                  {/* Play Button */}
                  <button
                    type="button"
                    onClick={() => handleTogglePlay(item)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                      isThisPlaying
                        ? 'bg-[#176B2C] text-white'
                        : 'bg-[#58B957] hover:bg-[#3FA94D] text-white'
                    }`}
                  >
                    {isThisPlaying ? (
                      <>
                        <Pause className="w-4 h-4 fill-current" />
                        <span>Pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>Play</span>
                      </>
                    )}
                  </button>

                  {/* Download Button */}
                  <button
                    type="button"
                    onClick={() => handleDownload(item)}
                    className="px-3.5 py-2 rounded-xl border border-[#DDEBDD] bg-white text-[#17301D] hover:bg-[#F7FBF7] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                    title="Download Audio"
                  >
                    <Download className="w-3.5 h-3.5 text-[#58B957]" />
                    <span>Download</span>
                  </button>

                  {/* Remove Button (Soft Red Design) */}
                  <button
                    type="button"
                    onClick={() => handleRemoveFavorite(item)}
                    className="px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                    title="Remove from Favorites"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Pagination Bar */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-[#DDEBDD] text-xs">
              <span className="text-[#65756A] font-medium">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                  className="px-3.5 py-2 rounded-xl border border-[#DDEBDD] bg-white text-[#17301D] font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 hover:bg-[#F7FBF7] shadow-xs transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                  className="px-3.5 py-2 rounded-xl border border-[#DDEBDD] bg-white text-[#17301D] font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 hover:bg-[#F7FBF7] shadow-xs transition-all"
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
