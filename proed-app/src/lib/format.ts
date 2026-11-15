import type { Lang } from './i18n';

/** 45 -> "45 min", 60 -> "1 h", 150 -> "2 h 30". */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} h` : `${h} h ${String(rest).padStart(2, '0')}`;
}

/** Timer display, 754 s -> "12:34", 4000 s -> "1:06:40". */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return (h > 0 ? `${h}:` : '') + `${mm}:${String(s).padStart(2, '0')}`;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function daysBetween(from: number, to: number): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / 86_400_000);
}

const locales: Record<Lang, string> = { fr: 'fr-FR', en: 'en-GB' };

export function formatDay(ts: number, lang: Lang): string {
  return new Intl.DateTimeFormat(locales[lang], { weekday: 'long', day: 'numeric', month: 'long' }).format(ts);
}

export function formatShortDay(ts: number, lang: Lang): string {
  return new Intl.DateTimeFormat(locales[lang], { weekday: 'short', day: 'numeric', month: 'short' }).format(ts);
}

export function formatTime(ts: number, lang: Lang): string {
  return new Intl.DateTimeFormat(locales[lang], { hour: '2-digit', minute: '2-digit' }).format(ts);
}

/** "il y a 5 min", "5 minutes ago"... */
export function formatAgo(ts: number, now: number, lang: Lang): string {
  const rtf = new Intl.RelativeTimeFormat(locales[lang], { numeric: 'auto' });
  const sec = Math.round((ts - now) / 1000);
  if (Math.abs(sec) < 45) return rtf.format(0, 'second');
  const min = Math.round(sec / 60);
  if (Math.abs(min) < 60) return rtf.format(min, 'minute');
  const h = Math.round(min / 60);
  if (Math.abs(h) < 24) return rtf.format(h, 'hour');
  return rtf.format(Math.round(h / 24), 'day');
}
