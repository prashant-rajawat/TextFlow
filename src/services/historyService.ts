import { HistoryResponse, SpeechHistoryItem } from '../types/history';
import { FavoritesResponse, FavoriteItem } from '../types/favorite';
import { getApiBaseUrl } from './ttsService';
import { tokenManager } from './tokenManager';
import { getSupabaseClient } from '../lib/supabase';

/**
 * Helper to ensure items with audio_storage_path get active signed URLs if queried directly from client Supabase.
 */
async function attachSignedUrlsDirect(items: any[], supabase: any): Promise<SpeechHistoryItem[]> {
  return Promise.all(
    items.map(async (item: any) => {
      let finalAudioUrl = item.audio_url || '';
      if (item.audio_storage_path) {
        try {
          const { data } = await supabase.storage
            .from('textflow-audio')
            .createSignedUrl(item.audio_storage_path, 3600);
          if (data?.signedUrl) {
            finalAudioUrl = data.signedUrl;
          }
        } catch {
          // fallback to item.audio_url
        }
      }
      return {
        id: item.id,
        userId: item.user_id,
        text: item.text,
        language: item.language,
        voice: item.voice,
        speed: item.speed,
        pitch: item.pitch,
        volume: item.volume,
        style: item.style,
        audioUrl: finalAudioUrl,
        audioStoragePath: item.audio_storage_path || undefined,
        isFavorite: item.is_favorite ?? false,
        createdAt: item.created_at,
      };
    })
  );
}

/**
 * Fetch paginated speech history for current authenticated user.
 */
export async function getHistoryApi(
  page: number = 1,
  limit: number = 20,
  search: string = ''
): Promise<HistoryResponse> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id;

      if (currentUserId) {
        let query = supabase
          .from('speech_history')
          .select('*', { count: 'exact' })
          .eq('user_id', currentUserId);

        if (search.trim()) {
          query = query.or(`text.ilike.%${search.trim()}%,language.ilike.%${search.trim()}%,voice.ilike.%${search.trim()}%`);
        }

        query = query.order('created_at', { ascending: false });

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit - 1;
        query = query.range(startIndex, endIndex);

        const { data, count, error } = await query;

        if (!error && data) {
          const total = count ?? data.length;
          const totalPages = Math.ceil(total / limit) || 1;
          const history = await attachSignedUrlsDirect(data, supabase);

          return {
            success: true,
            history,
            pagination: { page, limit, total, totalPages },
          };
        }
      }
    } catch (err) {
      console.warn('[Supabase Direct History Query] Fallback to backend API:', err);
    }
  }

  // Fallback to backend API
  const baseUrl = getApiBaseUrl();
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (search.trim()) {
    queryParams.append('search', search.trim());
  }

  const authHeaders = await tokenManager.getAuthHeadersAsync({
    'Accept': 'application/json',
  });

  const response = await fetch(`${baseUrl}/history?${queryParams.toString()}`, {
    method: 'GET',
    headers: authHeaders,
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
 * Fetch a single history item by ID with signed URL.
 */
export async function getHistoryItemApi(id: string): Promise<SpeechHistoryItem> {
  const baseUrl = getApiBaseUrl();
  const authHeaders = await tokenManager.getAuthHeadersAsync({
    'Accept': 'application/json',
  });
  const response = await fetch(`${baseUrl}/history/${id}`, {
    method: 'GET',
    headers: authHeaders,
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
 * Retrieves a fresh short-lived signed audio URL for a history item.
 */
export async function getAudioSignedUrlApi(id: string): Promise<string> {
  const baseUrl = getApiBaseUrl();
  const authHeaders = await tokenManager.getAuthHeadersAsync({
    'Accept': 'application/json',
  });

  const response = await fetch(`${baseUrl}/history/${id}/audio`, {
    method: 'GET',
    headers: authHeaders,
    credentials: 'include',
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.audioUrl) {
    const message = data?.message || 'Failed to retrieve audio URL.';
    throw new Error(message);
  }

  return data.audioUrl;
}

/**
 * Triggers download of the audio file.
 */
export async function downloadHistoryAudioApi(id: string, defaultFilename?: string): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const authHeaders = await tokenManager.getAuthHeadersAsync();

  const response = await fetch(`${baseUrl}/history/${id}/download`, {
    method: 'GET',
    headers: authHeaders,
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message || 'Failed to download audio file.');
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = defaultFilename || `textflow-audio-${id}.mp3`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}

/**
 * Delete a single history item by ID (and removes stored audio).
 */
export async function deleteHistoryItemApi(id: string): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const authHeaders = await tokenManager.getAuthHeadersAsync({
    'Accept': 'application/json',
  });
  const response = await fetch(`${baseUrl}/history/${id}`, {
    method: 'DELETE',
    headers: authHeaders,
    credentials: 'include',
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || 'Failed to delete history item.';
    throw new Error(message);
  }
}

/**
 * Clear all history items and audio storage for current user.
 */
export async function clearAllHistoryApi(): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const authHeaders = await tokenManager.getAuthHeadersAsync({
    'Accept': 'application/json',
  });
  const response = await fetch(`${baseUrl}/history`, {
    method: 'DELETE',
    headers: authHeaders,
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
  const authHeaders = await tokenManager.getAuthHeadersAsync({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  });
  const response = await fetch(`${baseUrl}/history/${id}/favorite`, {
    method: 'PATCH',
    headers: authHeaders,
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

  const authHeaders = await tokenManager.getAuthHeadersAsync({
    'Accept': 'application/json',
  });
  const response = await fetch(`${baseUrl}/favorites?${queryParams.toString()}`, {
    method: 'GET',
    headers: authHeaders,
    credentials: 'include',
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || `Failed to load favorites (HTTP ${response.status}).`;
    throw new Error(message);
  }

  return data;
}
