/*
  Serverless mode for ProEd Admin: the GitHub repository is the shared store.
  The admin app reads and writes proed-config.json with the GitHub Contents API, using a
  personal access token (Contents: read and write on this repository only). Student apps
  read the same file from raw.githubusercontent.com. Names and plain invite codes never go
  to GitHub: they stay on this phone (localStorage).
  handleGithub() answers the same /admin/... calls as the ProEd server, so screens work in both modes.
*/
import {
  INVITE_HASH_ITERATIONS,
  KNOWN_FLAGS,
  hashInviteCode,
  isValidVersion,
  type AdminUser,
  type AdminUserDetails,
  type AuditEntry,
  type DashboardData,
  type FeatureFlag,
  type PublicConfig,
  type PublicUser,
  type SystemSettings,
} from '@proed/shared/core';

const PATH = 'proed-config.json';
const LOCAL_KEY = 'proed-admin-local-users';
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export class GithubError extends Error {
  constructor(public readonly status: number, public readonly code: string) {
    super(code);
  }
}

interface Conn {
  repo: string;
  token: string;
}

/* ---------- helpers ---------- */

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function fromBase64(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

function randomString(alphabet: string, length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
}

function formatCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

async function gh<T>(conn: Conn, path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`https://api.github.com/repos/${conn.repo}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${conn.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new GithubError(0, 'unreachable');
  }
  if (!res.ok) throw new GithubError(res.status, res.status === 401 ? 'unauthorized' : res.status === 404 ? 'not_found' : 'github_error');
  return (await res.json()) as T;
}

/* ---------- local names and codes (never published) ---------- */

type LocalUsers = Record<string, { label: string; code: string }>;

function localUsers(): LocalUsers {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}') as LocalUsers;
  } catch {
    return {};
  }
}

function saveLocalUsers(users: LocalUsers): void {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(users));
}

/* ---------- config file ---------- */

function newConfig(): PublicConfig {
  return {
    version: 1,
    rev: 0,
    updatedAt: Date.now(),
    salt: randomString('abcdefghijklmnopqrstuvwxyz0123456789', 24),
    iterations: INVITE_HASH_ITERATIONS,
    graceHours: 72,
    state: 'ACTIVE',
    message: '',
    minVersion: '0.0.0',
    latestApk: null,
    flags: Object.entries(KNOWN_FLAGS).map(([key, description]) => ({ key, mode: 'on' as const, description })),
    users: [],
  };
}

async function readConfig(conn: Conn): Promise<{ config: PublicConfig; sha: string | null }> {
  try {
    const file = await gh<{ content: string; sha: string }>(conn, `/contents/${PATH}`);
    return { config: JSON.parse(fromBase64(file.content)) as PublicConfig, sha: file.sha };
  } catch (e) {
    if (e instanceof GithubError && e.status === 404) return { config: newConfig(), sha: null };
    throw e;
  }
}

/** Reads, changes and commits the config. Retries once if someone else committed in between. */
async function updateConfig(conn: Conn, message: string, change: (c: PublicConfig) => void): Promise<PublicConfig> {
  for (let attempt = 0; ; attempt++) {
    const { config, sha } = await readConfig(conn);
    change(config);
    config.rev += 1;
    config.updatedAt = Date.now();
    try {
      await gh(conn, `/contents/${PATH}`, {
        method: 'PUT',
        body: JSON.stringify({ message: `ProEd Admin: ${message}`, content: toBase64(JSON.stringify(config, null, 2) + '\n'), ...(sha ? { sha } : {}) }),
      });
      return config;
    } catch (e) {
      if (attempt === 0 && e instanceof GithubError && (e.status === 409 || e.status === 422)) continue;
      throw e;
    }
  }
}

/** Checks that the token can write to the repository (and creates the config if missing). */
export async function connectGithub(conn: Conn): Promise<void> {
  const repo = await gh<{ permissions?: { push?: boolean } }>(conn, '');
  if (!repo.permissions?.push) throw new GithubError(403, 'no_write_access');
  const { sha } = await readConfig(conn);
  if (!sha) await updateConfig(conn, 'create the access file', () => undefined);
}

/* ---------- /admin/... emulation ---------- */

function toAdminUser(u: PublicUser, local: LocalUsers): AdminUser {
  const l = local[u.id];
  return {
    id: u.id,
    code: l ? formatCode(l.code) : '••••-••••',
    label: l?.label ?? '',
    channel: u.channel,
    blocked: u.blocked,
    createdAt: u.createdAt,
    lastSeen: null,
    deviceType: null,
    appVersion: null,
    bound: false,
  };
}

function toSystem(c: PublicConfig): SystemSettings {
  return {
    state: c.state,
    message: c.message,
    minVersion: c.minVersion,
    latestApk: c.latestApk ? { ...c.latestApk, size: 0, uploadedAt: c.updatedAt } : null,
  };
}

export async function handleGithub(conn: Conn, path: string, init: RequestInit = {}): Promise<unknown> {
  const method = (init.method ?? 'GET').toUpperCase();
  const url = new URL(path, 'https://local');
  const p = url.pathname;
  const body = typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : {};
  const local = localUsers();
  const userMatch = p.match(/^\/admin\/users\/([^/]+)$/);
  const flagMatch = p.match(/^\/admin\/flags\/([a-z0-9_]{2,40})$/);

  if (p === '/admin/logout') return { ok: true };

  if (p === '/admin/dashboard' && method === 'GET') {
    const { config } = await readConfig(conn);
    const data: DashboardData = {
      now: Date.now(),
      live: false,
      online: [],
      totals: { users: config.users.length, activeToday: 0, activeWeek: 0 },
      daily: [],
      recentChecks: [],
      recentDenied: [],
    };
    return data;
  }

  if (p === '/admin/users' && method === 'GET') {
    const { config } = await readConfig(conn);
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    return config.users
      .map((u) => toAdminUser(u, local))
      .filter((u) => !q || u.label.toLowerCase().includes(q) || u.code.toLowerCase().replace('-', '').includes(q.replace('-', '')))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  if (p === '/admin/users' && method === 'POST') {
    const label = String(body.label ?? '').trim().slice(0, 60);
    const code = randomString(ALPHABET, 8);
    const id = crypto.randomUUID();
    const user: PublicUser = { id, codeHash: '', channel: 'normal', blocked: false, createdAt: Date.now() };
    // The hash needs the salt from the file: read it first, then commit the user.
    const { config } = await readConfig(conn);
    user.codeHash = await hashInviteCode(code, config.salt, config.iterations);
    await updateConfig(conn, `add user ${id.slice(0, 6)}`, (c) => {
      c.users.push(user);
    });
    saveLocalUsers({ ...localUsers(), [id]: { label, code } });
    return toAdminUser(user, localUsers());
  }

  if (userMatch) {
    const id = decodeURIComponent(userMatch[1]);
    if (method === 'GET') {
      const { config } = await readConfig(conn);
      const u = config.users.find((x) => x.id === id);
      if (!u) throw new GithubError(404, 'not_found');
      const details: AdminUserDetails = { ...toAdminUser(u, local), devices: [] };
      return details;
    }
    if (method === 'PATCH') {
      if (typeof body.label === 'string') {
        const l = local[id];
        saveLocalUsers({ ...local, [id]: { label: body.label.trim(), code: l?.code ?? '' } });
      }
      const changes: string[] = [];
      if (body.channel === 'normal' || body.channel === 'beta') changes.push(`channel ${body.channel}`);
      if (typeof body.blocked === 'boolean') changes.push(body.blocked ? 'block' : 'unblock');
      let config: PublicConfig;
      if (changes.length) {
        config = await updateConfig(conn, `${changes.join(', ')} ${id.slice(0, 6)}`, (c) => {
          const u = c.users.find((x) => x.id === id);
          if (!u) throw new GithubError(404, 'not_found');
          if (body.channel === 'normal' || body.channel === 'beta') u.channel = body.channel;
          if (typeof body.blocked === 'boolean') u.blocked = body.blocked;
        });
      } else {
        config = (await readConfig(conn)).config;
      }
      const u = config.users.find((x) => x.id === id);
      if (!u) throw new GithubError(404, 'not_found');
      return toAdminUser(u, localUsers());
    }
    if (method === 'DELETE') {
      await updateConfig(conn, `delete user ${id.slice(0, 6)}`, (c) => {
        c.users = c.users.filter((x) => x.id !== id);
      });
      const next = { ...local };
      delete next[id];
      saveLocalUsers(next);
      return { ok: true };
    }
  }

  if (p === '/admin/flags' && method === 'GET') {
    return (await readConfig(conn)).config.flags as FeatureFlag[];
  }

  if (flagMatch) {
    const key = flagMatch[1];
    if (method === 'PUT') {
      const mode = body.mode;
      if (mode !== 'on' && mode !== 'beta' && mode !== 'off') throw new GithubError(400, 'invalid_mode');
      const config = await updateConfig(conn, `feature ${key}: ${mode}`, (c) => {
        const f = c.flags.find((x) => x.key === key);
        if (f) {
          f.mode = mode;
          if (typeof body.description === 'string') f.description = body.description;
        } else c.flags.push({ key, mode, description: typeof body.description === 'string' ? body.description : '' });
      });
      return config.flags;
    }
    if (method === 'DELETE') {
      const config = await updateConfig(conn, `delete feature ${key}`, (c) => {
        c.flags = c.flags.filter((x) => x.key !== key);
      });
      return config.flags;
    }
  }

  if (p === '/admin/system' && method === 'GET') return toSystem((await readConfig(conn)).config);

  if (p === '/admin/system' && method === 'PUT') {
    if (typeof body.minVersion === 'string' && !isValidVersion(body.minVersion)) throw new GithubError(400, 'invalid_version');
    const apk = body.latestApk as { version?: string; url?: string } | null | undefined;
    if (apk && (!apk.version || !isValidVersion(apk.version) || !/^https:\/\//.test(apk.url ?? ''))) throw new GithubError(400, 'invalid_apk');
    const what = [body.state ? `state ${String(body.state)}` : '', body.minVersion ? `min version ${String(body.minVersion)}` : '', apk ? `APK ${apk.version}` : '']
      .filter(Boolean)
      .join(', ');
    const config = await updateConfig(conn, what || 'system message', (c) => {
      if (body.state === 'ACTIVE' || body.state === 'RECOVERY' || body.state === 'SHUTDOWN') c.state = body.state;
      if (typeof body.message === 'string') c.message = body.message.trim();
      if (typeof body.minVersion === 'string') c.minVersion = body.minVersion.trim();
      if (apk !== undefined) c.latestApk = apk ? { version: apk.version!, url: apk.url! } : null;
    });
    return toSystem(config);
  }

  if (p === '/admin/audit' && method === 'GET') {
    const commits = await gh<{ sha: string; commit: { message: string; author: { date: string; name: string } } }[]>(
      conn,
      `/commits?path=${PATH}&per_page=100`,
    );
    return commits.map(
      (c, i): AuditEntry => ({
        id: commits.length - i,
        at: Date.parse(c.commit.author.date),
        action: c.commit.message.replace(/^ProEd Admin: /, ''),
        detail: c.commit.author.name,
      }),
    );
  }

  throw new GithubError(404, 'not_found');
}
