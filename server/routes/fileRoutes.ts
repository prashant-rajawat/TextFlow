import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth';
import { extractTextHandler } from '../controllers/fileController';
import { MAX_FILE_SIZE_BYTES } from '../services/fileExtractionService';

const router = Router();

// Configure Multer for in-memory temporary storage with a 10MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES, // 10MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Basic pre-check on file extension/mimetype
    const lowerName = (file.originalname || '').toLowerCase();
    const isSupportedExt = lowerName.endsWith('.txt') || lowerName.endsWith('.pdf') || lowerName.endsWith('.docx');
    
    if (!isSupportedExt) {
      const error: any = new Error('Unsupported file type. Please upload a TXT, PDF, or DOCX file.');
      error.code = 'UNSUPPORTED_FILE_TYPE';
      error.statusCode = 400;
      return cb(error, false);
    }
    cb(null, true);
  },
});

/**
 * Middleware wrapper to cleanly intercept and normalize Multer errors (e.g., LIMIT_FILE_SIZE).
 */
const uploadSingleFile = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(413).json({
            success: false,
            code: 'FILE_TOO_LARGE',
            message: 'File is too large. Maximum file size is 10 MB.',
            error: {
              code: 'FILE_TOO_LARGE',
              message: 'File is too large. Maximum file size is 10 MB.',
            },
          });
          return;
        }
        res.status(400).json({
          success: false,
          code: 'INVALID_FILE',
          message: err.message || 'File upload failed.',
          error: {
            code: 'INVALID_FILE',
            message: err.message || 'File upload failed.',
          },
        });
        return;
      }

      if (err.code === 'UNSUPPORTED_FILE_TYPE') {
        res.status(400).json({
          success: false,
          code: 'UNSUPPORTED_FILE_TYPE',
          message: err.message || 'Unsupported file type. Please upload a TXT, PDF, or DOCX file.',
          error: {
            code: 'UNSUPPORTED_FILE_TYPE',
            message: err.message || 'Unsupported file type. Please upload a TXT, PDF, or DOCX file.',
          },
        });
        return;
      }

      res.status(400).json({
        success: false,
        code: 'FILE_PROCESSING_FAILED',
        message: err.message || "We couldn't process this document. Please try another file.",
        error: {
          code: 'FILE_PROCESSING_FAILED',
          message: err.message || "We couldn't process this document. Please try another file.",
        },
      });
      return;
    }
    next();
  });
};

// POST /api/files/extract-text (Protected - Requires valid auth session)
router.post('/extract-text', requireAuth, uploadSingleFile, extractTextHandler);

export default router;
