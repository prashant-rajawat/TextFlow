import { Request, Response, NextFunction } from 'express';
import { processUploadedDocument, FileProcessingError } from '../services/fileExtractionService';

/**
 * Controller handler for POST /api/files/extract-text
 * Expects multipart/form-data with a single file under key 'file'.
 */
export async function extractTextHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const uploadedFile = req.file;

    if (!uploadedFile || !uploadedFile.buffer) {
      res.status(400).json({
        success: false,
        code: 'INVALID_FILE',
        message: 'Please select a document to upload.',
        error: {
          code: 'INVALID_FILE',
          message: 'Please select a document to upload.',
        },
      });
      return;
    }

    const result = await processUploadedDocument(
      uploadedFile.originalname || 'document',
      uploadedFile.mimetype || 'application/octet-stream',
      uploadedFile.buffer
    );

    res.status(200).json({
      success: true,
      fileName: result.fileName,
      fileType: result.fileType,
      characterCount: result.characterCount,
      wordCount: result.wordCount,
      text: result.text,
    });
  } catch (error: any) {
    if (error instanceof FileProcessingError) {
      res.status(error.statusCode).json({
        success: false,
        code: error.code,
        message: error.message,
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    console.error('[FileController] Unexpected error in extractTextHandler:', error);
    res.status(500).json({
      success: false,
      code: 'FILE_PROCESSING_FAILED',
      message: "We couldn't process this document. Please try another file.",
      error: {
        code: 'FILE_PROCESSING_FAILED',
        message: "We couldn't process this document. Please try another file.",
      },
    });
  }
}
