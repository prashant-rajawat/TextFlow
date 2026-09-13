import { ExtractedDocInfo, ApplicationError, SupportedDocType } from '../types/tts';
import { tokenManager } from './tokenManager';
import { getApiBaseUrl } from './ttsService';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Validates a file before uploading.
 */
export function validateDocumentFile(file: File): { isValid: boolean; error?: ApplicationError } {
  if (!file) {
    return {
      isValid: false,
      error: {
        type: 'validation',
        code: 'INVALID_FILE',
        message: 'Please select a document to upload.',
      },
    };
  }

  // 1. File size validation (10 MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: {
        type: 'validation',
        code: 'FILE_TOO_LARGE',
        message: 'File is too large. Maximum file size is 10 MB.',
      },
    };
  }

  // 2. File extension validation
  const lowerName = file.name.toLowerCase();
  const isTxt = lowerName.endsWith('.txt');
  const isPdf = lowerName.endsWith('.pdf');
  const isDocx = lowerName.endsWith('.docx');

  if (!isTxt && !isPdf && !isDocx) {
    return {
      isValid: false,
      error: {
        type: 'validation',
        code: 'UNSUPPORTED_FILE_TYPE',
        message: 'Unsupported file type. Please upload a TXT, PDF, or DOCX file.',
      },
    };
  }

  return { isValid: true };
}

/**
 * Upload a document file and extract text from it.
 */
export async function extractTextFromFile(file: File): Promise<ExtractedDocInfo & { text: string }> {
  // Pre-validate on frontend
  const validation = validateDocumentFile(file);
  if (!validation.isValid && validation.error) {
    throw validation.error;
  }

  const formData = new FormData();
  formData.append('file', file);

  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/files/extract-text`;

  try {
    const authHeaders = await tokenManager.getAuthHeadersAsync();
    
    // Do not set Content-Type header manually for FormData so fetch sets boundary correctly
    const headers: Record<string, string> = {};
    if (authHeaders['Authorization']) {
      headers['Authorization'] = authHeaders['Authorization'];
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const code = data?.code || data?.error?.code || 'FILE_PROCESSING_FAILED';
      let message = data?.message || data?.error?.message;

      if (response.status === 413 || code === 'FILE_TOO_LARGE') {
        message = 'File is too large. Maximum file size is 10 MB.';
      } else if (code === 'UNSUPPORTED_FILE_TYPE') {
        message = 'Unsupported file type. Please upload a TXT, PDF, or DOCX file.';
      } else if (code === 'NO_TEXT_FOUND') {
        const lowerName = file.name.toLowerCase();
        const extName = lowerName.endsWith('.pdf') ? 'PDF' : lowerName.endsWith('.docx') ? 'DOCX' : 'TXT';
        message = message || `No readable text could be extracted from this ${extName} file.`;
      } else if (response.status === 401) {
        message = 'Please log in to upload and extract documents.';
      } else if (!message) {
        message = "We couldn't process this document. Please try another file.";
      }

      throw {
        type: 'api',
        code,
        message,
        details: data?.details,
        statusCode: response.status,
      } as ApplicationError;
    }

    if (!data?.success || typeof data?.text !== 'string') {
      throw {
        type: 'api',
        code: 'FILE_PROCESSING_FAILED',
        message: "We couldn't process this document. Please try another file.",
      } as ApplicationError;
    }

    const rawText = data.text;
    const characterCount = data.characterCount ?? rawText.length;
    const wordCount = data.wordCount ?? (rawText.trim() ? rawText.trim().split(/\s+/).filter(Boolean).length : 0);
    const fileType = (data.fileType || 'txt') as SupportedDocType;

    return {
      fileName: data.fileName || file.name,
      fileType,
      characterCount,
      wordCount,
      text: rawText,
      rawText,
    };
  } catch (error: any) {
    if (error?.type && error?.message) {
      throw error;
    }
    throw {
      type: 'network',
      code: 'NETWORK_ERROR',
      message: 'Network error while uploading document. Please check your connection and try again.',
    } as ApplicationError;
  }
}
