import fs from 'fs';
import path from 'path';

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

// In-memory cache synced to JSON file
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
  async createHistoryRecord(data: {
    userId: string;
    text: string;
    language: string;
    voice: string;
    speed?: number;
    pitch?: number;
    volume?: number;
    style?: string;
    audioUrl: string;
  }): Promise<SpeechHistoryRecord> {
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

    // Prepend new record (sorted newest first)
    historyList.unshift(newRecord);
    saveHistorySync();

    return { ...newRecord };
  },

  async toggleFavorite(id: string, userId: string, isFavorite: boolean): Promise<SpeechHistoryRecord | null> {
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
    options: { page?: number; limit?: number; language?: string; voice?: string } = {}
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

    // Strict user ownership + favorite filter
    let favRecords = historyList.filter((item) => item.userId === userId && item.isFavorite === true);

    if (languageFilter) {
      favRecords = favRecords.filter((item) => item.language.toLowerCase().includes(languageFilter));
    }

    if (voiceFilter) {
      favRecords = favRecords.filter((item) => item.voice.toLowerCase().includes(voiceFilter));
    }

    // Sort newest first (createdAt DESC)
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
    options: { page?: number; limit?: number; search?: string } = {}
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

    // Filter by userId (strict ownership requirement)
    let userRecords = historyList.filter((item) => item.userId === userId);

    // Optional text/language/voice search filter
    if (search) {
      userRecords = userRecords.filter(
        (item) =>
          item.text.toLowerCase().includes(search) ||
          item.language.toLowerCase().includes(search) ||
          item.voice.toLowerCase().includes(search)
      );
    }

    // Sort newest first (createdAt DESC)
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

  async getHistoryItemById(id: string, userId: string): Promise<SpeechHistoryRecord | null> {
    const item = historyList.find((r) => r.id === id && r.userId === userId);
    return item ? { ...item } : null;
  },

  async deleteHistoryItem(id: string, userId: string): Promise<boolean> {
    const index = historyList.findIndex((r) => r.id === id && r.userId === userId);
    if (index === -1) {
      return false;
    }
    historyList.splice(index, 1);
    saveHistorySync();
    return true;
  },

  async clearHistoryByUserId(userId: string): Promise<number> {
    const initialCount = historyList.length;
    historyList = historyList.filter((r) => r.userId !== userId);
    const deletedCount = initialCount - historyList.length;
    saveHistorySync();
    return deletedCount;
  },
};
