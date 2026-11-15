import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { createStore } from '@proed/shared/ui';
import type { AdminLoginResponse } from '@proed/shared/core';
import { settingsStore } from './settings';

const KEY = 'proed-admin-session';

interface Session {
  token: string;
  expiresAt: number;
}

/** undefined while loading, null when signed out. */
export const sessionStore = createStore<Session | null | undefined>(undefined);

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(code);
  }
}

function base(): string {
  return settingsStore.get().serverUrl.replace(/\/$/, '');
}

async function save(session: Session | null): Promise<void> {
  sessionStore.set(session);
  const value = session ? JSON.stringify(session) : null;
  if (Capacitor.isNativePlatform()) {
    if (value) await Preferences.set({ key: KEY, value });
    else await Preferences.remove({ key: KEY });
  } else {
    // Web: the session ends with the tab.
    if (value) sessionStorage.setItem(KEY, value);
    else sessionStorage.removeItem(KEY);
  }
}

export async function loadSession(): Promise<void> {
  const raw = Capacitor.isNativePlatform() ? (await Preferences.get({ key: KEY })).value : sessionStorage.getItem(KEY);
  const session = raw ? (JSON.parse(raw) as Session) : null;
  sessionStore.set(session && session.expiresAt > Date.now() ? session : null);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = sessionStore.get();
  const headers = new Headers(init.headers);
  if (session) headers.set('Authorization', `Bearer ${session.token}`);
  if (init.body && typeof init.body === 'string') headers.set('Content-Type', 'application/json');
  let res: Response;
  try {
    res = await fetch(base() + path, { ...init, headers });
  } catch {
    throw new ApiError(0, 'unreachable');
  }
  if (res.status === 401 && session) {
    await save(null);
    throw new ApiError(401, 'unauthorized');
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'error');
  return data;
}

export const json = (body: unknown): RequestInit['body'] => JSON.stringify(body);

export async function login(password: string, totp: string): Promise<void> {
  const data = await api<AdminLoginResponse>('/admin/login', { method: 'POST', body: json({ password, totp }) });
  await save({ token: data.token, expiresAt: data.expiresAt });
}

export async function logout(): Promise<void> {
  await api('/admin/logout', { method: 'POST' }).catch(() => undefined);
  await save(null);
}
