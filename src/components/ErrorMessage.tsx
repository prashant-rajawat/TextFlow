import React from 'react';
import { AlertCircle, WifiOff, Server, X } from 'lucide-react';
import { ApplicationError, ErrorType } from '../types/tts';

interface ErrorMessageProps {
  error: ApplicationError | string | null;
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onDismiss }) => {
  if (!error) return null;

  const errorObj: ApplicationError =
    typeof error === 'string'
      ? { type: 'validation', message: error }
      : {
          type: error.type || 'general',
          message: error.message || 'An unexpected error occurred.',
          details: error.details,
        };

  const getIcon = (type: ErrorType) => {
    switch (type) {
      case 'validation':
        return <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />;
      case 'network':
        return <WifiOff className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />;
      case 'api':
      case 'general':
      default:
        return <Server className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />;
    }
  };

  const getBgClass = (type: ErrorType) => {
    switch (type) {
      case 'validation':
        return 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200';
      case 'network':
      case 'api':
      case 'general':
      default:
        return 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-200';
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`w-full p-4 rounded-xl border flex items-start justify-between gap-3 shadow-xs transition-all ${getBgClass(
        errorObj.type
      )}`}
    >
      <div className="flex items-start gap-3">
        {getIcon(errorObj.type)}
        <div className="space-y-0.5">
          <p className="text-sm font-semibold leading-tight">{errorObj.message}</p>
          {errorObj.details && (
            <p className="text-xs opacity-80 leading-relaxed mt-1">{errorObj.details}</p>
          )}
        </div>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-500"
          aria-label="Dismiss error message"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
