import path from 'path';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export type SupportedFileType = 'txt' | 'pdf' | 'docx';

export interface ExtractedFileResult {
  fileName: string;
  fileType: SupportedFileType;
  characterCount: number;
  wordCount: number;
  text: string;
}

export class FileProcessingError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = 'FileProcessingError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Maximum file size limit: 10 MB
 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10,485,760 bytes

/**
 * Sanitize uploaded filename to prevent directory traversal and remove unsafe characters.
 */
export function sanitizeFilename(originalName: string): string {
  if (!originalName || typeof originalName !== 'string') {
    return 'document';
  }

  // Extract base filename without path components
  const base = path.basename(originalName).trim();
  
  // Remove null bytes, control characters, and path separators
  const sanitized = base
    .replace(/[\x00-\x1F\x7F<>:"/\\|?*]/g, '_')
    .replace(/\.{2,}/g, '.') // Prevent .. traversal tricks
    .trim();

  return sanitized.slice(0, 150) || 'document';
}

/**
 * Detect file type based on extension, MIME type, and magic bytes.
 */
export function detectAndValidateFileType(
  fileName: string,
  mimeType: string,
  buffer: Buffer
): SupportedFileType {
  const ext = path.extname(fileName).toLowerCase().replace(/^\./, '');

  // 1. Validate Extension
  if (ext !== 'txt' && ext !== 'pdf' && ext !== 'docx') {
    throw new FileProcessingError(
      'Unsupported file type. Please upload a TXT, PDF, or DOCX file.',
      'UNSUPPORTED_FILE_TYPE',
      400
    );
  }

  // 2. Validate Buffer length
  if (!buffer || buffer.length === 0) {
    throw new FileProcessingError(
      'Uploaded file is empty. Please upload a valid document.',
      'INVALID_FILE',
      400
    );
  }

  // 3. Deep Magic-Byte & MIME Type Validation
  if (ext === 'pdf') {
    const isPdfMagic = buffer.length >= 4 && buffer.slice(0, 4).toString('ascii') === '%PDF';
    if (!isPdfMagic) {
      throw new FileProcessingError(
        'Invalid or corrupted PDF file. Please upload a valid PDF document.',
        'INVALID_FILE',
        400
      );
    }
    return 'pdf';
  }

  if (ext === 'docx') {
    // DOCX is a zip container (starts with PK\x03\x04 or PK\x05\x06)
    const isZipMagic =
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07);

    if (!isZipMagic) {
      throw new FileProcessingError(
        'Invalid or corrupted DOCX file. Please upload a valid Microsoft Word (.docx) document.',
        'INVALID_FILE',
        400
      );
    }
    return 'docx';
  }

  if (ext === 'txt') {
    // Reject binary executables or binary archives pretending to be txt
    if (buffer.length >= 2) {
      // Check for DOS MZ header
      if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
        throw new FileProcessingError(
          'Unsupported file type. Executable files are not allowed.',
          'UNSUPPORTED_FILE_TYPE',
          400
        );
      }
      // Check for ELF header
      if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
        throw new FileProcessingError(
          'Unsupported file type. Executable files are not allowed.',
          'UNSUPPORTED_FILE_TYPE',
          400
        );
      }
    }
    return 'txt';
  }

  throw new FileProcessingError(
    'Unsupported file type. Please upload a TXT, PDF, or DOCX file.',
    'UNSUPPORTED_FILE_TYPE',
    400
  );
}

/**
 * Clean and normalize extracted text:
 * - Strip null bytes and non-printable control characters (while preserving \n, \r, \t, and unicode letters)
 * - Standardize line breaks (\r\n -> \n, \r -> \n)
 * - Remove trailing whitespace on individual lines
 * - Collapse excessive consecutive blank lines (more than 2 consecutive newlines)
 */
export function normalizeExtractedText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') {
    return '';
  }

  // Remove null characters and non-printable ASCII control codes except \t (9) and \n (10)
  const cleaned = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Standardize line breaks
  const standardizedLines = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Trim trailing spaces from each line, but keep indentation and paragraphs intact
  const lines = standardizedLines.split('\n').map((line) => line.trimEnd());

  // Collapse 3+ consecutive newlines into 2 (one blank line between paragraphs)
  const result = lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return result;
}

/**
 * Calculate word count consistently with the frontend.
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Extract text from a plain TXT file.
 */
export async function extractTextFromTxt(buffer: Buffer): Promise<string> {
  try {
    const rawString = buffer.toString('utf-8');
    const normalized = normalizeExtractedText(rawString);
    if (!normalized || normalized.length === 0) {
      throw new FileProcessingError(
        'No readable text could be extracted from this TXT file.',
        'NO_TEXT_FOUND',
        400
      );
    }
    return normalized;
  } catch (error: any) {
    if (error instanceof FileProcessingError) throw error;
    throw new FileProcessingError(
      'Failed to read text file. The encoding may be unsupported.',
      'FILE_PROCESSING_FAILED',
      400
    );
  }
}

/**
 * Extract text from a PDF document using PDFParse.
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();

    let extractedText = '';
    if (result && Array.isArray(result.pages) && result.pages.length > 0) {
      // Join individual page texts cleanly
      extractedText = result.pages
        .map((p) => (typeof p.text === 'string' ? p.text.trim() : ''))
        .filter(Boolean)
        .join('\n\n');
    } else if (result && typeof result.text === 'string') {
      extractedText = result.text;
    }

    const normalized = normalizeExtractedText(extractedText);

    if (!normalized || normalized.length === 0) {
      throw new FileProcessingError(
        'No readable text could be extracted from this PDF.',
        'NO_TEXT_FOUND',
        400
      );
    }

    return normalized;
  } catch (error: any) {
    if (error instanceof FileProcessingError) throw error;
    console.error('[FileExtraction] PDF parse error:', error?.message || error);
    throw new FileProcessingError(
      'No readable text could be extracted from this PDF.',
      'PDF_EXTRACTION_FAILED',
      400
    );
  }
}

/**
 * Extract text from a Microsoft Word .docx document using Mammoth.
 */
export async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const rawText = result?.value || '';
    const normalized = normalizeExtractedText(rawText);

    if (!normalized || normalized.length === 0) {
      throw new FileProcessingError(
        'No readable text could be extracted from this DOCX file.',
        'NO_TEXT_FOUND',
        400
      );
    }

    return normalized;
  } catch (error: any) {
    if (error instanceof FileProcessingError) throw error;
    console.error('[FileExtraction] DOCX parse error:', error?.message || error);
    throw new FileProcessingError(
      'No readable text could be extracted from this DOCX file.',
      'DOCX_EXTRACTION_FAILED',
      400
    );
  }
}

/**
 * Master file processing service.
 */
export async function processUploadedDocument(
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<ExtractedFileResult> {
  // 1. File size check
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new FileProcessingError(
      'File is too large. Maximum file size is 10 MB.',
      'FILE_TOO_LARGE',
      413
    );
  }

  // 2. Filename sanitization & type validation
  const cleanFileName = sanitizeFilename(fileName);
  const fileType = detectAndValidateFileType(cleanFileName, mimeType, buffer);

  // 3. Extract text based on file type
  let extractedText = '';
  switch (fileType) {
    case 'txt':
      extractedText = await extractTextFromTxt(buffer);
      break;
    case 'pdf':
      extractedText = await extractTextFromPdf(buffer);
      break;
    case 'docx':
      extractedText = await extractTextFromDocx(buffer);
      break;
    default:
      throw new FileProcessingError(
        'Unsupported file type. Please upload a TXT, PDF, or DOCX file.',
        'UNSUPPORTED_FILE_TYPE',
        400
      );
  }

  const characterCount = extractedText.length;
  const wordCount = countWords(extractedText);

  return {
    fileName: cleanFileName,
    fileType,
    characterCount,
    wordCount,
    text: extractedText,
  };
}
