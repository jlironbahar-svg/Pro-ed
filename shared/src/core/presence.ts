import { ONLINE_WINDOW_MS } from './constants.js';

/** A device counts as online when it was seen in the last 2 minutes. */
export function isOnline(lastSeen: number | null | undefined, now: number, windowMs = ONLINE_WINDOW_MS): boolean {
  if (lastSeen == null) return false;
  const age = now - lastSeen;
  return age >= -5_000 && age <= windowMs;
}

/** Day key in UTC, "YYYY-MM-DD". */
export function dayKey(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

/** The last `days` day keys, oldest first, ending with today. */
export function lastDays(now: number, days: number): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(dayKey(now - i * 86_400_000));
  return out;
}
