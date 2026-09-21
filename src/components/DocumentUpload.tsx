import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Loader2, AlertCircle } from 'lucide-react';
import { MAX_FILE_SIZE_BYTES } from '../services/fileService';

interface DocumentUploadProps {
  onFileSelected: (file: File) => void;
  isProcessing?: boolean;
  disabled?: boolean;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onFileSelected,
  isProcessing = false,
  disabled = false,
}) => {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || isProcessing) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled || isProcessing) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      onFileSelected(file);
      // Reset input value
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      onFileSelected(file);
      // Reset input value so same file can be re-selected if needed
      e.target.value = '';
    }
  };

  const handleButtonClick = () => {
    if (disabled || isProcessing) return;
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || isProcessing) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const isInteractiveDisabled = disabled || isProcessing;

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-sm font-semibold text-[#17301D] flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#58B957]" />
          <span>Upload Document</span>
        </label>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EEF9EF] text-[#176B2C] border border-[#DDEBDD]">
          TXT • PDF • DOCX
        </span>
      </div>

      <div
        id="document-dropzone"
        role="button"
        tabIndex={isInteractiveDisabled ? -1 : 0}
        aria-label="Upload document dropzone: drag and drop a TXT, PDF, or DOCX file or press enter to browse files"
        aria-disabled={isInteractiveDisabled}
        aria-busy={isProcessing}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        className={`relative group rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#58B957] focus:ring-offset-2 ${
          isDragOver
            ? 'border-[#58B957] bg-[#EEF9EF] scale-[1.008]'
            : 'border-[#DDEBDD] bg-[#F7FBF7] hover:border-[#58B957] hover:bg-[#EEF9EF]/40'
        } ${isInteractiveDisabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
        onClick={handleButtonClick}
      >
        <input
          id="document-file-input"
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={handleFileInputChange}
          disabled={isInteractiveDisabled}
          aria-hidden="true"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-2 space-y-2.5">
              <div className="p-3 rounded-full bg-[#EEF9EF] text-[#176B2C] animate-pulse">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
              <p className="text-sm font-medium text-[#17301D]">
                Processing document...
              </p>
              <p className="text-xs text-[#65756A]">
                Extracting and formatting text content
              </p>
            </div>
          ) : (
            <>
              <div className="p-3 rounded-2xl bg-[#EEF9EF] text-[#176B2C] group-hover:scale-110 group-hover:bg-[#E2F5E4] transition-all duration-200">
                <UploadCloud className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <p className="text-sm font-medium text-[#17301D]">
                  <span className="hidden sm:inline">Drag & drop your document here or </span>
                  <button
                    id="browse-files-button"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleButtonClick();
                    }}
                    className="font-semibold text-[#176B2C] hover:text-[#125322] underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-[#58B957] rounded px-1"
                  >
                    Browse Files
                  </button>
                </p>
                <p className="text-xs text-[#65756A]">
                  Supports TXT, PDF, and Word (DOCX) files up to 10MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
