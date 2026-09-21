import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Gauge,
  Sparkles,
  Volume2,
  FileText,
  HardDrive,
  RefreshCw,
  AlertCircle,
  Clock,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowUpRight,
  ChevronDown,
  Check,
} from 'lucide-react';
import { fetchUserUsage } from '../services/usageService';
import { UsageResponse } from '../types/usage';

interface UsagePageProps {
  onNavigateStudio?: () => void;
}

export const UsagePage: React.FC<UsagePageProps> = ({ onNavigateStudio }) => {
  const [usageData, setUsageData] = useState<UsageResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Date selector dropdown state
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUsage = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await fetchUserUsage();
      setUsageData(data);
    } catch (err: any) {
      console.error('Failed to load usage data:', err);
      setError(err?.message || 'Unable to load usage data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  // Format bytes to human readable string
  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = bytes / Math.pow(k, i);
    return `${size >= 10 || i === 0 ? Math.round(size) : size.toFixed(1)} ${sizes[i]}`;
  };

  // Format date helper (e.g. Today, Yesterday, or MMM DD)
  const formatUsageDate = (dateStr: string, todayStr?: string): string => {
    if (!dateStr) return '';
    if (todayStr && dateStr === todayStr) return 'Today';

    try {
      const [y, m, d] = dateStr.split('-').map((v) => parseInt(v, 10));
      const date = new Date(Date.UTC(y, m - 1, d));

      const now = new Date();
      const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));

      if (date.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
        return 'Yesterday';
      }

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
    } catch {
      return dateStr;
    }
  };

  // Format reset time
  const formatResetTime = (resetAt?: string, timezone = 'UTC'): string => {
    if (!resetAt) return `12:00 AM (${timezone})`;
    try {
      return `12:00 AM (${timezone})`;
    } catch {
      return `12:00 AM (${timezone})`;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 animate-in fade-in duration-200">
      {/* 4. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DCEBDD]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EAF7EC] text-[#145C2A] flex items-center justify-center border border-[#DCEBDD] shrink-0 shadow-xs">
              <Gauge className="w-5 h-5 text-[#4CAF50]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#17301D]">
                Usage & Limits
              </h1>
              <p className="text-xs sm:text-sm text-[#5F7265] mt-0.5">
                Track your TextFlow usage and remaining allowance.
              </p>
            </div>
          </div>
        </div>

        {/* Right side controls: Date selector, Refresh button, Open Studio button */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1 sm:pt-0">
          {/* Date Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-[#17301D] hover:bg-[#F7FBF8] border border-[#DCEBDD] shadow-xs transition-colors flex items-center gap-1.5 focus:outline-none"
              aria-label="Filter usage by date"
            >
              <Calendar className="w-3.5 h-3.5 text-[#4CAF50]" />
              <span>{dateFilter === 'today' ? 'Today' : 'All Time'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#5F7265] transition-transform duration-150 ${isDateDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDateDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white border border-[#DCEBDD] shadow-lg py-1.5 z-20 animate-in fade-in-50 zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter('today');
                    setIsDateDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                    dateFilter === 'today'
                      ? 'bg-[#EAF7EC] text-[#145C2A] font-bold'
                      : 'text-[#17301D] hover:bg-[#F7FBF8]'
                  }`}
                >
                  <div className="flex flex-col">
                    <span>Today</span>
                    <span className="text-[10px] text-[#5F7265] font-normal">Active daily quota</span>
                  </div>
                  {dateFilter === 'today' && <Check className="w-3.5 h-3.5 text-[#4CAF50]" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDateFilter('all');
                    setIsDateDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                    dateFilter === 'all'
                      ? 'bg-[#EAF7EC] text-[#145C2A] font-bold'
                      : 'text-[#17301D] hover:bg-[#F7FBF8]'
                  }`}
                >
                  <div className="flex flex-col">
                    <span>All Time</span>
                    <span className="text-[10px] text-[#5F7265] font-normal">Cumulative metrics</span>
                  </div>
                  {dateFilter === 'all' && <Check className="w-3.5 h-3.5 text-[#4CAF50]" />}
                </button>
              </div>
            )}
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => loadUsage(true)}
            disabled={isLoading || isRefreshing}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white text-[#17301D] hover:bg-[#F7FBF8] border border-[#DCEBDD] shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh usage data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#4CAF50]' : 'text-[#5F7265]'}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {/* Open Studio button */}
          {onNavigateStudio && (
            <button
              type="button"
              onClick={onNavigateStudio}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#4CAF50] hover:bg-[#3d8b40] text-white shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span>Open Studio</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 13. Loading State (Professional Skeleton Cards) */}
      {isLoading && (
        <div className="space-y-6" aria-busy="true" aria-live="polite">
          <div className="flex items-center justify-between">
            <div className="h-6 w-36 bg-[#F2FAF3] border border-[#DCEBDD] rounded-lg animate-pulse" />
            <div className="h-4 w-28 bg-[#F2FAF3] border border-[#DCEBDD] rounded-lg animate-pulse" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-48 rounded-[18px] bg-white border border-[#DCEBDD] p-6 shadow-[0_2px_8px_rgba(20,92,42,0.03)] space-y-4 animate-pulse flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-[#F2FAF3]" />
                  <div className="w-20 h-5 rounded-full bg-[#F2FAF3]" />
                </div>
                <div className="space-y-2">
                  <div className="w-24 h-7 rounded-lg bg-[#F2FAF3]" />
                  <div className="w-full h-2 rounded-full bg-[#F2FAF3]" />
                </div>
                <div className="w-32 h-4 rounded-md bg-[#F2FAF3]" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-56 rounded-[18px] bg-white border border-[#DCEBDD] p-6 animate-pulse" />
            <div className="h-56 rounded-[18px] bg-white border border-[#DCEBDD] p-6 animate-pulse" />
          </div>

          <div className="h-64 rounded-[18px] bg-white border border-[#DCEBDD] p-6 animate-pulse" />
        </div>
      )}

      {/* 14. Error State */}
      {!isLoading && error && (
        <div className="p-6 rounded-[18px] bg-[#FDF2F2] border border-[#F8D7DA] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-red-100 text-[#E05252] shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#17301D]">Unable to load usage data</h3>
              <p className="text-xs text-[#5F7265] mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadUsage(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#4CAF50] hover:bg-[#3d8b40] text-white shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Main Usage Dashboard (Real Data Preserved) */}
      {!isLoading && !error && usageData && (
        <>
          {/* Near-Limit or At-Limit Soft Warning Banners */}
          {usageData.today.ttsGenerations >= usageData.today.ttsLimit ? (
            <div className="p-4 rounded-2xl bg-[#FDF2F2] border border-[#F8D7DA] flex items-start gap-3 text-[#17301D]">
              <AlertCircle className="w-5 h-5 text-[#E05252] shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <p className="font-bold text-[#E05252]">You've reached your daily TextFlow TTS limit.</p>
                <p className="text-[#5F7265]">
                  Your daily TTS allowance will automatically reset at {formatResetTime(usageData.resetAt, usageData.timezone)}.
                </p>
              </div>
            </div>
          ) : usageData.today.ttsGenerations >= Math.floor(usageData.today.ttsLimit * 0.8) ? (
            <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-3 text-[#17301D]">
              <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <p className="font-bold text-[#92400E]">
                  You've used {usageData.today.ttsGenerations} of {usageData.today.ttsLimit} TTS generations today.
                </p>
                <p className="text-[#92400E]/80">
                  You have {usageData.today.ttsRemaining} speech generation{usageData.today.ttsRemaining === 1 ? '' : 's'} remaining today.
                </p>
              </div>
            </div>
          ) : null}

          {/* 5. Today's Usage Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#EAF7EC] text-[#145C2A]">
                  <Calendar className="w-4 h-4 text-[#4CAF50]" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-[#145C2A]">
                  Today's Usage
                </h2>
              </div>
              <span className="text-xs text-[#89968D]">
                Timezone: <span className="font-semibold text-[#5F7265]">{usageData.timezone || 'UTC'}</span>
              </span>
            </div>

            {/* 6 & 7. Four Main Usage Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* CARD 1: TTS Generations */}
              {(() => {
                const used = usageData.today.ttsGenerations;
                const limit = usageData.today.ttsLimit;
                const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                const remaining = usageData.today.ttsRemaining;
                const isFull = used >= limit;
                const isNear = used >= Math.floor(limit * 0.8) && !isFull;

                return (
                  <div className="bg-white border border-[#DCEBDD] rounded-[18px] p-6 shadow-[0_2px_8px_rgba(20,92,42,0.03)] hover:shadow-md hover:border-[#4CAF50]/50 transition-all duration-200 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-3">
                      {/* Top: Icon, Title & Remaining Badge */}
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-[#EAF7EC] text-[#145C2A] flex items-center justify-center shrink-0">
                          <Volume2 className="w-5 h-5 text-[#4CAF50]" />
                        </div>
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                            isFull
                              ? 'bg-red-50 text-[#E05252]'
                              : isNear
                              ? 'bg-amber-50 text-[#D97706]'
                              : 'bg-[#EAF7EC] text-[#145C2A]'
                          }`}
                        >
                          {remaining} remaining
                        </span>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-[#5F7265] uppercase tracking-wider block">
                          TTS Generations
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="text-3xl font-extrabold text-[#17301D] tracking-tight">
                            {used}
                          </span>
                          <span className="text-sm font-semibold text-[#89968D]">
                            / {limit}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Thin progress bar and stats */}
                    <div className="space-y-2 pt-1">
                      <div
                        className="w-full bg-[#F2FAF3] border border-[#DCEBDD]/60 rounded-full h-2 overflow-hidden"
                        role="progressbar"
                        aria-valuenow={used}
                        aria-valuemin={0}
                        aria-valuemax={limit}
                        aria-label={`TTS Generations: ${used} of ${limit}`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isFull
                              ? 'bg-[#E05252]'
                              : isNear
                              ? 'bg-[#D97706]'
                              : 'bg-[#4CAF50]'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-[#5F7265]">
                        <span>{percent}% used</span>
                        <span>{remaining} remaining</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* CARD 2: AI Enhancements */}
              {(() => {
                const used = usageData.today.aiEnhancements;
                const limit = usageData.today.aiLimit;
                const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
                const remaining = usageData.today.aiRemaining;
                const isFull = used >= limit;
                const isNear = used >= Math.floor(limit * 0.8) && !isFull;

                return (
                  <div className="bg-white border border-[#DCEBDD] rounded-[18px] p-6 shadow-[0_2px_8px_rgba(20,92,42,0.03)] hover:shadow-md hover:border-[#4CAF50]/50 transition-all duration-200 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-3">
                      {/* Top: Icon, Title & Remaining Badge */}
                      <div className="flex items-center justify-between">
                        {/* Soft lavender icon background, but NOT a purple card or background */}
                        <div className="w-9 h-9 rounded-xl bg-[#F3E8FF] text-[#7E22CE] flex items-center justify-center shrink-0">
                          <Sparkles className="w-5 h-5 text-[#9333EA]" />
                        </div>
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                            isFull
                              ? 'bg-red-50 text-[#E05252]'
                              : isNear
                              ? 'bg-amber-50 text-[#D97706]'
                              : 'bg-[#F3E8FF] text-[#7E22CE]'
                          }`}
                        >
                          {remaining} remaining
                        </span>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-[#5F7265] uppercase tracking-wider block">
                          AI Enhancements
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="text-3xl font-extrabold text-[#17301D] tracking-tight">
                            {used}
                          </span>
                          <span className="text-sm font-semibold text-[#89968D]">
                            / {limit}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Thin progress bar and stats */}
                    <div className="space-y-2 pt-1">
                      <div
                        className="w-full bg-[#F2FAF3] border border-[#DCEBDD]/60 rounded-full h-2 overflow-hidden"
                        role="progressbar"
                        aria-valuenow={used}
                        aria-valuemin={0}
                        aria-valuemax={limit}
                        aria-label={`AI Enhancements: ${used} of ${limit}`}
                      >
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isFull
                              ? 'bg-[#E05252]'
                              : isNear
                              ? 'bg-[#D97706]'
                              : 'bg-[#4CAF50]'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-[#5F7265]">
                        <span>{percent}% used</span>
                        <span>{remaining} remaining</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* CARD 3: Characters Processed */}
              <div className="bg-white border border-[#DCEBDD] rounded-[18px] p-6 shadow-[0_2px_8px_rgba(20,92,42,0.03)] hover:shadow-md hover:border-[#4CAF50]/50 transition-all duration-200 flex flex-col justify-between h-full space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-[#EAF7EC] text-[#145C2A] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-[#4CAF50]" />
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#EAF7EC] text-[#145C2A]">
                      Today
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-[#5F7265] uppercase tracking-wider block">
                      Characters Processed
                    </span>
                    <div className="text-3xl font-extrabold text-[#17301D] tracking-tight mt-1 truncate">
                      {usageData.today.ttsCharacters.toLocaleString()}
                      <span className="text-base font-semibold text-[#89968D] ml-1">chars</span>
                    </div>
                    <p className="text-xs text-[#5F7265] mt-1.5">
                      Text characters synthesized today.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#DCEBDD]/70 flex items-center justify-between text-xs text-[#5F7265]">
                  <span>This month:</span>
                  <span className="font-bold text-[#17301D]">
                    {usageData.month.ttsCharacters.toLocaleString()} chars
                  </span>
                </div>
              </div>

              {/* CARD 4: Cloud Audio Storage */}
              <div className="bg-white border border-[#DCEBDD] rounded-[18px] p-6 shadow-[0_2px_8px_rgba(20,92,42,0.03)] hover:shadow-md hover:border-[#4CAF50]/50 transition-all duration-200 flex flex-col justify-between h-full space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center shrink-0">
                      <HardDrive className="w-5 h-5 text-[#0284C7]" />
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1]">
                      Today
                    </span>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-[#5F7265] uppercase tracking-wider block">
                      Cloud Audio Storage
                    </span>
                    <div className="text-3xl font-extrabold text-[#17301D] tracking-tight mt-1 truncate">
                      {formatBytes(usageData.today.audioBytes)}
                      <span className="text-base font-semibold text-[#89968D] ml-1">used</span>
                    </div>
                    <p className="text-xs text-[#5F7265] mt-1.5">
                      Audio storage generated today.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#DCEBDD]/70 flex items-center justify-between text-xs text-[#5F7265]">
                  <span>This month:</span>
                  <span className="font-bold text-[#17301D]">
                    {formatBytes(usageData.month.audioBytes)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 8 & 9. Monthly Summary & Daily Limits Bento */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 8. Monthly Summary (Large White Card, lg:col-span-2) */}
            <div className="lg:col-span-2 bg-white border border-[#DCEBDD] rounded-[18px] p-6 shadow-[0_2px_8px_rgba(20,92,42,0.03)] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#DCEBDD]/70 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#EAF7EC] text-[#145C2A]">
                    <Layers className="w-4 h-4 text-[#4CAF50]" />
                  </div>
                  <h3 className="text-base font-bold text-[#145C2A]">
                    This Month's Summary
                  </h3>
                </div>
                <span className="text-xs text-[#5F7265] font-medium">
                  Cumulative monthly activity
                </span>
              </div>

              {/* Four smaller summary blocks */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {/* Block 1: TTS Generated */}
                <div className="p-4 rounded-xl bg-[#F7FBF8] border border-[#DCEBDD] space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-[#5F7265] font-medium">
                    <div className="w-6 h-6 rounded-lg bg-[#EAF7EC] text-[#145C2A] flex items-center justify-center shrink-0">
                      <Volume2 className="w-3.5 h-3.5 text-[#4CAF50]" />
                    </div>
                    <span>TTS Generated</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-[#17301D] block">
                    {usageData.month.ttsGenerations}
                  </span>
                </div>

                {/* Block 2: AI Enhancements */}
                <div className="p-4 rounded-xl bg-[#F7FBF8] border border-[#DCEBDD] space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-[#5F7265] font-medium">
                    <div className="w-6 h-6 rounded-lg bg-[#F3E8FF] text-[#7E22CE] flex items-center justify-center shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-[#9333EA]" />
                    </div>
                    <span>AI Enhancements</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-[#17301D] block">
                    {usageData.month.aiEnhancements}
                  </span>
                </div>

                {/* Block 3: Characters */}
                <div className="p-4 rounded-xl bg-[#F7FBF8] border border-[#DCEBDD] space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-[#5F7265] font-medium">
                    <div className="w-6 h-6 rounded-lg bg-[#EAF7EC] text-[#145C2A] flex items-center justify-center shrink-0">
                      <FileText className="w-3.5 h-3.5 text-[#4CAF50]" />
                    </div>
                    <span>Characters</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-[#17301D] block truncate">
                    {usageData.month.ttsCharacters.toLocaleString()}
                  </span>
                </div>

                {/* Block 4: Storage Used */}
                <div className="p-4 rounded-xl bg-[#F7FBF8] border border-[#DCEBDD] space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-[#5F7265] font-medium">
                    <div className="w-6 h-6 rounded-lg bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center shrink-0">
                      <HardDrive className="w-3.5 h-3.5 text-[#0284C7]" />
                    </div>
                    <span>Storage Used</span>
                  </div>
                  <span className="text-xl sm:text-2xl font-bold text-[#17301D] block truncate">
                    {formatBytes(usageData.month.audioBytes)}
                  </span>
                </div>
              </div>
            </div>

            {/* 9. Daily Limits (Separate White/Light-Green Card, lg:col-span-1) */}
            <div className="bg-white border border-[#DCEBDD] rounded-[18px] p-6 shadow-[0_2px_8px_rgba(20,92,42,0.03)] space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[#145C2A]">
                    <div className="p-1.5 rounded-lg bg-[#EAF7EC] text-[#145C2A]">
                      <ShieldCheck className="w-4 h-4 text-[#4CAF50]" />
                    </div>
                    <h3 className="text-base font-bold text-[#145C2A]">
                      Your Daily Limits
                    </h3>
                  </div>
                  <p className="text-xs text-[#5F7265]">
                    Usage resets daily at 12:00 AM ({usageData.timezone || 'UTC'})
                  </p>
                </div>

                {/* Limits list with clean horizontal separators */}
                <ul className="space-y-2.5 text-xs pt-1">
                  <li className="flex items-center justify-between pb-2 border-b border-[#DCEBDD]/70">
                    <span className="text-[#5F7265]">TTS Generations</span>
                    <span className="font-bold text-[#17301D]">
                      {usageData.limits.ttsDailyLimit} / day
                    </span>
                  </li>
                  <li className="flex items-center justify-between pb-2 border-b border-[#DCEBDD]/70">
                    <span className="text-[#5F7265]">AI Enhancements</span>
                    <span className="font-bold text-[#17301D]">
                      {usageData.limits.aiDailyLimit} / day
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-[#5F7265]">Maximum TTS Text</span>
                    <span className="font-bold text-[#17301D]">
                      {usageData.limits.maxTtsCharacters.toLocaleString()} chars
                    </span>
                  </li>
                </ul>
              </div>

              {/* Bottom Soft Green Daily Reset Information Box */}
              <div className="p-3.5 rounded-xl bg-[#F2FAF3] border border-[#DCEBDD] space-y-1 mt-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#145C2A]">
                  <Clock className="w-4 h-4 text-[#4CAF50]" />
                  <span>Daily Reset</span>
                </div>
                <p className="text-[11px] text-[#5F7265] leading-relaxed">
                  Daily limits reset automatically at the beginning of the next usage day (12:00 AM {usageData.timezone || 'UTC'}).
                </p>
              </div>
            </div>
          </div>

          {/* 10. Recent Usage (Full-Width White Card) */}
          <div className="bg-white border border-[#DCEBDD] rounded-[18px] p-6 shadow-[0_2px_8px_rgba(20,92,42,0.03)] space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCEBDD]/70 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#EAF7EC] text-[#145C2A]">
                  <Calendar className="w-4 h-4 text-[#4CAF50]" />
                </div>
                <h3 className="text-base font-bold text-[#145C2A]">
                  Recent Usage
                </h3>
              </div>
              <span className="text-xs text-[#5F7265] font-medium">
                Last {usageData.recentUsage.length} day{usageData.recentUsage.length === 1 ? '' : 's'}
              </span>
            </div>

            {usageData.recentUsage.length === 0 ? (
              <div className="text-center py-10 text-xs text-[#5F7265] space-y-1">
                <p className="font-medium">No recent usage recorded yet.</p>
                <p className="text-[#89968D]">Generate speech in the Studio to track daily activity here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[560px]">
                  <thead>
                    <tr className="bg-[#F2FAF3] text-[#145C2A] font-bold border-b border-[#DCEBDD]">
                      <th className="py-2.5 px-3.5 rounded-l-lg">Date</th>
                      <th className="py-2.5 px-3.5">TTS Generations</th>
                      <th className="py-2.5 px-3.5">AI Enhancements</th>
                      <th className="py-2.5 px-3.5">Characters</th>
                      <th className="py-2.5 px-3.5 rounded-r-lg">Audio Stored</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCEBDD]/60">
                    {usageData.recentUsage.map((record, idx) => (
                      <tr
                        key={record.date || idx}
                        className="hover:bg-[#F7FBF8] transition-colors"
                      >
                        <td className="py-3 px-3.5 font-semibold text-[#17301D]">
                          {formatUsageDate(record.date, usageData.recentUsage[0]?.date)}
                        </td>
                        <td className="py-3 px-3.5 text-[#17301D]">
                          <span className="inline-flex items-center gap-1 font-bold">
                            {record.ttsGenerations}
                            <span className="text-[11px] text-[#89968D] font-normal">
                              / {usageData.limits.ttsDailyLimit}
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-[#17301D]">
                          <span className="inline-flex items-center gap-1 font-bold">
                            {record.aiEnhancements}
                            <span className="text-[11px] text-[#89968D] font-normal">
                              / {usageData.limits.aiDailyLimit}
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-[#5F7265]">
                          {record.ttsCharacters.toLocaleString()}
                        </td>
                        <td className="py-3 px-3.5 text-[#5F7265] font-medium">
                          {formatBytes(record.audioBytes)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
