import fs from 'fs';
import path from 'path';
import { getServerSupabaseClient, getUserSupabaseClient } from '../services/supabase/client';

export interface SpeechHistoryRecord {
  id: string;
  userId: string;
  text: string;
  language: string;
  voice: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  style?: string;
  audioUrl: string;
  isFavorite: boolean;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'speech_history.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory fallback cache synced to JSON file
let historyList: SpeechHistoryRecord[] = [];

function loadHistory(): void {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
      const rawList = JSON.parse(data);
      historyList = rawList.map((item: any) => ({
        ...item,
        isFavorite: typeof item.isFavorite === 'boolean' ? item.isFavorite : false,
      }));
    } else {
      saveHistorySync();
    }
  } catch (err) {
    console.error('Error loading speech history file:', err);
    historyList = [];
  }
}

function saveHistorySync(): void {
  try {
    const tempFile = `${HISTORY_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(historyList, null, 2), 'utf-8');
    fs.renameSync(tempFile, HISTORY_FILE);
  } catch (err) {
    console.error('Error saving speech history file:', err);
  }
}

// Initialize history from file
loadHistory();

export const historyStore = {
  async createHistoryRecord(
    data: {
      userId: string;
      text: string;
      language: string;
      voice: string;
      speed?: number;
      pitch?: number;
      volume?: number;
      style?: string;
      audioUrl: string;
    },
    token?: string
  ): Promise<SpeechHistoryRecord> {
    const supabase = getUserSupabaseClient(token);

    if (supabase) {
      try {
        const { data: inserted, error } = await supabase
          .from('speech_history')
          .insert({
            user_id: data.userId,
            text: data.text.trim(),
            language: data.language,
            voice: data.voice,
            speed: data.speed ?? 1.0,
            pitch: data.pitch ?? 0.0,
            volume: data.volume ?? 100.0,
            style: data.style ?? 'default',
            audio_url: data.audioUrl,
            is_favorite: false,
          })
          .select()
          .single();

        if (!error && inserted) {
          return {
            id: inserted.id,
            userId: inserted.user_id,
            text: inserted.text,
            language: inserted.language,
            voice: inserted.voice,
            speed: inserted.speed,
            pitch: inserted.pitch,
            volume: inserted.volume,
            style: inserted.style,
            audioUrl: inserted.audio_url,
            isFavorite: inserted.is_favorite ?? false,
            createdAt: inserted.created_at,
          };
        } else if (error) {
          console.warn('[Supabase historyStore] Database insert error:', error.message);
        }
      } catch (err) {
        console.warn('[Supabase historyStore] Exception during createHistoryRecord:', err);
      }
    }

    // Fallback in-memory/file storage
    const now = new Date().toISOString();
    const id = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newRecord: SpeechHistoryRecord = {
      id,
      userId: data.userId,
      text: data.text.trim(),
      language: data.language,
      voice: data.voice,
      speed: data.speed,
      pitch: data.pitch,
      volume: data.volume,
      style: data.style,
      audioUrl: data.audioUrl,
      isFavorite: false,
      createdAt: now,
    };

    historyList.unshift(newRecord);
    saveHistorySync();

    return { ...newRecord };
  },

  async toggleFavorite(
    id: string,
    userId: string,
    isFavorite: boolean,
    token?: string
  ): Promise<SpeechHistoryRecord | null> {
    const supabase = getUserSupabaseClient(token);

    if (supabase) {
      try {
        const { data: updated, error } = await supabase
          .from('speech_history')
          .update({ is_favorite: isFavorite })
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();

        if (!error && updated) {
          return {
            id: updated.id,
            userId: updated.user_id,
            text: updated.text,
            language: updated.language,
            voice: updated.voice,
            speed: updated.speed,
            pitch: updated.pitch,
            volume: updated.volume,
            style: updated.style,
            audioUrl: updated.audio_url,
            isFavorite: updated.is_favorite,
            createdAt: updated.created_at,
          };
        }
      } catch (err) {
        console.warn('[Supabase historyStore] Exception during toggleFavorite:', err);
      }
    }

    // Fallback
    const item = historyList.find((r) => r.id === id && r.userId === userId);
    if (!item) {
      return null;
    }

    item.isFavorite = isFavorite;
    saveHistorySync();

    return { ...item };
  },

  async getFavoritesByUserId(
    userId: string,
    options: { page?: number; limit?: number; language?: string; voice?: string } = {},
    token?: string
  ): Promise<{
    favorites: SpeechHistoryRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 20));
    const languageFilter = (options.language || '').trim().toLowerCase();
    const voiceFilter = (options.voice || '').trim().toLowerCase();

    const supabase = getUserSupabaseClient(token);

    if (supabase) {
      try {
        let query = supabase
          .from('speech_history')
          .select('*', { count: 'exact' })
          .eq('user_id', userId)
          .eq('is_favorite', true);

        if (languageFilter) {
          query = query.ilike('language', `%${languageFilter}%`);
        }
        if (voiceFilter) {
          query = query.ilike('voice', `%${voiceFilter}%`);
        }

        query = query.order('created_at', { ascending: false });

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit - 1;
        query = query.range(startIndex, endIndex);

        const { data, count, error } = await query;

        if (!error && data) {
          const total = count ?? data.length;
          const totalPages = Math.ceil(total / limit) || 1;
          const favorites: SpeechHistoryRecord[] = data.map((item: any) => ({
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
            isFavorite: item.is_favorite,
            createdAt: item.created_at,
          }));

          return { favorites, total, page, limit, totalPages };
        }
      } catch (err) {
        console.warn('[Supabase historyStore] Exception during getFavoritesByUserId:', err);
      }
    }

    // Fallback
    let favRecords = historyList.filter((item) => item.userId === userId && item.isFavorite === true);

    if (languageFilter) {
      favRecords = favRecords.filter((item) => item.language.toLowerCase().includes(languageFilter));
    }

    if (voiceFilter) {
      favRecords = favRecords.filter((item) => item.voice.toLowerCase().includes(voiceFilter));
    }

    favRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = favRecords.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedRecords = favRecords.slice(startIndex, startIndex + limit);

    return {
      favorites: paginatedRecords.map((r) => ({ ...r })),
      total,
      page,
      limit,
      totalPages,
    };
  },

  async getHistoryByUserId(
    userId: string,
    options: { page?: number; limit?: number; search?: string } = {},
    token?: string
  ): Promise<{
    history: SpeechHistoryRecord[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 20));
    const search = (options.search || '').trim().toLowerCase();

    const supabase = getUserSupabaseClient(token);

    if (supabase) {
      try {
        let query = supabase
          .from('speech_history')
          .select('*', { count: 'exact' })
          .eq('user_id', userId);

        if (search) {
          query = query.or(`text.ilike.%${search}%,language.ilike.%${search}%,voice.ilike.%${search}%`);
        }

        query = query.order('created_at', { ascending: false });

        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit - 1;
        query = query.range(startIndex, endIndex);

        const { data, count, error } = await query;

        if (!error && data) {
          const total = count ?? data.length;
          const totalPages = Math.ceil(total / limit) || 1;
          const history: SpeechHistoryRecord[] = data.map((item: any) => ({
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
            isFavorite: item.is_favorite,
            createdAt: item.created_at,
          }));

          return { history, total, page, limit, totalPages };
        }
      } catch (err) {
        console.warn('[Supabase historyStore] Exception during getHistoryByUserId:', err);
      }
    }

    // Fallback
    let userRecords = historyList.filter((item) => item.userId === userId);

    if (search) {
      userRecords = userRecords.filter(
        (item) =>
          item.text.toLowerCase().includes(search) ||
          item.language.toLowerCase().includes(search) ||
          item.voice.toLowerCase().includes(search)
      );
    }

    userRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = userRecords.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedRecords = userRecords.slice(startIndex, startIndex + limit);

    return {
      history: paginatedRecords.map((r) => ({ ...r })),
      total,
      page,
      limit,
      totalPages,
    };
  },

  async getHistoryItemById(id: string, userId: string, token?: string): Promise<SpeechHistoryRecord | null> {
    const supabase = getUserSupabaseClient(token);

    if (supabase) {
      try {
        const { data: item, error } = await supabase
          .from('speech_history')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .maybeSingle();

        if (!error && item) {
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
            audioUrl: item.audio_url,
            isFavorite: item.is_favorite,
            createdAt: item.created_at,
          };
        }
      } catch (err) {
        console.warn('[Supabase historyStore] Exception during getHistoryItemById:', err);
      }
    }

    // Fallback
    const item = historyList.find((r) => r.id === id && r.userId === userId);
    return item ? { ...item } : null;
  },

  async deleteHistoryItem(id: string, userId: string, token?: string): Promise<boolean> {
    const supabase = getUserSupabaseClient(token);

    if (supabase) {
      try {
        const { error, count } = await supabase
          .from('speech_history')
          .delete({ count: 'exact' })
          .eq('id', id)
          .eq('user_id', userId);

        if (!error && (count ?? 0) > 0) {
          return true;
        }
      } catch (err) {
        console.warn('[Supabase historyStore] Exception during deleteHistoryItem:', err);
      }
    }

    // Fallback
    const index = historyList.findIndex((r) => r.id === id && r.userId === userId);
    if (index === -1) {
      return false;
    }
    historyList.splice(index, 1);
    saveHistorySync();
    return true;
  },

  async clearHistoryByUserId(userId: string, token?: string): Promise<number> {
    const supabase = getUserSupabaseClient(token);

    if (supabase) {
      try {
        const { error, count } = await supabase
          .from('speech_history')
          .delete({ count: 'exact' })
          .eq('user_id', userId);

        if (!error) {
          return count ?? 0;
        }
      } catch (err) {
        console.warn('[Supabase historyStore] Exception during clearHistoryByUserId:', err);
      }
    }

    // Fallback
    const initialCount = historyList.length;
    historyList = historyList.filter((r) => r.userId !== userId);
    const deletedCount = initialCount - historyList.length;
    saveHistorySync();
    return deletedCount;
  },
};

