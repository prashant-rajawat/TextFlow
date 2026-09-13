import React, { useState } from 'react';
import { Volume2, Info, LogOut, History as HistoryIcon, Sparkles, Star, Gauge } from 'lucide-react';
import { AboutModal } from './AboutModal';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  onNavigateHome?: () => void;
  onNavigateHistory?: () => void;
  onNavigateFavorites?: () => void;
  onNavigateUsage?: () => void;
  onNavigateLogin?: () => void;
  onNavigateSignup?: () => void;
  currentView?: 'studio' | 'history' | 'favorites' | 'usage' | 'login' | 'signup';
}

export const Header: React.FC<HeaderProps> = ({
  onNavigateHome,
  onNavigateHistory,
  onNavigateFavorites,
  onNavigateUsage,
  onNavigateLogin,
  onNavigateSignup,
  currentView = 'studio',
}) => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left branding */}
          <div
            onClick={() => onNavigateHome?.()}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Volume2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                TextFlow
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mt-0.5">
                Text To Speech
              </span>
            </div>
          </div>

          {/* Center/Right Navigation */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Views Tabs */}
                <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <button
                    type="button"
                    onClick={onNavigateHome}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      currentView === 'studio'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Studio</span>
                  </button>

                  <button
                    type="button"
                    onClick={onNavigateHistory}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      currentView === 'history'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <HistoryIcon className="w-3.5 h-3.5" />
                    <span>History</span>
                  </button>

                  <button
                    type="button"
                    onClick={onNavigateFavorites}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      currentView === 'favorites'
                        ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>Favorites</span>
                  </button>

                  <button
                    type="button"
                    onClick={onNavigateUsage}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      currentView === 'usage'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Gauge className="w-3.5 h-3.5" />
                    <span>Usage</span>
                  </button>
                </div>

                {/* User Account Chip */}
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-xs">
                  <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-[100px] truncate">
                    {user.name}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => logout()}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-1.5 focus:outline-none"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4 text-slate-400 hover:text-red-500" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {currentView !== 'login' && (
                  <button
                    type="button"
                    onClick={onNavigateLogin}
                    className="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Sign In
                  </button>
                )}
                {currentView !== 'signup' && (
                  <button
                    type="button"
                    onClick={onNavigateSignup}
                    className="px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
                  >
                    Create Account
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsAboutOpen(true)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none ml-1"
              title="About TextFlow"
              aria-label="About TextFlow"
            >
              <Info className="w-4 h-4" />
            </button>
          </nav>
        </div>
      </header>

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </>
  );
};
