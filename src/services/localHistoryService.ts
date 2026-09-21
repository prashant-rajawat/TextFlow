export interface LocalHistoryRecord {
  id: string;
  userId: string;
  text: string;
  language: string;
  voice: string;
  audioBlob: Blob;
  mimeType: string;
  fileName: string;
  createdAt: string;
  isFavorite: boolean;
  speed?: number;
  pitch?: number;
  volume?: number;
  style?: string;
}

const DB_NAME = 'textflow-local';
const DB_VERSION = 1;
const STORE_NAME = 'audioHistory';
const MAX_STORAGE_BYTES = 100 * 1024 * 1024; // 100 MB limit

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('isFavorite', 'isFavorite', { unique: false });
      }
    };
  });
}

// Check total storage size for user
async function checkStorageQuota(userId: string, newBlobSize: number): Promise<void> {
  const records = await getLocalHistory(userId);
  let totalSize = newBlobSize;
  for (const r of records) {
    if (r.audioBlob && r.audioBlob.size) {
      totalSize += r.audioBlob.size;
    }
  }

  if (totalSize > MAX_STORAGE_BYTES) {
    throw new Error('Local History storage is full (100 MB limit). Please delete older recordings.');
  }
}

export async function saveLocalHistory(record: LocalHistoryRecord): Promise<void> {
  await checkStorageQuota(record.userId, record.audioBlob.size);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to save record to IndexedDB'));
  });
}

export async function getLocalHistory(userId: string): Promise<LocalHistoryRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('userId');
    const request = index.getAll(IDBKeyRange.only(userId));

    request.onsuccess = () => {
      const results = (request.result || []) as LocalHistoryRecord[];
      // Sort newest first
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(results);
    };
    request.onerror = () => reject(request.error || new Error('Failed to fetch history from IndexedDB'));
  });
}

export async function getLocalHistoryItem(id: string, userId: string): Promise<LocalHistoryRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const record = (request.result || null) as LocalHistoryRecord | null;
      if (record && record.userId === userId) {
        resolve(record);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error || new Error('Failed to fetch item from IndexedDB'));
  });
}

export async function deleteLocalHistory(id: string, userId: string): Promise<void> {
  const item = await getLocalHistoryItem(id, userId);
  if (!item) return;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to delete item from IndexedDB'));
  });
}

export async function updateLocalHistory(
  id: string,
  userId: string,
  updates: Partial<LocalHistoryRecord>
): Promise<void> {
  const item = await getLocalHistoryItem(id, userId);
  if (!item) {
    throw new Error('Record not found or unauthorized');
  }

  const updatedRecord: LocalHistoryRecord = {
    ...item,
    ...updates,
    id: item.id, // preserve id
    userId: item.userId, // preserve userId
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(updatedRecord);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error('Failed to update record in IndexedDB'));
  });
}

export async function clearLocalHistory(userId: string): Promise<void> {
  const records = await getLocalHistory(userId);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    let completed = 0;
    if (records.length === 0) {
      resolve();
      return;
    }

    records.forEach((r) => {
      const req = store.delete(r.id);
      req.onsuccess = () => {
        completed++;
        if (completed === records.length) resolve();
      };
      req.onerror = () => {
        reject(req.error || new Error('Failed to clear local history'));
      };
    });
  });
}
