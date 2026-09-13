import React from 'react';
import { FileText, Trash2, CheckCircle2, FileCode, FileSpreadsheet } from 'lucide-react';
import { ExtractedDocInfo } from '../types/tts';

interface FileInfoCardProps {
  fileInfo: ExtractedDocInfo;
  onRemove: () => void;
  disabled?: boolean;
}

export const FileInfoCard: React.FC<FileInfoCardProps> = ({
  fileInfo,
  onRemove,
  disabled = false,
}) => {
  const getBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200/80 dark:border-red-800/60';
      case 'docx':
        return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60';
      case 'txt':
      default:
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60';
    }
  };

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'docx':
        return <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'txt':
      default:
        return <FileCode className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <div
      id="file-info-card"
      className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl gap-3.5 transition-all duration-200"
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shrink-0">
          {getFileIcon(fileInfo.fileType)}
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-[320px]">
              {fileInfo.fileName}
            </span>
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border ${getBadgeColor(
                fileInfo.fileType
              )}`}
            >
              {fileInfo.fileType}
            </span>
            {fileInfo.isTruncated && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                Truncated to 5k
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>
                <strong className="font-medium text-slate-700 dark:text-slate-300">
                  {fileInfo.characterCount.toLocaleString()}
                </strong>{' '}
                characters
              </span>
            </span>
            <span>•</span>
            <span>
              <strong className="font-medium text-slate-700 dark:text-slate-300">
                {fileInfo.wordCount.toLocaleString()}
              </strong>{' '}
              words
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end w-full sm:w-auto shrink-0 pt-1 sm:pt-0">
        <button
          id="remove-file-button"
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Remove uploaded document"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Remove File</span>
        </button>
      </div>
    </div>
  );
};
