import type { AccessClaims, LatestApk } from '@proed/shared/core';
import { isVersionBelow } from '@proed/shared/core';

export type AccessView =
  | { kind: 'locked'; reason: 'denied' | 'expired' }
  | { kind: 'shutdown'; message: string }
  | { kind: 'update-required'; apk: LatestApk | null }
  | { kind: 'ok'; recovery: boolean; message: string; update: LatestApk | null };

/**
 * What the app may show, from the last verified access token.
 * The token expires after the grace period (72 h by default), so an app that
 * can't reach the server keeps working until then, and locks after.
 */
export function evaluateAccess(claims: AccessClaims, now: number, appVersion: string, native: boolean): AccessView {
  if (!claims.exp || claims.exp * 1000 <= now) return { kind: 'locked', reason: 'expired' };
  if (!claims.allowed) return { kind: 'locked', reason: 'denied' };
  if (claims.state === 'SHUTDOWN') return { kind: 'shutdown', message: claims.message };
  if (isVersionBelow(appVersion, claims.minVersion)) return { kind: 'update-required', apk: native ? claims.latestApk : null };
  const update = native && claims.latestApk && isVersionBelow(appVersion, claims.latestApk.version) ? claims.latestApk : null;
  return { kind: 'ok', recovery: claims.state === 'RECOVERY', message: claims.message, update };
}

/** Pronote may be called only when access is OK and the system is not in RECOVERY. */
export function canCallPronote(view: AccessView | null): boolean {
  return view?.kind === 'ok' && !view.recovery;
}
