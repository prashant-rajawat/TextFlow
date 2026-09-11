import { HistoryResponse, SpeechHistoryItem } from '../types/history';
import { FavoritesResponse, FavoriteItem } from '../types/favorite';
import { getApiBaseUrl } from './ttsService';
import { tokenManager } from './tokenManager';
import { getSupabaseClient } from '../lib/supabase';

/**
 * Fetch paginated speech history for current authenticated user.
 * Queries Supabase speech_history directly via client SDK when authenticated,
 * falling back to backend Express API if needed.
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
          const history: SpeechHistoryItem[] = data.map((item: any) => ({
            id: item.id,
            userId: item.user_id,
            text: item.text,
            language: item.language,
            voice: item.voice,
            speed: item.speed,
            pitch: item.pitch,
            volume: item.volume,
            style: item.style,
            audioUrl: item.audio_url,
            isFavorite: item.is_favorite ?? false,
            createdAt: item.created_at,
          }));

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
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id;

      if (currentUserId) {
        const { data, error } = await supabase
          .from('speech_history')
          .select('*')
          .eq('id', id)
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (!error && data) {
          return {
            id: data.id,
            userId: data.user_id,
            text: data.text,
            language: data.language,
            voice: data.voice,
            speed: data.speed,
            pitch: data.pitch,
            volume: data.volume,
            style: data.style,
            audioUrl: data.audio_url,
            isFavorite: data.is_favorite ?? false,
            createdAt: data.created_at,
          };
        }
      }
    } catch (err) {
      console.warn('[Supabase Direct Get Item] Fallback to backend API:', err);
    }
  }

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
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id;

      if (currentUserId) {
        const { error } = await supabase
          .from('speech_history')
          .delete()
          .eq('id', id)
          .eq('user_id', currentUserId);

        if (!error) {
          return;
        }
      }
    } catch (err) {
      console.warn('[Supabase Direct Delete] Fallback to backend API:', err);
    }
  }

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
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id;

      if (currentUserId) {
        const { error } = await supabase
          .from('speech_history')
          .delete()
          .eq('user_id', currentUserId);

        if (!error) {
          return;
        }
      }
    } catch (err) {
      console.warn('[Supabase Direct Clear All] Fallback to backend API:', err);
    }
  }

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
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id;

      if (currentUserId) {
        const { data, error } = await supabase
          .from('speech_history')
          .update({ is_favorite: isFavorite })
          .eq('id', id)
          .eq('user_id', currentUserId)
          .select()
          .maybeSingle();

        if (!error && data) {
          return {
            success: true,
            isFavorite: data.is_favorite ?? isFavorite,
            historyItem: {
              id: data.id,
              userId: data.user_id,
              text: data.text,
              language: data.language,
              voice: data.voice,
              speed: data.speed,
              pitch: data.pitch,
              volume: data.volume,
              style: data.style,
              audioUrl: data.audio_url,
              isFavorite: data.is_favorite ?? false,
              createdAt: data.created_at,
            },
          };
        }
      }
    } catch (err) {
      console.warn('[Supabase Direct Toggle Favorite] Fallback to backend API:', err);
    }
  }

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
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData?.session?.user?.id;

      if (currentUserId) {
        let query = supabase
          .from('speech_history')
          .select('*', { count: 'exact' })
          .eq('user_id', currentUserId)
          .eq('is_favorite', true);

        if (language.trim()) {
          query = query.ilike('language', `%${language.trim()}%`);
        }
        if (voice.trim()) {
          query = query.ilike('voice', `%${voice.trim()}%`);
        }

        query = query.order('created_at', { ascending: false });

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit - 1;
        query = query.range(startIndex, endIndex);

        const { data, count, error } = await query;

        if (!error && data) {
          const total = count ?? data.length;
          const totalPages = Math.ceil(total / limit) || 1;
          const favorites: FavoriteItem[] = data.map((item: any) => ({
            id: item.id,
            userId: item.user_id,
            text: item.text,
            language: item.language,
            voice: item.voice,
            speed: item.speed,
            pitch: item.pitch,
            volume: item.volume,
            style: item.style,
            audioUrl: item.audio_url,
            isFavorite: true,
            createdAt: item.created_at,
          }));

          return {
            success: true,
            favorites,
            pagination: { page, limit, total, totalPages },
          };
        }
      }
    } catch (err) {
      console.warn('[Supabase Direct Favorites Query] Fallback to backend API:', err);
    }
  }

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
