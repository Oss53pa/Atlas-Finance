/**
 * safeStorage — wrapper résilient autour de localStorage / sessionStorage.
 *
 * Pourquoi : en navigation privée (Safari surtout), `localStorage.setItem`
 * peut lever `QuotaExceededError` ou être indisponible. Sans try/catch, ça
 * propage dans React et unmount toute l'app -> écran blanc instantané.
 *
 * Tous les contexts (Theme, Language, Workspace, Data, Auth) doivent passer
 * par safeStorage au lieu de l'API native.
 */

type StorageKind = 'local' | 'session';

function getStore(kind: StorageKind): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch (_e) {
    return null;
  }
}

function safeGet(kind: StorageKind, key: string): string | null {
  try {
    const store = getStore(kind);
    return store ? store.getItem(key) : null;
  } catch (_e) {
    return null;
  }
}

function safeSet(kind: StorageKind, key: string, value: string): boolean {
  try {
    const store = getStore(kind);
    if (!store) return false;
    store.setItem(key, value);
    return true;
  } catch (_e) {
    return false;
  }
}

function safeDel(kind: StorageKind, key: string): boolean {
  try {
    const store = getStore(kind);
    if (!store) return false;
    store.removeItem(key);
    return true;
  } catch (_e) {
    return false;
  }
}

function safeClear(kind: StorageKind): boolean {
  try {
    const store = getStore(kind);
    if (!store) return false;
    store.clear();
    return true;
  } catch (_e) {
    return false;
  }
}

export const safeStorage = {
  // localStorage (persistant)
  get:   (key: string) => safeGet('local', key),
  set:   (key: string, value: string) => safeSet('local', key, value),
  del:   (key: string) => safeDel('local', key),
  clear: () => safeClear('local'),

  // sessionStorage (par onglet)
  sessionGet:   (key: string) => safeGet('session', key),
  sessionSet:   (key: string, value: string) => safeSet('session', key, value),
  sessionDel:   (key: string) => safeDel('session', key),
  sessionClear: () => safeClear('session'),

  // Helpers JSON (gèrent parse errors)
  getJSON: <T = unknown>(key: string): T | null => {
    const raw = safeGet('local', key);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch (_e) { return null; }
  },
  setJSON: (key: string, value: unknown): boolean => {
    try { return safeSet('local', key, JSON.stringify(value)); } catch (_e) { return false; }
  },
  sessionGetJSON: <T = unknown>(key: string): T | null => {
    const raw = safeGet('session', key);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch (_e) { return null; }
  },
  sessionSetJSON: (key: string, value: unknown): boolean => {
    try { return safeSet('session', key, JSON.stringify(value)); } catch (_e) { return false; }
  },
};

export default safeStorage;
