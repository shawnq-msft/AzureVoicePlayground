import { useState, useCallback, useEffect, useRef } from 'react';
import { HistoryEntry } from '../types/history';

const HISTORY_COOKIE_NAME = 'azure-tts-history';
const HISTORY_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const MAX_COOKIE_BYTES = 3800;
const MAX_COOKIE_ENTRIES = 10;
const MAX_COOKIE_TEXT_LENGTH = 400;
const HISTORY_AUDIO_DB_NAME = 'azure-tts-history-audio';
const HISTORY_AUDIO_DB_VERSION = 1;
const HISTORY_AUDIO_STORE_NAME = 'audio';

type CookieHistoryEntry = Omit<HistoryEntry, 'audioData'>;

interface CachedAudioEntry {
  id: string;
  audioData: ArrayBuffer;
}

function openAudioDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);

  return new Promise((resolve) => {
    const request = indexedDB.open(HISTORY_AUDIO_DB_NAME, HISTORY_AUDIO_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(HISTORY_AUDIO_STORE_NAME)) {
        database.createObjectStore(HISTORY_AUDIO_STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.error('Failed to open TTS history audio cache:', request.error);
      resolve(null);
    };
  });
}

async function withAudioStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | null> {
  const database = await openAudioDatabase();
  if (!database) return null;

  return new Promise((resolve) => {
    const transaction = database.transaction(HISTORY_AUDIO_STORE_NAME, mode);
    const store = transaction.objectStore(HISTORY_AUDIO_STORE_NAME);
    const request = action(store);

    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => {
      console.error('Failed to access TTS history audio cache:', request.error);
      resolve(null);
    };
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      resolve(null);
    };
  });
}

async function saveAudioToCache(id: string, audioData: ArrayBuffer) {
  await withAudioStore('readwrite', (store) => store.put({ id, audioData } satisfies CachedAudioEntry));
}

async function loadAudioFromCache(id: string): Promise<ArrayBuffer | null> {
  const cached = await withAudioStore<CachedAudioEntry>('readonly', (store) => store.get(id));
  return cached?.audioData ?? null;
}

async function deleteAudioFromCache(id: string) {
  await withAudioStore('readwrite', (store) => store.delete(id));
}

async function clearAudioCache() {
  await withAudioStore('readwrite', (store) => store.clear());
}

async function pruneAudioCache(keptIds: string[]) {
  const database = await openAudioDatabase();
  if (!database) return;

  const keptIdSet = new Set(keptIds);

  return new Promise<void>((resolve) => {
    const transaction = database.transaction(HISTORY_AUDIO_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(HISTORY_AUDIO_STORE_NAME);
    const request = store.openCursor();

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) return;

      const cachedEntry = cursor.value as CachedAudioEntry;
      if (!keptIdSet.has(cachedEntry.id)) {
        cursor.delete();
      }
      cursor.continue();
    };

    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      console.error('Failed to prune TTS history audio cache:', transaction.error);
      database.close();
      resolve();
    };
  });
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const prefix = `${name}=`;
  const cookie = document.cookie
    .split('; ')
    .find((part) => part.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}

function setCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${HISTORY_COOKIE_MAX_AGE_SECONDS}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
}

function toCookieEntry(entry: HistoryEntry): CookieHistoryEntry {
  const { audioData, ...metadata } = entry;
  return {
    ...metadata,
    text: metadata.text.length > MAX_COOKIE_TEXT_LENGTH
      ? `${metadata.text.slice(0, MAX_COOKIE_TEXT_LENGTH)}...`
      : metadata.text,
  };
}

function serializeHistory(history: HistoryEntry[]): string {
  const entries = history.slice(-MAX_COOKIE_ENTRIES).map(toCookieEntry);

  while (entries.length > 0) {
    const serialized = JSON.stringify(entries);
    if (encodeURIComponent(serialized).length <= MAX_COOKIE_BYTES) {
      return serialized;
    }
    entries.shift();
  }

  return '[]';
}

function loadHistoryFromCookie(): HistoryEntry[] {
  try {
    const stored = getCookie(HISTORY_COOKIE_NAME);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as CookieHistoryEntry[];
    if (!Array.isArray(parsed)) return [];

    return parsed.map((entry) => ({ ...entry }));
  } catch (error) {
    console.error('Failed to load TTS history from cookie:', error);
    return [];
  }
}

export function useHistoryStorage() {
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistoryFromCookie);
  const hydratedFromAudioCacheRef = useRef(false);

  useEffect(() => {
    if (history.length === 0) {
      deleteCookie(HISTORY_COOKIE_NAME);
      clearAudioCache();
      return;
    }

    try {
      setCookie(HISTORY_COOKIE_NAME, serializeHistory(history));
      pruneAudioCache(history.slice(-MAX_COOKIE_ENTRIES).map((entry) => entry.id));
    } catch (error) {
      console.error('Failed to save TTS history to cookie:', error);
    }
  }, [history]);

  useEffect(() => {
    if (hydratedFromAudioCacheRef.current) return;
    hydratedFromAudioCacheRef.current = true;

    const hydrateAudioData = async () => {
      const hydratedEntries = await Promise.all(
        history.map(async (entry) => {
          if (entry.audioData) return entry;

          const audioData = await loadAudioFromCache(entry.id);
          return audioData ? { ...entry, audioData } : entry;
        })
      );

      if (hydratedEntries.some((entry, index) => entry.audioData !== history[index]?.audioData)) {
        setHistory(hydratedEntries);
      }
    };

    hydrateAudioData().catch((error) => {
      console.error('Failed to hydrate TTS history audio:', error);
    });
  }, [history]);

  const addToHistory = useCallback((entry: Omit<HistoryEntry, 'id'>) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    if (newEntry.audioData) {
      saveAudioToCache(newEntry.id, newEntry.audioData).catch((error) => {
        console.error('Failed to cache TTS history audio:', error);
      });
    }

    setHistory((prev) => [...prev, newEntry]);
  }, []);

  const removeFromHistory = useCallback((id: string) => {
    deleteAudioFromCache(id).catch((error) => {
      console.error('Failed to delete TTS history audio:', error);
    });
    setHistory((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    clearAudioCache().catch((error) => {
      console.error('Failed to clear TTS history audio:', error);
    });
    setHistory([]);
  }, []);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
