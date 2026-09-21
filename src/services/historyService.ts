import { HistoryResponse, SpeechHistoryItem } from '../types/history';
import { FavoritesResponse, FavoriteItem } from '../types/favorite';
import { getApiBaseUrl } from './ttsService';
import { tokenManager } from './tokenManager';
import { getSupabaseClient } from '../lib/supabase';
import { getLocalHistory, deleteLocalHistory, updateLocalHistory, clearLocalHistory } from './localHistoryService';

/**
 * Helper to ensure items with audio_storage_path get active signed URLs if queried directly from client Supabase.
 */
async function attachSignedUrlsDirect(items: any[], supabase: any): Promise<SpeechHistoryItem[]> {
  console.log('[History] generating signed URLs');
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
 * Fetch paginated speech history for current authenticated user with IndexedDB local persistence fallback.
 */
export async function getHistoryApi(
  page: number = 1,
  limit: number = 20,
  search: string = ''
): Promise<HistoryResponse> {
  const supabase = getSupabaseClient();
  let currentUserId: string | null = null;

  if (supabase) {
    try {
      let sessionData = await supabase.auth.getSession();
      currentUserId = sessionData?.data?.session?.user?.id || null;

      if (!currentUserId) {
        for (let attempt = 0; attempt < 3; attempt++) {
          await new Promise((r) => setTimeout(r, 100));
          const retrySession = await supabase.auth.getSession();
          currentUserId = retrySession?.data?.session?.user?.id || null;
          if (currentUserId) break;
        }
      }
    } catch {}
  }

  const userIdToUse = currentUserId || localStorage.getItem('textflow_user_id') || 'local-user';

  // 1. Fetch local IndexedDB records
  let localItems: SpeechHistoryItem[] = [];
  try {
    const localRecords = await getLocalHistory(userIdToUse);
    localItems = localRecords.map(r => ({
      id: r.id,
      userId: r.userId,
      text: r.text,
      language: r.language,
      voice: r.voice,
      speed: r.speed,
      pitch: r.pitch,
      volume: r.volume,
      style: r.style,
      audioUrl: URL.createObjectURL(r.audioBlob),
      isFavorite: r.isFavorite,
      createdAt: r.createdAt,
    }));
  } catch (err) {
    console.warn('[History] IndexedDB read error:', err);
  }

  // 2. Try remote Supabase or Backend API
  let remoteItems: SpeechHistoryItem[] = [];
  if (supabase && currentUserId) {
    try {
      let query = supabase
        .from('speech_history')
        .select('*', { count: 'exact' })
        .eq('user_id', currentUserId);

      if (search.trim()) {
        query = query.or(`text.ilike.%${search.trim()}%,language.ilike.%${search.trim()}%,voice.ilike.%${search.trim()}%`);
      }

      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      if (!error && data) {
        remoteItems = await attachSignedUrlsDirect(data, supabase);
      }
    } catch (e) {
      console.warn('[History] Remote fetch fallback:', e);
    }
  }

  // Merge remoteItems and localItems
  const map = new Map<string, SpeechHistoryItem>();
  for (const item of localItems) {
    map.set(item.id, item);
  }
  for (const item of remoteItems) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    } else {
      const existing = map.get(item.id)!;
      if (!existing.audioUrl.startsWith('blob:')) {
        map.set(item.id, item);
      }
    }
  }

  let allItems = Array.from(map.values());
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    allItems = allItems.filter(i =>
      i.text.toLowerCase().includes(q) ||
      i.language.toLowerCase().includes(q) ||
      i.voice.toLowerCase().includes(q)
    );
  }

  allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = allItems.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedHistory = allItems.slice(startIndex, startIndex + limit);

  return {
    success: true,
    history: paginatedHistory,
    pagination: { page, limit, total, totalPages },
  };
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
  const supabase = getSupabaseClient();
  let userId = 'local-user';
  if (supabase) {
    try {
      const session = await supabase.auth.getSession();
      userId = session?.data?.session?.user?.id || localStorage.getItem('textflow_user_id') || 'local-user';
    } catch {}
  }
  await deleteLocalHistory(id, userId).catch(() => {});

  try {
    const baseUrl = getApiBaseUrl();
    const authHeaders = await tokenManager.getAuthHeadersAsync({
      'Accept': 'application/json',
    });
    const response = await fetch(`${baseUrl}/history/${id}`, {
      method: 'DELETE',
      headers: authHeaders,
      credentials: 'include',
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'Failed to delete history item.');
    }
  } catch (err) {
    // If remote fails, local deletion still succeeded
  }
}

/**
 * Clear all history items and audio storage for current user.
 */
export async function clearAllHistoryApi(): Promise<void> {
  const supabase = getSupabaseClient();
  let userId = 'local-user';
  if (supabase) {
    try {
      const session = await supabase.auth.getSession();
      userId = session?.data?.session?.user?.id || localStorage.getItem('textflow_user_id') || 'local-user';
    } catch {}
  }
  await clearLocalHistory(userId).catch(() => {});

  try {
    const baseUrl = getApiBaseUrl();
    const authHeaders = await tokenManager.getAuthHeadersAsync({
      'Accept': 'application/json',
    });
    const response = await fetch(`${baseUrl}/history`, {
      method: 'DELETE',
      headers: authHeaders,
      credentials: 'include',
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.message || 'Failed to clear speech history.');
    }
  } catch (err) {
    // If remote fails, local clear still succeeded
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
  let userId = 'local-user';
  if (supabase) {
    try {
      const session = await supabase.auth.getSession();
      userId = session?.data?.session?.user?.id || localStorage.getItem('textflow_user_id') || 'local-user';
    } catch {}
  }
  await updateLocalHistory(id, userId, { isFavorite }).catch(() => {});

  try {
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

    if (response.ok && data) {
      return data;
    }
  } catch {}

  return { success: true, isFavorite };
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
      let sessionData = await supabase.auth.getSession();
      let currentUserId = sessionData?.data?.session?.user?.id;

      if (!currentUserId) {
        for (let attempt = 0; attempt < 5; attempt++) {
          await new Promise((r) => setTimeout(r, 100));
          const retrySession = await supabase.auth.getSession();
          currentUserId = retrySession?.data?.session?.user?.id;
          if (currentUserId) break;
        }
      }

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
          const rawFavs = await attachSignedUrlsDirect(data, supabase);
          const favorites: FavoriteItem[] = rawFavs.map(f => ({
            ...f,
            isFavorite: true,
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
