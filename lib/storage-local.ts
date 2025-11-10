// Local storage fallback - No database needed!
// Data is stored in browser's localStorage

export interface Session {
  id: string;
  candidate_name: string;
  assessment_id: string;
  status: 'active' | 'submitted' | 'expired';
  started_at: string;
  submitted_at?: string;
  time_limit: number;
  selected_llm: string;
  final_code?: string;
}

export interface CodeSnapshot {
  id: string;
  session_id: string;
  timestamp: string;
  code: string;
  line_count: number;
  language: string;
}

class LocalStorageService {
  private prefix = 'promora_';

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  set(key: string, value: any): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.getKey(key), JSON.stringify(value));
    }
  }

  get(key: string): any {
    if (typeof window !== 'undefined') {
      const item = localStorage.getItem(this.getKey(key));
      return item ? JSON.parse(item) : null;
    }
    return null;
  }

  remove(key: string): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.getKey(key));
    }
  }

  clear(): void {
    if (typeof window !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    }
  }
}

const storage = new LocalStorageService();

export const localStorageDB = {
  // Sessions
  sessions: {
    create: (session: Session): Session => {
      const sessions = storage.get('sessions') || [];
      sessions.push(session);
      storage.set('sessions', sessions);
      return session;
    },
    getAll: (): Session[] => {
      return storage.get('sessions') || [];
    },
    getById: (id: string): Session | null => {
      const sessions = storage.get('sessions') || [];
      return sessions.find((s: Session) => s.id === id) || null;
    },
    update: (id: string, updates: Partial<Session>): Session | null => {
      const sessions = storage.get('sessions') || [];
      const index = sessions.findIndex((s: Session) => s.id === id);
      if (index !== -1) {
        sessions[index] = { ...sessions[index], ...updates };
        storage.set('sessions', sessions);
        return sessions[index];
      }
      return null;
    }
  },

  // Code snapshots
  codeSnapshots: {
    save: (snapshot: CodeSnapshot): CodeSnapshot => {
      const snapshots = storage.get('code_snapshots') || [];
      snapshots.push(snapshot);
      storage.set('code_snapshots', snapshots);
      return snapshot;
    },
    getBySession: (sessionId: string): CodeSnapshot[] => {
      const snapshots = storage.get('code_snapshots') || [];
      return snapshots.filter((s: CodeSnapshot) => s.session_id === sessionId);
    }
  },

  // Clear all data
  clear: () => {
    storage.clear();
  }
};

