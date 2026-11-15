import type { Lang } from './settings';

const locales: Record<Lang, string> = { fr: 'fr-FR', en: 'en-GB' };

export function formatAgo(ts: number, now: number, lang: Lang): string {
  const rtf = new Intl.RelativeTimeFormat(locales[lang], { numeric: 'auto' });
  const sec = Math.round((ts - now) / 1000);
  if (Math.abs(sec) < 60) return rtf.format(sec, 'second');
  const min = Math.round(sec / 60);
  if (Math.abs(min) < 60) return rtf.format(min, 'minute');
  const h = Math.round(min / 60);
  if (Math.abs(h) < 24) return rtf.format(h, 'hour');
  return rtf.format(Math.round(h / 24), 'day');
}

export function formatDateTime(ts: number, lang: Lang): string {
  return new Intl.DateTimeFormat(locales[lang], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(ts);
}

export function formatDate(ts: number, lang: Lang): string {
  return new Intl.DateTimeFormat(locales[lang], { day: 'numeric', month: 'long', year: 'numeric' }).format(ts);
}

/** "2026-11-15" -> "15 nov." */
export function formatDayKey(day: string, lang: Lang): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Intl.DateTimeFormat(locales[lang], { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, d));
}

export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
