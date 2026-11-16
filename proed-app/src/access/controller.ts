import type { AccessClaims, CheckRequest, CheckResponse, DenyReason, HeartbeatResponse } from '@proed/shared/core';
import { ACCESS_CHECK_INTERVAL_MS, HEARTBEAT_INTERVAL_MS, claimsFromConfig, hashInviteCode, type PublicConfig } from '@proed/shared/core';
import { createStore } from '../lib/store';
import { db, randomId } from '../lib/storage';
import { APP_VERSION, deviceType, isNative, serverUrl } from '../lib/platform';
import { sessionStore } from '../lib/session';
import { setPronoteGuard } from '../homework/store';
import { flagsStore } from './flags';
import { sha256Hex, verifyToken } from './jwt';
import { canCallPronote, evaluateAccess, type AccessView } from './logic';

interface Saved {
  inviteCode: string | null;
  token: string | null;
  publicKey: string | null;
  deviceId: string;
  /** Serverless mode only: claims computed from the public config. */
  claims?: AccessClaims | null;
}

export interface AccessState extends Saved {
  ready: boolean;
  claims: AccessClaims | null;
  checking: boolean;
  /** Last check could not reach the server. */
  offline: boolean;
  /** The server asked for an invite code (it is not in open access). */
  needsCode: boolean;
  view: AccessView | null;
}

const KEY = 'access';
const BUILD_KEY = import.meta.env.VITE_ACCESS_PUBLIC_KEY || null;
/** Serverless mode (APK without a ProEd server): access rules come from proed-config.json on GitHub. */
const CONFIG_URL = import.meta.env.VITE_CONFIG_URL || '';
export const SERVERLESS = !!CONFIG_URL && !import.meta.env.VITE_SERVER_URL;

export const accessStore = createStore<AccessState>({
  ready: false,
  inviteCode: null,
  token: null,
  publicKey: null,
  deviceId: '',
  claims: null,
  checking: false,
  offline: false,
  view: null,
  needsCode: false,
});

setPronoteGuard(() => canCallPronote(accessStore.get().view));

/** Free ngrok addresses show a warning page to browsers unless this header is sent. */
export const SERVER_HEADERS = { 'ngrok-skip-browser-warning': '1' };

/** In server mode a check can run without a code (open access); serverless mode needs one. */
function canCheck(inviteCode: string | null): boolean {
  return !!inviteCode || !SERVERLESS;
}

function persist(): void {
  const { inviteCode, token, publicKey, deviceId, claims } = accessStore.get();
  void db.set(KEY, { inviteCode, token, publicKey, deviceId, claims: SERVERLESS ? claims : null } satisfies Saved);
}

function computeView(claims: AccessClaims | null): AccessView | null {
  return claims ? evaluateAccess(claims, Date.now(), APP_VERSION, isNative()) : null;
}

function applyClaims(claims: AccessClaims | null): void {
  accessStore.set((s) => ({ ...s, claims, view: computeView(claims) }));
  if (claims?.allowed) flagsStore.set(claims.flags ?? {});
}

/** Loads the saved code and token, and verifies the token offline. */
export async function loadAccess(): Promise<void> {
  const saved = await db.get<Saved>(KEY).catch(() => undefined);
  const deviceId = saved?.deviceId || randomId();
  const publicKey = BUILD_KEY ?? saved?.publicKey ?? null;
  let claims: AccessClaims | null = null;
  if (SERVERLESS) claims = saved?.claims ?? null;
  else if (saved?.token && publicKey) claims = await verifyToken(saved.token, publicKey);
  accessStore.set((s) => ({
    ...s,
    ready: true,
    inviteCode: saved?.inviteCode ?? null,
    token: claims ? saved!.token : null,
    publicKey,
    deviceId,
    checking: canCheck(saved?.inviteCode ?? null) && !claims,
  }));
  applyClaims(claims);
  persist();
}

async function usernameHash(): Promise<string | undefined> {
  const username = sessionStore.get()?.username;
  return username ? sha256Hex(username.trim().toLowerCase()) : undefined;
}

export type CheckResult = { status: 'ok' } | { status: 'denied'; reason: DenyReason } | { status: 'offline' };

/** POST /api/check. Sends only the invite code, a random device id and a hash of the Pronote username. */
export async function runCheck(code?: string): Promise<CheckResult> {
  const state = accessStore.get();
  const inviteCode = code ?? state.inviteCode;
  // Server mode: the check also works without a code when the server is in open access.
  if (!inviteCode && SERVERLESS) return { status: 'denied', reason: 'unknown_code' };
  accessStore.set((s) => ({ ...s, checking: true }));
  try {
    if (SERVERLESS) {
      const res = await fetch(`${CONFIG_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`config ${res.status}`);
      const config = (await res.json()) as PublicConfig;
      const claims = claimsFromConfig(config, await hashInviteCode(inviteCode ?? '', config.salt, config.iterations), Date.now());
      if (!claims.allowed && claims.reason === 'unknown_code' && code) {
        accessStore.set((s) => ({ ...s, checking: false, offline: false }));
        return { status: 'denied', reason: 'unknown_code' };
      }
      accessStore.set((s) => ({ ...s, inviteCode, token: null, checking: false, offline: false }));
      applyClaims(claims);
      persist();
      return claims.allowed ? { status: 'ok' } : { status: 'denied', reason: claims.reason ?? 'blocked' };
    }
    const body: CheckRequest = {
      ...(inviteCode ? { inviteCode } : {}),
      deviceId: state.deviceId,
      usernameHash: await usernameHash(),
      deviceType: deviceType(),
      appVersion: APP_VERSION,
    };
    const res = await fetch(serverUrl('/api/check'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SERVER_HEADERS },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`check ${res.status}`);
    const data = (await res.json()) as CheckResponse;
    // Pinned key: from the build, else the one we saw first (trust on first use).
    const key = BUILD_KEY ?? state.publicKey ?? data.publicKey;
    const claims = await verifyToken(data.token, key);
    if (!claims) throw new Error('bad token');

    // No code and the server wants one: show the invite screen.
    if (!claims.allowed && claims.reason === 'unknown_code' && !inviteCode) {
      accessStore.set((s) => ({ ...s, checking: false, offline: false, needsCode: true }));
      return { status: 'denied', reason: 'unknown_code' };
    }
    // An unknown code typed on the invite screen is not saved.
    if (!claims.allowed && claims.reason === 'unknown_code' && code) {
      accessStore.set((s) => ({ ...s, checking: false, offline: false }));
      return { status: 'denied', reason: 'unknown_code' };
    }
    if (!claims.allowed && claims.reason === 'code_in_use' && code && !state.inviteCode) {
      accessStore.set((s) => ({ ...s, checking: false, offline: false }));
      return { status: 'denied', reason: 'code_in_use' };
    }
    accessStore.set((s) => ({ ...s, inviteCode: inviteCode || null, token: data.token, publicKey: key, checking: false, offline: false, needsCode: false }));
    applyClaims(claims);
    persist();
    return claims.allowed ? { status: 'ok' } : { status: 'denied', reason: claims.reason ?? 'blocked' };
  } catch {
    accessStore.set((s) => ({ ...s, checking: false, offline: true }));
    // Re-evaluate the cached token: it may have expired while offline.
    applyClaims(accessStore.get().claims);
    return { status: 'offline' };
  }
}

export function forgetInviteCode(): void {
  accessStore.set((s) => ({ ...s, inviteCode: null, token: null, claims: null, view: null }));
  flagsStore.set({});
  persist();
}

async function heartbeat(): Promise<void> {
  const { token, deviceId, view } = accessStore.get();
  if (SERVERLESS || !token || view?.kind !== 'ok' || document.visibilityState !== 'visible') return;
  try {
    const res = await fetch(serverUrl('/api/heartbeat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...SERVER_HEADERS },
      body: JSON.stringify({ deviceId, deviceType: deviceType(), appVersion: APP_VERSION }),
    });
    const data = (await res.json().catch(() => ({ ok: false, recheck: true }))) as HeartbeatResponse;
    if (data.recheck) await runCheck();
  } catch {
    /* offline: the 15 min check handles it */
  }
}

let started = false;
let lastCheck = 0;

/** Access check at start and every 15 minutes, heartbeat every 60 s while the app is open. */
export function startAccessLoop(): void {
  if (started) return;
  started = true;
  const check = () => {
    lastCheck = Date.now();
    void runCheck();
  };
  if (canCheck(accessStore.get().inviteCode)) check();
  window.setInterval(() => canCheck(accessStore.get().inviteCode) && check(), ACCESS_CHECK_INTERVAL_MS);
  window.setInterval(() => void heartbeat(), HEARTBEAT_INTERVAL_MS);
  // Re-evaluate the token expiry every minute (offline grace period).
  window.setInterval(() => applyClaims(accessStore.get().claims), 60_000);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !canCheck(accessStore.get().inviteCode)) return;
    if (Date.now() - lastCheck > ACCESS_CHECK_INTERVAL_MS) check();
    else void heartbeat();
  });
  // First Pronote login: check again so the server can bind the username hash.
  let previous = sessionStore.get()?.username;
  sessionStore.subscribe(() => {
    const current = sessionStore.get()?.username;
    if (current && current !== previous && canCheck(accessStore.get().inviteCode)) check();
    previous = current;
  });
  window.setTimeout(() => void heartbeat(), 3_000);
}

