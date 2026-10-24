export interface OfflineDraft {
  id: string;
  type: 'BATCH' | 'EVENT' | 'LAB_TEST';
  payload: any;
  createdAt: string;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
}

const STORAGE_KEY = 'herborigin_offline_drafts_v1';

export class OfflineManager {
  private static listeners: ((online: boolean) => void)[] = [];

  public static isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  public static init() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.listeners.forEach((cb) => cb(true));
    });

    window.addEventListener('offline', () => {
      this.listeners.forEach((cb) => cb(false));
    });
  }

  public static subscribe(cb: (online: boolean) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((fn) => fn !== cb);
    };
  }

  public static getDrafts(): OfflineDraft[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public static saveDraft(type: OfflineDraft['type'], payload: any): OfflineDraft {
    const draft: OfflineDraft = {
      id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      payload,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    const current = this.getDrafts();
    current.push(draft);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    return draft;
  }

  public static removeDraft(id: string) {
    const current = this.getDrafts().filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  }

  public static clearAllDrafts() {
    localStorage.removeItem(STORAGE_KEY);
  }
}

if (typeof window !== 'undefined') {
  OfflineManager.init();
}
