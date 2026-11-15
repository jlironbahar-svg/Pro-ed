import { ONLINE_WINDOW_MS } from './constants.js';

/** A device counts as online when it was seen in the last 2 minutes. */
export function isOnline(lastSeen: number | null | undefined, now: number, windowMs = ONLINE_WINDOW_MS): boolean {
  if (lastSeen == null) return false;
  const age = now - lastSeen;
  return age >= -5_000 && age <= windowMs;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Day key "YYYY-MM-DD" in a time zone (Europe/Paris on the server by default). */
export function dayKey(ts: number, timeZone = 'UTC'): string {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    formatters.set(timeZone, f);
  }
  return f.format(ts);
}

/** The last `days` day keys, oldest first, ending with today. */
export function lastDays(now: number, days: number, timeZone = 'UTC'): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(dayKey(now - i * 86_400_000, timeZone));
  return out;
}
