export interface TodayUsage {
  ttsGenerations: number;
  ttsLimit: number;
  ttsRemaining: number;
  aiEnhancements: number;
  aiLimit: number;
  aiRemaining: number;
  ttsCharacters: number;
  audioBytes: number;
}

export interface MonthUsage {
  ttsGenerations: number;
  aiEnhancements: number;
  ttsCharacters: number;
  audioBytes: number;
}

export interface UsageLimits {
  ttsDailyLimit: number;
  aiDailyLimit: number;
  maxTtsCharacters: number;
}

export interface DailyUsageItem {
  date: string;
  ttsGenerations: number;
  aiEnhancements: number;
  ttsCharacters: number;
  audioBytes: number;
}

export interface UsageResponse {
  success: boolean;
  today: TodayUsage;
  month: MonthUsage;
  limits: UsageLimits;
  recentUsage: DailyUsageItem[];
  resetAt: string;
  timezone: string;
}
