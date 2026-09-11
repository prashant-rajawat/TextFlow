import { SpeechHistoryItem, HistoryPagination } from './history';

export interface FavoriteItem extends SpeechHistoryItem {
  isFavorite: boolean;
}

export interface FavoritesResponse {
  success: boolean;
  favorites: FavoriteItem[];
  pagination: HistoryPagination;
  message?: string;
}
