export type AIEnhanceOperation = 'grammar' | 'rewrite' | 'summarize' | 'conversational';

export interface AIEnhanceRequest {
  text: string;
  operation: AIEnhanceOperation;
  language?: string;
}

export interface AIEnhanceResponse {
  success: boolean;
  operation: AIEnhanceOperation;
  originalText: string;
  enhancedText: string;
  code?: string;
  message?: string;
  retryAfter?: number;
  error?: {
    code: string;
    message: string;
  };
}

export interface AIEnhanceReviewData {
  operation: AIEnhanceOperation;
  originalText: string;
  enhancedText: string;
  originalCharCount: number;
  enhancedCharCount: number;
  originalWordCount: number;
  enhancedWordCount: number;
}
