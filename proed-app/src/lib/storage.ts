import { createStore as createIdbStore, get, set, del, clear } from 'idb-keyval';
import { Preferences } from '@capacitor/preferences';
import { isNative } from './platform';

const kv = createIdbStore('proed', 'kv');

/** Local-first storage (IndexedDB). Homework, timers and settings live here. */
export const db = {
  get: <T>(key: string) => get<T>(key, kv),
  set: (key: string, value: unknown) => set(key, value, kv),
  del: (key: string) => del(key, kv),
  clear: () => clear(kv),
};

/**
 * Storage for the Pronote session token.
 * Android: Capacitor Preferences (app-private storage). Web: IndexedDB.
 */
export const secure = {
  async get<T>(key: string): Promise<T | undefined> {
    if (isNative()) {
      const { value } = await Preferences.get({ key });
      return value ? (JSON.parse(value) as T) : undefined;
    }
    return db.get<T>(key);
  },
  async set(key: string, value: unknown): Promise<void> {
    if (isNative()) await Preferences.set({ key, value: JSON.stringify(value) });
    else await db.set(key, value);
  },
  async remove(key: string): Promise<void> {
    if (isNative()) await Preferences.remove({ key });
    else await db.del(key);
  },
};

export function randomId(): string {
  return crypto.randomUUID();
}
