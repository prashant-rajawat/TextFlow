/**
 * Centralized Backend Configuration for TextFlow Usage Limits.
 * Defines daily quotas, character caps, and application timezone.
 *
 * NOTE: These represent TextFlow application usage limits, separate from Google Gemini API quotas.
 */

export interface UsageConfig {
  ttsDailyLimit: number;
  aiDailyLimit: number;
  maxTtsCharacters: number;
  appTimezone: string;
}

export function getUsageConfig(): UsageConfig {
  const ttsDailyLimit = parseInt(process.env.TTS_DAILY_LIMIT || '20', 10);
  const aiDailyLimit = parseInt(process.env.AI_DAILY_LIMIT || '20', 10);
  const maxTtsCharacters = parseInt(process.env.MAX_TTS_CHARACTERS || '5000', 10);
  const appTimezone = process.env.APP_TIMEZONE || 'UTC';

  return {
    ttsDailyLimit: isNaN(ttsDailyLimit) || ttsDailyLimit <= 0 ? 20 : ttsDailyLimit,
    aiDailyLimit: isNaN(aiDailyLimit) || aiDailyLimit <= 0 ? 20 : aiDailyLimit,
    maxTtsCharacters: isNaN(maxTtsCharacters) || maxTtsCharacters <= 0 ? 5000 : maxTtsCharacters,
    appTimezone: appTimezone.trim() || 'UTC',
  };
}

/**
 * Returns current usage date (YYYY-MM-DD) based on configured application timezone.
 */
export function getCurrentUsageDate(timezone?: string): string {
  const tz = timezone || getUsageConfig().appTimezone;
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date()); // Outputs YYYY-MM-DD in en-CA
  } catch (err) {
    console.warn(`[UsageConfig] Invalid timezone '${tz}', falling back to UTC:`, err);
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Returns ISO timestamp of next reset time (midnight 00:00:00 of tomorrow in app timezone).
 */
export function getNextResetTimestamp(timezone?: string): string {
  const tz = timezone || getUsageConfig().appTimezone;
  try {
    const todayStr = getCurrentUsageDate(tz);
    // Parse current date components
    const [year, month, day] = todayStr.split('-').map((n) => parseInt(n, 10));
    // Create tomorrow's date
    const tomorrow = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));
    return tomorrow.toISOString();
  } catch {
    const now = new Date();
    const tomorrowUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
    return tomorrowUtc.toISOString();
  }
}

/**
 * Returns start date (YYYY-MM-01) of current month in app timezone.
 */
export function getCurrentMonthStartDate(timezone?: string): string {
  const todayStr = getCurrentUsageDate(timezone);
  const [year, month] = todayStr.split('-');
  return `${year}-${month}-01`;
}
