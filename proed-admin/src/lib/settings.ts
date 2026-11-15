import { createStore } from '@proed/shared/ui';

export type Lang = 'fr' | 'en';
export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  lang: Lang;
  theme: Theme;
  serverUrl: string;
}

const KEY = 'proed-admin-settings';
const defaults: Settings = { lang: 'fr', theme: 'system', serverUrl: (import.meta.env.VITE_SERVER_URL ?? '').replace(/\/$/, '') };

function load(): Settings {
  try {
    return { ...defaults, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>) };
  } catch {
    return defaults;
  }
}

export const settingsStore = createStore<Settings>(load());

export function updateSettings(patch: Partial<Settings>): void {
  settingsStore.set((s) => ({ ...s, ...patch }));
  try {
    localStorage.setItem(KEY, JSON.stringify(settingsStore.get()));
  } catch {
    /* ignore */
  }
  applyTheme();
}

const media = window.matchMedia('(prefers-color-scheme: dark)');

export function applyTheme(): void {
  const { theme, lang } = settingsStore.get();
  const dark = theme === 'dark' || (theme === 'system' && media.matches);
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.lang = lang;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0e0f12' : '#f7f7f8');
  try {
    localStorage.setItem('proed-admin-theme', theme);
  } catch {
    /* ignore */
  }
}

media.addEventListener('change', () => settingsStore.get().theme === 'system' && applyTheme());
