import fs from 'fs';
import path from 'path';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory cache synced to JSON file
let usersMap: Map<string, UserRecord> = new Map();

function loadUsers(): void {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const users: UserRecord[] = JSON.parse(data);
      usersMap.clear();
      for (const u of users) {
        usersMap.set(u.id, u);
      }
    } else {
      saveUsersSync();
    }
  } catch (err) {
    console.error('Error loading users database file:', err);
    usersMap = new Map();
  }
}

function saveUsersSync(): void {
  try {
    const list = Array.from(usersMap.values());
    const tempFile = `${USERS_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(list, null, 2), 'utf-8');
    fs.renameSync(tempFile, USERS_FILE);
  } catch (err) {
    console.error('Error saving users database file:', err);
  }
}

// Initialize database from file
loadUsers();

export const userStore = {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    for (const user of usersMap.values()) {
      if (user.email.toLowerCase() === normalized) {
        return { ...user };
      }
    }
    return null;
  },

  async findById(id: string): Promise<UserRecord | null> {
    const user = usersMap.get(id);
    return user ? { ...user } : null;
  },

  async createUser(data: { name: string; email: string; passwordHash: string }): Promise<UserRecord> {
    const normalizedEmail = data.email.trim().toLowerCase();
    
    // Check uniqueness constraint
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      const err: any = new Error('An account with this email already exists.');
      err.statusCode = 409;
      throw err;
    }

    const now = new Date().toISOString();
    const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newUser: UserRecord = {
      id,
      name: data.name.trim(),
      email: normalizedEmail,
      passwordHash: data.passwordHash,
      createdAt: now,
      updatedAt: now,
    };

    usersMap.set(id, newUser);
    saveUsersSync();

    return { ...newUser };
  },

  async getAllUsersCount(): Promise<number> {
    return usersMap.size;
  }
};
