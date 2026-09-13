import React, { useEffect, useState, useCallback } from 'react';
import {
  Gauge,
  Sparkles,
  Volume2,
  FileText,
  HardDrive,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowUpRight,
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
      setError('Unable to load your usage information. Please try again.');
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
    if (bytes <= 0) return '0 B';
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
      const date = new Date(resetAt);
      return `12:00 AM (${timezone})`;
    } catch {
      return `12:00 AM (${timezone})`;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
              <Gauge className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Usage & Limits
            </h1>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Track your TextFlow usage and remaining allowance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadUsage(true)}
            disabled={isLoading || isRefreshing}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs transition-all flex items-center gap-2 disabled:opacity-60"
            title="Refresh usage data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {onNavigateStudio && (
            <button
              type="button"
              onClick={onNavigateStudio}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all flex items-center gap-1.5"
            >
              <span>Open Studio</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-6" aria-busy="true" aria-live="polite">
          <div className="flex items-center justify-center p-8 bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 animate-pulse">
                Loading usage...
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-200/60 dark:border-slate-800"
              />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-900 dark:text-red-200">Unable to load usage</h3>
              <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadUsage(false)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors shrink-0"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Main Usage Content */}
      {!isLoading && !error && usageData && (
        <>
          {/* Near-Limit or At-Limit Attention Banners */}
          {usageData.today.ttsGenerations >= usageData.today.ttsLimit ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 text-rose-900 dark:text-rose-200">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <p className="font-bold">You've reached your daily TextFlow TTS limit.</p>
                <p className="text-rose-700 dark:text-rose-400">
                  Your daily TTS allowance will automatically reset at {formatResetTime(usageData.resetAt, usageData.timezone)}.
                </p>
              </div>
            </div>
          ) : usageData.today.ttsGenerations >= Math.floor(usageData.today.ttsLimit * 0.8) ? (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-amber-900 dark:text-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs">
                <p className="font-bold">
                  You've used {usageData.today.ttsGenerations} of {usageData.today.ttsLimit} TTS generations today.
                </p>
                <p className="text-amber-700 dark:text-amber-400">
                  You have {usageData.today.ttsRemaining} speech generation{usageData.today.ttsRemaining === 1 ? '' : 's'} remaining today.
                </p>
              </div>
            </div>
          ) : null}

          {/* Today's Usage Cards Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-500" />
                <span>Today's Usage</span>
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Timezone: <span className="font-semibold text-slate-700 dark:text-slate-300">{usageData.timezone}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* 1. TTS Generations Card */}
              {(() => {
                const used = usageData.today.ttsGenerations;
                const limit = usageData.today.ttsLimit;
                const percent = Math.min(100, Math.round((used / limit) * 100));
                const isFull = used >= limit;
                const isNear = used >= Math.floor(limit * 0.8) && !isFull;

                return (
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Volume2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          TTS Generations
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isFull
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : isNear
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                          }`}
                        >
                          {usageData.today.ttsRemaining} remaining
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                          {used}
                        </span>
                        <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                          / {limit}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      {/* Accessible Progress Bar */}
                      <div
                        className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden"
                        role="progressbar"
                        aria-valuenow={used}
                        aria-valuemin={0}
                        aria-valuemax={limit}
                        aria-label={`TTS Generations: ${used} of ${limit}`}
                      >
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            isFull
                              ? 'bg-rose-500'
                              : isNear
                              ? 'bg-amber-500'
                              : 'bg-indigo-600'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span>{percent}% used</span>
                        <span>Daily cap: {limit}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 2. AI Enhancements Card */}
              {(() => {
                const used = usageData.today.aiEnhancements;
                const limit = usageData.today.aiLimit;
                const percent = Math.min(100, Math.round((used / limit) * 100));
                const isFull = used >= limit;
                const isNear = used >= Math.floor(limit * 0.8) && !isFull;

                return (
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between relative overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                          AI Enhancements
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isFull
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : isNear
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                          }`}
                        >
                          {usageData.today.aiRemaining} remaining
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                          {used}
                        </span>
                        <span className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                          / {limit}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      <div
                        className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden"
                        role="progressbar"
                        aria-valuenow={used}
                        aria-valuemin={0}
                        aria-valuemax={limit}
                        aria-label={`AI Enhancements: ${used} of ${limit}`}
                      >
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            isFull
                              ? 'bg-rose-500'
                              : isNear
                              ? 'bg-amber-500'
                              : 'bg-purple-600'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        <span>{percent}% used</span>
                        <span>Daily cap: {limit}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 3. Characters Processed Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Characters Processed
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Today
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                      {usageData.today.ttsCharacters.toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Text characters synthesized today
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>This month:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {usageData.month.ttsCharacters.toLocaleString()} chars
                  </span>
                </div>
              </div>

              {/* 4. Cloud Audio Storage Card */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                      Cloud Audio
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                      Today
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                      {formatBytes(usageData.today.audioBytes)}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Audio storage generated today
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>This month:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    {formatBytes(usageData.month.audioBytes)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Totals Overview & Limits Breakdown Bento */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Summary Box */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    This Month's Summary
                  </h3>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Cumulative monthly activity
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    TTS Generated
                  </span>
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {usageData.month.ttsGenerations}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    AI Enhancements
                  </span>
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {usageData.month.aiEnhancements}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Characters
                  </span>
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {usageData.month.ttsCharacters.toLocaleString()}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    Storage Total
                  </span>
                  <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    {formatBytes(usageData.month.audioBytes)}
                  </span>
                </div>
              </div>
            </div>

            {/* Daily Limits & Reset Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-slate-50/50 dark:from-indigo-950/20 dark:to-slate-900/50 border border-indigo-100/80 dark:border-indigo-900/40 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <ShieldCheck className="w-4 h-4" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Your Daily Limits
                  </h3>
                </div>

                <ul className="space-y-2.5 text-xs">
                  <li className="flex items-center justify-between pb-1.5 border-b border-indigo-100/60 dark:border-indigo-900/40">
                    <span className="text-slate-600 dark:text-slate-400">TTS Generations</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {usageData.limits.ttsDailyLimit} / day
                    </span>
                  </li>
                  <li className="flex items-center justify-between pb-1.5 border-b border-indigo-100/60 dark:border-indigo-900/40">
                    <span className="text-slate-600 dark:text-slate-400">AI Enhancements</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {usageData.limits.aiDailyLimit} / day
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Maximum TTS Text</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {usageData.limits.maxTtsCharacters.toLocaleString()} chars
                    </span>
                  </li>
                </ul>
              </div>

              {/* Reset Information */}
              <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Daily Reset</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Daily limits reset automatically at the beginning of the next usage day ({formatResetTime(usageData.resetAt, usageData.timezone)}).
                </p>
              </div>
            </div>
          </div>

          {/* Recent Usage Table */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Recent Usage</span>
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Last {usageData.recentUsage.length} day{usageData.recentUsage.length === 1 ? '' : 's'}
              </span>
            </div>

            {usageData.recentUsage.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
                No recent usage records yet. Start generating speech in the Studio!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                      <th className="pb-3 px-3">Date</th>
                      <th className="pb-3 px-3">TTS Generations</th>
                      <th className="pb-3 px-3">AI Enhancements</th>
                      <th className="pb-3 px-3">Characters</th>
                      <th className="pb-3 px-3">Audio Stored</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {usageData.recentUsage.map((record, idx) => (
                      <tr
                        key={record.date || idx}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {formatUsageDate(record.date, usageData.recentUsage[0]?.date)}
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1 font-bold">
                            {record.ttsGenerations}
                            <span className="text-[10px] text-slate-400 font-normal">
                              / {usageData.limits.ttsDailyLimit}
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1 font-bold">
                            {record.aiEnhancements}
                            <span className="text-[10px] text-slate-400 font-normal">
                              / {usageData.limits.aiDailyLimit}
                            </span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          {record.ttsCharacters.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 font-medium">
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
