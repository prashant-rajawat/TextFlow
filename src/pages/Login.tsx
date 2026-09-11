import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginProps {
  onSwitchToSignup: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSwitchToSignup }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      await login({ email: trimmedEmail, password });
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Welcome back
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sign in to access your TextFlow Speech Studio account
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-200 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-medium">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="login-email"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="name@example.com"
                disabled={isLoading}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-60"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none ml-1"
            >
              Create one
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
