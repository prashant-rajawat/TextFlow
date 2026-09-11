export interface SpeechHistoryItem {
  id: string;
  userId?: string;
  text: string;
  language: string;
  voice: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  style?: string;
  audioUrl: string;
  isFavorite?: boolean;
  createdAt: string;
}

export interface HistoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface HistoryResponse {
  success: boolean;
  history: SpeechHistoryItem[];
  pagination: HistoryPagination;
  message?: string;
}
