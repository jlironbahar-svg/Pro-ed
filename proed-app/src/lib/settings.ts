import { createStore } from './store';
import { db } from './storage';
import type { Lang } from './i18n';

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  lang: Lang;
  theme: Theme;
}

const KEY = 'settings';
const defaults: Settings = { lang: 'fr', theme: 'system' };

export const settingsStore = createStore<Settings>(defaults);

export async function loadSettings(): Promise<void> {
  const saved = await db.get<Partial<Settings>>(KEY).catch(() => undefined);
  settingsStore.set({ ...defaults, ...saved });
  applyTheme();
}

export function updateSettings(patch: Partial<Settings>): void {
  settingsStore.set((s) => ({ ...s, ...patch }));
  void db.set(KEY, settingsStore.get());
  if (patch.theme) applyTheme();
  if (patch.lang) document.documentElement.lang = patch.lang;
}

const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

export function applyTheme(): void {
  const { theme, lang } = settingsStore.get();
  const dark = theme === 'dark' || (theme === 'system' && !!media?.matches);
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  root.lang = lang;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0e0f12' : '#f7f7f8');
  try {
    localStorage.setItem('proed-theme', theme);
  } catch {
    /* private mode */
  }
}

media?.addEventListener('change', () => {
  if (settingsStore.get().theme === 'system') applyTheme();
});
