import { getServerSupabaseClient, getUserSupabaseClient } from '../services/supabase/client';
import {
  getUsageConfig,
  getCurrentUsageDate,
  getCurrentMonthStartDate,
  getNextResetTimestamp,
} from '../config/usageConfig';

export interface DailyUsageRecord {
  id?: string;
  userId: string;
  usageDate: string;
  ttsGenerations: number;
  ttsCharacters: number;
  aiEnhancements: number;
  audioBytes: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UsageSummaryResponse {
  success: boolean;
  today: {
    ttsGenerations: number;
    ttsLimit: number;
    ttsRemaining: number;
    aiEnhancements: number;
    aiLimit: number;
    aiRemaining: number;
    ttsCharacters: number;
    audioBytes: number;
  };
  month: {
    ttsGenerations: number;
    aiEnhancements: number;
    ttsCharacters: number;
    audioBytes: number;
  };
  limits: {
    ttsDailyLimit: number;
    aiDailyLimit: number;
    maxTtsCharacters: number;
  };
  recentUsage: Array<{
    date: string;
    ttsGenerations: number;
    aiEnhancements: number;
    ttsCharacters: number;
    audioBytes: number;
  }>;
  resetAt: string;
  timezone: string;
}

// In-memory fallback usage map for development/offline environments: key is `${userId}:${usageDate}`
const inMemoryUsageMap = new Map<string, DailyUsageRecord>();

class UsageStore {
  /**
   * Retrieves or initializes today's record in the in-memory fallback.
   */
  private getOrCreateInMemoryRecord(userId: string, usageDate: string): DailyUsageRecord {
    const key = `${userId}:${usageDate}`;
    let record = inMemoryUsageMap.get(key);
    if (!record) {
      record = {
        userId,
        usageDate,
        ttsGenerations: 0,
        ttsCharacters: 0,
        aiEnhancements: 0,
        audioBytes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      inMemoryUsageMap.set(key, record);
    }
    return record;
  }

  /**
   * Atomically checks and increments TTS usage for the given user.
   * Prevents race conditions at limit boundaries.
   */
  async incrementTTSUsage(
    userId: string,
    characters: number,
    audioBytes: number = 0,
    token?: string
  ): Promise<{ allowed: boolean; currentTts: number; remaining: number; limit: number }> {
    const config = getUsageConfig();
    const today = getCurrentUsageDate(config.appTimezone);
    const limit = config.ttsDailyLimit;

    const supabase = getServerSupabaseClient() || getUserSupabaseClient(token);

    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('increment_tts_usage', {
          p_user_id: userId,
          p_usage_date: today,
          p_characters: Math.max(0, characters),
          p_limit: limit,
          p_audio_bytes: Math.max(0, audioBytes),
        });

        if (!error && data) {
          return {
            allowed: Boolean(data.allowed),
            currentTts: Number(data.current_tts || 0),
            remaining: Number(data.remaining || 0),
            limit,
          };
        }

        console.warn('[UsageStore RPC] increment_tts_usage RPC failed or not migrated, falling back:', error?.message);
      } catch (rpcErr) {
        console.warn('[UsageStore RPC] RPC invocation error:', rpcErr);
      }
    }

    // Thread-safe in-memory fallback
    const record = this.getOrCreateInMemoryRecord(userId, today);
    if (record.ttsGenerations >= limit) {
      return {
        allowed: false,
        currentTts: record.ttsGenerations,
        remaining: 0,
        limit,
      };
    }

    record.ttsGenerations += 1;
    record.ttsCharacters += Math.max(0, characters);
    record.audioBytes += Math.max(0, audioBytes);
    record.updatedAt = new Date().toISOString();

    return {
      allowed: true,
      currentTts: record.ttsGenerations,
      remaining: Math.max(0, limit - record.ttsGenerations),
      limit,
    };
  }

  /**
   * Atomically rolls back a reserved TTS generation slot if the downstream provider fails.
   */
  async rollbackTTSUsage(
    userId: string,
    characters: number,
    audioBytes: number = 0,
    token?: string
  ): Promise<void> {
    const config = getUsageConfig();
    const today = getCurrentUsageDate(config.appTimezone);
    const supabase = getServerSupabaseClient() || getUserSupabaseClient(token);

    if (supabase) {
      try {
        await supabase.rpc('rollback_tts_usage', {
          p_user_id: userId,
          p_usage_date: today,
          p_characters: Math.max(0, characters),
          p_audio_bytes: Math.max(0, audioBytes),
        });
        return;
      } catch (err) {
        console.warn('[UsageStore] Rollback RPC error:', err);
      }
    }

    const key = `${userId}:${today}`;
    const record = inMemoryUsageMap.get(key);
    if (record) {
      record.ttsGenerations = Math.max(0, record.ttsGenerations - 1);
      record.ttsCharacters = Math.max(0, record.ttsCharacters - Math.max(0, characters));
      record.audioBytes = Math.max(0, record.audioBytes - Math.max(0, audioBytes));
      record.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Atomically checks and increments AI Enhancement usage for the given user.
   */
  async incrementAIUsage(
    userId: string,
    token?: string
  ): Promise<{ allowed: boolean; currentAi: number; remaining: number; limit: number }> {
    const config = getUsageConfig();
    const today = getCurrentUsageDate(config.appTimezone);
    const limit = config.aiDailyLimit;

    const supabase = getServerSupabaseClient() || getUserSupabaseClient(token);

    if (supabase) {
      try {
        const { data, error } = await supabase.rpc('increment_ai_usage', {
          p_user_id: userId,
          p_usage_date: today,
          p_limit: limit,
        });

        if (!error && data) {
          return {
            allowed: Boolean(data.allowed),
            currentAi: Number(data.current_ai || 0),
            remaining: Number(data.remaining || 0),
            limit,
          };
        }

        console.warn('[UsageStore RPC] increment_ai_usage RPC failed or not migrated, falling back:', error?.message);
      } catch (rpcErr) {
        console.warn('[UsageStore RPC] RPC invocation error:', rpcErr);
      }
    }

    // In-memory fallback
    const record = this.getOrCreateInMemoryRecord(userId, today);
    if (record.aiEnhancements >= limit) {
      return {
        allowed: false,
        currentAi: record.aiEnhancements,
        remaining: 0,
        limit,
      };
    }

    record.aiEnhancements += 1;
    record.updatedAt = new Date().toISOString();

    return {
      allowed: true,
      currentAi: record.aiEnhancements,
      remaining: Math.max(0, limit - record.aiEnhancements),
      limit,
    };
  }

  /**
   * Atomically rolls back a reserved AI enhancement slot if operation fails.
   */
  async rollbackAIUsage(userId: string, token?: string): Promise<void> {
    const config = getUsageConfig();
    const today = getCurrentUsageDate(config.appTimezone);
    const supabase = getServerSupabaseClient() || getUserSupabaseClient(token);

    if (supabase) {
      try {
        await supabase.rpc('rollback_ai_usage', {
          p_user_id: userId,
          p_usage_date: today,
        });
        return;
      } catch (err) {
        console.warn('[UsageStore] Rollback AI RPC error:', err);
      }
    }

    const key = `${userId}:${today}`;
    const record = inMemoryUsageMap.get(key);
    if (record) {
      record.aiEnhancements = Math.max(0, record.aiEnhancements - 1);
      record.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Adjusts audio storage bytes (adds on new audio upload, subtracts on audio deletion).
   */
  async adjustAudioBytes(userId: string, deltaBytes: number, token?: string): Promise<void> {
    const config = getUsageConfig();
    const today = getCurrentUsageDate(config.appTimezone);
    const supabase = getServerSupabaseClient() || getUserSupabaseClient(token);

    if (supabase) {
      try {
        await supabase.rpc('adjust_audio_bytes', {
          p_user_id: userId,
          p_usage_date: today,
          p_delta_bytes: deltaBytes,
        });
        return;
      } catch (err) {
        console.warn('[UsageStore] adjust_audio_bytes RPC error:', err);
      }
    }

    const key = `${userId}:${today}`;
    const record = this.getOrCreateInMemoryRecord(userId, today);
    record.audioBytes = Math.max(0, record.audioBytes + deltaBytes);
    record.updatedAt = new Date().toISOString();
  }

  /**
   * Fetches comprehensive usage statistics for today, this month, and recent days.
   */
  async getUsageSummary(userId: string, token?: string): Promise<UsageSummaryResponse> {
    const config = getUsageConfig();
    const today = getCurrentUsageDate(config.appTimezone);
    const monthStart = getCurrentMonthStartDate(config.appTimezone);
    const resetAt = getNextResetTimestamp(config.appTimezone);

    const supabase = getUserSupabaseClient(token) || getServerSupabaseClient();

    let todayRecord: DailyUsageRecord = {
      userId,
      usageDate: today,
      ttsGenerations: 0,
      ttsCharacters: 0,
      aiEnhancements: 0,
      audioBytes: 0,
    };

    let monthTotals = {
      ttsGenerations: 0,
      aiEnhancements: 0,
      ttsCharacters: 0,
      audioBytes: 0,
    };

    const recentUsage: Array<{
      date: string;
      ttsGenerations: number;
      aiEnhancements: number;
      ttsCharacters: number;
      audioBytes: number;
    }> = [];

    if (supabase) {
      try {
        // 1. Query records for this month and recent history
        const { data, error } = await supabase
          .from('usage_records')
          .select('usage_date, tts_generations, tts_characters, ai_enhancements, audio_bytes')
          .eq('user_id', userId)
          .gte('usage_date', monthStart)
          .order('usage_date', { ascending: false });

        if (!error && data) {
          data.forEach((row: any) => {
            const dateStr = row.usage_date;
            const ttsGen = Number(row.tts_generations) || 0;
            const ttsChars = Number(row.tts_characters) || 0;
            const aiEnh = Number(row.ai_enhancements) || 0;
            const bytes = Number(row.audio_bytes) || 0;

            if (dateStr === today) {
              todayRecord = {
                userId,
                usageDate: today,
                ttsGenerations: ttsGen,
                ttsCharacters: ttsChars,
                aiEnhancements: aiEnh,
                audioBytes: bytes,
              };
            }

            monthTotals.ttsGenerations += ttsGen;
            monthTotals.aiEnhancements += aiEnh;
            monthTotals.ttsCharacters += ttsChars;
            monthTotals.audioBytes += bytes;

            recentUsage.push({
              date: dateStr,
              ttsGenerations: ttsGen,
              aiEnhancements: aiEnh,
              ttsCharacters: ttsChars,
              audioBytes: bytes,
            });
          });

          // If today has no record in database yet, ensure recentUsage shows today with 0
          if (!data.some((row: any) => row.usage_date === today)) {
            recentUsage.unshift({
              date: today,
              ttsGenerations: 0,
              aiEnhancements: 0,
              ttsCharacters: 0,
              audioBytes: 0,
            });
          }

          return {
            success: true,
            today: {
              ttsGenerations: todayRecord.ttsGenerations,
              ttsLimit: config.ttsDailyLimit,
              ttsRemaining: Math.max(0, config.ttsDailyLimit - todayRecord.ttsGenerations),
              aiEnhancements: todayRecord.aiEnhancements,
              aiLimit: config.aiDailyLimit,
              aiRemaining: Math.max(0, config.aiDailyLimit - todayRecord.aiEnhancements),
              ttsCharacters: todayRecord.ttsCharacters,
              audioBytes: todayRecord.audioBytes,
            },
            month: monthTotals,
            limits: {
              ttsDailyLimit: config.ttsDailyLimit,
              aiDailyLimit: config.aiDailyLimit,
              maxTtsCharacters: config.maxTtsCharacters,
            },
            recentUsage: recentUsage.slice(0, 10),
            resetAt,
            timezone: config.appTimezone,
          };
        }
      } catch (err) {
        console.warn('[UsageStore] Direct query error, reading in-memory store:', err);
      }
    }

    // In-memory fallback calculation
    const inMemToday = this.getOrCreateInMemoryRecord(userId, today);
    let inMemMonthTts = 0;
    let inMemMonthAi = 0;
    let inMemMonthChars = 0;
    let inMemMonthBytes = 0;
    const inMemRecent: Array<{
      date: string;
      ttsGenerations: number;
      aiEnhancements: number;
      ttsCharacters: number;
      audioBytes: number;
    }> = [];

    for (const [key, rec] of inMemoryUsageMap.entries()) {
      if (rec.userId === userId) {
        if (rec.usageDate >= monthStart) {
          inMemMonthTts += rec.ttsGenerations;
          inMemMonthAi += rec.aiEnhancements;
          inMemMonthChars += rec.ttsCharacters;
          inMemMonthBytes += rec.audioBytes;
        }
        inMemRecent.push({
          date: rec.usageDate,
          ttsGenerations: rec.ttsGenerations,
          aiEnhancements: rec.aiEnhancements,
          ttsCharacters: rec.ttsCharacters,
          audioBytes: rec.audioBytes,
        });
      }
    }

    inMemRecent.sort((a, b) => b.date.localeCompare(a.date));
    if (!inMemRecent.some((r) => r.date === today)) {
      inMemRecent.unshift({
        date: today,
        ttsGenerations: inMemToday.ttsGenerations,
        aiEnhancements: inMemToday.aiEnhancements,
        ttsCharacters: inMemToday.ttsCharacters,
        audioBytes: inMemToday.audioBytes,
      });
    }

    return {
      success: true,
      today: {
        ttsGenerations: inMemToday.ttsGenerations,
        ttsLimit: config.ttsDailyLimit,
        ttsRemaining: Math.max(0, config.ttsDailyLimit - inMemToday.ttsGenerations),
        aiEnhancements: inMemToday.aiEnhancements,
        aiLimit: config.aiDailyLimit,
        aiRemaining: Math.max(0, config.aiDailyLimit - inMemToday.aiEnhancements),
        ttsCharacters: inMemToday.ttsCharacters,
        audioBytes: inMemToday.audioBytes,
      },
      month: {
        ttsGenerations: inMemMonthTts || inMemToday.ttsGenerations,
        aiEnhancements: inMemMonthAi || inMemToday.aiEnhancements,
        ttsCharacters: inMemMonthChars || inMemToday.ttsCharacters,
        audioBytes: inMemMonthBytes || inMemToday.audioBytes,
      },
      limits: {
        ttsDailyLimit: config.ttsDailyLimit,
        aiDailyLimit: config.aiDailyLimit,
        maxTtsCharacters: config.maxTtsCharacters,
      },
      recentUsage: inMemRecent.slice(0, 10),
      resetAt,
      timezone: config.appTimezone,
    };
  }
}

export const usageStore = new UsageStore();
