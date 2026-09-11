import React from 'react';
import { Download } from 'lucide-react';

interface DownloadButtonProps {
  audioUrl?: string;
  filename?: string;
  disabled?: boolean;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  audioUrl,
  filename = 'speech.mp3',
  disabled = false,
}) => {
  const handleDownload = () => {
    if (!audioUrl) return;
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isBtnDisabled = disabled || !audioUrl;

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isBtnDisabled}
      aria-label="Download generated audio file"
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
        isBtnDisabled
          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed border border-slate-200 dark:border-slate-800'
          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 shadow-xs'
      }`}
    >
      <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
      <span>Download Audio</span>
    </button>
  );
};
