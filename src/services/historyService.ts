import { HistoryResponse, SpeechHistoryItem } from '../types/history';
import { FavoritesResponse } from '../types/favorite';
import { getApiBaseUrl } from './ttsService';
import { tokenManager } from './tokenManager';

/**
 * Fetch paginated speech history for current authenticated user.
 */
export async function getHistoryApi(
  page: number = 1,
  limit: number = 20,
  search: string = ''
): Promise<HistoryResponse> {
  const baseUrl = getApiBaseUrl();
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (search.trim()) {
    queryParams.append('search', search.trim());
  }

  const response = await fetch(`${baseUrl}/history?${queryParams.toString()}`, {
    method: 'GET',
    headers: tokenManager.getAuthHeaders({
      'Accept': 'application/json',
    }),
    credentials: 'include',
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || `Failed to load history (HTTP ${response.status}).`;
    throw new Error(message);
  }

  return data;
}

/**
 * Fetch a single history item by ID.
 */
export async function getHistoryItemApi(id: string): Promise<SpeechHistoryItem> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/history/${id}`, {
    method: 'GET',
    headers: tokenManager.getAuthHeaders({
      'Accept': 'application/json',
    }),
    credentials: 'include',
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || 'History item not found.';
    throw new Error(message);
  }

  return data.historyItem;
}

/**
 * Delete a single history item by ID.
 */
export async function deleteHistoryItemApi(id: string): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/history/${id}`, {
    method: 'DELETE',
    headers: tokenManager.getAuthHeaders({
      'Accept': 'application/json',
    }),
    credentials: 'include',
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || 'Failed to delete history item.';
    throw new Error(message);
  }
}

/**
 * Clear all history items for current authenticated user.
 */
export async function clearAllHistoryApi(): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/history`, {
    method: 'DELETE',
    headers: tokenManager.getAuthHeaders({
      'Accept': 'application/json',
    }),
    credentials: 'include',
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || 'Failed to clear speech history.';
    throw new Error(message);
  }
}

/**
 * Toggle favorite status for a history item.
 */
export async function toggleFavoriteApi(
  id: string,
  isFavorite: boolean
): Promise<{ success: boolean; isFavorite: boolean; historyItem?: SpeechHistoryItem }> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/history/${id}/favorite`, {
    method: 'PATCH',
    headers: tokenManager.getAuthHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }),
    credentials: 'include',
    body: JSON.stringify({ isFavorite }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || 'Failed to update favorite status.';
    throw new Error(message);
  }

  return data;
}

/**
 * Fetch paginated favorites for current authenticated user.
 */
export async function getFavoritesApi(
  page: number = 1,
  limit: number = 20,
  language: string = '',
  voice: string = ''
): Promise<FavoritesResponse> {
  const baseUrl = getApiBaseUrl();
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (language.trim()) {
    queryParams.append('language', language.trim());
  }
  if (voice.trim()) {
    queryParams.append('voice', voice.trim());
  }

  const response = await fetch(`${baseUrl}/favorites?${queryParams.toString()}`, {
    method: 'GET',
    headers: tokenManager.getAuthHeaders({
      'Accept': 'application/json',
    }),
    credentials: 'include',
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || `Failed to load favorites (HTTP ${response.status}).`;
    throw new Error(message);
  }

  return data;
}
