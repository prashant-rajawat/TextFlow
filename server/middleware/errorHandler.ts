import { Request, Response, NextFunction } from 'express';

export interface CustomError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
  details?: any;
}

/**
 * Centralized Express Error Handling Middleware.
 * Catches unhandled errors and body-parser syntax failures safely.
 */
export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const statusCode = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  // Handle JSON parsing errors (e.g. malformed JSON request body)
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      message: 'Invalid JSON request payload',
    });
    return;
  }

  // Handle payload size limit errors
  if (err.type === 'entity.too.large') {
    res.status(413).json({
      success: false,
      message: 'Request payload exceeds allowable limit (100kb maximum)',
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request payload exceeds allowable limit (100kb maximum)',
      },
    });
    return;
  }

  if (statusCode === 413 || (err as any).code === 'FILE_TOO_LARGE' || (err as any).code === 'LIMIT_FILE_SIZE') {
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

  // Handle 429 Quota / Rate limit / Request Throttled
  if (statusCode === 429) {
    const rawCode = (err as any).code;
    let errorCode = rawCode;
    let defaultMsg = 'Gemini daily quota has been reached. Please try again after the quota resets.';

    if (rawCode === 'AI_RATE_LIMITED') {
      defaultMsg = 'AI enhancement is temporarily rate limited. Please wait a moment and try again.';
    } else if (rawCode === 'AI_QUOTA_EXCEEDED') {
      defaultMsg = 'AI enhancement daily quota has been reached. Please try again later.';
    } else if (rawCode === 'TTS_RATE_LIMITED') {
      defaultMsg = 'Gemini is temporarily rate limited. Please wait a moment before trying again.';
    } else if (rawCode === 'TTS_REQUEST_THROTTLED') {
      defaultMsg = 'Please wait a moment before generating another speech.';
    } else if (!errorCode) {
      errorCode = 'QUOTA_EXCEEDED';
    }

    const clientMsg = (err as any).clientMessage || err.message || defaultMsg;
    const retryAfter = (err as any).retryAfter || (errorCode === 'TTS_RATE_LIMITED' || errorCode === 'AI_RATE_LIMITED' ? 5 : errorCode === 'TTS_REQUEST_THROTTLED' ? 3 : undefined);

    if (retryAfter) {
      res.setHeader('Retry-After', String(retryAfter));
    }

    res.status(429).json({
      success: false,
      code: errorCode,
      message: clientMsg,
      ...(retryAfter ? { retryAfter } : {}),
      error: {
        code: errorCode,
        message: clientMsg,
      },
    });
    return;
  }

  // Handle 400 Bad Request
  if (statusCode === 400) {
    const errorCode = (err as any).code || 'INVALID_REQUEST';
    const errorMessage = err.message || 'Invalid request parameters.';
    res.status(400).json({
      success: false,
      code: errorCode,
      message: errorMessage,
      error: {
        code: errorCode,
        message: errorMessage,
      },
    });
    return;
  }

  // Handle 401 Authentication
  if (statusCode === 401) {
    const errorCode = (err as any).code || 'AUTHENTICATION_REQUIRED';
    const errorMessage = err.message || 'Authentication failed. Please log in.';
    res.status(401).json({
      success: false,
      code: errorCode,
      message: errorMessage,
      error: {
        code: errorCode,
        message: errorMessage,
      },
    });
    return;
  }

  // Handle 403 Permission
  if (statusCode === 403) {
    const errorCode = (err as any).code || 'PERMISSION_DENIED';
    const errorMessage = err.message || 'Permission denied. Please verify your account permissions.';
    res.status(403).json({
      success: false,
      code: errorCode,
      message: errorMessage,
      error: {
        code: errorCode,
        message: errorMessage,
      },
    });
    return;
  }

  // Handle 404 Model Not Found
  if (statusCode === 404) {
    const errorCode = (err as any).code || 'RESOURCE_NOT_FOUND';
    const errorMessage = err.message || 'Requested resource or model was not found.';
    res.status(404).json({
      success: false,
      code: errorCode,
      message: errorMessage,
      error: {
        code: errorCode,
        message: errorMessage,
      },
    });
    return;
  }

  // Handle 408 / 504 Timeout
  if (statusCode === 408 || statusCode === 504) {
    const errorCode = (err as any).code || 'TIMEOUT';
    const errorMessage = err.message || 'Request timed out. Please try again.';
    res.status(statusCode).json({
      success: false,
      code: errorCode,
      message: errorMessage,
      error: {
        code: errorCode,
        message: errorMessage,
      },
    });
    return;
  }

  // Handle 502 Bad Gateway
  if (statusCode === 502) {
    const errorCode = (err as any).code || 'PROVIDER_ERROR';
    const errorMessage = err.message || 'Upstream AI provider error. Please try again later.';
    res.status(502).json({
      success: false,
      code: errorCode,
      message: errorMessage,
      error: {
        code: errorCode,
        message: errorMessage,
      },
    });
    return;
  }

  // Handle 503 Service Unavailable
  if (statusCode === 503) {
    const errorCode = (err as any).code || 'SERVICE_UNAVAILABLE';
    const errorMessage = err.message || 'Service is temporarily unavailable. Please try again later.';
    res.status(503).json({
      success: false,
      code: errorCode,
      message: errorMessage,
      error: {
        code: errorCode,
        message: errorMessage,
      },
    });
    return;
  }

  // Handle 500 Provider / Internal error
  const errorCode = (err as any).code || 'SERVER_ERROR';
  const safeMessage = isProd ? 'An error occurred while processing your request. Please try again.' : (err.message || 'Internal server error');
  const response = {
    success: false,
    code: errorCode,
    message: safeMessage,
    error: {
      code: errorCode,
      message: safeMessage,
    },
    ...(isProd ? {} : { stack: err.stack, details: err.details }),
  };

  res.status(statusCode).json(response);
};
