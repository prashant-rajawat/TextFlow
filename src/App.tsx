import React, { useState } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Home } from './pages/Home';
import { HistoryPage } from './pages/History';
import { FavoritesPage } from './pages/Favorites';
import { UsagePage } from './pages/Usage';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [mainView, setMainView] = useState<'studio' | 'history' | 'favorites' | 'usage'>('studio');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#58B957] animate-spin" />
          <p className="text-xs font-semibold text-[#65756A] animate-pulse">
            Loading TextFlow Workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#17301D] font-sans antialiased flex flex-col selection:bg-[#58B957] selection:text-white">
      {/* Responsive Header */}
      <Header
        onNavigateHome={() => {
          if (isAuthenticated) {
            setMainView('studio');
          } else {
            setAuthView('login');
          }
        }}
        onNavigateHistory={() => setMainView('history')}
        onNavigateFavorites={() => setMainView('favorites')}
        onNavigateUsage={() => setMainView('usage')}
        onNavigateLogin={() => setAuthView('login')}
        onNavigateSignup={() => setAuthView('signup')}
        currentView={isAuthenticated ? mainView : authView}
      />

      {/* Main Content Area */}
      <main className="flex-1 space-y-6">
        {isAuthenticated ? (
          mainView === 'studio' ? (
            <>
              <Hero />
              <Home />
            </>
          ) : mainView === 'history' ? (
            <HistoryPage onNavigateStudio={() => setMainView('studio')} />
          ) : mainView === 'favorites' ? (
            <FavoritesPage onNavigateStudio={() => setMainView('studio')} />
          ) : (
            <UsagePage onNavigateStudio={() => setMainView('studio')} />
          )
        ) : (
          <div className="pt-6 sm:pt-12">
            {authView === 'login' ? (
              <Login onSwitchToSignup={() => setAuthView('signup')} />
            ) : (
              <Signup onSwitchToLogin={() => setAuthView('login')} />
            )}
          </div>
        )}
      </main>

      {/* Application Footer */}
      <footer className="border-t border-[#DDEBDD] bg-[#F7FBF7] py-6 px-4 text-center text-xs text-[#65756A]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#17301D]">TextFlow</span>
            <span>— Next-Generation Text-to-Speech</span>
          </div>
          <p>© {new Date().getFullYear()} TextFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

