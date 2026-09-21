import React, { useState } from 'react';
import { Volume2, LogOut, History as HistoryIcon, Sparkles, Star, Gauge } from 'lucide-react';
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
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[#DDEBDD] bg-white/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">
          {/* Left branding */}
          <div
            onClick={() => onNavigateHome?.()}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-[#58B957] text-white flex items-center justify-center font-bold shadow-xs">
              <Volume2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold tracking-tight text-[#176B2C] leading-none">
                TextFlow
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#58B957] mt-0.5">
                TEXT TO SPEECH
              </span>
            </div>
          </div>

          {/* Center/Right Navigation */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Views Tabs */}
                <div className="flex items-center p-1 bg-[#F7FBF7] rounded-xl border border-[#DDEBDD]">
                  <button
                    type="button"
                    onClick={onNavigateHome}
                    className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      currentView === 'studio'
                        ? 'bg-[#EEF9EF] text-[#176B2C] shadow-xs'
                        : 'text-[#65756A] hover:text-[#176B2C] hover:bg-[#EEF9EF]/50'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#58B957]" />
                    <span>Studio</span>
                  </button>

                  <button
                    type="button"
                    onClick={onNavigateHistory}
                    className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      currentView === 'history'
                        ? 'bg-[#EEF9EF] text-[#176B2C] shadow-xs'
                        : 'text-[#65756A] hover:text-[#176B2C] hover:bg-[#EEF9EF]/50'
                    }`}
                  >
                    <HistoryIcon className="w-3.5 h-3.5 text-[#58B957]" />
                    <span>History</span>
                  </button>

                  <button
                    type="button"
                    onClick={onNavigateFavorites}
                    className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      currentView === 'favorites'
                        ? 'bg-[#EEF9EF] text-[#176B2C] shadow-xs'
                        : 'text-[#65756A] hover:text-[#176B2C] hover:bg-[#EEF9EF]/50'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 fill-[#58B957] text-[#58B957]" />
                    <span>Favorites</span>
                  </button>

                  <button
                    type="button"
                    onClick={onNavigateUsage}
                    className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      currentView === 'usage'
                        ? 'bg-[#EEF9EF] text-[#176B2C] shadow-xs'
                        : 'text-[#65756A] hover:text-[#176B2C] hover:bg-[#EEF9EF]/50'
                    }`}
                  >
                    <Gauge className="w-3.5 h-3.5 text-[#58B957]" />
                    <span>Usage</span>
                  </button>
                </div>

                {/* User Account Chip */}
                <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F7FBF7] border border-[#DDEBDD] text-xs">
                  <div className="w-5 h-5 rounded-full bg-[#58B957] text-white font-bold flex items-center justify-center text-[10px]">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-[#17301D] max-w-[100px] truncate">
                    {user.name}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => logout()}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#65756A] hover:text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5 focus:outline-none"
                  aria-label="Log out"
                >
                  <LogOut className="w-4 h-4 text-[#65756A] hover:text-red-500" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {currentView !== 'login' && (
                  <button
                    type="button"
                    onClick={onNavigateLogin}
                    className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-[#17301D] hover:bg-[#F7FBF7] transition-colors"
                  >
                    Sign In
                  </button>
                )}
                {currentView !== 'signup' && (
                  <button
                    type="button"
                    onClick={onNavigateSignup}
                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#58B957] hover:bg-[#3FA94D] text-white shadow-xs transition-colors"
                  >
                    Create Account
                  </button>
                )}
              </div>
            )}
          </nav>
        </div>
      </header>
    </>
  );
};


