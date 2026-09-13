import { AIEnhanceOperation, AIEnhanceResponse } from '../types/ai';
import { ApplicationError } from '../types/tts';
import { tokenManager } from './tokenManager';
import { getApiBaseUrl } from './ttsService';

/**
 * Validates text before submitting to the AI Enhancement endpoint.
 */
export function validateAITextInput(text: string): { isValid: boolean; error?: ApplicationError } {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      error: {
        type: 'validation',
        code: 'AI_INVALID_REQUEST',
        message: 'Please enter some text before enhancing.',
      },
    };
  }

  if (text.length > 5000) {
    return {
      isValid: false,
      error: {
        type: 'validation',
        code: 'AI_INVALID_REQUEST',
        message: 'Your text exceeds the maximum limit of 5,000 characters.',
        details: `Current length is ${text.length} characters. Please shorten your text before enhancing.`,
      },
    };
  }

  return { isValid: true };
}

/**
 * Calls the backend POST /api/ai/enhance endpoint to enhance text with Gemini.
 */
export async function enhanceTextWithAI(
  text: string,
  operation: AIEnhanceOperation,
  language?: string
): Promise<AIEnhanceResponse> {
  const validation = validateAITextInput(text);
  if (!validation.isValid && validation.error) {
    throw validation.error;
  }

  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/ai/enhance`;

  try {
    const authHeaders = await tokenManager.getAuthHeadersAsync({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: authHeaders,
      credentials: 'include',
      body: JSON.stringify({
        text: text.trim(),
        operation,
        language,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const code = data?.code || data?.error?.code || 'AI_PROVIDER_ERROR';
      let message = data?.message || data?.error?.message;
      const retryAfter = data?.retryAfter;

      if (response.status === 401 || code === 'AI_UNAUTHORIZED') {
        message = 'Please log in to use AI Text Enhancement.';
      } else if (response.status === 429 || code === 'AI_RATE_LIMITED' || code === 'AI_QUOTA_EXCEEDED') {
        if (code === 'AI_QUOTA_EXCEEDED') {
          message = 'AI enhancement daily quota has been reached. Please try again later.';
        } else {
          message = message || 'AI enhancement is temporarily rate limited. Please wait a moment and try again.';
        }
      } else if (response.status === 503 || code === 'AI_PROVIDER_UNAVAILABLE') {
        message = 'AI enhancement is temporarily unavailable. Please try again later.';
      } else if (code === 'AI_TIMEOUT') {
        message = 'AI enhancement request timed out. Please try again.';
      } else if (code === 'AI_EMPTY_RESPONSE') {
        message = 'AI returned an empty response. Please try again.';
      } else if (!message) {
        message = 'AI enhancement is temporarily unavailable. Please try again later.';
      }

      throw {
        type: 'api',
        code,
        message,
        details: data?.details,
        statusCode: response.status,
        retryAfter,
      } as ApplicationError;
    }

    if (!data || !data.success || typeof data.enhancedText !== 'string') {
      throw {
        type: 'api',
        code: 'AI_PROVIDER_ERROR',
        message: 'AI enhancement is temporarily unavailable. Please try again later.',
      } as ApplicationError;
    }

    return {
      success: true,
      operation: data.operation || operation,
      originalText: data.originalText || text,
      enhancedText: data.enhancedText,
    };
  } catch (error: any) {
    if (error?.type && error?.message) {
      throw error;
    }
    throw {
      type: 'network',
      code: 'AI_NETWORK_ERROR',
      message: 'Network error while connecting to AI enhancement service. Please check your connection.',
    } as ApplicationError;
  }
}
