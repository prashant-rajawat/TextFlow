import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SignupProps {
  onSwitchToLogin: () => void;
}

export const Signup: React.FC<SignupProps> = ({ onSwitchToLogin }) => {
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live Password Criteria checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const validateFrontend = (): boolean => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Full Name is required.');
      return false;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter a valid email address.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return false;
    }

    if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      setError('Password must contain at least 8 characters, including uppercase, lowercase, number, and special character.');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFrontend()) return;

    setIsLoading(true);

    try {
      await signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
      });
    } catch (err: any) {
      setError(err.message || 'An error occurred during account creation.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-8">
      <div className="bg-white border border-[#DDEBDD] rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-[#17301D]">
            Create an Account
          </h2>
          <p className="text-xs text-[#65756A]">
            Sign up to access professional TextFlow Speech Synthesis
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-medium">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="signup-name"
              className="block text-xs font-semibold text-[#17301D]"
            >
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#8A978E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="signup-name"
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Jane Doe"
                disabled={isLoading}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DDEBDD] bg-[#FFFFFF] text-[#17301D] placeholder-[#8A978E] text-sm focus:outline-none focus:ring-2 focus:ring-[#58B957] focus:border-[#58B957] transition-all disabled:opacity-60"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="signup-email"
              className="block text-xs font-semibold text-[#17301D]"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8A978E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="name@example.com"
                disabled={isLoading}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-[#DDEBDD] bg-[#FFFFFF] text-[#17301D] placeholder-[#8A978E] text-sm focus:outline-none focus:ring-2 focus:ring-[#58B957] focus:border-[#58B957] transition-all disabled:opacity-60"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="signup-password"
              className="block text-xs font-semibold text-[#17301D]"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8A978E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#DDEBDD] bg-[#FFFFFF] text-[#17301D] placeholder-[#8A978E] text-sm focus:outline-none focus:ring-2 focus:ring-[#58B957] focus:border-[#58B957] transition-all disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A978E] hover:text-[#17301D] focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Live Password Strength Checklist */}
            <div className="p-2.5 bg-[#F7FBF7] rounded-xl border border-[#DDEBDD] text-[11px] space-y-1 text-[#65756A]">
              <div className="font-medium text-[#17301D] mb-1">Password Requirements:</div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <div className={`flex items-center gap-1 ${hasMinLength ? 'text-[#176B2C] font-semibold' : ''}`}>
                  <CheckCircle2 className={`w-3 h-3 ${hasMinLength ? 'text-[#58B957]' : 'text-[#DDEBDD]'}`} />
                  <span>8+ characters</span>
                </div>
                <div className={`flex items-center gap-1 ${hasUppercase ? 'text-[#176B2C] font-semibold' : ''}`}>
                  <CheckCircle2 className={`w-3 h-3 ${hasUppercase ? 'text-[#58B957]' : 'text-[#DDEBDD]'}`} />
                  <span>Uppercase letter</span>
                </div>
                <div className={`flex items-center gap-1 ${hasLowercase ? 'text-[#176B2C] font-semibold' : ''}`}>
                  <CheckCircle2 className={`w-3 h-3 ${hasLowercase ? 'text-[#58B957]' : 'text-[#DDEBDD]'}`} />
                  <span>Lowercase letter</span>
                </div>
                <div className={`flex items-center gap-1 ${hasNumber ? 'text-[#176B2C] font-semibold' : ''}`}>
                  <CheckCircle2 className={`w-3 h-3 ${hasNumber ? 'text-[#58B957]' : 'text-[#DDEBDD]'}`} />
                  <span>Number</span>
                </div>
                <div className={`flex items-center gap-1 col-span-2 ${hasSpecial ? 'text-[#176B2C] font-semibold' : ''}`}>
                  <CheckCircle2 className={`w-3 h-3 ${hasSpecial ? 'text-[#58B957]' : 'text-[#DDEBDD]'}`} />
                  <span>Special character (!@#$%^&*)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="signup-confirm-password"
              className="block text-xs font-semibold text-[#17301D]"
            >
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8A978E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="signup-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#DDEBDD] bg-[#FFFFFF] text-[#17301D] placeholder-[#8A978E] text-sm focus:outline-none focus:ring-2 focus:ring-[#58B957] focus:border-[#58B957] transition-all disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A978E] hover:text-[#17301D] focus:outline-none"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-[11px] text-red-500 mt-1">Passwords do not match.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !name.trim() || !email.trim() || !password || !passwordsMatch}
            className="w-full py-3 px-4 rounded-xl bg-[#58B957] hover:bg-[#3FA94D] text-white font-semibold text-sm shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#58B957] mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-[#DDEBDD] text-center">
          <p className="text-xs text-[#65756A]">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-semibold text-[#176B2C] hover:underline focus:outline-none ml-1"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
